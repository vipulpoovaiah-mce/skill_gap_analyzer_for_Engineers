require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const {
    createUser,
    findUserByUsername,
    findUserById,
    insertHistory,
    listHistoryByUser,
    setFavorite,
    deleteHistory,
} = require('./db/database');

const app = express();
const port = 3000;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SIGNIN_DIR = path.join(__dirname, 'Sign-in');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const upload = multer({ dest: UPLOADS_DIR });

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

app.use(express.static(path.join(__dirname, 'Frontend'), { index: false }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
    }
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    return res.status(401).json({ error: 'Unauthorized' });
}

function hasActiveSession(req) {
    return Boolean(req.session && (req.session.userId || req.session.isGuest));
}

function sanitizeField(value) {
    return value && value.trim() !== '' ? value.replace(/\n/g, ' ') : 'Not Specified';
}

app.use('/Sign-in', express.static(SIGNIN_DIR));
app.use('/extra', express.static(path.join(__dirname, 'extra')));

app.get('/sign-in', (req, res) => res.sendFile(path.join(SIGNIN_DIR, 'index.html')));

app.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        const u = (username || '').trim();
        const p = password || '';

        if (!u || !p) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }
        if (u.length < 3 || u.length > 32) {
            return res.status(400).json({ error: 'Username must be 3-32 characters.' });
        }
        if (p.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const existing = await findUserByUsername(u);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists.' });
        }

        const passwordHash = await bcrypt.hash(p, 10);
        const created = await createUser({ username: u, passwordHash });
        req.session.userId = created.lastID;
        req.session.isGuest = false;
        return res.json({ ok: true, username: u });
    } catch (e) {
        console.error('Register error:', e);
        return res.status(500).json({ error: 'Failed to register.' });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        const u = (username || '').trim();
        const p = password || '';

        const user = await findUserByUsername(u);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        const ok = await bcrypt.compare(p, user.password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        req.session.userId = user.id;
        req.session.isGuest = false;
        return res.json({ ok: true, username: user.username });
    } catch (e) {
        console.error('Login error:', e);
        return res.status(500).json({ error: 'Failed to login.' });
    }
});

app.post('/auth/logout', (req, res) => {
    if (!req.session) return res.json({ ok: true });
    req.session.destroy(() => res.json({ ok: true }));
});

app.post('/auth/guest', (req, res) => {
    req.session.userId = null;
    req.session.isGuest = true;
    return res.json({ ok: true, username: 'Guest', guest: true });
});

app.get('/auth/me', async (req, res) => {
    try {
        if (req.session && req.session.isGuest) {
            return res.json({ loggedIn: true, username: 'Guest', guest: true });
        }
        if (!req.session || !req.session.userId) return res.json({ loggedIn: false });
        const user = await findUserById(req.session.userId);
        if (!user) return res.json({ loggedIn: false });
        return res.json({ loggedIn: true, username: user.username, guest: false });
    } catch (e) {
        console.error('Me error:', e);
        return res.status(500).json({ error: 'Failed to load user.' });
    }
});

app.get('/', (req, res) => {
    return res.redirect('/sign-in');
});

app.get('/app', (req, res) => {
    if (!hasActiveSession(req)) return res.redirect('/sign-in');
    return res.sendFile(path.join(__dirname, 'Frontend', 'index.html'));
});

app.get('/api/history', requireAuth, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 25) || 25, 100);
        const rows = await listHistoryByUser(req.session.userId, { limit });
        return res.json({ history: rows });
    } catch (e) {
        console.error('History error:', e);
        return res.status(500).json({ error: 'Failed to load history.' });
    }
});

app.post('/api/history/:id/favorite', requireAuth, async (req, res) => {
    try {
        const historyId = Number(req.params.id);
        const { isFavorite } = req.body || {};
        const fav = Boolean(isFavorite);
        const result = await setFavorite(req.session.userId, historyId, fav);
        if (result.changes === 0) return res.status(404).json({ error: 'Not found.' });
        return res.json({ ok: true });
    } catch (e) {
        console.error('Favorite error:', e);
        return res.status(500).json({ error: 'Failed to update favorite.' });
    }
});

app.delete('/api/history/:id', requireAuth, async (req, res) => {
    try {
        const historyId = Number(req.params.id);
        const result = await deleteHistory(req.session.userId, historyId);
        if (result.changes === 0) return res.status(404).json({ error: 'Not found.' });
        return res.json({ ok: true });
    } catch (e) {
        console.error('Delete history error:', e);
        return res.status(500).json({ error: 'Failed to delete history.' });
    }
});

async function fetchMarketDemandWithGemini(goal) {
    const prompt = `
You are a career development expert. For the target role: "${goal}", identify the top 10 most essential technical skills and 4 highly-rated online courses or certifications.
Return the response strictly as a JSON object with the following keys:
- "skills": A list of the top 10 technical skills (strings).
- "courses": A list of 4 objects, each with "name" and "provider" (e.g., {"name": "Machine Learning by Andrew Ng", "provider": "Coursera"}).

Industry: Technology/Data/Business
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const resultText = response
            .text()
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        return JSON.parse(resultText);
    } catch (error) {
        console.error("Market demand generation failed:", error);
        // Fallback to basic skills if market demand generation fails
        return {
            skills: ["Communication", "Problem Solving", "Adaptability"],
            courses: []
        };
    }
}

async function parseResumeWithGemini(text) {
    const prompt = `
You are an expert resume parser. Analyze the following resume text and extract key information.
Return the response strictly as a JSON object with the following keys:
- "skills": A comma-separated list of technical and professional skills found.
- "experience": A structured summary of professional experience and key achievements.
- "scores": Any certifications, awards, test scores, or notable achievements (e.g., "AWS Certified", "Deans List").

Resume Text:
${text}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const resultText = response
            .text()
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        return JSON.parse(resultText);
    } catch (error) {
        console.error("Gemini Parsing Error:", error);
        throw new Error("Parsing took too long");
    }
}

app.post('/parse-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const validTypes = [
            'application/pdf', 
            'text/plain', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!validTypes.includes(req.file.mimetype)) {
            try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
            return res.status(400).json({ error: 'Unsupported file type. Please use PDF, TXT or DOCX.' });
        }

        let resumeText = "";
        if (req.file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(req.file.path);
            const data = await pdf(dataBuffer);
            resumeText = data.text;
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ path: req.file.path });
            resumeText = result.value;
        } else {
            resumeText = fs.readFileSync(req.file.path, 'utf8');
        }

        // Parse with Gemini
        const parsedResult = await parseResumeWithGemini(resumeText);

        // Cleanup the uploaded file
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }

        res.json({ parsed: parsedResult });

    } catch (error) {
        console.error('Parsing error:', error);
        // Cleanup on error
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch { /* ignore */ } }
        res.status(500).json({ error: error && error.message ? error.message : 'Parsing took too long' });
    }
});

app.post('/analyze', async (req, res) => {
    if (!hasActiveSession(req)) {
        return res.status(401).json({ error: 'Please sign in or continue as guest first.' });
    }

    const { goal, skills, scores, experience } = req.body;

    try {
        const goalText = (goal || '').trim();
        const skillsText = (skills || '').trim();
        if (!goalText || !skillsText) {
            return res.status(400).json({ error: 'Target Role and Current Skills are required.' });
        }

        // 1. Get market demand and courses for the goal
        const marketDemand = await fetchMarketDemandWithGemini(goal || "Software Engineer");

        // 2. Spawn python analysis
        const pythonProcess = spawn('py', [path.join(__dirname, 'Backend/analyze_cli.py')]);

        let result = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error(`Python error: ${errorOutput}`);
                return res.status(500).json({ error: 'Failed to generate resume analysis.' });
            }
            const resultHtml = result.trim();

            if (req.session.userId) {
                try {
                    await insertHistory({
                        userId: req.session.userId,
                        goal: sanitizeField(goal),
                        skills: sanitizeField(skills),
                        scores: sanitizeField(scores),
                        experience: sanitizeField(experience),
                        marketSkills: marketDemand.skills.join(', '),
                        coursesJson: JSON.stringify(marketDemand.courses),
                        resultHtml,
                    });
                } catch (e) {
                    console.error('Failed saving history:', e);
                }
            }

            return res.json({ result: resultHtml });
        });

        const safeGoal = sanitizeField(goalText);
        const safeSkills = sanitizeField(skillsText);
        const safeScores = sanitizeField(scores);
        const safeExp = sanitizeField(experience);

        const marketSkillsStr = marketDemand.skills.join(', ');
        const coursesStr = JSON.stringify(marketDemand.courses);

        pythonProcess.stdin.write(`${safeGoal}\n`);
        pythonProcess.stdin.write(`${safeSkills}\n`);
        pythonProcess.stdin.write(`${safeScores}\n`);
        pythonProcess.stdin.write(`${safeExp}\n`);
        pythonProcess.stdin.write(`${marketSkillsStr}\n`);
        pythonProcess.stdin.write(`${coursesStr}\n`);
        pythonProcess.stdin.end();

    } catch (error) {
        console.error("Analysis endpoint error:", error);
        res.status(500).json({ error: "Internal analysis failure." });
    }
});

app.listen(port, () => {
    console.log(`SkillGap backend running at http://localhost:${port}`);
    console.log('Open your browser and navigate to http://localhost:3000');
});

require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 3000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const upload = multer({ dest: 'uploads/' });

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.use(express.static(path.join(__dirname, 'Frontend')));
app.use(express.json());

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
        let resultText = response.text();
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(resultText);
    } catch (error) {
        console.error("Gemini Market Demand Error:", error);
        // Fallback to basic skills if AI fails
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
        - "goal": A concise career goal or target role (e.g., "Full Stack Developer", "Data Scientist").
        - "skills": A comma-separated list of technical and professional skills found.
        - "experience": A structured summary of professional experience and key achievements.
        - "scores": Any certifications, awards, test scores, or notable achievements (e.g., "AWS Certified", "Deans List").

        Resume Text:
        ${text}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let resultText = response.text();
        
        // Clean the markdown coding blocks if Gemini returns them
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(resultText);
    } catch (error) {
        console.error("Gemini Parsing Error:", error);
        throw new Error("AI parsing failed.");
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
            fs.unlinkSync(req.file.path);
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
        try { fs.unlinkSync(req.file.path); } catch(e) {}

        res.json({ parsed: parsedResult });

    } catch (error) {
        console.error('Parsing error:', error);
        // Cleanup on error
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch(e) {} }
        res.status(500).json({ error: 'Failed to process file with AI.' });
    }
});

app.post('/analyze', async (req, res) => {
    const { goal, skills, scores, experience, hobbies } = req.body;

    try {
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

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python error: ${errorOutput}`);
                return res.status(500).json({ error: 'Failed to generate resume analysis.' });
            }
            res.json({ result: result.trim() });
        });

        const safeGoal = (goal && goal.trim() !== '') ? goal.replace(/\n/g, ' ') : 'Not Specified';
        const safeSkills = (skills && skills.trim() !== '') ? skills.replace(/\n/g, ' ') : 'Not Specified';
        const safeScores = (scores && scores.trim() !== '') ? scores.replace(/\n/g, ' ') : 'Not Specified';
        const safeExp = (experience && experience.trim() !== '') ? experience.replace(/\n/g, ' ') : 'Not Specified';
        const safeHobbies = (hobbies && hobbies.trim() !== '') ? hobbies.replace(/\n/g, ' ') : 'Not Specified';

        const marketSkillsStr = marketDemand.skills.join(', ');
        const coursesStr = JSON.stringify(marketDemand.courses);

        pythonProcess.stdin.write(`${safeGoal}\n`);
        pythonProcess.stdin.write(`${safeSkills}\n`);
        pythonProcess.stdin.write(`${safeScores}\n`);
        pythonProcess.stdin.write(`${safeExp}\n`);
        pythonProcess.stdin.write(`${safeHobbies}\n`);
        pythonProcess.stdin.write(`${marketSkillsStr}\n`);
        pythonProcess.stdin.write(`${coursesStr}\n`);
        pythonProcess.stdin.end();

    } catch (error) {
        console.error("Analysis endpoint error:", error);
        res.status(500).json({ error: "Internal analysis failure." });
    }
});

app.listen(port, () => {
    console.log(`SkillGap AI backend running at http://localhost:${port}`);
    console.log('Open your browser and navigate to http://localhost:3000');
});

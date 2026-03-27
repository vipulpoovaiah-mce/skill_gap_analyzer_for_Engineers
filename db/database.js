const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DATA_DIR = __dirname;
const DB_PATH = path.join(DATA_DIR, 'app.db');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON;');

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            goal TEXT,
            skills TEXT,
            scores TEXT,
            experience TEXT,
            market_skills TEXT,
            courses_json TEXT,
            result_html TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_favorite INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Remove legacy "hobbies" column if present by rebuilding table.
    db.all('PRAGMA table_info(analysis_history)', [], (err, columns = []) => {
        if (err) return;
        const hasHobbies = columns.some((c) => c.name === 'hobbies');
        if (!hasHobbies) return;

        db.serialize(() => {
            db.run('ALTER TABLE analysis_history RENAME TO analysis_history_old');
            db.run(`
                CREATE TABLE analysis_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    goal TEXT,
                    skills TEXT,
                    scores TEXT,
                    experience TEXT,
                    market_skills TEXT,
                    courses_json TEXT,
                    result_html TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_favorite INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            db.run(`
                INSERT INTO analysis_history
                (id, user_id, goal, skills, scores, experience, market_skills, courses_json, result_html, created_at, is_favorite)
                SELECT id, user_id, goal, skills, scores, experience, market_skills, courses_json, result_html, created_at, is_favorite
                FROM analysis_history_old
            `);
            db.run('DROP TABLE analysis_history_old');
        });
    });

    db.run('CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON analysis_history(user_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id_created_at ON analysis_history(user_id, created_at DESC);');
    db.run('CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id_is_favorite ON analysis_history(user_id, is_favorite);');
});

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

async function createUser({ username, passwordHash }) {
    return run(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, passwordHash]
    );
}

function findUserByUsername(username) {
    return get('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
}

function findUserById(id) {
    return get('SELECT id, username FROM users WHERE id = ?', [id]);
}

function insertHistory({
    userId,
    goal,
    skills,
    scores,
    experience,
    marketSkills,
    coursesJson,
    resultHtml,
}) {
    return run(
        `
            INSERT INTO analysis_history
            (user_id, goal, skills, scores, experience, market_skills, courses_json, result_html)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            userId,
            goal,
            skills,
            scores,
            experience,
            marketSkills,
            coursesJson,
            resultHtml,
        ]
    );
}

function listHistoryByUser(userId, { limit = 25 } = {}) {
    return all(
        `
            SELECT
                id, goal, skills, scores, experience,
                created_at, is_favorite, result_html
            FROM analysis_history
            WHERE user_id = ?
            ORDER BY is_favorite DESC, datetime(created_at) DESC, id DESC
            LIMIT ?
        `,
        [userId, limit]
    );
}

function setFavorite(userId, historyId, isFavorite) {
    return run(
        'UPDATE analysis_history SET is_favorite = ? WHERE id = ? AND user_id = ?',
        [isFavorite ? 1 : 0, historyId, userId]
    );
}

function deleteHistory(userId, historyId) {
    return run(
        'DELETE FROM analysis_history WHERE id = ? AND user_id = ?',
        [historyId, userId]
    );
}

module.exports = {
    db,
    DB_PATH,
    createUser,
    findUserByUsername,
    findUserById,
    insertHistory,
    listHistoryByUser,
    setFavorite,
    deleteHistory,
};


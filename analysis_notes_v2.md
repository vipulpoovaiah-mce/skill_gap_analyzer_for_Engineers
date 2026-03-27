# SkillGap AI: Backend & Technical Analysis (Part 2)

This document provides a detailed technical breakdown of the **SkillGap AI** backend, focusing on authentication, AI integration, and the core analysis engine.

---

## 🔐 1. Authentication & Session Management
The application implements a secure, session-based authentication system:

- **`express-session`**: Handles persistent user sessions across requests.
- **`bcryptjs`**: Ensures user security by hashing passwords before storage.
- **Flexible Access**: 
    - **Registered Users**: Can save and track their analysis history.
    - **Guest Mode**: Allows immediate use of the analyzer without account creation (history is not persisted).

> [!TIP]
> The `requireAuth` middleware is used to protect sensitive API endpoints, ensuring data privacy for registered users.

---

## 🤖 2. Gemini AI Integration
The backend leverages the **Google Gemini API** (`gemini-flash-latest`) for advanced natural language processing:

- **Resume Parsing**: Automatically extracts structured skills, experience, and certifications from uploaded files.
- **Goal Independence**: The system intentionally does **not** auto-fill the target goal, allowing users to define their unique career objectives manually.
- **Market Intelligence**: Dynamically identifies the top 10 technical skills and relevant learning paths for any target role.

> [!IMPORTANT]
> A robust fallback mechanism is implemented. If the AI service is unavailable, the system defaults to core skill sets to maintain functionality.

---

## ⚙️ 3. Python Integration (The "Engine")
While the web server is Node.js, the heavy lifting of skill gap analysis is handled by high-performance Python scripts:

- **Execution**: `index.js` spawns `Backend/analyze_cli.py` as a child process.
- **Communication**: Data is streamed via `stdin` and results are captured from `stdout` as formatted HTML.
- **Logic**: The analysis utilizes the core `resume_analyzer.py` logic to calculate precise skill gaps.

---

## 📁 4. Database & File Handling
The project is designed for efficiency and clean data management:

- **SQLite3**: A lightweight yet powerful database for user data and history, managed via `db/database.js`.
- **Multer**: Handles file uploads with support for **PDF**, **DOCX**, and **TXT** formats.
- **Auto-Cleanup**: Uploaded resumes are deleted immediately after processing to save space and ensure privacy.

---

## 🎨 5. Frontend & Sign-in
The frontend is decoupled into the main application and a dedicated authentication module:
- **`Sign-in/`**: Standalone authentication module. The redundant "Go to Main site" button has been removed for a cleaner onboarding experience.
- **`Frontend/`**: The core dashboard where analysis results are displayed and managed.
- **`extra/`**: A new module containing high-end informational pages:
    - `how_it_works.html`: A modern, sectioned breakdown of the AI analysis process.
    - `features.html`: Highlights the premium advantages and technical edge of SkillGap AI.

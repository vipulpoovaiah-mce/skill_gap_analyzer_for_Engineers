# Analysis of Mini_projects (SkillGap AI)

## Project Overview
SkillGap AI is a full-stack application designed to analyze resumes and identify skill gaps relative to career goals. It uses a Node.js/Express backend that interfaces with Python scripts for the heavy lifting of resume parsing and skill analysis.

## Key Components

### 1. Root Directory
- **`index.js`**: The main Express server.
  - Serves static files from `Frontend/`.
  - `POST /parse-resume`: Uploads a PDF/TXT resume and calls `Backend/parse_cli.py`.
  - `POST /analyze`: Receives job goals and skills, then calls `Backend/analyze_cli.py`.
- **`package.json`**: Dependencies include `express`, `multer` (for file uploads), and `@google/generative-ai`.
- **`.env`**: Likely contains API keys (e.g., Google Gemini or OpenAI).

### 2. Backend (`/Backend`)
- **`parse_cli.py`**: A CLI wrapper for resume parsing logic.
- **`analyze_cli.py`**: A CLI wrapper for the analysis engine.
- **`resume_analyzer.py`**: Core logic for analyzing resumes.
- **`ObjListOfTokens.py` & `ObjTokensToSkills.py`**: Likely utility scripts for text processing and skill extraction.
- **`requirements.txt`**: Python dependencies (e.g., `PyPDF2`, `regex`, etc.).

### 3. Frontend (`/Frontend`)
- **`index.html`**: The main user interface.
- **`style.css`**: Styling for the application.
- **`script.js`**: Client-side logic for handling file uploads and interacting with the API.

## Workflow
1. User uploads a resume via the web interface.
2. `index.js` saves the file temporarily and calls `parse_cli.py`.
3. `parse_cli.py` extracts text and potentially structured data, returning it as JSON.
4. User provides career goals.
5. `index.js` calls `analyze_cli.py` with the extracted skills and goals.
6. The system calculates skill gaps and provides recommendations.

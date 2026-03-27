import sys
import json
import PyPDF2
from resume_analyzer import ResumeAnalyzer


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        return

    filepath = sys.argv[1]
    text = ""
    try:
        if filepath.lower().endswith('.pdf'):
            with open(filepath, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    text += (page.extract_text() or "") + " "
        else:
            with open(filepath, 'r', encoding='utf-8') as f:
                text = f.read()

        analyzer = ResumeAnalyzer()
        found_skills = analyzer.analyze(text)

        parsed = {
            "goal": "Data Science Role" if len(found_skills) > 2 else "Professional",
            "skills": ", ".join(found_skills[:10]),
            "scores": "None extracted automatically",
            "experience": text[:500].replace('\n', ' ') + "...",
            "hobbies": "Not mentioned"
        }

        print(json.dumps({"parsed": parsed}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


if __name__ == "__main__":
    main()

import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from resume_analyzer import ResumeAnalyzer
import PyPDF2
import io

app = Flask(__name__, template_folder='../Frontend', static_folder='../Frontend')
CORS(app)

analyzer = ResumeAnalyzer()

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    skills = data.get('skills', '')
    experience = data.get('experience', '')
    goal = data.get('goal', '')
    
    combined_text = f"{goal} {skills} {experience}"
    
    # Extract skills
    found_skills = analyzer.analyze(combined_text)
    
    # Generate Roadmap
    roadmap = analyzer.generate_roadmap(found_skills)
    
    # Generate interactive HTML response mapped into resultArea
    result_html = f'''
        <div style="animation: fadeIn 0.5s ease-out;">
            <h2 style="color: #111; margin-bottom: 20px; font-size: 1.5rem;">Career Roadmap Analysis</h2>
            
            <div style="background: #E8F5E9; border-left: 4px solid #4CAF50; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="color: #2E7D32; margin-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    Skills Matched
                </h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    {''.join([f'<span style="background: #FFF; color: #2E7D32; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; border: 1px solid #C8E6C9;">{skill}</span>' for skill in roadmap['matched']]) if roadmap['matched'] else '<span style="color: #666; font-size: 0.9rem;">No direct matches found. Add more experience!</span>'}
                </div>
            </div>
            
            <div style="background: #FFF3E0; border-left: 4px solid #FF9800; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="color: #E65100; margin-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    Skills Gap (Missing from Market Demand)
                </h3>
                <p style="font-size: 0.9rem; color: #666; margin-bottom: 12px;">Based on industry analysis across Data Science roles, these skills are highly requested but missing from your profile. Focus on acquiring these to close the gap.</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    {''.join([f'<span style="background: #FFF; color: #E65100; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; border: 1px solid #FFE0B2;">{skill}</span>' for skill in roadmap['missing']]) if roadmap['missing'] else '<span style="color: #666; font-size: 0.9rem;">Great! You meet the primary market demand skills.</span>'}
                </div>
            </div>
            
            <div style="background: #F3F4F6; padding: 15px; border-radius: 4px;">
                <h3 style="color: #4B5563; margin-bottom: 10px; font-size: 1.1rem;">Additional Skills Detected</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    {''.join([f'<span style="background: #FFF; color: #4B5563; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; border: 1px solid #D1D5DB;">{skill}</span>' for skill in roadmap['additional']])}
                </div>
            </div>
        </div>
    '''
    
    return jsonify({"result": result_html})

@app.route('/parse-resume', methods=['POST'])
def parse_resume():
    if 'resume' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['resume']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    text = ""
    try:
        if file.filename.endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
            for page in pdf_reader.pages:
                text += page.extract_text() + " "
        else:
            text = file.read().decode('utf-8')
            
        # Basic layout extraction simulation
        # Instead of generic AI parsing, we just dump it into experience and let analyzer run
        found_skills = analyzer.analyze(text)
        
        parsed = {
            "goal": "Data Science Specialist" if len(found_skills) > 3 else "Software Engineer",
            "skills": ", ".join(found_skills[:10]),
            "scores": "",
            "experience": text[:1000] + "...", # Clip to avoid massive textareas
            "hobbies": ""
        }
        return jsonify({"parsed": parsed})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

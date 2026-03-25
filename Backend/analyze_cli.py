import sys
import json
from resume_analyzer import ResumeAnalyzer

def main():
    try:
        lines = sys.stdin.read().splitlines()
        # Expecting: goal, skills, scores, experience, hobbies, market_skills (comma separated), courses (json string)
        if len(lines) >= 7:
            goal = lines[0]
            skills_raw = lines[1]
            scores = lines[2]
            experience = lines[3]
            hobbies = lines[4]
            market_skills_raw = lines[5]
            courses_raw = lines[6]
        else:
            goal = lines[0] if len(lines) > 0 else ""
            skills_raw = lines[1] if len(lines) > 1 else ""
            experience = lines[3] if len(lines) > 3 else ""
            market_skills_raw = ""
            courses_raw = "[]"
            
        market_skills = [s.strip() for s in market_skills_raw.split(',') if s.strip()]
        try:
            courses = json.loads(courses_raw)
        except:
            courses = []
            
        combined_text = f"{goal} {skills_raw} {experience}"
        
        analyzer = ResumeAnalyzer()
        # 1. Extract skills from text
        found_skills = set(analyzer.analyze(combined_text))
        
        # 2. Add skills from the manual input field (comma separated)
        manual_skills = [s.strip() for s in skills_raw.split(',') if s.strip()]
        for ms in manual_skills:
            if ms.lower() != "not specified":
                found_skills.add(ms)
                
        roadmap = analyzer.generate_roadmap(list(found_skills), market_skills)
        
        # We print HTML exactly like app.py did, so index.js sends it back as {result: "html"}
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
                    Skills Gap (Missing from Industry Standard)
                </h3>
                <p style="font-size: 0.9rem; color: #666; margin-bottom: 12px;">Based on industry analysis for <strong>{goal if goal else "your target role"}</strong>, these skills are highly requested but missing from your profile.</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    {''.join([f'<span style="background: #FFF; color: #E65100; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; border: 1px solid #FFE0B2;">{skill}</span>' for skill in roadmap['missing']]) if roadmap['missing'] else '<span style="color: #666; font-size: 0.9rem;">Great! You meet the primary market demand skills.</span>'}
                </div>
            </div>

            <div style="background: #EEF2FF; border-left: 4px solid #6366F1; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="color: #4338CA; margin-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    Recommended Courses to Learn
                </h3>
                <div class="course-grid">
                    {''.join([f'<div class="course-card"><span class="course-name">{course.get("name", "N/A")}</span><span class="course-provider">{course.get("provider", "N/A")}</span></div>' for course in courses]) if courses else '<p style="color: #666; font-size: 0.9rem;">No specific courses recommended at this time.</p>'}
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
        
        # Write to stdout cleanly
        sys.stdout.write(result_html)
        
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()

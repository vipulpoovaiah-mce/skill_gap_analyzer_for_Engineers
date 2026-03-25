import re
import nltk
from nltk.tokenize import MWETokenizer
import ObjListOfTokens as atl
import ObjTokensToSkills as sl

# Ensure you have downloaded nltk punct/stopwords beforehand when deploying
# nltk.download('stopwords')
# nltk.download('punkt')
from nltk.corpus import stopwords

class ResumeAnalyzer:
    def __init__(self):
        try:
            self.stop_words = set(stopwords.words('english'))
        except:
            nltk.download('stopwords')
            self.stop_words = set(stopwords.words('english'))
            
        self.tokenizer = MWETokenizer(atl.LIST_OF_TOKENS)

    def clean_text(self, text):
        WHITESPACE = re.compile(r"(?a:\s+)")
        clean = text.replace("(", " ").replace(")", " ")
        clean = clean.replace("!", "").replace("?", " ")
        clean = clean.replace(".", " ").replace(":", " ")
        clean = clean.replace(";", " ").replace("/", " ")
        clean = clean.replace(",", " ")
        clean = WHITESPACE.sub(" ", clean).lower()
        return clean

    def analyze(self, text):
        clean = self.clean_text(text)
        
        # Remove stopwords
        clean_words = [w for w in clean.split() if w not in self.stop_words]
        
        # Tokenize (find multi-word skills)
        tokens = self.tokenizer.tokenize(clean_words)
        
        # Count tokens
        token_counts = {}
        for t in tokens:
            if t in token_counts:
                token_counts[t] += 1
            else:
                token_counts[t] = 1
                
        # Map tokens to skills
        skills_found = set()
        for t in token_counts.keys():
            if t in sl.TOKENS_TO_SKILLS:
                skills_found.add(sl.TOKENS_TO_SKILLS[t])
                
        return list(skills_found)

    def generate_roadmap(self, user_skills, market_skills):
        """
        Compares user skills against provided market industry standards.
        Uses partial matching to avoid strict equality issues (e.g. 'Data Structures' matches 'Data Structures and Algorithms').
        """
        user_skills_lower = [s.lower().strip() for s in user_skills]
        market_skills_lower = [s.lower().strip() for s in market_skills]
        
        matched_indices = set()
        user_matched_indices = set()
        
        # 1. Direct or partial matches from market perspective
        for i, m_skill in enumerate(market_skills_lower):
            for j, u_skill in enumerate(user_skills_lower):
                if u_skill in m_skill or m_skill in u_skill:
                    matched_indices.add(i)
                    user_matched_indices.add(j)
                    break
                    
        matching_skills = [market_skills[i] for i in matched_indices]
        missing_skills = [market_skills[i] for i in range(len(market_skills)) if i not in matched_indices]
        
        # Additional skills are user skills that didn't match any market demand
        additional_skills = [user_skills[j] for j in range(len(user_skills)) if j not in user_matched_indices]
        
        return {
            "matched": list(set(matching_skills)), # unique skills
            "missing": missing_skills,
            "additional": list(set(additional_skills))
        }

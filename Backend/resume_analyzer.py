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
        
    def get_market_demand(self):
        # We simulate the highly demanded data science / tech skills identified by the GitHub model.
        # This acts as our "Skills Gap" benchmark to compare users against.
        return [
            "Python", "SQL", "Machine Learning", "Data Science", "AWS", 
            "Data Visualization", "Microsoft SQL Server", "Tableau", 
            "Spark", "Hadoop", "Communication Skills", "Java"
        ]

    def generate_roadmap(self, user_skills):
        market_skills = set(self.get_market_demand())
        user_skills_set = set(user_skills)
        
        missing_skills = list(market_skills - user_skills_set)
        matching_skills = list(market_skills.intersection(user_skills_set))
        additional_skills = list(user_skills_set - market_skills)
        
        return {
            "matched": matching_skills,
            "missing": missing_skills,
            "additional": additional_skills
        }

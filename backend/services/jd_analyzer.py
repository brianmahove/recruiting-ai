import re
import spacy
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# --- NLTK DOWNLOADS ---
# Put these in app.py's init, or ensure they are downloaded persistently
# nltk.download('stopwords', quiet=True)
# nltk.download('punkt', quiet=True)

# --- SPACY MODEL LOAD ---
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading en_core_web_sm model for SpaCy...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def extract_skills_from_job_description(jd_text):
    stop_words = set(stopwords.words('english'))
    word_tokens = word_tokenize(jd_text.lower())
    # filtered_words = [w for w in word_tokens if w.isalpha() and w not in stop_words] # Not directly used below

    common_skills = [
        "python", "java", "javascript", "react", "angular", "vue.js", "node.js", "sql", "nosql",
        "aws", "azure", "gcp", "docker", "kubernetes", "git", "linux", "html", "css",
        "devops", "machine learning", "data science", "natural language processing", "nlp",
        "tensorflow", "pytorch", "scikit-learn", "excel", "agile", "scrum", "project management",
        "rest api", "api design", "cloud computing", "big data", "data analysis", "algorithms",
        "data structures", "communication", "teamwork", "problem-solving",
        "express.js", "mongodb", "postgresql", "mysql", "c++", "c#", "php",
        "ruby", "rails", "swift", "kotlin", "android", "ios", "tableau", "power bi",
        "spark", "hadoop", "kafka", "azure devops", "jenkins", "ansible", "terraform",
        "microservices", "spring boot", "django", "flask", "salesforce", "sap", "oracle"
    ]

    found_jd_skills = set()
    jd_lower = jd_text.lower()
    for skill in common_skills:
        if skill in jd_lower:
            found_jd_skills.add(skill)

    doc = nlp(jd_text)
    for ent in doc.ents:
        if ent.label_ in ["ORG", "PRODUCT", "LOC", "MISC"] and len(ent.text.split()) < 4:
            if any(tech_term in ent.text.lower() for tech_term in ["aws", "azure", "gcp", "docker", "kubernetes", "tensorflow", "pytorch", "sap", "oracle", "salesforce", "jenkins"]):
                found_jd_skills.add(ent.text.lower())

    return list(found_jd_skills)
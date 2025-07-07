import re
import spacy
from pdfminer.high_level import extract_text as pdf_extract_text
from docx import Document
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize

# --- NLTK DOWNLOADS ---
# Only download if not already downloaded by app.py's initial run
# or ensure a persistent environment where these are available.
# It's generally better to put downloads in a setup script or app.py's init.

# --- SPACY MODEL LOAD ---
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading en_core_web_sm model for SpaCy...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def extract_text_from_file(file_path):
    """Extracts text from PDF or DOCX files."""
    try:
        if file_path.endswith('.pdf'):
            return pdf_extract_text(file_path)
        elif file_path.endswith('.docx'):
            doc = Document(file_path)
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return ""
    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")
        return ""

def extract_education(text):
    education = []
    education_keywords = re.compile(r'(b\.?s\.?|bachelor(?:s)?|m\.?s\.?|master(?:s)?|ph\.?d\.?|doctorate|degree|diploma|university|college|institute|academy)', re.IGNORECASE)
    patterns = [
        r"(?:(?:bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|doctorate)\s+of\s+\w+\s*(?:in)?\s+[\w\s,.-]+(?:\s+at\s+[\w\s,.-]+)?|[\w\s,.-]+(?:university|college|institute|academy))",
        r"(?:(?:[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\s+(?:University|College|Institute|Academy))\s*[\s\S]*?(?:(?:bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|doctorate)\s+of\s+\w+(?:\s+in)?\s+[\w\s,.-]+)?(?:,\s*(?:\d{4}))?)",
        r"\b(?:[A-Z][A-Z\.]*\s+in\s+[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)(?:\s*,\s*\w+\s+University|\s*,\s*\d{4})?",
        r"(?:(?:Master|Bachelor|Ph\.D)\s+(?:of\s+)?[\w\s]+(?:,\s*(?:[A-Za-z]+\s*\d{4}|present))?\s*from\s+[\w\s,.-]+University)",
    ]

    doc = nlp(text)

    sentences = sent_tokenize(text)
    for sent in sentences:
        if education_keywords.search(sent):
            cleaned_sent = sent.replace('\n', ' ').strip()
            if len(cleaned_sent.split()) > 5 and len(cleaned_sent) > 20:
                education.append(cleaned_sent)

    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            edu_string = match.group(0).replace('\n', ' ').strip()
            if edu_string not in education and len(edu_string) > 10:
                education.append(edu_string)

    education = list(dict.fromkeys(education))
    return education

def extract_experience(text):
    experience = []
    experience_keywords = re.compile(r'(experience|work history|employment|previous roles|professional background)', re.IGNORECASE)

    sections = re.split(r'\n\s*(?:Work Experience|Experience|Employment History|Professional Experience|Projects|Project Experience)\s*\n', text, flags=re.IGNORECASE)

    if len(sections) > 1:
        experience_text = sections[1]
        job_entries = re.split(r'\n\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*-\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\bPresent|\bCurrent)\s+\d{4})|\n\s*(?:\d{4}\s*-\s*(?:\d{4}|Present|Current))\s*\n|\n\s*[A-Z][A-Za-z,\s.&-]+\s*\n\s*(?:[A-Z][a-z]+\s*){1,4}\s*\n', experience_text, flags=re.IGNORECASE)

        for entry in job_entries:
            cleaned_entry = entry.replace('\n', ' ').strip()
            if len(cleaned_entry) > 50:
                experience.append(cleaned_entry)
    else:
        doc = nlp(text)
        sentences = sent_tokenize(text)

        job_pattern = re.compile(r'(managed|developed|implemented|led|created|designed|built|responsibilities|achievements|projects)', re.IGNORECASE)
        date_pattern = re.compile(r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*-\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\bPresent|\bCurrent|\bTill Date|\bTo Date|\bNow)\s*\d{4}', re.IGNORECASE)

        temp_exp = []
        for sent in sentences:
            if job_pattern.search(sent) or date_pattern.search(sent):
                cleaned_sent = sent.replace('\n', ' ').strip()
                if len(cleaned_sent) > 30:
                    temp_exp.append(cleaned_sent)

        if temp_exp:
            current_entry = ""
            for item in temp_exp:
                if date_pattern.search(item):
                    if current_entry:
                        experience.append(current_entry)
                    current_entry = item
                else:
                    current_entry += " " + item
            if current_entry:
                experience.append(current_entry)

    experience = list(dict.fromkeys(experience))
    return experience

def parse_resume_text(text):
    doc = nlp(text)

    parsed_data = {
        "name": "", "email": "", "phone": "",
        "skills": [], "experience": [], "education": [],
        "summary": text[:500] + "..." if len(text) > 500 else text
    }

    for ent in doc.ents:
        if ent.label_ == "PERSON" and len(ent.text.split()) > 1 and not parsed_data["name"]:
            if not re.search(r'\b(engineer|developer|manager|specialist|consultant)\b', ent.text, re.IGNORECASE):
                parsed_data["name"] = ent.text
                break
    if not parsed_data["name"]:
        lines = text.split('\n')
        if lines:
            for line in lines:
                if len(line.strip().split()) >= 2 and len(line.strip().split()) <= 4 and line.strip().istitle():
                    if not re.search(r'\b(address|email|phone|website)\b', line.strip(), re.IGNORECASE):
                        parsed_data["name"] = line.strip()
                        break

    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    if email_match:
        parsed_data["email"] = email_match.group(0)

    phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)
    if phone_match:
        parsed_data["phone"] = phone_match.group(0)

    common_tech_skills = [
        "python", "java", "javascript", "react", "angular", "vue", "sql", "nosql",
        "aws", "azure", "gcp", "docker", "kubernetes", "git", "linux", "html",
        "css", "devops", "machine learning", "data science", "nlp", "tensorflow",
        "pytorch", "excel", "agile", "scrum", "project management", "rest api", "api",
        "node.js", "express.js", "mongodb", "postgresql", "mysql", "c++", "c#", "php",
        "ruby", "rails", "swift", "kotlin", "android", "ios", "tableau", "power bi",
        "spark", "hadoop", "kafka", "azure devops", "jenkins", "ansible", "terraform",
        "microservices", "spring boot", "django", "flask", "salesforce", "sap", "oracle"
    ]

    found_skills = set()
    text_lower = text.lower()
    for skill in common_tech_skills:
        if skill in text_lower:
            found_skills.add(skill.title())

    parsed_data["skills"] = list(found_skills)
    parsed_data["experience"] = extract_experience(text)
    parsed_data["education"] = extract_education(text)
    return parsed_data
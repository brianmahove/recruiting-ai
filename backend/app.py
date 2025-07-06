import os
import re
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import spacy
from pdfminer.high_level import extract_text
from docx import Document
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize # Added sent_tokenize
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime # Added for unique filenames

# Local imports for database
from database import db, Candidate, JobDescription, init_db

# --- NLTK DOWNLOADS ---
nltk.download('stopwords', quiet=True)
nltk.download('punkt', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True) # For POS tagging, useful for parsing

# --- SPACY MODEL LOAD ---
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading en_core_web_sm model for SpaCy...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- DATABASE CONFIG ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recruiting.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
init_db(app)

# --- FILE UPLOAD CONFIG ---
# Change UPLOAD_FOLDER to a more persistent location if needed,
# or ensure this folder is backed up.
UPLOAD_FOLDER = 'uploaded_resumes'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'pdf', 'docx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- TEXT EXTRACTION UTILITIES ---
def extract_text_from_file(file_path):
    """Extracts text from PDF or DOCX files."""
    try:
        if file_path.endswith('.pdf'):
            return extract_text(file_path)
        elif file_path.endswith('.docx'):
            doc = Document(file_path)
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return ""
    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")
        return ""

# --- RESUME/JD PARSING & MATCHING UTILITIES ---

def extract_education(text):
    education = []
    # Patterns for common education keywords and degrees
    education_keywords = re.compile(r'(b\.?s\.?|bachelor(?:s)?|m\.?s\.?|master(?:s)?|ph\.?d\.?|doctorate|degree|diploma|university|college|institute|academy)', re.IGNORECASE)
    # More robust patterns to capture lines that look like education
    patterns = [
        r"(?:(?:bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|doctorate)\s+of\s+\w+\s*(?:in)?\s+[\w\s,.-]+(?:\s+at\s+[\w\s,.-]+)?|[\w\s,.-]+(?:university|college|institute|academy))",
        r"(?:(?:[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\s+(?:University|College|Institute|Academy))\s*[\s\S]*?(?:(?:bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|doctorate)\s+of\s+\w+(?:\s+in)?\s+[\w\s,.-]+)?(?:,\s*(?:\d{4}))?)",
        r"\b(?:[A-Z][A-Z\.]*\s+in\s+[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)(?:\s*,\s*\w+\s+University|\s*,\s*\d{4})?", # e.g., "B.S. in Computer Science, University of X"
        r"(?:(?:Master|Bachelor|Ph\.D)\s+(?:of\s+)?[\w\s]+(?:,\s*(?:[A-Za-z]+\s*\d{4}|present))?\s*from\s+[\w\s,.-]+University)",
    ]

    doc = nlp(text)
    
    # Try to find specific entities (ORG, GPE, DATE) around education keywords
    # This is still heuristic and can be improved with custom NER models or more complex rules.
    sentences = sent_tokenize(text)
    for sent in sentences:
        if education_keywords.search(sent):
            # Attempt to clean and add
            cleaned_sent = sent.replace('\n', ' ').strip()
            # Filter out very short or clearly irrelevant sentences
            if len(cleaned_sent.split()) > 5 and len(cleaned_sent) > 20:
                education.append(cleaned_sent)
                
    # Use more specific regex patterns
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            edu_string = match.group(0).replace('\n', ' ').strip()
            if edu_string not in education and len(edu_string) > 10: # Avoid duplicates and very short matches
                education.append(edu_string)

    # Simple deduplication
    education = list(dict.fromkeys(education))
    return education


def extract_experience(text):
    experience = []
    # Keywords often found in experience sections
    experience_keywords = re.compile(r'(experience|work history|employment|previous roles|professional background)', re.IGNORECASE)

    # Look for common section headers
    sections = re.split(r'\n\s*(?:Work Experience|Experience|Employment History|Professional Experience|Projects|Project Experience)\s*\n', text, flags=re.IGNORECASE)
    
    if len(sections) > 1:
        # Assuming the first split contains info before experience, and subsequent are experience sections
        experience_text = sections[1] # Take the first experience section after split
        
        # Split into potential job entries (e.g., by date ranges or company/title lines)
        # This is a very basic attempt; real parsing requires more sophisticated NLP
        job_entries = re.split(r'\n\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*-\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\bPresent|\bCurrent)\s+\d{4})|\n\s*(?:\d{4}\s*-\s*(?:\d{4}|Present|Current))\s*\n|\n\s*[A-Z][A-Za-z,\s.&-]+\s*\n\s*(?:[A-Z][a-z]+\s*){1,4}\s*\n', experience_text, flags=re.IGNORECASE)
        
        for entry in job_entries:
            cleaned_entry = entry.replace('\n', ' ').strip()
            # Filter out very short or empty strings that aren't real job entries
            if len(cleaned_entry) > 50: # Arbitrary length to filter noise
                experience.append(cleaned_entry)
    else:
        # If no clear section header, try to extract lines that look like work entries
        doc = nlp(text)
        sentences = sent_tokenize(text)
        
        # Look for sentences containing job-related keywords or patterns
        job_pattern = re.compile(r'(managed|developed|implemented|led|created|designed|built|responsibilities|achievements|projects)', re.IGNORECASE)
        date_pattern = re.compile(r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*-\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\bPresent|\bCurrent|\bTill Date|\bTo Date|\bNow)\s*\d{4}', re.IGNORECASE)

        temp_exp = []
        for sent in sentences:
            if job_pattern.search(sent) or date_pattern.search(sent):
                cleaned_sent = sent.replace('\n', ' ').strip()
                if len(cleaned_sent) > 30:
                    temp_exp.append(cleaned_sent)
        
        # Group potentially related sentences
        if temp_exp:
            current_entry = ""
            for item in temp_exp:
                if date_pattern.search(item): # If it contains a date, start a new entry
                    if current_entry:
                        experience.append(current_entry)
                    current_entry = item
                else:
                    current_entry += " " + item
            if current_entry:
                experience.append(current_entry)

    # Simple deduplication
    experience = list(dict.fromkeys(experience))
    return experience


def parse_resume_text(text):
    doc = nlp(text)
    
    parsed_data = {
        "name": "", "email": "", "phone": "",
        "skills": [], "experience": [], "education": [],
        "summary": text[:500] + "..." if len(text) > 500 else text
    }

    # Name extraction (existing, kept for consistency)
    for ent in doc.ents:
        if ent.label_ == "PERSON" and len(ent.text.split()) > 1 and not parsed_data["name"]:
            # Basic filtering for common non-name entities that spaCy might mislabel
            if not re.search(r'\b(engineer|developer|manager|specialist|consultant)\b', ent.text, re.IGNORECASE):
                parsed_data["name"] = ent.text
                break
    if not parsed_data["name"]:
        lines = text.split('\n')
        if lines:
            for line in lines:
                if len(line.strip().split()) >= 2 and len(line.strip().split()) <= 4 and line.strip().istitle():
                    if not re.search(r'\b(address|email|phone|website)\b', line.strip(), re.IGNORECASE): # Filter lines that are contact info
                        parsed_data["name"] = line.strip()
                        break

    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    if email_match:
        parsed_data["email"] = email_match.group(0)

    phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)
    if phone_match:
        parsed_data["phone"] = phone_match.group(0)

    stop_words = set(stopwords.words('english'))
    # word_tokens = word_tokenize(text.lower()) # Not directly used for skill matching below
    
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
            found_skills.add(skill.title()) # Capitalize for consistency

    parsed_data["skills"] = list(found_skills)
    parsed_data["experience"] = extract_experience(text) # NEW
    parsed_data["education"] = extract_education(text) # NEW
    return parsed_data

# extract_skills_from_job_description remains the same as previous iteration
def extract_skills_from_job_description(jd_text):
    stop_words = set(stopwords.words('english'))
    word_tokens = word_tokenize(jd_text.lower())
    filtered_words = [w for w in word_tokens if w.isalpha() and w not in stop_words]

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

def calculate_match_score(resume_data, jd_skills):
    if not jd_skills:
        return 0, []

    resume_skills_lower = set(s.lower() for s in resume_data.get("skills", []))
    jd_skills_lower = set(s.lower() for s in jd_skills)

    matched_skills = resume_skills_lower.intersection(jd_skills_lower)
    score = (len(matched_skills) / len(jd_skills_lower)) * 100
    return round(score, 2), list(matched_skills)

# --- API ROUTES ---

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'resume' not in request.files:
        return jsonify({"error": "No resume file part"}), 400
    
    resume_file = request.files['resume']
    job_description_text = request.form.get('job_description', '')
    job_title = request.form.get('job_title', 'Untitled Job')

    if resume_file.filename == '':
        return jsonify({"error": "No selected resume file"}), 400

    if resume_file and allowed_file(resume_file.filename):
        # Create a unique filename for storage
        original_filename = secure_filename(resume_file.filename)
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{original_filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        resume_file.save(filepath) # Save the file permanently

        # 1. Parse Resume
        resume_text = extract_text_from_file(filepath)
        parsed_resume_data = parse_resume_text(resume_text)

        # 2. Extract skills from Job Description
        # Check if a JD with the same title and text already exists
        # This prevents duplicate JDs if the user submits the same JD multiple times
        existing_jd = JobDescription.query.filter_by(title=job_title, text=job_description_text).first()
        if existing_jd:
            jd_skills_identified = json.loads(existing_jd.skills_identified) if existing_jd.skills_identified else []
            current_jd = existing_jd
        else:
            jd_skills_identified = extract_skills_from_job_description(job_description_text)
            current_jd = JobDescription(
                title=job_title,
                text=job_description_text,
                skills_identified=json.dumps(jd_skills_identified)
            )
            db.session.add(current_jd)
            db.session.commit() # Commit to get the JD ID

        # 3. Calculate Match Score
        match_score, matched_skills = calculate_match_score(parsed_resume_data, jd_skills_identified)

       
          # 4. Save Candidate to DB
        new_candidate = Candidate(
            name=parsed_resume_data.get('name'), 
            email=parsed_resume_data.get('email'), # CHANGE THIS LINE
            phone=parsed_resume_data.get('phone'), # CHANGE THIS LINE
            skills=json.dumps(parsed_resume_data.get('skills', [])),
            experience=json.dumps(parsed_resume_data.get('experience', [])),
            education=json.dumps(parsed_resume_data.get('education', [])),
            summary=parsed_resume_data.get('summary'),
            match_score=match_score,
            job_description_id=current_jd.id,
            resume_filepath=unique_filename,
            status='New Candidate'
        )
        db.session.add(new_candidate)
        db.session.commit()

        return jsonify({
            "status": "success",
            "filename": original_filename, # Return original filename for display
            "stored_filename": unique_filename, # Return stored unique filename for download link
            "parsed_resume": parsed_resume_data,
            "job_description_skills_identified": jd_skills_identified,
            "match_score": match_score,
            "matched_skills": matched_skills,
            "candidate_id": new_candidate.id,
            "job_description_id": current_jd.id
        })
    else:
        return jsonify({"error": "File type not allowed"}), 400

# --- NEW: ROUTE TO SERVE UPLOADED RESUMES ---
@app.route('/download_resume/<filename>', methods=['GET'])
def download_resume(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

# --- CANDIDATE CRM API (Updated for status and filtering/sorting) ---

@app.route('/candidates', methods=['GET'])
def get_candidates():
    query = Candidate.query

    # Filtering
    job_description_id = request.args.get('job_description_id', type=int)
    if job_description_id:
        query = query.filter_by(job_description_id=job_description_id)

    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    min_score = request.args.get('min_score', type=float)
    if min_score is not None:
        query = query.filter(Candidate.match_score >= min_score)

    # Search by name or email
    search_term = request.args.get('search_term')
    if search_term:
        search_like = f"%{search_term}%"
        query = query.filter(
            (Candidate.name.ilike(search_like)) |
            (Candidate.email.ilike(search_like))
        )

    # Sorting
    sort_by = request.args.get('sort_by', 'created_at') # Default sort
    sort_order = request.args.get('sort_order', 'desc') # Default order

    if sort_by == 'match_score':
        if sort_order == 'asc':
            query = query.order_by(Candidate.match_score.asc())
        else:
            query = query.order_by(Candidate.match_score.desc())
    elif sort_by == 'name':
        if sort_order == 'asc':
            query = query.order_by(Candidate.name.asc())
        else:
            query = query.order_by(Candidate.name.desc())
    elif sort_by == 'created_at':
        if sort_order == 'asc':
            query = query.order_by(Candidate.created_at.asc())
        else:
            query = query.order_by(Candidate.created_at.desc())
    # Add more sorting options as needed

    candidates = query.all()
    return jsonify([candidate.to_dict() for candidate in candidates])

@app.route('/candidates/<int:candidate_id>', methods=['GET'])
def get_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if candidate:
        candidate_data = candidate.to_dict()
        if candidate.job_description:
            candidate_data['job_description'] = candidate.job_description.to_dict()
        return jsonify(candidate_data)
    return jsonify({"error": "Candidate not found"}), 404

@app.route('/candidates/<int:candidate_id>', methods=['PUT'])
def update_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return jsonify({"error": "Candidate not found"}), 404
    
    data = request.get_json()
    candidate.name = data.get('name', candidate.name)
    candidate.email = data.get('email', candidate.email)
    candidate.phone = data.get('phone', candidate.phone)
    if 'skills' in data:
        candidate.skills = json.dumps(data['skills'])
    if 'experience' in data:
        candidate.experience = json.dumps(data['experience'])
    if 'education' in data:
        candidate.education = json.dumps(data['education'])
    candidate.summary = data.get('summary', candidate.summary)
    candidate.status = data.get('status', candidate.status) # NEW: Update status
    
    db.session.commit()
    return jsonify(candidate.to_dict())

@app.route('/candidates/<int:candidate_id>', methods=['DELETE'])
def delete_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return jsonify({"error": "Candidate not found"}), 404
    
    # Optional: Delete the resume file when candidate is deleted
    if candidate.resume_filepath:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], candidate.resume_filepath)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Deleted resume file: {file_path}")
        else:
            print(f"Resume file not found for deletion: {file_path}")

    db.session.delete(candidate)
    db.session.commit()
    return jsonify({"status": "success", "message": "Candidate deleted"})

# --- NEW: JOB DESCRIPTION MANAGEMENT API ---
@app.route('/job_descriptions', methods=['GET'])
def get_job_descriptions():
    jds = JobDescription.query.all()
    return jsonify([jd.to_dict() for jd in jds])

@app.route('/job_descriptions/<int:jd_id>', methods=['GET'])
def get_job_description(jd_id):
    jd = JobDescription.query.get(jd_id)
    if jd:
        return jsonify(jd.to_dict())
    return jsonify({"error": "Job Description not found"}), 404

@app.route('/job_descriptions/<int:jd_id>', methods=['DELETE'])
def delete_job_description(jd_id):
    jd = JobDescription.query.get(jd_id)
    if not jd:
        return jsonify({"error": "Job Description not found"}), 404
    
    # Check if any candidates are linked to this JD before deleting
    if jd.candidates:
        return jsonify({"error": "Cannot delete Job Description: Candidates are linked to it."}), 400

    db.session.delete(jd)
    db.session.commit()
    return jsonify({"status": "success", "message": "Job Description deleted"})


# --- EMAIL SENDING API (No change here, just included for completeness) ---
SMTP_SERVER = os.environ.get('SMTP_SERVER')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')

@app.route('/send_email', methods=['POST'])
def send_email():
    data = request.get_json()
    recipient_email = data.get('recipient_email')
    subject = data.get('subject')
    body = data.get('body')

    if not all([recipient_email, subject, body]):
        return jsonify({"error": "Missing recipient email, subject, or body"}), 400
    
    if not all([SMTP_USERNAME, SMTP_PASSWORD, SMTP_SERVER]):
        return jsonify({"error": "SMTP server credentials are not configured on the backend."}), 500

    try:
        msg = MIMEMultipart("alternative")
        msg['From'] = SMTP_USERNAME
        msg['To'] = recipient_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_USERNAME, recipient_email, msg.as_string())
        
        return jsonify({"status": "success", "message": "Email sent successfully!"}), 200

    except smtplib.SMTPAuthenticationError:
        return jsonify({"error": "SMTP Authentication Error. Check username/password or app password."}), 401
    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({"error": f"Failed to send email: {str(e)}"}), 500

if __name__ == '__main__':
    # When running for the first time with database changes, you might want to:
    # 1. Stop Flask app
    # 2. Delete recruiting.db (if you want a fresh start and new columns)
    # 3. Run Flask app
    app.run(debug=True, port=5000)
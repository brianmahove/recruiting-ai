import eventlet
eventlet.monkey_patch()

import os
import re
import json
import smtplib
import tempfile
import numpy as np
import pandas as pd
from datetime import datetime

# Flask and Extensions
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_bcrypt import Bcrypt
from werkzeug.utils import secure_filename

# NLP and AI
import spacy
import nltk
# --- NLTK Data Path Configuration ---
nltk_data_path = r'C:\Users\HomePC\AppData\Roaming\nltk_data'
if os.path.exists(nltk_data_path):
    nltk.data.path.append(nltk_data_path)
    print(f"NLTK data path {nltk_data_path} added.")
else:
    print(f"Error: NLTK data path not found at {nltk_data_path}. Please ensure data is downloaded there.")
    # Consider a more forceful exit or warning here if NLTK is crucial immediately.

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from textblob import TextBlob
# from pyresparser import ResumeParser # This is not used in the new parsing logic
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import shap
from collections import defaultdict

# Calendar Integration
from icalendar import Calendar, Event, vCalAddress, vText

# Utility
from faker import Faker
import random
import time

# For PDF and DOCX text extraction
import pdfplumber # Missing import
# import cv2 # Missing import, but analyze_facial_data should be a placeholder or properly implemented

import docx
from docx import Document # For docx.Document in extract_text_from_file

# Local imports
from database import db, Candidate, JobDescription, User, ScreeningQuestion, \
                     CandidateScreeningResponse, SkillAssessment, AssessmentQuestion, \
                     VideoInterview, CandidateNote, CandidateStatusHistory, \
                     CandidateAssessmentResult, CandidateQuestionResponse, \
                     PipelineStage, EmailTemplate, OutreachCampaign, InterviewSchedule, init_db

# ✅ Initialize Flask app and extensions
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recruiting.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads' # Main upload folder for resumes

CORS(app)
bcrypt = Bcrypt(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# ✅ Initialize db
db.init_app(app)

# --- NLTK DOWNLOADS ---
# Download NLTK data (run once)
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except nltk.downloader.DownloadError:
    nltk.download('vader_lexicon', quiet=True)
    print("Downloaded NLTK 'vader_lexicon'.")

# nltk.download('stopwords', quiet=True)
# nltk.download('punkt', quiet=True)
# nltk.download('averaged_perceptron_tagger', quiet=True) # For POS tagging, useful for parsing

# --- SPACY MODEL LOAD ---
# Load spaCy model outside of functions for efficiency
try:
    nlp = spacy.load('en_core_web_sm')
except OSError:
    print("Downloading spaCy model 'en_core_web_sm'...")
    from spacy.cli import download
    download('en_core_web_sm')
    nlp = spacy.load('en_core_web_sm')

# Ensure upload folder exists for resumes
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Configuration for video uploads
VIDEO_UPLOAD_FOLDER = 'uploads/video_interviews' # Create this directory
if not os.path.exists(VIDEO_UPLOAD_FOLDER):
    os.makedirs(VIDEO_UPLOAD_FOLDER)

VIDEO_ALLOWED_EXTENSIONS = {'mp4', 'webm', 'ogg'}

def allowed_video_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in VIDEO_ALLOWED_EXTENSIONS



# Placeholder for AI analysis service
def perform_ai_video_analysis(video_path):
    """
    Simulates sending video to an AI service for sentiment/behavior analysis.
    In a real application, this would be an API call to Google Cloud Video AI, AWS Rekognition,
    Azure Video Indexer, or a dedicated sentiment analysis API.
    """
    print(f"Simulating AI analysis for video: {video_path}")
    # Dummy results
    sentiment = round(random.uniform(-0.8, 0.8), 2)
    behavior = "Candidate showed good engagement and clear communication." if sentiment > 0 else "Candidate seemed a bit reserved."
    keywords = "communication, experience, team, challenge"
    raw_feedback = {"sentiment": sentiment, "behavior": behavior, "keywords": keywords.split(', ')}

    # Simulate some processing time
    time.sleep(random.uniform(2, 5))
    return {
        "sentiment_score": sentiment,
        "behavior_analysis_summary": behavior,
        "keywords_detected": keywords,
        "ai_feedback_raw": json.dumps(raw_feedback)
    }



# --- DB Creation (ensure this is in your app.py) ---
# This block should be after db = SQLAlchemy(app) and before your routes
with app.app_context():
    db.create_all()

    # Optional: Seed default pipeline stages if they don't exist
    default_stages = ["New Candidate", "Under Review", "AI Screened", "Interview Scheduled",
                      "Interviewed", "Assessment Started", "Assessment Completed", "Assessment Graded",
                      "Offered", "Hired", "Rejected"]
    for i, stage_name in enumerate(default_stages):
        if not PipelineStage.query.filter_by(name=stage_name).first():
            db.session.add(PipelineStage(name=stage_name, order=i, is_default=True))
    db.session.commit()

    # Optional: Seed a dummy user for testing if no users exist
    if not User.query.first():
        admin_user = User(username='admin', email='admin@example.com', role='Admin')
        admin_user.set_password('password123')
        db.session.add(admin_user)
        db.session.commit()
        print("Default admin user created: admin/password123")
    # Optional: Seed more dummy users
    fake = Faker()
    if User.query.count() < 5: # Create 5 users if less than 5 exist
        for _ in range(5 - User.query.count()):
            user = User(username=fake.user_name(), email=fake.email(), role=random.choice(['Recruiter', 'Hiring Manager']))
            user.set_password('password') # Simple password for dummy users
            db.session.add(user)
        db.session.commit()
        print(f"Added {5 - User.query.count()} dummy users.")

# --- Utility Functions (parse_resume_text, calculate_match_score - ensure these are present) ---

def parse_resume_text(file_path):
    # This is a simplified example. pyresparser handles more, but direct text extraction
    # for PDF/DOCX often needs libraries like pdfplumber/python-docx for robustness.
    # For pyresparser to work well, ensure you have its dependencies installed and
    # the 'en_core_web_sm' spacy model downloaded.

    data = ResumeParser(file_path).get_extracted_data()
    return data # This dict contains name, email, phone, skills, experience, education, etc.

def calculate_match_score(resume_text, job_description_text):
    if not resume_text or not job_description_text:
        return 0.0

    # Clean and preprocess text (remove stopwords, punctuation, lemmatize)
    def preprocess(text):
        doc = nlp(text.lower())
        tokens = [token.lemma_ for token in doc if not token.is_stop and not token.is_punct and not token.is_space]
        return " ".join(tokens)

    processed_resume = preprocess(resume_text)
    processed_jd = preprocess(job_description_text)

    documents = [processed_resume, processed_jd]
    tfidf_vectorizer = TfidfVectorizer()
    tfidf_matrix = tfidf_vectorizer.fit_transform(documents)

    # Calculate cosine similarity
    cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
    score = cosine_sim[0][0] * 100 # Convert to percentage

    return score

# --- NEW: AI Analysis Functions (Placeholders) ---

def analyze_text_response(question_text, candidate_response_text, expected_keywords, ideal_answer):
    # Basic Keyword Matching and Sentiment
    score = 0.0
    sentiment_polarity = 0.0

    if candidate_response_text:
        text_blob = TextBlob(candidate_response_text)
        sentiment_polarity = text_blob.sentiment.polarity # -1.0 (negative) to 1.0 (positive)

        # Basic keyword matching
        response_lower = candidate_response_text.lower()
        matched_keywords = [kw for kw in expected_keywords if kw.lower() in response_lower]
        if expected_keywords:
            score = (len(matched_keywords) / len(expected_keywords)) * 100 # Simple percentage

        # You can add more complex NLP here:
        # - Semantic similarity with ideal_answer using TF-IDF/Cosine Similarity
        # - Entity recognition (e.g., SpaCy to check for specific entities mentioned)
        # - Custom ML models for more nuanced scoring

    return score, sentiment_polarity

def evaluate_open_text_response(expected_keywords: str, candidate_response: str) -> dict:
    """
    Evaluates an open-ended text response using NLP.
    Scores based on keyword presence and semantic similarity.
    Provides sentiment analysis and basic feedback.

    Args:
        expected_keywords (str): Comma-separated keywords or a brief expected answer description.
        candidate_response (str): The candidate's free-text response.

    Returns:
        dict: Contains score, feedback, sentiment.
    """
    if not candidate_response:
        return {"score": 0.0, "feedback": "No response provided.", "sentiment": "neutral"}

    # Keyword matching (basic)
    keywords = [kw.strip().lower() for kw in expected_keywords.split(',') if kw.strip()]
    response_lower = candidate_response.lower()
    keyword_score = 0
    feedback_messages = []

    if keywords:
        found_keywords = [kw for kw in keywords if kw in response_lower]
        keyword_score = (len(found_keywords) / len(keywords)) * 100 if keywords else 0
        if found_keywords:
            feedback_messages.append(f"Recognized key terms: {', '.join(found_keywords)}.")
        else:
            feedback_messages.append("Did not identify expected key terms.")

    # Semantic similarity (more advanced, requires spaCy for embeddings)
    try:
        # Load spaCy model with word vectors (e.g., 'en_core_web_md' or 'lg') for better similarity
        # For simplicity, using 'en_core_web_sm' but it has limited vectors.
        # If 'en_core_web_md' or 'lg' is not loaded, similarity might be less accurate.
        doc1 = nlp(expected_keywords) # Using keywords as a proxy for the 'ideal' answer for similarity
        doc2 = nlp(candidate_response)
        # Check if vectors are available before calculating similarity
        if doc1.has_vector and doc2.has_vector:
            similarity_score = doc1.similarity(doc2) * 100 # Scale to 100
            feedback_messages.append(f"Semantic similarity to expected answer: {similarity_score:.2f}%")
        else:
            similarity_score = 0
            feedback_messages.append("Word vectors not available for semantic similarity calculation (consider 'en_core_web_md').")
    except Exception as e:
        similarity_score = 0
        feedback_messages.append(f"Error in semantic similarity: {e}. Ensure spaCy model has vectors.")

    # Combined score (simple average, can be weighted)
    combined_score = (keyword_score * 0.4) + (similarity_score * 0.6) # Example weighting

    # Sentiment analysis
    sentiment_analysis = TextBlob(candidate_response).sentiment
    sentiment_polarity = sentiment_analysis.polarity # -1 to 1
    sentiment = "neutral"
    if sentiment_polarity > 0.1:
        sentiment = "positive"
    elif sentiment_polarity < -0.1:
        sentiment = "negative"

    feedback_messages.append(f"Overall sentiment: {sentiment}.")

    return {
        "score": round(combined_score, 2),
        "feedback": " ".join(feedback_messages),
        "sentiment": sentiment
    }

# Placeholder for Facial Analysis (very basic, requires a separate ML model/service for real analysis)
def analyze_facial_data(image_data_url):
    # This is a highly simplified example.
    # In a real application, you'd send this to a dedicated ML service.
    # Here, we're just decoding it for demonstration.
    try:
        import numpy as np
        import base64

        # image_data_url format: "data:image/jpeg;base64,..."
        header, encoded = image_data_url.split(",", 1)
        data = base64.b64decode(encoded)
        np_arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # In a real scenario, 'img' would be passed to an ML model
        # For demo, just detect if a face is present
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) > 0:
            # Placeholder for actual emotional analysis, e.g., using DeepFace or Py-Feat
            return {"face_detected": True, "num_faces": len(faces), "emotions_placeholder": "Neutral"}
        else:
            return {"face_detected": False, "num_faces": 0, "emotions_placeholder": "None"}
    except Exception as e:
        print(f"Facial analysis error: {e}")
        return {"error": str(e), "face_detected": False}


# Placeholder for Tone Analysis (requires speech-to-text first, then audio feature extraction & ML)
def analyze_tone_data(audio_data):
    # This is a very complex ML task.
    # You'd typically extract features (pitch, volume, speaking rate) from raw audio
    # and pass them to a pre-trained ML model (e.g., using librosa, tensorflow/pytorch).
    return {"tone_placeholder": "Confident", "pitch_avg": 0.0} # Example placeholder data


# --- NEW: Helper for iCal generation ---
def generate_ical_event(interview, candidate, job_description):
    cal = Calendar()
    cal.add('prodid', '-//RecruitingApp//Scheduler//EN')
    cal.add('version', '2.0')

    event = Event()
    event.add('summary', f'Interview for {candidate.name} - {job_description.title}')
    event.add('dtstart', interview.start_time)
    event.add('dtend', interview.end_time)
    event.add('dtstamp', interview.created_at if interview.created_at else datetime.utcnow())
    event.add('description', f'Interview Type: {interview.interview_type}\n'
                             f'Meeting Link: {interview.meeting_link or "N/A"}\n'
                             f'Recruiter: {interview.recruiter_name}\n'
                             f'Candidate Notes: {interview.candidate_notes or "N/A"}\n'
                             f'Recruiter Notes: {interview.recruiter_notes or "N/A"}')
    event.add('location', interview.meeting_link if interview.meeting_link else interview.interview_type) # Use meeting link as location

    # Organizer (Recruiter)
    organizer_email = "recruiter@yourcompany.com" # Replace with actual recruiter email logic
    event.add('organizer', vCalAddress(f'MAILTO:{organizer_email}'))
    event['organizer'].params['cn'] = vText(interview.recruiter_name)

    # Attendees
    # Candidate
    event.add('attendee', vCalAddress(f'MAILTO:{candidate.email}'))
    event['attendee'].params['cn'] = vText(candidate.name)
    event['attendee'].params['partstat'] = 'NEEDS-ACTION'
    event['attendee'].params['role'] = 'REQ-PARTICIPANT'

    # Recruiter (if different from organizer or multiple recruiters)
    # if recruiter_email != organizer_email:
    #     event.add('attendee', vCalAddress(f'MAILTO:{recruiter_email}'))
    #     event['attendee'].params['cn'] = vText(interview.recruiter_name)
    #     event['attendee'].params['partstat'] = 'ACCEPTED'
    #     event['attendee'].params['role'] = 'CHAIR'

    cal.add_component(event)
    return cal.to_ical()


# --- DATABASE CONFIG ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recruiting.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# init_db(app)

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
        return jsonify({'error': 'No resume file provided'}), 400
    if 'jobDescriptionId' not in request.form:
        return jsonify({'error': 'No job description ID provided'}), 400

    resume_file = request.files['resume']
    job_description_id = request.form['jobDescriptionId']

    if resume_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    current_jd = JobDescription.query.get(job_description_id)
    if not current_jd:
        return jsonify({'error': 'Job description not found'}), 404

    if resume_file:
        # Secure filename and save it
        original_filename = resume_file.filename
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{original_filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        resume_file.save(filepath)

        # Parse resume
        parsed_resume_data = parse_resume_text(filepath)
        resume_full_text = ""

        # Extract text for match scoring (pyresparser might not give full text)
        if original_filename.lower().endswith('.pdf'):
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    resume_full_text += page.extract_text() + "\n"
        elif original_filename.lower().endswith('.docx'):
            doc = docx.Document(filepath)
            for para in doc.paragraphs:
                resume_full_text += para.text + "\n"
        else: # For other formats, try using parsed summary or skills
            resume_full_text = parsed_resume_data.get('summary', '') + ' '.join(parsed_resume_data.get('skills', []))

        # Calculate match score
        match_score = calculate_match_score(resume_full_text, current_jd.description)

        # Save Candidate to DB
        new_candidate = Candidate(
            name=parsed_resume_data.get('name') or 'Unnamed Candidate', # Provide a fallback name
            email=parsed_resume_data.get('email'),
            phone=parsed_resume_data.get('phone'),
            skills=json.dumps(parsed_resume_data.get('skills', [])),
            experience=json.dumps(parsed_resume_data.get('experience', [])),
            education=json.dumps(parsed_resume_data.get('education', [])),
            summary=parsed_resume_data.get('summary'),
            match_score=match_score,
            job_description_id=current_jd.id,
            resume_filepath=unique_filename, # Save the unique filename
            status='New Candidate', # Default status
            notes='' # Default empty notes
        )
        db.session.add(new_candidate)
        db.session.commit()

        return jsonify(new_candidate.to_dict()), 201


@app.route('/upload_resumes', methods=['POST']) # Renamed from /upload for clarity of bulk
def upload_resumes_bulk():
    if 'resumes' not in request.files:
        return jsonify({'error': 'No resume files part in the request'}), 400

    files = request.files.getlist('resumes') # Get a list of files
    job_description_id = request.form.get('jobDescriptionId') # Optional: link to a JD
    source = request.form.get('source', 'Direct Upload') # NEW: Candidate source

    if not files:
        return jsonify({'error': 'No selected files'}), 400

    processed_candidates = []
    errors = []

    for file in files:
        if file.filename == '':
            continue
        if file and allowed_file(file.filename): # Use your existing allowed_file helper
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            try:
                # Parse resume
                data = parse_resume_text(filepath)
                if not data:
                    errors.append(f"Could not parse resume: {filename}")
                    continue

                # Check if candidate already exists by email
                existing_candidate = Candidate.query.filter_by(email=data.get('email')).first()
                if existing_candidate:
                    errors.append(f"Candidate with email {data.get('email')} already exists, skipping: {filename}")
                    continue

                # Create new candidate entry
                new_candidate = Candidate(
                    name=data.get('name', 'N/A'),
                    email=data.get('email', f'unknown_{int(time.time())}@example.com'), # Fallback email
                    phone=data.get('phone'),
                    resume_filepath=filepath,
                    job_description_id=job_description_id if job_description_id else None,
                    match_score=0.0, # Initial score, can be updated later
                    status='New Candidate', # Default initial status
                    summary=data.get('summary'),
                    skills=json.dumps(data.get('skills', [])),
                    experience=json.dumps(data.get('experience', [])),
                    education=json.dumps(data.get('education', [])),
                    years_of_experience=data.get('total_experience', 0),
                    source=source # NEW: Set source
                )
                db.session.add(new_candidate)
                db.session.commit() # Commit each candidate individually
                processed_candidates.append(new_candidate.to_dict())

                # Log status history for new candidate
                status_history_entry = CandidateStatusHistory(
                    candidate_id=new_candidate.id,
                    old_status=None,
                    new_status='New Candidate',
                    changed_by_user_id=None # Or actual user ID
                )
                db.session.add(status_history_entry)
                db.session.commit()

            except Exception as e:
                errors.append(f"Error processing {filename}: {str(e)}")
        else:
            errors.append(f"Invalid file type for {file.filename}")

    if errors:
        return jsonify({'message': 'Some files had errors', 'processed': processed_candidates, 'errors': errors}), 207
    return jsonify({'message': 'Resumes uploaded and processed successfully', 'processed': processed_candidates}), 200


# --- CANDIDATE CRM API (Updated for status and filtering/sorting) ---

@app.route('/candidates', methods=['GET'])
def get_candidates():
    job_description_id = request.args.get('job_description_id')
    status = request.args.get('status')
    min_score = request.args.get('min_score', type=float)
    search_term = request.args.get('search_term')
    sort_by = request.args.get('sort_by', 'created_at') # Default sort
    sort_order = request.args.get('sort_order', 'desc') # Default order

    query = Candidate.query

    if job_description_id:
        query = query.filter_by(job_description_id=job_description_id)
    if status and status != 'All': # Allow 'All' to show all statuses
        query = query.filter_by(status=status)
    if min_score is not None:
        query = query.filter(Candidate.match_score >= min_score)
    if search_term:
        search_pattern = f"%{search_term}%"
        query = query.filter(
            (Candidate.name.ilike(search_pattern)) |
            (Candidate.email.ilike(search_pattern)) |
            (Candidate.skills.ilike(search_pattern)) | # Search within JSON string of skills
            (Candidate.summary.ilike(search_pattern))
        )

    # Sorting logic
    if sort_by == 'name':
        query = query.order_by(Candidate.name.asc() if sort_order == 'asc' else Candidate.name.desc())
    elif sort_by == 'match_score':
        query = query.order_by(Candidate.match_score.asc() if sort_order == 'asc' else Candidate.match_score.desc())
    elif sort_by == 'status':
        query = query.order_by(Candidate.status.asc() if sort_order == 'asc' else Candidate.status.desc())
    else: # Default to created_at
        query = query.order_by(Candidate.created_at.asc() if sort_order == 'asc' else Candidate.created_at.desc())

    candidates = query.all()
    return jsonify([c.to_dict() for c in candidates])

# New endpoint to get a single candidate by ID
@app.route('/candidates/<int:candidate_id>', methods=['GET'])
def get_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return jsonify({'error': 'Candidate not found'}), 404
    return jsonify(candidate.to_dict())

# New endpoint to update a candidate (status, notes, etc.)
@app.route('/candidates/<int:candidate_id>', methods=['PUT'])
def update_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return jsonify({'error': 'Candidate not found'}), 404

    data = request.get_json()

     # Log status change if it occurs
    old_status = candidate.status
    new_status = data.get('status', candidate.status) # Get new status from data, default to current

    if old_status != new_status:
        # For now, hardcode user_id or get from a dummy user. In a real app, from auth token.
        # Assuming a user is logged in, you'd get their ID here.
        # current_user_id = get_current_user_id() # Placeholder for actual user ID
        current_user = User.query.first() # Get a dummy user for now
        changed_by_user_id = current_user.id if current_user else None

        status_history_entry = CandidateStatusHistory(
            candidate_id=candidate.id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=changed_by_user_id
        )
        db.session.add(status_history_entry)
        candidate.status = new_status # Update the candidate's current status in the main record

        # Set hired_at timestamp if status becomes 'Hired'
        if new_status == 'Hired' and not candidate.hired_at:
            candidate.hired_at = datetime.utcnow()
        elif new_status != 'Hired' and candidate.hired_at:
            candidate.hired_at = None # Clear if status changes from Hired


    # Update other candidate fields
    candidate.name = data.get('name', candidate.name)
    candidate.email = data.get('email', candidate.email)
    candidate.phone = data.get('phone', candidate.phone)
    candidate.job_description_id = data.get('jobDescriptionId', candidate.job_description_id)
    candidate.match_score = data.get('matchScore', candidate.match_score)
    candidate.summary = data.get('summary', candidate.summary)
    candidate.skills = json.dumps(data.get('skills', [])) if 'skills' in data else candidate.skills
    candidate.experience = json.dumps(data.get('experience', [])) if 'experience' in data else candidate.experience
    candidate.education = json.dumps(data.get('education', [])) if 'education' in data else candidate.education
    candidate.years_of_experience = data.get('yearsOfExperience', candidate.years_of_experience)
    candidate.gender = data.get('gender', candidate.gender)
    candidate.ethnicity = data.get('ethnicity', candidate.ethnicity)
    candidate.source = data.get('source', candidate.source)
    candidate.rating = data.get('rating', candidate.rating) # NEW: Update rating
    candidate.assigned_to_user_id = data.get('assignedToUserId', candidate.assigned_to_user_id) # NEW: Update assignment

    candidate.updated_at = datetime.utcnow() # Update timestamp
    db.session.commit()
    return jsonify(candidate.to_dict())
# Check for status change and log it
    old_status = candidate.status
    new_status = data.get('status', candidate.status)

    if old_status != new_status:
        # Assuming you have a way to get the current user's ID (e.g., from a session or JWT token)
        # For now, let's hardcode or set to None
        current_user_id = None # Replace with actual user ID from your auth system

        status_history_entry = CandidateStatusHistory(
            candidate_id=candidate.id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=current_user_id
        )
        db.session.add(status_history_entry)
        candidate.status = new_status # Update the candidate's current status

    # Update other candidate fields
    candidate.name = data.get('name', candidate.name)
    # ... update other fields ...
    # candidate.gender = data.get('gender', candidate.gender) # Make sure to include these in your PUT data
    # candidate.ethnicity = data.get('ethnicity', candidate.ethnicity)
    # candidate.source = data.get('source', candidate.source)
    # if data.get('status') == 'Hired' and not candidate.hired_at:
    #     candidate.hired_at = datetime.utcnow() # Set hired_at timestamp
    # elif data.get('status') != 'Hired':
    #     candidate.hired_at = None # Clear if status is no longer Hired

    db.session.commit()
    return jsonify(candidate.to_dict())

# Endpoint to download resume by candidate ID
@app.route('/download_resume_by_candidate/<int:candidate_id>', methods=['GET'], endpoint='download_candidate_resume')
def download_resume_by_candidate_id(candidate_id): # Renamed function for clarity
    candidate = Candidate.query.get(candidate_id)
    if not candidate or not candidate.resume_filepath:
        return jsonify({'error': 'Resume not found for this candidate'}), 404

    directory = app.config['UPLOAD_FOLDER']
    filename = candidate.resume_filepath

    if not os.path.exists(os.path.join(directory, filename)):
        return jsonify({'error': 'File not found on server'}), 404
 
    return send_from_directory(directory, filename, as_attachment=True)

# Endpoint to download resume by direct filename
@app.route('/download_resume_file/<filename>', methods=['GET'], endpoint='download_resume_by_filename')
def download_resume_by_filename(filename): # Renamed function for clarity
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    

# --- Job Description Routes (Add/Modify) ---

# Existing route to add a job description
@app.route('/job_descriptions', methods=['POST'])
def add_job_description():
    data = request.get_json()
    if not data or not data.get('title') or not data.get('description'):
        return jsonify({'error': 'Title and description are required'}), 400

    new_jd = JobDescription(
        title=data['title'],
        description=data['description']
    )
    db.session.add(new_jd)
    db.session.commit()
    return jsonify(new_jd.to_dict()), 201

# Existing route to get all job descriptions
@app.route('/job_descriptions', methods=['GET'])
def get_job_descriptions():
    jds = JobDescription.query.all()
    return jsonify([jd.to_dict() for jd in jds])

# New endpoint to get a single job description by ID
@app.route('/job_descriptions/<int:jd_id>', methods=['GET'])
def get_job_description(jd_id):
    jd = JobDescription.query.get(jd_id)
    if not jd:
        return jsonify({'error': 'Job description not found'}), 404
    return jsonify(jd.to_dict())

# New endpoint to update a job description
@app.route('/job_descriptions/<int:jd_id>', methods=['PUT'])
def update_job_description(jd_id):
    jd = JobDescription.query.get(jd_id)
    if not jd:
        return jsonify({'error': 'Job description not found'}), 404

    data = request.get_json()
    jd.title = data.get('title', jd.title)
    jd.description = data.get('description', jd.description)
    jd.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify(jd.to_dict())

# Modified endpoint to delete a job description (with cascade)
@app.route('/job_descriptions/<int:jd_id>', methods=['DELETE'])
def delete_job_description(jd_id):
    jd = JobDescription.query.get(jd_id)
    if not jd:
        return jsonify({'error': 'Job description not found'}), 404

    # Because of `cascade="all, delete-orphan"` in the relationship,
    # deleting the JD will automatically delete associated candidates.
    db.session.delete(jd)
    db.session.commit()
    return jsonify({'message': 'Job description and associated candidates deleted'}), 200


if __name__ == '__main__':
    app.run(debug=True)

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

# New: Get Screening Questions for a Job Description
@app.route('/job_descriptions/<int:jd_id>/questions', methods=['GET'])
def get_screening_questions(jd_id):
    questions = ScreeningQuestion.query.filter_by(job_description_id=jd_id).order_by(ScreeningQuestion.order.asc()).all()
    return jsonify([q.to_dict() for q in questions])

# New: Add a Screening Question
@app.route('/screening_questions', methods=['POST'])
def add_screening_question():
    data = request.get_json()
    if not data or not data.get('jobDescriptionId') or not data.get('questionText'):
        return jsonify({'error': 'Job Description ID and Question Text are required'}), 400

    new_question = ScreeningQuestion(
        job_description_id=data['jobDescriptionId'],
        question_text=data['questionText'],
        question_type=data.get('questionType', 'text'),
        expected_keywords=json.dumps(data.get('expectedKeywords', [])),
        ideal_answer=data.get('idealAnswer'),
        order=data.get('order', 0)
    )
    db.session.add(new_question)
    db.session.commit()
    return jsonify(new_question.to_dict()), 201

# New: Update a Screening Question
@app.route('/screening_questions/<int:question_id>', methods=['PUT'])
def update_screening_question(question_id):
    question = ScreeningQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404

    data = request.get_json()
    question.question_text = data.get('questionText', question.question_text)
    question.question_type = data.get('questionType', question.question_type)
    question.expected_keywords = json.dumps(data.get('expectedKeywords', question.expected_keywords))
    question.ideal_answer = data.get('idealAnswer', question.ideal_answer)
    question.order = data.get('order', question.order)
    question.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify(question.to_dict())

# New: Delete a Screening Question
@app.route('/screening_questions/<int:question_id>', methods=['DELETE'])
def delete_screening_question(question_id):
    question = ScreeningQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    db.session.delete(question)
    db.session.commit()
    return jsonify({'message': 'Question deleted'}), 200

# New: Get Candidate Screening Responses
@app.route('/candidates/<int:candidate_id>/screening_responses', methods=['GET'])
def get_candidate_screening_responses(candidate_id):
    responses = CandidateScreeningResponse.query.filter_by(candidate_id=candidate_id).all()
    return jsonify([r.to_dict() for r in responses])

# --- NEW: SocketIO Events (for real-time chat/video) ---

# Mapping candidate session IDs to current interview state
interview_states = {} # {sid: {'candidate_id': ..., 'job_id': ..., 'current_question_index': ..., 'questions': []}}

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    if request.sid in interview_states:
        del interview_states[request.sid]

@socketio.on('start_interview')
def handle_start_interview(data):
    candidate_id = data.get('candidateId')
    job_description_id = data.get('jobDescriptionId')

    if not candidate_id or not job_description_id:
        emit('interview_error', {'message': 'Missing candidate ID or job description ID'})
        return

    # Fetch questions for the job description
    questions = ScreeningQuestion.query.filter_by(job_description_id=job_description_id).order_by(ScreeningQuestion.order.asc()).all()
    if not questions:
        emit('interview_error', {'message': 'No screening questions found for this job description.'})
        return

    # Store interview state for this session
    interview_states[request.sid] = {
        'candidate_id': candidate_id,
        'job_id': job_description_id,
        'current_question_index': 0,
        'questions': [q.to_dict() for q in questions],
        'responses': [] # To store responses during the interview
    }

    # Send the first question
    first_question = interview_states[request.sid]['questions'][0]
    emit('interview_question', first_question)
    print(f"Interview started for candidate {candidate_id}, sending question: {first_question['questionText']}")

@socketio.on('submit_answer')
def handle_submit_answer(data):
    sid = request.sid
    if sid not in interview_states:
        emit('interview_error', {'message': 'Interview session not found.'})
        return

    interview_state = interview_states[sid]
    current_question_index = interview_state['current_question_index']
    current_question = interview_state['questions'][current_question_index]
    candidate_response_text = data.get('answerText')
    candidate_id = interview_state['candidate_id']

    # --- Perform AI Analysis for Text Response ---
    keywords = current_question.get('expectedKeywords', [])
    ideal_answer = current_question.get('idealAnswer', '')
    response_score, sentiment = analyze_text_response(
        current_question['questionText'],
        candidate_response_text,
        keywords,
        ideal_answer
    )

    # Store response in DB
    new_response_db = CandidateScreeningResponse(
        candidate_id=candidate_id,
        question_id=current_question['id'],
        response_text=candidate_response_text,
        score=response_score,
        sentiment_score=sentiment,
        facial_analysis_data=json.dumps({"status": "Not Captured"}) if current_question['questionType'] != 'video' else None,
        tone_analysis_data=json.dumps({"status": "Not Captured"}) if current_question['questionType'] != 'voice' else None,
    )
    db.session.add(new_response_db)
    db.session.commit()
    interview_state['responses'].append(new_response_db.to_dict()) # Add to session state

    # Move to next question or end interview
    interview_state['current_question_index'] += 1
    next_question_index = interview_state['current_question_index']

    if next_question_index < len(interview_state['questions']):
        next_question = interview_state['questions'][next_question_index]
        emit('interview_question', next_question)
        print(f"Sending next question: {next_question['questionText']}")
    else:
        # End of interview
        emit('interview_finished', {'message': 'Interview completed!', 'responses': interview_state['responses']})
        print(f"Interview finished for candidate {candidate_id}")
        # Optionally, calculate overall screening score for the candidate here
        # and update the Candidate model in the DB.
        # total_score = sum(r['score'] for r in interview_state['responses'])
        # overall_avg_score = total_score / len(interview_state['responses']) if interview_state['responses'] else 0
        # candidate_db = Candidate.query.get(candidate_id)
        # if candidate_db:
        #     candidate_db.overall_screening_score = overall_avg_score
        #     db.session.commit()
        del interview_states[sid] # Clean up session state

# NEW: Handle video frames for facial analysis (example, actual ML model needed)
@socketio.on('video_frame')
def handle_video_frame(data):
    sid = request.sid
    if sid not in interview_states:
        return

    # data['image'] is a base64 encoded image string (e.g., from canvas.toDataURL)
    image_data_url = data.get('image')
    if image_data_url:
        facial_analysis_result = analyze_facial_data(image_data_url)
        # You'd typically emit this analysis back to the client for real-time feedback
        # or store a summary with the current response.
        emit('facial_analysis_update', facial_analysis_result)
        # print(f"Received video frame, analysis: {facial_analysis_result}")

# NEW: Handle audio chunks for tone analysis (example, actual ML model needed)
@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    sid = request.sid
    if sid not in interview_states:
        return

    # data['audio'] is raw audio bytes (e.g., from MediaRecorder)
    audio_bytes = data.get('audio')
    if audio_bytes:
        # You would pass audio_bytes to a speech-to-text service first,
        # then extract features for tone analysis.
        tone_analysis_result = analyze_tone_data(audio_bytes) # Placeholder
        emit('tone_analysis_update', tone_analysis_result)
        # print(f"Received audio chunk, analysis: {tone_analysis_result}")

# NEW: Schedule an Interview
@app.route('/interviews', methods=['POST'])
def schedule_interview():
    data = request.get_json()
    required_fields = ['candidateId', 'jobDescriptionId', 'recruiterName', 'startTime', 'endTime', 'interviewType']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required interview fields'}), 400

    try:
        start_time_dt = datetime.fromisoformat(data['startTime'])
        end_time_dt = datetime.fromisoformat(data['endTime'])
    except ValueError:
        return jsonify({'error': 'Invalid date/time format. Use ISO 8601.'}), 400

    if start_time_dt >= end_time_dt:
        return jsonify({'error': 'End time must be after start time.'}), 400

    candidate = Candidate.query.get(data['candidateId'])
    job_description = JobDescription.query.get(data['jobDescriptionId'])

    if not candidate:
        return jsonify({'error': 'Candidate not found.'}), 404
    if not job_description:
        return jsonify({'error': 'Job Description not found.'}), 404

    new_interview = InterviewSchedule(
        candidate_id=data['candidateId'],
        job_description_id=data['jobDescriptionId'],
        recruiter_name=data['recruiterName'],
        interview_type=data['interviewType'],
        start_time=start_time_dt,
        end_time=end_time_dt,
        meeting_link=data.get('meetingLink'),
        candidate_notes=data.get('candidateNotes'),
        recruiter_notes=data.get('recruiterNotes'),
        status='Scheduled' # Default status
    )
    db.session.add(new_interview)
    db.session.commit()

    # Optional: Send calendar invite. In a real app, this would be done via an email service.
    # We'll just generate the .ics file here for download as an example.
    # ical_content = generate_ical_event(new_interview, candidate, job_description)
    # print("iCal event generated (not sent):", ical_content.decode('utf-8'))

    return jsonify(new_interview.to_dict()), 201

# NEW: Get All Interviews (or filter by candidate/job)
@app.route('/interviews', methods=['GET'])
def get_interviews():
    candidate_id = request.args.get('candidateId', type=int)
    job_id = request.args.get('jobDescriptionId', type=int)

    query = InterviewSchedule.query

    if candidate_id:
        query = query.filter_by(candidate_id=candidate_id)
    if job_id:
        query = query.filter_by(job_description_id=job_id)

    interviews = query.order_by(InterviewSchedule.start_time.asc()).all()
    return jsonify([i.to_dict() for i in interviews])

# NEW: Get Interview by ID
@app.route('/interviews/<int:interview_id>', methods=['GET'])
def get_interview(interview_id):
    interview = InterviewSchedule.query.get(interview_id)
    if not interview:
        return jsonify({'error': 'Interview not found'}), 404
    return jsonify(interview.to_dict())

# NEW: Update an Interview
@app.route('/interviews/<int:interview_id>', methods=['PUT'])
def update_interview(interview_id):
    interview = InterviewSchedule.query.get(interview_id)
    if not interview:
        return jsonify({'error': 'Interview not found'}), 404

    data = request.get_json()
    try:
        if 'startTime' in data:
            interview.start_time = datetime.fromisoformat(data['startTime'])
        if 'endTime' in data:
            interview.end_time = datetime.fromisoformat(data['endTime'])
    except ValueError:
        return jsonify({'error': 'Invalid date/time format. Use ISO 8601.'}), 400

    if interview.start_time >= interview.end_time:
        return jsonify({'error': 'End time must be after start time.'}), 400

    interview.recruiter_name = data.get('recruiterName', interview.recruiter_name)
    interview.interview_type = data.get('interviewType', interview.interview_type)
    interview.meeting_link = data.get('meetingLink', interview.meeting_link)
    interview.status = data.get('status', interview.status)
    interview.candidate_notes = data.get('candidateNotes', interview.candidate_notes)
    interview.recruiter_notes = data.get('recruiterNotes', interview.recruiter_notes)
    interview.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify(interview.to_dict())

# NEW: Delete an Interview
@app.route('/interviews/<int:interview_id>', methods=['DELETE'])
def delete_interview(interview_id):
    interview = InterviewSchedule.query.get(interview_id)
    if not interview:
        return jsonify({'error': 'Interview not found'}), 404
    db.session.delete(interview)
    db.session.commit()
    return jsonify({'message': 'Interview deleted'}), 200

# NEW: Download .ics calendar file for an interview
@app.route('/interviews/<int:interview_id>/download_ical', methods=['GET'])
def download_ical(interview_id):
    interview = InterviewSchedule.query.get(interview_id)
    if not interview:
        return jsonify({'error': 'Interview not found'}), 404

    candidate = Candidate.query.get(interview.candidate_id)
    job_description = JobDescription.query.get(interview.job_description_id)

    if not candidate or not job_description:
        return jsonify({'error': 'Associated candidate or job description not found.'}), 404

    ical_content = generate_ical_event(interview, candidate, job_description)

    response = make_response(ical_content)
    response.headers['Content-Type'] = 'text/calendar'
    response.headers['Content-Disposition'] = f'attachment; filename="interview_{interview_id}.ics"'
    return response


# --- NEW: Skill Assessment Routes ---

# Create a new Assessment
@app.route('/assessments', methods=['POST'])
def create_assessment():
    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400

    new_assessment = SkillAssessment(
        title=data['title'],
        description=data.get('description'),
        job_description_id=data.get('jobDescriptionId'),
        assessment_type=data.get('assessmentType', 'General'),
        duration_minutes=data.get('durationMinutes')
    )
    db.session.add(new_assessment)
    db.session.commit()
    return jsonify(new_assessment.to_dict()), 201

# Get all Assessments
@app.route('/assessments', methods=['GET'])
def get_assessments():
    assessments = SkillAssessment.query.all()
    return jsonify([a.to_dict() for a in assessments])

# Get a single Assessment by ID
@app.route('/assessments/<int:assessment_id>', methods=['GET'])
def get_assessment(assessment_id):
    assessment = SkillAssessment.query.get(assessment_id)
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404
    return jsonify(assessment.to_dict())

# Update an Assessment
@app.route('/assessments/<int:assessment_id>', methods=['PUT'])
def update_assessment(assessment_id):
    assessment = SkillAssessment.query.get(assessment_id)
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404

    data = request.get_json()
    assessment.title = data.get('title', assessment.title)
    assessment.description = data.get('description', assessment.description)
    assessment.job_description_id = data.get('jobDescriptionId', assessment.job_description_id)
    assessment.assessment_type = data.get('assessmentType', assessment.assessment_type)
    assessment.duration_minutes = data.get('durationMinutes', assessment.duration_minutes)
    assessment.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(assessment.to_dict())

# Delete an Assessment
@app.route('/assessments/<int:assessment_id>', methods=['DELETE'])
def delete_assessment(assessment_id):
    assessment = SkillAssessment.query.get(assessment_id)
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404
    db.session.delete(assessment)
    db.session.commit()
    return jsonify({'message': 'Assessment deleted successfully'}), 200

# --- Assessment Questions ---

# Add a question to an Assessment
@app.route('/assessments/<int:assessment_id>/questions', methods=['POST'])
def add_assessment_question(assessment_id):
    assessment = SkillAssessment.query.get(assessment_id)
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404

    data = request.get_json()
    if not data or not data.get('questionText'):
        return jsonify({'error': 'Question text is required'}), 400

    new_question = AssessmentQuestion(
        assessment_id=assessment_id,
        question_text=data['questionText'],
        question_type=data.get('questionType', 'OpenText'),
        options=json.dumps(data.get('options', [])) if data.get('options') else None,
        correct_answer=data.get('correctAnswer'),
        points=data.get('points', 10),
        order=data.get('order', 0)
    )
    db.session.add(new_question)
    db.session.commit()
    return jsonify(new_question.to_dict()), 201

# Get questions for an Assessment
@app.route('/assessments/<int:assessment_id>/questions', methods=['GET'])
def get_assessment_questions(assessment_id):
    questions = AssessmentQuestion.query.filter_by(assessment_id=assessment_id).order_by(AssessmentQuestion.order.asc()).all()
    return jsonify([q.to_dict() for q in questions])

# Update a question
@app.route('/questions/<int:question_id>', methods=['PUT'])
def update_assessment_question(question_id):
    question = AssessmentQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404

    data = request.get_json()
    question.question_text = data.get('questionText', question.question_text)
    question.question_type = data.get('questionType', question.question_type)
    question.options = json.dumps(data.get('options', [])) if 'options' in data else question.options
    question.correct_answer = data.get('correctAnswer', question.correct_answer)
    question.points = data.get('points', question.points)
    question.order = data.get('order', question.order)
    db.session.commit()
    return jsonify(question.to_dict())

# Delete a question
@app.route('/questions/<int:question_id>', methods=['DELETE'])
def delete_assessment_question(question_id):
    question = AssessmentQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    db.session.delete(question)
    db.session.commit()
    return jsonify({'message': 'Question deleted successfully'}), 200

# --- Candidate Assessment Lifecycle ---

# Start an Assessment for a Candidate
@app.route('/candidates/<int:candidate_id>/assessments/<int:assessment_id>/start', methods=['POST'])
def start_candidate_assessment(candidate_id, assessment_id):
    candidate = Candidate.query.get(candidate_id)
    assessment = SkillAssessment.query.get(assessment_id)
    if not candidate or not assessment:
        return jsonify({'error': 'Candidate or Assessment not found'}), 404

    # Check if assessment already started/completed by this candidate
    existing_result = CandidateAssessmentResult.query.filter_by(
        candidate_id=candidate_id, assessment_id=assessment_id, status='Started'
    ).first()
    if existing_result:
        return jsonify({'message': 'Assessment already started', 'resultId': existing_result.id}), 200

    new_result = CandidateAssessmentResult(
        candidate_id=candidate_id,
        assessment_id=assessment_id,
        start_time=datetime.utcnow(),
        status='Started'
    )
    db.session.add(new_result)
    db.session.commit()
    return jsonify(new_result.to_dict()), 201

# Submit a response to a question
@app.route('/assessment_results/<int:result_id>/responses', methods=['POST'])
def submit_question_response(result_id):
    result = CandidateAssessmentResult.query.get(result_id)
    if not result:
        return jsonify({'error': 'Assessment result not found'}), 404
    if result.status != 'Started':
        return jsonify({'error': 'Assessment is not in "Started" status. Cannot submit responses.'}), 400

    data = request.get_json()
    question_id = data.get('questionId')
    response_text = data.get('responseText')

    if not question_id or response_text is None: # Allow empty string for response_text
        return jsonify({'error': 'Question ID and response text are required'}), 400

    question = AssessmentQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    if question.assessment_id != result.assessment_id:
        return jsonify({'error': 'Question does not belong to this assessment result.'}), 400

    # Check if response already exists for this question in this result
    existing_response = CandidateQuestionResponse.query.filter_by(
        result_id=result_id, question_id=question_id
    ).first()

    score = 0.0
    ai_feedback = None

    if question.question_type == 'OpenText':
        eval_result = evaluate_open_text_response(question.correct_answer or "", response_text)
        score = (eval_result['score'] / 100) * question.points # Normalize to question points
        ai_feedback = eval_result['feedback']
    elif question.question_type in ['MultipleChoice', 'TrueFalse']:
        is_correct = response_text.lower() == (question.correct_answer or "").lower()
        score = question.points if is_correct else 0
        ai_feedback = "Correct answer!" if is_correct else "Incorrect answer."
    elif question.question_type == 'CodeSnippet':
        # Placeholder for actual code evaluation.
        # This would typically involve sending code to an execution engine (e.g., a sandbox service)
        # or a dedicated AI model for code quality/correctness.
        # For now, it's just stored. Manual grading or a more advanced AI needed.
        score = 0 # Default to 0, requires manual or advanced AI grading
        ai_feedback = "Code submitted. Awaiting evaluation."
    else:
        # Default for other types, or if type is unrecognized
        score = 0
        ai_feedback = "Response received, no automated evaluation for this question type."

    if existing_response:
        existing_response.response_text = response_text
        existing_response.score = score
        existing_response.ai_feedback = ai_feedback
        existing_response.responded_at = datetime.utcnow()
    else:
        new_response = CandidateQuestionResponse(
            result_id=result_id,
            question_id=question_id,
            response_text=response_text,
            score=score,
            ai_feedback=ai_feedback
        )
        db.session.add(new_response)

    db.session.commit()
    return jsonify({
        'message': 'Response submitted',
        'score': score,
        'aiFeedback': ai_feedback,
        'response': (existing_response or new_response).to_dict()
    }), 200

# Complete an Assessment
@app.route('/assessment_results/<int:result_id>/complete', methods=['POST'])
def complete_candidate_assessment(result_id):
    result = CandidateAssessmentResult.query.get(result_id)
    if not result:
        return jsonify({'error': 'Assessment result not found'}), 404
    if result.status != 'Started':
        return jsonify({'error': 'Assessment is not in "Started" status. Cannot complete.'}), 400

    result.end_time = datetime.utcnow()
    result.status = 'Completed'

    # Calculate total score from all responses
    total_score = sum([r.score for r in result.responses if r.score is not None])
    result.total_score = total_score

    # Optional: Update candidate's overall score or flag
    candidate = Candidate.query.get(result.candidate_id)
    if candidate:
        # You might want a more sophisticated way to combine scores
        # For simplicity, let's just add a placeholder for assessment score on candidate
        pass # e.g., candidate.assessment_score = total_score

    db.session.commit()
    return jsonify(result.to_dict()), 200

# Get a candidate's assessment result (with responses)
@app.route('/assessment_results/<int:result_id>', methods=['GET'])
def get_candidate_assessment_result(result_id):
    result = CandidateAssessmentResult.query.get(result_id)
    if not result:
        return jsonify({'error': 'Assessment result not found'}), 404

    result_dict = result.to_dict()
    # Fetch and include question responses
    result_dict['responses'] = [resp.to_dict() for resp in result.responses]

    # Optionally, fetch full question details for each response
    for resp_dict in result_dict['responses']:
        question = AssessmentQuestion.query.get(resp_dict['questionId'])
        if question:
            resp_dict['questionDetails'] = question.to_dict()

    return jsonify(result_dict)

# Get all assessment results for a candidate
@app.route('/candidates/<int:candidate_id>/assessment_results', methods=['GET'])
def get_candidate_all_assessment_results(candidate_id):
    results = CandidateAssessmentResult.query.filter_by(candidate_id=candidate_id).order_by(CandidateAssessmentResult.start_time.desc()).all()
    return jsonify([r.to_dict() for r in results])

# ... (existing imports and routes) ...

# --- NEW: Analytics & Reporting Routes ---

@app.route('/analytics/hiring_funnel', methods=['GET'])
def get_hiring_funnel_metrics():
    # Example: Count candidates by status
    funnel_data = db.session.query(
        Candidate.status,
        db.func.count(Candidate.id)
    ).group_by(Candidate.status).all()

    # Convert to a more friendly dictionary format
    funnel_dict = {status: count for status, count in funnel_data}

    # Define a typical funnel order for presentation
    ordered_funnel = {
        "New Candidate": funnel_dict.get("New Candidate", 0),
        "Under Review": funnel_dict.get("Under Review", 0),
        "Interview Scheduled": funnel_dict.get("Interview Scheduled", 0),
        "Assessment Started": db.session.query(CandidateAssessmentResult).filter(CandidateAssessmentResult.status.in_(['Started', 'Completed', 'Graded'])).count(), # Aggregates assessment statuses
        "Offered": funnel_dict.get("Offered", 0),
        "Hired": funnel_dict.get("Hired", 0),
        "Rejected": funnel_dict.get("Rejected", 0)
    }

    return jsonify(ordered_funnel)

@app.route('/analytics/diversity_tracking', methods=['GET'])
def get_diversity_tracking():
    # This assumes your Candidate model has fields like 'gender', 'ethnicity'
    # For demonstration, let's assume 'gender' for now.
    # You'd need to add these fields to your Candidate model first if not present.
    # Candidate.gender = db.Column(db.String(50))
    # Candidate.ethnicity = db.Column(db.String(50))

    gender_data = db.session.query(
        Candidate.gender,
        db.func.count(Candidate.id)
    ).group_by(Candidate.gender).all()

    diversity_metrics = {
        'genderDistribution': {gender: count for gender, count in gender_data if gender},
        # Add more if you track other diversity metrics
    }
    return jsonify(diversity_metrics)

@app.route('/analytics/time_to_hire', methods=['GET'])
def get_time_to_hire():
    # Calculate time-to-hire for candidates who reached 'Hired' status
    # This requires tracking when a candidate started and when they were hired.
    # Assuming `Candidate.created_at` is 'start' and `Candidate.hired_at` is 'hired' date (add this field)
    # Candidate.hired_at = db.Column(db.DateTime) # NEW FIELD IN CANDIDATE MODEL

    hired_candidates = Candidate.query.filter_by(status='Hired').all()
    times_to_hire = []

    for c in hired_candidates:
        if c.created_at and c.hired_at:
            time_diff = c.hired_at - c.created_at
            times_to_hire.append(time_diff.days)

    if not times_to_hire:
        return jsonify({'averageTimeToHireDays': 0, 'hiredCount': 0})

    average_time = sum(times_to_hire) / len(times_to_hire)

    return jsonify({
        'averageTimeToHireDays': round(average_time, 2),
        'hiredCount': len(times_to_hire),
        'individualTimesDays': times_to_hire # For more detailed analysis on frontend
    })

@app.route('/analytics/source_effectiveness', methods=['GET'])
def get_source_effectiveness():
    # This assumes your Candidate model has a 'source' field (e.g., 'LinkedIn', 'Referral', 'Website')
    # Candidate.source = db.Column(db.String(100)) # NEW FIELD IN CANDIDATE MODEL

    source_data = db.session.query(
        Candidate.source,
        db.func.count(Candidate.id),
        db.func.sum(db.case((Candidate.status == 'Hired', 1), else_=0)) # Count hired from each source
    ).group_by(Candidate.source).all()

    source_metrics = []
    for source, total_candidates, hired_count in source_data:
        if source: # Filter out null sources if any
            source_metrics.append({
                'source': source,
                'totalCandidates': total_candidates,
                'hiredCandidates': hired_count,
                'conversionRate': (hired_count / total_candidates * 100) if total_candidates > 0 else 0
            })
    return jsonify(source_metrics)

# You might need to add these fields to your Candidate model if they don't exist:
# class Candidate(db.Model):
#     # ... existing fields ...
#     gender = db.Column(db.String(50))
#     ethnicity = db.Column(db.String(50))
#     hired_at = db.Column(db.DateTime) # Set this when status becomes 'Hired'
#     source = db.Column(db.String(100)) # e.g., 'LinkedIn', 'Referral', 'Website', 'Job Board'
#     # ... other fields ...

# And ensure you update Candidate.to_dict() to include these if desired for individual candidate view.
# Placeholder for a hypothetical AI screening model and SHAP explanation
# This needs to be adapted to your actual AI screening logic.

def generate_shap_explanation(candidate_data: dict, model_features: list):
    """
    Generates SHAP explanations for a hypothetical candidate screening model.
    This function is illustrative and requires a pre-trained ML model.

    Args:
        candidate_data (dict): Dictionary of candidate features (e.g., {'years_exp': 5, 'skill_match': 0.8, ...})
        model_features (list): List of feature names the model expects.

    Returns:
        dict: SHAP values and base value, representing feature contributions.
    """
    # Dummy ML Model and Data for demonstration
    # In a real scenario, your screening logic would be a proper ML model (e.g., Logistic Regression, RandomForest)
    # trained on historical candidate data (features vs. hire/reject outcome).

    # 1. Create synthetic data for demonstration
    np.random.seed(42)
    num_samples = 100
    df = pd.DataFrame({
        'years_exp': np.random.randint(1, 10, num_samples),
        'skill_match_score': np.random.rand(num_samples),
        'interview_score': np.random.rand(num_samples) * 5,
        'education_level': np.random.choice([0, 1, 2], num_samples), # 0=High School, 1=Bachelors, 2=Masters
        'is_hired': np.random.randint(0, 2, num_samples) # Binary target
    })
    X = df[['years_exp', 'skill_match_score', 'interview_score', 'education_level']]
    y = df['is_hired']

    # 2. Train a dummy model (e.g., RandomForestClassifier)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    # 3. Prepare the candidate's data for prediction and explanation
    # Ensure candidate_data keys match X.columns
    # For this example, let's assume candidate_data has the same structure as X
    # Map candidate_data to a DataFrame row
    candidate_df = pd.DataFrame([candidate_data], columns=model_features)

    try:
        # Create a SHAP explainer
        explainer = shap.TreeExplainer(model)
        # Calculate SHAP values for the single candidate instance
        shap_values = explainer.shap_values(candidate_df)
        base_value = explainer.expected_value[1] # For binary classification, explaining the positive class

        # SHAP values for the positive class (e.g., 'hired')
        # shap_values[1] gives the SHAP values for the positive class
        # shap_values[1][0] because we are explaining a single instance
        feature_contributions = {
            feature: float(shap_values[1][0][i])
            for i, feature in enumerate(model_features)
        }

        return {
            "base_value": float(base_value),
            "feature_contributions": feature_contributions,
            "prediction_probability": float(model.predict_proba(candidate_df)[:, 1][0]) # Probability of being hired
        }
    except Exception as e:
        print(f"Error generating SHAP explanation: {e}")
        return {"error": f"Failed to generate SHAP explanation: {str(e)}"}

# Example of how you'd call it if you had a candidate's features
# candidate_features = {
#     'years_exp': 7,
#     'skill_match_score': 0.9,
#     'interview_score': 4.5,
#     'education_level': 2
# }
# model_feature_names = ['years_exp', 'skill_match_score', 'interview_score', 'education_level']
# shap_explanation = generate_shap_explanation(candidate_features, model_feature_names)
# print(shap_explanation)

# ... (existing routes like /analytics) ...

# --- NEW: Bias Detection Routes ---

@app.route('/bias/screening_disparity', methods=['GET'])
def get_screening_disparity():
    # This example checks if candidates from different genders or ethnicities
    # are disproportionately rejected during initial screening (e.g., 'Rejected' status).
    # You need to define what constitutes 'screening' in your system,
    # often it's candidates who don't proceed beyond 'Under Review' or 'New Candidate' before being rejected.

    # For simplicity, let's count rejections by gender and ethnicity.
    # Assumes 'status' updates for 'Rejected' candidates.

    rejected_candidates = Candidate.query.filter_by(status='Rejected').all()

    gender_rejection_counts = defaultdict(int)
    ethnicity_rejection_counts = defaultdict(int)
    total_gender_counts = defaultdict(int)
    total_ethnicity_counts = defaultdict(int)

    for candidate in Candidate.query.all():
        if candidate.gender:
            total_gender_counts[candidate.gender] += 1
            if candidate.status == 'Rejected':
                gender_rejection_counts[candidate.gender] += 1
        if candidate.ethnicity:
            total_ethnicity_counts[candidate.ethnicity] += 1
            if candidate.status == 'Rejected':
                ethnicity_rejection_counts[candidate.ethnicity] += 1

    gender_disparity = {
        gender: {
            'total': total_gender_counts[gender],
            'rejected': gender_rejection_counts[gender],
            'rejection_rate': (gender_rejection_counts[gender] / total_gender_counts[gender] * 100) if total_gender_counts[gender] > 0 else 0
        } for gender in total_gender_counts
    }

    ethnicity_disparity = {
        ethnicity: {
            'total': total_ethnicity_counts[ethnicity],
            'rejected': ethnicity_rejection_counts[ethnicity],
            'rejection_rate': (ethnicity_rejection_counts[ethnicity] / total_ethnicity_counts[ethnicity] * 100) if total_ethnicity_counts[ethnicity] > 0 else 0
        } for ethnicity in total_ethnicity_counts
    }

    return jsonify({
        'genderDisparity': gender_disparity,
        'ethnicityDisparity': ethnicity_disparity
    })

@app.route('/bias/assessment_score_disparity', methods=['GET'])
def get_assessment_score_disparity():
    # Analyze average assessment scores across different demographic groups.

    gender_scores = defaultdict(lambda: {'total_score': 0, 'count': 0})
    ethnicity_scores = defaultdict(lambda: {'total_score': 0, 'count': 0})

    results = CandidateAssessmentResult.query.filter_by(status='Completed').all() # Only completed assessments
    for result in results:
        candidate = Candidate.query.get(result.candidate_id)
        if candidate:
            if candidate.gender and result.total_score is not None:
                gender_scores[candidate.gender]['total_score'] += result.total_score
                gender_scores[candidate.gender]['count'] += 1
            if candidate.ethnicity and result.total_score is not None:
                ethnicity_scores[candidate.ethnicity]['total_score'] += result.total_score
                ethnicity_scores[candidate.ethnicity]['count'] += 1

    gender_avg_scores = {
        gender: (data['total_score'] / data['count']) if data['count'] > 0 else 0
        for gender, data in gender_scores.items()
    }
    ethnicity_avg_scores = {
        ethnicity: (data['total_score'] / data['count']) if data['count'] > 0 else 0
        for ethnicity, data in ethnicity_scores.items()
    }

    return jsonify({
        'genderAverageScores': gender_avg_scores,
        'ethnicityAverageScores': ethnicity_avg_scores
    })

@app.route('/bias/ai_explanation/<int:candidate_id>', methods=['GET'])
def get_ai_explanation_for_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return jsonify({'error': 'Candidate not found'}), 404

    # This is a placeholder. In a real system, you would:
    # 1. Fetch the actual features used by your AI screening model for this candidate.
    #    E.g., resume keywords match, interview sentiment, assessment scores, years of experience.
    # 2. Call your actual AI model's prediction function.
    # 3. Pass the model and the candidate's features to the SHAP explainer.

    # For demonstration, let's use the dummy function:
    # We need to map candidate's actual data to the features expected by the dummy model.
    # This requires that you extract these features when a candidate is processed.
    # For simplicity, let's create some dummy features from candidate properties:
    candidate_features_for_shap = {
        'years_exp': candidate.years_of_experience if candidate.years_of_experience else 0, # Assuming Candidate has this
        'skill_match_score': candidate.score if candidate.score is not None else 0.5, # Using generic score
        'interview_score': 4.0, # Placeholder, ideally from actual interview scores
        'education_level': 1 if 'Bachelor' in (candidate.education or '') else (2 if 'Master' in (candidate.education or '') else 0) # Basic mapping
    }
    model_feature_names = ['years_exp', 'skill_match_score', 'interview_score', 'education_level']

    explanation = generate_shap_explanation(candidate_features_for_shap, model_feature_names)

    return jsonify(explanation)

# Add a note to a candidate
@app.route('/candidates/<int:candidate_id>/notes', methods=['POST'])
def add_candidate_note(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return jsonify({'error': 'Candidate not found'}), 404

    data = request.get_json()
    note_text = data.get('noteText')
    # user_id = data.get('userId') # Or get from session/auth token
    current_user_id = None # Placeholder

    if not note_text:
        return jsonify({'error': 'Note text is required'}), 400

    new_note = CandidateNote(
        candidate_id=candidate_id,
        user_id=current_user_id, # Link to current logged-in user
        note_text=note_text
    )
    db.session.add(new_note)
    db.session.commit()
    return jsonify(new_note.to_dict()), 201

# Get all notes for a candidate
@app.route('/candidates/<int:candidate_id>/notes', methods=['GET'])
def get_candidate_notes(candidate_id):
    notes = CandidateNote.query.filter_by(candidate_id=candidate_id).order_by(CandidateNote.created_at.desc()).all()
    # If you have a User model, you'd want to fetch user names here too.
    # For now, just return note details.
    return jsonify([n.to_dict() for n in notes])

# Get candidate status history
@app.route('/candidates/<int:candidate_id>/status_history', methods=['GET'])
def get_candidate_status_history(candidate_id):
    history = CandidateStatusHistory.query.filter_by(candidate_id=candidate_id).order_by(CandidateStatusHistory.changed_at.asc()).all()
    # Similar to notes, you might want to fetch user names if changed_by_user_id is used.
    return jsonify([h.to_dict() for h in history])

# Get all candidates (potentially with basic ATS view fields)
# This could be your main ATS dashboard view.
@app.route('/ats/candidates', methods=['GET'])
def get_ats_candidates():
    # Fetch candidates with eager loading for some related data if desired
    # For example, to show their current job application, latest interview, latest assessment.
    # This query can become complex depending on what you want to display.

    # Basic fetch for now:
    candidates = Candidate.query.all()
    ats_data = []
    for candidate in candidates:
        candidate_dict = candidate.to_dict()
        # Optionally, fetch latest interview or assessment result here
        # latest_interview = InterviewSchedule.query.filter_by(candidate_id=candidate.id).order_by(InterviewSchedule.interview_date.desc()).first()
        # latest_assessment_result = CandidateAssessmentResult.query.filter_by(candidate_id=candidate.id).order_by(CandidateAssessmentResult.completed_at.desc()).first()
        # candidate_dict['latestInterviewDate'] = latest_interview.interview_date.isoformat() if latest_interview else None
        # candidate_dict['latestAssessmentScore'] = latest_assessment_result.total_score if latest_assessment_result else None
        ats_data.append(candidate_dict)
    return jsonify(ats_data)


@app.route('/video_interviews/upload', methods=['POST'])
def upload_video_interview():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file part in the request'}), 400
    if 'candidateId' not in request.form:
        return jsonify({'error': 'Candidate ID is required'}), 400
    if 'jobDescriptionId' not in request.form:
        return jsonify({'error': 'Job Description ID is required'}), 400
    if 'interviewType' not in request.form:
        return jsonify({'error': 'Interview Type is required'}), 400

    file = request.files['video']
    candidate_id = request.form['candidateId']
    job_description_id = request.form['jobDescriptionId']
    interview_type = request.form['interviewType']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Ensure unique filename to prevent overwrites, e.g., add timestamp or UUID
        unique_filename = f"{candidate_id}_{int(time.time())}_{filename}"
        video_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(video_path)

        # IMPORTANT: In a real application, you'd offload AI analysis to a background task
        # For this demo, we'll run it synchronously (blocking the request)
        ai_results = perform_ai_video_analysis(video_path)

        new_video_interview = VideoInterview(
            candidate_id=candidate_id,
            job_description_id=job_description_id,
            interview_type=interview_type,
            video_url=f"/static/video_interviews/{unique_filename}", # URL for frontend access
            duration_seconds=data.get('durationSeconds'), # You'll send this from frontend
            sentiment_score=ai_results.get('sentiment_score'),
            behavior_analysis_summary=ai_results.get('behavior_analysis_summary'),
            keywords_detected=ai_results.get('keywords_detected'),
            ai_feedback_raw=ai_results.get('ai_feedback_raw')
        )
        db.session.add(new_video_interview)
        db.session.commit()

        return jsonify(new_video_interview.to_dict()), 201
    else:
        return jsonify({'error': 'File type not allowed'}), 400

# Get all video interviews for a candidate
@app.route('/candidates/<int:candidate_id>/video_interviews', methods=['GET'])
def get_candidate_video_interviews(candidate_id):
    video_interviews = VideoInterview.query.filter_by(candidate_id=candidate_id).order_by(VideoInterview.interview_date.desc()).all()
    return jsonify([vi.to_dict() for vi in video_interviews])

# Get a single video interview by ID
@app.route('/video_interviews/<int:interview_id>', methods=['GET'])
def get_video_interview(interview_id):
    video_interview = VideoInterview.query.get(interview_id)
    if not video_interview:
        return jsonify({'error': 'Video interview not found'}), 404
    return jsonify(video_interview.to_dict())


# Get all pipeline stages
@app.route('/pipeline_stages', methods=['GET'])
def get_pipeline_stages():
    stages = PipelineStage.query.order_by(PipelineStage.order.asc()).all()
    return jsonify([s.to_dict() for s in stages])

# Create a new pipeline stage
@app.route('/pipeline_stages', methods=['POST'])
def create_pipeline_stage():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Stage name is required'}), 400
    if PipelineStage.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Stage with this name already exists'}), 409

    # Determine order (last by default)
    max_order = db.session.query(db.func.max(PipelineStage.order)).scalar()
    new_order = (max_order if max_order is not None else -1) + 1

    new_stage = PipelineStage(
        name=data['name'],
        description=data.get('description'),
        order=data.get('order', new_order),
        is_default=False # New stages are not default
    )
    db.session.add(new_stage)
    db.session.commit()
    return jsonify(new_stage.to_dict()), 201

# Update a pipeline stage (including reordering)
@app.route('/pipeline_stages/<int:stage_id>', methods=['PUT'])
def update_pipeline_stage(stage_id):
    stage = PipelineStage.query.get(stage_id)
    if not stage:
        return jsonify({'error': 'Pipeline stage not found'}), 404

    data = request.get_json()
    if 'name' in data and PipelineStage.query.filter(PipelineStage.name == data['name'], PipelineStage.id != stage_id).first():
        return jsonify({'error': 'Stage with this name already exists'}), 409

    old_order = stage.order
    new_order = data.get('order', old_order)

    stage.name = data.get('name', stage.name)
    stage.description = data.get('description', stage.description)
    stage.updated_at = datetime.utcnow()

    if new_order != old_order:
        # Reorder other stages
        if new_order < old_order: # Moving up
            PipelineStage.query.filter(
                PipelineStage.order >= new_order,
                PipelineStage.order < old_order
            ).update({PipelineStage.order: PipelineStage.order + 1}, synchronize_session=False)
        else: # Moving down
            PipelineStage.query.filter(
                PipelineStage.order > old_order,
                PipelineStage.order <= new_order
            ).update({PipelineStage.order: PipelineStage.order - 1}, synchronize_session=False)
        stage.order = new_order

    db.session.commit()
    return jsonify(stage.to_dict())

# Delete a pipeline stage
@app.route('/pipeline_stages/<int:stage_id>', methods=['DELETE'])
def delete_pipeline_stage(stage_id):
    stage = PipelineStage.query.get(stage_id)
    if not stage:
        return jsonify({'error': 'Pipeline stage not found'}), 404
    if stage.is_default:
        return jsonify({'error': 'Cannot delete default pipeline stage'}), 400

    # Reassign candidates in this stage to 'New Candidate' or another default
    # You might want a more sophisticated reassignment strategy
    Candidate.query.filter_by(status=stage.name).update({"status": "New Candidate"})

    # Adjust order of subsequent stages
    PipelineStage.query.filter(PipelineStage.order > stage.order).update({PipelineStage.order: PipelineStage.order - 1}, synchronize_session=False)

    db.session.delete(stage)
    db.session.commit()
    return jsonify({'message': 'Pipeline stage deleted successfully'}), 200


# --- NEW: User Management (Basic) ---
@app.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())

# --- NEW: Email Template Management ---
@app.route('/email_templates', methods=['POST'])
def create_email_template():
    data = request.get_json()
    if not all(k in data for k in ['name', 'subject', 'body']):
        return jsonify({'error': 'Name, subject, and body are required'}), 400
    if EmailTemplate.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Template with this name already exists'}), 409

    new_template = EmailTemplate(
        name=data['name'],
        subject=data['subject'],
        body=data['body']
    )
    db.session.add(new_template)
    db.session.commit()
    return jsonify(new_template.to_dict()), 201

@app.route('/email_templates', methods=['GET'])
def get_email_templates():
    templates = EmailTemplate.query.all()
    return jsonify([t.to_dict() for t in templates])

@app.route('/email_templates/<int:template_id>', methods=['GET'])
def get_email_template(template_id):
    template = EmailTemplate.query.get(template_id)
    if not template:
        return jsonify({'error': 'Email template not found'}), 404
    return jsonify(template.to_dict())

@app.route('/email_templates/<int:template_id>', methods=['PUT'])
def update_email_template(template_id):
    template = EmailTemplate.query.get(template_id)
    if not template:
        return jsonify({'error': 'Email template not found'}), 404

    data = request.get_json()
    if 'name' in data and EmailTemplate.query.filter(EmailTemplate.name == data['name'], EmailTemplate.id != template_id).first():
        return jsonify({'error': 'Template with this name already exists'}), 409

    template.name = data.get('name', template.name)
    template.subject = data.get('subject', template.subject)
    template.body = data.get('body', template.body)
    template.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(template.to_dict())

@app.route('/email_templates/<int:template_id>', methods=['DELETE'])
def delete_email_template(template_id):
    template = EmailTemplate.query.get(template_id)
    if not template:
        return jsonify({'error': 'Email template not found'}), 404
    if OutreachCampaign.query.filter_by(template_id=template_id).first():
        return jsonify({'error': 'Cannot delete template linked to active campaigns'}), 400
    db.session.delete(template)
    db.session.commit()
    return jsonify({'message': 'Email template deleted successfully'}), 200

# --- NEW: Outreach Campaign Management ---

@app.route('/outreach_campaigns', methods=['POST'])
def create_outreach_campaign():
    data = request.get_json()
    if not all(k in data for k in ['name', 'templateId', 'candidateIds']):
        return jsonify({'error': 'Name, template ID, and candidate IDs are required'}), 400

    template = EmailTemplate.query.get(data['templateId'])
    if not template:
        return jsonify({'error': 'Email template not found'}), 404

    # Validate candidate IDs
    candidate_ids = data['candidateIds']
    if not isinstance(candidate_ids, list):
        return jsonify({'error': 'Candidate IDs must be a list'}), 400
    if not all(isinstance(cid, int) for cid in candidate_ids):
        return jsonify({'error': 'All candidate IDs must be integers'}), 400

    # For now, hardcode user_id or get from a dummy user. In a real app, from auth token.
    current_user = User.query.first()
    sent_by_user_id = current_user.id if current_user else None

    new_campaign = OutreachCampaign(
        name=data['name'],
        template_id=data['templateId'],
        candidate_ids=json.dumps(candidate_ids),
        sent_by_user_id=sent_by_user_id,
        status='Draft'
    )
    db.session.add(new_campaign)
    db.session.commit()
    return jsonify(new_campaign.to_dict()), 201

@app.route('/outreach_campaigns', methods=['GET'])
def get_outreach_campaigns():
    campaigns = OutreachCampaign.query.order_by(OutreachCampaign.created_at.desc()).all()
    return jsonify([c.to_dict() for c in campaigns])

@app.route('/outreach_campaigns/<int:campaign_id>', methods=['GET'])
def get_outreach_campaign(campaign_id):
    campaign = OutreachCampaign.query.get(campaign_id)
    if not campaign:
        return jsonify({'error': 'Outreach campaign not found'}), 404
    return jsonify(campaign.to_dict())

@app.route('/outreach_campaigns/<int:campaign_id>/send', methods=['POST'])
def send_outreach_campaign(campaign_id):
    campaign = OutreachCampaign.query.get(campaign_id)
    if not campaign:
        return jsonify({'error': 'Outreach campaign not found'}), 404
    if campaign.status in ['Sent', 'Failed']:
        return jsonify({'error': 'Campaign already sent or failed'}), 400

    template = EmailTemplate.query.get(campaign.template_id)
    if not template:
        campaign.status = 'Failed'
        db.session.commit()
        return jsonify({'error': 'Associated email template not found'}), 404

    candidate_ids = json.loads(campaign.candidate_ids)
    candidates_to_email = Candidate.query.filter(Candidate.id.in_(candidate_ids)).all()

    # --- Placeholder for actual email sending ---
    sent_count = 0
    for candidate in candidates_to_email:
        # In a real app, use an email sending service like SendGrid, Mailgun, AWS SES
        # Example using a placeholder function:
        # send_single_email(
        #     to_email=candidate.email,
        #     subject=template.subject.replace('{{candidate_name}}', candidate.name),
        #     body=template.body.replace('{{candidate_name}}', candidate.name).replace('{{job_title}}', candidate.job_description.title if candidate.job_description else 'the position')
        # )
        print(f"Simulating sending email to {candidate.email} for campaign '{campaign.name}'")
        sent_count += 1
        # Simulate delay
        time.sleep(0.1)

    campaign.status = 'Sent'
    campaign.sent_at = datetime.utcnow()
    campaign.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': f'Campaign "{campaign.name}" sent to {sent_count} candidates.', 'campaign': campaign.to_dict()}), 200

# Placeholder for a dummy email sending function (NOT FOR PRODUCTION)
def send_single_email(to_email, subject, body):
    print(f"\n--- Sending Email ---")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print(f"---------------------\n")
    # In a real application, integrate with an email API here.



@app.route('/ats/candidates', methods=['GET'])
def get_ats_candidates():
    # Fetch candidates with some related data for the ATS dashboard view
    candidates_query = Candidate.query.order_by(Candidate.updated_at.desc())
    candidates = candidates_query.all()

    ats_data = []
    for candidate in candidates:
        candidate_dict = candidate.to_dict()

        # Fetch latest interview
        latest_interview = InterviewSchedule.query.filter_by(candidate_id=candidate.id)\
                                                .order_by(InterviewSchedule.start_time.desc()).first()
        candidate_dict['latestInterviewTime'] = latest_interview.start_time.isoformat() if latest_interview else None
        candidate_dict['latestInterviewType'] = latest_interview.interview_type if latest_interview else None

        # Fetch latest assessment result
        latest_assessment_result = CandidateAssessmentResult.query.filter_by(candidate_id=candidate.id)\
                                                                .order_by(CandidateAssessmentResult.completed_at.desc()).first()
        candidate_dict['latestAssessmentScore'] = latest_assessment_result.total_score if latest_assessment_result else None
        candidate_dict['latestAssessmentStatus'] = latest_assessment_result.status if latest_assessment_result else None

        # Fetch job description title
        if candidate.job_description_id:
            job_desc = JobDescription.query.get(candidate.job_description_id)
            candidate_dict['jobTitle'] = job_desc.title if job_desc else 'N/A'
        else:
            candidate_dict['jobTitle'] = 'N/A'

        ats_data.append(candidate_dict)
    return jsonify(ats_data)

if __name__ == '__main__':
    # When running for the first time with database changes, you might want to:
    # 1. Stop Flask app
    # 2. Delete recruiting.db (if you want a fresh start and new columns)
    # 3. Run Flask app
    app.run(debug=True, port=5000)
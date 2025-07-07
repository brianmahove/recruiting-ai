from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()

class Candidate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(255), nullable=True)
    skills = db.Column(db.Text) # Stored as JSON string
    experience = db.Column(db.Text) # Stored as JSON string
    education = db.Column(db.Text) # Stored as JSON string
    summary = db.Column(db.Text)
    match_score = db.Column(db.Float)
    resume_filepath = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(50), default='New Candidate') # e.g., 'New Candidate', 'Shortlisted', 'Rejected', 'Interviewed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    job_description_id = db.Column(db.Integer, db.ForeignKey('job_description.id'), nullable=True)
    job_description = db.relationship('JobDescription', backref='candidates')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'skills': json.loads(self.skills) if self.skills else [],
            'experience': json.loads(self.experience) if self.experience else [],
            'education': json.loads(self.education) if self.education else [],
            'summary': self.summary,
            'match_score': self.match_score,
            'resume_filepath': self.resume_filepath,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'job_description_id': self.job_description_id
        }

class JobDescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    text = db.Column(db.Text, nullable=False)
    skills_identified = db.Column(db.Text) # Stored as JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'text': self.text,
            'skills_identified': json.loads(self.skills_identified) if self.skills_identified else [],
            'created_at': self.created_at.isoformat()
        }

# --- NEW MODELS FOR AI INTERVIEWER ---
# You'd define these here, or in services/ai_interviewer/models.py and import them
class InterviewQuestion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_description_id = db.Column(db.Integer, db.ForeignKey('job_description.id'), nullable=True)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(50)) # e.g., 'behavioral', 'technical', 'cultural'
    order_in_interview = db.Column(db.Integer)

    def to_dict(self):
        return {
            'id': self.id,
            'job_description_id': self.job_description_id,
            'question_text': self.question_text,
            'question_type': self.question_type,
            'order_in_interview': self.order_in_interview
        }

class CandidateInterview(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)
    job_description_id = db.Column(db.Integer, db.ForeignKey('job_description.id'), nullable=False)
    interview_datetime = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='Started') # e.g., 'Started', 'Completed', 'Aborted'
    overall_interview_score = db.Column(db.Float, nullable=True)
    # Store aggregated/summary analysis results or links to more detailed logs/files
    final_analysis_summary = db.Column(db.Text) # e.g., JSON summary of all question analyses

    candidate = db.relationship('Candidate', backref=db.backref('interviews', lazy=True))
    job_description = db.relationship('JobDescription', backref=db.backref('interviews', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'job_description_id': self.job_description_id,
            'interview_datetime': self.interview_datetime.isoformat(),
            'status': self.status,
            'overall_interview_score': self.overall_interview_score,
            'final_analysis_summary': json.loads(self.final_analysis_summary) if self.final_analysis_summary else None
        }

class InterviewAnswer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    interview_id = db.Column(db.Integer, db.ForeignKey('candidate_interview.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('interview_question.id'), nullable=False)
    response_text = db.Column(db.Text) # Transcribed text from audio, or typed
    audio_filepath = db.Column(db.String(500))
    video_filepath = db.Column(db.String(500))
    # Store granular analysis results for each answer
    text_analysis = db.Column(db.Text) # JSON string
    facial_analysis = db.Column(db.Text) # JSON string
    tone_analysis = db.Column(db.Text) # JSON string
    score = db.Column(db.Float) # Score for this specific answer

    interview = db.relationship('CandidateInterview', backref=db.backref('answers', lazy=True))
    question = db.relationship('InterviewQuestion', backref=db.backref('answers', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'interview_id': self.interview_id,
            'question_id': self.question_id,
            'response_text': self.response_text,
            'audio_filepath': self.audio_filepath,
            'video_filepath': self.video_filepath,
            'text_analysis': json.loads(self.text_analysis) if self.text_analysis else None,
            'facial_analysis': json.loads(self.facial_analysis) if self.facial_analysis else None,
            'tone_analysis': json.loads(self.tone_analysis) if self.tone_analysis else None,
            'score': self.score
        }
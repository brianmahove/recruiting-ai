from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Candidate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(120), unique=False, nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    skills = db.Column(db.Text, nullable=True) # Stored as JSON string
    experience = db.Column(db.Text, nullable=True) # Stored as JSON string
    education = db.Column(db.Text, nullable=True) # Stored as JSON string
    summary = db.Column(db.Text, nullable=True)
    match_score = db.Column(db.Float, nullable=True)
    job_description_id = db.Column(db.Integer, db.ForeignKey('job_description.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # New: Store path to original resume or its unique filename
    resume_filepath = db.Column(db.String(255), nullable=True)
    # New: Status for workflow tracking
    status = db.Column(db.String(50), default='New Candidate', nullable=False)


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
            'job_description_id': self.job_description_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'resume_filepath': self.resume_filepath, # Include in dict
            'status': self.status # Include in dict
        }

class JobDescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    text = db.Column(db.Text, nullable=False)
    skills_identified = db.Column(db.Text, nullable=True) # Stored as JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    candidates = db.relationship('Candidate', backref='job_description', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'text': self.text,
            'skills_identified': json.loads(self.skills_identified) if self.skills_identified else [],
            'created_at': self.created_at.isoformat()
        }

def init_db(app):
    db.init_app(app)
    with app.app_context():
        # db.drop_all() # Uncomment to clear database for fresh start (USE WITH CAUTION)
        db.create_all() # Creates tables if they don't exist
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
# from flask_bcrypt import Bcrypt # You'll need to import Bcrypt if you plan to use it here,
                              # but be mindful of circular imports if it's initialized in app.py

db = SQLAlchemy()

# --- Candidate Model ---
class Candidate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    resume_filepath = db.Column(db.String(255))
    job_description_id = db.Column(db.Integer, db.ForeignKey('job_description.id'), nullable=True)
    match_score = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(100), default='New Candidate')
    summary = db.Column(db.Text)
    skills = db.Column(db.Text)
    experience = db.Column(db.Text)
    education = db.Column(db.Text)
    years_of_experience = db.Column(db.Integer)
    gender = db.Column(db.String(50))
    ethnicity = db.Column(db.String(100))
    source = db.Column(db.String(100))
    hired_at = db.Column(db.DateTime)
    rating = db.Column(db.Float)
    assigned_to_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - **FIXED for backref conflict**
    job_description = db.relationship('JobDescription', back_populates='candidates') # Unified to back_populates
    assigned_to = db.relationship('User', foreign_keys=[assigned_to_user_id], back_populates='assigned_candidates', lazy=True)
    screening_responses = db.relationship('CandidateScreeningResponse', back_populates='candidate_rel', lazy=True, cascade="all, delete-orphan")
    video_interviews = db.relationship('VideoInterview', back_populates='candidate_rel', lazy=True, cascade="all, delete-orphan")
    notes = db.relationship('CandidateNote', back_populates='candidate_rel', lazy=True, cascade="all, delete-orphan")
    status_history = db.relationship('CandidateStatusHistory', back_populates='candidate_rel', lazy=True, cascade="all, delete-orphan")
    assessment_results = db.relationship('CandidateAssessmentResult', back_populates='candidate_rel', lazy=True, cascade="all, delete-orphan")
    interviews = db.relationship('InterviewSchedule', back_populates='candidate_rel', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'resumeFilepath': self.resume_filepath,
            'jobDescriptionId': self.job_description_id,
            'matchScore': round(self.match_score, 2),
            'status': self.status,
            'summary': self.summary,
            'skills': json.loads(self.skills) if self.skills else [],
            'experience': json.loads(self.experience) if self.experience else [],
            'education': json.loads(self.education) if self.education else [],
            'yearsOfExperience': self.years_of_experience,
            'gender': self.gender,
            'ethnicity': self.ethnicity,
            'source': self.source,
            'hiredAt': self.hired_at.isoformat() if self.hired_at else None,
            'rating': self.rating,
            'assignedToUserId': self.assigned_to_user_id,
            'assignedToUsername': self.assigned_to.username if self.assigned_to else None,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class JobDescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    skills_identified = db.Column(db.Text, nullable=True) # Stored as JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - **FIXED for backref conflict**
    candidates = db.relationship('Candidate', back_populates='job_description', lazy=True, cascade="all, delete-orphan") # Unified to back_populates

    screening_questions = db.relationship('ScreeningQuestion', back_populates='job_description_rel', lazy=True, cascade="all, delete-orphan")
    skill_assessments = db.relationship('SkillAssessment', back_populates='job_description_rel', lazy=True, cascade="all, delete-orphan")
    interviews = db.relationship('InterviewSchedule', back_populates='job_description_rel', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'skills_identified': json.loads(self.skills_identified) if self.skills_identified else [],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

#--- NEW: User Model ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), default='Recruiter') # e.g., 'Admin', 'Recruiter', 'Hiring Manager'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships for User
    assigned_candidates = db.relationship('Candidate', back_populates='assigned_to', lazy=True)
    candidate_notes_rel = db.relationship('CandidateNote', back_populates='user_rel', lazy=True)
    status_changes_rel = db.relationship('CandidateStatusHistory', back_populates='changed_by_rel', lazy=True)
    outreach_campaigns_rel = db.relationship('OutreachCampaign', back_populates='sent_by_rel', lazy=True)

    def set_password(self, password):
        # Ensure bcrypt is imported and available in the scope where this method is called.
        # This typically means initializing bcrypt in app.py and passing it or making it globally accessible
        # or importing it here if it's not a circular dependency.
        # For now, I'll comment out the direct bcrypt call. You'll need to decide how to handle bcrypt.
        # self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        pass # Placeholder

    def check_password(self, password):
        # return bcrypt.check_password_hash(self.password_hash, password)
        pass # Placeholder

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'createdAt': self.created_at.isoformat()
        }


#--- NEW Models for Automated Screening ---
class ScreeningQuestion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_description_id = db.Column(db.Integer, db.ForeignKey('job_description.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(50), default='text') # e.g., 'text', 'multiple_choice', 'voice', 'video'
    expected_keywords = db.Column(db.Text) # JSON string of keywords for scoring
    ideal_answer = db.Column(db.Text) # For more advanced scoring
    order = db.Column(db.Integer, default=0) # Order of questions in interview
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job_description_rel = db.relationship('JobDescription', back_populates='screening_questions') # Renamed to avoid direct clash if 'job_description' column existed elsewhere
    candidate_responses = db.relationship('CandidateScreeningResponse', back_populates='question_rel', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'jobDescriptionId': self.job_description_id,
            'questionText': self.question_text,
            'questionType': self.question_type,
            'expectedKeywords': json.loads(self.expected_keywords) if self.expected_keywords else [],
            'idealAnswer': self.ideal_answer,
            'order': self.order,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class CandidateScreeningResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('screening_question.id'), nullable=False)
    response_text = db.Column(db.Text) # Text of the response
    score = db.Column(db.Float, default=0.0) # Score for this specific response
    sentiment_score = db.Column(db.Float, default=0.0) # From -1.0 to 1.0 (TextBlob polarity)
    facial_analysis_data = db.Column(db.Text) # JSON string of facial analysis results (e.g., emotions over time)
    tone_analysis_data = db.Column(db.Text) # JSON string of tone analysis results
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    candidate_rel = db.relationship('Candidate', back_populates='screening_responses')
    question_rel = db.relationship('ScreeningQuestion', back_populates='candidate_responses') # Renamed to avoid direct clash

    def to_dict(self):
        return {
            'id': self.id,
            'candidateId': self.candidate_id,
            'questionId': self.question_id,
            'responseText': self.response_text,
            'score': round(self.score, 2),
            'sentimentScore': round(self.sentiment_score, 2),
            'facialAnalysisData': json.loads(self.facial_analysis_data) if self.facial_analysis_data else None,
            'toneAnalysisData': json.loads(self.tone_analysis_data) if self.tone_analysis_data else None,
            'createdAt': self.created_at.isoformat()
        }

# NEW: Skill Assessment Models
class SkillAssessment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    job_description_id = db.Column(db.Integer, db.ForeignKey('job_description.id'), nullable=True) # Optional link to a JD
    assessment_type = db.Column(db.String(50), default='General') # e.g., 'Coding', 'Personality', 'Logic', 'Custom'
    duration_minutes = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    job_description_rel = db.relationship('JobDescription', back_populates='skill_assessments') # Consistent with JD
    questions = db.relationship('AssessmentQuestion', back_populates='assessment_rel', lazy=True, cascade="all, delete-orphan")
    results = db.relationship('CandidateAssessmentResult', back_populates='assessment_rel', lazy=True, cascade="all, delete-orphan")


    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'jobDescriptionId': self.job_description_id,
            'assessmentType': self.assessment_type,
            'durationMinutes': self.duration_minutes,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class AssessmentQuestion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('skill_assessment.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(50), default='OpenText') # e.g., 'OpenText', 'MultipleChoice', 'CodeSnippet', 'TrueFalse'
    options = db.Column(db.Text) # JSON string for MultipleChoice, CSV for simple lists
    correct_answer = db.Column(db.Text) # For MCQs, TF, or keywords for OpenText AI eval
    points = db.Column(db.Integer, default=10)
    order = db.Column(db.Integer, default=0) # To order questions within an assessment

    assessment_rel = db.relationship('SkillAssessment', back_populates='questions') # Added back_populates
    responses = db.relationship('CandidateQuestionResponse', back_populates='question_rel', lazy=True, cascade="all, delete-orphan") # Added for inverse

    def to_dict(self):
        options_list = json.loads(self.options) if self.options else []
        return {
            'id': self.id,
            'assessmentId': self.assessment_id,
            'questionText': self.question_text,
            'questionType': self.question_type,
            'options': options_list,
            'correctAnswer': self.correct_answer,
            'points': self.points,
            'order': self.order
        }


class VideoInterview(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)
    job_description_id = db.Column(db.Integer, db.ForeignKey('job_description.id'), nullable=True) # Link to specific job
    interview_type = db.Column(db.String(50), nullable=False) # e.g., 'Live', 'Recorded'
    video_url = db.Column(db.String(500), nullable=False) # URL or path to the stored video file
    interview_date = db.Column(db.DateTime, default=datetime.utcnow)
    duration_seconds = db.Column(db.Integer)
    # AI Analysis Fields
    sentiment_score = db.Column(db.Float) # e.g., -1.0 to 1.0
    behavior_analysis_summary = db.Column(db.Text) # e.g., 'High enthusiasm, moderate eye contact'
    keywords_detected = db.Column(db.Text) # JSON string or comma-separated list of keywords
    ai_feedback_raw = db.Column(db.Text) # Raw response from AI service
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships - consistent with Candidate and JD
    candidate_rel = db.relationship('Candidate', back_populates='video_interviews') # Consistent name
    job_description_rel = db.relationship('JobDescription', backref='video_interviews_rel', lazy=True) # Use a distinct backref name

    def to_dict(self):
        return {
            'id': self.id,
            'candidateId': self.candidate_id,
            'jobDescriptionId': self.job_description_id,
            'interviewType': self.interview_type,
            'videoUrl': self.video_url,
            'interviewDate': self.interview_date.isoformat() if self.interview_date else None,
            'durationSeconds': self.duration_seconds,
            'sentimentScore': self.sentiment_score,
            'behaviorAnalysisSummary': self.behavior_analysis_summary,
            'keywordsDetected': self.keywords_detected,
            'aiFeedbackRaw': self.ai_feedback_raw,
            'createdAt': self.created_at.isoformat()
        }

# --- Updated CandidateNote Model ---
class CandidateNote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Link to user who made the note
    note_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships - consistent naming
    candidate_rel = db.relationship('Candidate', back_populates='notes')
    user_rel = db.relationship('User', back_populates='candidate_notes_rel') # Consistent name

    def to_dict(self):
        return {
            'id': self.id,
            'candidateId': self.candidate_id,
            'userId': self.user_id,
            'username': self.user_rel.username if self.user_rel else 'System', # Use user_rel
            'noteText': self.note_text,
            'createdAt': self.created_at.isoformat()
        }

# --- Updated CandidateStatusHistory Model ---
class CandidateStatusHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)
    old_status = db.Column(db.String(100), nullable=True)
    new_status = db.Column(db.String(100), nullable=False)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    changed_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Link to user who changed status

    # Relationships - consistent naming
    candidate_rel = db.relationship('Candidate', back_populates='status_history')
    changed_by_rel = db.relationship('User', back_populates='status_changes_rel') # Consistent name

    def to_dict(self):
        return {
            'id': self.id,
            'candidateId': self.candidate_id,
            'oldStatus': self.old_status,
            'newStatus': self.new_status,
            'changedAt': self.changed_at.isoformat(),
            'changedByUserId': self.changed_by_user_id,
            'changedByUsername': self.changed_by_rel.username if self.changed_by_rel else 'System' # Use changed_by_rel
        }

class CandidateAssessmentResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)
    assessment_id = db.Column(db.Integer, db.ForeignKey('skill_assessment.id'), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    total_score = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default='Started') # e.g., 'Started', 'Completed', 'Graded'
    completed_at = db.Column(db.DateTime)

    # Relationships - consistent naming
    candidate_rel = db.relationship('Candidate', back_populates='assessment_results')
    assessment_rel = db.relationship('SkillAssessment', back_populates='results') # Consistent name

    responses = db.relationship('CandidateQuestionResponse', back_populates='assessment_result_rel', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'candidateId': self.candidate_id,
            'assessmentId': self.assessment_id,
            'startTime': self.start_time.isoformat() if self.start_time else None,
            'endTime': self.end_time.isoformat() if self.end_time else None,
            'totalScore': self.total_score,
            'status': self.status,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
        }

class CandidateQuestionResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    result_id = db.Column(db.Integer, db.ForeignKey('candidate_assessment_result.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('assessment_question.id'), nullable=False)
    response_text = db.Column(db.Text)
    score = db.Column(db.Float)
    ai_feedback = db.Column(db.Text)
    responded_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships - consistent naming
    assessment_result_rel = db.relationship('CandidateAssessmentResult', back_populates='responses')
    question_rel = db.relationship('AssessmentQuestion', back_populates='responses')


    def to_dict(self):
        return {
            'id': self.id,
            'resultId': self.result_id,
            'questionId': self.question_id,
            'responseText': self.response_text,
            'score': self.score,
            'aiFeedback': self.ai_feedback,
            'respondedAt': self.responded_at.isoformat()
        }

# --- NEW: PipelineStage Model for Custom Workflow Stages ---
class PipelineStage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    order = db.Column(db.Integer, default=0) # For drag-and-drop ordering
    is_default = db.Column(db.Boolean, default=False) # Can't be deleted if default
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'order': self.order,
            'isDefault': self.is_default,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

# --- NEW: Outreach Campaign Models ---
class EmailTemplate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaigns = db.relationship('OutreachCampaign', back_populates='template_rel', lazy=True) # Consistent name

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'subject': self.subject,
            'body': self.body,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class OutreachCampaign(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('email_template.id'), nullable=False)
    candidate_ids = db.Column(db.Text, nullable=False) # JSON string of candidate IDs
    sent_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    status = db.Column(db.String(50), default='Draft') # 'Draft', 'Scheduled', 'Sent', 'Failed'
    sent_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - consistent naming
    template_rel = db.relationship('EmailTemplate', back_populates='campaigns')
    sent_by_rel = db.relationship('User', back_populates='outreach_campaigns_rel') # Consistent name

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'templateId': self.template_id,
            'templateName': self.template_rel.name if self.template_rel else None, # Use template_rel
            'candidateIds': json.loads(self.candidate_ids) if self.candidate_ids else [],
            'sentByUserId': self.sent_by_user_id,
            'sentByUsername': self.sent_by_rel.username if self.sent_by_rel else None,
            'status': self.status,
            'sentAt': self.sent_at.isoformat() if self.sent_at else None,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

# --- NEW Model for Interview Scheduling ---
class InterviewSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)
    job_description_id = db.Column(db.Integer, db.ForeignKey('job_description.id'), nullable=False)
    recruiter_name = db.Column(db.String(100), nullable=False) # Or recruiter_id foreign key
    interview_type = db.Column(db.String(50), default='Virtual') # e.g., 'Virtual', 'On-site', 'Phone'
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    meeting_link = db.Column(db.String(255))
    status = db.Column(db.String(50), default='Scheduled') # e.g., 'Scheduled', 'Rescheduled', 'Completed', 'Cancelled'
    candidate_notes = db.Column(db.Text)
    recruiter_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - consistent naming
    candidate_rel = db.relationship('Candidate', back_populates='interviews')
    job_description_rel = db.relationship('JobDescription', back_populates='interviews')

    def to_dict(self):
        return {
            'id': self.id,
            'candidateId': self.candidate_id,
            'jobDescriptionId': self.job_description_id,
            'recruiterName': self.recruiter_name,
            'interviewType': self.interview_type,
            'startTime': self.start_time.isoformat(),
            'endTime': self.end_time.isoformat(),
            'meetingLink': self.meeting_link,
            'status': self.status,
            'candidateNotes': self.candidate_notes,
            'recruiterNotes': self.recruiter_notes,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

# This function is correct for initializing the database
def init_db(app):
    db.init_app(app)
    with app.app_context():
        # db.drop_all() # Uncomment to clear database for fresh start (USE WITH CAUTION)
        db.create_all() # Creates tables if they don't exist
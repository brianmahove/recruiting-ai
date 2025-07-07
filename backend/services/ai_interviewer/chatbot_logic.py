from database import db, InterviewQuestion, CandidateInterview, InterviewAnswer
import json
from datetime import datetime

# You'll likely need more advanced NLP for question generation/response analysis
# For now, let's focus on basic question retrieval and storage.

def get_job_questions(job_description_id):
    """Retrieves interview questions for a given job description."""
    questions = InterviewQuestion.query.filter_by(job_description_id=job_description_id)\
                                  .order_by(InterviewQuestion.order_in_interview.asc()).all()
    return [q.to_dict() for q in questions]

def start_new_interview(candidate_id, job_description_id):
    """Creates a new interview session record."""
    new_interview = CandidateInterview(
        candidate_id=candidate_id,
        job_description_id=job_description_id,
        status='Started'
    )
    db.session.add(new_interview)
    db.session.commit()
    return new_interview

def save_interview_answer(interview_id, question_id, response_text,
                          audio_filepath=None, video_filepath=None,
                          text_analysis_results=None, facial_analysis_results=None, tone_analysis_results=None,
                          score=None):
    """Saves a candidate's answer and analysis results for a specific question."""
    new_answer = InterviewAnswer(
        interview_id=interview_id,
        question_id=question_id,
        response_text=response_text,
        audio_filepath=audio_filepath,
        video_filepath=video_filepath,
        text_analysis=json.dumps(text_analysis_results) if text_analysis_results else None,
        facial_analysis=json.dumps(facial_analysis_results) if facial_analysis_results else None,
        tone_analysis=json.dumps(tone_analysis_results) if tone_analysis_results else None,
        score=score
    )
    db.session.add(new_answer)
    db.session.commit()
    return new_answer

def finalize_interview_session(interview_id, overall_score, analysis_summary=None):
    """Updates an interview session as completed and sets the final score."""
    interview = CandidateInterview.query.get(interview_id)
    if interview:
        interview.status = 'Completed'
        interview.overall_interview_score = overall_score
        interview.final_analysis_summary = json.dumps(analysis_summary) if analysis_summary else None
        db.session.commit()
        return interview
    return None

# Placeholder for adding interview questions (e.g., from an admin UI or pre-defined)
def add_interview_question(job_description_id, question_text, question_type='general', order=None):
    if order is None:
        last_order = db.session.query(db.func.max(InterviewQuestion.order_in_interview)).filter_by(job_description_id=job_description_id).scalar()
        order = (last_order or 0) + 1
    new_question = InterviewQuestion(
        job_description_id=job_description_id,
        question_text=question_text,
        question_type=question_type,
        order_in_interview=order
    )
    db.session.add(new_question)
    db.session.commit()
    return new_question
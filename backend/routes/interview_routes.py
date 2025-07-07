from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import json
from database import db, Candidate, JobDescription, InterviewQuestion, CandidateInterview, InterviewAnswer
from services.ai_interviewer.chatbot_logic import (
    get_job_questions, start_new_interview, save_interview_answer, finalize_interview_session,
    add_interview_question # For adding test questions
)
from services.ai_interviewer.media_analyzer import (
    transcribe_audio, analyze_facial_expressions, analyze_tone, analyze_text_nlp
)
from services.ai_interviewer.scoring import (
    calculate_answer_score, calculate_overall_interview_score
)

interview_bp = Blueprint('interview', __name__)

# --- API for managing Interview Questions (Admin/Setup) ---
@interview_bp.route('/interview/questions', methods=['POST'])
def create_interview_question():
    data = request.get_json()
    job_id = data.get('job_description_id')
    question_text = data.get('question_text')
    question_type = data.get('question_type', 'general')
    order = data.get('order_in_interview')

    if not all([job_id, question_text]):
        return jsonify({"error": "Job ID and question text are required."}), 400

    try:
        new_question = add_interview_question(job_id, question_text, question_type, order)
        return jsonify(new_question.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to add question: {str(e)}"}), 500

@interview_bp.route('/interview/questions/<int:job_id>', methods=['GET'])
def get_interview_questions_by_job(job_id):
    questions = get_job_questions(job_id)
    return jsonify(questions)

# --- API for Candidate Interview Flow ---

@interview_bp.route('/interview/start/<int:candidate_id>/<int:job_id>', methods=['POST'])
def start_interview_session(candidate_id, job_id):
    candidate = Candidate.query.get(candidate_id)
    job_description = JobDescription.query.get(job_id)

    if not candidate or not job_description:
        return jsonify({"error": "Candidate or Job Description not found."}), 404

    try:
        new_interview = start_new_interview(candidate_id, job_id)
        questions = get_job_questions(job_id)
        if not questions:
            return jsonify({"error": "No interview questions found for this job."}), 404

        return jsonify({
            "interview_id": new_interview.id,
            "questions": questions,
            "status": "Interview started."
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to start interview: {str(e)}"}), 500


@interview_bp.route('/interview/submit_answer/<int:interview_id>/<int:question_id>', methods=['POST'])
def submit_interview_answer_route(interview_id, question_id):
    interview_session = CandidateInterview.query.get(interview_id)
    interview_question = InterviewQuestion.query.get(question_id)

    if not interview_session or not interview_question:
        return jsonify({"error": "Interview session or question not found."}), 404

    # Get data from request (text response, optional audio/video files)
    response_text = request.form.get('text_response', '') # Frontend can send transcribed text
    audio_file = request.files.get('audio')
    video_file = request.files.get('video')

    audio_filepath = None
    video_filepath = None
    upload_folder = current_app.config['UPLOAD_FOLDER']

    try:
        # Save audio file if provided
        if audio_file:
            audio_filename = secure_filename(f"audio_{interview_id}_{question_id}.webm")
            audio_filepath = os.path.join(upload_folder, audio_filename)
            audio_file.save(audio_filepath)

        # Save video file if provided
        if video_file:
            video_filename = secure_filename(f"video_{interview_id}_{question_id}.webm")
            video_filepath = os.path.join(upload_folder, video_filename)
            video_file.save(video_filepath)

        # --- Perform Analysis ---
        # 1. Speech-to-Text (if audio provided and text_response is empty)
        if audio_filepath and not response_text:
            response_text = transcribe_audio(audio_filepath)

        # 2. Text Analysis
        text_analysis = analyze_text_nlp(response_text)

        # 3. Facial Analysis
        facial_analysis = analyze_facial_expressions(video_filepath)

        # 4. Tone Analysis
        tone_analysis = analyze_tone(audio_filepath)

        # 5. Score this answer
        answer_score = calculate_answer_score(text_analysis, facial_analysis, tone_analysis)

        # Save the answer and its analysis results
        saved_answer = save_interview_answer(
            interview_id=interview_id,
            question_id=question_id,
            response_text=response_text,
            audio_filepath=audio_filepath,
            video_filepath=video_filepath,
            text_analysis_results=text_analysis,
            facial_analysis_results=facial_analysis,
            tone_analysis_results=tone_analysis,
            score=answer_score
        )

        return jsonify({
            "status": "Answer received and analyzed",
            "answer_id": saved_answer.id,
            "response_text": saved_answer.response_text,
            "score": saved_answer.score,
            "analysis_results": {
                "text": text_analysis,
                "facial": facial_analysis,
                "tone": tone_analysis
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error submitting answer: {e}")
        return jsonify({"error": f"Failed to submit answer: {str(e)}"}), 500

@interview_bp.route('/interview/finalize/<int:interview_id>', methods=['POST'])
def finalize_interview_session_route(interview_id):
    interview_session = CandidateInterview.query.get(interview_id)
    if not interview_session:
        return jsonify({"error": "Interview session not found."}), 404

    try:
        # Retrieve all answers for this interview session
        all_answers = [ans.to_dict() for ans in interview_session.answers]
        overall_score = calculate_overall_interview_score(all_answers)

        # You might aggregate analysis summaries here
        final_analysis_summary = {
            "total_questions": len(all_answers),
            "average_answer_score": overall_score,
            # Add more aggregated analysis data if needed
        }

        finalized_interview = finalize_interview_session(interview_id, overall_score, final_analysis_summary)

        return jsonify({
            "status": "Interview finalized",
            "interview_id": finalized_interview.id,
            "overall_score": finalized_interview.overall_interview_score,
            "summary": finalized_interview.final_analysis_summary
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error finalizing interview: {e}")
        return jsonify({"error": f"Failed to finalize interview: {str(e)}"}), 500
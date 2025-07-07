# routes/upload_routes.py
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from datetime import datetime
import json
import os

from database import db, Candidate, JobDescription
from services.resume_parser import extract_text_from_file, parse_resume_text
from services.jd_analyzer import extract_skills_from_job_description
from services.matching_engine import calculate_match_score

# Make sure this line exists and is correct:
upload_bp = Blueprint('upload', __name__)

# ... the rest of your route functions go here ...


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'resume' not in request.files:
        return jsonify({"error": "No resume file part"}), 400

    resume_file = request.files['resume']
    job_description_text = request.form.get('job_description', '')
    job_title = request.form.get('job_title', 'Untitled Job')

    if resume_file.filename == '':
        return jsonify({"error": "No selected resume file"}), 400

    if resume_file and allowed_file(resume_file.filename):
        original_filename = secure_filename(resume_file.filename)
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{original_filename}"
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        resume_file.save(filepath)

        # 1. Parse Resume
        resume_text = extract_text_from_file(filepath)
        parsed_resume_data = parse_resume_text(resume_text)

        # 2. Extract skills from Job Description
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
            db.session.commit()

        # 3. Calculate Match Score
        match_score, matched_skills = calculate_match_score(parsed_resume_data, jd_skills_identified)

        # 4. Save Candidate to DB
        new_candidate = Candidate(
            name=parsed_resume_data.get('name'),
            email=parsed_resume_data.get('email'),
            phone=parsed_resume_data.get('phone'),
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
            "filename": original_filename,
            "stored_filename": unique_filename,
            "parsed_resume": parsed_resume_data,
            "job_description_skills_identified": jd_skills_identified,
            "match_score": match_score,
            "matched_skills": matched_skills,
            "candidate_id": new_candidate.id,
            "job_description_id": current_jd.id
        })
    else:
        return jsonify({"error": "File type not allowed"}), 400

@upload_bp.route('/download_resume/<filename>', methods=['GET'])
def download_resume(filename):
    try:
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
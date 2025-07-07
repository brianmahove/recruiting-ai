from flask import Blueprint, request, jsonify, current_app
import json
import os
from database import db, Candidate, JobDescription

candidate_bp = Blueprint('candidates', __name__)

@candidate_bp.route('/candidates', methods=['GET'])
def get_candidates():
    query = Candidate.query

    job_description_id = request.args.get('job_description_id', type=int)
    if job_description_id:
        query = query.filter_by(job_description_id=job_description_id)

    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    min_score = request.args.get('min_score', type=float)
    if min_score is not None:
        query = query.filter(Candidate.match_score >= min_score)

    search_term = request.args.get('search_term')
    if search_term:
        search_like = f"%{search_term}%"
        query = query.filter(
            (Candidate.name.ilike(search_like)) |
            (Candidate.email.ilike(search_like))
        )

    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')

    if sort_by == 'match_score':
        query = query.order_by(Candidate.match_score.asc() if sort_order == 'asc' else Candidate.match_score.desc())
    elif sort_by == 'name':
        query = query.order_by(Candidate.name.asc() if sort_order == 'asc' else Candidate.name.desc())
    elif sort_by == 'created_at':
        query = query.order_by(Candidate.created_at.asc() if sort_order == 'asc' else Candidate.created_at.desc())

    candidates = query.all()
    return jsonify([candidate.to_dict() for candidate in candidates])

@candidate_bp.route('/candidates/<int:candidate_id>', methods=['GET'])
def get_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if candidate:
        candidate_data = candidate.to_dict()
        if candidate.job_description:
            candidate_data['job_description'] = candidate.job_description.to_dict()
        return jsonify(candidate_data)
    return jsonify({"error": "Candidate not found"}), 404

@candidate_bp.route('/candidates/<int:candidate_id>', methods=['PUT'])
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
    candidate.status = data.get('status', candidate.status)

    db.session.commit()
    return jsonify(candidate.to_dict())

@candidate_bp.route('/candidates/<int:candidate_id>', methods=['DELETE'])
def delete_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return jsonify({"error": "Candidate not found"}), 404

    if candidate.resume_filepath:
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], candidate.resume_filepath)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Deleted resume file: {file_path}")
        else:
            print(f"Resume file not found for deletion: {file_path}")

    db.session.delete(candidate)
    db.session.commit()
    return jsonify({"status": "success", "message": "Candidate deleted"})
from flask import Blueprint, request, jsonify
import json
from database import db, JobDescription

jd_bp = Blueprint('job_descriptions', __name__)

@jd_bp.route('/job_descriptions', methods=['GET'])
def get_job_descriptions():
    jds = JobDescription.query.all()
    return jsonify([jd.to_dict() for jd in jds])

@jd_bp.route('/job_descriptions/<int:jd_id>', methods=['GET'])
def get_job_description(jd_id):
    jd = JobDescription.query.get(jd_id)
    if jd:
        return jsonify(jd.to_dict())
    return jsonify({"error": "Job Description not found"}), 404

@jd_bp.route('/job_descriptions/<int:jd_id>', methods=['DELETE'])
def delete_job_description(jd_id):
    jd = JobDescription.query.get(jd_id)
    if not jd:
        return jsonify({"error": "Job Description not found"}), 404

    if jd.candidates: # Check if any candidates are linked to this JD
        return jsonify({"error": "Cannot delete Job Description: Candidates are linked to it."}), 400

    db.session.delete(jd)
    db.session.commit()
    return jsonify({"status": "success", "message": "Job Description deleted"})
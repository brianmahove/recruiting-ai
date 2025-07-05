import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchAssessments, deleteAssessment } from '../api';
import './AssessmentList.css'; // Create this CSS file

function AssessmentList() {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getAssessments = async () => {
            try {
                const data = await fetchAssessments();
                setAssessments(data);
                setLoading(false);
            } catch (err) {
                setError("Failed to load assessments.");
                setLoading(false);
            }
        };
        getAssessments();
    }, []);

    const handleDelete = async (assessmentId, assessmentTitle) => {
        if (window.confirm(`Are you sure you want to delete the assessment "${assessmentTitle}"? This will also delete all associated questions and candidate results.`)) {
            try {
                await deleteAssessment(assessmentId);
                setAssessments(assessments.filter(a => a.id !== assessmentId));
            } catch (err) {
                setError("Failed to delete assessment.");
                console.error(err);
            }
        }
    };

    if (loading) return <div className="loading-message">Loading assessments...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="assessment-list-container">
            <h2>Skill Assessments</h2>
            <div className="assessment-actions-header">
                <Link to="/assessments/new" className="add-assessment-btn">
                    + Create New Assessment
                </Link>
            </div>

            {assessments.length === 0 ? (
                <p className="no-data-message">No skill assessments created yet.</p>
            ) : (
                <ul className="assessment-cards-list">
                    {assessments.map((assessment) => (
                        <li key={assessment.id} className="assessment-card">
                            <div className="card-header">
                                <h3>{assessment.title}</h3>
                                <span className="assessment-type-badge">{assessment.assessmentType}</span>
                            </div>
                            <div className="card-body">
                                <p><strong>Description:</strong> {assessment.description || 'N/A'}</p>
                                <p><strong>Duration:</strong> {assessment.durationMinutes ? `${assessment.durationMinutes} minutes` : 'N/A'}</p>
                                <p><strong>Created:</strong> {new Date(assessment.createdAt).toLocaleDateString()}</p>
                                {/* Link to job description if exists: <p><strong>Job:</strong> {assessment.jobDescriptionId}</p> */}
                            </div>
                            <div className="card-actions">
                                <button onClick={() => navigate(`/assessments/${assessment.id}`)} className="manage-questions-btn">
                                    Manage Questions
                                </button>
                                <button onClick={() => navigate(`/assessments/${assessment.id}/edit`)} className="edit-btn">Edit Details</button>
                                <button onClick={() => handleDelete(assessment.id, assessment.title)} className="delete-btn">Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default AssessmentList;
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchJobDescriptionById, deleteJobDescription } from '../api';
import './JobDescriptionDetail.css'; // Create this CSS file

function JobDescriptionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [jobDescription, setJobDescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getJobDescription = async () => {
            try {
                const data = await fetchJobDescriptionById(id);
                setJobDescription(data);
                setLoading(false);
            } catch (err) {
                setError("Failed to load job description details.");
                setLoading(false);
            }
        };
        getJobDescription();
    }, [id]);

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this Job Description? All associated candidates will also be deleted.")) {
            try {
                await deleteJobDescription(id);
                alert('Job Description and associated candidates deleted successfully!');
                navigate('/'); // Go back to job description list
            } catch (err) {
                setError(`Failed to delete job description: ${err.message}`);
            }
        }
    };

    if (loading) return <div className="loading-message">Loading job description...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!jobDescription) return <div className="no-data-message">Job description not found.</div>;

    return (
        <div className="jd-detail-container">
            <button onClick={() => navigate(-1)} className="back-button">← Back to Job Descriptions</button>
            <h2>{jobDescription.title}</h2>

            <div className="detail-section">
                <h3>Description</h3>
                <p className="pre-formatted-text">{jobDescription.description}</p>
            </div>

            <div className="detail-section">
                <p><strong>Created At:</strong> {new Date(jobDescription.createdAt).toLocaleDateString()}</p>
                <p><strong>Last Updated:</strong> {new Date(jobDescription.updatedAt).toLocaleDateString()}</p>
            </div>

            <div className="action-buttons">
                <Link to={`/job-descriptions/${jobDescription.id}/edit`} className="edit-jd-button">Edit Job Description</Link>
                <button onClick={handleDelete} className="delete-jd-button">Delete Job Description</button>
            </div>

            <div className="related-candidates-link">
                <Link to={`/candidates?job_description_id=${jobDescription.id}`} className="view-candidates-for-jd-button">
                    View Candidates for This Job
                </Link>
            </div>
        </div>
    );
}

export default JobDescriptionDetail;
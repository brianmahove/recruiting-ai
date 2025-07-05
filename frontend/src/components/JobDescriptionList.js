import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchJobDescriptions, deleteJobDescription } from '../api';
import './JobDescriptionList.css'; // Create this CSS file

function JobDescriptionList() {
    const [jobDescriptions, setJobDescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadJobDescriptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchJobDescriptions();
            setJobDescriptions(data);
            setLoading(false);
        } catch (err) {
            setError("Failed to load job descriptions.");
            setLoading(false);
        }
    };

    useEffect(() => {
        loadJobDescriptions();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this Job Description? All associated candidates will also be deleted.")) {
            try {
                await deleteJobDescription(id);
                loadJobDescriptions(); // Refresh the list
            } catch (err) {
                setError(`Failed to delete job description: ${err.message}`);
            }
        }
    };

    if (loading) return <div className="loading-message">Loading job descriptions...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="job-description-list-container">
            <h2>Job Descriptions</h2>
            <Link to="/job-descriptions/new" className="add-jd-button">Add New Job Description</Link>

            {jobDescriptions.length === 0 ? (
                <p>No job descriptions added yet. Click "Add New Job Description" to get started.</p>
            ) : (
                <div className="job-description-grid">
                    {jobDescriptions.map((jd) => (
                        <div key={jd.id} className="jd-card">
                            <h3><Link to={`/job-descriptions/${jd.id}`}>{jd.title}</Link></h3>
                            <p className="jd-description-preview">{jd.description.substring(0, 150)}{jd.description.length > 150 ? '...' : ''}</p>
                            <div className="jd-card-actions">
                                <Link to={`/job-descriptions/${jd.id}`} className="view-button">View</Link>
                                <Link to={`/job-descriptions/${jd.id}/edit`} className="edit-button">Edit</Link>
                                <button onClick={() => handleDelete(jd.id)} className="delete-button">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default JobDescriptionList;
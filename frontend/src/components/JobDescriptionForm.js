import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createJobDescription, fetchJobDescriptionById, updateJobDescription } from '../api';
import './JobDescriptionForm.css'; // Create this CSS file

function JobDescriptionForm() {
    const { id } = useParams(); // Get ID from URL for edit mode
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            const loadJobDescription = async () => {
                setLoading(true);
                setError(null);
                try {
                    const jd = await fetchJobDescriptionById(id);
                    setTitle(jd.title);
                    setDescription(jd.description);
                    setLoading(false);
                } catch (err) {
                    setError("Failed to load job description for editing.");
                    setLoading(false);
                }
            };
            loadJobDescription();
        }
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const jdData = { title, description };

        try {
            if (isEditMode) {
                await updateJobDescription(id, jdData);
                alert('Job Description updated successfully!');
            } else {
                await createJobDescription(jdData);
                alert('Job Description added successfully!');
            }
            navigate('/'); // Navigate back to the list of job descriptions
        } catch (err) {
            setError(isEditMode ? "Failed to update job description." : "Failed to add job description.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-message">Loading form...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="job-description-form-container">
            <h2>{isEditMode ? 'Edit Job Description' : 'Add New Job Description'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Job Title:</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Job Description:</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows="10"
                        className="form-textarea"
                    ></textarea>
                </div>
                <button type="submit" disabled={loading} className="submit-button">
                    {loading ? 'Saving...' : (isEditMode ? 'Update Job Description' : 'Add Job Description')}
                </button>
                <button type="button" onClick={() => navigate(-1)} className="cancel-button">
                    Cancel
                </button>
            </form>
        </div>
    );
}

export default JobDescriptionForm;
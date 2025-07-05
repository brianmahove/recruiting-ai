import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createAssessment, fetchAssessmentById, updateAssessment, fetchJobDescriptions } from '../api';
import './AssessmentForm.css'; // Create this CSS file

function AssessmentForm() {
    const { id } = useParams(); // assessmentId for editing
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assessmentType, setAssessmentType] = useState('General');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [jobDescriptionId, setJobDescriptionId] = useState('');
    const [jobDescriptions, setJobDescriptions] = useState([]); // For dropdown
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const isEditing = !!id;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const jds = await fetchJobDescriptions();
                setJobDescriptions(jds);

                if (isEditing) {
                    const assessment = await fetchAssessmentById(id);
                    setTitle(assessment.title);
                    setDescription(assessment.description || '');
                    setAssessmentType(assessment.assessmentType);
                    setDurationMinutes(assessment.durationMinutes || '');
                    setJobDescriptionId(assessment.jobDescriptionId || '');
                }
            } catch (err) {
                setError("Failed to load data.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!title || !assessmentType) {
            setError("Title and Assessment Type are required.");
            return;
        }

        const assessmentData = {
            title,
            description: description || null,
            assessmentType,
            durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
            jobDescriptionId: jobDescriptionId ? parseInt(jobDescriptionId) : null,
        };

        try {
            if (isEditing) {
                await updateAssessment(id, assessmentData);
                alert("Assessment updated successfully!");
            } else {
                await createAssessment(assessmentData);
                alert("Assessment created successfully!");
            }
            navigate('/assessments'); // Go back to assessment list
        } catch (err) {
            setError(`Failed to ${isEditing ? 'update' : 'create'} assessment.`);
            console.error(err);
        }
    };

    if (loading) return <div className="loading-message">Loading form...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="assessment-form-container">
            <button onClick={() => navigate('/assessments')} className="back-button">← Back to Assessments</button>
            <h2>{isEditing ? 'Edit Assessment' : 'Create New Assessment'}</h2>

            <form onSubmit={handleSubmit} className="assessment-form">
                <div className="form-group">
                    <label htmlFor="title">Assessment Title:</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description:</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="4"
                        placeholder="Brief description of the assessment..."
                    ></textarea>
                </div>

                <div className="form-group">
                    <label htmlFor="assessmentType">Assessment Type:</label>
                    <select
                        id="assessmentType"
                        value={assessmentType}
                        onChange={(e) => setAssessmentType(e.target.value)}
                        required
                    >
                        <option value="General">General</option>
                        <option value="Coding">Coding Test</option>
                        <option value="Personality">Personality Test</option>
                        <option value="Logic">Logic Puzzle</option>
                        <option value="Custom">Custom Quiz</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="durationMinutes">Duration (minutes):</label>
                    <input
                        type="number"
                        id="durationMinutes"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                        placeholder="e.g., 60"
                        min="1"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="jobDescriptionId">Link to Job Description (Optional):</label>
                    <select
                        id="jobDescriptionId"
                        value={jobDescriptionId}
                        onChange={(e) => setJobDescriptionId(e.target.value)}
                    >
                        <option value="">-- Select a Job Description --</option>
                        {jobDescriptions.map(jd => (
                            <option key={jd.id} value={jd.id}>{jd.title}</option>
                        ))}
                    </select>
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn">
                        {isEditing ? 'Update Assessment' : 'Create Assessment'}
                    </button>
                    <button type="button" onClick={() => navigate('/assessments')} className="cancel-btn">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AssessmentForm;
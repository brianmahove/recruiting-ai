import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchInterviews, deleteInterview, downloadIcal } from '../api';
import './InterviewList.css'; // Create this CSS file

function InterviewList() {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getInterviews = async () => {
            try {
                // Fetch all interviews, or add filters later
                const data = await fetchInterviews();
                // To display candidate and job info, you'd need to fetch them too
                // For simplicity here, assume they are linked or we'd fetch them with interview details.
                // In a real app, optimize by fetching linked data or making a more complex JOIN query on backend.
                setInterviews(data);
                setLoading(false);
            } catch (err) {
                setError("Failed to load interviews.");
                setLoading(false);
            }
        };
        getInterviews();
    }, []);

    const handleDelete = async (interviewId) => {
        if (window.confirm("Are you sure you want to cancel this interview?")) {
            try {
                await deleteInterview(interviewId);
                setInterviews(interviews.filter(i => i.id !== interviewId));
            } catch (err) {
                setError("Failed to delete interview.");
                console.error(err);
            }
        }
    };

    if (loading) return <div className="loading-message">Loading interviews...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="interview-list-container">
            <h2>All Scheduled Interviews</h2>

            {interviews.length === 0 ? (
                <p className="no-data-message">No interviews scheduled yet.</p>
            ) : (
                <ul className="interview-cards-list">
                    {interviews.map((interview) => (
                        <li key={interview.id} className="interview-card">
                            <div className="card-header">
                                <h3>Interview with Candidate ID: {interview.candidateId}</h3>
                                <span className={`interview-status-badge status-${interview.status.toLowerCase().replace(' ', '-')}`}>
                                    {interview.status}
                                </span>
                            </div>
                            <div className="card-body">
                                <p><strong>Job ID:</strong> {interview.jobDescriptionId || 'N/A'}</p>
                                <p><strong>Type:</strong> {interview.interviewType}</p>
                                <p><strong>Recruiter:</strong> {interview.recruiterName}</p>
                                <p><strong>Start:</strong> {new Date(interview.startTime).toLocaleString()}</p>
                                <p><strong>End:</strong> {new Date(interview.endTime).toLocaleString()}</p>
                                {interview.meetingLink && <p><strong>Link:</strong> <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">{interview.meetingLink}</a></p>}
                                {interview.recruiterNotes && <p><strong>Recruiter Notes:</strong> {interview.recruiterNotes}</p>}
                                {interview.candidateNotes && <p><strong>Candidate Notes:</strong> {interview.candidateNotes}</p>}
                            </div>
                            <div className="card-actions">
                                <button onClick={() => navigate(`/interviews/${interview.id}/edit`)} className="edit-btn">Edit</button>
                                <button onClick={() => downloadIcal(interview.id)} className="download-ical-btn">Download .ics</button>
                                <button onClick={() => handleDelete(interview.id)} className="delete-btn">Cancel</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default InterviewList;
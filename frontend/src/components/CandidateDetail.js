import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    fetchCandidateById,
    updateCandidate,
    downloadResume,
    fetchJobDescriptions, // Potentially needed for jobTitle
    fetchCandidateScreeningResponses,
    fetchInterviews,
    fetchCandidateAllAssessmentResults,
    fetchAIExplanationForCandidate,
    fetchCandidateNotes,
    addCandidateNote,
    fetchCandidateStatusHistory,
    fetchCandidateVideoInterviews,
    fetchUsers, // NEW: fetchUsers
    fetchJobDescriptionById, // Used for jobDescription details
    getAiScreeningResponse // If AI screening response needs a specific fetch
} from '../api';

import './CandidateDetail.css';

function CandidateDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [candidate, setCandidate] = useState(null);
    const [jobDescription, setJobDescription] = useState(null);
    const [aiScreeningResponse, setAiScreeningResponse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [scheduledInterviews, setScheduledInterviews] = useState([]);
    const [candidateAssessments, setCandidateAssessments] = useState([]);
    const [aiExplanation, setAiExplanation] = useState(null);
    const [explanationLoading, setExplanationLoading] = useState(false);
    const [explanationError, setExplanationError] = useState(null);

    const [candidateNotes, setCandidateNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [statusHistory, setStatusHistory] = useState([]);
    const [editingStatus, setEditingStatus] = useState(false);
    const [selectedNewStatus, setSelectedNewStatus] = useState(''); // Corrected to use selectedNewStatus for dropdown
    const [videoInterviews, setVideoInterviews] = useState([]);

    // NEW: Collaboration states
    const [users, setUsers] = useState([]); // All users for assignment dropdown
    const [selectedAssignedUser, setSelectedAssignedUser] = useState('');
    const [currentRating, setCurrentRating] = useState(0); // For candidate rating

    // Declare state for jobTitle and screeningResponses
    const [jobTitle, setJobTitle] = useState('N/A');
    const [screeningResponses, setScreeningResponses] = useState([]);
    const [currentStatus, setCurrentStatus] = useState(''); // Initialize currentStatus

    // Define all possible statuses for the dropdown (should come from PipelineStage model)
    const allCandidateStatuses = [
        "New Candidate", "Under Review", "AI Screened", "Interview Scheduled",
        "Interviewed", "Assessment Started", "Assessment Completed", "Assessment Graded",
        "Offered", "Hired", "Rejected"
    ].sort();

    useEffect(() => {
        const getCandidateDetails = async () => {
            setLoading(true);
            try {
                const fetchedCandidate = await fetchCandidateById(id);
                setCandidate(fetchedCandidate);
                setCurrentStatus(fetchedCandidate.status); // Set current status initially
                setSelectedNewStatus(fetchedCandidate.status); // Initialize selectedNewStatus
                setCurrentRating(fetchedCandidate.rating || 0); // Initialize rating
                setSelectedAssignedUser(fetchedCandidate.assignedToUserId || ''); // Initialize assigned user

                if (fetchedCandidate.jobDescriptionId) {
                    const jd = await fetchJobDescriptionById(fetchedCandidate.jobDescriptionId);
                    setJobDescription(jd);
                    setJobTitle(jd.title); // Set job title here
                } else {
                    setJobDescription(null);
                    setJobTitle('N/A');
                }

                // Fetch AI Screening Responses
                const responses = await fetchCandidateScreeningResponses(id);
                setScreeningResponses(responses);

                const interviews = await fetchInterviews({ candidateId: id });
                setScheduledInterviews(interviews);

                const assessments = await fetchCandidateAllAssessmentResults(id);
                setCandidateAssessments(assessments);

                const notes = await fetchCandidateNotes(id);
                setCandidateNotes(notes);

                const history = await fetchCandidateStatusHistory(id);
                setStatusHistory(history);

                const videos = await fetchCandidateVideoInterviews(id);
                setVideoInterviews(videos);

                const fetchedUsers = await fetchUsers();
                setUsers(fetchedUsers);

                setLoading(false);
            } catch (err) {
                setError("Failed to load candidate details.");
                setLoading(false);
                console.error("Error fetching candidate details:", err);
            }
        };
        getCandidateDetails();
    }, [id]); // Dependency array: re-run if 'id' changes

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        try {
            const addedNote = await addCandidateNote(id, newNote);
            setCandidateNotes(prev => [addedNote, ...prev]); // Add to top
            setNewNote('');
        } catch (err) {
            alert("Failed to add note.");
            console.error("Error adding note:", err);
        }
    };

    const handleStatusUpdate = async () => {
        if (!candidate) return; // Ensure candidate object exists

        if (selectedNewStatus === candidate.status) {
            setEditingStatus(false); // No change, just close
            return;
        }
        if (!window.confirm(`Are you sure you want to change candidate status to "${selectedNewStatus}"?`)) {
            return;
        }

        try {
            const updatedCand = await updateCandidate(id, { status: selectedNewStatus });
            setCandidate(updatedCand); // Update candidate state with new status
            setCurrentStatus(updatedCand.status); // Also update currentStatus
            // Re-fetch status history to see the new entry
            const history = await fetchCandidateStatusHistory(id);
            setStatusHistory(history);
            setEditingStatus(false);
            alert("Candidate status updated successfully!");
        } catch (err) {
            alert("Failed to update candidate status.");
            console.error("Error updating status:", err);
        }
    };

    const handleFetchAIExplanation = async () => {
        setExplanationLoading(true);
        setExplanationError(null);
        try {
            const explanation = await fetchAIExplanationForCandidate(id);
            if (explanation.error) {
                setExplanationError(explanation.error);
                setAiExplanation(null);
            } else {
                setAiExplanation(explanation);
            }
        } catch (err) {
            setExplanationError("Failed to fetch AI explanation.");
            console.error("Error fetching AI explanation:", err);
        } finally {
            setExplanationLoading(false);
        }
    };

    // Placeholder functions (YOU NEED TO IMPLEMENT THEIR LOGIC)
    const handleDownloadResume = async () => {
        if (candidate?.resumeFilepath) {
            try {
                // Assuming downloadResume handles the actual file download
                await downloadResume(candidate.resumeFilepath);
                alert("Resume download initiated.");
            } catch (err) {
                alert("Failed to download resume.");
                console.error("Error downloading resume:", err);
            }
        } else {
            alert("No resume available for download.");
        }
    };

    const handleStatusChange = (e) => {
        // This function is for the *display* of the current status, not saving it.
        // The saving logic is in handleStatusUpdate.
        setCurrentStatus(e.target.value);
        // Optionally, if you want to immediately change the candidate status without a separate save button,
        // you would call handleStatusUpdate here with the new value.
        // However, your existing code uses `editingStatus` and a save button, so keep it separate.
    };

    const handleRatingChange = async (newRating) => {
        try {
            const updatedCand = await updateCandidate(id, { rating: newRating });
            setCandidate(updatedCand);
            setCurrentRating(updatedCand.rating);
            alert("Candidate rating updated!");
        } catch (err) {
            alert("Failed to update rating.");
            console.error("Error updating rating:", err);
        }
    };

    const handleAssignUser = async () => {
        if (!candidate) return;
        try {
            const updatedCand = await updateCandidate(id, { assignedToUserId: selectedAssignedUser || null });
            setCandidate(updatedCand);
            alert("Candidate assigned successfully!");
        } catch (err) {
            alert("Failed to assign user.");
            console.error("Error assigning user:", err);
        }
    };

    const downloadIcal = async (interviewId) => {
        // Implement logic to download iCal for the given interviewId
        alert(`Download iCal for interview ID: ${interviewId} (Functionality to be implemented)`);
        // Example: window.open(`/api/interviews/${interviewId}/download-ical`);
    };

    if (loading) return <div className="loading-message">Loading candidate details...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!candidate) return <div className="no-data-message">Candidate not found.</div>;

    return (
        <div className="candidate-detail-container">
            <button onClick={() => navigate(-1)} className="back-button">← Back to Candidates</button>
            <h2>{candidate.name}</h2>

            <div className="detail-section">
                <p><strong>Job Applied For:</strong> {jobTitle}</p>
                <p><strong>Email:</strong> {candidate.email}</p>
                <p><strong>Phone:</strong> {candidate.phone}</p>
                <p><strong>Match Score:</strong> <span className="score-highlight">{candidate.matchScore}%</span></p>

                {/* Candidate Rating */}
                <p>
                    <strong>Recruiter Rating:</strong>
                    <div className="star-rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span
                                key={star}
                                className={`star ${star <= currentRating ? 'filled' : ''}`}
                                onClick={() => handleRatingChange(star)}
                            >
                                &#9733;
                            </span>
                        ))}
                        {currentRating > 0 && <span className="rating-value">{currentRating}/5</span>}
                    </div>
                </p>

                {/* Assign Candidate */}
                <p>
                    <strong>Assigned To:</strong>
                    <select
                        value={selectedAssignedUser}
                        onChange={(e) => setSelectedAssignedUser(e.target.value)}
                        onBlur={handleAssignUser} // Save on blur
                        className="assignment-dropdown"
                    >
                        <option value="">-- Unassigned --</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.username} ({user.role})</option>
                        ))}
                    </select>
                </p>
                {candidate.resumeFilepath && (
                    <button onClick={handleDownloadResume} className="download-resume-btn">
                        Download Resume
                    </button>
                )}
            </div>

            {/* AI Screening & Bias Transparency Section */}
            <div className="detail-section ai-screening-section">
                <h3>AI Screening & Transparency</h3>
                {candidate && candidate.status === 'AI Screened' && (
                    <div className="ai-screening-results">
                        <p><strong>AI Score:</strong> {candidate.score !== undefined ? `${(candidate.score * 100).toFixed(2)}% Match` : 'N/A'}</p>
                        <p><strong>AI Feedback:</strong> {candidate.ai_feedback || 'No specific feedback.'}</p>
                        <button onClick={handleFetchAIExplanation} disabled={explanationLoading} className="explain-ai-btn">
                            {explanationLoading ? 'Generating...' : 'Explain AI Decision'}
                        </button>

                        {explanationError && <div className="error-message mt-2">{explanationError}</div>}
                        {aiExplanation && (
                            <div className="ai-explanation-details mt-3">
                                <h4>AI Decision Explanation (SHAP Values)</h4>
                                <p><strong>Base Likelihood:</strong> {(aiExplanation.base_value * 100).toFixed(2)}%</p>
                                <p><strong>Predicted Likelihood:</strong> {(aiExplanation.prediction_probability * 100).toFixed(2)}%</p>
                                <h5>Feature Contributions:</h5>
                                <ul>
                                    {Object.entries(aiExplanation.feature_contributions).map(([feature, value]) => (
                                        <li key={feature}>
                                            <strong>{feature}:</strong> {value.toFixed(4)}
                                            {value > 0 ? <span style={{ color: 'green', marginLeft: '5px' }}> (Positive Impact)</span> :
                                                value < 0 ? <span style={{ color: 'red', marginLeft: '5px' }}> (Negative Impact)</span> : <span style={{ color: 'gray', marginLeft: '5px' }}> (Neutral)</span>}
                                        </li>
                                    ))}
                                </ul>
                                <p className="explanation-note">Positive SHAP values indicate a feature pushes the prediction towards the positive outcome (e.g., 'hired'), negative values towards the negative outcome (e.g., 'rejected').</p>
                            </div>
                        )}
                    </div>
                )}
                <p>
                    <button
                        onClick={() => navigate(`/ai-screening-setup/${jobDescription?.id}`)}
                        className="screening-setup-btn"
                        disabled={!jobDescription?.id || !candidate.jobDescriptionId}
                        title={!jobDescription?.id ? "Select a job description first to set up AI screening" : ""}
                    >
                        Set up AI Screening for this Candidate
                    </button>
                </p>
            </div>

            {/* AI Interview Section */}
            {candidate.jobDescriptionId && (
                <div className="detail-section ai-interview-section">
                    <h3>AI Interview</h3>
                    <p>Start an automated AI screening interview for this candidate based on the job requirements.</p>
                    <button
                        onClick={() => navigate(`/ai-screening-interview/${candidate.id}/${candidate.jobDescriptionId}`)}
                        className="start-ai-interview-btn"
                    >
                        Start AI Interview
                    </button>

                    {screeningResponses.length > 0 && (
                        <div className="screening-results">
                            <h4>AI Screening Results:</h4>
                            {screeningResponses.map((res, index) => (
                                <div key={index} className="response-summary-item">
                                    <p><strong>Q:</strong> {res.questionText}</p>
                                    <p><strong>A:</strong> {res.responseText}</p>
                                    <p><strong>Score:</strong> {res.score}% | <strong>Sentiment:</strong> {res.sentimentScore}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Interview Scheduling Section */}
            <div className="detail-section interview-scheduling-section">
                <h3>Interview Scheduling</h3>
                <p>Schedule a live interview for this candidate.</p>
                <button
                    onClick={() => navigate(`/schedule-interview/${candidate.id}/${candidate.jobDescriptionId || 'new'}`)}
                    className="schedule-interview-btn"
                >
                    Schedule New Interview
                </button>

                {scheduledInterviews.length > 0 ? (
                    <div className="scheduled-interviews-list">
                        <h4>Scheduled Interviews ({scheduledInterviews.length}):</h4>
                        <ul>
                            {scheduledInterviews.map((interview) => (
                                <li key={interview.id} className="scheduled-interview-item">
                                    <p><strong>Type:</strong> {interview.interviewType}</p>
                                    <p><strong>Time:</strong> {new Date(interview.startTime).toLocaleString()} - {new Date(interview.endTime).toLocaleTimeString()}</p>
                                    <p><strong>Recruiter:</strong> {interview.recruiterName}</p>
                                    <p><strong>Status:</strong> <span className={`interview-status-badge status-${interview.status.toLowerCase().replace(' ', '-')}`}>{interview.status}</span></p>
                                    <div className="interview-actions">
                                        <button onClick={() => navigate(`/interviews/${interview.id}/edit`)} className="edit-interview-btn">Edit</button>
                                        <button onClick={() => downloadIcal(interview.id)} className="download-ical-btn">Download .ics</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="no-data-message">No scheduled interviews for this candidate yet.</p>
                )}
            </div>

            {/* Video Interviewing Section */}
            <div className="detail-section video-interview-section">
                <h3>Video Interviews</h3>
                {jobDescription ? (
                    <button
                        onClick={() => navigate(`/video-interview/record/${id}/${jobDescription.id}`)}
                        className="record-video-btn"
                    >
                        Record New Video Interview
                    </button>
                ) : (
                    <p className="info-message">Assign a job description to this candidate to record a video interview.</p>
                )}

                {videoInterviews.length === 0 ? (
                    <p className="no-data-message">No video interviews recorded for this candidate yet.</p>
                ) : (
                    <div className="video-interviews-list">
                        <h4>Recorded Interviews:</h4>
                        {videoInterviews.map(video => (
                            <div key={video.id} className="video-interview-item" onClick={() => navigate(`/video-interview/details/${video.id}`)}>
                                <p><strong>Type:</strong> {video.interviewType}</p>
                                <p><strong>Date:</strong> {new Date(video.interviewDate).toLocaleDateString()}</p>
                                {video.sentimentScore !== null && <p><strong>AI Sentiment:</strong> {video.sentimentScore.toFixed(2)}</p>}
                                <button onClick={(e) => { e.stopPropagation(); navigate(`/video-interview/details/${video.id}`); }} className="view-video-btn">View Details & Analysis</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ATS Status & History Section */}
            <div className="detail-section ats-status-section">
                <h3>Candidate Status & Journey</h3>
                <div className="current-status-display">
                    <p><strong>Current Status:</strong> <span className={`status-badge status-${candidate.status.toLowerCase().replace(/\s/g, '-')}`}>{candidate.status}</span></p>
                    <button onClick={() => setEditingStatus(!editingStatus)} className="edit-status-btn">
                        {editingStatus ? 'Cancel' : 'Change Status'}
                    </button>
                </div>

                {editingStatus && (
                    <div className="status-change-form">
                        <label htmlFor="new-status">Select New Status:</label>
                        <select
                            id="new-status"
                            value={selectedNewStatus}
                            onChange={(e) => setSelectedNewStatus(e.target.value)}
                        >
                            {allCandidateStatuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                        <button onClick={handleStatusUpdate} className="save-status-btn">Save Status</button>
                    </div>
                )}

                <h4>Status History:</h4>
                {statusHistory.length === 0 ? (
                    <p className="no-data-message">No status changes recorded yet.</p>
                ) : (
                    <ul className="status-history-list">
                        {statusHistory.map(entry => (
                            <li key={entry.id}>
                                From <span className="old-status">{entry.oldStatus || 'N/A'}</span> to <span className="new-status">{entry.newStatus}</span> on {new Date(entry.changedAt).toLocaleString()}
                                {entry.changedByUsername && <span> (by {entry.changedByUsername})</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Recruiter Notes Section */}
            <div className="detail-section recruiter-notes-section">
                <h3>Recruiter Notes</h3>
                <form onSubmit={handleAddNote} className="add-note-form">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a new note about this candidate..."
                        rows="4"
                    ></textarea>
                    <button type="submit" className="add-note-btn">Add Note</button>
                </form>

                {candidateNotes.length === 0 ? (
                    <p className="no-data-message">No notes for this candidate yet.</p>
                ) : (
                    <ul className="notes-list">
                        {candidateNotes.map(note => (
                            <li key={note.id} className="note-item">
                                <p className="note-text">{note.noteText}</p>
                                <p className="note-meta">
                                    Added on {new Date(note.createdAt).toLocaleString()}
                                    {note.username && <span> by {note.username}</span>}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* NEW: Skill Assessments Section */}
            <div className="detail-section skill-assessments-section">
                <h3>Skill Assessments & Tests</h3>
                <p>Assign and review automated skill assessments for this candidate.</p>
                <button onClick={() => navigate(`/assessments`)} className="assign-assessment-btn">
                    Assign New Assessment
                </button>

                {candidateAssessments.length > 0 ? (
                    <div className="candidate-assessments-list">
                        <h4>Completed Assessments ({candidateAssessments.length}):</h4>
                        <ul>
                            {candidateAssessments.map((result) => (
                                <li key={result.id} className="candidate-assessment-item">
                                    <p><strong>Assessment ID:</strong> {result.assessmentId}</p> {/* Later, fetch assessment title */}
                                    <p><strong>Status:</strong> <span className={`assessment-status-badge status-${result.status.toLowerCase()}`}>{result.status}</span></p>
                                    {result.totalScore !== undefined && <p><strong>Total Score:</strong> {result.totalScore}%</p>}
                                    <p><strong>Completed:</strong> {result.completedAt ? new Date(result.completedAt).toLocaleString() : 'N/A'}</p>
                                    <div className="assessment-actions">
                                        <button onClick={() => navigate(`/assessment-results/${result.id}`)} className="view-results-btn">View Results</button>
                                        {/* You might add a "Retake" button if applicable */}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="no-data-message">No skill assessments recorded for this candidate yet.</p>
                )}
            </div>

            {/* Summary, Skills, Experience, Education sections */}
            <div className="detail-section">
                <h3>Summary</h3>
                <p className="pre-formatted-text">{candidate.summary || 'No summary provided.'}</p>
            </div>

            <div className="detail-section">
                <h3>Skills</h3>
                <ul className="skills-list">
                    {candidate.skills && candidate.skills.length > 0 ? (
                        candidate.skills.map((skill, index) => <li key={index}>{skill}</li>)
                    ) : (
                        <li>No skills listed.</li>
                    )}
                </ul>
            </div>

            <div className="detail-section">
                <h3>Experience</h3>
                {candidate.experience && candidate.experience.length > 0 ? (
                    candidate.experience.map((exp, index) => (
                        <div key={index} className="experience-item">
                            <p className="pre-formatted-text">{exp}</p>
                        </div>
                    ))
                ) : (
                    <p>No experience listed.</p>
                )}
            </div>

            <div className="detail-section">
                <h3>Education</h3>
                {candidate.education && candidate.education.length > 0 ? (
                    candidate.education.map((edu, index) => (
                        <div key={index} className="education-item">
                            <p className="pre-formatted-text">{edu}</p>
                        </div>
                    ))
                ) : (
                    <p>No education listed.</p>
                )}
            </div>
        </div>
    );
}

export default CandidateDetail;
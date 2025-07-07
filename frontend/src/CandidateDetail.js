// src/CandidateDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    getCandidateDetail,
    updateCandidateStatus,
    deleteCandidate,
    getJobDescriptions,
    getCandidates // Import getCandidates to fetch candidates for a job
} from './api'; // Ensure getCandidates is exported from your api.js
import EmailSender from './EmailSender';

function CandidateDetail() {
    const { id } = useParams(); // ID of the currently viewed candidate
    const navigate = useNavigate();
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEmailSender, setShowEmailSender] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('');
    const [statusUpdateMessage, setStatusUpdateMessage] = useState('');

    // NEW STATES for Interview modal functionality
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [jobDescriptions, setJobDescriptions] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [jobCandidates, setJobCandidates] = useState([]); // Candidates related to selected JD
    const [matchScoreFilter, setMatchScoreFilter] = useState(0); // Filter for match percentage
    const [interviewError, setInterviewError] = useState(null);
    const [selectedCandidateForInterview, setSelectedCandidateForInterview] = useState(null); // The candidate to actually interview
    const [showJobSelection, setShowJobSelection] = useState(true); // Controls modal view: true for JD selection, false for candidate list

    const candidateStatuses = ['New Candidate', 'Reviewed', 'Interviewing', 'Rejected', 'Hired'];
    const API_BASE_URL = 'http://127.0.0.1:5000'; // Corrected typo here (00.1 -> 0.0.1)

    useEffect(() => {
        const fetchCandidateAndJobDescriptions = async () => {
            setLoading(true);
            setError(null);
            try {
                const candidateData = await getCandidateDetail(id);
                setCandidate(candidateData);
                setCurrentStatus(candidateData.status);

                // Fetch all job descriptions for the dropdown
                const jdData = await getJobDescriptions();
                setJobDescriptions(jdData);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError(err.message || "Failed to load candidate details or job descriptions.");
            } finally {
                setLoading(false);
            }
        };
        fetchCandidateAndJobDescriptions();
    }, [id]);

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        setCurrentStatus(newStatus);
        setStatusUpdateMessage('');
        try {
            await updateCandidateStatus(id, newStatus);
            setStatusUpdateMessage('Status updated successfully! ✅');
            const updatedData = await getCandidateDetail(id);
            setCandidate(updatedData);
        } catch (err) {
            setStatusUpdateMessage(`Error updating status: ${err.message} ❌`);
            setCurrentStatus(candidate.status); // Revert on error
        } finally {
            setTimeout(() => setStatusUpdateMessage(''), 3000);
        }
    };

    const handleDeleteCandidate = async () => {
        if (window.confirm("Are you sure you want to delete this candidate and their associated resume? This action cannot be undone.")) {
            try {
                await deleteCandidate(id);
                alert("Candidate deleted successfully! 🗑️");
                navigate('/candidates'); // Redirect to candidates list
            } catch (err) {
                alert(`Failed to delete candidate: ${err.message} 🚫`);
            }
        }
    };

    // NEW: Function to fetch candidates specific to a selected job description
    const fetchCandidatesForJob = async (jobId) => {
        setInterviewError(null); // Clear previous errors
        try {
            // Assuming getCandidates can take job_description_id and min_match_score as parameters
            // You might need to adjust your api.js and backend for this.
            const data = await getCandidates({ job_description_id: jobId, min_match_score: matchScoreFilter });
            setJobCandidates(data);
            setShowJobSelection(false); // Move to candidate selection view
        } catch (err) {
            console.error("Failed to fetch candidates for job:", err);
            setInterviewError(err.message || "Failed to load candidates for this job.");
            setJobCandidates([]);
        }
    };

    // NEW: Handlers for Interview Modal Flow
    const handleStartInterviewClick = () => {
        setShowInterviewModal(true);
        setShowJobSelection(true); // Start by showing job selection
        setSelectedJobId('');
        setSelectedCandidateForInterview(null);
        setJobCandidates([]);
        setMatchScoreFilter(0); // Reset filter
        setInterviewError(null);
    };

    const handleJobSelectChange = (e) => {
        const jobId = e.target.value;
        setSelectedJobId(jobId);
        if (jobId) {
            fetchCandidatesForJob(jobId);
        } else {
            setJobCandidates([]);
            setShowJobSelection(true); // Stay on job selection if no job selected
        }
    };

    const handleMatchScoreFilterChange = (e) => {
        const filterValue = parseInt(e.target.value, 10);
        setMatchScoreFilter(filterValue);
        // Re-fetch candidates with the new filter if a job is already selected
        if (selectedJobId) {
            fetchCandidatesForJob(selectedJobId);
        }
    };

    const handleCandidateForInterviewSelect = (candidateItem) => {
        setSelectedCandidateForInterview(candidateItem);
    };

    const handleInterviewSubmit = () => {
        if (selectedCandidateForInterview && selectedJobId) {
            // Navigate to the interview page using the selected candidate's ID and the selected job's ID
            navigate(`/interview/${selectedCandidateForInterview.id}/${selectedJobId}`);
            setShowInterviewModal(false);
            // Reset modal states
            setSelectedJobId('');
            setSelectedCandidateForInterview(null);
            setJobCandidates([]);
            setMatchScoreFilter(0);
            setShowJobSelection(true);
            setInterviewError(null);
        } else {
            setInterviewError("Please select a candidate and ensure a job is selected to start the interview. ⚠️");
        }
    };

    if (loading) return <p>Loading candidate details... ⏳</p>;
    if (error) return <p className="error-message">Error: {error} ❌</p>;
    if (!candidate) return <p>Candidate not found. 😔</p>;

    return (
        <div className="candidate-detail-container">
            <Link to="/candidates" className="back-link">&larr; Back to Candidates</Link>
            <h2>Candidate: {candidate.name || 'N/A'}</h2>

            <div className="detail-header">
                <div className="status-control">
                    <label htmlFor="candidate-status">Status:</label>
                    <select id="candidate-status" value={currentStatus} onChange={handleStatusChange}>
                        {candidateStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    {statusUpdateMessage && <p className="status-message">{statusUpdateMessage}</p>}
                </div>
                <div className="candidate-detail-actions">
                    <button onClick={handleStartInterviewClick} className="action-button interview-button">Start Interview 🎤</button>
                    <button onClick={handleDeleteCandidate} className="action-button delete-button">Delete Candidate 🗑️</button>
                </div>
            </div>

            <div className="detail-section">
                <h3>Contact Information</h3>
                <p><strong>Email:</strong> {candidate.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {candidate.phone || 'N/A'}</p>
            </div>

            <div className="detail-section">
                <h3>Match & Overview</h3>
                <p><strong>Match Score:</strong> {candidate.match_score}%</p>
                <p><strong>Job Title Applied For:</strong> {candidate.job_description?.title || 'N/A'}</p>
                <p><strong>Summary:</strong> {candidate.summary || 'N/A'}</p>
            </div>

            <div className="detail-section">
                <h3>Skills</h3>
                <p>{candidate.skills && candidate.skills.length > 0 ? candidate.skills.join(', ') : 'No skills identified.'}</p>
            </div>

            <div className="detail-section">
                <h3>Experience</h3>
                {candidate.experience && candidate.experience.length > 0 ? (
                    <ul>
                        {candidate.experience.map((exp, index) => (
                            <li key={index}>{exp}</li>
                        ))}
                    </ul>
                ) : <p>No experience details found.</p>}
            </div>

            <div className="detail-section">
                <h3>Education</h3>
                {candidate.education && candidate.education.length > 0 ? (
                    <ul>
                        {candidate.education.map((edu, index) => (
                            <li key={index}>{edu}</li>
                        ))}
                    </ul>
                ) : <p>No education details found.</p>}
            </div>

            {candidate.resume_filepath && (
                <div className="detail-section download-section">
                    <h3>Original Resume</h3>
                    <a
                        href={`${API_BASE_URL}/download_resume/${candidate.resume_filepath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="download-resume-link"
                    >
                        Download Original Resume ({candidate.resume_filepath.split('_').slice(1).join('_') || 'File'})
                    </a>
                    <p className="note">Note: Filename is timestamped for uniqueness on the server.</p>
                </div>
            )}

            <button onClick={() => setShowEmailSender(!showEmailSender)} className="send-email-button">
                {showEmailSender ? 'Hide Email Sender' : `Send Email to ${candidate.name || 'Candidate'}`} 📧
            </button>

            {showEmailSender && (
                <EmailSender
                    recipientEmail={candidate.email}
                    defaultSubject={`Regarding your application for ${candidate.job_description?.title || 'a role'}`}
                    defaultBody={`Dear ${candidate.name || 'Candidate Name'},`}
                />
            )}

            {/* Interview Modal */}
            {showInterviewModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        {showJobSelection ? (
                            <>
                                <h3>Select Job Description for Interview</h3>
                                <p>First, choose a job description:</p>
                                <select
                                    value={selectedJobId}
                                    onChange={handleJobSelectChange}
                                    className="job-description-select"
                                >
                                    <option value="">-- Select Job Description --</option>
                                    {jobDescriptions.map(jd => (
                                        <option key={jd.id} value={jd.id}>
                                            {jd.job_title} (ID: {jd.id})
                                        </option>
                                    ))}
                                </select>
                                <div className="modal-actions">
                                    <button onClick={() => setShowInterviewModal(false)} className="action-button cancel-button">Cancel</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3>Candidates for "{jobDescriptions.find(jd => jd.id === selectedJobId)?.job_title}"</h3>
                                <p>Filter candidates by minimum match score:</p>
                                <input
                                    type="number"
                                    value={matchScoreFilter}
                                    onChange={handleMatchScoreFilterChange}
                                    min="0"
                                    max="100"
                                    className="match-filter-input"
                                    placeholder="Min Match %"
                                />
                                {interviewError && <div className="error-message">{interviewError}</div>}
                                <div className="candidate-selection-list">
                                    {jobCandidates.length > 0 ? (
                                        jobCandidates.map(jc => (
                                            <div
                                                key={jc.id}
                                                className={`candidate-item ${selectedCandidateForInterview?.id === jc.id ? 'selected' : ''}`}
                                                onClick={() => handleCandidateForInterviewSelect(jc)}
                                            >
                                                <strong>{jc.name || 'N/A'}</strong> - Match: {jc.match_score !== null ? `${jc.match_score}%` : 'N/A'}
                                                <p>Email: {jc.email || 'N/A'}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p>No candidates found for this job description or matching the filter.</p>
                                    )}
                                </div>
                                <div className="modal-actions">
                                    <button onClick={() => setShowJobSelection(true)} className="action-button back-button">
                                        &larr; Back to Job Selection
                                    </button>
                                  
                                    <button
    onClick={handleInterviewSubmit}
    className="action-button"
>
    Start Interview with {selectedCandidateForInterview?.name || 'Selected Candidate'}
</button>
                                    <button onClick={() => setShowInterviewModal(false)} className="action-button cancel-button">Cancel</button>
                                </div>
                            </>
                        )}
                        {interviewError && <div className="error-message">{interviewError}</div>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CandidateDetail;
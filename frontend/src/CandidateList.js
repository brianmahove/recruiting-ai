// src/CandidateList.js
import React, { useState, useEffect } from 'react';
import { getCandidates, downloadResume, deleteCandidate, getJobDescriptions } from './api';
import { Link, useNavigate } from 'react-router-dom';

function CandidateList() {
    const [candidates, setCandidates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // State for interview modal
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [selectedCandidateForInterview, setSelectedCandidateForInterview] = useState(null);
    const [jobDescriptions, setJobDescriptions] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');

    const navigate = useNavigate();

    const fetchCandidates = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filterStatus) params.status = filterStatus;
            const data = await getCandidates(params);
            setCandidates(data);
        } catch (err) {
            console.error("Failed to fetch candidates:", err);
            setError(err.message || "Failed to load candidates.");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Job Descriptions for the interview modal
    const fetchJobDescriptions = async () => {
        try {
            const data = await getJobDescriptions();
            setJobDescriptions(data);
        } catch (err) {
            console.error("Failed to fetch job descriptions:", err);
            // Optionally set an error here, but don't block candidate list
        }
    };


    useEffect(() => {
        fetchCandidates();
        fetchJobDescriptions(); // Fetch job descriptions when component mounts
    }, [searchTerm, filterStatus]); // Re-fetch on search/filter changes

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this candidate? This action cannot be undone.")) {
            setIsLoading(true);
            try {
                await deleteCandidate(id);
                fetchCandidates(); // Re-fetch the list after deletion
            } catch (err) {
                console.error("Failed to delete candidate:", err);
                setError(err.message || "Failed to delete candidate.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleStartInterviewClick = (candidate) => {
        setSelectedCandidateForInterview(candidate);
        setShowInterviewModal(true);
        setSelectedJobId(''); // Reset selected job when opening modal
    };

    const handleInterviewSubmit = () => {
        if (selectedCandidateForInterview && selectedJobId) {
            navigate(`/interview/${selectedCandidateForInterview.id}/${selectedJobId}`);
            setShowInterviewModal(false);
            setSelectedCandidateForInterview(null);
            setSelectedJobId('');
        } else {
            setError("Please select a job description to start the interview.");
        }
    };

    // NEW: Handle row click to view details
    const handleRowClick = (candidateId) => {
        navigate(`/candidate/${candidateId}`);
    };

    if (isLoading) return <div className="loading-message">Loading candidates...</div>;
    if (error) return <div className="error-message">Error: {error}</div>;
    if (candidates.length === 0) return <div className="no-data-message">No candidates found. Upload a resume to get started!</div>;

    return (
        <div className="candidate-list-container">
            <h2>All Candidates</h2>

            <div className="filters-search-bar">
                <input
                    type="text"
                    placeholder="Search by name, email, skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="status-filter"
                >
                    <option value="">All Statuses</option>
                    <option value="New">New</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Interviewed">Interviewed</option>
                </select>
                <button onClick={fetchCandidates} className="refresh-button">Refresh List</button>
            </div>

            <table className="candidate-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Job Title</th>
                        <th>Match Score</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {candidates.map((candidate) => (
                        <tr key={candidate.id} onClick={() => handleRowClick(candidate.id)} style={{ cursor: 'pointer' }}>
                            <td>{candidate.id}</td>
                            <td>{candidate.name || 'N/A'}</td>
                            <td>{candidate.email || 'N/A'}</td>
                            <td>{candidate.phone || 'N/A'}</td>
                            <td>{candidate.job_title || 'N/A'}</td>
                            <td>{candidate.match_score !== null ? `${candidate.match_score}%` : 'N/A'}</td>
                            <td>{candidate.status}</td>
                            <td className="candidate-actions" onClick={(e) => e.stopPropagation()}> {/* Stop propagation to prevent row click from firing */}
                                <Link to={`/candidate/${candidate.id}`} className="action-button view-button">View</Link>
                                <button onClick={() => downloadResume(candidate.resume_filename)} className="action-button download-button">Resume</button>
                                <button onClick={() => handleStartInterviewClick(candidate)} className="action-button interview-button">Interview</button>
                                <button onClick={() => handleDelete(candidate.id)} className="action-button delete-button">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Interview Modal */}
            {showInterviewModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>Start Interview for {selectedCandidateForInterview?.name}</h3>
                        <p>Select a Job Description for this interview:</p>
                        <select
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
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
                            <button onClick={handleInterviewSubmit} disabled={!selectedJobId} className="action-button">Start Interview</button>
                            <button onClick={() => setShowInterviewModal(false)} className="action-button cancel-button">Cancel</button>
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CandidateList;
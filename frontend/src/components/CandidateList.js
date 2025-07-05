import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // Ensure Link is imported if used
import { fetchCandidates, fetchJobDescriptions } from '../api';
import './CandidateList.css'; // Ensure you have a CSS file for this component

function CandidateList() {
    const [candidates, setCandidates] = useState([]);
    const [jobDescriptions, setJobDescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [selectedJobId, setSelectedJobId] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [minMatchScore, setMinMatchScore] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        const loadData = async () => {
            try {
                const jds = await fetchJobDescriptions();
                setJobDescriptions(jds);
                setLoading(false);
            } catch (err) {
                setError("Failed to load job descriptions.");
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const loadCandidates = async () => {
            setLoading(true);
            setError(null);
            try {
                const filters = {
                    job_description_id: selectedJobId,
                    status: selectedStatus,
                    min_score: minMatchScore,
                    search_term: searchTerm,
                    sort_by: sortBy,
                    sort_order: sortOrder,
                };
                const data = await fetchCandidates(filters);
                setCandidates(data);
                setLoading(false);
            } catch (err) {
                setError("Failed to load candidates.");
                setLoading(false);
            }
        };
        loadCandidates();
    }, [selectedJobId, selectedStatus, minMatchScore, searchTerm, sortBy, sortOrder]); // Re-fetch on filter change

    if (loading) return <div className="loading-message">Loading candidates...</div>;
    if (error) return <div className="error-message">{error}</div>;

    const allStatuses = ["New Candidate", "Under Review", "Interview Scheduled", "Offered", "Hired", "Rejected"];

    return (
        <div className="candidate-list-container">
            <h2>Candidates</h2>

            <div className="filters-section">
                <div className="filter-group">
                    <label htmlFor="job-filter">Filter by Job:</label>
                    <select
                        id="job-filter"
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                    >
                        <option value="">All Job Descriptions</option>
                        {jobDescriptions.map((jd) => (
                            <option key={jd.id} value={jd.id}>{jd.title}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="status-filter">Filter by Status:</label>
                    <select
                        id="status-filter"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {allStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="min-score-filter">Min Match Score:</label>
                    <input
                        id="min-score-filter"
                        type="number"
                        min="0"
                        max="100"
                        value={minMatchScore}
                        onChange={(e) => setMinMatchScore(e.target.value)}
                        placeholder="e.g., 75"
                    />
                </div>

                <div className="filter-group">
                    <label htmlFor="search-term-filter">Search:</label>
                    <input
                        id="search-term-filter"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Name, Email, Skills..."
                    />
                </div>

                <div className="filter-group">
                    <label htmlFor="sort-by">Sort By:</label>
                    <select
                        id="sort-by"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="created_at">Date Added</option>
                        <option value="match_score">Match Score</option>
                        <option value="name">Name</option>
                        <option value="status">Status</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="sort-order">Order:</label>
                    <select
                        id="sort-order"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                </div>
            </div>

            {candidates.length === 0 ? (
                <p>No candidates found matching your criteria.</p>
            ) : (
                <div className="candidate-grid">
                    {candidates.map((candidate) => (
                        <div key={candidate.id} className="candidate-card">
                            <h3><Link to={`/candidates/${candidate.id}`}>{candidate.name}</Link></h3>
                            <p><strong>Job:</strong> {jobDescriptions.find(jd => jd.id === candidate.jobDescriptionId)?.title || 'N/A'}</p>
                            <p><strong>Match Score:</strong> {candidate.matchScore}%</p>
                            <p><strong>Status:</strong> <span className={`status-badge status-${candidate.status.toLowerCase().replace(/\s/g, '-')}`}>{candidate.status}</span></p>
                            <p><strong>Email:</strong> {candidate.email}</p>
                            <p><strong>Skills:</strong> {candidate.skills.join(', ')}</p>
                            <Link to={`/candidates/${candidate.id}`} className="view-details-btn">View Details</Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default CandidateList;
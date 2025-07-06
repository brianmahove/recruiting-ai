import React, { useEffect, useState } from 'react';
import { getCandidates, getJobDescriptions } from './api'; // Import getJobDescriptions
import { Link } from 'react-router-dom';

function CandidateList() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobDescriptions, setJobDescriptions] = useState([]); // State for JDs
  const [filters, setFilters] = useState({
    job_description_id: '',
    status: '',
    min_score: '',
    search_term: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  const candidateStatuses = ['New Candidate', 'Reviewed', 'Interviewing', 'Rejected', 'Hired'];

  const fetchAllCandidates = async (currentFilters) => {
    try {
      setLoading(true);
      const data = await getCandidates(currentFilters);
      setCandidates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchAllCandidates(filters);
      try {
        const jds = await getJobDescriptions();
        setJobDescriptions(jds);
      } catch (err) {
        console.error("Failed to fetch job descriptions:", err);
        // Don't block candidate list if JDs fail
      }
    };
    loadData();
  }, [filters]); // Re-fetch when filters change

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  if (loading && candidates.length === 0) return <p>Loading candidates...</p>; // Only show loading initially
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <div className="candidate-list-container">
      <h2>All Candidates</h2>

      <div className="filter-sort-section">
        <h3>Filter & Sort</h3>
        <div className="filter-group">
          <label htmlFor="job-description-filter">Job Description:</label>
          <select id="job-description-filter" name="job_description_id" value={filters.job_description_id} onChange={handleFilterChange}>
            <option value="">All Job Descriptions</option>
            {jobDescriptions.map(jd => (
              <option key={jd.id} value={jd.id}>{jd.title}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select id="status-filter" name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Statuses</option>
            {candidateStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="min-score-filter">Min Match Score (%):</label>
          <input
            type="number"
            id="min-score-filter"
            name="min_score"
            value={filters.min_score}
            onChange={handleFilterChange}
            min="0"
            max="100"
            placeholder="e.g., 70"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="search-term-filter">Search (Name/Email):</label>
          <input
            type="text"
            id="search-term-filter"
            name="search_term"
            value={filters.search_term}
            onChange={handleFilterChange}
            placeholder="e.g., John Doe"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="sort-by-filter">Sort By:</label>
          <select id="sort-by-filter" name="sort_by" value={filters.sort_by} onChange={handleFilterChange}>
            <option value="created_at">Date Added</option>
            <option value="match_score">Match Score</option>
            <option value="name">Name</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-order-filter">Order:</label>
          <select id="sort-order-filter" name="sort_order" value={filters.sort_order} onChange={handleFilterChange}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {loading && candidates.length > 0 && <p>Refreshing candidates...</p>} {/* Show refreshing when filters apply */}

      {candidates.length === 0 && !loading ? (
        <p>No candidates found matching your criteria. Try adjusting filters or upload a resume using the "Resume Screener" tab!</p>
      ) : (
        <ul className="candidate-list">
          {candidates.map((candidate) => (
            <li key={candidate.id} className="candidate-item">
              <Link to={`/candidate/${candidate.id}`}>
                <h3>{candidate.name || 'N/A'}</h3>
                <p>Email: {candidate.email || 'N/A'}</p>
                <p>Status: <strong>{candidate.status}</strong></p> {/* Display status */}
                <p>Match Score: {candidate.match_score || 'N/A'}%</p>
                <p>Job Title: {candidate.job_description?.title || 'N/A'}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CandidateList;
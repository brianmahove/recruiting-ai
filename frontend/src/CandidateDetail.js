import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { getCandidateDetail, updateCandidateStatus, deleteCandidate } from './api';
import EmailSender from './EmailSender';

function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate(); // Hook for navigation
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(''); // State for status dropdown
  const [statusUpdateMessage, setStatusUpdateMessage] = useState('');

  const candidateStatuses = ['New Candidate', 'Reviewed', 'Interviewing', 'Rejected', 'Hired'];
  const API_BASE_URL = 'http://127.00.1:5000'; // Define API Base URL

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const data = await getCandidateDetail(id);
        setCandidate(data);
        setCurrentStatus(data.status); // Initialize status dropdown
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidate();
  }, [id]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setCurrentStatus(newStatus);
    setStatusUpdateMessage('');
    try {
      await updateCandidateStatus(id, newStatus);
      setStatusUpdateMessage('Status updated successfully!');
      // Refresh candidate data to ensure consistency (optional, but good practice)
      const updatedData = await getCandidateDetail(id);
      setCandidate(updatedData);
    } catch (err) {
      setStatusUpdateMessage(`Error updating status: ${err.message}`);
      setCurrentStatus(candidate.status); // Revert on error
    } finally {
      setTimeout(() => setStatusUpdateMessage(''), 3000); // Clear message after 3 seconds
    }
  };

  const handleDeleteCandidate = async () => {
    if (window.confirm("Are you sure you want to delete this candidate and their associated resume? This action cannot be undone.")) {
      try {
        await deleteCandidate(id);
        alert("Candidate deleted successfully!");
        navigate('/candidates'); // Redirect to candidates list
      } catch (err) {
        alert(`Failed to delete candidate: ${err.message}`);
      }
    }
  };


  if (loading) return <p>Loading candidate details...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;
  if (!candidate) return <p>Candidate not found.</p>;

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
        <button onClick={handleDeleteCandidate} className="delete-button">Delete Candidate</button>
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
        {showEmailSender ? 'Hide Email Sender' : `Send Email to ${candidate.name || 'Candidate'}`}
      </button>

      {showEmailSender && (
        <EmailSender
          recipientEmail={candidate.email}
          defaultSubject={`Regarding your application for ${candidate.job_description?.title || 'a role'}`}
          defaultBody={`Dear ${candidate.name || 'Candidate Name'},`}
        />
      )}
    </div>
  );
}

export default CandidateDetail;
import React, { useEffect, useState } from 'react';
import { getJobDescriptions, deleteJobDescription } from './api';
import { Link } from 'react-router-dom';

function JobDescriptionList() {
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState('');

  const fetchJobDescriptions = async () => {
    try {
      setLoading(true);
      const data = await getJobDescriptions();
      setJobDescriptions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDescriptions();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this Job Description? If candidates are linked to it, deletion will fail.")) {
      setDeleteMessage('');
      try {
        await deleteJobDescription(id);
        setDeleteMessage('Job Description deleted successfully!');
        fetchJobDescriptions(); // Refresh the list
      } catch (err) {
        setDeleteMessage(`Error: ${err.message}`);
      } finally {
        setTimeout(() => setDeleteMessage(''), 5000); // Clear message
      }
    }
  };

  if (loading) return <p>Loading Job Descriptions...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <div className="job-description-list-container">
      <h2>All Saved Job Descriptions</h2>
      {deleteMessage && <p className="status-message">{deleteMessage}</p>}
      {jobDescriptions.length === 0 ? (
        <p>No Job Descriptions found. Upload a resume with a JD using the "Resume Screener" tab to save one!</p>
      ) : (
        <ul className="job-description-list">
          {jobDescriptions.map((jd) => (
            <li key={jd.id} className="jd-item">
              <h3>{jd.title}</h3>
              <p>ID: {jd.id}</p>
              <p>Skills Identified: {jd.skills_identified && jd.skills_identified.length > 0 ? jd.skills_identified.join(', ') : 'None'}</p>
              <p className="jd-text-preview">{jd.text.substring(0, 200)}...</p> {/* Short preview */}
              <div className="jd-actions">
                {/* Potentially add a "View Full JD" link if you create a JD detail page */}
                <button onClick={() => handleDelete(jd.id)} className="delete-button-small">Delete JD</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default JobDescriptionList;
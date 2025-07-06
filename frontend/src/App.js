import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { uploadResume } from './api';
import CandidateList from './CandidateList';
import CandidateDetail from './CandidateDetail';
import JobDescriptionList from './JobDescriptionList'; // NEW import
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0); // For resetting file input

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleJobDescriptionChange = (event) => {
    setJobDescription(event.target.value);
  };

  const handleJobTitleChange = (event) => {
    setJobTitle(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile || !jobDescription || !jobTitle) { // Job Title is now required
      setError("Please upload a resume, provide a job title, and a job description.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('resume', selectedFile);
    formData.append('job_description', jobDescription);
    formData.append('job_title', jobTitle);

    try {
      const data = await uploadResume(formData);
      setResult(data);
      setSelectedFile(null);
      setJobDescription('');
      setJobTitle('');
      setFileInputKey(prevKey => prevKey + 1); // Reset file input
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>AI Recruiting Platform</h1>
          <nav>
            <Link to="/" className="nav-link">Resume Screener</Link>
            <Link to="/candidates" className="nav-link">View Candidates</Link>
            <Link to="/job-descriptions" className="nav-link">Job Descriptions</Link> {/* NEW NAV LINK */}
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={
              <>
                <form onSubmit={handleSubmit} className="upload-form">
                  <h2>Resume Screener</h2>
                  <div className="form-group">
                    <label htmlFor="resume-upload">Upload Resume (PDF/DOCX):</label>
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                      required
                      key={fileInputKey}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="job-title">Job Title (for record):</label>
                    <input
                      type="text"
                      id="job-title"
                      value={jobTitle}
                      onChange={handleJobTitleChange}
                      placeholder="e.g., Software Engineer"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="job-description">Job Description:</label>
                    <textarea
                      id="job-description"
                      rows="10"
                      value={jobDescription}
                      onChange={handleJobDescriptionChange}
                      placeholder="Paste the full job description here..."
                      required
                    ></textarea>
                  </div>
                  <button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Analyze & Save Candidate'}
                  </button>
                </form>

                {error && <div className="error-message">{error}</div>}

                {result && (
                  <div className="results-container">
                    <h2>Analysis Results</h2>
                    <div className="score-card">
                      <h3>Match Score: {result.match_score}%</h3>
                      <p>
                        <strong>Matched Skills:</strong> {result.matched_skills.length > 0 ? result.matched_skills.join(', ') : 'None'}
                      </p>
                    </div>
                    
                    <div className="parsed-resume-details">
                      <h3>Parsed Resume Details:</h3>
                      <p><strong>Name:</strong> {result.parsed_resume.name || 'N/A'}</p>
                      <p><strong>Email:</strong> {result.parsed_resume.email || 'N/A'}</p>
                      <p><strong>Phone:</strong> {result.parsed_resume.phone || 'N/A'}</p>
                      {result.parsed_resume.experience && result.parsed_resume.experience.length > 0 && (
                        <><h4>Experience:</h4><ul>{result.parsed_resume.experience.map((exp, idx) => <li key={idx}>{exp}</li>)}</ul></>
                      )}
                      {result.parsed_resume.education && result.parsed_resume.education.length > 0 && (
                        <><h4>Education:</h4><ul>{result.parsed_resume.education.map((edu, idx) => <li key={idx}>{edu}</li>)}</ul></>
                      )}
                      <p><strong>Skills Found:</strong> {result.parsed_resume.skills.length > 0 ? result.parsed_resume.skills.join(', ') : 'None'}</p>
                      <p><strong>Job Description Skills Identified:</strong> {result.job_description_skills_identified.length > 0 ? result.job_description_skills_identified.join(', ') : 'None'}</p>
                      <h4>Resume Summary:</h4>
                      <p className="resume-summary-text">{result.parsed_resume.summary || 'N/A'}</p>
                      <p>Candidate saved with ID: <strong>{result.candidate_id}</strong> (Job ID: <strong>{result.job_description_id}</strong>)</p>
                      <Link to={`/candidate/${result.candidate_id}`} className="view-candidate-link">View Full Candidate Profile</Link>
                    </div>
                  </div>
                )}
              </>
            } />
            <Route path="/candidates" element={<CandidateList />} />
            <Route path="/candidate/:id" element={<CandidateDetail />} />
            <Route path="/job-descriptions" element={<JobDescriptionList />} /> {/* NEW ROUTE */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
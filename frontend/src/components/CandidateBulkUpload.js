import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadResumesBulk, fetchJobDescriptions } from '../api';
import './CandidateBulkUpload.css'; // Create this CSS file

import { Link } from 'react-router-dom';

function CandidateBulkUpload() {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [jobDescriptionId, setJobDescriptionId] = useState('');
    const [jobDescriptions, setJobDescriptions] = useState([]);
    const [source, setSource] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getJobDescriptions = async () => {
            try {
                const data = await fetchJobDescriptions();
                setJobDescriptions(data);
            } catch (err) {
                console.error("Failed to fetch job descriptions:", err);
                setError("Failed to load job descriptions. Please try again.");
            }
        };
        getJobDescriptions();
    }, []);

    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files));
        setUploadResult(null);
        setError(null);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploading(true);
        setUploadResult(null);
        setError(null);

        if (selectedFiles.length === 0) {
            setError("Please select at least one resume file.");
            setUploading(false);
            return;
        }

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('resumes', file);
        });
        if (jobDescriptionId) {
            formData.append('jobDescriptionId', jobDescriptionId);
        }
        if (source) {
            formData.append('source', source);
        }

        try {
            const result = await uploadResumesBulk(formData);
            setUploadResult(result);
            setSelectedFiles([]); // Clear selected files
            setJobDescriptionId('');
            setSource('');
        } catch (err) {
            setError(err.message || "An error occurred during upload.");
            setUploadResult(null);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bulk-upload-container">
            <h2>Bulk Resume Upload</h2>
            <p className="upload-intro">Upload multiple resumes at once. Our AI will automatically parse candidate data.</p>

            <form onSubmit={handleUpload} className="upload-form">
                <div className="form-group">
                    <label htmlFor="resume-files">Select Resume Files (PDF, DOCX):</label>
                    <input
                        type="file"
                        id="resume-files"
                        accept=".pdf,.docx"
                        multiple
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    {selectedFiles.length > 0 && (
                        <p className="selected-files-count">{selectedFiles.length} file(s) selected.</p>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="job-description">Link to Job Description (Optional):</label>
                    <select
                        id="job-description"
                        value={jobDescriptionId}
                        onChange={(e) => setJobDescriptionId(e.target.value)}
                        disabled={uploading}
                    >
                        <option value="">-- Select Job Description --</option>
                        {jobDescriptions.map(jd => (
                            <option key={jd.id} value={jd.id}>{jd.title}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="source">Candidate Source (Optional):</label>
                    <input
                        type="text"
                        id="source"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="e.g., LinkedIn, Referral, Website"
                        disabled={uploading}
                    />
                </div>

                <button type="submit" className="upload-btn" disabled={uploading || selectedFiles.length === 0}>
                    {uploading ? 'Uploading...' : 'Upload Resumes'}
                </button>
            </form>

            {error && <div className="error-message">{error}</div>}

            {uploadResult && (
                <div className="upload-results">
                    <h3>Upload Summary:</h3>
                    <p className="success-message">{uploadResult.message}</p>
                    {uploadResult.processed && uploadResult.processed.length > 0 && (
                        <div className="processed-candidates">
                            <h4>Processed Candidates:</h4>
                            <ul>
                                {uploadResult.processed.map(cand => (
                                    <li key={cand.id}>
                                        <Link to={`/candidates/${cand.id}`}>{cand.name} ({cand.email})</Link> - Status: {cand.status}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                        <div className="upload-errors">
                            <h4>Errors:</h4>
                            <ul>
                                {uploadResult.errors.map((err, index) => (
                                    <li key={index} className="error-item">{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            <Link to="/dashboard">Go to Dashboard</Link>
        </div>
    );
}

export default CandidateBulkUpload;
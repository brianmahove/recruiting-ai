// src/components/CandidateUpload.js
import React, { useState } from 'react';
import './CandidateUpload.css'; // Assuming you'll create a CSS file for styling

const CandidateUpload = ({ interviewId }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [error, setError] = useState('');

    // Handle file selection from the input
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Basic validation for file type (e.g., PDF, DOCX)
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (allowedTypes.includes(file.type)) {
                setSelectedFile(file);
                setUploadStatus('');
                setError('');
            } else {
                setSelectedFile(null);
                setUploadStatus('');
                setError('Invalid file type. Please upload a PDF or DOCX.');
            }
        }
    };

    // Handle the file upload process
    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file to upload.');
            return;
        }

        if (!interviewId) {
            setError('Interview ID is missing. Cannot upload file.');
            return;
        }

        setUploadStatus('Uploading...');
        setError('');

        const formData = new FormData();
        formData.append('resume', selectedFile); // 'resume' is the field name your backend expects
        formData.append('interviewId', interviewId); // Pass interviewId with the form data

        try {
            // Replace with your actual backend upload endpoint
            const response = await fetch(`http://127.0.0.1:5000/api/upload-resume/${interviewId}`, {
                method: 'POST',
                body: formData, // No 'Content-Type' header needed for FormData; browser sets it
            });

            if (response.ok) {
                const result = await response.json();
                setUploadStatus('Upload successful! 🎉');
                console.log('Upload success:', result);
                // Optionally, clear the selected file after successful upload
                setSelectedFile(null);
                // Trigger any parent component logic if needed (e.g., refresh candidate data)
            } else {
                const errorData = await response.json();
                setUploadStatus('Upload failed. ❌');
                setError(`Error: ${errorData.message || response.statusText}`);
                console.error('Upload error:', errorData);
            }
        } catch (err) {
            setUploadStatus('Upload failed. ❌');
            setError(`Network error: ${err.message}`);
            console.error('Network or fetch error:', err);
        }
    };

    return (
        <div className="candidate-upload-container">
            <h2>Upload Your Resume</h2>
            <p>Please upload your resume in PDF or DOCX format.</p>
            <input
                type="file"
                id="resumeUpload"
                accept=".pdf,.doc,.docx" // Specify accepted file types
                onChange={handleFileChange}
            />
            {selectedFile && (
                <p>Selected file: <strong>{selectedFile.name}</strong></p>
            )}
            <button
                onClick={handleUpload}
                disabled={!selectedFile || uploadStatus === 'Uploading...'}
            >
                {uploadStatus === 'Uploading...' ? 'Uploading...' : 'Upload Resume'}
            </button>

            {uploadStatus && <p className={`upload-status ${uploadStatus.includes('successful') ? 'success' : 'failure'}`}>{uploadStatus}</p>}
            {error && <p className="upload-error">{error}</p>}
        </div>
    );
};

export default CandidateUpload;
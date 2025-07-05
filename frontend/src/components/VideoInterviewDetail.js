import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchVideoInterviewDetails, fetchCandidateById, fetchJobDescriptionById } from '../api';
import './VideoInterviewDetail.css'; // Create this CSS file

function VideoInterviewDetail() {
    const { interviewId } = useParams();
    const [videoInterview, setVideoInterview] = useState(null);
    const [candidate, setCandidate] = useState(null);
    const [jobDescription, setJobDescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getInterviewDetails = async () => {
            setLoading(true);
            try {
                const fetchedVideo = await fetchVideoInterviewDetails(interviewId);
                setVideoInterview(fetchedVideo);

                const fetchedCandidate = await fetchCandidateById(fetchedVideo.candidateId);
                setCandidate(fetchedCandidate);

                if (fetchedVideo.jobDescriptionId) {
                    const fetchedJob = await fetchJobDescriptionById(fetchedVideo.jobDescriptionId);
                    setJobDescription(fetchedJob);
                }

                setLoading(false);
            } catch (err) {
                setError("Failed to load video interview details.");
                setLoading(false);
                console.error(err);
            }
        };
        getInterviewDetails();
    }, [interviewId]);

    if (loading) return <div className="loading-message">Loading video interview details...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!videoInterview) return <div className="no-data-message">Video interview not found.</div>;

    const aiFeedback = videoInterview.aiFeedbackRaw ? JSON.parse(videoInterview.aiFeedbackRaw) : {};
    const keywords = aiFeedback.keywords && Array.isArray(aiFeedback.keywords) ? aiFeedback.keywords.join(', ') : videoInterview.keywordsDetected;

    return (
        <div className="video-interview-detail-container">
            <h2>Video Interview Details</h2>
            <div className="video-player-section">
                <h3>Recorded Interview</h3>
                {videoInterview.videoUrl && (
                    <video controls src={videoInterview.videoUrl} className="recorded-video"></video>
                )}
                {!videoInterview.videoUrl && (
                    <p className="error-message">Video URL not available.</p>
                )}
            </div>

            <div className="interview-metadata">
                <h3>Interview Metadata</h3>
                <p><strong>Candidate:</strong> {candidate ? candidate.name : 'N/A'}</p>
                <p><strong>Job Description:</strong> {jobDescription ? jobDescription.title : 'N/A'}</p>
                <p><strong>Interview Type:</strong> {videoInterview.interviewType}</p>
                <p><strong>Date:</strong> {new Date(videoInterview.interviewDate).toLocaleString()}</p>
                <p><strong>Duration:</strong> {videoInterview.durationSeconds ? `${videoInterview.durationSeconds} seconds` : 'N/A'}</p>
            </div>

            <div className="ai-analysis-section">
                <h3>AI Analysis Results</h3>
                <div className="analysis-card sentiment">
                    <h4>Sentiment Analysis</h4>
                    <p><strong>Score:</strong> {videoInterview.sentimentScore !== null ? videoInterview.sentimentScore.toFixed(2) : 'N/A'}</p>
                    <p className="analysis-feedback">
                        {videoInterview.sentimentScore !== null ? (
                            videoInterview.sentimentScore > 0.2 ? 'Overall positive sentiment detected.' :
                            videoInterview.sentimentScore < -0.2 ? 'Overall negative sentiment detected.' :
                            'Neutral sentiment detected.'
                        ) : 'No sentiment data.'}
                    </p>
                </div>
                <div className="analysis-card behavior">
                    <h4>Behavioral Insights</h4>
                    <p>{videoInterview.behaviorAnalysisSummary || 'No specific behavioral analysis summary available.'}</p>
                </div>
                <div className="analysis-card keywords">
                    <h4>Keywords Detected</h4>
                    <p>{keywords || 'No keywords detected.'}</p>
                </div>
                {aiFeedback && Object.keys(aiFeedback).length > 0 && (
                    <div className="analysis-card raw-feedback">
                        <h4>Raw AI Feedback</h4>
                        <pre>{JSON.stringify(aiFeedback, null, 2)}</pre>
                    </div>
                )}
                {!aiFeedback && !videoInterview.behaviorAnalysisSummary && !videoInterview.sentimentScore && (
                    <p className="no-data-message">No AI analysis results available for this interview.</p>
                )}
            </div>
        </div>
    );
}

export default VideoInterviewDetail;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchCandidateAssessmentResult, fetchCandidateById, fetchAssessmentById } from '../api';
import './CandidateAssessmentResultView.css'; // Create this CSS file

function CandidateAssessmentResultView() {
    const { resultId } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState(null);
    const [candidate, setCandidate] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadResult = async () => {
            setLoading(true);
            try {
                const fetchedResult = await fetchCandidateAssessmentResult(resultId);
                setResult(fetchedResult);

                const fetchedCandidate = await fetchCandidateById(fetchedResult.candidateId);
                setCandidate(fetchedCandidate);

                const fetchedAssessment = await fetchAssessmentById(fetchedResult.assessmentId);
                setAssessment(fetchedAssessment);

                setLoading(false);
            } catch (err) {
                setError("Failed to load assessment result.");
                setLoading(false);
                console.error(err);
            }
        };
        loadResult();
    }, [resultId]);

    if (loading) return <div className="loading-message">Loading assessment results...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!result || !candidate || !assessment) return <div className="no-data-message">Assessment result not found.</div>;

    const totalPossiblePoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);

    return (
        <div className="assessment-result-view-container">
            <button onClick={() => navigate(`/candidates/${candidate.id}`)} className="back-button">← Back to Candidate</button>
            <h2>Assessment Results for {candidate.name}</h2>
            <h3>Assessment: {assessment.title} ({assessment.assessmentType})</h3>

            <div className="result-summary">
                <p><strong>Status:</strong> <span className={`result-status-badge status-${result.status.toLowerCase()}`}>{result.status}</span></p>
                <p><strong>Total Score:</strong> <span className="score-highlight">{result.totalScore}</span> / {totalPossiblePoints} points</p>
                {totalPossiblePoints > 0 && (
                    <p><strong>Percentage:</strong> <span className="score-highlight">{(result.totalScore / totalPossiblePoints * 100).toFixed(2)}%</span></p>
                )}
                <p><strong>Started:</strong> {new Date(result.startTime).toLocaleString()}</p>
                <p><strong>Completed:</strong> {result.completedAt ? new Date(result.completedAt).toLocaleString() : 'N/A'}</p>
                {result.endTime && result.startTime && (
                    <p><strong>Time Taken:</strong> {Math.round((new Date(result.endTime) - new Date(result.startTime)) / 1000 / 60)} minutes</p>
                )}
            </div>

            <hr/>

            <h3>Question-by-Question Breakdown</h3>
            <ul className="question-results-list">
                {result.responses.map((response) => (
                    <li key={response.id} className="question-result-item">
                        <div className="question-header">
                            <h4>Q: {response.questionDetails.questionText}</h4>
                            <span className="question-score">{response.score} / {response.questionDetails.points} points</span>
                        </div>
                        <p><strong>Your Answer:</strong> <span className="user-response-text">{response.responseText || "No response"}</span></p>
                        {response.questionDetails.questionType !== 'CodeSnippet' && (
                            <p><strong>Correct Answer:</strong> {response.questionDetails.correctAnswer || 'N/A'}</p>
                        )}
                        <p><strong>AI Feedback:</strong> <span className="ai-feedback-text">{response.aiFeedback || 'No automated feedback.'}</span></p>
                        <p><strong>Type:</strong> {response.questionDetails.questionType}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default CandidateAssessmentResultView;
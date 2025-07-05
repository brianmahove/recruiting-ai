import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchATSCandidates, fetchPipelineStages } from '../api'; // NEW: fetchPipelineStages
import './ATSDashboard.css';

function ATSDashboard() {
    const [candidates, setCandidates] = useState([]);
    const [pipelineStages, setPipelineStages] = useState([]); // NEW: for custom stages
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getATSCandidatesAndStages = async () => {
            setLoading(true);
            try {
                const [candidatesData, stagesData] = await Promise.all([
                    fetchATSCandidates(),
                    fetchPipelineStages()
                ]);
                setCandidates(candidatesData);
                setPipelineStages(stagesData.sort((a, b) => a.order - b.order)); // Sort by order
                setLoading(false);
            } catch (err) {
                setError("Failed to load ATS data.");
                setLoading(false);
                console.error(err);
            }
        };
        getATSCandidatesAndStages();
    }, []);

    if (loading) return <div className="loading-message">Loading ATS dashboard...</div>;
    if (error) return <div className="error-message">{error}</div>;

    // Group candidates by their current pipeline stage
    const candidatesByStage = pipelineStages.reduce((acc, stage) => {
        acc[stage.name] = candidates.filter(c => c.status === stage.name);
        return acc;
    }, {});

    return (
        <div className="ats-dashboard-container">
            <h2>Applicant Tracking System (ATS)</h2>
            <p className="dashboard-intro">Manage your candidate pipeline from application to hire. Click on a candidate for detailed view and actions.</p>

            <div className="ats-actions-header">
                <Link to="/candidates/bulk-upload" className="ats-action-btn">Bulk Upload Resumes</Link>
                <Link to="/pipeline-stages" className="ats-action-btn">Manage Pipeline Stages</Link>
            </div>

            {candidates.length === 0 ? (
                <p className="no-data-message">No candidates in the ATS yet. Start by <Link to="/candidates/bulk-upload">uploading resumes</Link>.</p>
            ) : (
                <div className="pipeline-board">
                    {pipelineStages.map(stage => (
                        <div key={stage.id} className="pipeline-column">
                            <div className="column-header">
                                <h3>{stage.name} ({candidatesByStage[stage.name] ? candidatesByStage[stage.name].length : 0})</h3>
                            </div>
                            <div className="column-body">
                                {candidatesByStage[stage.name] && candidatesByStage[stage.name].length > 0 ? (
                                    candidatesByStage[stage.name].map(candidate => (
                                        <div key={candidate.id} className="ats-candidate-card" onClick={() => navigate(`/candidates/${candidate.id}`)}>
                                            <h4>{candidate.name}</h4>
                                            <p><strong>Job:</strong> {candidate.jobTitle}</p>
                                            <p><strong>Score:</strong> {candidate.matchScore}%</p>
                                            {candidate.rating > 0 && <p><strong>Rating:</strong> {candidate.rating}/5 &#9733;</p>}
                                            {candidate.assignedToUsername && <p><strong>Assigned:</strong> {candidate.assignedToUsername}</p>}
                                            {candidate.latestInterviewTime && <p><strong>Last Interview:</strong> {new Date(candidate.latestInterviewTime).toLocaleDateString()}</p>}
                                            {candidate.latestAssessmentScore !== null && <p><strong>Last Assessment:</strong> {candidate.latestAssessmentScore}%</p>}
                                            <div className="card-actions">
                                                <button onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${candidate.id}`); }} className="view-details-btn">View Details</button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-candidates-in-stage">No candidates in this stage.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ATSDashboard;
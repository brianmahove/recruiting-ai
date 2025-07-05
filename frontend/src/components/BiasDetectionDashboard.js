import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchScreeningDisparity, fetchAssessmentScoreDisparity } from '../api';
import './BiasDetectionDashboard.css'; // Create this CSS file

function BiasDetectionDashboard() {
    const [screeningDisparity, setScreeningDisparity] = useState(null);
    const [assessmentScoreDisparity, setAssessmentScoreDisparity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadBiasData = async () => {
            setLoading(true);
            try {
                const screening = await fetchScreeningDisparity();
                setScreeningDisparity(screening);

                const assessment = await fetchAssessmentScoreDisparity();
                setAssessmentScoreDisparity(assessment);

                setLoading(false);
            } catch (err) {
                setError("Failed to load bias detection data.");
                setLoading(false);
                console.error(err);
            }
        };
        loadBiasData();
    }, []);

    if (loading) return <div className="loading-message">Loading bias detection dashboard...</div>;
    if (error) return <div className="error-message">{error}</div>;

    // Prepare data for charts
    const genderRejectionChartData = screeningDisparity && Object.entries(screeningDisparity.genderDisparity).map(([gender, data]) => ({
        name: gender,
        'Rejection Rate (%)': parseFloat(data.rejection_rate.toFixed(2))
    }));

    const ethnicityRejectionChartData = screeningDisparity && Object.entries(screeningDisparity.ethnicityDisparity).map(([ethnicity, data]) => ({
        name: ethnicity,
        'Rejection Rate (%)': parseFloat(data.rejection_rate.toFixed(2))
    }));

    const genderScoreChartData = assessmentScoreDisparity && Object.entries(assessmentScoreDisparity.genderAverageScores).map(([gender, score]) => ({
        name: gender,
        'Average Score': parseFloat(score.toFixed(2))
    }));

    const ethnicityScoreChartData = assessmentScoreDisparity && Object.entries(assessmentScoreDisparity.ethnicityAverageScores).map(([ethnicity, score]) => ({
        name: ethnicity,
        'Average Score': parseFloat(score.toFixed(2))
    }));

    return (
        <div className="bias-detection-dashboard-container">
            <h2>Bias Detection & Fair Hiring Insights</h2>
            <p className="dashboard-intro">Monitor potential biases in your hiring process across different demographic groups.</p>

            <div className="bias-metrics-grid">
                {screeningDisparity && (
                    <>
                        <div className="bias-card screening-disparity">
                            <h3>Screening Rejection Disparity (Gender)</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={genderRejectionChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                                    <YAxis label={{ value: 'Rejection Rate (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Rejection Rate (%)" fill="#FF6347" />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="disparity-summary">
                                <h4>Summary:</h4>
                                {Object.entries(screeningDisparity.genderDisparity).map(([gender, data]) => (
                                    <p key={gender}><strong>{gender}:</strong> {data.rejected} of {data.total} rejected ({data.rejection_rate.toFixed(2)}%)</p>
                                ))}
                            </div>
                        </div>

                        <div className="bias-card screening-disparity">
                            <h3>Screening Rejection Disparity (Ethnicity)</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={ethnicityRejectionChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                                    <YAxis label={{ value: 'Rejection Rate (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]}/>
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Rejection Rate (%)" fill="#FFA07A" />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="disparity-summary">
                                <h4>Summary:</h4>
                                {Object.entries(screeningDisparity.ethnicityDisparity).map(([ethnicity, data]) => (
                                    <p key={ethnicity}><strong>{ethnicity}:</strong> {data.rejected} of {data.total} rejected ({data.rejection_rate.toFixed(2)}%)</p>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {assessmentScoreDisparity && (
                    <>
                        <div className="bias-card assessment-score-disparity">
                            <h3>Assessment Score Disparity (Gender)</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={genderScoreChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                                    <YAxis label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Average Score" fill="#6A5ACD" />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="disparity-summary">
                                <h4>Average Scores:</h4>
                                {Object.entries(assessmentScoreDisparity.genderAverageScores).map(([gender, score]) => (
                                    <p key={gender}><strong>{gender}:</strong> {score.toFixed(2)}</p>
                                ))}
                            </div>
                        </div>

                        <div className="bias-card assessment-score-disparity">
                            <h3>Assessment Score Disparity (Ethnicity)</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={ethnicityScoreChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                                    <YAxis label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Average Score" fill="#4682B4" />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="disparity-summary">
                                <h4>Average Scores:</h4>
                                {Object.entries(assessmentScoreDisparity.ethnicityAverageScores).map(([ethnicity, score]) => (
                                    <p key={ethnicity}><strong>{ethnicity}:</strong> {score.toFixed(2)}</p>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="bias-mitigation-note">
                <h4>Understanding and Mitigating Bias:</h4>
                <p>These metrics highlight potential disparities. Further investigation is needed to determine if these are due to inherent bias in the system, data, or other factors. Regular review of your hiring criteria, AI models, and human decision-making processes is crucial for ensuring fair hiring practices.</p>
                <ul>
                    <li>Review job descriptions for biased language.</li>
                    <li>Standardize interview questions and scoring.</li>
                    <li>Diversify candidate sourcing.</li>
                    <li>Regularly audit AI model performance for fairness.</li>
                </ul>
            </div>
        </div>
    );
}

export default BiasDetectionDashboard;
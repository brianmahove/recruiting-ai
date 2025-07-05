import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchHiringFunnelMetrics, fetchDiversityTracking, fetchTimeToHire, fetchSourceEffectiveness } from '../api';
import './AnalyticsDashboard.css'; // Create this CSS file

function AnalyticsDashboard() {
    const [funnelData, setFunnelData] = useState({});
    const [diversityData, setDiversityData] = useState({});
    const [timeToHireData, setTimeToHireData] = useState({});
    const [sourceData, setSourceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadAnalytics = async () => {
            setLoading(true);
            try {
                const funnel = await fetchHiringFunnelMetrics();
                setFunnelData(funnel);

                const diversity = await fetchDiversityTracking();
                setDiversityData(diversity);

                const timeToHire = await fetchTimeToHire();
                setTimeToHireData(timeToHire);

                const source = await fetchSourceEffectiveness();
                setSourceData(source);

                setLoading(false);
            } catch (err) {
                setError("Failed to load analytics data.");
                setLoading(false);
                console.error(err);
            }
        };
        loadAnalytics();
    }, []);

    if (loading) return <div className="loading-message">Loading analytics dashboard...</div>;
    if (error) return <div className="error-message">{error}</div>;

    // Prepare data for charts
    const funnelChartData = Object.keys(funnelData).map(key => ({
        name: key,
        candidates: funnelData[key]
    }));

    const diversityPieData = Object.keys(diversityData.genderDistribution || {}).map(key => ({
        name: key,
        value: diversityData.genderDistribution[key]
    }));
    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    const sourceBarData = sourceData.map(s => ({
        name: s.source,
        'Total Candidates': s.totalCandidates,
        'Hired Candidates': s.hiredCandidates,
        'Conversion Rate (%)': s.conversionRate.toFixed(1)
    }));


    return (
        <div className="analytics-dashboard-container">
            <h2>Analytics & Reporting Dashboard</h2>

            <div className="dashboard-grid">
                <div className="dashboard-card hiring-funnel-card">
                    <h3>Hiring Funnel</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={funnelChartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="candidates" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {diversityPieData.length > 0 && (
                    <div className="dashboard-card diversity-card">
                        <h3>Diversity Tracking (Gender)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={diversityPieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                    {diversityPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="dashboard-card time-to-hire-card">
                    <h3>Time-to-Hire</h3>
                    <p className="metric-value">{timeToHireData.averageTimeToHireDays} days</p>
                    <p className="metric-description">Average time from application to hire for {timeToHireData.hiredCount} candidates.</p>
                </div>

                {sourceBarData.length > 0 && (
                    <div className="dashboard-card source-effectiveness-card">
                        <h3>Source Effectiveness</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={sourceBarData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Total Candidates" fill="#82ca9d" />
                                <Bar dataKey="Hired Candidates" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                        <ul className="source-conversion-list">
                            {sourceData.map((s, index) => (
                                <li key={index}>
                                    <strong>{s.source}:</strong> {s.conversionRate.toFixed(1)}% Conversion Rate ({s.hiredCandidates}/{s.totalCandidates})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AnalyticsDashboard;
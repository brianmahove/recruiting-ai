import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOutreachCampaign, fetchEmailTemplates, fetchATSCandidates } from '../api';
import './OutreachCampaignForm.css'; // Create this CSS file

function OutreachCampaignForm() {
    const navigate = useNavigate();
    const [campaignName, setCampaignName] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [allCandidates, setAllCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [templates, candidates] = await Promise.all([
                    fetchEmailTemplates(),
                    fetchATSCandidates() // Fetch all candidates for selection
                ]);
                setEmailTemplates(templates);
                setAllCandidates(candidates);
                setLoading(false);
            } catch (err) {
                setError("Failed to load data for campaign form.");
                console.error(err);
            }
        };
        loadData();
    }, []);

    const handleCandidateSelection = (e) => {
        const value = Array.from(e.target.selectedOptions, option => parseInt(option.value));
        setSelectedCandidateIds(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!campaignName.trim() || !selectedTemplateId || selectedCandidateIds.length === 0) {
            setError("Campaign name, template, and at least one candidate are required.");
            return;
        }

        const campaignData = {
            name: campaignName,
            templateId: parseInt(selectedTemplateId),
            candidateIds: selectedCandidateIds,
        };

        try {
            await createOutreachCampaign(campaignData);
            alert("Outreach campaign created successfully!");
            navigate('/outreach-campaigns');
        } catch (err) {
            setError(err.message || "Failed to create campaign.");
            console.error(err);
        }
    };

    if (loading) return <div className="loading-message">Loading campaign form...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="outreach-campaign-form-container">
            <button onClick={() => navigate('/outreach-campaigns')} className="back-button">← Back to Campaigns</button>
            <h2>Create New Outreach Campaign</h2>

            <form onSubmit={handleSubmit} className="campaign-form">
                <div className="form-group">
                    <label htmlFor="campaignName">Campaign Name:</label>
                    <input
                        type="text"
                        id="campaignName"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="template">Select Email Template:</label>
                    <select
                        id="template"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        required
                    >
                        <option value="">-- Select a Template --</option>
                        {emailTemplates.map(template => (
                            <option key={template.id} value={template.id}>{template.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="candidates">Select Candidates (Hold Ctrl/Cmd to select multiple):</label>
                    <select
                        id="candidates"
                        multiple
                        value={selectedCandidateIds}
                        onChange={handleCandidateSelection}
                        required
                        className="candidate-multiselect"
                    >
                        {allCandidates.map(candidate => (
                            <option key={candidate.id} value={candidate.id}>{candidate.name} ({candidate.email})</option>
                        ))}
                    </select>
                    <p className="help-text">Selected: {selectedCandidateIds.length} candidates</p>
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn">Create Campaign</button>
                    <button type="button" onClick={() => navigate('/outreach-campaigns')} className="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    );
}

export default OutreachCampaignForm;
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchOutreachCampaigns, sendOutreachCampaign } from '../api';
import './OutreachCampaignList.css'; // Create this CSS file

function OutreachCampaignList() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const data = await fetchOutreachCampaigns();
            setCampaigns(data);
            setLoading(false);
        } catch (err) {
            setError("Failed to load outreach campaigns.");
            setLoading(false);
            console.error(err);
        }
    };

    useEffect(() => {
        loadCampaigns();
    }, []);

    const handleSendCampaign = async (campaignId, campaignName) => {
        if (window.confirm(`Are you sure you want to send the campaign "${campaignName}"? This action cannot be undone.`)) {
            try {
                const result = await sendOutreachCampaign(campaignId);
                alert(result.message);
                loadCampaigns(); // Reload to update status
            } catch (err) {
                setError(err.message || "Failed to send campaign.");
                console.error(err);
            }
        }
    };

    if (loading) return <div className="loading-message">Loading outreach campaigns...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="outreach-campaign-list-container">
            <h2>Outreach Campaigns</h2>
            <p className="intro-text">Manage and send your email outreach campaigns to candidates.</p>

            <div className="campaign-actions-header">
                <Link to="/outreach-campaigns/new" className="add-campaign-btn">
                    + Create New Campaign
                </Link>
            </div>

            {campaigns.length === 0 ? (
                <p className="no-data-message">No outreach campaigns created yet.</p>
            ) : (
                <ul className="campaign-cards-list">
                    {campaigns.map((campaign) => (
                        <li key={campaign.id} className="campaign-card">
                            <div className="card-header">
                                <h3>{campaign.name}</h3>
                                <span className={`campaign-status-badge status-${campaign.status.toLowerCase()}`}>{campaign.status}</span>
                            </div>
                            <div className="card-body">
                                <p><strong>Template:</strong> {campaign.templateName || 'N/A'}</p>
                                <p><strong>Candidates:</strong> {campaign.candidateIds.length}</p>
                                <p><strong>Sent By:</strong> {campaign.sentByUsername || 'N/A'}</p>
                                <p><strong>Sent At:</strong> {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : 'N/A'}</p>
                                <p><strong>Created:</strong> {new Date(campaign.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="card-actions">
                                {campaign.status === 'Draft' && (
                                    <button onClick={() => handleSendCampaign(campaign.id, campaign.name)} className="send-btn">Send Campaign</button>
                                )}
                                {/* Add edit/delete if needed, but sending makes them immutable */}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default OutreachCampaignList;
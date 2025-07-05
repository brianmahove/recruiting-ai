import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchEmailTemplates, deleteEmailTemplate } from '../api';
import './EmailTemplateList.css'; // Create this CSS file

function EmailTemplateList() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await fetchEmailTemplates();
            setTemplates(data);
            setLoading(false);
        } catch (err) {
            setError("Failed to load email templates.");
            setLoading(false);
            console.error(err);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const handleDelete = async (templateId, templateName) => {
        if (window.confirm(`Are you sure you want to delete the template "${templateName}"? This cannot be undone.`)) {
            try {
                await deleteEmailTemplate(templateId);
                loadTemplates(); // Reload templates
            } catch (err) {
                setError(err.message || "Failed to delete template. It might be linked to active campaigns.");
                console.error(err);
            }
        }
    };

    if (loading) return <div className="loading-message">Loading email templates...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="email-template-list-container">
            <h2>Email Templates</h2>
            <p className="intro-text">Manage your reusable email templates for outreach campaigns.</p>

            <div className="template-actions-header">
                <Link to="/email-templates/new" className="add-template-btn">
                    + Create New Template
                </Link>
            </div>

            {templates.length === 0 ? (
                <p className="no-data-message">No email templates created yet.</p>
            ) : (
                <ul className="template-cards-list">
                    {templates.map((template) => (
                        <li key={template.id} className="template-card">
                            <div className="card-header">
                                <h3>{template.name}</h3>
                            </div>
                            <div className="card-body">
                                <p><strong>Subject:</strong> {template.subject}</p>
                                <p className="template-body-preview"><strong>Body:</strong> {template.body.substring(0, 100)}...</p>
                                <p><strong>Created:</strong> {new Date(template.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="card-actions">
                                <button onClick={() => navigate(`/email-templates/${template.id}/edit`)} className="edit-btn">Edit</button>
                                <button onClick={() => handleDelete(template.id, template.name)} className="delete-btn">Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default EmailTemplateList;
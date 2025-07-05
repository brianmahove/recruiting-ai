import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createEmailTemplate, fetchEmailTemplateById, updateEmailTemplate } from '../api';
import './EmailTemplateForm.css'; // Create this CSS file

function EmailTemplateForm() {
    const { id } = useParams(); // templateId for editing
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const isEditing = !!id;

    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            const loadTemplate = async () => {
                try {
                    const template = await fetchEmailTemplateById(id);
                    setName(template.name);
                    setSubject(template.subject);
                    setBody(template.body);
                } catch (err) {
                    setError("Failed to load template.");
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            loadTemplate();
        }
    }, [id, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!name.trim() || !subject.trim() || !body.trim()) {
            setError("All fields are required.");
            return;
        }

        const templateData = { name, subject, body };

        try {
            if (isEditing) {
                await updateEmailTemplate(id, templateData);
                alert("Email template updated successfully!");
            } else {
                await createEmailTemplate(templateData);
                alert("Email template created successfully!");
            }
            navigate('/email-templates');
        } catch (err) {
            setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} template.`);
            console.error(err);
        }
    };

    if (loading) return <div className="loading-message">Loading template form...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="email-template-form-container">
            <button onClick={() => navigate('/email-templates')} className="back-button">← Back to Templates</button>
            <h2>{isEditing ? 'Edit Email Template' : 'Create New Email Template'}</h2>
            <p className="form-intro">Use placeholders like <code className="placeholder-code">{'{{candidate_name}}'}</code> and <code className="placeholder-code">{'{{job_title}}'}</code> in the subject and body.</p>

            <form onSubmit={handleSubmit} className="template-form">
                <div className="form-group">
                    <label htmlFor="name">Template Name:</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="subject">Subject:</label>
                    <input
                        type="text"
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="body">Body:</label>
                    <textarea
                        id="body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows="10"
                        required
                    ></textarea>
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn">
                        {isEditing ? 'Update Template' : 'Create Template'}
                    </button>
                    <button type="button" onClick={() => navigate('/email-templates')} className="cancel-btn">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default EmailTemplateForm;
import React, { useState } from 'react';
import { sendEmail } from './api';

function EmailSender({ recipientEmail, defaultSubject = '', defaultBody = '' }) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatusMessage('');
    setIsError(false);

    if (!recipientEmail || !subject || !body) {
      setStatusMessage('Recipient, subject, and body cannot be empty.');
      setIsError(true);
      setLoading(false);
      return;
    }

    try {
      const response = await sendEmail({
        recipient_email: recipientEmail,
        subject: subject,
        body: body,
      });
      setStatusMessage(response.message);
      setIsError(false);
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-sender-container">
      <h3>Send Email</h3>
      <form onSubmit={handleSendEmail} className="email-form">
        <div className="form-group">
          <label>To:</label>
          <input type="email" value={recipientEmail} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="email-subject">Subject:</label>
          <input
            type="text"
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email-body">Body:</label>
          <textarea
            id="email-body"
            rows="8"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          ></textarea>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Email'}
        </button>
        {statusMessage && (
          <p className={isError ? 'error-message' : 'success-message'}>
            {statusMessage}
          </p>
        )}
        <p className="email-warning">
          <strong>Note:</strong> Email functionality uses basic SMTP. For production, configure environment variables for `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USERNAME`, and `SMTP_PASSWORD` in your backend. **Do NOT hardcode your credentials!** For Gmail, you'll need an App Password.
        </p>
      </form>
    </div>
  );
}

export default EmailSender;
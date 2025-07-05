import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker'; // For calendar picker
import 'react-datepicker/dist/react-datepicker.css'; // Datepicker CSS
import { parseISO, format } from 'date-fns'; // For date formatting
import { fetchCandidateById, fetchJobDescriptionById, scheduleInterview, fetchInterviewById, updateInterview } from '../api';
import './InterviewScheduler.css';

function InterviewScheduler() {
    const { candidateId, jobId, id: interviewId } = useParams(); // 'id' for editing
    const navigate = useNavigate();

    const [candidate, setCandidate] = useState(null);
    const [jobDescription, setJobDescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const [recruiterName, setRecruiterName] = useState('');
    const [interviewType, setInterviewType] = useState('Virtual');
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [meetingLink, setMeetingLink] = useState('');
    const [status, setStatus] = useState('Scheduled'); // For editing existing interviews
    const [candidateNotes, setCandidateNotes] = useState('');
    const [recruiterNotes, setRecruiterNotes] = useState('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const fetchedCandidate = await fetchCandidateById(candidateId);
                setCandidate(fetchedCandidate);

                if (jobId && jobId !== 'new') { // If a specific jobId is provided
                    const fetchedJob = await fetchJobDescriptionById(jobId);
                    setJobDescription(fetchedJob);
                } else if (fetchedCandidate.jobDescriptionId) { // Fallback to candidate's job if no jobId provided
                    const fetchedJob = await fetchJobDescriptionById(fetchedCandidate.jobDescriptionId);
                    setJobDescription(fetchedJob);
                }

                if (interviewId) { // Editing an existing interview
                    setIsEditing(true);
                    const interview = await fetchInterviewById(interviewId);
                    setRecruiterName(interview.recruiterName);
                    setInterviewType(interview.interviewType);
                    setStartTime(parseISO(interview.startTime)); // Convert ISO string to Date object
                    setEndTime(parseISO(interview.endTime));
                    setMeetingLink(interview.meetingLink || '');
                    setStatus(interview.status);
                    setCandidateNotes(interview.candidateNotes || '');
                    setRecruiterNotes(interview.recruiterNotes || '');
                } else {
                    // Default for new interview: current user's name (placeholder)
                    setRecruiterName('Your Name'); // TODO: Replace with actual recruiter login name
                    // Default start/end times
                    const now = new Date();
                    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
                    setStartTime(nextHour);
                    setEndTime(new Date(nextHour.getTime() + 60 * 60 * 1000)); // 1 hour later
                }

                setLoading(false);
            } catch (err) {
                setError("Failed to load candidate or job description data.");
                setLoading(false);
                console.error(err);
            }
        };
        loadData();
    }, [candidateId, jobId, interviewId]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!recruiterName || !startTime || !endTime || !interviewType) {
            setError("Please fill in all required fields.");
            return;
        }

        if (startTime >= endTime) {
            setError("End time must be after start time.");
            return;
        }

        const interviewData = {
            candidateId: parseInt(candidateId),
            jobDescriptionId: jobDescription ? jobDescription.id : null, // Can be null if candidate has no specific JD
            recruiterName,
            interviewType,
            startTime: startTime.toISOString(), // Convert Date object to ISO string
            endTime: endTime.toISOString(),     // Convert Date object to ISO string
            meetingLink: meetingLink || null,
            status: status, // For both new and update
            candidateNotes: candidateNotes || null,
            recruiterNotes: recruiterNotes || null,
        };

        try {
            if (isEditing) {
                await updateInterview(interviewId, interviewData);
                alert("Interview updated successfully!");
            } else {
                await scheduleInterview(interviewData);
                alert("Interview scheduled successfully!");
            }
            navigate(`/candidates/${candidateId}`); // Go back to candidate detail after scheduling
        } catch (err) {
            setError(`Failed to ${isEditing ? 'update' : 'schedule'} interview.`);
            console.error(err);
        }
    };

    if (loading) return <div className="loading-message">Loading interview scheduler...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!candidate) return <div className="no-data-message">Candidate not found.</div>;

    const interviewStatuses = ["Scheduled", "Rescheduled", "Completed", "Cancelled"];

    return (
        <div className="interview-scheduler-container">
            <button onClick={() => navigate(`/candidates/${candidateId}`)} className="back-button">← Back to Candidate</button>
            <h2>{isEditing ? 'Edit Interview' : 'Schedule New Interview'}</h2>
            <h3>For: {candidate.name} {jobDescription && `(Applying for: ${jobDescription.title})`}</h3>

            <form onSubmit={handleSubmit} className="interview-form">
                <div className="form-group">
                    <label htmlFor="recruiterName">Recruiter Name:</label>
                    <input
                        type="text"
                        id="recruiterName"
                        value={recruiterName}
                        onChange={(e) => setRecruiterName(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="interviewType">Interview Type:</label>
                    <select
                        id="interviewType"
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value)}
                        required
                    >
                        <option value="Virtual">Virtual</option>
                        <option value="On-site">On-site</option>
                        <option value="Phone">Phone</option>
                    </select>
                </div>

                <div className="form-group date-time-pickers">
                    <div>
                        <label>Start Time:</label>
                        <DatePicker
                            selected={startTime}
                            onChange={(date) => setStartTime(date)}
                            showTimeSelect
                            dateFormat="Pp"
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            required
                        />
                    </div>
                    <div>
                        <label>End Time:</label>
                        <DatePicker
                            selected={endTime}
                            onChange={(date) => setEndTime(date)}
                            showTimeSelect
                            dateFormat="Pp"
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            minDate={startTime} // Ensure end time is not before start time
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="meetingLink">Meeting Link / Location:</label>
                    <input
                        type="text"
                        id="meetingLink"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="e.g., Zoom link, office address"
                    />
                </div>

                {isEditing && (
                    <div className="form-group">
                        <label htmlFor="status">Status:</label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            {interviewStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="recruiterNotes">Recruiter Notes:</label>
                    <textarea
                        id="recruiterNotes"
                        value={recruiterNotes}
                        onChange={(e) => setRecruiterNotes(e.target.value)}
                        rows="4"
                        placeholder="Internal notes about the interview..."
                    ></textarea>
                </div>

                <div className="form-group">
                    <label htmlFor="candidateNotes">Candidate-facing Notes:</label>
                    <textarea
                        id="candidateNotes"
                        value={candidateNotes}
                        onChange={(e) => setCandidateNotes(e.target.value)}
                        rows="4"
                        placeholder="Notes to be included in the candidate's invitation/reminder..."
                    ></textarea>
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn">
                        {isEditing ? 'Update Interview' : 'Schedule Interview'}
                    </button>
                    <button type="button" onClick={() => navigate(`/candidates/${candidateId}`)} className="cancel-btn">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default InterviewScheduler;
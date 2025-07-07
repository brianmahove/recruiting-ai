// src/components/InterviewScheduler.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAvailableSlots, scheduleInterview } from '../api'; // You'll need to add these API calls

function InterviewScheduler() {
    const { candidateId, jobId } = useParams();
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [schedulingMessage, setSchedulingMessage] = useState('');

    useEffect(() => {
        const getSlots = async () => {
            setLoading(true);
            setError(null);
            try {
                // In a real application, you might fetch slots for specific interviewers
                // associated with the jobId, or for all available interviewers.
                const slots = await fetchAvailableSlots(jobId);
                setAvailableSlots(slots);
            } catch (err) {
                console.error("Error fetching available slots:", err);
                setError(err.message || "Failed to load available interview slots.");
            } finally {
                setLoading(false);
            }
        };
        getSlots();
    }, [jobId]); // Re-fetch slots if the job changes (though typically you'd only land here once per interview setup)

    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
        setSchedulingMessage(''); // Clear previous messages
    };

    const handleScheduleInterview = async () => {
        if (!selectedSlot) {
            setSchedulingMessage("Please select an interview slot first. ⚠️");
            return;
        }

        setSchedulingMessage("Scheduling interview... ⏳");
        try {
            const response = await scheduleInterview(
                candidateId,
                jobId,
                selectedSlot.startTime,
                selectedSlot.endTime
            );
            setSchedulingMessage(`Interview scheduled successfully! ✅ Confirmation sent to ${response.candidate_email}.`);
            // Optionally, clear selected slot or disable the scheduler
            setSelectedSlot(null);
            setAvailableSlots([]); // Clear slots after scheduling
        } catch (err) {
            console.error("Error scheduling interview:", err);
            setSchedulingMessage(`Failed to schedule interview: ${err.message || "Unknown error"} ❌`);
        }
    };

    if (loading) return <p>Loading available slots... ⏳</p>;
    if (error) return <p className="error-message">Error: {error} ❌</p>;

    return (
        <div className="interview-scheduler-container">
            <Link to="/candidates" className="back-link">&larr; Back to Candidates</Link>
            <h2>Schedule Interview for Candidate {candidateId} (Job: {jobId})</h2>

            {schedulingMessage && <p className={`scheduling-message ${schedulingMessage.includes('✅') ? 'success' : 'error'}`}>{schedulingMessage}</p>}

            <h3>Available Slots:</h3>
            {availableSlots.length > 0 ? (
                <div className="available-slots-list">
                    {availableSlots.map((slot) => (
                        <div
                            key={slot.id} // Assuming each slot has a unique ID from the backend
                            className={`slot-item ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                            onClick={() => handleSlotSelect(slot)}
                        >
                            <p><strong>Date:</strong> {new Date(slot.startTime).toLocaleDateString()}</p>
                            <p><strong>Time:</strong> {new Date(slot.startTime).toLocaleTimeString()} - {new Date(slot.endTime).toLocaleTimeString()}</p>
                            {/* You might add interviewer info here if available in the slot object */}
                            {slot.interviewer && <p>Interviewer: {slot.interviewer.name}</p>}
                        </div>
                    ))}
                </div>
            ) : (
                <p>No available slots found. Please try again later or contact the hiring manager. 😔</p>
            )}

            <button
                onClick={handleScheduleInterview}
                disabled={!selectedSlot}
                className="action-button schedule-button"
            >
                Confirm Schedule Interview
            </button>
        </div>
    );
}

export default InterviewScheduler;
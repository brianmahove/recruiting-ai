// src/api.js
const API_BASE_URL = 'http://127.0.0.1:5000'; // Make sure this matches your Flask backend URL

// Helper function to handle API errors more robustly
const handleApiResponse = async (response) => {
    if (!response.ok) {
        const errorText = await response.text(); // Always read as text first
        console.error("API Error Response Text:", errorText); // Log raw response for debugging

        let errorMessage = `HTTP error! Status: ${response.status}`;
        try {
            // Attempt to parse as JSON if it looks like it might be
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
            // If it's not JSON, use the raw text
            errorMessage = `Server error: ${errorText}`;
        }
        throw new Error(errorMessage);
    }
    return response.json(); // Only parse as JSON if response is OK
};


// --- Resume Upload and Candidate Management ---
export const uploadResume = async (formData) => {
    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
    });
    return handleApiResponse(response);
};

export const getCandidates = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/candidates?${query}`);
    return handleApiResponse(response);
};

export const getCandidateDetail = async (id) => {
    const response = await fetch(`${API_BASE_URL}/candidates/${id}`);
    return handleApiResponse(response);
};

export const updateCandidate = async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/candidates/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    return handleApiResponse(response);
};

// NEW: updateCandidateStatus (can simply call updateCandidate with status)
export const updateCandidateStatus = async (id, newStatus) => {
    return await updateCandidate(id, { status: newStatus });
};

export const deleteCandidate = async (id) => {
    const response = await fetch(`${API_BASE_URL}/candidates/${id}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};

export const downloadResume = (filename) => {
    // This is a direct link, not an API call that returns JSON
    window.open(`${API_BASE_URL}/download_resume/${filename}`, '_blank');
};

// --- Job Description Management ---
export const getJobDescriptions = async () => {
    const response = await fetch(`${API_BASE_URL}/job_descriptions`);
    return handleApiResponse(response);
};

export const getJobDescriptionDetail = async (id) => {
    const response = await fetch(`${API_BASE_URL}/job_descriptions/${id}`);
    return handleApiResponse(response);
};

export const deleteJobDescription = async (id) => {
    const response = await fetch(`${API_BASE_URL}/job_descriptions/${id}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};


// --- AI Interviewer API Calls ---
export const startInterview = async (candidateId, jobId) => {
    const response = await fetch(`${API_BASE_URL}/interview/start/${candidateId}/${jobId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidate_id: candidateId, job_id: jobId })
    });
    return handleApiResponse(response);
};

export const submitInterviewAnswer = async (interviewId, questionId, formData) => {
    const response = await fetch(`${API_BASE_URL}/interview/submit_answer/${interviewId}/${questionId}`, {
        method: 'POST',
        body: formData,
    });
    return handleApiResponse(response);
};

export const finalizeInterview = async (interviewId) => {
    const response = await fetch(`${API_BASE_URL}/interview/finalize/${interviewId}`, {
        method: 'POST',
    });
    return handleApiResponse(response);
};

// NEW: sendEmail function
export const sendEmail = async (recipientEmail, subject, body) => {
    const response = await fetch(`${API_BASE_URL}/send_email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipient_email: recipientEmail, subject, body }),
    });
    return handleApiResponse(response);
};


// NEW: Interview Scheduling API Calls (Now using the robust handleApiResponse)
export const fetchAvailableSlots = async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/interview/slots?job_id=${jobId}`);
    return handleApiResponse(response);
};

export const scheduleInterview = async (candidateId, jobId, startTime, endTime) => {
    const response = await fetch(`${API_BASE_URL}/interview/schedule`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            candidate_id: candidateId,
            job_id: jobId,
            start_time: startTime,
            end_time: endTime,
        }),
    });
    return handleApiResponse(response);
};
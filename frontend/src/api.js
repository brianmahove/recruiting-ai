const API_BASE_URL = 'http://127.0.0.1:5000'; // Ensure this matches your Flask backend URL

export const fetchJobDescriptions = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/job_descriptions`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching job descriptions:", error);
        throw error;
    }
};

export const createJobDescription = async (jobDescription) => {
    try {
        const response = await fetch(`${API_BASE_URL}/job_descriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(jobDescription),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error creating job description:", error);
        throw error;
    }
};

// NEW: Fetch a single Job Description
export const fetchJobDescriptionById = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/job_descriptions/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching job description ${id}:`, error);
        throw error;
    }
};

// NEW: Update a Job Description
export const updateJobDescription = async (id, jobDescription) => {
    try {
        const response = await fetch(`${API_BASE_URL}/job_descriptions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(jobDescription),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating job description ${id}:`, error);
        throw error;
    }
};

// NEW: Delete a Job Description
export const deleteJobDescription = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/job_descriptions/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error deleting job description ${id}:`, error);
        throw error;
    }
};


export const uploadResume = async (formData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData, // FormData doesn't need Content-Type header; browser sets it
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error uploading resume:", error);
        throw error;
    }
};

// MODIFIED: Fetch Candidates with filters
export const fetchCandidates = async (filters = {}) => {
    const params = new URLSearchParams();
    for (const key in filters) {
        if (filters[key]) {
            params.append(key, filters[key]);
        }
    }
    try {
        const response = await fetch(`${API_BASE_URL}/candidates?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching candidates:", error);
        throw error;
    }
};

// NEW: Fetch a single Candidate
export const fetchCandidateById = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching candidate ${id}:`, error);
        throw error;
    }
};

// NEW: Update a Candidate (e.g., status, notes)
export const updateCandidate = async (id, candidateData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(candidateData),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating candidate ${id}:`, error);
        throw error;
    }
};

// NEW: Download Resume
export const downloadResume = async (candidateId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/download_resume/${candidateId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Instead of parsing JSON, return the blob for file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Try to get filename from headers, otherwise use a default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `resume_${candidateId}.pdf`; // Default fallback
        if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
            filename = contentDisposition.split('filename=')[1];
            // Remove quotes if present
            filename = filename.replace(/['"]/g, '');
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url); // Clean up
        return { success: true, message: "Download initiated" };

    } catch (error) {
        console.error(`Error downloading resume for candidate ${candidateId}:`, error);
        throw error;
    }
};
// NEW: Fetch Screening Questions for a Job Description
export const fetchScreeningQuestions = async (jobDescriptionId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/job_descriptions/${jobDescriptionId}/questions`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching screening questions for JD ${jobDescriptionId}:`, error);
        throw error;
    }
};

// NEW: Add a Screening Question
export const addScreeningQuestion = async (questionData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/screening_questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(questionData),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding screening question:", error);
        throw error;
    }
};

// NEW: Update a Screening Question
export const updateScreeningQuestion = async (questionId, questionData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/screening_questions/${questionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(questionData),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating screening question ${questionId}:`, error);
        throw error;
    }
};

// NEW: Delete a Screening Question
export const deleteScreeningQuestion = async (questionId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/screening_questions/${questionId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error deleting screening question ${questionId}:`, error);
        throw error;
    }
};

// NEW: Fetch Candidate Screening Responses
export const fetchCandidateScreeningResponses = async (candidateId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/screening_responses`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching screening responses for candidate ${candidateId}:`, error);
        throw error;
    }
};


// NEW: Interview Scheduling APIs
export const scheduleInterview = async (interviewData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/interviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(interviewData),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error scheduling interview:", error);
        throw error;
    }
};

export const fetchInterviews = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    try {
        const response = await fetch(`${API_BASE_URL}/interviews${query ? `?${query}` : ''}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching interviews:", error);
        throw error;
    }
};

export const fetchInterviewById = async (interviewId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/interviews/${interviewId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching interview ${interviewId}:`, error);
        throw error;
    }
};

export const updateInterview = async (interviewId, interviewData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/interviews/${interviewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(interviewData),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating interview ${interviewId}:`, error);
        throw error;
    }
};

export const deleteInterview = async (interviewId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/interviews/${interviewId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error deleting interview ${interviewId}:`, error);
        throw error;
    }
};

// For downloading calendar invites
export const downloadIcal = (interviewId) => {
    window.open(`${API_BASE_URL}/interviews/${interviewId}/download_ical`, '_blank');
};

// NEW: Skill Assessment APIs
export const createAssessment = async (assessmentData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assessmentData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error creating assessment:", error); throw error; }
};

export const fetchAssessments = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching assessments:", error); throw error; }
};

export const fetchAssessmentById = async (assessmentId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching assessment ${assessmentId}:`, error); throw error; }
};

export const updateAssessment = async (assessmentId, assessmentData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assessmentData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error updating assessment ${assessmentId}:`, error); throw error; }
};

export const deleteAssessment = async (assessmentId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error deleting assessment ${assessmentId}:`, error); throw error; }
};

// Assessment Questions
export const addAssessmentQuestion = async (assessmentId, questionData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error adding question:", error); throw error; }
};

export const fetchAssessmentQuestions = async (assessmentId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/questions`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching questions:", error); throw error; }
};

export const updateAssessmentQuestion = async (questionId, questionData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error updating question ${questionId}:`, error); throw error; }
};

export const deleteAssessmentQuestion = async (questionId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error deleting question ${questionId}:`, error); throw error; }
};

// Candidate Assessment Results
export const startCandidateAssessment = async (candidateId, assessmentId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/assessments/${assessmentId}/start`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error starting assessment:", error); throw error; }
};

export const submitQuestionResponse = async (resultId, responseData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessment_results/${resultId}/responses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(responseData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error submitting response:", error); throw error; }
};

export const completeCandidateAssessment = async (resultId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessment_results/${resultId}/complete`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error completing assessment:", error); throw error; }
};

export const fetchCandidateAssessmentResult = async (resultId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/assessment_results/${resultId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching assessment result ${resultId}:`, error); throw error; }
};

export const fetchCandidateAllAssessmentResults = async (candidateId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/assessment_results`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching all assessment results for candidate ${candidateId}:`, error); throw error; }
};

// ... (existing imports and API_BASE_URL) ...

// NEW: Analytics & Reporting APIs
export const fetchHiringFunnelMetrics = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/hiring_funnel`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching hiring funnel:", error); throw error; }
};

export const fetchDiversityTracking = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/diversity_tracking`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching diversity data:", error); throw error; }
};

export const fetchTimeToHire = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/time_to_hire`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching time to hire:", error); throw error; }
};

export const fetchSourceEffectiveness = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/source_effectiveness`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching source effectiveness:", error); throw error; }
};

// ... (existing imports and API_BASE_URL) ...

// NEW: ATS APIs
export const fetchATSCandidates = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/ats/candidates`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching ATS candidates:", error); throw error; }
};

export const addCandidateNote = async (candidateId, noteText) => {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noteText }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error adding note for candidate ${candidateId}:`, error); throw error; }
};

export const fetchCandidateNotes = async (candidateId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/notes`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching notes for candidate ${candidateId}:`, error); throw error; }
};

export const fetchCandidateStatusHistory = async (candidateId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/status_history`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching status history for candidate ${candidateId}:`, error); throw error; }
};

// NEW: Bias Detection APIs
export const fetchScreeningDisparity = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/bias/screening_disparity`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching screening disparity:", error); throw error; }
};

export const fetchAssessmentScoreDisparity = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/bias/assessment_score_disparity`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching assessment score disparity:", error); throw error; }
};

export const fetchAIExplanationForCandidate = async (candidateId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/bias/ai_explanation/${candidateId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching AI explanation for candidate ${candidateId}:`, error); throw error; }
};

// NEW: Video Interview APIs
export const uploadVideoInterview = async (formData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/video_interviews/upload`, {
            method: 'POST',
            // When using FormData, Content-Type header is usually not set manually;
            // browser sets it to 'multipart/form-data' with boundary
            body: formData,
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error uploading video interview:", error); throw error; }
};

export const fetchCandidateVideoInterviews = async (candidateId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/video_interviews`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching video interviews for candidate ${candidateId}:`, error); throw error; }
};

export const fetchVideoInterviewDetails = async (interviewId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/video_interviews/${interviewId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching video interview ${interviewId}:`, error); throw error; }
};

// NEW: User APIs
export const fetchUsers = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching users:", error); throw error; }
};

// NEW: Bulk Resume Upload
export const uploadResumesBulk = async (formData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/upload_resumes`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error uploading resumes in bulk:", error); throw error; }
};

// NEW: Pipeline Stage APIs
export const fetchPipelineStages = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/pipeline_stages`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching pipeline stages:", error); throw error; }
};

export const createPipelineStage = async (stageData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/pipeline_stages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stageData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error creating pipeline stage:", error); throw error; }
};

export const updatePipelineStage = async (stageId, stageData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/pipeline_stages/${stageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stageData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error updating pipeline stage ${stageId}:`, error); throw error; }
};

export const deletePipelineStage = async (stageId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/pipeline_stages/${stageId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error deleting pipeline stage ${stageId}:`, error); throw error; }
};

// NEW: Email Template APIs
export const fetchEmailTemplates = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/email_templates`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching email templates:", error); throw error; }
};

export const createEmailTemplate = async (templateData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/email_templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templateData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error creating email template:", error); throw error; }
};

export const fetchEmailTemplateById = async (templateId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/email_templates/${templateId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching email template ${templateId}:`, error); throw error; }
};

export const updateEmailTemplate = async (templateId, templateData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/email_templates/${templateId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templateData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error updating email template ${templateId}:`, error); throw error; }
};

export const deleteEmailTemplate = async (templateId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/email_templates/${templateId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error deleting email template ${templateId}:`, error); throw error; }
};

// NEW: Outreach Campaign APIs
export const fetchOutreachCampaigns = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/outreach_campaigns`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error fetching outreach campaigns:", error); throw error; }
};

export const createOutreachCampaign = async (campaignData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/outreach_campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignData),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error("Error creating outreach campaign:", error); throw error; }
};

export const fetchOutreachCampaignById = async (campaignId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/outreach_campaigns/${campaignId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error fetching outreach campaign ${campaignId}:`, error); throw error; }
};

export const sendOutreachCampaign = async (campaignId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/outreach_campaigns/${campaignId}/send`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { console.error(`Error sending outreach campaign ${campaignId}:`, error); throw error; }
};
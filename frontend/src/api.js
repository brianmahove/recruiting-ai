const API_BASE_URL = 'http://127.0.0.1:5000';

export const uploadResume = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload resume.');
  }
  return response.json();
};

export const getCandidates = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE_URL}/candidates?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch candidates.');
  }
  return response.json();
};

export const getCandidateDetail = async (id) => {
  const response = await fetch(`${API_BASE_URL}/candidates/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch candidate details.');
  }
  return response.json();
};

export const updateCandidateStatus = async (id, newStatus) => {
  const response = await fetch(`${API_BASE_URL}/candidates/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update candidate status.');
  }
  return response.json();
};

export const deleteCandidate = async (id) => {
  const response = await fetch(`${API_BASE_URL}/candidates/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete candidate.');
  }
  return response.json();
};

export const sendEmail = async (emailData) => {
  const response = await fetch(`${API_BASE_URL}/send_email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send email.');
  }
  return response.json();
};

// NEW API calls for Job Descriptions
export const getJobDescriptions = async () => {
  const response = await fetch(`${API_BASE_URL}/job_descriptions`);
  if (!response.ok) {
    throw new Error('Failed to fetch job descriptions.');
  }
  return response.json();
};

export const getJobDescriptionDetail = async (id) => {
  const response = await fetch(`${API_BASE_URL}/job_descriptions/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch job description details.');
  }
  return response.json();
};

export const deleteJobDescription = async (id) => {
  const response = await fetch(`${API_BASE_URL}/job_descriptions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete job description.');
  }
  return response.json();
};
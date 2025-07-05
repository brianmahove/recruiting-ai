
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Webcam from 'react-webcam'; // For webcam access
import { fetchCandidateById, fetchJobDescriptionById } from '../api';
import './AIScreeningInterview.css';

const API_BASE_URL = 'http://127.0.0.1:5000'; // Make sure this matches your Flask SocketIO server

function AIScreeningInterview() {
    const { candidateId, jobId } = useParams();
    const navigate = useNavigate();
    const socket = useRef(null);
    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunks = useRef([]);

    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [candidateAnswer, setCandidateAnswer] = useState('');
    const [interviewStatus, setInterviewStatus] = useState('connecting'); // connecting, ready, interviewing, finished, error
    const [messages, setMessages] = useState([]); // Chat history, including AI questions and user answers
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [facialAnalysisData, setFacialAnalysisData] = useState(null); // Live facial analysis
    const [toneAnalysisData, setToneAnalysisData] = useState(null); // Live tone analysis
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(false);


    useEffect(() => {
        // Fetch candidate and job description details once
        const loadDetails = async () => {
            try {
                const candidate = await fetchCandidateById(candidateId);
                const job = await fetchJobDescriptionById(jobId);
                setMessages(prev => [...prev, { type: 'system', text: `Starting interview for ${candidate.name} applying for ${job.title}.` }]);
                setLoading(false);
            } catch (err) {
                setError("Failed to load candidate or job details.");
                setLoading(false);
            }
        };
        loadDetails();

        // Initialize SocketIO connection
        socket.current = io(API_BASE_URL);

        socket.current.on('connect', () => {
            setInterviewStatus('ready');
            setMessages(prev => [...prev, { type: 'system', text: 'Connected to AI interviewer. Starting interview...' }]);
            socket.current.emit('start_interview', { candidateId: parseInt(candidateId), jobDescriptionId: parseInt(jobId) });
        });

        socket.current.on('interview_question', (question) => {
            setCurrentQuestion(question);
            setCandidateAnswer(''); // Clear previous answer
            setInterviewStatus('interviewing');
            setMessages(prev => [...prev, { type: 'ai', text: question.questionText }]);
            setFacialAnalysisData(null); // Clear previous analysis
            setToneAnalysisData(null); // Clear previous analysis

            // Start webcam and audio streaming if question type is video or voice
            if (question.questionType === 'video' && webcamRef.current) {
                setCameraEnabled(true);
                startVideoStreaming();
                startAudioStreaming();
            } else if (question.questionType === 'voice') {
                setCameraEnabled(false); // Ensure camera is off if not needed
                startAudioStreaming();
            } else {
                setCameraEnabled(false);
                stopStreaming(); // Stop any active streaming for text questions
            }
        });

        socket.current.on('interview_finished', (data) => {
            setInterviewStatus('finished');
            setMessages(prev => [...prev, { type: 'system', text: 'Interview completed!', data: data.responses }]);
            setCurrentQuestion(null);
            stopStreaming();
        });

        socket.current.on('interview_error', (data) => {
            setInterviewStatus('error');
            setError(data.message || 'An interview error occurred.');
            setMessages(prev => [...prev, { type: 'error', text: data.message || 'An interview error occurred.' }]);
            setCurrentQuestion(null);
            stopStreaming();
        });

        // Live analysis updates
        socket.current.on('facial_analysis_update', (data) => {
            setFacialAnalysisData(data);
        });
        socket.current.on('tone_analysis_update', (data) => {
            setToneAnalysisData(data);
        });


        // Clean up on component unmount
        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
            stopStreaming();
        };
    }, [candidateId, jobId]);

    const startVideoStreaming = () => {
        if (!webcamRef.current) return;

        const interval = setInterval(() => {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                socket.current.emit('video_frame', { image: imageSrc });
            }
        }, 200); // Send frame every 200ms
        webcamRef.current.intervalId = interval; // Store ID to clear later
    };

    const startAudioStreaming = async () => {
        if (microphoneEnabled && mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            return; // Already recording
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // webm for broad compatibility

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                    // Send chunks immediately or accumulate for a short period
                    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                    // Send audioBlob to backend (e.g., convert to base64 or send raw blob via socket)
                    // For simplicity, converting to ArrayBuffer here. Base64 is also common.
                    audioBlob.arrayBuffer().then(buffer => {
                        socket.current.emit('audio_chunk', { audio: Array.from(new Uint8Array(buffer)) });
                    });
                    audioChunks.current = []; // Clear chunks after sending
                }
            };

            mediaRecorderRef.current.onstop = () => {
                // Audio recording stopped
                audioChunks.current = []; // Clear any remaining chunks
            };

            mediaRecorderRef.current.start(1000); // Start recording, dataavailable event fires every 1 second
            setMicrophoneEnabled(true);
            console.log("Audio recording started.");

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setMicrophoneEnabled(false);
            setError("Could not access microphone. Please ensure permissions are granted.");
        }
    };


    const stopStreaming = () => {
        if (webcamRef.current && webcamRef.current.intervalId) {
            clearInterval(webcamRef.current.intervalId);
            webcamRef.current.intervalId = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setCameraEnabled(false);
        setMicrophoneEnabled(false);
        console.log("Streaming stopped.");
    };

    const handleSubmitAnswer = (e) => {
        e.preventDefault();
        if (!currentQuestion || interviewStatus !== 'interviewing') return;

        setMessages(prev => [...prev, { type: 'user', text: candidateAnswer }]);
        stopStreaming(); // Stop streaming before submitting answer for this question
        socket.current.emit('submit_answer', {
            questionId: currentQuestion.id,
            answerText: candidateAnswer
            // In a real app, you might include facial/tone data collected
            // from the frontend, or the backend would fetch it from a temp store.
        });
        setCandidateAnswer('');
    };

    if (loading) return <div className="loading-message">Loading AI Interview...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="ai-interview-container">
            <button onClick={() => navigate(`/candidates/${candidateId}`)} className="back-button">← Back to Candidate</button>
            <h2>AI Screening Interview</h2>

            <div className="interview-chat-box">
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.type}`}>
                        {msg.type === 'system' && <span className="system-tag">System:</span>}
                        {msg.type === 'ai' && <span className="ai-tag">AI:</span>}
                        {msg.type === 'user' && <span className="user-tag">You:</span>}
                        <p>{msg.text}</p>
                        {msg.data && msg.type === 'system' && ( // Display responses at end
                            <div className="interview-summary">
                                <h4>Interview Responses:</h4>
                                {msg.data.map((res, resIndex) => (
                                    <div key={resIndex} className="response-item">
                                        <p><strong>Q:</strong> {questions.find(q => q.id === res.questionId)?.questionText}</p>
                                        <p><strong>A:</strong> {res.responseText}</p>
                                        <p><strong>Score:</strong> {res.score}% | <strong>Sentiment:</strong> {res.sentimentScore}</p>
                                        {res.facialAnalysisData && <p><strong>Facial:</strong> {res.facialAnalysisData.emotions_placeholder}</p>}
                                        {res.toneAnalysisData && <p><strong>Tone:</strong> {res.toneAnalysisData.tone_placeholder}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={el => { el && el.scrollIntoView({ behavior: 'smooth' }); }} /> {/* Auto-scroll to bottom */}
            </div>

            {interviewStatus === 'interviewing' && currentQuestion && (
                <div className="current-question-section">
                    <h3>Question:</h3>
                    <p className="question-text">{currentQuestion.questionText}</p>

                    {currentQuestion.questionType === 'text' && (
                        <form onSubmit={handleSubmitAnswer} className="answer-form">
                            <textarea
                                value={candidateAnswer}
                                onChange={(e) => setCandidateAnswer(e.target.value)}
                                placeholder="Type your answer here..."
                                rows="4"
                                required
                            ></textarea>
                            <button type="submit">Submit Answer</button>
                        </form>
                    )}

                    {(currentQuestion.questionType === 'voice' || currentQuestion.questionType === 'video') && (
                        <div className="voice-video-controls">
                            <p className="instruction-text">Please speak your answer clearly.</p>
                            {!microphoneEnabled ? (
                                <button onClick={startAudioStreaming} className="start-mic-btn">Start Microphone</button>
                            ) : (
                                <span className="recording-indicator">Recording... <span className="dot"></span></span>
                            )}
                            <button onClick={handleSubmitAnswer} disabled={!microphoneEnabled} className="submit-voice-btn">Submit Voice Answer</button>
                            <p className="disclaimer">Note: Voice-to-text conversion and tone analysis will be applied.</p>
                        </div>
                    )}

                    {currentQuestion.questionType === 'video' && (
                        <div className="webcam-section">
                            <h4>Camera Feed:</h4>
                            {cameraEnabled ? (
                                <Webcam
                                    audio={false} // Audio is handled separately
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    width={320}
                                    height={240}
                                    videoConstraints={{ facingMode: "user" }}
                                    className="webcam-feed"
                                />
                            ) : (
                                <p className="camera-off-message">Camera is off. It will activate for video questions.</p>
                            )}
                            {facialAnalysisData && (
                                <div className="analysis-feedback">
                                    <p><strong>Face Detected:</strong> {facialAnalysisData.face_detected ? 'Yes' : 'No'}</p>
                                    <p><strong>Emotions (Live):</strong> {facialAnalysisData.emotions_placeholder}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {interviewStatus === 'finished' && (
                <div className="interview-finished-message">
                    <h3>Interview Complete!</h3>
                    <p>Thank you for completing the AI screening interview. Your responses have been recorded.</p>
                    <button onClick={() => navigate(`/candidates/${candidateId}`)} className="finish-button">View Candidate Details</button>
                </div>
            )}
        </div>
    );
}

export default AIScreeningInterview;
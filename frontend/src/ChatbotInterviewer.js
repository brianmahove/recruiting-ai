// src/ChatbotInterviewer.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam'; // Import Webcam component
import { startInterview, submitInterviewAnswer, finalizeInterview } from './api';
import './ChatbotInterviewer.css'; // You'll create this CSS file

function ChatbotInterviewer() {
  const { candidateId, jobId } = useParams(); // Get candidateId and jobId from URL
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [candidateResponseText, setCandidateResponseText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interviewId, setInterviewId] = useState(null);
  const [overallScore, setOverallScore] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState('idle'); // 'idle', 'in-progress', 'completed'

  // Webcam and MediaRecorder states
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [stream, setStream] = useState(null);

  // --- Fetch Interview Questions on Component Mount ---
  useEffect(() => {
    const fetchInterviewSetup = async () => {
      if (!candidateId || !jobId) {
        setError("Missing Candidate ID or Job ID. Please navigate from a candidate's profile or job description.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const data = await startInterview(candidateId, jobId);
        setQuestions(data.questions);
        setInterviewId(data.interview_id);
        setInterviewStatus('in-progress');
      } catch (err) {
        console.error("Error starting interview:", err);
        setError(err.message || "Failed to start interview. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInterviewSetup();
  }, [candidateId, jobId]);

  // --- Media Recording Functions ---

  const handleDataAvailable = useCallback(
    ({ data }) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => [...prev, data]);
      }
    },
    [setRecordedChunks]
  );

  const startCapturing = useCallback(async () => {
    setError(null);
    try {
      // Request both video and audio
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userStream); // Store the stream to stop tracks later

      setCapturing(true);
      mediaRecorderRef.current = new MediaRecorder(userStream, {
        mimeType: 'video/webm; codecs=vp8,opus' // Common and widely supported
      });
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
      mediaRecorderRef.current.start();
      setRecordedChunks([]); // Clear previous chunks
      console.log("Recording started...");
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError("Could not access camera/microphone. Please ensure permissions are granted.");
      setCapturing(false);
    }
  }, [handleDataAvailable]);

  const stopCapturing = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setCapturing(false);
    // Stop all tracks in the stream to release camera/mic
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    console.log("Recording stopped.");
  }, [stream]);

  // --- Submit Answer and Progress Interview ---
  const handleSubmitAnswer = async () => {
    if (!candidateResponseText.trim()) {
      setError("Please provide a response before submitting.");
      return;
    }

    setIsLoading(true);
    setError(null);

    let videoBlob = null;
    // If we were capturing, stop and prepare the blob
    if (capturing) {
      stopCapturing(); // This will populate recordedChunks
      // Wait for recordedChunks to update, or process them directly here
      // For simplicity in this example, we'll assume recordedChunks updates synchronously
      // In a real app, you might use an event listener for mediaRecorder.onstop
    }

    if (recordedChunks.length > 0) {
      videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
    }

    const formData = new FormData();
    formData.append('text_response', candidateResponseText);
    if (videoBlob) {
      formData.append('video', videoBlob, 'interview_response.webm');
      formData.append('audio', videoBlob, 'interview_response.webm'); // Backend can extract audio from video
    }

    try {
      const currentQuestion = questions[currentQuestionIndex];
      const data = await submitInterviewAnswer(interviewId, currentQuestion.id, formData);
      console.log("Answer submitted:", data);

      setTranscript(prev => prev + `\nQ: ${currentQuestion.question_text}\nA: ${candidateResponseText}\nScore: ${data.score}%`);
      setCandidateResponseText('');
      setRecordedChunks([]); // Clear chunks for next question

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        startCapturing(); // Start recording for the next question automatically
      } else {
        // End of interview
        setInterviewStatus('finalizing');
        const finalData = await finalizeInterview(interviewId);
        setOverallScore(finalData.overall_score);
        setInterviewStatus('completed');
        console.log("Interview finalized. Score:", finalData.overall_score);
      }
    } catch (err) {
      setError(err.message || "Failed to submit answer.");
      console.error("Error submitting answer:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="chatbot-interviewer-container">
      <h2>AI Interviewer</h2>

      {isLoading && interviewStatus === 'idle' && <p>Loading interview setup...</p>}
      {error && <div className="error-message">{error}</div>}

      {overallScore !== null && interviewStatus === 'completed' ? (
        <div className="interview-complete-card">
          <h3>Interview Complete!</h3>
          <p>Your overall interview score: <strong>{overallScore}%</strong></p>
          <div className="transcript-section">
            <h4>Full Interview Transcript & Scores:</h4>
            <pre>{transcript}</pre>
          </div>
          <button onClick={() => navigate(`/candidate/${candidateId}`)} className="btn">
            View Candidate Profile
          </button>
        </div>
      ) : (
        interviewStatus === 'in-progress' && (
          <>
            <div className="question-area">
              <h3>Question {currentQuestionIndex + 1} of {questions.length}</h3>
              <p className="question-text">{currentQuestion ? currentQuestion.question_text : 'Loading question...'}</p>
            </div>

            <div className="webcam-section">
              <Webcam
                audio={true}
                mirrored={true} // So user sees themselves naturally
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
                style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', border: capturing ? '3px solid red' : '1px solid gray' }}
              />
              <p>{capturing ? '🔴 Recording your response...' : 'Click "Start Recording" to begin.'}</p>
              {!capturing ? (
                <button onClick={startCapturing} disabled={isLoading} className="btn btn-start">
                  Start Recording
                </button>
              ) : (
                <button onClick={stopCapturing} disabled={isLoading} className="btn btn-stop">
                  Stop Recording
                </button>
              )}
            </div>

            <div className="response-area">
              <textarea
                value={candidateResponseText}
                onChange={(e) => setCandidateResponseText(e.target.value)}
                placeholder="Transcribe your answer here (optional, or let AI do it)..."
                rows="5"
                disabled={isLoading}
              ></textarea>
              <button
                onClick={handleSubmitAnswer}
                disabled={isLoading || !candidateResponseText.trim()}
                className="btn btn-submit"
              >
                {isLoading ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>

            <div className="current-transcript">
              <h4>Current Transcript:</h4>
              <pre>{transcript || "No transcript yet. Responses will appear here."}</pre>
            </div>
          </>
        )
      )}
      {interviewStatus === 'finalizing' && <p>Finalizing interview results...</p>}
    </div>
  );
}

export default ChatbotInterviewer;
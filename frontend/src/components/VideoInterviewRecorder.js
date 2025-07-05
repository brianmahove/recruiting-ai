import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { uploadVideoInterview } from '../api';
import './VideoInterviewRecorder.css'; // Create this CSS file

function VideoInterviewRecorder() {
    const { candidateId, jobDescriptionId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [recording, setRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [videoBlob, setVideoBlob] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [stream, setStream] = useState(null);
    const [countdown, setCountdown] = useState(3);
    const [recordingStarted, setRecordingStarted] = useState(false);

    useEffect(() => {
        const setupCamera = async () => {
            try {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                videoRef.current.srcObject = userMediaStream;
                setStream(userMediaStream);
            } catch (err) {
                console.error("Error accessing camera/microphone:", err);
                setError("Please allow camera and microphone access to record the interview.");
            }
        };

        setupCamera();

        // Cleanup stream on component unmount
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]); // Dependency on stream to clean up properly

    const startCountdown = () => {
        setRecordingStarted(true);
        let count = 3;
        setCountdown(count);
        const timer = setInterval(() => {
            count--;
            setCountdown(count);
            if (count === 0) {
                clearInterval(timer);
                startRecording();
            }
        }, 1000);
    };


    const startRecording = () => {
        if (!stream) {
            setError("Camera/microphone stream not available.");
            return;
        }
        setRecordedChunks([]);
        setVideoBlob(null);
        setError(null);

        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                setRecordedChunks((prev) => [...prev, event.data]);
            }
        };
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            setVideoBlob(blob);
        };
        mediaRecorderRef.current.start();
        setRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const handleUpload = async () => {
        if (!videoBlob) {
            setError("No video recorded to upload.");
            return;
        }

        setUploading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('video', videoBlob, `interview_${candidateId}_${Date.now()}.webm`);
            formData.append('candidateId', candidateId);
            formData.append('jobDescriptionId', jobDescriptionId);
            formData.append('interviewType', 'Recorded'); // Or 'Live' if you implement live calls

            // You might want to calculate duration here
            const duration = videoRef.current.duration || 0;
            formData.append('durationSeconds', Math.round(duration));

            const response = await uploadVideoInterview(formData);
            console.log("Upload successful:", response);
            alert("Video interview uploaded and analysis triggered!");
            navigate(`/candidates/${candidateId}`); // Go back to candidate details
        } catch (err) {
            setError("Failed to upload video: " + err.message);
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="video-recorder-container">
            <h2>Record Video Interview</h2>
            <p className="recorder-intro">Prepare yourself for the interview. Ensure good lighting and a quiet environment.</p>

            <div className="video-display-area">
                <video ref={videoRef} autoPlay muted playsInline className="webcam-feed"></video>
                {recordingStarted && countdown > 0 && <div className="countdown-overlay">Interview starts in... {countdown}</div>}
                {recording && <div className="recording-indicator">RECORDING</div>}
            </div>

            <div className="recorder-controls">
                {!recordingStarted && (
                    <button onClick={startCountdown} className="start-record-btn">
                        Start Interview
                    </button>
                )}
                {recordingStarted && countdown === 0 && !recording && videoBlob === null && (
                    <button onClick={startRecording} className="start-record-btn" disabled={recording}>
                        Restart Recording
                    </button>
                )}
                {recording && (
                    <button onClick={stopRecording} className="stop-record-btn">
                        Stop Recording
                    </button>
                )}
                {videoBlob && !uploading && (
                    <button onClick={handleUpload} className="upload-record-btn" disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload Interview'}
                    </button>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {videoBlob && (
                <div className="recorded-video-preview">
                    <h3>Review Recorded Video:</h3>
                    <video src={URL.createObjectURL(videoBlob)} controls className="preview-video"></video>
                    <button onClick={() => { setVideoBlob(null); setRecordedChunks([]); setRecordingStarted(false); setCountdown(3); }} className="clear-video-btn">
                        Clear & Re-record
                    </button>
                </div>
            )}
        </div>
    );
}

export default VideoInterviewRecorder;
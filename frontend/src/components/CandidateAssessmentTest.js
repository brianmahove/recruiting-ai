import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startCandidateAssessment, fetchAssessmentQuestions, submitQuestionResponse, completeCandidateAssessment, fetchCandidateById } from '../api';
import './CandidateAssessmentTest.css'; // Create this CSS file

function CandidateAssessmentTest() {
    const { candidateId, assessmentId } = useParams();
    const navigate = useNavigate();

    const [candidate, setCandidate] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState({}); // {questionId: responseText}
    const [assessmentResultId, setAssessmentResultId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timer, setTimer] = useState(null); // For duration countdown (optional)
    const [timeRemaining, setTimeRemaining] = useState(0); // in seconds

    useEffect(() => {
        const loadAssessment = async () => {
            setLoading(true);
            try {
                const fetchedCandidate = await fetchCandidateById(candidateId);
                setCandidate(fetchedCandidate);

                const questionsData = await fetchAssessmentQuestions(assessmentId);
                setQuestions(questionsData.sort((a, b) => a.order - b.order)); // Ensure order

                // Start or resume assessment
                const result = await startCandidateAssessment(candidateId, assessmentId);
                setAssessmentResultId(result.id || result.resultId); // Handle existing or new

                // Optionally, load existing responses if resuming
                if (result.id) { // This means it's a new result, no existing responses
                    // If it's an existing result, fetch its responses to pre-populate
                    // For simplicity, we're not implementing 'resume' fully here,
                    // but you'd fetch /assessment_results/{result.id} to get existing responses
                }

                // If assessment has a duration, start timer
                // You'd need to fetch assessment details here to get durationMinutes
                // const assessmentDetails = await fetchAssessmentById(assessmentId);
                // if (assessmentDetails.durationMinutes) {
                //     setTimeRemaining(assessmentDetails.durationMinutes * 60);
                //     const interval = setInterval(() => {
                //         setTimeRemaining(prev => {
                //             if (prev <= 1) {
                //                 clearInterval(interval);
                //                 handleSubmitAssessment(); // Auto-submit on time up
                //                 return 0;
                //             }
                //             return prev - 1;
                //         });
                //     }, 1000);
                //     setTimer(interval);
                // }

                setLoading(false);
            } catch (err) {
                setError("Failed to load assessment. Ensure assessment and candidate IDs are correct.");
                setLoading(false);
                console.error(err);
            }
        };
        loadAssessment();

        // Cleanup timer on unmount
        // return () => {
        //     if (timer) clearInterval(timer);
        // };
    }, [candidateId, assessmentId]);

    const handleResponseChange = (questionId, value) => {
        setResponses(prev => ({ ...prev, [questionId]: value }));
    };

    const handleNextQuestion = async () => {
        const currentQuestion = questions[currentQuestionIndex];
        const responseText = responses[currentQuestion.id] || '';

        try {
            await submitQuestionResponse(assessmentResultId, {
                questionId: currentQuestion.id,
                responseText: responseText,
            });
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                handleSubmitAssessment();
            }
        } catch (err) {
            setError("Failed to submit response. Please try again.");
            console.error(err);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmitAssessment = async () => {
        try {
            // Ensure final question's response is submitted before completing
            if (currentQuestionIndex === questions.length - 1 && responses[questions[currentQuestionIndex].id] !== undefined) {
                 await submitQuestionResponse(assessmentResultId, {
                    questionId: questions[currentQuestionIndex].id,
                    responseText: responses[questions[currentQuestionIndex].id] || '',
                });
            }

            await completeCandidateAssessment(assessmentResultId);
            alert("Assessment completed! Results will be available shortly.");
            navigate(`/candidates/${candidateId}`); // Redirect to candidate detail
        } catch (err) {
            setError("Failed to complete assessment. Please try again.");
            console.error(err);
        }
    };

    if (loading) return <div className="loading-message">Loading assessment...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!questions.length) return <div className="no-data-message">No questions found for this assessment.</div>;
    if (!candidate) return <div className="no-data-message">Candidate not found.</div>;

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="candidate-assessment-test-container">
            <h2>Take Assessment</h2>
            <h3>For: {candidate.name}</h3>
            {/* Timer display (optional) */}
            {/* {timer && <div className="assessment-timer">Time Remaining: {Math.floor(timeRemaining / 60)}:{('0' + (timeRemaining % 60)).slice(-2)}</div>} */}

            <div className="question-display">
                <p className="question-number">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <p className="question-text">{currentQuestion.questionText}</p>
                <p className="question-points">({currentQuestion.points} points)</p>

                <div className="response-input">
                    {currentQuestion.questionType === 'OpenText' && (
                        <textarea
                            value={responses[currentQuestion.id] || ''}
                            onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
                            rows="6"
                            placeholder="Type your answer here..."
                        ></textarea>
                    )}
                    {(currentQuestion.questionType === 'MultipleChoice' || currentQuestion.questionType === 'TrueFalse') && (
                        <div className="options-container">
                            {currentQuestion.options.map((option, index) => (
                                <label key={index} className="option-label">
                                    <input
                                        type="radio"
                                        name={`question-${currentQuestion.id}`}
                                        value={option}
                                        checked={responses[currentQuestion.id] === option}
                                        onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
                                    />
                                    {option}
                                </label>
                            ))}
                        </div>
                    )}
                    {currentQuestion.questionType === 'CodeSnippet' && (
                         <textarea
                            value={responses[currentQuestion.id] || ''}
                            onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
                            rows="10"
                            placeholder="Enter your code here..."
                            className="code-snippet-input"
                         ></textarea>
                    )}
                </div>

                <div className="navigation-buttons">
                    <button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0} className="nav-btn prev-btn">
                        Previous
                    </button>
                    {currentQuestionIndex < questions.length - 1 ? (
                        <button onClick={handleNextQuestion} className="nav-btn next-btn">
                            Next
                        </button>
                    ) : (
                        <button onClick={handleSubmitAssessment} className="nav-btn submit-btn">
                            Submit Assessment
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CandidateAssessmentTest;
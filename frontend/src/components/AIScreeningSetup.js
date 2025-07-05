import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchJobDescriptionById, fetchScreeningQuestions, addScreeningQuestion, updateScreeningQuestion, deleteScreeningQuestion } from '../api';
import './AIScreeningSetup.css';

function AIScreeningSetup() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [jobDescription, setJobDescription] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionType, setNewQuestionType] = useState('text');
    const [newExpectedKeywords, setNewExpectedKeywords] = useState('');
    const [newIdealAnswer, setNewIdealAnswer] = useState('');
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadSetupData = async () => {
            setLoading(true);
            setError(null);
            try {
                const jd = await fetchJobDescriptionById(jobId);
                setJobDescription(jd);
                const q = await fetchScreeningQuestions(jobId);
                setQuestions(q);
                setLoading(false);
            } catch (err) {
                setError("Failed to load job description or screening questions.");
                setLoading(false);
            }
        };
        loadSetupData();
    }, [jobId]);

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        setError(null);
        if (!newQuestionText.trim()) {
            setError("Question text cannot be empty.");
            return;
        }

        const questionData = {
            jobDescriptionId: parseInt(jobId),
            questionText: newQuestionText,
            questionType: newQuestionType,
            expectedKeywords: newExpectedKeywords.split(',').map(k => k.trim()).filter(k => k),
            idealAnswer: newIdealAnswer,
            order: questions.length // Simple ordering for now
        };

        try {
            const addedQuestion = await addScreeningQuestion(questionData);
            setQuestions([...questions, addedQuestion]);
            setNewQuestionText('');
            setNewExpectedKeywords('');
            setNewIdealAnswer('');
            setNewQuestionType('text');
        } catch (err) {
            setError("Failed to add question.");
            console.error(err);
        }
    };

    const handleEditClick = (question) => {
        setEditingQuestionId(question.id);
        setNewQuestionText(question.questionText);
        setNewQuestionType(question.questionType);
        setNewExpectedKeywords(question.expectedKeywords.join(', '));
        setNewIdealAnswer(question.idealAnswer || '');
    };

    const handleUpdateQuestion = async (e) => {
        e.preventDefault();
        setError(null);
        if (!newQuestionText.trim()) {
            setError("Question text cannot be empty.");
            return;
        }

        const questionData = {
            questionText: newQuestionText,
            questionType: newQuestionType,
            expectedKeywords: newExpectedKeywords.split(',').map(k => k.trim()).filter(k => k),
            idealAnswer: newIdealAnswer,
        };

        try {
            const updatedQuestion = await updateScreeningQuestion(editingQuestionId, questionData);
            setQuestions(questions.map(q => q.id === editingQuestionId ? updatedQuestion : q));
            setEditingQuestionId(null);
            setNewQuestionText('');
            setNewExpectedKeywords('');
            setNewIdealAnswer('');
            setNewQuestionType('text');
        } catch (err) {
            setError("Failed to update question.");
            console.error(err);
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (window.confirm("Are you sure you want to delete this question?")) {
            setError(null);
            try {
                await deleteScreeningQuestion(questionId);
                setQuestions(questions.filter(q => q.id !== questionId));
            } catch (err) {
                setError("Failed to delete question.");
                console.error(err);
            }
        }
    };

    // Basic drag and drop reordering
    const handleDragStart = (e, index) => {
        e.dataTransfer.setData("questionIndex", index);
    };

    const handleDrop = async (e, dropIndex) => {
        const dragIndex = e.dataTransfer.getData("questionIndex");
        const draggedQuestion = questions[dragIndex];
        const newQuestions = [...questions];
        newQuestions.splice(dragIndex, 1); // Remove dragged item
        newQuestions.splice(dropIndex, 0, draggedQuestion); // Insert at new position

        // Update order in state immediately for visual feedback
        setQuestions(newQuestions);

        // Update order in backend
        try {
            // Re-assign order numbers and send updates
            for (let i = 0; i < newQuestions.length; i++) {
                if (newQuestions[i].order !== i) { // Only update if order changed
                    await updateScreeningQuestion(newQuestions[i].id, { order: i });
                    newQuestions[i].order = i; // Update the local object too
                }
            }
            setQuestions([...newQuestions]); // Final update with backend confirmed order
        } catch (err) {
            setError("Failed to update question order.");
            console.error(err);
            // Optionally, revert to original order if backend fails
            const originalQuestions = await fetchScreeningQuestions(jobId);
            setQuestions(originalQuestions);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    if (loading) return <div className="loading-message">Loading AI Screening Setup...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!jobDescription) return <div className="no-data-message">Job Description not found.</div>;

    return (
        <div className="ai-screening-setup-container">
            <button onClick={() => navigate(`/job-descriptions/${jobId}`)} className="back-button">← Back to Job Description</button>
            <h2>AI Screening Setup for: "{jobDescription.title}"</h2>

            <div className="question-form-section">
                <h3>{editingQuestionId ? 'Edit Question' : 'Add New Question'}</h3>
                <form onSubmit={editingQuestionId ? handleUpdateQuestion : handleAddQuestion}>
                    <div className="form-group">
                        <label htmlFor="questionText">Question Text:</label>
                        <textarea
                            id="questionText"
                            value={newQuestionText}
                            onChange={(e) => setNewQuestionText(e.target.value)}
                            rows="3"
                            required
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="questionType">Question Type:</label>
                        <select
                            id="questionType"
                            value={newQuestionType}
                            onChange={(e) => setNewQuestionType(e.target.value)}
                        >
                            <option value="text">Text (Chatbot)</option>
                            <option value="voice">Voice (Speech-to-Text, Tone Analysis)</option>
                            <option value="video">Video (Facial Analysis, Voice)</option>
                            {/* Add 'multiple_choice' later if needed */}
                        </select>
                    </div>
                    {newQuestionType === 'text' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="expectedKeywords">Expected Keywords (comma-separated):</label>
                                <input
                                    type="text"
                                    id="expectedKeywords"
                                    value={newExpectedKeywords}
                                    onChange={(e) => setNewExpectedKeywords(e.target.value)}
                                    placeholder="e.g., 'problem solving, teamwork, leadership'"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="idealAnswer">Ideal Answer (for detailed comparison):</label>
                                <textarea
                                    id="idealAnswer"
                                    value={newIdealAnswer}
                                    onChange={(e) => setNewIdealAnswer(e.target.value)}
                                    rows="5"
                                    placeholder="Provide a comprehensive ideal answer to help AI score more accurately."
                                ></textarea>
                            </div>
                        </>
                    )}
                    <div className="form-actions">
                        <button type="submit" className="add-update-btn">
                            {editingQuestionId ? 'Update Question' : 'Add Question'}
                        </button>
                        {editingQuestionId && (
                            <button type="button" onClick={() => {
                                setEditingQuestionId(null);
                                setNewQuestionText('');
                                setNewExpectedKeywords('');
                                setNewIdealAnswer('');
                                setNewQuestionType('text');
                            }} className="cancel-edit-btn">Cancel Edit</button>
                        )}
                    </div>
                </form>
            </div>

            <div className="question-list-section">
                <h3>Current Questions ({questions.length}) - Drag to Reorder</h3>
                {questions.length === 0 ? (
                    <p>No questions added yet for this job description.</p>
                ) : (
                    <ul className="question-list">
                        {questions.sort((a,b) => a.order - b.order).map((q, index) => (
                            <li
                                key={q.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragOver={handleDragOver}
                                className="question-item"
                            >
                                <div className="question-content">
                                    <span className="question-order">{index + 1}.</span>
                                    <p>{q.questionText}</p>
                                    <span className={`question-type-badge type-${q.questionType}`}>{q.questionType}</span>
                                </div>
                                <div className="question-actions">
                                    <button onClick={() => handleEditClick(q)} className="edit-btn">Edit</button>
                                    <button onClick={() => handleDeleteQuestion(q.id)} className="delete-btn">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default AIScreeningSetup;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAssessmentById, fetchAssessmentQuestions, addAssessmentQuestion, updateAssessmentQuestion, deleteAssessmentQuestion } from '../api';
import './AssessmentDetail.css'; // Create this CSS file

function AssessmentDetail() {
    const { id } = useParams(); // Assessment ID
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for new question form
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionType, setNewQuestionType] = useState('OpenText');
    const [newQuestionOptions, setNewQuestionOptions] = useState(''); // Comma-separated for simplicity
    const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
    const [newQuestionPoints, setNewQuestionPoints] = useState(10);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [editingQuestionId, setEditingQuestionId] = useState(null); // ID of question being edited

    const fetchAssessmentAndQuestions = async () => {
        setLoading(true);
        try {
            const fetchedAssessment = await fetchAssessmentById(id);
            setAssessment(fetchedAssessment);
            const fetchedQuestions = await fetchAssessmentQuestions(id);
            setQuestions(fetchedQuestions);
            setLoading(false);
        } catch (err) {
            setError("Failed to load assessment details or questions.");
            setLoading(false);
            console.error(err);
        }
    };

    useEffect(() => {
        fetchAssessmentAndQuestions();
    }, [id]);

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        setError(null);
        if (!newQuestionText) {
            setError("Question text is required.");
            return;
        }

        const questionData = {
            questionText: newQuestionText,
            questionType: newQuestionType,
            options: newQuestionOptions.split(',').map(opt => opt.trim()).filter(opt => opt), // Convert to array
            correctAnswer: newCorrectAnswer,
            points: newQuestionPoints,
        };

        try {
            await addAssessmentQuestion(id, questionData);
            setNewQuestionText('');
            setNewQuestionType('OpenText');
            setNewQuestionOptions('');
            setNewCorrectAnswer('');
            setNewQuestionPoints(10);
            setIsAddingQuestion(false);
            fetchAssessmentAndQuestions(); // Re-fetch to update list
        } catch (err) {
            setError("Failed to add question.");
            console.error(err);
        }
    };

    const handleEditQuestionClick = (question) => {
        setEditingQuestionId(question.id);
        setNewQuestionText(question.questionText);
        setNewQuestionType(question.questionType);
        setNewQuestionOptions(question.options ? question.options.join(', ') : '');
        setNewCorrectAnswer(question.correctAnswer || '');
        setNewQuestionPoints(question.points);
        setIsAddingQuestion(true); // Re-use the form for editing
    };

    const handleUpdateQuestion = async (e) => {
        e.preventDefault();
        setError(null);
        if (!newQuestionText) {
            setError("Question text is required.");
            return;
        }

        const questionData = {
            questionText: newQuestionText,
            questionType: newQuestionType,
            options: newQuestionOptions.split(',').map(opt => opt.trim()).filter(opt => opt),
            correctAnswer: newCorrectAnswer,
            points: newQuestionPoints,
        };

        try {
            await updateAssessmentQuestion(editingQuestionId, questionData);
            setEditingQuestionId(null); // Exit editing mode
            setIsAddingQuestion(false);
            setNewQuestionText(''); // Clear form
            setNewQuestionOptions('');
            setNewCorrectAnswer('');
            fetchAssessmentAndQuestions(); // Re-fetch to update list
        } catch (err) {
            setError("Failed to update question.");
            console.error(err);
        }
    };

    const handleDeleteQuestion = async (questionId, questionText) => {
        if (window.confirm(`Are you sure you want to delete the question "${questionText}"?`)) {
            try {
                await deleteAssessmentQuestion(questionId);
                fetchAssessmentAndQuestions(); // Re-fetch
            } catch (err) {
                setError("Failed to delete question.");
                console.error(err);
            }
        }
    };

    const handleCancelForm = () => {
        setIsAddingQuestion(false);
        setEditingQuestionId(null);
        setNewQuestionText('');
        setNewQuestionType('OpenText');
        setNewQuestionOptions('');
        setNewCorrectAnswer('');
        setNewQuestionPoints(10);
        setError(null);
    };


    if (loading) return <div className="loading-message">Loading assessment...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!assessment) return <div className="no-data-message">Assessment not found.</div>;

    return (
        <div className="assessment-detail-container">
            <button onClick={() => navigate('/assessments')} className="back-button">← Back to Assessments</button>
            <h2>{assessment.title} ({assessment.assessmentType})</h2>
            <p><strong>Description:</strong> {assessment.description || 'No description.'}</p>
            <p><strong>Duration:</strong> {assessment.durationMinutes ? `${assessment.durationMinutes} minutes` : 'Not specified'}</p>
            {assessment.jobDescriptionId && <p><strong>Linked Job ID:</strong> {assessment.jobDescriptionId}</p>}
            <p><strong>Created:</strong> {new Date(assessment.createdAt).toLocaleDateString()}</p>

            <hr/>

            <h3>Questions ({questions.length})</h3>
            <button onClick={() => setIsAddingQuestion(!isAddingQuestion)} className="toggle-add-question-btn">
                {isAddingQuestion ? 'Hide Form' : '+ Add New Question'}
            </button>

            {isAddingQuestion && (
                <form onSubmit={editingQuestionId ? handleUpdateQuestion : handleAddQuestion} className="question-form">
                    <h4>{editingQuestionId ? 'Edit Question' : 'Add New Question'}</h4>
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
                            <option value="OpenText">Open Text</option>
                            <option value="MultipleChoice">Multiple Choice</option>
                            <option value="TrueFalse">True/False</option>
                            <option value="CodeSnippet">Code Snippet</option>
                        </select>
                    </div>

                    {(newQuestionType === 'MultipleChoice' || newQuestionType === 'TrueFalse') && (
                        <div className="form-group">
                            <label htmlFor="options">Options (comma-separated):</label>
                            <input
                                type="text"
                                id="options"
                                value={newQuestionOptions}
                                onChange={(e) => setNewQuestionOptions(e.target.value)}
                                placeholder="e.g., Option A, Option B, Option C"
                            />
                        </div>
                    )}

                    {(newQuestionType !== 'CodeSnippet') && ( // Code snippets often require manual grading or external tools
                        <div className="form-group">
                            <label htmlFor="correctAnswer">Correct Answer / Keywords:</label>
                            <input
                                type="text"
                                id="correctAnswer"
                                value={newCorrectAnswer}
                                onChange={(e) => setNewCorrectAnswer(e.target.value)}
                                placeholder={newQuestionType === 'OpenText' ? "Keywords (e.g., 'API, REST, JSON')" : "Exact answer (e.g., 'True' or 'Option A')"}
                            />
                        </div>
                    )}

                     <div className="form-group">
                        <label htmlFor="points">Points:</label>
                        <input
                            type="number"
                            id="points"
                            value={newQuestionPoints}
                            onChange={(e) => setNewQuestionPoints(parseInt(e.target.value))}
                            min="1"
                            max="100"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-btn">
                            {editingQuestionId ? 'Update Question' : 'Add Question'}
                        </button>
                        <button type="button" onClick={handleCancelForm} className="cancel-btn">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <ul className="question-list">
                {questions.map((question) => (
                    <li key={question.id} className="question-item">
                        <p><strong>{question.order + 1}. ({question.questionType}, {question.points} points)</strong> {question.questionText}</p>
                        {question.options && question.options.length > 0 && (
                            <p>Options: {question.options.join(', ')}</p>
                        )}
                        <p>Correct: {question.correctAnswer || 'N/A (for Open Text)'}</p>
                        <div className="question-actions">
                            <button onClick={() => handleEditQuestionClick(question)} className="edit-question-btn">Edit</button>
                            <button onClick={() => handleDeleteQuestion(question.id, question.questionText)} className="delete-question-btn">Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default AssessmentDetail;
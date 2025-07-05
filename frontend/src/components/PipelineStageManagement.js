import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPipelineStages, createPipelineStage, updatePipelineStage, deletePipelineStage } from '../api';
import './PipelineStageManagement.css'; // Create this CSS file

function PipelineStageManagement() {
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newStageName, setNewStageName] = useState('');
    const [newStageDescription, setNewStageDescription] = useState('');
    const [editingStageId, setEditingStageId] = useState(null);
    const [editingStageName, setEditingStageName] = useState('');
    const [editingStageDescription, setEditingStageDescription] = useState('');
    const navigate = useNavigate();

    const loadStages = async () => {
        setLoading(true);
        try {
            const data = await fetchPipelineStages();
            setStages(data);
            setLoading(false);
        } catch (err) {
            setError("Failed to load pipeline stages.");
            setLoading(false);
            console.error(err);
        }
    };

    useEffect(() => {
        loadStages();
    }, []);

    const handleCreateStage = async (e) => {
        e.preventDefault();
        setError(null);
        if (!newStageName.trim()) {
            setError("Stage name cannot be empty.");
            return;
        }
        try {
            await createPipelineStage({ name: newStageName, description: newStageDescription });
            setNewStageName('');
            setNewStageDescription('');
            loadStages(); // Reload stages to update list
        } catch (err) {
            setError(err.message || "Failed to create stage.");
            console.error(err);
        }
    };

    const handleEditClick = (stage) => {
        setEditingStageId(stage.id);
        setEditingStageName(stage.name);
        setEditingStageDescription(stage.description || '');
    };

    const handleUpdateStage = async (e, stageId) => {
        e.preventDefault();
        setError(null);
        if (!editingStageName.trim()) {
            setError("Stage name cannot be empty.");
            return;
        }
        try {
            await updatePipelineStage(stageId, { name: editingStageName, description: editingStageDescription });
            setEditingStageId(null);
            setEditingStageName('');
            setEditingStageDescription('');
            loadStages(); // Reload stages
        } catch (err) {
            setError(err.message || "Failed to update stage.");
            console.error(err);
        }
    };

    const handleDeleteStage = async (stageId, stageName, isDefault) => {
        if (isDefault) {
            alert("Default pipeline stages cannot be deleted.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete the stage "${stageName}"? Candidates currently in this stage will be moved to "New Candidate".`)) {
            try {
                await deletePipelineStage(stageId);
                loadStages(); // Reload stages
            } catch (err) {
                setError(err.message || "Failed to delete stage.");
                console.error(err);
            }
        }
    };

    const handleMoveStage = async (stageId, newOrder) => {
        setError(null);
        try {
            await updatePipelineStage(stageId, { order: newOrder });
            loadStages(); // Reload stages to reflect new order
        } catch (err) {
            setError(err.message || "Failed to reorder stage.");
            console.error(err);
        }
    };

    if (loading) return <div className="loading-message">Loading pipeline stages...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="pipeline-management-container">
            <h2>Pipeline Stage Management</h2>
            <p className="intro-text">Customize the stages in your candidate hiring pipeline. Drag and drop to reorder.</p>

            <div className="add-stage-section">
                <h3>{editingStageId ? 'Edit Stage' : 'Add New Stage'}</h3>
                <form onSubmit={editingStageId ? (e) => handleUpdateStage(e, editingStageId) : handleCreateStage} className="stage-form">
                    <div className="form-group">
                        <label htmlFor="stageName">Stage Name:</label>
                        <input
                            type="text"
                            id="stageName"
                            value={editingStageId ? editingStageName : newStageName}
                            onChange={(e) => editingStageId ? setEditingStageName(e.target.value) : setNewStageName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="stageDescription">Description (Optional):</label>
                        <textarea
                            id="stageDescription"
                            value={editingStageId ? editingStageDescription : newStageDescription}
                            onChange={(e) => editingStageId ? setEditingStageDescription(e.target.value) : setNewStageDescription(e.target.value)}
                            rows="2"
                        ></textarea>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="submit-btn">
                            {editingStageId ? 'Update Stage' : 'Create Stage'}
                        </button>
                        {editingStageId && (
                            <button type="button" onClick={() => { setEditingStageId(null); setNewStageName(''); setNewStageDescription(''); setError(null); }} className="cancel-btn">
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="stage-list-section">
                <h3>Current Stages ({stages.length})</h3>
                {stages.length === 0 ? (
                    <p className="no-data-message">No custom stages defined. Default stages are always available.</p>
                ) : (
                    <ul className="stage-list">
                        {stages.map((stage, index) => (
                            <li key={stage.id} className="stage-item">
                                <div className="stage-content">
                                    <span className="stage-order">{stage.order + 1}.</span>
                                    <p>{stage.name} {stage.isDefault && <span className="default-badge">(Default)</span>}</p>
                                    {stage.description && <span className="stage-description">{stage.description}</span>}
                                </div>
                                <div className="stage-actions">
                                    <button onClick={() => handleEditClick(stage)} className="edit-btn">Edit</button>
                                    <button onClick={() => handleDeleteStage(stage.id, stage.name, stage.isDefault)} disabled={stage.isDefault} className="delete-btn">Delete</button>
                                    <button onClick={() => handleMoveStage(stage.id, stage.order - 1)} disabled={stage.order === 0} className="move-btn">▲</button>
                                    <button onClick={() => handleMoveStage(stage.id, stage.order + 1)} disabled={stage.order === stages.length - 1} className="move-btn">▼</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default PipelineStageManagement;
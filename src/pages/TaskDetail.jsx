import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import mockTasks from "../data/mockTasks.js";
import "../styles/TaskDetail.css";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const originalTask = mockTasks.find((t) => t.id === id);

  const [task, setTask] = useState(originalTask);
  const [saved, setSaved] = useState(false);

  if (!task) {
    return (
      <div className="task-detail">
        <p>Task not found.</p>
        <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
          &larr; Back to Dashboard
        </button>
      </div>
    );
  }

  const handleChange = (field, value) => {
    setTask((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    // Local-only update for now — Week 3 will PUT this to /api/tasks/:id
    setSaved(true);
  };

  return (
    <div className="task-detail">
      <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
        &larr; Back to Dashboard
      </button>

      <div className="task-detail-card">
        <label>
          Title
          <input
            type="text"
            value={task.title}
            onChange={(e) => handleChange("title", e.target.value)}
          />
        </label>

        <label>
          Description
          <textarea
            rows={4}
            value={task.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </label>

        <div className="task-detail-row">
          <label>
            Status
            <select
              value={task.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </label>

          <label>
            Due Date
            <input
              type="date"
              value={task.dueDate}
              onChange={(e) => handleChange("dueDate", e.target.value)}
            />
          </label>
        </div>

        <button className="btn-primary" onClick={handleSave}>
          Save Changes
        </button>
        {saved && <span className="saved-note">Saved locally ✓</span>}
      </div>
    </div>
  );
}

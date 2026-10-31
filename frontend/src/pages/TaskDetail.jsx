import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { toDateInput } from "../utils/format.js";
import "../styles/TaskDetail.css";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.getTask(id);
        if (!cancelled) setTask(res.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleChange(field, value) {
    setTask((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await api.updateTask(id, {
        title: task.title,
        description: task.description,
        status: task.status,
        dueDate: task.dueDate || null,
      });
      setTask(res.data);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await api.deleteTask(id);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="task-detail"><p className="status-text">Loading task...</p></div>;

  if (error && !task) {
    return (
      <div className="task-detail">
        <p className="status-text error-text" role="alert">{error}</p>
        <button className="btn-secondary" onClick={() => navigate("/dashboard")}>&larr; Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="task-detail">
      <button className="btn-secondary" onClick={() => navigate("/dashboard")}>&larr; Back to Dashboard</button>

      <div className="task-detail-card">
        {error && <p className="auth-error" role="alert">{error}</p>}
        <label>
          Title
          <input type="text" value={task.title} onChange={(e) => handleChange("title", e.target.value)} />
        </label>
        <label>
          Description
          <textarea rows={4} value={task.description || ""} onChange={(e) => handleChange("description", e.target.value)} />
        </label>
        <div className="task-detail-row">
          <label>
            Status
            <select value={task.status} onChange={(e) => handleChange("status", e.target.value)}>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label>
            Due Date
            <input
              type="date"
              value={toDateInput(task.dueDate)}
              onChange={(e) => handleChange("dueDate", e.target.value)}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        {saved && <span className="saved-note">Saved to server ✓</span>}
      </div>
    </div>
  );
}

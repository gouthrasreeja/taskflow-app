import { useEffect, useState } from "react";
import TaskCard from "../components/TaskCard.jsx";
import NewTaskModal from "../components/NewTaskModal.jsx";
import { api } from "../api/client.js";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);

  // Refetch from the API when the filter or (debounced) search term changes.
  // `cancelled` guards against a slow earlier response overwriting a newer one.
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (filter !== "all") params.status = filter;
        if (search) params.search = search;
        const res = await api.getTasks(params);
        if (!cancelled) setTasks(res.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, filter]);

  async function handleCreate(taskData) {
    const res = await api.createTask(taskData);
    // Only insert locally if it matches the active filter; otherwise it would
    // appear under the wrong tab until the next refetch.
    if (filter === "all" || filter === res.data.status) {
      setTasks((prev) => [res.data, ...prev]);
    }
    setShowNewTask(false);
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your Tasks</h1>
        <button className="btn-primary" onClick={() => setShowNewTask(true)}>+ New Task</button>
      </div>

      <div className="dashboard-controls">
        <input
          type="text"
          placeholder="Search tasks..."
          aria-label="Search tasks"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
          {["all", "pending", "in-progress", "done"].map((f) => (
            <button
              key={f}
              className={filter === f ? "filter-btn active" : "filter-btn"}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="status-text">Loading tasks...</p>}
      {error && <p className="status-text error-text" role="alert">{error}</p>}

      {!loading && !error && (
        <div className="task-list">
          {tasks.length > 0 ? (
            tasks.map((task) => <TaskCard key={task._id} task={task} />)
          ) : (
            <p className="empty-state">No tasks yet. Create your first one!</p>
          )}
        </div>
      )}

      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} onCreate={handleCreate} />}
    </div>
  );
}

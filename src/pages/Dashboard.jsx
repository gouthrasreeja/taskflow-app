import { useMemo, useState } from "react";
import TaskCard from "../components/TaskCard.jsx";
import mockTasks from "../data/mockTasks.js";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredTasks = useMemo(() => {
    return mockTasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesFilter = filter === "all" || task.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your Tasks</h1>
        <button className="btn-primary" disabled title="Backend not connected yet — coming in Week 3">
          + New Task
        </button>
      </div>

      <div className="dashboard-controls">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
          {["all", "pending", "in-progress", "done"].map((f) => (
            <button
              key={f}
              className={filter === f ? "filter-btn active" : "filter-btn"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="task-list">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <p className="empty-state">No tasks match your search/filter.</p>
        )}
      </div>
    </div>
  );
}

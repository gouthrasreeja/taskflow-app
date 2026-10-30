import { useNavigate } from "react-router-dom";
import "../styles/TaskCard.css";

const statusLabels = {
  pending: "Pending",
  "in-progress": "In Progress",
  done: "Done",
};

export default function TaskCard({ task }) {
  const navigate = useNavigate();

  return (
    <div
      className="task-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/tasks/${task._id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/tasks/${task._id}`)}
    >
      <div className="task-card-main">
        <h3>{task.title}</h3>
        <p className="task-due">{task.dueDate ? `Due: ${task.dueDate.slice(0, 10)}` : "No due date"}</p>
      </div>
      <span className={`status-badge status-${task.status}`}>
        {statusLabels[task.status]}
      </span>
    </div>
  );
}

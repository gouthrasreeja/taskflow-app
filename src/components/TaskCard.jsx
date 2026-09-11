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
      onClick={() => navigate(`/tasks/${task.id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/tasks/${task.id}`)}
    >
      <div className="task-card-main">
        <h3>{task.title}</h3>
        <p className="task-due">Due: {task.dueDate}</p>
      </div>
      <span className={`status-badge status-${task.status}`}>
        {statusLabels[task.status]}
      </span>
    </div>
  );
}

import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDueDate } from "../utils/format.js";
import "../styles/TaskCard.css";

const statusLabels = {
  pending: "Pending",
  "in-progress": "In Progress",
  done: "Done",
};

// memo: typing in the search box re-renders Dashboard on every keystroke; without memo every card
// re-rendered each time. With stable `task` objects, React now skips unchanged cards.
function TaskCard({ task }) {
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
        <p className="task-due">{formatDueDate(task.dueDate)}</p>
      </div>
      <span className={`status-badge status-${task.status}`}>
        {statusLabels[task.status]}
      </span>
    </div>
  );
}

export default memo(TaskCard);

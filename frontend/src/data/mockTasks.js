// Mock data shaped exactly like the MongoDB Task schema designed in Week 1.
// In Week 3+, this will be replaced by real API calls to /api/tasks.

const mockTasks = [
  {
    id: "1",
    title: "Finish project brief",
    description:
      "Write the one-page project brief covering purpose, target users, and core features for the TaskFlow app.",
    status: "pending",
    dueDate: "2026-09-15",
  },
  {
    id: "2",
    title: "Design wireframes",
    description:
      "Sketch low-fidelity wireframes for the login screen and dashboard using draw.io.",
    status: "in-progress",
    dueDate: "2026-09-12",
  },
  {
    id: "3",
    title: "Set up MongoDB schema",
    description:
      "Define the Users and Tasks collections with Mongoose, including the one-to-many relationship.",
    status: "done",
    dueDate: "2026-09-10",
  },
  {
    id: "4",
    title: "Build React dashboard",
    description:
      "Implement the dashboard view with search, filter, and a list of task cards connected to mock data.",
    status: "in-progress",
    dueDate: "2026-09-18",
  },
  {
    id: "5",
    title: "Write API documentation",
    description:
      "Document all REST endpoints (signup, login, task CRUD) so the back-end team (or future me) can reference them easily.",
    status: "pending",
    dueDate: "2026-09-20",
  },
];

export default mockTasks;

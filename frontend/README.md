# TaskFlow — Front-End (Weeks 2 & 4)

A responsive, multi-view front-end for the TaskFlow task management app, built with **React 18**, **React Router**, and **Vite**. This implements the UI designed in the Week 1 planning phase (see wireframes and architecture in the Week 1 submission).

## Views

| Route | View | Description |
|---|---|---|
| `/` | Landing Page | Marketing hero, feature highlights, "Get Started" CTA into the app |
| `/dashboard` | Dashboard | Task list with live search and status filtering (Pending / In Progress / Done) |
| `/tasks/:id` | Task Detail | Editable task detail form (title, description, status, due date) |

All three views are connected through a persistent navbar and in-page navigation (clicking a task card opens its detail view; the detail view links back to the dashboard).

## Development Process

1. Started from the Week 1 system architecture and wireframes to define the three required views and their navigation flow.
2. Set up the project with **Vite** for fast local development (chosen over Create React App for its speed and simpler config).
3. Built reusable components (`Navbar`, `TaskCard`) before page-level components, to keep the UI consistent and DRY.
4. Used **React Router v6** for client-side routing between the three views.
5. Used local component state (`useState`, `useMemo`) to drive search, filtering, and the editable detail form — no global state library was needed at this scale.
6. Styled with plain CSS using CSS custom properties (`:root` variables) for a consistent design system (colors, radius, shadows) shared across all components.
7. Added responsive breakpoints (`@media` queries) so the layout adapts cleanly from desktop down to ~375px mobile widths.
8. Data is currently mocked in `src/data/mockTasks.js`, shaped to match the MongoDB schema designed in Week 1 — this will be swapped for real API calls (`/api/tasks`) once the back-end is built in a later week.

## Design Patterns & Libraries

- **Component-based architecture** — pages (`Landing`, `Dashboard`, `TaskDetail`) compose smaller reusable components (`Navbar`, `TaskCard`).
- **Controlled components** — all form inputs in the Task Detail view are controlled via React state.
- **Derived state with `useMemo`** — the filtered task list in the Dashboard is recomputed only when `search` or `filter` change, avoiding unnecessary re-computation.
- **React Router v6** (`react-router-dom`) for declarative routing and navigation (`useNavigate`, `useParams`, `NavLink`).
- No CSS framework — custom CSS was used to keep the bundle small and match the exact design from the Week 1 wireframes.

## Project Structure

```
src/
  components/
    Navbar.jsx        # Top navigation bar, shown on every page
    TaskCard.jsx       # Individual task row on the dashboard
  pages/
    Landing.jsx        # View 1: marketing / entry page
    Dashboard.jsx       # View 2: task list with search & filter
    TaskDetail.jsx      # View 3: single task detail & edit form
  data/
    mockTasks.js        # Mock data matching the Week 1 MongoDB schema
  styles/
    *.css               # One stylesheet per component/page
  App.jsx               # Route definitions
  main.jsx              # App entry point
```

## Running Locally

Requires [Node.js](https://nodejs.org/) v22 or later (24 LTS recommended).

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Open the app
# Vite will print a local URL, typically:
http://localhost:5173
```

To create a production build:

```bash
npm run build
npm run preview
```

## Notes

- The "+ New Task" button on the dashboard is intentionally disabled for now — task creation will be wired up once the back-end API (Week 3+) is available.
- Edits made in the Task Detail view are saved to local component state only (not persisted) until the back-end integration is complete.

## Week 4 update: connected to the real API

The mock data file was removed. The app now signs users up and in, stores the JWT, and loads/creates/updates/deletes tasks through `src/api/client.js`. Set `VITE_API_URL` in `.env` (see `.env.example`) and make sure the back-end is running. See the repository root README for full setup and the integration write-up.

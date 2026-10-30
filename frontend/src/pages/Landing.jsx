import { Link } from "react-router-dom";
import "../styles/Landing.css";

export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <h1>Organize your work. Actually finish it.</h1>
        <p>
          TaskFlow is a lightweight task manager built for students, freelancers,
          and small teams who want clarity without the complexity of heavier
          tools like Jira or Asana.
        </p>
        <Link to="/dashboard" className="btn-primary">
          Get Started &rarr;
        </Link>
      </section>

      <section className="features">
        <div className="feature-card">
          <h3>Simple task tracking</h3>
          <p>Create, edit, and organize tasks with statuses that actually make sense.</p>
        </div>
        <div className="feature-card">
          <h3>Search &amp; filter</h3>
          <p>Find what matters instantly with built-in search and status filters.</p>
        </div>
        <div className="feature-card">
          <h3>Built to scale</h3>
          <p>A clean architecture (React + Node + MongoDB) ready to grow with you.</p>
        </div>
      </section>
    </div>
  );
}

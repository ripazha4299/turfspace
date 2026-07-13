import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page home-page">
      <section className="hero">
        <h1>Land in a new city. Find your game — and your people — in minutes.</h1>
        <p className="subtle">
          TurfSpace connects relocating professionals with local turfs and playing communities,
          and helps turf owners fill empty slots without spending on ads.
        </p>
        <div className="hero-actions">
          <Link to="/search" className="btn-primary">Find a turf</Link>
          <Link to="/open" className="btn-secondary">Join an open game</Link>
        </div>
      </section>

      <section className="how-it-works">
        <div className="how-card">
          <h3>Search</h3>
          <p>Find turfs near you with real-time availability, rates, and schedules.</p>
        </div>
        <div className="how-card">
          <h3>Book or join</h3>
          <p>Book privately, or mark it open so others nearby can join your game.</p>
        </div>
        <div className="how-card">
          <h3>Play</h3>
          <p>Build a playing circle in your new city instead of starting from zero.</p>
        </div>
      </section>
    </div>
  );
}

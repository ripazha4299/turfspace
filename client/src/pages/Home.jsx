import { Link } from 'react-router-dom';
import searchIcon from '../assets/icons/search-icon-homepage.png';
import bookOrJoinIcon from '../assets/icons/bookOrjoin-icon-homepage.png';
import groupsIcon from '../assets/icons/groups-icon-homepage.png';
import footballIcon from '../assets/icons/football.jpg';
import cricketIcon from '../assets/icons/cricket.jpg';
import badmintonIcon from '../assets/icons/badminton.jpg';
import basketballIcon from '../assets/icons/basketball.jpg';

const featureCards = [
  {
    title: 'Search',
    description: 'Find turfs near you with real-time availability, rates, and schedules.',
    accent: 'mint',
    icon: searchIcon,
  },
  {
    title: 'Book or join',
    description: 'Book privately or mark it open so others nearby can join your game.',
    accent: 'gold',
    icon: bookOrJoinIcon,
  },
  {
    title: 'Play',
    description: 'Build a playing circle in your new city instead of starting from zero.',
    accent: 'blue',
    icon: groupsIcon,
  },
];

const turfCards = [
  {
    title: 'Football',
    badge: '12 OPEN',
    accent: 'mint',
    image: footballIcon
  },
  {
    title: 'Cricket',
    badge: '4 OPEN',
    accent: 'gold',
    image: cricketIcon
  },
  {
    title: 'Basketball',
    badge: 'ACTIVE',
    accent: 'blue',
    image: basketballIcon,
  },
  {
    title: 'badminton',
    badge: 'FULL',
    accent: 'muted',
    image: badmintonIcon,
  },
];

export default function Home() {
  return (
    <div className="home-shell">
      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge">PLAYER 1 READY?</div>
            <h1>
              Land in a new city.
              <br />
              <span>Find your game</span>
              <br />
              — and your people.
            </h1>
            <p className="subtle">
              TurfSpace connects relocating professionals with local turfs and playing communities,
              and helps turf owners fill empty slots without spending on ads.
            </p>
            <div className="hero-actions">
              <Link to="/search" className="home-btn-primary">
                FIND TURFS
              </Link>
              <Link to="/open" className="home-btn-secondary">
                JOIN AN OPEN GAME
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="features-section">
          <div className="section-heading">
            <h2>System Features</h2>
            <div className="section-divider" />
          </div>
          <div className="feature-grid">
            {featureCards.map((card) => (
              <article key={card.title} className={`feature-card feature-card-homepage ${card.accent}`}>
                <div className="feature-icon">
                  <img src={card.icon} alt={card.title} className="feature-icon-image" />
                </div>
                <div className="feature-content">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="open-games" className="turf-section">
          <div className="section-heading section-heading-row">
            <div>
              <h2>Choose Your Turf</h2>
              <p>Select your specialty and find the right arena.</p>
            </div>
            <Link to="/search" className="home-link-btn">
              VIEW ALL (50+)
            </Link>
          </div>
          <div className="turf-grid">
            {turfCards.map((card) => (
              <article key={card.title} className={`turf-card ${card.accent}`}>
                <div className="turf-image">
                  {card.image ? <img src={card.image} alt={card.title} /> : <div className="turf-placeholder" />}
                </div>
                <div className="turf-card-footer">
                  <span style={{ paddingLeft: '10px' }}>{card.title}</span>
                  <strong>{card.badge}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="play" className="cta-section">
          <div className="cta-card">
            <h2>How do you want to start</h2>
            <div className="cta-counter">Playing?</div>
            <div className="hero-actions cta-actions">
              <Link to="/search" className="home-btn-primary">
                FIND TURFS
              </Link>
              <Link to="/open" className="home-btn-secondary">
                FIND GAMES
              </Link>
            </div>
            <p>Go ahead, start playing!</p>
          </div>
        </section>
      </main>
    </div>
  );
}

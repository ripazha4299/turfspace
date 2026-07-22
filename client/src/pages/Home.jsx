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
    hoverText: 'SCANNING...',
    icon: 'search',
  },
  {
    title: 'Book or join',
    description: 'Book privately or mark it open so others nearby can join your game.',
    accent: 'gold',
    hoverText: 'PLAYER JOINED',
    icon: 'sports_soccer',
  },
  {
    title: 'Play',
    description: 'Build a playing circle in your new city instead of starting from zero.',
    accent: 'blue',
    hoverText: 'SOCIAL COMBO!',
    icon: 'groups',
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
    title: 'Badminton',
    badge: 'FULL',
    accent: 'muted',
    image: badmintonIcon,
  },
];

export default function Home() {
  return (
    <div className="home-shell">
      <main className="home-main">
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

        <section id="features" className="py-margin-lg bg-background bg-grid-pattern border-b-8 border-pixel-black">
          <div className="max-w-container-max mx-auto px-margin-md">
            <div className="flex flex-col items-center mb-16">
                <h2 className="font-headline-md text-headline-md text-pixel-white mb-4 uppercase">System Features</h2>
                <div className="w-32 h-2 bg-primary"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featureCards.map((card) => (
                <article key={card.title} className={`bg-surface-container border-4 border-pixel-black pixel-bevel-outset p-margin-md hover:bg-surface-container-high transition-colors group ${card.accent}`}>
                    <div
                      className={`mb-6 w-16 h-16 flex items-center justify-center pixel-border-thick background-${card.accent}`}>
                      <span className="material-symbols-outlined text-4xl text-pixel-white material-symbols-outlined">{card.icon}</span>
                  </div>
                  <h3 className={`font-headline-sm text-headline-sm mb-4 uppercase font-${card.accent}`}>{card.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                      {card.description}
                  </p>
                  <div
                      className={`flex items-center font-headline-sm text-headline-sm opacity-0 group-hover:opacity-100 transition-opacity font-${card.accent}`}>
                      {card.hoverText}
                  </div>
                </article>
              ))}
            </div>
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
              <Link
                key={card.title}
                to={`/search?sports=${encodeURIComponent(card.title)}`}
                className={`homepage-sport-card bg-surface border-4 border-pixel-black pixel-bevel-outset p-4 hover:-translate-y-2 transition-transform cursor-pointer group ${card.accent}`}>
                <div className="bg-pixel-black aspect-square mb-4 flex items-center justify-center overflow-hidden border-2 border-surface-variant">
                  {card.image ? <img src={card.image} className="w-full h-full object-cover pixelated" alt={card.title} /> : <div className="turf-placeholder" />}
                </div>
                <div className="turf-card-footer">
                  <span className="font-headline-sm text-headline-sm text-arcade-white uppercase">{card.title}</span>
                  <span className="bg-arcade-blue text-pixel-white px-2 py-1 text-[10px] font-bold">{card.badge}</span>
                </div>
              </Link>
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

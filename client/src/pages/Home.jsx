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
              <article key={card.title} className={`bg-surface border-4 border-pixel-black pixel-bevel-outset p-4 hover:-translate-y-2 transition-transform cursor-pointer group ${card.accent}`}>
                <div className="bg-pixel-black aspect-square mb-4 flex items-center justify-center overflow-hidden border-2 border-surface-variant">
                  {card.image ? <img src={card.image} className="w-full h-full object-cover pixelated" alt={card.title} /> : <div className="turf-placeholder" />}
                </div>
                <div className="turf-card-footer">
                  <span className="font-headline-sm text-headline-sm text-arcade-blue uppercase">{card.title}</span>
                  <span className="bg-arcade-blue text-pixel-white px-2 py-1 text-[10px] font-bold">{card.badge}</span>
                </div>
              </article>
              
            ))}
          </div>
          {/* <div
                        className="bg-surface border-4 border-pixel-black pixel-bevel-outset p-4 hover:-translate-y-2 transition-transform cursor-pointer group">
                        <div
                            className="bg-pixel-black aspect-square mb-4 flex items-center justify-center overflow-hidden border-2 border-surface-variant">
                            <img alt="Pixelated character sprites for a sports game including players in various colored jerseys like red, blue, and yellow. Characters are shown in different athletic poses such as running, jumping, and celebrating a goal in a charming 16-bit retro style."
                                className="w-full h-full object-cover pixelated"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBU_XmSVqvCb2xXjnl6wi87gxD7kRsJTQmhoomYGuL_lIWAzGpPYHlKep3Y7ugbl-VB4vubJpo534HjP4U7WNJRKoQyKT5Y290AKfz_hbY5u5FWc8Ng1H1DKJ25zDlAJdPtsLerhS4LmAMZyEzwEsdsybsDwDY3dotYfmrXatfkHq7kxEtcdeqc0n21jmZGXXtLaY_9XhywK7py36bbEIv3jkW06prtfi0SBamBW8zGV8ximCaUgGCkvxRUMck5cCyggg" />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-headline-sm text-headline-sm text-arcade-blue uppercase">Pro Clubs</span>
                            <span className="bg-arcade-blue text-pixel-white px-2 py-1 text-[10px] font-bold">ACTIVE</span>
                        </div>
                    </div> */}
        </section>
        {/* <section className="py-margin-lg bg-surface-container-lowest">
            <div className="max-w-container-max mx-auto px-margin-md">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
                    <div>
                        <h2 className="font-headline-md text-headline-md text-pixel-white uppercase">Choose Your Turf</h2>
                        <p className="font-body-md text-on-surface-variant mt-4">Select your specialty and find the right
                            arena.</p>
                    </div>
                    <button
                        className="bg-pixel-black border-2 border-neon-mint text-neon-mint font-headline-sm text-headline-sm px-6 py-3 hover:bg-neon-mint hover:text-pixel-black transition-colors">
                        VIEW ALL (50+)
                    </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    <div
                        className="bg-surface border-4 border-pixel-black pixel-bevel-outset p-4 hover:-translate-y-2 transition-transform cursor-pointer group">
                        <div
                            className="bg-pixel-black aspect-square mb-4 flex items-center justify-center overflow-hidden border-2 border-surface-variant">
                            <img alt="Retro pixel art sports equipment including various balls like footballs, basketballs, and tennis balls in a clean 16-bit aesthetic."
                                className="w-full h-full object-cover pixelated hover:scale-110 transition-transform"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzu06R3nNVeUAahPHpvxuMyuUGrP2KIx5O2wiy9A_nukeq82TW0m6fztH4ssvMaqqdpLY1BkFJtCvecNncbqxyyka8UOboo423-NMfY36FmsWsK3m7ogyFBxCKs70UBKWo21BJivSgsLQj2nN6NT_ZGdywQP90R_NowiwMXq1_WndW5D9EvFsNFbAofqIcfuSvedMkpnTk2A46vxwIZWGJQ9diy2UITifLSM8vsJR85Lrtl4S6-wLH1TN8E62C8T6BYQ" />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-headline-sm text-headline-sm text-primary uppercase">Soccer</span>
                            <span className="bg-primary text-on-primary px-2 py-1 text-[10px] font-bold">12 OPEN</span>
                        </div>
                    </div>
                    
                    <div
                        className="bg-surface border-4 border-pixel-black pixel-bevel-outset p-4 hover:-translate-y-2 transition-transform cursor-pointer group">
                        <div
                            className="bg-pixel-black aspect-square mb-4 flex items-center justify-center overflow-hidden border-2 border-surface-variant">
                            <div className="w-full h-full bg-[url('placeholder')] bg-cover bg-center"
                                data-alt="A detailed collection of 16-bit pixel art sports equipment shown on a clean light background. The set includes a basketball, a volleyball, a soccer ball, and a tennis ball, all rendered with sharp chunky pixels and high contrast colors typical of 90s arcade sports games."
                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA-ubZVqP5qeurukY6cFHVM4SR8u1oM5z-n8w4kOiHQKm9BL-PNKshAVfd9OHr2qNIRWtreBiYWisjeF1qZchXbATHZ63x2_YUaHF_PecSaJ588jG4AqMPn8Ozr-gTPOfiOFHiVmLUNoPq5mm0CX35NuTFuOxbrDo7YfwYZ5nvoCsr7eZsDpj5gMl4YFp58wS2o3wCxxvcjouWfi-A1qOhYX-yF5qolbdAU4yn-R2kcYN2NnbjfEgAp38a9dvy29YtYuw')" }}>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-headline-sm text-headline-sm text-secondary uppercase">Hoops</span>
                            <span className="bg-secondary text-on-secondary px-2 py-1 text-[10px] font-bold">4 OPEN</span>
                        </div>
                    </div>
                    
                    <div
                        className="bg-surface border-4 border-pixel-black pixel-bevel-outset p-4 hover:-translate-y-2 transition-transform cursor-pointer group">
                        <div
                            className="bg-pixel-black aspect-square mb-4 flex items-center justify-center overflow-hidden border-2 border-surface-variant">
                            <img alt="Pixelated character sprites for a sports game including players in various colored jerseys like red, blue, and yellow. Characters are shown in different athletic poses such as running, jumping, and celebrating a goal in a charming 16-bit retro style."
                                className="w-full h-full object-cover pixelated"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBU_XmSVqvCb2xXjnl6wi87gxD7kRsJTQmhoomYGuL_lIWAzGpPYHlKep3Y7ugbl-VB4vubJpo534HjP4U7WNJRKoQyKT5Y290AKfz_hbY5u5FWc8Ng1H1DKJ25zDlAJdPtsLerhS4LmAMZyEzwEsdsybsDwDY3dotYfmrXatfkHq7kxEtcdeqc0n21jmZGXXtLaY_9XhywK7py36bbEIv3jkW06prtfi0SBamBW8zGV8ximCaUgGCkvxRUMck5cCyggg" />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-headline-sm text-headline-sm text-arcade-blue uppercase">Pro Clubs</span>
                            <span className="bg-arcade-blue text-pixel-white px-2 py-1 text-[10px] font-bold">ACTIVE</span>
                        </div>
                    </div>
                    
                    <div
                        className="bg-surface border-4 border-pixel-black pixel-bevel-outset p-4 hover:-translate-y-2 transition-transform cursor-pointer group">
                        <div
                            className="bg-pixel-black aspect-square mb-4 flex items-center justify-center overflow-hidden border-2 border-surface-variant">
                            <div
                                className="w-full h-full bg-gradient-to-br from-midnight-grass to-pixel-black flex items-center justify-center">
                                <span
                                    className="material-symbols-outlined text-6xl text-neon-mint opacity-50">add_box</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span
                                className="font-headline-sm text-headline-sm text-on-surface-variant uppercase">Tennis</span>
                            <span className="bg-surface-variant text-on-surface px-2 py-1 text-[10px] font-bold">FULL</span>
                        </div>
                    </div>
                </div>
            </div>
        </section> */}

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

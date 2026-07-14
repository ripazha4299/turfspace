import { useState } from 'react';
import instagramIcon from '../assets/icons/instagram.png';
import githubIcon from '../assets/icons/github.png';
import linkedinIcon from '../assets/icons/linkedin.png';

const CONTACT_EMAIL = 'antik.chowdhury.2025@iimu.ac.in';

// NOTE: these are placeholder links -- replace with the real handles/URLs
// whenever they exist. Kept obviously placeholder-shaped rather than fabricated
// real-looking ones.
const SOCIAL_LINKS = [
  { label: 'Instagram', icon: instagramIcon, href: 'https://www.instagram.com/lakesidersiimu/' },
  { label: 'GitHub', icon: githubIcon, href: 'https://github.com/ripazha4299' },
  { label: 'LinkedIn', icon: linkedinIcon, href: 'https://www.linkedin.com/in/antik-chowdhury/' },
];

export default function About() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // There's no email-sending backend here (no SMTP/mail-provider access in this
  // environment), so this opens the visitor's own email client pre-filled and
  // addressed to us -- a real, working way to reach us without needing server
  // infrastructure.
  function handleSubmit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`TurfSpace contact form — ${name || 'Someone'}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}\n${email}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="page">
      <h1>About TurfSpace</h1>
      <p className="subtle">
        TurfSpace connects relocating professionals with local turfs and playing communities,
        and helps turf owners fill empty slots without spending on ads.
      </p>

      <div className="card">
        <h2>Follow us</h2>
        <p className="subtle small">(Placeholder links — swap these for the real accounts whenever they're set up.)</p>
        <div className="social-links-row">
          {SOCIAL_LINKS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="social-link">
              <img src={s.icon} alt="" className="social-icon" aria-hidden="true" /> {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Get in touch</h2>
        <p className="subtle small">
          This opens your email app with the message pre-filled and addressed to us — nothing is sent
          from our servers.
        </p>
        <form className="form" onSubmit={handleSubmit}>
          <label>Name<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Your email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Message<textarea required value={message} onChange={(e) => setMessage(e.target.value)} /></label>
          <button className="btn-primary" type="submit">Open email to send</button>
        </form>
        <p className="subtle small" style={{ marginTop: 10 }}>
          Or email us directly at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </div>
  );
}

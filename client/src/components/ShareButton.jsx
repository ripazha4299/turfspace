import { useState } from 'react';
import { shareBooking } from '../utils/share';

// Small reusable "Share" button -- shows brief inline feedback (Copied! / Shared!)
// instead of a global toast, since the app doesn't have a toast system.
export default function ShareButton({ booking, className = 'btn-secondary small' }) {
  const [status, setStatus] = useState(null);

  async function handleClick(e) {
    e.stopPropagation();
    const result = await shareBooking(booking);
    if (result === 'copied') {
      setStatus('Link copied!');
      setTimeout(() => setStatus(null), 2000);
    } else if (result === 'failed') {
      setStatus("Couldn't copy link");
      setTimeout(() => setStatus(null), 2000);
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {status || '🔗 Share'}
    </button>
  );
}

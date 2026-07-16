// Builds a shareable link for an open booking and shares it via the native
// Web Share API where available (mainly mobile browsers), falling back to
// copying the link to the clipboard everywhere else.
export async function shareBooking(booking) {
  const url = `${window.location.origin}/games/${booking.id}`;
  const title = `Join my game at ${booking.turf_name || 'TurfSpace'}`;
  const text = `${booking.booking_date} · ${booking.start_time}–${booking.end_time}. Join me on TurfSpace!`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
      // fall through to clipboard for any other failure
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (err) {
    return 'failed';
  }
}

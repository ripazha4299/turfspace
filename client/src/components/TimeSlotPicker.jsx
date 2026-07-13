const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '30'];

// Renders as two <select>s (hour, minute) but behaves like a single HH:MM field.
// Restricting minutes to 00/30 in the UI itself means players can never even
// attempt an invalid slot like 18:15 -- the backend still validates too, but
// this prevents the error round-trip entirely.
export default function TimeSlotPicker({ value, onChange, label }) {
  const [hour, minute] = (value || '00:00').split(':');

  function update(newHour, newMinute) {
    onChange(`${newHour}:${newMinute}`);
  }

  return (
    <label>
      {label}
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={hour} onChange={(e) => update(e.target.value, minute)}>
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <select value={minute} onChange={(e) => update(hour, e.target.value)}>
          {MINUTES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

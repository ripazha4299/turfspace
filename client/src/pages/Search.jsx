import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const SPORT_OPTIONS = ['Football', 'Cricket', 'Badminton', 'Tennis', 'Basketball'];

function TurfCard({ turf }) {
  const images = turf.cover_image ? [turf.cover_image, ...(turf.gallery || [])] : (turf.gallery || []);
  const [activeImg, setActiveImg] = useState(0);

  return (
    <Link to={`/turfs/${turf.id}`} className="card turf-card">
      <div className="turf-card-image-wrap">
        {images.length > 0 ? (
          <img src={images[activeImg]} alt={turf.name} onError={(e) => { e.target.style.display = 'none'; }} />
        ) : null}
        {images.length > 1 && (
          <div className="carousel-dots" onMouseEnter={(e) => e.stopPropagation()}>
            {images.map((_, i) => (
              <span
                key={i}
                className={i === activeImg ? 'active' : ''}
                onMouseEnter={(e) => { e.preventDefault(); setActiveImg(i); }}
              />
            ))}
          </div>
        )}
      </div>
      <h3>{turf.name}</h3>
      <p className="subtle">{turf.city}</p>
      <div className="chip-row"><span className="chip">{turf.sport_type}</span></div>
      <p className="subtle small">Open {turf.open_time} – {turf.close_time}</p>
      <p className="price">
        {turf.old_price ? <span className="old-price">₹{turf.old_price}</span> : null}
        ₹{turf.rate_per_hour}/hr
      </p>
    </Link>
  );
}

export default function Search() {
  const [city, setCity] = useState('');
  const [selectedSports, setSelectedSports] = useState([]);
  const [bookingTypeFilter, setBookingTypeFilter] = useState([]); // ['open'] and/or ['private']
  const [priceSort, setPriceSort] = useState('');
  const [turfs, setTurfs] = useState([]);
  const [openTurfIds, setOpenTurfIds] = useState(null); // turf ids that currently have a joinable open booking
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function runSearch() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (city) params.city = city;
      if (selectedSports.length) params.sport_type = selectedSports.join(',');
      if (priceSort) params.sort = priceSort;
      const data = await api.searchTurfs(params);
      setTurfs(data.turfs);

      // "Open Booking" filter needs turfs that currently have a joinable open booking.
      if (bookingTypeFilter.includes('open')) {
        const openData = await api.openBookings(city ? { city } : {});
        setOpenTurfIds(new Set(openData.bookings.map((b) => b.turf_id)));
      } else {
        setOpenTurfIds(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSports, priceSort, bookingTypeFilter]);

  function toggleSport(sport) {
    setSelectedSports((s) => (s.includes(sport) ? s.filter((x) => x !== sport) : [...s, sport]));
  }
  function toggleBookingType(type) {
    setBookingTypeFilter((s) => (s.includes(type) ? s.filter((x) => x !== type) : [...s, type]));
  }
  function resetFilters() {
    setCity('');
    setSelectedSports([]);
    setBookingTypeFilter([]);
    setPriceSort('');
  }

  const visibleTurfs = useMemo(() => {
    // "Private Booking" filter: every turf supports private booking, so it never excludes anything.
    // "Open Booking" filter: only show turfs with a currently joinable open booking.
    if (bookingTypeFilter.includes('open') && !bookingTypeFilter.includes('private') && openTurfIds) {
      return turfs.filter((t) => openTurfIds.has(t.id));
    }
    return turfs;
  }, [turfs, bookingTypeFilter, openTurfIds]);

  return (
    <div className="page">
      <h1>Find a turf</h1>

      <div className="search-bar">
        <input
          placeholder="City (e.g. Jaipur)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
        />
        <button className="btn-primary" onClick={runSearch}>Search</button>
      </div>

      <div className="plp-layout">
        <aside className="plp-filters">
          <h3>Price</h3>
          <label className="filter-option">
            <input
              type="radio"
              name="price-sort"
              checked={priceSort === 'price_asc'}
              onChange={() => setPriceSort('price_asc')}
            />
            Low → High
          </label>
          <label className="filter-option">
            <input
              type="radio"
              name="price-sort"
              checked={priceSort === 'price_desc'}
              onChange={() => setPriceSort('price_desc')}
            />
            High → Low
          </label>

          <h3>Booking Type</h3>
          <label className="filter-option">
            <input
              type="checkbox"
              checked={bookingTypeFilter.includes('open')}
              onChange={() => toggleBookingType('open')}
            />
            Open Booking
          </label>
          <label className="filter-option">
            <input
              type="checkbox"
              checked={bookingTypeFilter.includes('private')}
              onChange={() => toggleBookingType('private')}
            />
            Private Booking
          </label>

          <h3>Sport</h3>
          {SPORT_OPTIONS.map((sport) => (
            <label className="filter-option" key={sport}>
              <input
                type="checkbox"
                checked={selectedSports.includes(sport)}
                onChange={() => toggleSport(sport)}
              />
              {sport}
            </label>
          ))}

          <button className="filter-reset" onClick={resetFilters}>Reset filters</button>
        </aside>

        <div>
          {loading && <p className="subtle">Loading turfs…</p>}
          {error && <div className="error-text">{error}</div>}
          {!loading && visibleTurfs.length === 0 && (
            <p className="subtle">No turfs match these filters. Try widening your search.</p>
          )}
          <div className="plp-grid">
            {visibleTurfs.map((turf) => (
              <TurfCard key={turf.id} turf={turf} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

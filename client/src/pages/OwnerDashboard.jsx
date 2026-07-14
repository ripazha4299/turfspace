import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SPORT_OPTIONS, PLAYER_ICON } from '../constants';
import TicketModal from '../components/TicketModal';

function formatDateNice(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const emptyTurf = {
  name: '', city: '', address: '', sports: [], rate_per_hour: '', old_price: '',
  open_time: '06:00', close_time: '23:00', description: '',
  allow_free_booking: false, allow_partial_booking: false, partial_token_pct: 15,
  cover_image: '', gallery: [],
};

function turfToFormState(t) {
  return {
    name: t.name, city: t.city, address: t.address || '', sports: t.sports || [],
    rate_per_hour: String(t.rate_per_hour), old_price: t.old_price != null ? String(t.old_price) : '',
    open_time: t.open_time, close_time: t.close_time, description: t.description || '',
    allow_free_booking: !!t.allow_free_booking, allow_partial_booking: !!t.allow_partial_booking,
    partial_token_pct: t.partial_token_pct,
    cover_image: t.cover_image || '', gallery: t.gallery || [],
  };
}

export default function OwnerDashboard() {
  const { token } = useAuth();
  const [turfs, setTurfs] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(emptyTurf);
  const [showForm, setShowForm] = useState(false);
  const [editingTurfId, setEditingTurfId] = useState(null); // null = creating new
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [detailBooking, setDetailBooking] = useState(null);

  async function loadAll() {
    const [turfsRes, calRes, statsRes] = await Promise.all([
      api.myTurfs(token),
      api.ownerCalendar(token),
      api.ownerStats(token),
    ]);
    setTurfs(turfsRes.turfs);
    setCalendar(calRes.bookings);
    setStats(statsRes);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggle(field) {
    setForm((f) => ({ ...f, [field]: !f[field] }));
  }

  function toggleSport(sport) {
    setForm((f) => ({
      ...f,
      sports: f.sports.includes(sport) ? f.sports.filter((s) => s !== sport) : [...f.sports, sport],
    }));
  }

  function openCreateForm() {
    setForm(emptyTurf);
    setEditingTurfId(null);
    setError('');
    setShowForm(true);
  }

  function openEditForm(turf) {
    setForm(turfToFormState(turf));
    setEditingTurfId(turf.id);
    setError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setShowForm(false);
    setEditingTurfId(null);
  }

  async function handleCoverFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError('');
    setUploadingCover(true);
    try {
      const data = await api.uploadSingleImage(file, token);
      update('cover_image', data.url);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function handleGalleryFilesChange(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError('');
    setUploadingGallery(true);
    try {
      const data = await api.uploadMultipleImages(files, token);
      setForm((f) => ({ ...f, gallery: [...f.gallery, ...data.urls] }));
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  }

  function removeGalleryImage(url) {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((u) => u !== url) }));
  }

  async function handleSaveTurf(e) {
    e.preventDefault();
    setError('');
    if (form.sports.length === 0) {
      setError('Select at least one sport.');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      rate_per_hour: Number(form.rate_per_hour),
      old_price: form.old_price ? Number(form.old_price) : null,
      partial_token_pct: Number(form.partial_token_pct),
    };
    try {
      if (editingTurfId) {
        await api.updateTurf(editingTurfId, payload, token);
      } else {
        await api.createTurf(payload, token);
      }
      closeForm();
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleNoShow(bookingId) {
    try {
      await api.flagNoShow(bookingId, 20, token);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const fillRate = stats && stats.total_bookings > 0
    ? Math.round(((stats.total_bookings - stats.no_shows) / stats.total_bookings) * 100)
    : null;

  return (
    <div className="page">
      <h1>Owner dashboard</h1>

      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{stats.total_bookings}</span>
            <span className="stat-label">Total bookings</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{fillRate ?? '—'}%</span>
            <span className="stat-label">Fill rate (est.)</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.open_bookings}</span>
            <span className="stat-label">Open bookings</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.no_shows}</span>
            <span className="stat-label">No-shows</span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header-row">
          <h2>Your turfs</h2>
          <button className="btn-secondary small" onClick={() => (showForm ? closeForm() : openCreateForm())}>
            {showForm ? 'Cancel' : '+ Add turf'}
          </button>
        </div>

        {showForm && (
          <form className="form owner-dashboard-form" onSubmit={handleSaveTurf}>
            <h3 style={{ margin: '0 0 4px' }}>{editingTurfId ? 'Edit turf' : 'New turf'}</h3>
            <div className="form-main-with-aside">
              <div className="form-main">
                <label>Name<input required value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
                <label>City<input required value={form.city} onChange={(e) => update('city', e.target.value)} /></label>
                <label>Address<input value={form.address} onChange={(e) => update('address', e.target.value)} /></label>
                <div>
                  <label style={{ marginBottom: 6, display: 'block' }}>Sports (select one or more)</label>
                  <div className="filter-option-row">
                    {SPORT_OPTIONS.map((sport) => (
                      <label className="filter-option" key={sport}>
                        <input type="checkbox" checked={form.sports.includes(sport)} onChange={() => toggleSport(sport)} />
                        {sport}
                      </label>
                    ))}
                  </div>
                  {form.sports.length === 0 && <p className="error-text small" style={{ marginTop: 4 }}>Select at least one sport.</p>}
                </div>

                <div className="time-row break-new">
                  <label>Rate per hour (₹)<input required type="number" value={form.rate_per_hour} onChange={(e) => update('rate_per_hour', e.target.value)} /></label>
                  <label>
                    Old price (₹, optional)
                    <input type="number" value={form.old_price} onChange={(e) => update('old_price', e.target.value)} />
                  </label>
                </div>
                <p className="subtle small">
                  Set an old price to show a strikethrough discount on listings.
                  {editingTurfId ? ' Changing the rate here never affects bookings already made — those keep their original price.' : ''}
                </p>

                <div className="time-row">
                  <label>Open time<input type="time" value={form.open_time} onChange={(e) => update('open_time', e.target.value)} /></label>
                  <label>Close time<input type="time" value={form.close_time} onChange={(e) => update('close_time', e.target.value)} /></label>
                </div>

                <label>Description<textarea value={form.description} onChange={(e) => update('description', e.target.value)} /></label>

                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.allow_free_booking} onChange={() => toggle('allow_free_booking')} />
                  Allow free bookings
                </label>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.allow_partial_booking} onChange={() => toggle('allow_partial_booking')} />
                  Allow partial (token) bookings
                </label>
                {form.allow_partial_booking && (
                  <label>
                    Partial token % (min 15)
                    <input
                      type="number"
                      min={15}
                      max={100}
                      value={form.partial_token_pct}
                      onChange={(e) => update('partial_token_pct', e.target.value)}
                    />
                  </label>
                )}
                <p className="subtle small">Full payment is always offered as an option, in addition to whatever you enable above.</p>

                {error && <div className="error-text">{error}</div>}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn-primary" disabled={saving || uploadingCover || uploadingGallery} type="submit">
                    {saving ? 'Saving…' : editingTurfId ? 'Save changes' : 'Save turf'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
                </div>
              </div>

              <aside className="form-aside">
                <div className="image-upload-panel">
                  <label>
                    Cover image
                    <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverFileChange} disabled={uploadingCover} />
                  </label>
                  {uploadingCover && <p className="subtle small">Uploading…</p>}
                  {form.cover_image && (
                    <div className="image-preview-card" style={{ position: 'relative', width: 120 }}>
                      <img src={form.cover_image} alt="Cover preview" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8 }} />
                      <button
                        type="button"
                        className="btn-secondary small"
                        style={{ marginTop: 6 }}
                        onClick={() => update('cover_image', '')}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <label>
                    Gallery images (you can select multiple, or add more to existing ones)
                    <input type="file" accept="image/*" multiple ref={galleryInputRef} onChange={handleGalleryFilesChange} disabled={uploadingGallery} />
                  </label>
                  {uploadingGallery && <p className="subtle small">Uploading…</p>}
                  {form.gallery.length > 0 && (
                    <div className="gallery-preview-grid">
                      {form.gallery.map((url) => (
                        <div key={url} style={{ position: 'relative' }}>
                          <img src={url} alt="Gallery preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6 }} />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(url)}
                            style={{
                              position: 'absolute', top: -6, right: -6, background: 'var(--alert-red)', color: 'white',
                              border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, lineHeight: '20px', padding: 0,
                            }}
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {uploadError && <div className="error-text">{uploadError}</div>}
                </div>
              </aside>
            </div>
          </form>
        )}

        {turfs.length === 0 ? (
          <p className="subtle">No turfs listed yet — add your first one above.</p>
        ) : (
          <ul className="booking-list">
            {turfs.map((t) => (
              <li key={t.id} className="booking-row">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {t.cover_image ? (
                    <img src={t.cover_image} alt={t.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 6, background: 'var(--sand-100)' }} />
                  )}
                  <div>
                    <strong>{t.name}</strong> · {t.city} · {(t.sports || []).join(', ')} · ₹{t.rate_per_hour}/hr
                    {t.gallery && t.gallery.length > 0 && (
                      <div className="subtle small">{t.gallery.length + (t.cover_image ? 1 : 0)} photo(s)</div>
                    )}
                  </div>
                </div>
                <button className="btn-secondary small" onClick={() => openEditForm(t)}>Edit</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Booking calendar</h2>
        {calendar.length === 0 ? (
          <p className="subtle">No bookings yet across your turfs.</p>
        ) : (
          <ul className="booking-list">
            {calendar.map((b) => (
              <li key={b.id} className="booking-row booking-row-clickable" onClick={() => setDetailBooking(b)}>
                <div>
                  <strong>{b.turf_name}</strong> · {b.booking_date} · {b.start_time}–{b.end_time}
                  <div className="subtle small">
                    {b.booking_type === 'open' ? `Open (${b.joined_count}/${b.max_players})` : 'Private'} ·{' '}
                    booked by {PLAYER_ICON} {b.created_by_name} ·{' '}
                    <span className={`status-badge ${b.status}`}>{b.status.replace('_', ' ')}</span>
                  </div>
                </div>
                {b.status === 'confirmed' && (
                  <button
                    className="btn-secondary small"
                    onClick={(e) => { e.stopPropagation(); handleNoShow(b.id); }}
                  >
                    Flag no-show
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {detailBooking && (
        <TicketModal
          turf={{
            id: detailBooking.turf_id, name: detailBooking.turf_name, city: detailBooking.turf_city,
            address: detailBooking.turf_address, cover_image: detailBooking.turf_cover_image,
          }}
          onClose={() => setDetailBooking(null)}
        >
          <h2 style={{ marginTop: 0 }}>Booking Ticket</h2>
          <div className="ticket-section-title">Details</div>
          <div className="ticket-row"><span>Date</span><span>{formatDateNice(detailBooking.booking_date)}</span></div>
          <div className="ticket-row"><span>Time</span><span>{detailBooking.start_time}–{detailBooking.end_time}</span></div>
          <div className="ticket-row"><span>Type</span><span>{detailBooking.booking_type === 'open' ? 'Open booking' : 'Private booking'}</span></div>
          {detailBooking.booking_type === 'open' && (
            <div className="ticket-row"><span>Players</span><span>{detailBooking.joined_count}/{detailBooking.max_players}</span></div>
          )}
          <div className="ticket-row"><span>Status</span><span className={`status-badge ${detailBooking.status}`}>{detailBooking.status.replace('_', ' ')}</span></div>

          <div className="ticket-section-title">Booked by</div>
          <div className="ticket-person-badge">
            <span>{PLAYER_ICON}</span>
            <div>
              <div style={{ fontWeight: 700 }}>{detailBooking.created_by_name}</div>
              <div className="subtle small">{detailBooking.created_by_email}</div>
            </div>
          </div>

          <div className="ticket-section-title">Payment</div>
          <div className="ticket-row"><span>Payment type</span><span>{detailBooking.payment_type}</span></div>
          <div className="ticket-row"><span>Total amount</span><span>₹{detailBooking.amount_total}</span></div>
          {detailBooking.payment_type !== 'free' && (
            <div className="ticket-row highlight money"><span>Amount due</span><span>₹{detailBooking.amount_due}</span></div>
          )}
          {detailBooking.amount_paid > 0 && (
            <div className="ticket-row highlight"><span>Amount paid</span><span>₹{detailBooking.amount_paid}</span></div>
          )}
          {detailBooking.status === 'cancelled' && detailBooking.refund_amount != null && (
            <div className="ticket-row highlight"><span>Refund</span><span>₹{detailBooking.refund_amount}</span></div>
          )}
        </TicketModal>
      )}
    </div>
  );
}

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function serializeCampaign(row) {
  if (!row) return row;
  let sports = [];
  let gallery = [];
  try { sports = JSON.parse(row.turf_sports || '[]'); } catch (e) { sports = []; }
  try { gallery = JSON.parse(row.turf_gallery || '[]'); } catch (e) { gallery = []; }
  return { ...row, turf_sports: sports, turf_gallery: gallery };
}

// GET /api/campaigns/active?city= -- public, powers the PLP's full-width banner row.
// One active campaign per turf max is not enforced -- if an owner has several,
// all show; the PLP only renders a handful anyway.
router.get('/active', (req, res) => {
  const { city } = req.query;
  let query = `
    SELECT c.id, c.promo_image, c.promo_text, c.created_at,
      t.id as turf_id, t.name as turf_name, t.city as turf_city, t.address as turf_address,
      t.description as turf_description, t.cover_image as turf_cover_image,
      t.gallery as turf_gallery, t.sports as turf_sports,
      t.rate_per_hour, t.old_price
    FROM campaigns c
    JOIN turfs t ON c.turf_id = t.id
    WHERE c.is_active = 1
  `;
  const params = [];
  if (city) {
    query += ' AND t.city LIKE ?';
    params.push(`%${city}%`);
  }
  query += ' ORDER BY c.created_at DESC';

  const campaigns = db.prepare(query).all(...params).map(serializeCampaign);
  res.json({ campaigns });
});

// GET /api/campaigns/mine -- owner's own campaigns (active + inactive), for management
router.get('/mine', requireAuth, requireRole('owner'), (req, res) => {
  const campaigns = db.prepare(
    `SELECT c.*, t.name as turf_name FROM campaigns c JOIN turfs t ON c.turf_id = t.id
     WHERE c.owner_id = ? ORDER BY c.created_at DESC`
  ).all(req.user.id);
  res.json({ campaigns });
});

// POST /api/campaigns -- owner creates a campaign for one of their own turfs
router.post('/', requireAuth, requireRole('owner'), (req, res) => {
  const { turf_id, promo_image, promo_text } = req.body;
  if (!turf_id || !promo_text) return res.status(400).json({ error: 'turf_id and promo_text are required' });

  const turf = db.prepare('SELECT * FROM turfs WHERE id = ?').get(turf_id);
  if (!turf) return res.status(404).json({ error: 'Turf not found' });
  if (turf.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your turf' });

  const id = uuidv4();
  db.prepare(
    `INSERT INTO campaigns (id, turf_id, owner_id, promo_image, promo_text) VALUES (?, ?, ?, ?, ?)`
  ).run(id, turf_id, req.user.id, promo_image || '', promo_text);

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  res.status(201).json({ campaign });
});

// PUT /api/campaigns/:id -- toggle active/inactive, or edit promo content
router.put('/:id', requireAuth, requireRole('owner'), (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your campaign' });

  const { promo_image, promo_text, is_active } = req.body;
  db.prepare(
    `UPDATE campaigns SET promo_image = ?, promo_text = ?, is_active = ? WHERE id = ?`
  ).run(
    promo_image ?? campaign.promo_image,
    promo_text ?? campaign.promo_text,
    is_active !== undefined ? (is_active ? 1 : 0) : campaign.is_active,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  res.json({ campaign: updated });
});

module.exports = router;

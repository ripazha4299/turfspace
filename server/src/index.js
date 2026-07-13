require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const turfsRouter = require('./routes/turfs');
const bookingsRouter = require('./routes/bookings');
const { router: uploadsRouter, uploadsDir } = require('./routes/uploads');

const app = express();

const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Serves uploaded turf images back over HTTP (see routes/uploads.js).
// Note: on hosts with ephemeral disks (e.g. Render's free tier), this directory
// -- like the SQLite file -- won't survive restarts/redeploys. See README.
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'turfspace-api' }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/turfs', turfsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/uploads', uploadsRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`TurfSpace API listening on port ${PORT}`);
});

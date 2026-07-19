require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const turfsRouter = require('./routes/turfs');
const bookingsRouter = require('./routes/bookings');
const { router: uploadsRouter } = require('./routes/uploads');
const { router: notificationsRouter } = require('./routes/notifications');
const campaignsRouter = require('./routes/campaigns');
const messagesRouter = require('./routes/messages');

const app = express();

const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Images are now hosted on Cloudinary; no local static uploads directory.

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'turfspace-api' }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/turfs', turfsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/messages', messagesRouter);

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

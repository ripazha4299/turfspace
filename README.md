# TurfSpace — MVP Codebase

Full-stack implementation of the TurfSpace MVP (see PRD): a two-sided marketplace connecting
relocating professionals ("Individual Players") with sports venues ("Turf Owners"), scoped to the
P0/P1 stories — search & discovery, private booking, open/joinable booking, turf owner management,
no-show handling, and basic profiles.

## Stack
- **Backend:** Node.js + Express + SQLite (using Node's **built-in** `node:sqlite` module — no native
  compilation, no Python/C++ build tools needed), JWT auth, bcrypt password hashing
- **Frontend:** React (Vite), React Router, plain CSS — no external UI framework, easy to restyle
- **No paid services required** — both halves can run on free tiers
- **Requires Node.js v22.5 or later** (for `node:sqlite`). Check with `node --version`; if you're on
  an older version, install a current LTS from nodejs.org first. You'll see a one-line
  `ExperimentalWarning: SQLite is an experimental feature` on startup — that's expected and harmless.

## Project structure
```
turfspace/
  server/     # Express API + SQLite
  client/     # React frontend (Vite)
  render.yaml # optional Render deploy config for the backend
```

## Running locally

### 1. Backend
```bash
cd server
cp .env.example .env    # edit JWT_SECRET to any long random string
npm install
npm start                # runs on http://localhost:4000
```
The SQLite database file is created automatically on first run (`turfspace.db`). No separate DB
setup needed.

### 2. Frontend
```bash
cd client
cp .env.example .env     # points VITE_API_BASE_URL at your backend
npm install
npm run dev               # runs on http://localhost:5173
```

Open http://localhost:5173, register as either a **Player** or a **Turf Owner**, and try the core
flows: search turfs → book privately or mark a booking "open" → browse/join open games → owner
dashboard to list a turf, view the calendar, and flag no-shows.

## Phase 1 update (booking rules, confirm/pay flow, payment model)

Based on the handwritten wireframe/spec transcription, this phase added:

- **Slot validation:** minimum 1-hour bookings, 30-minute increments after that, and zero-length
  slots (e.g. 16:00–16:00) are rejected outright.
- **Cross-type slot exclusivity:** the existing overlap check now guarantees the same time slot can
  never be booked as both Private and Open (or double-booked at all) — this was already implicit in
  the overlap logic and is now explicitly covered by tests.
- **Free / Partial / Full payment model**, configurable per turf:
  - Turf owners toggle `allow_free_booking` and `allow_partial_booking` (with a `partial_token_pct`,
    minimum 15%) when creating/editing a turf. **Full is always available** regardless of these toggles.
  - Booking creation now requires a `payment_type` and computes `amount_total` / `amount_due` from the
    turf's rate and slot duration.
  - **Full payment bookings** must be created (and paid) at least 30 minutes before the slot starts —
    enforced both at creation and at payment time.
  - **Free bookings** confirm immediately with no payment step.
  - **Partial/Full bookings** are created in a `pending_payment` state and require a call to
    `POST /bookings/:id/pay` (the "Pay Now" step) to become `confirmed`. This is a simulated payment —
    no real gateway is wired up yet, matching the PRD's cut list.
- **First-payer-only rule for Open bookings:** unchanged from before — only the creator of an open
  booking pays; anyone who joins later joins for free. Already correct, now explicit in the code
  comments.
- **Cancellation fee:** cancelling a booking that was already paid deducts the turf's
  `cancellation_fee_pct` (default 15%) from the total and records a `refund_amount` for the remainder.
  No real refund is processed — this is bookkeeping only, same caveat as payments.
- **Confirm/Pay popup (frontend):** booking a turf now opens a summary popup showing the slot,
  payment type, and amount due, with **Pay Now** / **Cancel** actions — matching the wireframe's
  Confirm/Join Booking popup. Free bookings skip straight to a confirmation state (no payment needed).
- **Owner dashboard:** the "Add turf" form now includes toggles for free/partial bookings and the
  partial token percentage.
- **My Bookings:** now shows payment status, amount due/paid, and a **Pay Now** button for any booking
  still in `pending_payment`, plus refund amount on cancelled bookings.

**Not yet done (explicitly deferred to Phase 2 per your sequencing choice):** the redesigned Product
Listing Page (PLP) with filters/grid, the redesigned Product Display Page (PDP) with image gallery and
the right-hand scrollable open-bookings list, full mobile-responsive layout pass, and the green/white
+ yellow/mint/red color theme from the wireframe notes. The current frontend is functional but still
uses the simpler search/detail pages built in the original MVP pass.

**One thing to know before you re-run this:** the booking/turf table schema changed (new payment
columns). If you still have a `turfspace.db` file from before this update, delete it before starting
the server again — `CREATE TABLE IF NOT EXISTS` won't retrofit new columns onto an existing table.

## Quickest way to run this locally

From the **repo root** (not inside `server/` or `client/`):

```bash
npm install          # installs the two small root devDependencies (concurrently, wait-on)
npm run install:all  # installs server/ deps, then client/ deps, one after the other
```

Then create your env files (one time only):
```bash
cp server/.env.example server/.env   # edit JWT_SECRET to any long random string
cp client/.env.example client/.env
```

Then every time you want to run the app:
```bash
npm run dev
```
This starts the backend first, waits for its `/api/health` endpoint to actually respond, and only
then starts the frontend dev server — so you never hit "failed to fetch" errors from the client
starting before the API is ready. Both processes' logs are labeled `SERVER` / `CLIENT` in the same
terminal; Ctrl+C stops both.

If you'd rather run them separately (e.g. in two terminal tabs), the original per-folder instructions
below still work exactly the same way.

## Latest round (multi-sport turfs, dark theme, mobile filters, About page)

- **Mobile PLP filters collapsed by default** — below ~700px, the filter sidebar is hidden behind a
  "Show filters" toggle button (with an active-filter count badge) instead of eating the whole screen.
- **Turfs can support multiple sports** — this was a real data model change, not just a UI tweak.
  `turfs.sport_type` (a single string) was replaced with `turfs.sports` (a JSON array), validated
  server-side against the same fixed list used in the PLP filters. The owner's turf form is now a
  multi-select checkbox group instead of one dropdown. Every place that displayed a turf's sport
  (PLP cards, PDP, My Bookings, Owner Dashboard, Join-a-game cards) now shows all of them as chips.
  **This is a breaking schema change — delete `turfspace.db` before restarting the server**, same as
  every previous schema change in this project.
- **Cancel confirmation** — cancelling a booking (private or open, from My Bookings or the PDP's
  confirm-booking popup) and leaving a joined game now both show a native "Are you sure?" confirm
  dialog before the action actually happens.
- **About page** (`/about`) — includes placeholder social links (clearly marked as placeholders —
  swap in real ones whenever they exist) and a contact form. The contact form opens the visitor's own
  email client, pre-addressed to antik.chowdhury.2025@iimu.ac.in with the message filled in. This is a
  `mailto:` link, not a server-sent email — this sandbox has no route to an SMTP/email-provider API, so
  a real "sent from our backend" contact form isn't something that could be built here. If you want
  that later, it's a small addition once you have an email provider (e.g. SendGrid, Resend, Postmark)
  and its API key.
- **Dark theme** — a 🌙/☀️ toggle in the navbar switches the whole app between light and dark, persisted
  in the browser's `localStorage` (this is a real deployed webapp, not a Claude-artifact sandbox, so
  `localStorage` is the normal, correct tool here). Implemented entirely through CSS custom properties
  (`--surface`, `--ink`, `--border`, etc. all swap under a `[data-theme="dark"]` selector), so no
  component code needed to change.

## Latest round of fixes (mobile nav, notifications, ticket-style modals, and more)

- **Mobile nav** — the top navbar collapses into a hamburger menu below ~800px instead of overflowing.
- **Join-booking popup** — joining an open game (from the PDP panel or the "Join a game" page) now
  opens the same ticket-styled confirmation popup used for booking, instead of joining instantly.
- **Leave a joined game** — "Games I joined" in My Bookings now has a **Leave game** button
  (`POST /api/bookings/:id/leave`). No fee applies since joiners never paid anything.
- **Notifications** — the turf owner is notified in-app (bell icon, top right) whenever someone joins
  or leaves their open booking. A small `notifications` table backs this; the bell polls every 30s.
  This is in-app only — no email/push, which would need a mail/push provider this sandbox can't reach.
- **PDP layout changes**: turf title + location now sit above the hero image; the "About" (description)
  section moved to the right column, below the open-bookings panel; the middle availability list was
  removed (the open-bookings panel + booking-time validation already cover that); the top bar (back
  button, sport, city, date) is now a solid, more prominent banner.
- **PLP image carousel** now auto-rotates every 1500ms instead of requiring hover.
- **Ticket-styled modals** — confirm-booking, join-booking, and the new read-only booking-detail popups
  all use a shared `TicketModal` component styled like a match ticket: ~2/3 details + actions on the
  left, ~1/3 turf photo/name/location "stub" on the right, with a dashed perforation between them.
- **Clickable bookings everywhere** — rows in My Bookings (both "created" and "joined") and in the
  Owner Dashboard's booking calendar now open a read-only ticket popup with full details. Monetary
  fields (total, amount due, amount paid, refund) are visually highlighted. The "joined" ticket
  highlights who created the game; the owner's calendar ticket highlights who booked it. The turf name
  inside any ticket popup is a link to that turf's PDP.
- **My Bookings layout** — "Bookings I created" and "Games I joined" now sit side-by-side on large
  screens (≥992px), stacked on mobile. A "Show cancelled" checkbox filters cancelled bookings out of
  both lists by default.
- **Owner sport selection** — the turf create/edit form now uses a dropdown restricted to the same
  sport list used in the PLP's filter sidebar (`client/src/constants.js`), so a turf's sport always
  matches something a player can filter by.
- **Player/turf icons** — 👤 next to player names, 🏠 next to turf-owner context, used in the navbar,
  My Bookings, and the Owner Dashboard's calendar.
- **Cross-turf double-booking** — see the earlier "Latest fixes" section below; still in place.

## Latest fixes (turf editing, double-booking, time slot precision)

- **Owner turf editing**: the Owner Dashboard's turf list now has an **Edit** button per turf, opening
  the same form used for creation (pre-filled) — rate, old price, description, hours, payment config,
  cover image, and gallery (add more images or remove existing ones) can all be changed via
  `PUT /api/turfs/:id`. Ownership is enforced server-side (an owner can't edit another owner's turf).
- **Cross-turf double-booking fix**: previously, the overlap check only looked at bookings *on the same
  turf*. A player could still book (or join) overlapping slots at two different turfs at the same time.
  There's now a player-level check (`checkPlayerFree` in `routes/bookings.js`) that looks at every
  booking a player has created **or joined**, across all turfs, and blocks any new booking/join that
  overlaps in time — same rule, applied both at creation and at join time.
- **Time slot input restricted to :00/:30**: the booking widget on the PDP now uses two dropdowns
  (hour 00–23, minute 00/30) instead of a free-form time input, so players can't even attempt an
  invalid slot like 18:15 — the backend's 30-minute-increment validation is now backed by a UI that
  can't produce anything else. See `client/src/components/TimeSlotPicker.jsx`.

## Phase 2 update (PLP/PDP redesign, image uploads, theme, join popup)

- **Product Listing Page (PLP)** — replaces the plain search page: a filter sidebar (price sort,
  Open/Private booking-type filter, multi-select sport) plus a responsive grid (4 cols desktop, 2
  tablet, 1 mobile). Cards show a cover image with carousel dots (hover to preview other images),
  sport tag, and price with an old-price strikethrough if the turf owner sets one.
- **Product Display Page (PDP)** — replaces the plain turf detail page: contextual header
  (sport · city · date), an image gallery with a clickable zoom overlay and thumbnail strip, the
  booking widget (unchanged logic from Phase 1) in the center column, and a right-hand scrollable
  panel listing that turf's currently joinable Open bookings.
- **Confirm/Join Booking popup** — booking a turf still opens the Phase 1 confirm/pay popup; joining
  an existing open booking (from the PDP's side panel or the "Join a game" page) now also opens a
  confirmation popup instead of joining instantly, matching the wireframe.
- **Real image upload** — turf owners can upload actual image files (not just paste URLs) for a cover
  image and a gallery, from the "Add turf" form. Files are uploaded via `multipart/form-data` to
  `POST /api/uploads/single` and `POST /api/uploads/multiple`, saved to `server/uploads/`, and served
  back over HTTP at `/uploads/<filename>`. 5MB/file limit, JPEG/PNG/WEBP/GIF only, owner-only.
- **Color theme** — green/white as the primary palette (already the base theme), plus a
  yellow/mint/red minor palette now used consistently for status badges (pending payment = yellow,
  confirmed = mint, cancelled/no-show = red) and the old-price strikethrough (red).
- **Mobile responsiveness** — PLP and PDP layouts collapse to single-column below ~700–1000px;
  the existing nav/grid responsiveness from the original MVP pass is preserved.

### Important: image storage has the same persistence caveat as the SQLite file

Uploaded images are saved to `server/uploads/` on whatever disk the backend process is running on.
**On Render's free tier (or any host without a persistent disk), this folder — like `turfspace.db` —
does not survive restarts or redeploys.** For a real pilot with turf owners uploading real photos,
either:
- Upgrade to a paid plan with a persistent disk (the included `render.yaml` already configures one,
  which covers both the database file and this uploads folder if you point `DB_PATH` and a
  corresponding uploads path at the same mounted disk), or
- Swap the upload routes for a real object storage service (S3, Cloudinary, etc.) — `routes/uploads.js`
  is a small, self-contained file, so this swap only touches that one file and the `publicUrlFor`
  helper inside it.

This wasn't feasible to build directly in this environment since it only has network access to
package registries (npm, PyPI, GitHub), not to any cloud storage provider's API.

## What's implemented (mapped to the PRD)

| PRD Epic | Status |
|---|---|
| Epic 1 — Search & Discovery | ✅ P0/P1 — search by city/sport, real-time availability by date |
| Epic 2 — Private booking | ✅ P0/P1 |
| Epic 3 — Open/joinable booking | ✅ P0/P1 — create open booking, browse, join, capacity tracking |
| Epic 4 — No-show handling | ✅ P1 — owner flags no-show, discounted re-fill listing, repeat no-show count on profile |
| Epic 5 — Turf owner management | ✅ P0/P1 — venue registration, booking calendar, notifications not yet wired to email/SMS (in-app only) |
| Epic 6 — User profile | ✅ P0/P1 — basic profile + booking history; portable cross-city profile is v2 (deferred) |
| HR-driven onboarding (Flow D) | ❌ Not built — explicitly deferred to v2 per PRD |
| Turf owner analytics/campaigns | ❌ Not built — deferred to v2; a basic fill-rate/no-show stat panel is included as the "analytics teaser" flagged as an open issue in the PRD |

## Hosting it online

You need two deployments: the API (backend) and the static site (frontend).

### Backend — Render (recommended, has a free tier)
1. Push this repo to GitHub.
2. In Render, create a **New Web Service**, point it at the repo, set **Root Directory** to `server`.
3. Build command: `npm install` · Start command: `npm start`.
4. Make sure Render's Node version is 22.5+ — either add an `"engines"` field (already set in
   `server/package.json`) or set the `NODE_VERSION` env var explicitly (e.g. `22` or later).
5. Add environment variables: `JWT_SECRET` (any long random string), `CLIENT_ORIGIN` (your deployed
   frontend URL, set after step below), `PORT` (Render sets this automatically, safe to leave unset).
6. **Important — SQLite persistence:** Render's *free* plan does not persist disk between deploys/restarts,
   so the SQLite file will reset periodically. For a real pilot with turf owners, upgrade to a paid Render
   plan and attach a persistent disk (a `render.yaml` is included in this repo with a disk pre-configured —
   Render will detect it automatically via "Blueprint" deploy). Alternatively, swap the queries in
   `server/src/db.js` and the route files for a hosted Postgres — flagging this as the one piece of
   technical debt to resolve before a real multi-week pilot, not something needed for a course demo.

Alternatives to Render: Railway and Fly.io both support persistent volumes on free/cheap tiers and work
the same way (root directory `server`, build `npm install`, start `npm start`).

### Frontend — Vercel or Netlify (both free for this use case)
1. Import the repo, set **Root Directory** to `client`.
2. Build command: `npm run build` · Output directory: `dist`.
3. Add environment variable `VITE_API_BASE_URL` = your deployed backend URL + `/api`
   (e.g. `https://turfspace-api.onrender.com/api`).
4. Deploy. Once live, go back to your backend's `CLIENT_ORIGIN` env var and set it to this frontend URL,
   then redeploy the backend so CORS allows requests from it.

### Quick single-command local demo (no hosting)
If you just want to demo it to your professor/team without deploying anywhere, running both `npm run dev`
(frontend) and `npm start` (backend) locally and sharing your screen is enough — no hosting needed for that.

## Known MVP limitations (intentional, per PRD cut list)
- No payment gateway integration — booking is recorded as "confirmed" without a real payment step
  (PRD flagged in-app payment as P0 conceptually, but wiring a live payment gateway is out of scope
  for a course MVP; swap in Razorpay/Stripe test mode if you want to demo that flow)
- No cost-splitting for open bookings (P2, deferred)
- No recurring bookings (Regular Organizer persona, deferred to v1.1)
- No analytics/campaign tools for turf owners beyond the basic stats panel (Growth-Minded Owner
  persona, deferred to v2)
- No HR/org onboarding flow (Flow D, deferred to v2)

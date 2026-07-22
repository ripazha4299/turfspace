# TurfSpace — MVP Codebase
TurfSpace 2.0 [Redesigned as a 16-bit game 22 July 2026]
<img width="1891" height="897" alt="image" src="https://github.com/user-attachments/assets/4828042a-e483-4493-9f1a-d957aa2d42c0" />
<img width="387" height="830" alt="image" src="https://github.com/user-attachments/assets/230d4dd4-a347-4e6c-80aa-10b85229acb3" /><img width="402" height="837" alt="image" src="https://github.com/user-attachments/assets/5bb9724d-54e6-4688-ba3c-67388561b3e8" />
<img width="417" height="828" alt="image" src="https://github.com/user-attachments/assets/506a549d-fba5-4523-820b-c108e25ce4e3" />


TurfSpace [Initial Design]
<img width="1905" height="870" alt="image" src="https://github.com/user-attachments/assets/2033a385-7195-422b-896d-6ca36e1c7a1e" />
<img width="1600" height="886" alt="image" src="https://github.com/user-attachments/assets/fe8a6e40-8c33-4423-9ece-a63ff76bc01d" />

<img width="281" height="607" alt="image" src="https://github.com/user-attachments/assets/2b4c6ec6-ea15-4843-aabd-e9d24b165f95" /><img width="395" height="797" alt="image" src="https://github.com/user-attachments/assets/12c1d5d3-8173-44dc-aac8-6db6ea0450b8" /><img width="285" height="610" alt="image" src="https://github.com/user-attachments/assets/2933d34f-6488-47a4-9684-f5618ab6f7ad" /><img width="282" height="611" alt="image" src="https://github.com/user-attachments/assets/0dbec825-d106-49ff-b5c9-17f83a51a227" />


## Latest round: messaging, Google SSO, campaigns, profiles, and fixes

- **Direct messaging** — any two users (player↔owner or otherwise) can message each other. Nav bar
  has a Messages link with an unread badge; conversations poll every 8s while open. Start a
  conversation from someone's public profile page.
- **Google Sign-In** — a "Sign in with Google" button on Login/Register, verified server-side via
  `google-auth-library`. **Needs your own Google Cloud OAuth Client ID to actually work** — see
  "Setting up Google Sign-In" below. New Google sign-ups default to the Player role.
- **Camera capture for turf photos** — the owner's image upload now offers "take a photo" as well
  as "choose a file" on mobile.
- **Public profiles** — view any user's basic profile (`/users/:id`); owners' profiles list their
  turfs. Email is deliberately never shown on a public profile.
- **Share any booking, join only the open ones** — the shareable `/games/:id` page now works for
  private bookings too (shows details, no join button); only open bookings are joinable.
- **Sport-filtered search from the homepage** — turf cards on the home page now route directly to
  the search page with that sport already selected, and the search page reads `sports` / `city`
  query params so the filters persist in the URL.
- **Global loading state** — a new app-wide loader spinner appears during API fetches with the
  message “Good things take time.”
- **Past open bookings are now completed** — open bookings whose date/time has already passed are
  automatically marked as `completed`, removed from joinable open-game listings, and surfaced in
  My Bookings behind a new `Show completed` filter.
- **Banner campaigns** — owners can run a full-width promotional banner on the turf search page
  (their own promo image/text on one side, live turf details — photo, description, price — on the
  other). Manage campaigns from the Owner Dashboard.
- **Cross-turf booking is now allowed** (with a disclaimer) — a deliberate rule change: a player
  CAN now book two different turfs at the same time slot (e.g. booking one for a friend); same-turf
  double-booking is still blocked. A "Booking for a friend?" disclaimer with a Share button appears
  when this happens.
- **Fixed: login redirect losing your place** — following a shared link while logged out, then
  logging in or registering, now correctly returns you to that same page instead of a generic one.

### Setting up Google Sign-In (required for that feature to work)
1. Go to https://console.cloud.google.com/apis/credentials, create an OAuth Client ID of type
   **Web application**.
2. Under "Authorized JavaScript origins," add your frontend's URL (e.g. `http://localhost:5173`
   for local dev, and your real deployed frontend URL later).
3. Copy the generated Client ID into **both** `client/.env` (`VITE_GOOGLE_CLIENT_ID`) and
   `server/.env` (`GOOGLE_CLIENT_ID`) — same value in both places.
4. Without this, the Google button still renders but signing in will fail with a clear error
   rather than crashing anything.

Full-stack implementation of the TurfSpace MVP (see PRD): a two-sided marketplace connecting
relocating professionals ("Individual Players") with sports venues ("Turf Owners"), scoped to the
P0/P1 stories — search & discovery, private booking, open/joinable booking, turf owner management,
no-show handling, and basic profiles.


# TurfSpace — MVP

Hey! This is my full-stack build of TurfSpace — a two-sided marketplace connecting relocating
professionals ("Individual Players") with sports venues ("Turf Owners"). I scoped it to the P0/P1
stories from my PRD: search & discovery, private booking, open/joinable booking, turf owner
management, no-show handling, and basic profiles.

I've been building this in phases as I go, so this README doubles as a running log of what's been
added and why. Skip to whichever section is useful to you.
[PS: Sometimes I forget updating this file, so you can check the commit logs on master to understand better]

If you want to try **this on your local**, you may follow this MD file as a step by step guide

## Stack

- **Backend:** Node.js + Express + SQLite, using Node's **built-in** `node:sqlite` module — no native
  compilation, no Python/C++ build tools needed
- **Auth:** JWT + bcrypt password hashing
- **Frontend:** React (Vite), React Router, plain CSS — no UI framework, so it's easy to restyle
- **No paid services required** — both halves run fine on free tiers
- **Requires Node.js v22.5+** (for `node:sqlite`). Check with `node --version`; grab a current LTS
  from nodejs.org if you're behind. You'll see a one-line
  `ExperimentalWarning: SQLite is an experimental feature` on startup — that's normal, ignore it.

## Project structure

```
turfspace/
  server/     # Express API + SQLite
  client/     # React frontend (Vite)
  render.yaml # optional Render deploy config for the backend
```

## Running it locally

### Quickest way (from the repo root, not inside `server/` or `client/`)

```bash
npm install          # installs the two small root devDependencies (concurrently, wait-on)
npm run install:all  # installs server/ deps, then client/ deps, one after the other
```

Set up your env files (one-time):
```bash
cp server/.env.example server/.env   # edit JWT_SECRET to any long random string
cp client/.env.example client/.env
```

Then every time you want to run it:
```bash
npm run dev
```
This starts the backend first, waits for its `/api/health` endpoint to actually respond, and *then*
starts the frontend — so you won't hit "failed to fetch" errors from the client starting before the
API is ready. Both processes log as `SERVER` / `CLIENT` in the same terminal; Ctrl+C stops both.

### Running them separately, if you'd rather

**Backend:**
```bash
cd server
cp .env.example .env    # edit JWT_SECRET to any long random string
npm install
npm start                # runs on http://localhost:4000
```
The SQLite file (`turfspace.db`) is created automatically on first run — no separate DB setup.

**Frontend:**
```bash
cd client
cp .env.example .env     # points VITE_API_BASE_URL at your backend
npm install
npm run dev               # runs on http://localhost:5173
```

Open http://localhost:5173, register as a **Player** or a **Turf Owner**, and try the core flows:
search turfs → book privately or mark a booking "open" → browse/join open games → owner dashboard to
list a turf, view the calendar, and flag no-shows.

## What's implemented (mapped to the PRD)

| PRD Epic | Status |
|---|---|
| Epic 1 — Search & Discovery | ✅ P0/P1 — search by city/sport, real-time availability by date |
| Epic 2 — Private booking | ✅ P0/P1 |
| Epic 3 — Open/joinable booking | ✅ P0/P1 — create open booking, browse, join, capacity tracking |
| Epic 4 — No-show handling | ✅ P1 — owner flags no-show, discounted re-fill listing, repeat no-show count on profile |
| Epic 5 — Turf owner management | ✅ P0/P1 — venue registration, booking calendar, notifications not yet wired to email/SMS (in-app only) |
| Epic 6 — User profile | ✅ P0/P1 — basic profile + booking history; portable cross-city profile is v2 (deferred) |
| HR-driven onboarding (Flow D) | ❌ Not built — deferred to v2 per PRD |
| Turf owner analytics/campaigns | ❌ Not built — deferred to v2; a basic fill-rate/no-show stat panel is included as an "analytics teaser" |

## Hosting it online

You need two deployments: the API (backend) and the static site (frontend).

### Backend — Render (recommended, free tier available)

1. Push this repo to GitHub.
2. In Render, create a **New Web Service**, point it at the repo, set **Root Directory** to `server`.
3. Build command: `npm install` · Start command: `npm start`.
4. Make sure Render's Node version is 22.5+ — either rely on the `"engines"` field (already set in
   `server/package.json`) or set the `NODE_VERSION` env var explicitly (`22` or later).
5. Add environment variables: `JWT_SECRET` (any long random string), `CLIENT_ORIGIN` (your deployed
   frontend URL — set this after deploying the frontend), `PORT` (Render sets this automatically).
6. **Heads up on SQLite persistence:** Render's *free* plan doesn't persist disk between
   deploys/restarts, so the SQLite file resets periodically. For a real pilot, upgrade to a paid
   Render plan and attach a persistent disk (there's a `render.yaml` in this repo with a disk
   pre-configured — Render will pick it up automatically via "Blueprint" deploy). Or swap the
   queries in `server/src/db.js` and the route files for a hosted Postgres — that's the one piece of
   tech debt I'd flag before running a real multi-week pilot, not something you need for a demo.

Railway and Fly.io both work as alternatives — same setup (root directory `server`, build
`npm install`, start `npm start`), and both support persistent volumes on free/cheap tiers.

### Frontend — Vercel or Netlify (both free for this)

1. Import the repo, set **Root Directory** to `client`.
2. Build command: `npm run build` · Output directory: `dist`.
3. Add environment variable `VITE_API_BASE_URL` = your deployed backend URL + `/api`
   (e.g. `https://turfspace-api.onrender.com/api`) — no quotes around the value.
4. Deploy. Once it's live, go back to your backend's `CLIENT_ORIGIN` env var, set it to this
   frontend URL, and redeploy the backend so CORS allows requests from it.

### Just want to demo it locally?

Running `npm run dev` (frontend) and `npm start` (backend) and sharing your screen is enough —
no hosting needed for that.

## Known limitations (intentional, per my PRD's cut list)

- No real payment gateway — bookings are recorded as "confirmed" without an actual payment step
  (in-app payment was P0 conceptually, but wiring a live gateway was out of scope for a course MVP;
  swap in Razorpay/Stripe test mode if you want to demo that flow)
- No cost-splitting for open bookings (P2, deferred)
- No recurring bookings (Regular Organizer persona, deferred to v1.1)
- No analytics/campaign tools for turf owners beyond the basic stats panel (Growth-Minded Owner
  persona, deferred to v2)
- No HR/org onboarding flow (Flow D, deferred to v2)

## Build log — phase by phase

I'm keeping this section so I (and anyone following along) can see how the project evolved.

### Phase 1 — booking rules, confirm/pay flow, payment model

- **Slot validation:** minimum 1-hour bookings, 30-minute increments after that; zero-length slots
  (e.g. 16:00–16:00) are rejected outright.
- **Cross-type slot exclusivity:** the same time slot can never be booked as both Private and Open
  (or double-booked at all) — this was already implicit in the overlap logic and is now explicitly
  covered by tests.
- **Free / Partial / Full payment model**, configurable per turf:
  - Owners toggle `allow_free_booking` and `allow_partial_booking` (with a `partial_token_pct`,
    minimum 15%) when creating/editing a turf. **Full is always available** regardless of these toggles.
  - Booking creation requires a `payment_type` and computes `amount_total` / `amount_due` from the
    turf's rate and slot duration.
  - **Full payment bookings** must be created (and paid) at least 30 minutes before the slot starts —
    enforced both at creation and at payment time.
  - **Free bookings** confirm immediately, no payment step.
  - **Partial/Full bookings** are created in a `pending_payment` state and need a call to
    `POST /bookings/:id/pay` (the "Pay Now" step) to become `confirmed`. This is a simulated
    payment — no real gateway wired up yet.
- **First-payer-only rule for Open bookings:** only the creator of an open booking pays; anyone who
  joins later joins for free.
- **Cancellation fee:** cancelling a booking that was already paid deducts the turf's
  `cancellation_fee_pct` (default 15%) from the total and records a `refund_amount` for the
  remainder — bookkeeping only, no real refund is processed.
- **Confirm/Pay popup:** booking a turf opens a summary popup showing the slot, payment type, and
  amount due, with **Pay Now** / **Cancel** actions. Free bookings skip straight to a confirmation
  state.
- **Owner dashboard:** the "Add turf" form now includes toggles for free/partial bookings and the
  partial token percentage.
- **My Bookings:** shows payment status, amount due/paid, and a **Pay Now** button for anything
  still `pending_payment`, plus refund amount on cancelled bookings.

Not done yet in this phase (deferred to Phase 2): the redesigned Product Listing Page (PLP) with
filters/grid, the redesigned Product Display Page (PDP) with image gallery and the right-hand
scrollable open-bookings list, a full mobile-responsive pass, and the green/white + yellow/mint/red
color theme from my wireframe notes.

**One thing to know if you're upgrading:** the booking/turf table schema changed (new payment
columns). If you have a `turfspace.db` from before this update, delete it before starting the server
again — `CREATE TABLE IF NOT EXISTS` won't retrofit new columns onto an existing table.

### Phase 2 — PLP/PDP redesign, image uploads, theme, join popup

- **Product Listing Page (PLP)** — replaces the plain search page: filter sidebar (price sort,
  Open/Private booking-type filter, multi-select sport) plus a responsive grid (4 cols desktop,
  2 tablet, 1 mobile). Cards show a cover image with carousel dots (hover to preview other images),
  sport tag, and price with an old-price strikethrough if the owner sets one.
- **Product Display Page (PDP)** — replaces the plain turf detail page: contextual header
  (sport · city · date), an image gallery with a clickable zoom overlay and thumbnail strip, the
  booking widget in the center column (same logic as Phase 1), and a right-hand scrollable panel
  listing that turf's currently joinable Open bookings.
- **Confirm/Join Booking popup** — booking a turf still opens the Phase 1 confirm/pay popup;
  joining an existing open booking now also opens a confirmation popup instead of joining instantly.
- **Real image upload** — owners can upload actual image files (not just paste URLs) for a cover
  image and a gallery, via `POST /api/uploads/single` and `POST /api/uploads/multiple`, saved to
  `server/uploads/` and served at `/uploads/<filename>`. 5MB/file limit, JPEG/PNG/WEBP/GIF only,
  owner-only.
- **Color theme** — green/white as the primary palette, plus a yellow/mint/red minor palette used
  for status badges (pending payment = yellow, confirmed = mint, cancelled/no-show = red) and the
  old-price strikethrough.
- **Mobile responsiveness** — PLP and PDP collapse to single-column below ~700–1000px.

**Important — image storage has the same persistence caveat as the SQLite file.** Uploaded images
land in `server/uploads/` on whatever disk the backend is running on. On Render's free tier (or any
host without a persistent disk), this folder — like `turfspace.db` — doesn't survive
restarts/redeploys. For a real pilot, either upgrade to a paid Render plan with a persistent disk
(the included `render.yaml` already configures one — point `DB_PATH` and a corresponding uploads
path at the same mounted disk), or swap the upload routes for real object storage (S3, Cloudinary,
etc.) — `routes/uploads.js` is small and self-contained, so that swap only touches that file and its
`publicUrlFor` helper.

### Turf editing, double-booking fix, time slot precision

- **Owner turf editing:** the Owner Dashboard's turf list now has an **Edit** button per turf,
  opening the same creation form pre-filled — rate, old price, description, hours, payment config,
  cover image, and gallery can all be changed via `PUT /api/turfs/:id`. Ownership is enforced
  server-side (you can't edit another owner's turf).
- **Cross-turf double-booking fix:** previously the overlap check only looked at bookings *on the
  same turf*, so a player could still book/join overlapping slots at two different turfs at once.
  There's now a player-level check (`checkPlayerFree` in `routes/bookings.js`) that looks at every
  booking a player created **or joined**, across all turfs, and blocks anything overlapping — same
  rule, enforced both at creation and at join time.
- **Time slot input restricted to :00/:30:** the booking widget now uses two dropdowns (hour 00–23,
  minute 00/30) instead of free-form text, so players can't even attempt an invalid slot like
  18:15 — the backend's 30-minute-increment rule is now backed by a UI that can't produce anything
  else. See `client/src/components/TimeSlotPicker.jsx`.

### Multi-sport turfs, dark theme, mobile filters, About page

- **Turfs can support multiple sports** — a real data model change, not just UI. `turfs.sport_type`
  (a single string) was replaced with `turfs.sports` (a JSON array), validated server-side against
  the same fixed list used in the PLP filters. The owner's turf form is now a multi-select checkbox
  group instead of one dropdown, and everywhere a turf's sport shows up (PLP cards, PDP, My
  Bookings, Owner Dashboard, Join-a-game cards) now displays all of them as chips.
  **This is a breaking schema change — delete `turfspace.db` before restarting**, same as any
  previous schema change.
- **Cancel confirmation** — cancelling a booking or leaving a joined game now shows a native
  "Are you sure?" dialog first.
- **About page** (`/about`) — includes placeholder social links (clearly marked, swap in real ones
  whenever they exist) and a contact form that opens the visitor's own email client, pre-addressed
  and pre-filled. It's a `mailto:` link rather than a server-sent email, since I didn't have a route
  to an SMTP/email provider while building this — that's a small addition later if you wire up
  something like SendGrid, Resend, or Postmark.
- **Dark theme** — a 🌙/☀️ toggle in the navbar switches the whole app, persisted in
  `localStorage`. Implemented entirely through CSS custom properties (`--surface`, `--ink`,
  `--border`, etc.) that swap under a `[data-theme="dark"]` selector, so no component code needed
  to change.

### Mobile nav, notifications, ticket-style modals

- **Mobile nav** collapses into a hamburger menu below ~800px instead of overflowing.
- **Join-booking popup** — joining an open game now opens the same ticket-styled confirmation popup
  used for booking, instead of joining instantly.
- **Leave a joined game** — "Games I joined" now has a **Leave game** button
  (`POST /api/bookings/:id/leave`). No fee applies since joiners never paid.
- **Notifications** — the turf owner gets notified in-app (bell icon, top right) whenever someone
  joins or leaves their open booking. A small `notifications` table backs this; the bell polls every
  30s. In-app only for now — email/push would need a provider I didn't have access to while building.
- **PDP layout changes** — turf title + location now sit above the hero image; the "About"
  description moved to the right column below the open-bookings panel; the middle availability list
  was removed (the open-bookings panel + booking-time validation already cover that); the top bar
  (back button, sport, city, date) is a more prominent banner now.
- **PLP image carousel** auto-rotates every 1500ms instead of requiring hover.
- **Ticket-styled modals** — confirm-booking, join-booking, and read-only booking-detail popups all
  share a `TicketModal` component styled like a match ticket: ~2/3 details + actions on the left,
  ~1/3 turf photo/name/location "stub" on the right, dashed perforation between them.
- **Clickable bookings everywhere** — rows in My Bookings and the Owner Dashboard's calendar now
  open a read-only ticket popup with full details, with monetary fields highlighted.
- **My Bookings layout** — "Bookings I created" and "Games I joined" sit side-by-side on large
  screens (≥992px), stacked on mobile. A "Show cancelled" checkbox filters cancelled bookings out
  of both lists by default.
- **Owner sport selection** — the turf create/edit form uses a dropdown restricted to the same
  sport list used in the PLP filters (`client/src/constants.js`), so a turf's sport always matches
  something a player can filter by.
- **Player/turf icons** — 👤 next to player names, 🏠 next to turf-owner context, used in the
  navbar, My Bookings, and the Owner Dashboard's calendar.

---

That's the project as it stands. If you're poking around the code and something's unclear, open an
issue or reach out — contact details are on the About page in the app itself.

# WildEye — Smart Wildlife Conservation and Anti-Poaching Monitoring System

WildEye is a web-based monitoring platform for wildlife rangers and park supervisors. It covers
four operational areas: ranger incident reporting in areas without connectivity, live wildlife
tracking against geofenced risk zones, community sighting reports, and camera-trap capture review.

The system is a TypeScript monorepo — an Express/MongoDB API and a React single-page frontend.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the Application](#running-the-application)
- [Use Cases](#use-cases)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Team](#team)
- [Notes and Limitations](#notes-and-limitations)

---

## Tech Stack

**Backend**

| Package | Version | Purpose |
|---|---|---|
| Node.js | 18+ (developed on 22.x) | Runtime |
| Express | ^4.21 | HTTP server and routing |
| Mongoose | ^8.5 | MongoDB object modelling |
| Multer | ^2.4 | Incident photo uploads |
| CORS / dotenv | — | Cross-origin access, env config |
| Jest + ts-jest + supertest | — | Unit and API tests |
| TypeScript | ^5.5 | Type safety |

**Frontend**

| Package | Version | Purpose |
|---|---|---|
| React | ^18 | UI library |
| React Router DOM | ^6 | Client-side routing |
| react-leaflet + Leaflet | ^4 | Risk-zone and animal map |
| Vite | ^5 | Dev server and build |
| Vitest + Testing Library + jsdom | — | Component and unit tests |
| TypeScript | ^5.5 | Type safety |

---

## Prerequisites

- **Node.js 18 or newer** — check with `node --version`
- **npm 9 or newer** (bundled with Node)
- **A MongoDB Atlas account** (free tier is sufficient) — database credentials
- A modern browser

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Kavinda276/WildEye.git
cd WildEye
```

### 2. Install backend dependencies

```bash
cd Backend
npm install
```

### 3. Configure the backend environment

Create `Backend/.env` by copying the template:

```bash
cp .env.example .env
```

Edit `.env` and insert your own connection string:

```
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/WildEye
NODE_ENV=development
```

> **Important — character escaping.** If your Atlas password contains any of `@ : / ? # [ ] %`,
> it must be percent-encoded in the URI (`@` becomes `%40`, `#` becomes `%23`, and so on).
> A `#` in an unencoded password is also treated as a comment by `.env` parsers.
> The simplest fix is to reset the database user password to one containing only letters and digits.

> **Important — IP allowlist.** Atlas only accepts connections from whitelisted IP addresses.
> In the Atlas portal go to **Network Access**. Either add each team member's public IP
> (check at `whatismyip.com`) or click **Allow access from anywhere** (`0.0.0.0/0`), which is
> acceptable for coursework but should not be used with real data.

### 4. Install frontend dependencies

```bash
cd ../Frontend
npm install
```

---

## Running the Application

You need two terminals.

**Terminal 1 — backend (port 5000):**

```bash
cd Backend
npm run dev
```

**Terminal 2 — frontend (port 3000):**

```bash
cd Frontend
npm run dev
```

Open **<http://localhost:3000>**.

Verify the backend is reachable at <http://localhost:5000/api/health> — it should return a JSON
success response.

Vite proxies all `/api` and `/uploads` requests to port 5000, so no CORS setup is needed in
development.

### Loading sample data

- **Supervisor Dashboard → "Load Seed Data"** loads 5 collared animals and 3 risk zones.
- **Camera Trap Review → "Load Captures"** loads 5 camera trap captures.

Without sample data the map and review queues will be empty.

---

## Use Cases

### UC01 — Ranger Incident Reporting (offline-first)

Rangers log poaching and wildlife incidents from the field, often without connectivity.

- Incident form with type, GPS or manual coordinates, description, and optional photo
- **Offline capture** — if the server cannot be reached the incident is written to IndexedDB with
  `Pending` sync status instead of being lost
- Appears under **Pending Sync** in the incident history
- **Automatic synchronisation** when connectivity returns (`online` event, on page load, and on a
  30-second retry timer while pending items exist)
- Failed uploads retried up to **3 times** with linear backoff
- A `localId` idempotency key is sent with every upload, so a retry after a lost response cannot
  create a duplicate record
- Successful syncs are removed from IndexedDB and appear on the Supervisor Dashboard

### UC02 — Wildlife Monitoring and Alerts

Supervisors track collared animals against geofenced risk zones.

- Leaflet map with risk-zone polygons and live animal positions
- **Movement simulation** — an animal is moved to a coordinate and checked against all risk zones
- Automatic alert creation on entering a zone, with priority mapped from zone severity
  (High → Critical, Medium → High, Low → Medium)
- An existing active alert is **reused rather than duplicated** when the same animal re-enters a zone
- **Signal Lost** simulation sets the collar status and raises a `High` priority alert
- Alert dispatch to a named responder, with active alert deletion for repeat demonstrations
- Tabbed dashboard keeps the five data sections separately navigable

### UC03 — Community Reporting

Local communities report sightings and crop damage.

- Elephant Sighting and Crop-Raiding Incident report types
- GPS capture or manual coordinates, with range validation
- **Automatic responder assignment** when a responder is available; falls back to
  `Pending Assignment` when none are
- SMS simulation — a message is parsed and converted into a structured report
- Responder availability toggle (demo control) to demonstrate the pending-assignment path
- Reports surfaced on the Supervisor Dashboard

### UC04 — Camera Trap Review

Review and classify camera trap captures.

Four classification outcomes:

| Classification | Alert created | Capture status |
|---|---|---|
| Species Sighting | Yes, `Medium` priority | `reviewed` |
| Poacher Alert | Yes, `Critical` priority (with confirmation prompt) | `reviewed` |
| False Trigger | No | `reviewed` |
| Needs Second Review | No | `needs_second_review` |

- False triggers are **never** raised as alerts and never appear on the Supervisor Dashboard
- Second-review captures are held in a **dedicated follow-up section** and can be re-classified
  into any of the four outcomes
- A capture produces **at most one alert**; re-classification updates the existing alert
- Session summary counters stay consistent with the generated report — finalising a second-review
  item decrements `secondReviews` and increments the final classification
- Session reports count `totalReviewed` from reviewed captures only, excluding those still
  awaiting follow-up

---

## API Reference

All responses follow the envelope `{ success, data }` or `{ success, message }`.

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | API status check |

### Incidents — `/api/incidents`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/incidents` | Create incident (multipart, accepts `photo`) |
| GET | `/api/incidents` | List all incidents |
| GET | `/api/incidents/:id` | Fetch one incident |
| PATCH | `/api/incidents/:id/sync` | Update sync status |
| PATCH | `/api/incidents/:id/review` | Update review status |

### Animals — `/api/animals`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/animals` | List tracked animals |
| GET | `/api/animals/:id` | Fetch one animal |
| POST | `/api/animals/:id/simulate` | Move animal, check risk zones, raise alert |
| PATCH | `/api/animals/:id/collar-status` | Set collar status (`Active` / `Signal Lost` / `Inactive`) |
| POST | `/api/animals/seed` | Seed sample animals |

### Risk Zones — `/api/risk-zones`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/risk-zones` | List active zones |
| GET | `/api/risk-zones/:id` | Fetch one zone |
| POST | `/api/risk-zones/seed` | Seed sample zones |

### Wildlife Alerts — `/api/wildlife-alerts`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/wildlife-alerts` | List alerts |
| POST | `/api/wildlife-alerts` | Create alert from animal and zone ids |
| PATCH | `/api/wildlife-alerts/:id/dispatch` | Dispatch to a responder |
| PATCH | `/api/wildlife-alerts/:id/status` | Update status |
| DELETE | `/api/wildlife-alerts/:id` | Delete an alert |

### Community Reports — `/api/community-reports`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/community-reports` | Submit report (auto-assigns a responder) |
| GET | `/api/community-reports` | List reports |
| GET | `/api/community-reports/responders` | List responders and availability |
| PATCH | `/api/community-reports/responders/availability` | Set responder availability |
| GET | `/api/community-reports/:id` | Fetch one report |
| PATCH | `/api/community-reports/:id/responder` | Assign a responder |

### Camera Traps — `/api/camera-traps`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/camera-traps/seed` | Seed sample captures |
| GET | `/api/camera-traps/pending` | Captures awaiting review |
| GET | `/api/camera-traps/needs-second-review` | Captures awaiting follow-up |
| GET | `/api/camera-traps/alerts` | Camera trap alerts |
| GET | `/api/camera-traps/reports` | Generated session reports |
| POST | `/api/camera-traps/reports/generate` | Generate a session report |
| GET | `/api/camera-traps/:id` | Fetch one capture |
| PATCH | `/api/camera-traps/:id/classify` | Classify a capture |

---

## Testing

**394 automated tests** — 190 backend, 204 frontend. All passing.

| Suite | Command | Coverage |
|---|---|---|
| Backend | `cd Backend && npm test` | 84% |
| Frontend | `cd Frontend && npm test` | 86% |

```bash
# Backend
cd Backend
npm test              # 190 tests
npm run test:coverage # with coverage report

# Frontend
cd Frontend
npm test              # 204 tests
npm run test:coverage # with coverage report
```

### Running tests for a single use case

Backend:

```bash
cd Backend

# UC01
npx jest incident uc03uc04

# UC02
npx jest uc02services animalController riskZone wildlifeAlert

# UC03
npx jest communityReport uc03uc04

# UC04
npx jest cameraTrap uc03uc04
```

Frontend:

```bash
cd Frontend

# UC01
npx vitest run Incident incident offlineIncident RangerPortal NetworkStatus

# UC02
npx vitest run wildlifeApi uc02components

# UC03
npx vitest run CommunityReporting communityReportApi

# UC04
npx vitest run CameraTrap cameraTrapApi
```

> **Note.** `uc03uc04.test.ts` covers both UC03 and UC04, so it appears in both lists.
>
> Running a filtered subset reports coverage against the **entire** backend, not just the files
> that subset touches — so filtered coverage numbers are always low and should be ignored.
> Use `npm run test:coverage` for a meaningful figure.

---

## Project Structure

```
WildEye/
├── Backend/
│   ├── src/
│   │   ├── config/          env config and MongoDB connection
│   │   ├── controllers/     request handling per resource
│   │   ├── middleware/      error handling, 404, photo upload
│   │   ├── models/          Mongoose schemas
│   │   ├── routes/          Express routers
│   │   ├── services/        business logic
│   │   ├── __tests__/       Jest suites
│   │   ├── app.ts           Express app assembly
│   │   └── server.ts        server entry point
│   ├── .env.example
│   ├── jest.config.js
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      shared components
│   │   │   ├── ranger/      UC01 components
│   │   │   └── supervisor/  dashboard sections
│   │   ├── pages/           one file per route
│   │   ├── services/        API client modules
│   │   ├── types/           TypeScript interfaces
│   │   ├── __tests__/       Vitest suites
│   │   ├── App.tsx          route definitions
│   │   └── main.tsx         React entry point
│   ├── vite.config.ts
│   └── package.json
│
└── ReadMe.md
```

### Application routes

| Path | Page |
|---|---|
| `/` | Landing page with portal cards |
| `/ranger` | Ranger incident logging |
| `/supervisor` | Supervisor dashboard (tabbed) |
| `/community` | Community reporting |
| `/camera-traps` | Camera trap review |
| `*` | 404 page |

---

## Team

| Member | GitHub | Use case |
|---|---|---|
| Imalka Deshan | `Imalka-uc01` | UC01 — Ranger Incident Reporting (offline-first) |
| Kavinda Dissanayake | `Kavinda-uc02` | UC02 — Wildlife Monitoring and Alerts |
| Induni | `Induni3-uc03` | UC03 — Community Reporting |
| Gayasha Gimhani | `Gayasha-uc04` | UC04 — Camera Trap Review |

Each member contributed their use case on a dedicated feature branch, submitted through a pull
request, and was merged into `main` individually with verification after each merge.

---

## Notes and Limitations

- **Local development only.** The Vite dev server is configured for development; there is no
  production build or deployment configuration in this repository.
- **Responder availability is in-memory** on the backend, so it resets whenever the server restarts.
  Reports and incidents are persisted in MongoDB.
- **Camera trap images are external URLs** seeded from a stock photo provider; they require an
  internet connection to render.
- **Incident photos** are written to `Backend/uploads/` on local disk, which is gitignored and not
  suitable for multi-instance deployment.
- **Authentication and authorisation are not implemented.** All routes are publicly accessible; this
  project is scoped to functional demonstration rather than production hardening.
- **The browser blocks silent geolocation permission requests.** GPS capture requires the user to
  grant location access via the address-bar site settings. Manual coordinate entry is always
  available as a fallback.
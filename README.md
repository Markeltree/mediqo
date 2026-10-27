# Mediqo

End-to-end healthcare booking platform.

| Part     | Stack                                                                              |
|----------|-------------------------------------------------------------------------------------|
| `mobile` | React Native (Expo Router), Reanimated animations, expo-location, react-native-maps |
| `admin`  | Next.js 14 (App Router): public website (landing, Terms, Privacy) and the dashboard for hospitals, clinics, reception staff and the Mediqo team |
| `server` | Node.js + Express, MongoDB (Mongoose, 2dsphere geo queries), JWT auth, Web Push, Anthropic Claude |

## How it fits together

- **Hospitals** register on the web panel (`/register`) and wait for Mediqo approval. The hospital admin creates departments, adds doctors (department, fee, OPD timings) and reception staff. **Reception confirms** patient bookings.
- **Clinics** are registered by their doctor, who runs the single-doctor clinic and **confirms their own** bookings.
- **A doctor can sit at several places** (e.g. their own clinic plus a hospital). Each place is a *practice* with its own fee and timings; a booked time blocks the doctor everywhere.
- **Mediqo admins** approve hospitals/clinics and verify each doctor's credentials once. Patients only see approved facilities and verified doctors.
- **Patients** (mobile) browse nearby doctors, or hospital → department → doctor, pick a slot and book.

| Role | Where | Does |
|------|-------|------|
| `patient` | mobile | Find and book doctors |
| `doctor` | mobile + web | Sees visits at every facility; confirms clinic bookings; edits clinic fee/timings on web |
| `facility_admin` | web | Runs a hospital: details, departments, doctors, staff, appointments |
| `receptionist` | web | Confirms / cancels the hospital's bookings |
| `admin` | web | Mediqo platform team |

## Features

- **Secure auth**: bcrypt (12 rounds) password hashing, signed JWTs, rate-limited auth routes, Helmet headers, role checks, tokens stored in SecureStore on mobile. Staff created by a hospital get a temporary password and must change it on first sign-in.
- **Geolocation**: device location saved to the profile; `$geoNear` finds bookable doctors and hospitals within a radius, sorted by distance.
- **Booking**: slot generation from each practice's weekly timings in the facility's timezone (default `Asia/Karachi`), server-side slot validation, and a partial unique index that prevents double-booking races.
- **Notifications**: every booking and status change, plus a "starts soon" reminder before confirmed visits, is stored as an in-app notification (inbox in the app, bell in the web panel). The web panel can also show browser (Web Push) alerts; dead subscriptions are pruned automatically. The mobile app has no push notifications.
- **AI (Claude)**: a symptom assistant with safety guardrails (no diagnosis or dosing, emergency escalation), plus a "suggest a specialist" triage that combines Claude's output with nearby doctors.
- **Admin**: stats, doctor verification queue, user enable/disable, appointment log.

## Setup

### 1. Server

```bash
cd server
cp .env.example .env          # set MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY
npm install
npm run seed                  # demo hospital, clinics and doctors around Karachi (password: Password123!)
npm run dev                   # http://localhost:4000
```

`npm run seed` wipes all doctors, facilities, departments, practices and appointments, then recreates the demo data.

Demo accounts (password `Password123!`):

| Email | Role |
|-------|------|
| `admin@demo.mediqo` | Mediqo admin (web) |
| `hospital@demo.mediqo` | Admin of City General Hospital (web) |
| `reception@demo.mediqo` | Hospital receptionist (web) |
| `ayesha@demo.mediqo` | Doctor with her own clinic who also sits at the hospital |
| `omer@demo.mediqo` | Doctor with a dental clinic |
| `bilal@demo.mediqo`, `sara@demo.mediqo` | Hospital doctors |
| `patient@demo.mediqo` | Patient (mobile) |

### 2. Admin dashboard

```bash
cd admin
cp .env.local.example .env.local   # NEXT_PUBLIC_GOOGLE_MAPS_API_KEY turns on the map picker
npm install
npm run dev                   # http://localhost:3000 — landing page; /login, /register, /dashboard, /terms, /privacy
```

### 3. Mobile app

```bash
cd mobile
cp .env.example .env          # API URL, Google Maps keys, EAS project id
npm install
npx eas init                  # prints the project id for EAS_PROJECT_ID
npx expo start
```

All keys live in `mobile/.env`; `app.config.js` injects them into the native config.

| Key | Where to get it |
|-----|-----------------|
| `GOOGLE_MAPS_API_KEY` (or the `_ANDROID_` / `_IOS_` variants) | Google Cloud → enable *Maps SDK for Android* / *Maps SDK for iOS* |
| `EAS_PROJECT_ID` | `npx eas init` |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (server `.env`) | `npx web-push generate-vapid-keys` — turns on desktop alerts in the web panel |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (admin `.env.local`) | Google Cloud → enable *Maps JavaScript API* and *Places API (New)* |

Native maps keys only take effect in a build, not in Expo Go.

## Deploy

### 1. Database: MongoDB Atlas

Create a cluster, a database user, and allow access from anywhere (`0.0.0.0/0`), because Vercel functions have no fixed IP. Use the `mongodb+srv://…/mediqo` connection string as `MONGODB_URI`.

### 2. API on Vercel (`server/`)

`server/api/index.js` serves the Express app as one Vercel function, and `server/vercel.json` routes every path to it.

1. Vercel → *Add New Project* → import this repo → **Root Directory: `server`** → Framework preset *Other*.
2. Environment variables: `MONGODB_URI`, `JWT_SECRET` (a new long random string), `JWT_EXPIRES_IN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `CORS_ORIGINS` (the admin URL from step 3), `VAPID_*`, `REMINDER_LEAD_MINUTES`, `CRON_SECRET`.
3. Deploy, then check `https://<api>.vercel.app/api/health`.

**Visit reminders.** Vercel's Hobby plan only runs cron jobs once a day, so call the reminder endpoint every 5 minutes from a free scheduler such as [cron-job.org](https://cron-job.org):

- URL: `https://<api>.vercel.app/api/cron/reminders`, method `GET`
- Header: `Authorization: Bearer <CRON_SECRET>`

On a Pro plan you can use Vercel Cron instead (`"crons": [{ "path": "/api/cron/reminders", "schedule": "*/5 * * * *" }]` in `vercel.json`); Vercel sends the same header automatically.

### 3. Web panel on Vercel (`admin/`)

1. Vercel → *Add New Project* → same repo → **Root Directory: `admin`** (Next.js is detected).
2. Environment variables: `NEXT_PUBLIC_API_URL=https://<api>.vercel.app/api`, `NEXT_PUBLIC_CONTACT_EMAIL` (shown on Terms/Privacy), `NEXT_PUBLIC_PLAY_STORE_URL` (once the app is live), and optionally `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.
3. Deploy, then add the admin URL to the API's `CORS_ORIGINS` and redeploy the API.

The same deployment serves the public site: `/` (landing), `/terms`, `/privacy`, and the dashboard at `/login` → `/dashboard` (Mediqo admins) or `/facility` (hospitals and clinics).

### 4. Android app on Google Play (`mobile/`)

`android/` and `ios/` are not committed; EAS Build generates them from `app.json`.

1. Set the production API URL in `mobile/eas.json` → `build.production.env.EXPO_PUBLIC_API_URL`.
2. Add the Maps key for cloud builds (they do not see `mobile/.env`):
   `eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --value <key> --environment production --visibility sensitive`
3. `eas build --profile production --platform android`: an `.aab`, signed with a keystore EAS creates and stores for you, version code auto-incremented.
4. Play Console ($25 one-time developer account) → *Create app* → upload the `.aab` to *Internal testing* first, or run `eas submit --platform android` with a Google service-account key.
5. Store listing: `mobile/store/playstore-icon-512.png`, `mobile/store/feature-graphic-1024x500.png` and the phone screenshots `mobile/store/screenshot-*.png`. Privacy policy URL: `https://<admin>/privacy`.
6. App content: complete *Data safety* (location, name, email, phone, health info), the *Health apps* declaration, content rating and target audience. Account deletion: patients delete in-app (Profile → Delete account); the web link for the form is `https://<admin>/privacy#delete-account`. New personal developer accounts must run a closed test with 12+ testers for 14 days before production access.

## Production notes

- Use a long random `JWT_SECRET` (never the example value) and restrict `CORS_ORIGINS` to your admin domain.
- Rotate any credentials that were ever shared in chat or kept in comments.
- Medical features: check local regulations (e.g., PMDC / DRAP in Pakistan) before handling real patient data. The AI assistant is informational only and is not a substitute for clinical care.

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register`, `/api/auth/login` | Sign up / sign in |
| GET | `/api/auth/me` | Current user |
| DELETE | `/api/auth/me` | Delete a patient's account and data |
| PUT | `/api/auth/location` | Save device coordinates |
| POST | `/api/auth/change-password` | Change (or replace a temporary) password |
| POST | `/api/facilities/register` | Sign up a hospital (admin account) or clinic (doctor account) |
| GET | `/api/facilities/nearby?lat&lng&radiusKm&type` | Approved hospitals/clinics near a point |
| GET | `/api/facilities/:id` | A facility with its departments and doctors |
| GET | `/api/practices/nearby?lat&lng&radiusKm&specialty&type` | Bookable doctors near a point (one row per doctor per facility) |
| GET | `/api/practices/:id` | Doctor at a facility, plus their other facilities |
| GET | `/api/practices/:id/slots?date=YYYY-MM-DD` | Available slots |
| GET, PUT | `/api/doctors/me`, `/api/doctors/me/profile` | A doctor's own profile and practices |
| * | `/api/facility/*` | Signed-in hospital staff / clinic doctor: details, departments, doctors, staff, appointments |
| POST | `/api/appointments` | Book a slot (`practiceId`, `startsAt`) |
| GET | `/api/appointments?scope=upcoming\|past` | My visits |
| PATCH | `/api/appointments/:id/status` | Confirm / complete / cancel (confirm and cancel only before the visit starts) |
| GET | `/api/notifications` | In-app notifications |
| POST | `/api/ai/chat` | Symptom assistant |
| POST | `/api/ai/triage` | Specialist suggestion + nearby doctors |
| GET | `/api/cron/reminders` | Sends due "starts soon" reminders (needs `Authorization: Bearer $CRON_SECRET`) |
| GET | `/api/admin/*` | Admin-only stats, facility approval, doctor verification, users, appointments |

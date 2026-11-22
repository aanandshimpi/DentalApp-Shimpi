# DentalCare Pro

Milestone 1 is a local, online-only foundation for a dental clinic workspace. The dashboard follows the approved concept with a desktop sidebar, responsive navigation, appointment metrics, schedule search and doctor filtering, chair status, treatment pipeline, quick actions, clinic alerts and doctor workloads. The preview uses two fictional clinics and a fixed clinic day of 22 November 2026.

## Start locally

Use Node.js 22.12 or later and Docker with Compose, or provide a dedicated PostgreSQL database. The included Compose file uses PostgreSQL 17.

```sh
cp .env.example .env
docker compose up -d --wait
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Open [the local dashboard](http://localhost:3000/dashboard). Select **Fill dentist demo credentials**, then **Sign in**. This account combines Dentist and Clinic Admin so the preview shows both clinical and finance sections.

| Clinic code | Demo email | Role |
| --- | --- | --- |
| `bright-smile` | `dentist@bright-smile.example` | Dentist and Clinic Admin |
| `bright-smile` | `dentist2@bright-smile.example` | Dentist |
| `bright-smile` | `reception@bright-smile.example` | Receptionist |
| `bright-smile` | `assistant@bright-smile.example` | Dental Assistant |
| `bright-smile` | `admin@bright-smile.example` | Clinic Admin |
| `cedar-smile` | `reception@cedar-smile.example` | Receptionist at the second clinic |

All demo accounts use `FictionalClinic2026!`. Seeding is repeatable and refreshes passwords for seeded accounts. Use a dedicated local demo database. The `.example` emails are fictional.

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL. Replace the example when using your own database. |
| `DEMO_SEED=1` | Enables the fictional seed and the login-page credential fill button. |
| `LOCAL_HTTP_PREVIEW=1` | Optional for a loopback-only HTTP preview using `npm start`. Production-mode cookies otherwise require HTTPS. |
| `TEST_DATABASE=1` | Enables integration tests against the migrated and seeded demo database. |
| `PLAYWRIGHT_BASE_URL` | Optional URL of an already running local app for browser tests. |

## Verify

```sh
npm run lint
npm run typecheck
npm test
TEST_DATABASE=1 node --env-file=.env ./node_modules/vitest/vitest.mjs run
npx playwright install chromium
npm run test:e2e
npm run build
```

The browser tests cover authentication, sign-out, schedule filters, mobile navigation, clinical field restrictions and isolation between the two clinics. The integration tests use real PostgreSQL and exercise role-based data selection, session expiry and revocation, and database foreign keys that reject cross-clinic linking.

## Foundation decisions

- Clinic slug and email identify a staff account. User-role assignments support multiple roles, with permissions defined centrally in TypeScript. Clinic Admin receives administrative access and needs an explicit Dentist role for clinical access.
- Login uses salted scrypt hashes and a PostgreSQL per-account attempt limit. The browser receives an opaque HTTP-only token while PostgreSQL stores its hash. Each authenticated request resolves current roles, clinic membership, account status and expiry. Successful sign-in and session revocation record a clinic-bound audit event.
- Dashboard queries derive clinic scope from the authenticated session. Composite foreign keys bind appointments, doctors, chairs, patients, staff roles, audit events and sessions to matching clinic IDs. Patient numbers are unique within a clinic and phone numbers can be shared.
- Appointment times use PostgreSQL timestamps with time zone, and the preview is shown in Asia/Kolkata. Collection snapshots use PostgreSQL decimal values and INR display. Appointments and chair occupancy use relational seed data. Pipeline, invoice totals and alert counts use a demo snapshot pending their domain models.

## Milestone limits

Later module links and creation actions are visible where the role allows them and are disabled in Milestone 1. The fixed-day preview assumes Asia/Kolkata. Appointment creation and overlap rules, live clinical and financial records, staff administration and other workflows follow in later milestones.

This is a single-workspace staff login per account and a fictional local demo. Before clinic use, privileged MFA, account provisioning and recovery, edge-level rate limits, session/throttle cleanup, deployment security, backups and restore, retention policy, and clinical and regulatory review require completion. Keep patient data fictional. Open decisions include connectivity and offline needs, clinic branding and staff roles, appointment durations, pricing, chair count, and hosting and retention.

The dependency audit reports an Effect advisory through Prisma's tooling dependency chain. Review [the upstream advisory](https://github.com/advisories/GHSA-7589-6fvf-x4pw) and the Prisma dependency tree before deployment.

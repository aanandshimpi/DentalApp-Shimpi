# SHIMPI DENTAL CLINIC

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

### Patient directory

Open **Patients** to search active records in your clinic by name, patient number, or phone. Dentists and receptionists can register a patient from the directory or the dashboard’s **New Patient** action. Enter a clinic-unique patient number and the patient’s name. Phone is optional.

### Patient care record

Open a patient from **Patients**, either schedule, or after registration. Use the history picker to open a checkup, then switch between its findings and treatment plans. If a checkup has several plans, select one to see its tooth-level details and progress board. Use **New Checkup** to record findings, then **Plan treatment** on the checkup to select the teeth that will receive treatment. You can use the teeth recorded at the checkup as a starting point. Each tooth has its own illustrated treatment card and moves between the **Planned**, **In progress**, and **Done** columns. Plans without a selected tooth track progress at the plan level. You can document findings and procedures for multiple teeth in the tooth chart. Plans created without a consultation appear below the consultations.

### Appointment scheduling

Use **New Appointment** on the dashboard or open **Appointments** to view a schedule by date. Dentists, receptionists, and clinic admins can book with an active patient and doctor, an optional chair, and a start time in the clinic’s time zone. The scheduler rejects overlapping visits for the same patient, doctor, or assigned chair. After booking, the schedule opens on the selected date.

From the daily schedule, select **Manage** on a scheduled visit to change its time, doctor, or chair, or cancel it. Cancelled visits stay visible in the daily schedule and free the slot for another booking.

The demo dashboard continues to show 22 November 2026. **Appointments** can show any selected date.

Use the **Calendar** tab for a month view. Select a date to see its schedule, or filter the daily list by status. Staff can move an appointment through **Pending**, **Checked in**, **In progress**, and **Done** using the action on its row.

### Consultations

Dentists can start a consultation from **New Consultation** on the dashboard or from a visit in either schedule. Every consultation belongs to a patient. A dentist can link one consultation to each appointment or record a visit without an appointment. Open **Consultations** for clinic history or open a patient record for their full care history. Clinical notes are visible to roles with clinical access.

### Treatment plans

Dentists can start a plan from **Create Treatment Plan** on the dashboard or from a consultation. Each plan can include general treatment notes, follow-up instructions, and details for individual teeth. Select permanent or primary teeth on the 3D FDI chart. Open a tooth to rotate its model and record surfaces, examination findings, diagnosis, and a specialty procedure or other suggested treatment. If a consultation is linked, it must belong to the same patient. Use **Treatment Plans** in the sidebar for clinic history, the patient directory for a patient’s plans, or a consultation to view its linked plans.

### Specialty forms

Consultations and treatment plans offer templates for general dentistry, endodontics, periodontics, orthodontics, prosthodontics, pediatric dentistry, and oral and maxillofacial surgery. Select a specialty to see its findings or planning fields and record the options discussed or planned. Use the tooth chart for tooth-specific findings in consultations and procedures or notes in treatment plans.

Starting a treatment plan from a consultation preselects its specialty and lets you select the teeth recorded in that consultation. The clinician records the findings and selects the procedures.

### Hosted demo

`render.yaml` defines a free Node web service for deployment from GitHub. Connect the repository to a Render Blueprint and set its `DATABASE_URL` to the direct connection string from a new, dedicated Neon Free database. Render generates `HOSTED_DEMO_PASSWORD` for the demo accounts. Use the clinic codes and demo emails listed above with that password, and share it privately with demo participants.

The build applies migrations and initializes fictional fixtures on the first deployment. Later builds preserve the hosted records. The demo uses its own database, and everyone testing it should enter fictional information. Keep the generated password and database connection string in Render’s environment settings.

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

Billing and the other future modules appear in navigation where the role allows them. The fixed-day preview assumes Asia/Kolkata. Live clinical and financial records, staff administration and other workflows follow in later milestones.

This is a single-workspace staff login per account and a fictional local demo. Before clinic use, privileged MFA, account provisioning and recovery, edge-level rate limits, session/throttle cleanup, deployment security, backups and restore, retention policy, and clinical and regulatory review require completion. Keep patient data fictional. Open decisions include connectivity and offline needs, clinic branding and staff roles, appointment durations, pricing, chair count, and hosting and retention.

The dependency audit reports an Effect advisory through Prisma's tooling dependency chain. Review [the upstream advisory](https://github.com/advisories/GHSA-7589-6fvf-x4pw) and the Prisma dependency tree before deployment.

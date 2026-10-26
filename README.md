# Student Talent, Skills & Scientific Engagement Survey

Systems Engineering Department — Military Technological College (MTC), Sultanate of Oman.

A bilingual (English / Arabic) step-by-step survey with 15 questions in 5 sections, a PostgreSQL backend, and a secure staff dashboard at `/admin`.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui-style components · React Hook Form · Zod · Prisma 6 · PostgreSQL

---

## Staff Scientific Engagement System

Staff fill in **open forms**, like the student survey. No account or password is needed.

| Route | Purpose |
|---|---|
| `/staff` | Choose a form, in English or Arabic |
| `/staff/pathway` | Pathway Leaders: pathway, competencies, external opportunities (one record each), student preparation, recommendations |
| `/staff/module` | TNA Module Coordinators: one module per form. Learning outcomes, proposed activities linked explicitly to outcomes, assessment, resources, competition potential |
| `/staff/contribution` | Academic & technical staff: expertise, workshops, project/research ideas, mentoring, delivery preferences, availability |

- **Same details across forms:** every form starts with *Your details* (name, official email, position, department, pathway). The browser remembers them for the next form. The server links all contributions with the same email to one staff profile.
- **Drafts:** unsent answers are kept on the staff member's own device until submitted.
- **Short forms:** overlapping questions were merged. Pathway Leaders answer 9 questions, Module Coordinators 7 (plus their activities), and Academic/Technical staff 10.
- **Attachments:** each opportunity, module, module activity, workshop and project idea can carry up to 5 files (PDF, Word, Excel, PowerPoint, PNG, JPEG; 5 MB each).
  - Files are stored in the database, so they survive redeploys.
  - The file type is checked by content signature, not only the name.
  - Only signed-in administrators can download a file, always as a download, and every download is recorded in the audit log.
  - Uploads that are never submitted are deleted after 7 days.
- **Validation:** answers are checked step by step in the browser and again on the server. Submissions are rate-limited per IP and only accepted from this site.
- **Identity is not verified:** the email is self-declared. If verified identity is required, put the `/staff` routes behind the college's single sign-on or a shared access code.

### Admin (`/admin`, administrators only)

The side menu is grouped as follows:
- **Overview:** key numbers, items waiting for review, initiatives in progress, links to share.
- **Students:** Student analytics (charts) and the student database.
- **Staff contributions:**
  - Staff directory (filters: technical field, contribution type, delivery, level, availability, workshop topic, research field)
  - Opportunities (filters: pathway, type, level, country, expected date, priority, review status)
  - Pathway report
  - Modules
  - Workshops
  - Research ideas
- **Planning:** Scientific planning. Turn a reviewed opportunity, workshop, project idea or module activity into an initiative, assign staff and students, record status changes (with history), track milestones and outcomes.
- **Settings:** Administrator accounts and password change.

**Matching** (on each opportunity and initiative) is rule-based and explained on screen. It uses students' self-reported survey answers: interest overlap, self-rated proficiency, readiness, weekly hours and previous participation, restricted to the target levels. It also lists staff with related expertise or mentoring interest, and the training gaps with related proposed workshops. Suggestions are never applied automatically. Administrators add students or staff to an initiative explicitly, and eligibility remains a staff decision.

**Reports:** CSV and Excel exports for opportunities, pathways, modules (one row per activity, with linked outcomes), workshops, research ideas, the staff directory, initiatives, and an integrated planning report per technical field. Exports follow the page filters and the interface language. They are admin-only and recorded in the audit log.

## Before going live — required configuration

| Item | Where | Notes |
|---|---|---|
| **Official logo** | `public/brand/se-logo.jpeg` | Copy the department-supplied file unchanged. Until it exists, the header shows an empty outlined placeholder. To use another file name or format (e.g. SVG), change `src/config/brand.ts`. |
| **Specialisations (Q4)** | `src/config/survey.ts` → `SPECIALISATIONS`, `ISE_TRACKS` | Configured with the 10 department programmes plus Information Systems Engineering (ISE). Choosing ISE asks for a track: Cybersecurity, Artificial Intelligence, Information Technology, or Other (specify). `value` is stored in the database, so do not change it once responses are being collected. Have the Arabic programme names checked. |
| **Student ID rule (Q2)** | `NEXT_PUBLIC_STUDENT_ID_PATTERN` env var | A regular expression applied to the trimmed, upper-cased ID. Default `^[A-Z0-9]{6,12}$`. It is applied at build time, so rebuild after changing it. |
| **Privacy / consent wording** | `src/i18n/en.ts`, `src/i18n/ar.ts` → `reviewScreen` | Have the wording checked against institutional policy. |

All visible text, in both languages, is in `src/i18n/en.ts` and `src/i18n/ar.ts`. A unit test fails if any key is missing from the Arabic file.

---

## Local development

Requires Node.js 20+.

```bash
npm install
cp .env.example .env        # then edit .env (see below)
npm run db:local            # optional: starts a local PostgreSQL on port 54329 (keep it running)
npx prisma migrate deploy   # creates the tables
npm run admin:create -- --email you@example.com --name "Your Name"
npm run dev                 # http://localhost:3000  (staff: /admin)
```

`npm run db:local` uses `embedded-postgres` (a real PostgreSQL server, stored in `./.pg-data`) so you don't need a system install. For it, set:

```
DATABASE_URL="postgresql://se_survey:se_survey_dev@localhost:54329/se_survey?schema=public"
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit tests (questionnaire structure, validation rules, translation completeness, progress) |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run admin:create -- --email … --name "…"` | Create a staff account or reset its password (password from `ADMIN_PASSWORD` or an interactive prompt; minimum 12 characters) |
| `npm run admin:create -- --email … --deactivate` | Disable a staff account |

There is deliberately **no public admin registration**. Accounts can only be created from the server command line.

---

## Deploy on Render

1. **Database:** Render dashboard → **New → PostgreSQL**. Use the same region as the web service. Render databases are UTF-8.
   - The **free** database is **deleted after 30 days**. For real survey data, choose a paid database plan, or use an external free PostgreSQL such as Neon and paste its connection string instead.
2. **Web service**, connected to this repository, branch `main`. Either runtime works:
   - **Docker** (uses the included `Dockerfile`, no commands needed). Migrations and the first staff account run when the container starts.
   - **Node:** Build Command `npm ci && npm run build`, Start Command `npm start`. Migrations and the first staff account run during the build.
   - In both cases, set **Health Check Path** to `/api/health`.
3. **Environment** variables on the web service:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | The database's **Internal Database URL** |
   | `ADMIN_SESSION_SECRET` | Click **Generate** (any random value of 32+ characters) |
   | `TRUST_PROXY` | `true` |
   | `ADMIN_EMAIL` | Email of the first staff account |
   | `ADMIN_PASSWORD` | Its password (12+ characters). Used only to create the account if it does not exist yet. |
   | `ADMIN_NAME` | Optional display name |

4. **Manual Deploy → Deploy latest commit.** The survey is at `/` and the staff dashboard at `/admin`.

**First-load delay.** The web service now runs on Render's Starter instance (set in `render.yaml`), which never sleeps. On the free instance, Render spin down after 15 minutes without traffic, and the next visit then waits about 50 seconds.
- The workflow `.github/workflows/keep-alive.yml` pings `/api/health` every 10 minutes so the service stays awake. One always-on service fits within the free 750 instance-hours per month.
- If the service URL changes, set the repository variable `APP_URL` (Settings → Secrets and variables → Actions → Variables).
- GitHub may delay scheduled runs and pauses them after 60 days without repository activity. For a guaranteed instant load, use Render's **Starter** instance, which never sleeps, or add an external uptime monitor that hits `/api/health` every 5 minutes.

## Production deployment

1. **Provision PostgreSQL** (version 14 or later) and create a database plus a dedicated user that owns it. The database **must be UTF-8**, or Arabic answers cannot be saved:
   ```sql
   CREATE DATABASE se_survey OWNER se_survey ENCODING 'UTF8' TEMPLATE template0;
   ```
   Windows installations often default to WIN1252. The app checks the encoding and refuses submissions with a clear log message if it is wrong.
2. **Set environment variables** on the host (never commit them):
   - `DATABASE_URL` — connection string, with `sslmode=require` if the database is remote.
   - `ADMIN_SESSION_SECRET` — at least 32 random characters:
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `NEXT_PUBLIC_STUDENT_ID_PATTERN` — optional, see above.
   - `TRUST_PROXY=true` — only when behind a reverse proxy that sets `X-Forwarded-For` (needed for per-IP rate limiting).
3. **Build and migrate:**
   ```bash
   npm ci
   npx prisma migrate deploy
   npm run build
   ```
4. **Create staff accounts:** `npm run admin:create -- --email … --name "…"`
5. **Run:** `npm start` (port 3000), managed by systemd, PM2, or a container, behind a reverse proxy (nginx / IIS / Caddy) that terminates **HTTPS**. Admin session cookies are marked `Secure` in production, so HTTPS is required for staff sign-in.
6. **Back up** the database regularly. It contains student personal data.

> Rate limiting is in memory, per server process. If you run more than one instance, put it behind a shared store such as Redis, or enforce limits at the proxy.

---

## What is stored

Relational schema (`prisma/schema.prisma`):

- `Submission` — reference number, full name, Student ID (**unique**), level, specialisation, skills/tools, achievements, readiness, weekly hours, preferred role, language, consent time, submission time.
- `SubmissionInterest` (Q5), `SubmissionField` (Q6 plus the Q7 self-reported proficiency 1–5, and "Other" text), `SubmissionExperience` (Q8), `SubmissionBarrier` (Q14), `SubmissionSupport` (Q15).
- `AdminUser` (bcrypt-hashed passwords) and `AuditLog` (sign-ins, failed sign-ins, profile views, exports).

## Security measures

- The same Zod schema validates in the browser and **again on the server**. Option values are whitelisted, and free text is normalised (control and bidi-override characters are stripped) with length limits.
- Submissions are rate-limited per IP. The body is limited to 32 KB, the request must be same-origin, and JSON is required.
- Duplicates: Student ID is unique (409 with a generic, privacy-preserving message). An idempotency key per draft means a retried or double-clicked submit returns the original reference instead of creating a second record.
- Success is only shown after the database confirms the insert.
- No public read API exists. All `/admin` pages and `/api/admin/*` routes require a signed, HttpOnly, SameSite=strict session cookie (8-hour expiry). They are checked in middleware **and** on the server against an active account.
- Login is rate-limited per IP and per account. Unknown accounts are compared against a dummy hash so timing does not reveal valid emails.
- CSV and Excel exports neutralise spreadsheet formula injection.
- Security headers: CSP, `X-Frame-Options: DENY`, `nosniff`, and `no-store` on admin and API routes. Pages are `noindex`.

## Project structure

```
src/
  app/
    page.tsx                         Student survey
    api/submissions/route.ts         POST submission
    admin/login/                     Staff sign-in
    admin/(dashboard)/               Overview, student database, profiles (auth required)
    api/admin/{login,logout,export}  Staff APIs
  components/survey/                 Header, SurveySidebar (+ MobileSteps), ProgressBar, FormSection,
                                     fields (TextField, SelectField, ChoiceField), ProficiencyRating,
                                     NavigationButtons, ReviewScreen, SubmissionConfirmation, SurveyApp
  components/admin/                  Dashboard building blocks
  components/ui/                     shadcn-style primitives
  config/                            Survey options, institutional rules, logo path
  i18n/                              en / ar dictionaries + provider (RTL handling)
  lib/                               Zod schema, sanitisation, Prisma, auth, rate limiting, admin queries
prisma/                              Schema + migrations
scripts/                             Local PostgreSQL, admin account CLI
tests/                               Vitest unit tests
```

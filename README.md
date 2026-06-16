# Monitoring Dashboard

A full-stack uptime monitoring dashboard built with **Node.js**, **TypeScript**, **PostgreSQL**, **Prisma**, and **Next.js**.

Users can create monitors for websites or APIs, run manual checks, track uptime, view response-time charts, inspect incidents, and receive alert notifications when a service goes down or recovers.

---

## Features

- User registration and login with JWT authentication
- Monitor CRUD: create, edit, delete, pause, and resume monitors
- Manual URL checks with response-time measurement
- Automatic scheduled checks
- Status tracking: `UP`, `DOWN`, `UNKNOWN`
- Check history
- Incident tracking and recovery detection
- Uptime percentage and average response-time stats
- Email alert system with console fallback
- Clean JSON API error handling
- Frontend dashboard with auto-refresh
- Monitor detail page with response-time chart

---

## Tech Stack

### Backend

- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma
- JWT
- bcrypt
- Zod
- node-cron
- Nodemailer

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Recharts

### DevOps

- Docker Compose
- PostgreSQL Docker container

---

## Project Structure

```txt
Monitoring_dashboard/
  api/
    src/
      jobs/
        monitorScheduler.ts
      lib/
        prisma.ts
      middleware/
        auth.ts
        error.ts
      modules/
        alerts/
          alert.service.ts
        auth/
          auth.routes.ts
        checks/
          check.service.ts
        monitors/
          monitors.routes.ts
      app.ts
      server.ts
    prisma/
      migrations/
      schema.prisma
    .env.example
    package.json
    tsconfig.json

  frontend/
    src/
      app/
        dashboard/
          monitors/
            [id]/
              page.tsx
          page.tsx
        login/
          page.tsx
        page.tsx
      lib/
        api.ts
    .env.example
    package.json
    tsconfig.json

  docker-compose.yml
  README.md
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Monitoring_dashboard
```

---

### 2. Start PostgreSQL

From the root folder:

```bash
docker compose up -d
```

This starts the local PostgreSQL database.

---

### 3. Setup the backend

Open a terminal:

```bash
cd api
pnpm install
cp .env.example .env
pnpm exec prisma migrate dev
pnpm dev
```

The API runs at:

```txt
http://localhost:4000
```

---

### 4. Setup the frontend

Open a second terminal:

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

The frontend runs at:

```txt
http://localhost:3000
```

---

## Environment Variables

### Backend

Create this file:

```txt
api/.env
```

Example:

```env
PORT=4000

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/monitoring_dashboard?schema=public"

JWT_SECRET="change-me"

EMAIL_FROM="Monitoring Dashboard <alerts@example.com>"

SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
```

---

### Frontend

Create this file:

```txt
frontend/.env.local
```

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## API Overview

### Auth Routes

```txt
POST /auth/register
POST /auth/login
GET  /me
```

---

### Monitor Routes

```txt
GET    /monitors
POST   /monitors
GET    /monitors/:id
PATCH  /monitors/:id
DELETE /monitors/:id
POST   /monitors/:id/check-now
GET    /monitors/:id/checks
GET    /monitors/:id/incidents
GET    /monitors/:id/stats
```

---

## Main Functionality

### Authentication

Users can register and log in using email and password.

Passwords are hashed with `bcrypt`, and authenticated routes are protected using JWT.

---

### Monitor Management

Users can create monitors with:

- Name
- URL
- Expected HTTP status code
- Check interval
- Timeout
- Active/inactive state

---

### Manual Checks

Users can manually trigger a check using:

```txt
POST /monitors/:id/check-now
```

Each check stores:

- Status: `UP` or `DOWN`
- HTTP status code
- Response time in milliseconds
- Error message, if any
- Timestamp

---

### Automatic Checks

The backend runs a scheduler using `node-cron`.

It checks active monitors automatically based on their configured interval.

---

### Incidents

When a monitor changes from `UP` to `DOWN`, an incident is created.

When a monitor changes from `DOWN` to `UP`, the open incident is resolved.

---

### Alerts

The project includes an alert service using Nodemailer.

If SMTP credentials are not configured, alerts fall back to console logs.

Example console alert:

```txt
Email alert fallback:
To: user@example.com
Subject: [DOWN] Example Website
Monitor is DOWN: Example Website
URL: https://example.com
Reason: fetch failed
```

---

### Dashboard

The frontend dashboard allows users to:

- View all monitors
- Create monitors
- Edit monitors
- Delete monitors
- Run manual checks
- See current monitor status
- Auto-refresh monitor data every 10 seconds

---

### Monitor Detail Page

Each monitor has a detail page showing:

- Current status
- Uptime percentage
- Total checks
- Average response time
- Open incidents
- Response-time chart
- Recent checks
- Recent incidents

---

## Screenshots

Add screenshots here later:

```txt
screenshots/dashboard.png
screenshots/monitor-detail.png
```

Example:

```md
![Dashboard](screenshots/dashboard.png)
![Monitor Detail](screenshots/monitor-detail.png)
```

---

## Local Development Checklist

### Backend

```bash
cd api
pnpm dev
```

### Frontend

```bash
cd frontend
pnpm dev
```

### Database

```bash
docker compose up -d
```

---

## Useful Commands

### Run Prisma Studio

```bash
cd api
pnpm exec prisma studio
```

---

### Run backend build

```bash
cd api
pnpm build
```

---

### Run frontend build

```bash
cd frontend
pnpm build
```

---

### Stop PostgreSQL container

```bash
docker compose down
```

---

## Future Improvements

- Real email provider integration with Resend or SMTP
- Public status pages
- Team members
- Webhook alerts
- Slack or Discord alerts
- Dockerize backend and frontend services
- Production deployment
- Better frontend loading states
- Better form validation messages
- Pagination for checks and incidents
- User settings page

---

## Portfolio Description

A Node.js uptime monitoring platform with background checks, incident tracking, email alerts, response-time analytics, and a real-time-style dashboard.

Built with:

```txt
Node.js
TypeScript
Express
PostgreSQL
Prisma
Next.js
Tailwind CSS
Docker
```

---

## License

MIT


## Live Demo

- Frontend: https://monitoring-dashboard-frontend-h2pkfewx9-nasosdeliadis98.vercel.app/dashboard
- Backend API: https://monitoring-dashboard-kb54.onrender.com

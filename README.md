# Project Management System (PMS)

A full-stack project management system built from the `Project_Management_System_Overview.pdf`
specification: an **Angular 20** single-page application talking to an **Express.js** REST API
backed by **Prisma + MongoDB**.

The repository deliberately contains exactly **two top-level folders**:

```
project/
├── backend/    # Express + Prisma + MongoDB API
└── frontend/   # Angular standalone SPA
```

## Features

| Module | What it covers |
| --- | --- |
| Authentication | JWT login/logout, profile, password change, role-based access |
| Dashboard | Portfolio KPIs, status doughnut, 14-day activity trend, deadlines, activity feed |
| Projects | CRUD, filters, timeline, status/priority, close-out, project detail with tasks & teams |
| Teams | CRUD, lead + members, per-project grouping |
| Tasks | CRUD, assignment, priority/status, progress tracking, deadline extension |
| Kanban board | Drag-and-drop between To Do / In Progress / Done with instant persistence |
| Deadlines | Overdue and upcoming task views, manual deadline scan |
| Reports | Summary metrics, status/priority charts, team workload, **PDF** and **Excel** export |
| Notifications | In-app feed, unread badges, mark-read / delete, hourly deadline scanner |
| Users | Admin-only user management with role assignment and account toggling |

Roles: `ADMIN`, `MANAGER`, `MEMBER`. Managers/Admins can create projects, teams and tasks;
members get a scoped view of their own work; user administration is admin-only.

## Prerequisites

- Node.js 20+
- A MongoDB connection string (MongoDB Atlas or local)

## Backend

```bash
cd backend
npm install
# configure .env: DATABASE_URL, JWT_SECRET, PORT (default 12001)
npm run prisma:generate
npm run prisma:push
npm run seed        # demo data, see below
npm start           # http://localhost:12001
```

Demo accounts (password `Password@123` for all):

| Email | Role |
| --- | --- |
| admin@pms.local | ADMIN |
| manager@pms.local | MANAGER |
| lead@pms.local | MANAGER |
| alice@ / bob@ / carol@ / evan@pms.local | MEMBER |

## Frontend

```bash
cd frontend
npm install
npm start           # ng serve on http://localhost:12000 with /api proxy
```

The dev server proxies `/api` to `http://localhost:12001` (`proxy.conf.json`), so the browser
only ever talks to the app origin. For production builds the API base URL comes from
`src/environments/environment.prod.ts`.

```bash
npm run build       # outputs to dist/frontend
```

## Architecture notes

- **Backend**: layered into `routes/` (HTTP), `services/` (domain logic), `models/` (Prisma
  selections), `schemas/` (validation), `auth/` (JWT + RBAC), and `utils/` (pagination,
  responses, exports). A cron scheduler (`0 * * * *`) scans for approaching and overdue tasks
  and raises notifications.
- **Frontend**: Angular standalone components, lazy-loaded feature routes, signal-based state,
  functional route guards (`authGuard`, `guestGuard`, `roleGuard`), an HTTP interceptor that
  attaches the JWT and normalises API errors, and Angular Material for the UI.

# Dental Management System - React Frontend

A React frontend for a Dental Management System that integrates with a REST API backend.

## Features

- **Dashboard** - Overview with patient & appointment counts, recent appointments
- **Patients** - List and search patients
- **Appointments** - View appointment schedule and status

## Prerequisites

- Node.js 18+
- Your DMS REST API backend running

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure API URL**

   Copy `.env.example` to `.env` and set your backend URL:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

3. **Run development server**

   ```bash
   npm run dev
   ```

   Open http://localhost:5173 in your browser.

## API Endpoints Expected

The frontend expects these REST endpoints from your backend:

| Resource     | Method | Endpoint           |
|-------------|--------|--------------------|
| Patients    | GET    | /api/patients      |
| Patient     | GET    | /api/patients/:id  |
| Appointments| GET    | /api/appointments  |
| Appointment | GET    | /api/appointments/:id |

Responses can be either:
- `{ data: [...], total?: number }` 
- Direct array `[...]`

Field names support both camelCase (`firstName`) and snake_case (`first_name`) for flexibility.

## Authentication

To add JWT auth, store the token with:
```js
localStorage.setItem('dms_token', yourToken);
```

The API client will attach it as `Authorization: Bearer <token>` to all requests.

## Build for Production

```bash
npm run build
```

Output is in the `dist/` folder. Serve it with any static host or your backend.

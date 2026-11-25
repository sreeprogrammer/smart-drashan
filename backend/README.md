# Smart Darshan Django Backend

This is a separate Django backend for Google Sheets reporting and synchronization.
It does not replace or migrate the existing Supabase booking database.

## Data ownership

- Supabase remains the source of truth for districts, temples, slots, bookings, payments, and ticket validation.
- The temple information API reads and writes the new Supabase `temple_information` table; Django models map it as unmanaged so migrations never recreate `temples`.
- Django stores synchronization queue records and sync audit logs only.
- Google Sheets is used for reporting and administration only.
- Google Sheets is never used to enforce booking capacity or ticket status.

## Installation

Open PowerShell in the project root:

```powershell
cd C:\Users\adama\Desktop\mini\project
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

If PowerShell blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate the virtual environment and continue.

Copy the example environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Set at least:

- `DJANGO_SECRET_KEY`
- `GOOGLE_SHEETS_WEB_APP_URL`
- `GOOGLE_SHEETS_API_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_REST_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Keep `GOOGLE_SHEETS_API_SECRET` only in `backend\.env`. Never put it in React code or GitHub.
Keep `SUPABASE_SERVICE_ROLE_KEY` only in `backend\.env`; it bypasses Supabase Row Level Security and is used only by trusted server-side requests. Temple information reads/writes that act as an administrator use the caller's Supabase access token and database policies.

## Database setup

For local development, Django uses SQLite by default.

```powershell
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

For a PostgreSQL/Supabase database, set `DJANGO_DATABASE_URL` and run migrations.
Do not apply migrations that recreate existing Supabase booking tables.

## API endpoints

- `POST /api/v1/integrations/google-sheets/sync/`
- `GET /api/v1/integrations/google-sheets/health/`
- `GET /api/v1/integrations/google-sheets/logs/`
- `GET /api/v1/temple-information/{temple_id}/` — public, verified records only
- `GET /api/v1/admin/temple-information/` — State Admin or assigned District Admin
- `POST /api/v1/admin/temple-information/` — submit/update one section for verification
- `POST /api/v1/admin/temple-information/{record_id}/review/` — State Admin approve/reject

Temple information admin endpoints require `Authorization: Bearer <Supabase access token>`.
State and District Admin scope is checked against the existing `admin_assignments` records;
the database migration independently enforces the same scope through Row Level Security.

## Temple information migration

Apply `supabase\migrations\20261125144300_temple_information_verification.sql` to the existing Supabase project before using the new admin page. It:

- Adds one pending, temple-linked record for each of the seven sections for every existing temple.
- Copies any existing section rows into pending JSON without modifying or deleting legacy data.
- Leaves temple IDs, district links, and temple records unchanged.
- Exposes only State-Admin-verified information to public visitors.
- Restricts legacy section tables to administrators and creates a private photo bucket with scoped policies.

The Django temple models are unmanaged mappings to Supabase tables. The migration is SQL-first because the temple database is already owned by Supabase; do not run Django migrations to create duplicate temple or district tables.

The admin photo uploader accepts JPG, PNG, WebP, and AVIF files up to 10 MB. Photo source and license metadata must be included in the information record before a State Admin can verify it.

The sync and logs endpoints require a Django administrator and DRF Token authentication.

Example health request:

```powershell
$headers = @{ Authorization = 'Token YOUR_DJANGO_TOKEN' }
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/integrations/google-sheets/health/' -Headers $headers
```

Example sync request:

```powershell
$headers = @{ Authorization = 'Token YOUR_DJANGO_TOKEN' }
$body = @{
    worksheet = 'Sync Logs'
    record_id = 'stable-record-id-001'
    action = 'upsert'
    data = @{
        record_type = 'test'
        record_name = 'Django integration test'
    }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post `
  -Uri 'http://127.0.0.1:8000/api/v1/integrations/google-sheets/sync/' `
  -Headers $headers `
  -ContentType 'application/json' `
  -Body $body
```

## Celery retries

For local testing, keep `CELERY_TASK_ALWAYS_EAGER=true`.
For production, run Redis and start:

```powershell
celery -A config worker --loglevel=info
```

Set `CELERY_BROKER_URL` to the Redis URL.

## Google Apps Script contract

Django sends an authenticated JSON POST containing:

- `action`
- `worksheet`
- `record_id`
- `idempotency_key`
- `data`
- `api_secret`

The Apps Script must verify `api_secret` on the server, validate the worksheet name,
and return JSON such as `{"success": true}`.

Never return or export Aadhaar numbers, passwords, access/refresh tokens, or API secrets.

## React frontend integration

Keep the Django API URL server-side or in a private build configuration.
Do not add `GOOGLE_SHEETS_API_SECRET` to `VITE_*` variables.

Do not call the synchronization endpoint directly from public React visitor pages.
Call it only from a trusted Django backend operation or an authenticated Django admin interface.
The React frontend should continue using Supabase for bookings and capacity.

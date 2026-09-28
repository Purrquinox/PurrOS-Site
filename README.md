# PurrOS web app

The browser client for PurrOS: dashboards, every module's screens, the Employee Area and settings. It's a **Next.js** app (App Router, TypeScript, Tailwind CSS) and a plain client of the public PurrOS API. It has no business logic or database of its own (see `API/DESIGN.md` §1 and §9).

## How it talks to the API

The browser only calls this app's own origin. `proxy.ts` forwards `/api/v1/*` to the API, so:

- the session cookie set by `POST /api/v1/auth/sign-in` stays first-party, and
- the API's CSRF check passes, because state-changing requests carry `Origin: <PURROS_URL>`.

**Serve this app at the address in the API's `PURROS_URL`.** Emailed links (`/invitation`, `/reset-password`, `/sign-in/link`) point there, and the API refuses cookie requests from any other origin.

| Variable | Default | Meaning |
|---|---|---|
| `PURROS_API_URL` | `http://localhost:8080` | Where the Next.js server reaches the API. Server-side only; read on each request, so one image works everywhere. |

## Develop

```bash
# In API/api: run the API with PURROS_URL=http://localhost:3000 (see API/api/README.md)
npm install
PURROS_API_URL=http://localhost:8080 npm run dev     # http://localhost:3000
```

On a fresh install, `purros setup` prints an `/invitation?token=…` link. Open it here to set the Owner's password.

```bash
npm run typecheck
npm run build && npm start
```

## Deploy

`output: "standalone"` produces a self-contained server. With Docker:

```bash
docker build -t purros-web .
docker run -p 3000:3000 -e PURROS_API_URL=http://api:8080 purros-web
```

Put the app and the API on the same network, and point your reverse proxy for `PURROS_URL` at this container.

## Structure

```
app/
  (auth)/            sign-in, 2FA, magic link, password reset, invitation
  (app)/             signed-in area, wrapped in SessionProvider + Shell
    page.tsx         dashboard: KPIs and recommended actions
    [module]/[resource]/          generic list, /new and /[id] pages
    scheduling/schedule, insights/reports     custom module pages
    me/              Employee Area (only for users linked to an employee)
    settings/        account, users, roles, features, sign-in, integrations, webhooks
lib/
  api.ts             fetch wrapper: Problem Details errors, Idempotency-Key on POST
  session.tsx        GET /auth/session, permissions, features, location switcher
  resources.tsx      module/resource registry (columns, forms, actions per endpoint)
  format.ts          money and quantities formatted from decimal strings
components/          DataTable, forms, dialogs, shell, command palette
```

Most screens come from the registry in `lib/resources.tsx`. To add a screen for a new endpoint, add a `Resource` with its path, feature, permission, columns, and optional `create` form and record `actions`. Navigation, the ⌘K palette, the list, detail and create pages, and the permission and feature checks all follow from it.

### Rules the UI follows

- **Feature switches:** navigation and pages come from the session's enabled features, so switched-off features don't appear.
- **Permissions:** actions are shown only when the role has the permission. The API still enforces reach, and returns `out_of_reach` if a request falls outside it.
- **Money and quantities:** these are always decimal strings. They're sent as strings, and displayed with `Intl.NumberFormat` without converting them to floats.
- **Confirmations:** actions that change a ledger or are destructive open a dialog that explains what will change before anything is sent.
- **Status:** status is always shown as a colored dot plus a text label.

# InventorySales — End-to-End Tests

Playwright end-to-end tests covering the four main user-facing flows of the
app:

| Spec                       | What it covers                                            |
| -------------------------- | --------------------------------------------------------- |
| `tests/dashboard.spec.ts`  | Stat cards, alert bar, charts, recent activity load       |
| `tests/inventory.spec.ts`  | Add category, add item, search                            |
| `tests/sales.spec.ts`      | Add buyer, record payment (seeds + cleans up an item)     |
| `tests/reports.spec.ts`    | Tab switching, Team / Terms / Category filters, clear     |

The tests drive a real Chromium browser against a locally running stack:

```
React UI       →  http://localhost:3000
Spring Backend →  http://localhost:8080
```

---

## First-time setup

```bash
cd Final/Automation/e2e
npm install
npm run install:browsers     # downloads Chromium for Playwright
```

## Running

**1. Start the backend** (in its own terminal):

```bash
cd Final/Backend/main
./mvnw spring-boot:run
```

**2. Start the UI** (in its own terminal):

```bash
cd Final/UI
# REACT_APP_API_URL must point at the running backend
echo "REACT_APP_API_URL=http://localhost:8080" > .env.local
npm start
```

**3. Run the tests**:

```bash
cd Final/Automation/e2e
npm test                  # headless, all specs
npm run test:headed       # watch the browser
npm run test:ui           # Playwright's interactive UI mode
npm run test:dashboard    # one spec at a time
npm run report            # open the last HTML report
```

---

## How it logs in

`global-setup.ts` runs once before any test. It:

1. Pings `GET /api/stores` to fail fast if the backend isn't up.
2. Opens `/login` in a fresh browser, types `admin / root`
   (the default seeded admin from `DataInitializer.java`),
   waits for the redirect to `/dashboard`,
3. Persists the resulting `sessionStorage` + `localStorage` to
   `storageState.json`.

Every test then starts pre-authenticated by loading that storage state.

To use a different admin user:

```bash
E2E_ADMIN_USER=myuser E2E_ADMIN_PASS=mypass npm test
```

---

## Test data hygiene

- Names are suffixed with `Date.now()` so reruns never collide.
- Each `describe` block cleans up the rows it creates in `afterAll`.
- Tests run **serially** (`workers: 1`) so cleanup is reliable and the
  Sales spec can depend on the inventory item it seeded.

---

## Selector strategy

The React app uses **CSS modules** with hashed class names (e.g.
`.SalesPage_addBuyerBtn__a1B2c`), which change on every build. The tests
deliberately key off **stable, accessible attributes** instead:

- `getByRole("button", { name: /\+ Add Buyer/i })`
- `getByPlaceholder(/username/i)`
- `getByLabel(/customer name/i)`
- `getByText("Team A", { exact: true })`

If the visible text of a button or label changes, the matching test will
fail with a clear "element not found" error pointing at the spec line.

---

## What's NOT covered

- File uploads (item photos, employee documents) — Cloudinary / S3 calls.
- Settings page — admin store rename, user management.
- People / Salary / Timesheet / Calendar tabs.
- Authentication failure paths (wrong password, locked account).

These can be added as separate spec files following the same pattern.

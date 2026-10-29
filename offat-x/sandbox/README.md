# OFFAT-X Sandbox

A Docker-based test environment containing a **deliberately vulnerable API** to validate every OFFAT-X test, including DIRB endpoint discovery.

---

## What's inside

| Component | Description |
|---|---|
| `vulnerable-api/` | FastAPI app with intentional vulnerabilities |
| `docker-compose.yml` | Spins up target + runs OFFAT-X scan automatically |

---

## Vulnerabilities in the target API

| Vulnerability | OWASP Category | Endpoint |
|---|---|---|
| No auth on user list | API2:2023 | `GET /api/v1/users` |
| BOLA — no ownership check | API1:2023 | `GET /api/v1/users/{id}` |
| Mass assignment (role/balance) | API3:2023 | `PUT /api/v1/users/{id}` |
| SQL injection | API10:2023 | `GET /api/v1/search?q=` |
| SSRF | API7:2023 | `GET /api/v1/fetch?url=` |
| JWT none-algorithm accepted | API2:2023 | `GET /api/v1/me` |
| **Undocumented admin panel** | **API9:2023** | `GET /admin` ← DIRB finds this |
| **Undocumented debug endpoint** | **API9:2023** | `GET /api/v1/debug` ← DIRB |
| **Undocumented config leak** | **API9:2023** | `GET /api/v1/config` ← DIRB |
| **Exposed .env file** | **API9:2023** | `GET /.env` ← DIRB |
| **Legacy v2 API active** | **API9:2023** | `GET /api/v2/users` ← DIRB |
| **Internal stats exposed** | **API9:2023** | `GET /api/internal/stats` ← DIRB |
| **Actuator endpoints** | **API8:2023** | `GET /actuator/env` ← DIRB |

> The OAS spec (`openapi.json`) **intentionally omits** the undocumented endpoints — proving DIRB discovery catches what the spec misses.

---

## Running the sandbox

### Prerequisites
- Docker + Docker Compose

### Start everything
```bash
cd sandbox
docker compose up
```
This will:
1. Build and start the vulnerable API on `http://localhost:8000`
2. Build OFFAT-X and run a full scan including `--dirb`
3. Write results to `./results/`

### Manual OFFAT-X scan
```bash
# Start only the target
docker compose up vulnerable-api -d

# Run OFFAT-X manually with DIRB
cd ..
./bin/offat-x \
  -f http://localhost:8000/openapi.json \
  -b http://localhost:8000 \
  -H "Authorization: Bearer token_alice" \
  --dirb \
  --dirb-c 10 \
  -jwt \
  -rl \
  -o results.json \
  --html report.html
```

### On Kali Linux (with system dirb)
```bash
./bin/offat-x \
  -f http://localhost:8000/openapi.json \
  -b http://localhost:8000 \
  -H "Authorization: Bearer token_alice" \
  --dirb \
  --dirb-system \
  --dirb-wordlist /usr/share/dirb/wordlists/common.txt \
  -jwt -rl \
  -o results.json --html report.html
```

---

## Expected DIRB findings

When OFFAT-X scans the sandbox, DIRB should discover these **undocumented endpoints** that are not in the spec:

```
⚠ /admin                  — HTTP 200 — CRITICAL (admin panel, no auth)
⚠ /api/admin/users        — HTTP 200 — CRITICAL (admin users, no auth)
⚠ /api/v1/debug           — HTTP 200 — CRITICAL (debug info + env vars)
⚠ /api/v1/config          — HTTP 200 — CRITICAL (secrets in config)
⚠ /.env                   — HTTP 200 — CRITICAL (plaintext secrets)
⚠ /api/v2/users           — HTTP 200 — HIGH     (legacy API version)
⚠ /api/internal/stats     — HTTP 200 — HIGH     (internal data)
⚠ /actuator/health        — HTTP 200 — MEDIUM   (health check)
⚠ /actuator/env           — HTTP 200 — CRITICAL (env var dump)
```

All mapped to **OWASP API9:2023 — Improper Inventory Management**.

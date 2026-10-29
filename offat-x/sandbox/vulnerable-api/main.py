"""
OFFAT-X Sandbox — Deliberately Vulnerable API
==============================================
A purposely insecure FastAPI application designed to exercise
every OFFAT-X security test including DIRB discovery.

⚠ FOR TESTING OFFAT-X ONLY. Never deploy to production.

Vulnerabilities included:
  - BOLA (Broken Object Level Auth)          API1:2023
  - No auth on protected endpoints           API2:2023
  - Mass assignment                          API3:2023
  - No rate limiting                         API4:2023
  - Admin endpoints without BFLA checks      API5:2023
  - SSRF via url parameter                   API7:2023
  - Debug/env endpoints exposed              API8:2023
  - Undocumented hidden endpoints            API9:2023  ← DIRB finds these
  - SQL injection via raw queries            API10:2023
  - JWT: accepts none algorithm              API2:2023
"""

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import sqlite3, os, httpx, re, base64, json

app = FastAPI(
    title="OFFAT-X Vulnerable Sandbox API",
    version="1.0.0",
    description="Deliberately insecure API for OFFAT-X testing",
)

# ── In-memory SQLite database ─────────────────────────────────────────────────
DB = sqlite3.connect(":memory:", check_same_thread=False)
DB.execute("""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        password TEXT,
        email TEXT,
        role TEXT DEFAULT 'user',
        balance REAL DEFAULT 0
    )
""")
DB.execute("INSERT INTO users VALUES (1, 'alice', 'password123', 'alice@example.com', 'user', 500.0)")
DB.execute("INSERT INTO users VALUES (2, 'bob',   'hunter2',    'bob@example.com',   'user', 250.0)")
DB.execute("INSERT INTO users VALUES (3, 'admin', 'admin123',   'admin@corp.com',    'admin', 9999.0)")
DB.commit()

TOKENS = {
    "token_alice": 1,
    "token_bob": 2,
    "token_admin": 3,
}

# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None       # ← mass assignment: caller can escalate role
    balance: Optional[float] = None  # ← mass assignment: caller can set balance
    password: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

# ─────────────────────────────────────────────────────────────────────────────
# Documented API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/v1/users", tags=["users"])
def list_users():
    """List all users — no auth required (missing auth)."""
    rows = DB.execute("SELECT id, username, email, role, balance FROM users").fetchall()
    return [{"id": r[0], "username": r[1], "email": r[2], "role": r[3], "balance": r[4]} for r in rows]


@app.get("/api/v1/users/{user_id}", tags=["users"])
def get_user(user_id: int, authorization: Optional[str] = Header(None)):
    """Get user by ID — BOLA: no ownership check, any token can access any user."""
    row = DB.execute("SELECT id, username, email, role, balance FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": row[0], "username": row[1], "email": row[2], "role": row[3], "balance": row[4]}


@app.put("/api/v1/users/{user_id}", tags=["users"])
def update_user(user_id: int, update: UserUpdate, authorization: Optional[str] = Header(None)):
    """Update user — mass assignment: role and balance can be freely set."""
    fields, values = [], []
    for field, val in update.dict(exclude_none=True).items():
        fields.append(f"{field} = ?")
        values.append(val)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    values.append(user_id)
    DB.execute(f"UPDATE users SET {', '.join(fields)} WHERE id=?", values)
    DB.commit()
    return {"message": "Updated", "user_id": user_id}


@app.post("/api/v1/auth/login", tags=["auth"])
def login(req: LoginRequest):
    """Login — returns a static demo token."""
    row = DB.execute(
        "SELECT id FROM users WHERE username=? AND password=?",
        (req.username, req.password)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = f"token_{req.username}"
    return {"token": token, "user_id": row[0]}


@app.get("/api/v1/search", tags=["search"])
def search(q: str = Query(...)):
    """Search users — raw SQL: vulnerable to SQL injection."""
    # ⚠ Intentionally vulnerable: direct string interpolation
    query = f"SELECT id, username, email FROM users WHERE username LIKE '%{q}%' OR email LIKE '%{q}%'"
    try:
        rows = DB.execute(query).fetchall()
        return [{"id": r[0], "username": r[1], "email": r[2]} for r in rows]
    except Exception as e:
        # ⚠ Leaks SQL error details
        return JSONResponse(status_code=500, content={"error": str(e), "query": query})


@app.get("/api/v1/fetch", tags=["utils"])
async def fetch_url(url: str = Query(...)):
    """Fetch a URL — SSRF: no restriction on target URL."""
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            resp = await client.get(url)
            return {"status": resp.status_code, "body": resp.text[:1000]}
        except Exception as e:
            return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# UNDOCUMENTED endpoints — found only by DIRB (OWASP API9:2023)
# These are intentionally NOT in the OpenAPI spec
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/admin")
def admin_panel():
    """Hidden admin panel — no auth."""
    return {"panel": "Admin Dashboard", "users": 3, "version": "1.0.0"}


@app.get("/api/admin/users")
def admin_list_users():
    """Admin user list — completely unauthenticated."""
    rows = DB.execute("SELECT id, username, email, password, role FROM users").fetchall()
    return [{"id": r[0], "username": r[1], "email": r[2], "password": r[3], "role": r[4]} for r in rows]


@app.get("/api/v1/debug")
def debug_info():
    """Debug endpoint — leaks env vars and config."""
    return {
        "env": dict(os.environ),
        "db_path": ":memory:",
        "python_path": os.sys.path,
        "debug": True,
    }


@app.get("/api/v1/config")
def config_info():
    """Config endpoint — leaks application config."""
    return {
        "secret_key": "super_secret_jwt_key_12345",
        "db_url": "sqlite:///./prod.db",
        "admin_email": "admin@corp.com",
        "debug_mode": True,
    }


@app.get("/.env")
def dot_env():
    """Exposed .env — leaks secrets."""
    return JSONResponse(
        content="SECRET_KEY=super_secret\nDB_PASSWORD=prod_pass_123\nAWS_SECRET=AKIAIOSFODNN7EXAMPLE",
        media_type="text/plain"
    )


@app.get("/api/v2/users")
def list_users_v2():
    """Legacy v2 endpoint — old API version still active."""
    rows = DB.execute("SELECT * FROM users").fetchall()
    return {"version": "v2", "data": [list(r) for r in rows]}


@app.get("/api/internal/stats")
def internal_stats():
    """Internal stats — no auth required."""
    return {"total_users": 3, "total_revenue": 9749.0, "active_sessions": 42}


@app.get("/actuator/health")
def actuator_health():
    return {"status": "UP", "db": "UP"}


@app.get("/actuator/env")
def actuator_env():
    """Spring-style actuator env — leaks environment."""
    return {"activeProfiles": ["prod"], "propertySources": [{"name": "systemEnvironment", "properties": dict(os.environ)}]}


# ─────────────────────────────────────────────────────────────────────────────
# JWT none-algorithm endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/v1/me")
def get_me(authorization: Optional[str] = Header(None)):
    """Get current user — accepts JWT with alg=none (vulnerable)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token")

    token = authorization.removeprefix("Bearer ").strip()
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Malformed token")

    try:
        header = json.loads(base64.urlsafe_b64decode(parts[0] + "=="))
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=="))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token encoding")

    # ⚠ Intentionally vulnerable: accepts alg=none without signature check
    alg = header.get("alg", "").lower()
    if alg == "none":
        # No verification — accepts any payload
        return {"user": payload, "warning": "none_algorithm_accepted"}

    # Static token lookup (demo only)
    token_map = {"token_alice": 1, "token_bob": 2, "token_admin": 3}
    user_id = token_map.get(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    row = DB.execute("SELECT id, username, email, role FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": row[0], "username": row[1], "email": row[2], "role": row[3]}

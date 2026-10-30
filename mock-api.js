'use strict';
const express = require('express');
const router = express.Router();

// ── In-Memory Datastore for Mock API ─────────────────────────────────────────
const users = [
  { id: 1,   username: 'admin', role: 'admin', email: 'admin@offat-corp.internal', ssn: '999-00-1111', balance: 999999 },
  { id: 101, username: 'alice', role: 'user',  email: 'alice@example.com',        ssn: '123-45-6789', balance: 4500 },
  { id: 102, username: 'bob',   role: 'user',  email: 'bob@example.com',          ssn: '987-65-4321', balance: 120 },
  { id: 103, username: 'eve',   role: 'user',  email: 'eve@attacker.org',         ssn: '555-55-5555', balance: 10 }
];

let nextOrderId = 502;
const orders = [
  { id: 501, userId: 101, owner: 'alice', item: 'Enterprise Cloud Security Subscription', amount: 12000, status: 'confirmed', billingAddress: '124 Alice Way, Tech City' }
];

// In-memory rate limiting map: ip -> { count, resetAt }
const rateLimitMap = new Map();

// Helper to create a fake JWT token
function makeFakeJwt(payload, alg = 'HS256') {
  const header = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = alg === 'none' ? '' : 'mock_signature_hash_bytes';
  return `${header}.${body}.${sig}`;
}

// ── 0. Overview & Documentation Page ─────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({
    name: 'OFFAT-X Vulnerable Mock API Service',
    version: '1.0.0',
    description: 'Deliberately vulnerable REST API designed for autonomous OWASP API Top 10 security evaluations without Docker.',
    openapiSpec: '/mock-api/openapi.json',
    activeEndpoints: {
      bola_users: 'GET /mock-api/users/{id} (CWE-639 / BOLA: no tenant check)',
      bola_orders: 'GET /mock-api/orders/{id} (CWE-639 / BOLA: unauthenticated cross-tenant access)',
      order_producer: 'POST /mock-api/orders (DAG BFS Setup sequence producer)',
      bfla_delete_user: 'DELETE /mock-api/admin/users/{id} (CWE-285 / BFLA: Low role can delete)',
      bfla_metrics: 'GET /mock-api/admin/metrics (CWE-285 / BFLA: sensitive metrics exposed to guest)',
      jwt_login: 'POST /mock-api/auth/login (Issues test tokens)',
      jwt_secret: 'GET /mock-api/auth/secret (CWE-347: accepts alg none and unsigned tokens)',
      rate_limit: 'POST /mock-api/auth/reset-password (CWE-799: 429 after 5 requests, bypassable via X-Forwarded-For)',
      shadow_heap: 'GET /mock-api/debug/heap-dump (CWE-200 / Shadow API: live route omitted from OpenAPI spec)',
      shadow_config: 'GET /mock-api/internal/config (CWE-200 / Shadow API: internal secrets exposed)',
      graphql: 'POST /mock-api/graphql (CWE-200 / CWE-799: introspection enabled, batch DoS abuse)'
    }
  });
});

// ── 1. Live OpenAPI 3.0.3 Contract ──────────────────────────────────────────
router.get('/openapi.json', (req, res) => {
  const host = req.get('host') || 'localhost:4000';
  const protocol = req.protocol || 'http';
  const baseUrl = `${protocol}://${host}/mock-api`;

  res.json({
    openapi: '3.0.3',
    info: {
      title: 'OFFAT-X Deliberately Vulnerable Mock Target API',
      version: '1.0.0',
      description: 'Built-in public test target for OFFAT-X autonomous security engine. Emulates real-world OWASP API Top 10 vulnerabilities.'
    },
    servers: [{ url: baseUrl, description: 'Live Embedded Mock Server' }],
    paths: {
      '/users': {
        get: {
          summary: 'List users',
          operationId: 'listUsers',
          responses: { '200': { description: 'User list' } }
        },
        post: {
          summary: 'Create user profile (Mass assignment vulnerable)',
          operationId: 'createUser',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' } } } } }
          },
          responses: { '201': { description: 'User created' } }
        }
      },
      '/users/{id}': {
        get: {
          summary: 'Get user details by ID (BOLA vulnerable)',
          operationId: 'getUserById',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'User profile with sensitive fields' }, '404': { description: 'User not found' } }
        }
      },
      '/orders': {
        get: {
          summary: 'List orders',
          operationId: 'listOrders',
          responses: { '200': { description: 'Order list' } }
        },
        post: {
          summary: 'Create new customer order (DAG producer)',
          operationId: 'createOrder',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { item: { type: 'string' }, amount: { type: 'number' } } } } }
          },
          responses: { '201': { description: 'Order created' } }
        }
      },
      '/orders/{id}': {
        get: {
          summary: 'Get order by ID (BOLA vulnerable)',
          operationId: 'getOrderById',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Order data' }, '404': { description: 'Order not found' } }
        }
      },
      '/admin/users/{id}': {
        delete: {
          summary: 'Admin delete user (BFLA vulnerable)',
          operationId: 'deleteUserAdmin',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'User deleted' } }
        }
      },
      '/admin/metrics': {
        get: {
          summary: 'Admin server metrics telemetry (BFLA vulnerable)',
          operationId: 'getAdminMetrics',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'System telemetry' } }
        }
      },
      '/auth/login': {
        post: {
          summary: 'Authenticate user',
          operationId: 'login',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, password: { type: 'string' } } } } }
          },
          responses: { '200': { description: 'Bearer token issued' } }
        }
      },
      '/auth/secret': {
        get: {
          summary: 'Access confidential vault (JWT alg none vulnerable)',
          operationId: 'getAuthSecret',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Confidential secret payload' }, '401': { description: 'Unauthorized' } }
        }
      },
      '/auth/reset-password': {
        post: {
          summary: 'Trigger password reset (Rate limit bypassable via X-Forwarded-For)',
          operationId: 'resetPassword',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } } } } }
          },
          responses: { '200': { description: 'Reset initiated' }, '429': { description: 'Rate limit exceeded' } }
        }
      },
      '/graphql': {
        post: {
          summary: 'GraphQL endpoint (Introspection and batch query enabled)',
          operationId: 'graphqlQuery',
          responses: { '200': { description: 'GraphQL result' } }
        }
      }
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  });
});

// ── 2. BOLA Endpoints (/users & /orders) ──────────────────────────────────────
router.get('/users', (req, res) => {
  res.json({ count: users.length, users: users });
});

router.post('/users', (req, res) => {
  const { username, email, role } = req.body || {};
  const newUser = {
    id: users.length + 101,
    username: username || 'new_user',
    role: role || 'user', // Mass assignment flaw: client can promote themselves to 'admin'
    email: email || 'user@example.com',
    ssn: '000-00-0000',
    balance: 0
  };
  users.push(newUser);
  res.status(201).json({ ok: true, user: newUser });
});

// VULNERABLE TO BOLA / IDOR (OWASP API1:2023 / CWE-639)
// Missing tenant boundary or user authorization check: Eve can exfiltrate Alice's SSN & balance!
router.get('/users/:id', (req, res) => {
  const uid = parseInt(req.params.id);
  const found = users.find(u => u.id === uid);
  if (!found) {
    return res.status(404).json({ error: 'User not found', id: uid });
  }
  // Exposes sensitive PII directly without checking session owner
  res.json({
    id: found.id,
    username: found.username,
    role: found.role,
    email: found.email,
    ssn: found.ssn,
    balance: found.balance,
    internalTenant: 'tenant_' + found.id
  });
});

router.get('/orders', (req, res) => {
  res.json({ count: orders.length, orders: orders });
});

// DAG Producer endpoint: sets up a new order for testing
router.post('/orders', (req, res) => {
  const body = req.body || {};
  const newOrder = {
    id: nextOrderId++,
    userId: 101,
    owner: 'alice',
    item: body.item || 'Enterprise API Audit License',
    amount: body.amount || 2500,
    status: 'confirmed',
    billingAddress: '124 Alice Way, Tech City',
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);
  res.status(201).json(newOrder);
});

// VULNERABLE TO BOLA / IDOR (OWASP API1:2023 / CWE-639)
router.get('/orders/:id', (req, res) => {
  const oid = parseInt(req.params.id);
  const order = orders.find(o => o.id === oid);
  if (!order) {
    return res.status(404).json({ error: 'Order not found', id: oid });
  }
  // No authorization check: anyone requesting this ID gets Alice's private order
  res.json(order);
});

// ── 3. BFLA Endpoints (/admin/*) ─────────────────────────────────────────────
// VULNERABLE TO BFLA (OWASP API5:2023 / CWE-285)
// Any caller with or without admin credentials can invoke DELETE on user accounts
router.delete('/admin/users/:id', (req, res) => {
  const uid = parseInt(req.params.id);
  const authHeader = req.headers['authorization'] || '';
  // Deliberate flaw: checks if auth header is present, but fails to verify if role === 'admin'
  const idx = users.findIndex(u => u.id === uid);
  if (idx !== -1) {
    const deleted = users.splice(idx, 1)[0];
    return res.json({
      success: true,
      action: 'USER_DELETED',
      deletedUser: deleted.username,
      escalationStatus: 'BFLA_CONFIRMED: endpoint allowed non-admin invocation'
    });
  }
  res.json({ success: true, message: 'User deleted or not found', id: uid });
});

// VULNERABLE TO BROKEN AUTHENTICATION / BFLA (CWE-306 / CWE-285)
router.get('/admin/metrics', (req, res) => {
  // Returns internal operational metrics without verifying admin privileges
  res.json({
    clusterStatus: 'HEALTHY',
    activeSessions: 342,
    databasePoolSize: 20,
    internalSecretKey: 'k8s_secret_enc_mock_offatx_984321',
    nodeEnv: 'staging',
    unrestrictedAccess: true
  });
});

// ── 4. JWT & Authentication Endpoints ────────────────────────────────────────
router.post('/auth/login', (req, res) => {
  const { username } = req.body || {};
  const user = users.find(u => u.username === username) || users[1]; // default Alice
  const token = makeFakeJwt({ sub: user.username, role: user.role, id: user.id });
  res.json({
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { id: user.id, username: user.username, role: user.role }
  });
});

// VULNERABLE TO JWT NONE ALGORITHM (OWASP API2 / CWE-347)
router.get('/auth/secret', (req, res) => {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  const token = auth.slice(7).trim();
  const parts = token.split('.');
  
  if (parts.length >= 2) {
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      
      // Vulnerability: if header.alg is 'none' or missing signature, server accepts it!
      if (header.alg === 'none' || parts.length === 2 || !parts[2]) {
        return res.json({
          status: 'SUCCESS_EXPLOIT',
          vulnerability: 'JWT_ALG_NONE_ACCEPTED',
          message: 'Access granted via unsigned JWT token with alg: none',
          authenticatedAs: payload.sub || 'root_attacker',
          role: payload.role || 'SUPERADMIN',
          confidentialVault: {
            pciData: 'ENC_VAULT_4000_1234_5678',
            rootSigningKey: 'rsa_pub_to_hmac_secret_mock'
          }
        });
      }
    } catch (_) {}
  }

  res.json({ status: 'OK', message: 'Authorized user access verified', payload: { role: 'user' } });
});

// ── 5. Rate Limiting with Header Spoofing Bypass ──────────────────────────────
// VULNERABLE TO RATE LIMIT BYPASS VIA X-FORWARDED-FOR (CWE-799)
router.post('/auth/reset-password', (req, res) => {
  // Flaw: blindly trusts client-supplied X-Forwarded-For header for IP throttling
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
  const now = Date.now();
  
  let record = rateLimitMap.get(clientIp);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + 60000 };
    rateLimitMap.set(clientIp, record);
  }

  record.count++;

  if (record.count > 5) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded for IP: ' + clientIp + '. Try again in 60s.',
      retryAfter: 60
    });
  }

  res.json({
    ok: true,
    message: 'Password reset link sent to ' + ((req.body && req.body.email) || 'user@example.com'),
    remainingRequests: 5 - record.count,
    evaluatedIp: clientIp
  });
});

// ── 6. Shadow / Undocumented Endpoints (OWASP API9:2023 / CWE-200) ────────────
// These endpoints are active live, but completely omitted from /mock-api/openapi.json
router.get('/debug/heap-dump', (req, res) => {
  res.json({
    status: 'ACTIVE_SHADOW_ENDPOINT',
    cwe: 'CWE-200',
    description: 'Internal debugging memory heap telemetry exposed to unauthenticated network clients.',
    processUptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    v8Version: process.versions.v8,
    activeHandles: process._getActiveHandles ? process._getActiveHandles().length : 4,
    nodeEnvironment: process.env.NODE_ENV || 'development'
  });
});

router.get('/internal/config', (req, res) => {
  res.json({
    status: 'ACTIVE_SHADOW_ENDPOINT',
    cwe: 'CWE-200',
    description: 'Internal configuration parameters exposed without contract documentation.',
    gateway: 'internal-mesh-gw.local',
    allowedTiers: ['Guest', 'Low', 'Premium', 'Admin'],
    dbConnectionString: 'postgres://app_user:s3cr3t_pass@127.0.0.1:5432/offatx_db'
  });
});

// ── 7. GraphQL Introspection & Batch Amplification Endpoint ──────────────────
router.post('/graphql', (req, res) => {
  const body = req.body;
  
  // Batch amplification check
  if (Array.isArray(body)) {
    return res.json(body.map((b, idx) => ({
      data: { user: { id: idx + 1, name: 'Alice Batch ' + idx } }
    })));
  }

  const query = (body && body.query) || '';
  if (query.includes('__schema') || query.includes('IntrospectionQuery')) {
    return res.json({
      data: {
        __schema: {
          types: [
            { name: 'Query', fields: [{ name: 'users' }, { name: 'orders' }, { name: 'adminSecrets' }] },
            { name: 'User', fields: [{ name: 'id' }, { name: 'username' }, { name: 'ssn' }, { name: 'role' }] },
            { name: 'Order', fields: [{ name: 'id' }, { name: 'owner' }, { name: 'amount' }] },
            { name: 'Mutation', fields: [{ name: 'deleteUser' }, { name: 'transferFunds' }] }
          ]
        }
      }
    });
  }

  res.json({ data: { message: 'GraphQL query executed successfully' } });
});

module.exports = router;

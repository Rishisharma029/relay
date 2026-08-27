# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| Older branches | ❌ |

## Reporting a Vulnerability

**Do not open a public GitHub Issue for security vulnerabilities.**

Please report security issues privately to:

📧 **rishisharma.bca25@satyug.edu.in**

Include the following in your report:

- A description of the vulnerability
- Steps to reproduce (proof of concept if possible)
- Affected component (frontend, server, specific API endpoint)
- Potential impact assessment
- Your suggested fix (optional but appreciated)

You will receive an acknowledgment within **48 hours** and a full response within **7 days**.

---

## Security Boundaries

RELAY enforces the following security boundaries by design:

### 1. Credential Separation

| Variable | Exposure |
|---|---|
| `VITE_AGORA_APP_ID` | Browser (public) — safe for WebRTC join |
| `AGORA_APP_CERTIFICATE` | Server-only — never in browser |
| `AGORA_CUSTOMER_ID` | Server-only |
| `AGORA_CUSTOMER_SECRET` | Server-only |
| `OPENAI_API_KEY` | Server-only |
| `DATABASE_URL` | Server-only |
| `REDIS_URL` | Server-only |

No `NEXT_PUBLIC_` or `VITE_` prefix should ever be added to server-side credentials.

### 2. Financial Action Security (6-Gate Model)

Every approval for a financial action passes through 6 sequential gates:

```
[1] Operator identity verified against server-side AUTHORIZED_OPERATORS set
[2] Case ownership verified (operator cannot approve cross-case actions)
[3] Action ownership / status check (no double-approve)
[4] Approval expiry gate (10-minute window, configurable)
[5] Idempotency key check (refund:<caseId>:<orderId> — no duplicate charges)
[6] Policy re-evaluation (second check at execution time)
```

### 3. Agora Token Security

- RTC tokens are generated **server-side** using `AGORA_APP_CERTIFICATE`
- Token lifetime: 24 hours with v2.8 hot-swap renewal
- No token generation logic is exposed client-side
- Token expiry triggers renewal without dropping the call

### 4. No Direct Database Access

The browser never touches the database directly. All persistence goes through the Express/Vite server middleware layer.

---

## Known Limitations (Hackathon Scope)

The following are **known, intentional trade-offs** for the current hackathon version:

1. **`AUTHORIZED_OPERATORS` is hardcoded** — production should use a database-backed role system
2. **Idempotency store is in-memory** — production should use Redis with persistent TTL
3. **No rate limiting on API endpoints** — production should add per-IP rate limiting
4. **No HTTPS enforcement** — production deployments should run behind TLS (Nginx/Cloudflare)
5. **No request authentication (JWT/session)** — production should authenticate all API calls

None of these are security vulnerabilities in the current demo context. They are architectural deferrals documented transparently.

---

## Dependency Audit

Run the following to audit dependencies:

```bash
npm audit
```

Known non-critical advisories in `agora-rtc-sdk-ng` are upstream vendor issues and do not affect RELAY's security posture.

# Security Implementation Guide

**Last updated:** 2026-03-13

This document reflects the **actual** security implementation in DermMap. For the full list of remediated vulnerabilities see `docs/SECURITY_REMEDIATION_PLAN.md`.

---

## Authentication Stack

DermMap uses **custom JWT authentication** — there is no third-party identity provider (Auth0 was removed). The stack is:

| Layer | Technology |
|---|---|
| Password hashing | bcrypt, cost factor 12 |
| Session tokens | JWT (HS256), 24-hour lifetime, `jti` claim |
| Token revocation | `user_sessions` table — every JWT is tracked and can be revoked immediately |
| Refresh rotation | Each `/auth/refresh` revokes the old `jti` and issues a new one |
| MFA / 2FA | TOTP via `otplib` — standard authenticator app (Google Authenticator, Authy) |
| Password reset | Secure random token, SHA-256 hashed in DB, 1-hour expiry, invalidates all sessions |
| Account lockout | 5 failed login attempts → 15-minute lockout per email address |
| Session timeout | 15-minute idle timeout enforced client-side (`useSessionTimeout` hook) |

### No CSRF risk
JWTs are sent via `Authorization: Bearer` header, not cookies — stateless bearer auth has no CSRF surface.

---

## Nginx Security Headers (nginx.conf)

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header X-XSS-Protection "0" always;
```

---

## Access Control

- ✅ Role-based access control: `admin`, `manager`, `provider`, `ma`
- ✅ Location-tenancy enforced on all clinical routes (patients, visits, lesions, photos, schedule, analytics)
- ✅ Managers scoped to their own clinic; admins see all clinics
- ✅ DELETE operations on clinical records restricted to `provider` and above
- ✅ Deactivated users: all sessions immediately revoked on deactivation
- ✅ `authorizeRoles` returns generic 403 — does not disclose required role

---

## Audit Logging (HIPAA §164.312(b))

All PHI access, creation, modification, and deletion is recorded server-side in the `audit_logs` table:

- Routes covered: patients, visits, lesions, photos, sync
- Fields logged: `user_id`, `user_name`, `user_role`, `action_type`, `resource_type`, `resource_id`, `ip_address`, `timestamp`
- Request log format: `[timestamp] METHOD /path user=<id> ip=<ip> status=<code>`
- Logs are written inside a `try/catch` — audit failures never break the primary request

---

## Data Protection (HIPAA)

- ✅ Database transport encrypted via SSL (`DB_SSL=true` in production)
- ✅ PHI never cached in service worker — Cache API is cleared on logout
- ✅ IndexedDB (`DermMapOfflineDB` and `dermmap`) fully cleared on logout
- ✅ `sessionStorage` cleared on logout
- ✅ Server stack traces never sent to clients (logged server-side only)
- ✅ Demo mode disabled in production builds unless `VITE_AUTH_PROVIDER=demo` is explicitly set

---

## Migration Framework

Schema changes are managed by versioned `node-pg-migrate` migrations in `backend/migrations/`. All future schema changes must be expressed as numbered migration files — no DDL at runtime.

```bash
npm run db:migrate       # apply pending migrations
npm run db:rollback      # roll back last migration
npm run db:migrate:create -- <name>   # scaffold new migration
```

---

## Production Deployment Security

### Required Environment Variables
**Never commit these to git — use `.env` or a secrets manager:**

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | JWT signing secret — minimum 32 characters, cryptographically random |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_SSL` | Set to `true` in production |
| `SMTP_PASS` | SMTP password for password-reset emails |
| `DOCUSIGN_CONNECT_SECRET` | HMAC secret for DocuSign webhook verification |

See `.env.docker.example` for a complete template.

### SSL/TLS
- Use TLS 1.3 minimum
- A+ rating on SSL Labs
- Certificate auto-renewal
- HSTS preloading (header deployed)

### Monitoring
- Set up security alerts
- Monitor failed login attempts (`audit_logs` + application logs)
- Track unusual API access patterns
- Log all authentication events

---

## Security Audit Checklist

### Pre-Launch
- [ ] Run `npm audit` and fix all high/critical vulnerabilities
- [ ] Penetration testing by security firm
- [ ] HIPAA compliance review
- [ ] OWASP Top 10 verification
- [ ] Dependency scanning with Snyk or Dependabot
- [ ] WAF (Web Application Firewall) setup
- [ ] DDoS protection enabled
- [ ] Input validation on all user inputs

### Ongoing
- [ ] Monthly security audits
- [ ] Automated dependency updates
- [ ] Regular backup testing
- [ ] Incident response plan documented
- [ ] Staff training on PHI handling

---

## Incident Response Plan

1. **Detection**: Application logs, user reports, monitoring tools
2. **Assessment**: Severity, scope, affected users
3. **Containment**: Revoke sessions (`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1`), disable compromised accounts
4. **Eradication**: Fix vulnerability, patch systems
5. **Recovery**: Restore from backups if needed
6. **Post-Incident**: Review, document, improve

## Compliance Requirements

### HIPAA
- [ ] Business Associate Agreement (BAA) signed
- ✅ Encryption in transit (TLS + DB SSL)
- ✅ Access controls and audit logs
- [ ] Encryption at rest (OS/disk-level — outside app scope)
- [ ] Breach notification procedures documented
- [ ] Regular risk assessments
- [ ] Staff training on PHI handling

### GDPR (if applicable)
- [ ] Privacy policy published
- [ ] Cookie consent mechanism
- [ ] Right to be forgotten implementation
- [ ] Data portability feature
- [ ] Data processing agreement

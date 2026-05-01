# Post-Mortem: ReleasePilot Dashboard Pipeline Fix

**Date:** 2026-04-30
**Project:** ReleasePilot — Kubernetes Microservices Dashboard
**Status:** ✅ Resolved
**Severity:** High — Core dashboard feature completely non-functional

---

## Table of Contents

1. [Bug Overview](#1-bug-overview)
2. [Files Modified](#2-files-modified)
3. [Step-by-Step Fix](#3-step-by-step-fix)
4. [Key Code Changes](#4-key-code-changes)
5. [Architecture Diagram](#5-architecture-diagram)
6. [Lessons Learned](#6-lessons-learned)

---

## 1. Bug Overview

### Symptoms

After a successful login, the ReleasePilot dashboard's **Live Fleet** section was permanently stuck displaying:

```
Scanning cluster for active services...
```

No service cards ever rendered. The loading spinner never resolved. There were no visible errors in the UI.

### Root Causes (Three Distinct Bugs)

| # | Layer | Bug | Effect |
|---|-------|-----|--------|
| 1 | **Kubernetes** | The `services-service` K8s Service exposed port `4006`, but the API Gateway hardcoded `http://services-service:4001` | Every `/api/services` request from the gateway triggered `"Error occurred while trying to proxy"` — the fetch never resolved, keeping `loading = true` forever |
| 2 | **Kubernetes YAML** | The source-of-truth manifest `k8s/services-service.yaml` was never updated after the live cluster was patched | Any future `kubectl apply` would silently revert the fix and re-break the dashboard |
| 3 | **React Frontend** | `App.tsx` derived badge colour exclusively from a live health-check ping (`healthStatus[service.slug]`). The `service.status` field from the database (`'Healthy'`, `'UP'`) was never read. Additionally, the live health check for slug `frontend-portal` called `/api/frontend/health` — a gateway route that does not exist — so it always resolved to `'down'` | Even after the data loaded, `Frontend Portal` always rendered a red badge |

### Why the Loading State Never Resolved

```
React fetch() → Gateway → services-service:4001
                                     ↕
                        K8s Service only listens on :4006
                                     ↕
                        Connection refused → proxy error
                                     ↕
                    fetch() rejects → catch() fires
                                     ↕
              setLoading(false) + setServices([]) → error state shown
                  (but the error message was suppressed under
                   the loading guard: services.length === 0
                   caused the "Scanning..." div to stay visible)
```

---

## 2. Files Modified

| File | Location | Change Type |
|------|----------|-------------|
| `k8s/services-service.yaml` | `release-pilot/k8s/services-service.yaml` | YAML port corrected `4006` → `4001` |
| `frontend/src/App.tsx` | `release-pilot/frontend/src/App.tsx` | Badge logic rewritten to use DB status as source of truth |

**Live cluster changes (no file):**

| Resource | Change |
|----------|--------|
| K8s Service `services-service` | Port patched live: `4006` → `4001` via `kubectl apply` |
| Nginx pod `frontend-698f596bcb-947qm` | New compiled `dist/` hot-copied in without pod restart |

---

## 3. Step-by-Step Fix

### Step 1 — Diagnose the Proxy Failure

**Goal:** Confirm the gateway cannot reach the services-service.

```bash
# From the Ubuntu server
curl -s http://localhost:4000/api/services -H 'Authorization: Bearer test'
# Output: Error occurred while trying to proxy: localhost:4000/api/services
```

Then compared the gateway source against the live K8s service:

```bash
# Gateway source (hardcoded)
grep services-service release-pilot/backend/gateway/src/index.ts
# → http://services-service:4001

# Live K8s service
kubectl get svc services-service
# → PORT(S): 4006/TCP   ← MISMATCH
```

**Finding:** The K8s Service listens on `4006`; the gateway calls `:4001`. Connection refused.

---

### Step 2 — The Port Routing Fix (Live Cluster)

**Goal:** Make `http://services-service:4001` reachable without rebuilding the gateway Docker image.

A complete replacement manifest was written to a temp file and applied:

```bash
cat > /tmp/svc-full.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: services-service
  namespace: default
spec:
  selector:
    app: services-service
  ports:
  - protocol: TCP
    port: 4001        # ← changed from 4006
    targetPort: 4001
EOF

kubectl apply -f /tmp/svc-full.yaml
```

**Verification:**

```bash
kubectl get svc services-service
# NAME               TYPE        CLUSTER-IP    PORT(S)    AGE
# services-service   ClusterIP   10.43.28.58   4001/TCP   4d12h

curl -s http://localhost:4000/api/services -H 'Authorization: Bearer test'
# → [{"id":"svc-bbbb","name":"Auth Gateway",...}, ...]  ✅
```

---

### Step 3 — The YAML Drift Fix (Source of Truth)

**Goal:** Ensure the repository manifest matches the live cluster so future `kubectl apply` runs don't revert the fix.

Updated `release-pilot/k8s/services-service.yaml`:

```yaml
# Changed port: 4006 → 4001 to match the gateway's hardcoded value
apiVersion: v1
kind: Service
metadata:
  name: services-service
spec:
  selector:
    app: services-service
  ports:
    - protocol: TCP
      port: 4001       # was 4006
      targetPort: 4001
```

The deployment section was also cleaned up (removed now-stale inline comments).

---

### Step 4 — The UI Badge Fix (React)

**Goal:** Make all service cards show a green badge when `service.status` from the database is `'Healthy'` or `'UP'`, regardless of whether a live health-check ping succeeds.

**Problem with the original logic:**

The badge relied entirely on `healthStatus[service.slug]`, set by this function:

```typescript
const checkServiceHealth = async (slug: string) => {
  const res = await fetch(`http://192.168.29.100:4000/api/${slug.split('-')[0]}/health`);
  setHealthStatus(prev => ({ ...prev, [slug]: res.ok ? 'up' : 'down' }));
};
```

For the slug `frontend-portal`:
- `slug.split('-')[0]` → `"frontend"`
- Calls `/api/frontend/health`
- Gateway has no `/api/frontend` route → **404**
- `res.ok` is `false` → sets `healthStatus['frontend-portal'] = 'down'`
- Badge renders red, permanently

**First attempted fix (still buggy):**

```typescript
// BUG: live === 'down' still short-circuits the DB fallback
const effectiveStatus =
  live === 'up' || live === 'down'   // ← 'down' returns here, never reaches DB check
    ? live
    : service.status === 'Healthy' || service.status === 'UP'
    ? 'up'
    : 'down';
```

**Final correct fix:**

```typescript
// Green if EITHER the live ping succeeds OR the DB says healthy.
// Only red if DB status is not healthy AND live ping fails.
const effectiveStatus: 'up' | 'down' =
  live === 'up' || service.status === 'Healthy' || service.status === 'UP'
    ? 'up'
    : 'down';
```

After editing `App.tsx`, the frontend was rebuilt on the server and the compiled output was hot-copied into the running nginx pod:

```bash
# Build
cd release-pilot/frontend && npm run build

# Deploy into running pod (no restart needed)
FRONTEND_POD=$(kubectl get pod -l app=frontend -o jsonpath={.items[0].metadata.name})
kubectl cp release-pilot/frontend/dist/. ${FRONTEND_POD}:/usr/share/nginx/html/
```

---

## 4. Key Code Changes

### Change 1 — K8s Service Port (`k8s/services-service.yaml`)

```yaml
# BEFORE
apiVersion: v1
kind: Service
metadata:
  name: services-service
spec:
  selector:
    app: services-service
  ports:
    - protocol: TCP
      port: 4006       # ← gateway couldn't reach this; caused proxy error
      targetPort: 4001
```

```yaml
# AFTER
apiVersion: v1
kind: Service
metadata:
  name: services-service
spec:
  selector:
    app: services-service
  ports:
    - protocol: TCP
      port: 4001       # ← matches gateway's hardcoded http://services-service:4001
      targetPort: 4001
```

---

### Change 2 — Badge Status Logic (`frontend/src/App.tsx`)

```tsx
// BEFORE — badge colour derived purely from live health-check ping
// healthStatus[service.slug] is 'down' for frontend-portal (no /api/frontend/health route)
<HealthPulse status={healthStatus[service.slug] || 'loading'} />

<span className={`... ${
  healthStatus[service.slug] === 'up'
    ? 'border-green-500/30 text-green-400 bg-green-500/5'
    : 'border-red-500/30 text-red-400 bg-red-500/5'
}`}>
  {healthStatus[service.slug]?.toUpperCase() || 'CHECKING'}
</span>
```

```tsx
// AFTER — DB status is source of truth; live ping is a bonus signal
{services.map((service, index) => {
  const live = healthStatus[service.slug];
  const effectiveStatus: 'up' | 'down' =
    live === 'up' || service.status === 'Healthy' || service.status === 'UP'
      ? 'up'
      : 'down';

  return (
    <motion.div key={service.id} ...>
      <HealthPulse status={effectiveStatus} />

      <span className={`... ${
        effectiveStatus === 'up'
          ? 'border-green-500/30 text-green-400 bg-green-500/5'
          : 'border-red-500/30 text-red-400 bg-red-500/5'
      }`}>
        {effectiveStatus === 'up' ? 'UP' : 'DOWN'}
      </span>
    </motion.div>
  );
})}
```

---

## 5. Architecture Diagram

```
Browser (React)
    │
    │  GET /api/services
    │  Authorization: Bearer <jwt>
    ▼
API Gateway  :4000  (pod: gateway-867644d578-ppztv)
    │
    │  createProxyMiddleware → http://services-service:4001
    ▼
K8s Service: services-service
    │  port: 4001  →  targetPort: 4001          ← FIXED (was 4006)
    ▼
services-service pod  :4001  (pod: services-service-785bbc9445-kll2r)
    │
    │  SELECT * FROM services ORDER BY created_at DESC
    ▼
PostgreSQL  postgres:5432  (pod: postgres-55fb9b7fc-nqvpd)
    │
    │  DATABASE_URL = postgresql://postgres:skyie%40123@postgres:5432/releasepilot
    │                                              ↑
    │                              URL-encoded @ symbol (was a prior bug in auth-service)
    ▼
Table: services
┌──────────┬─────────────────────┬─────────────────┬─────────┐
│ id       │ name                │ slug            │ status  │
├──────────┼─────────────────────┼─────────────────┼─────────┤
│ svc-bbbb │ Auth Gateway        │ auth-gateway    │ Healthy │
│ svc-cccc │ Notification Engine │ noti-engine     │ Healthy │
│ svc-aaaa │ Frontend Portal     │ frontend-portal │ Healthy │
└──────────┴─────────────────────┴─────────────────┴─────────┘
```

---

## 6. Lessons Learned

### Never let K8s Service port and gateway target drift silently

The K8s Service for `services-service` was defined with `port: 4006` but the gateway source code called `:4001`. Both were committed separately with no cross-reference check, and no integration test caught the mismatch until a human hit the UI.

**Mitigation:** Pin service ports as a shared constant in a central config, or add a startup check in the gateway that verifies upstream reachability before reporting itself healthy.

---

### Health-check slugs must map to real gateway routes

The `checkServiceHealth` function derived a health endpoint from the first segment of each slug (`frontend-portal` → `/api/frontend/health`). No such route existed in the gateway. This is a fragile convention.

**Mitigation:** Either store an explicit health-check URL per service in the database, or have the gateway expose a single `/api/health/all` aggregation endpoint instead of relying on slug parsing.

---

### DB status should be the source of truth; live pings are supplementary

A live health-check ping failing should not silently override a known-good database status unless there is a deliberate "incident declared" workflow. The final `effectiveStatus` logic reflects this: the DB is trusted by default, and a successful live ping is a positive signal, not the only signal.

---

### YAML drift is a silent time bomb

The live cluster was patched to fix the port, but the source YAML still said `4006`. Any `kubectl apply` or CI/CD re-deploy would have silently reverted the fix. Always update both the live cluster **and** the manifest file in the same operation.

---

### Note on Token Usage

> This document was requested to include a per-step token breakdown. Claude does not expose session-level token consumption metrics to the model itself during a conversation — there is no internal API call that returns "tokens used in step N." Any numbers provided here would be fabricated.
>
> To get accurate token usage for this session, check your **Anthropic Console → Usage** dashboard, or inspect the `usage` field in the raw API response object if you are calling the API programmatically. Each API response includes `input_tokens` and `output_tokens` for that specific turn.

---

*Document generated: 2026-04-30 | ReleasePilot v1 | Infrastructure: K3s on Ubuntu 22.04*

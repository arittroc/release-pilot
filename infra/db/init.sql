-- Docker automatically creates the 'releasepilot' DB, so we just build the schemas.

-- 1. AUTHENTICATION
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO auth.users (email, password_hash, display_name)
VALUES ('admin@releasepilot.com', 'dummyhash123', 'Admin User');

-- 2. CATALOG
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE TABLE catalog.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  repo_url text,
  owner_team text,
  default_environment text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO catalog.services (id, slug, name, description, repo_url, owner_team)
VALUES 
  ('eba28889-57a5-427a-b5a5-8e7e3ae8ed60', 'auth-api', 'Authentication API', 'Handles user identity', 'github.com/org/auth', 'platform-team'),
  ('3f686a5e-1aab-4f9b-8beb-2912bad1aaa2', 'payment-gateway', 'Payment Gateway', 'Stripe integration', 'github.com/org/payments', 'billing-team');

-- 3. DELIVERY
CREATE SCHEMA IF NOT EXISTS delivery;
CREATE TABLE delivery.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  version text NOT NULL,
  commit_sha text,
  environment text NOT NULL,
  status text NOT NULL,
  deployed_by uuid,
  started_at timestamptz,
  deployed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO delivery.releases (id, service_id, version, commit_sha, environment, status)
VALUES 
  ('3145dee2-0e95-44e0-a8ec-c017801797ee', 'eba28889-57a5-427a-b5a5-8e7e3ae8ed60', 'v1.0.0', 'a1b2c3d', 'production', 'success'),
  ('b2a71486-790f-48b1-965b-195062aa7166', '3f686a5e-1aab-4f9b-8beb-2912bad1aaa2', 'v2.1.4', 'f9e8d7c', 'staging', 'deploying');

-- 4. OPERATIONS
CREATE SCHEMA IF NOT EXISTS ops;
CREATE TABLE ops.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  related_release_id uuid,
  title text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL,
  summary text,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ops.incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES ops.incidents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ops.incidents (id, service_id, related_release_id, title, severity, status, summary)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'eba28889-57a5-427a-b5a5-8e7e3ae8ed60', 
  '3145dee2-0e95-44e0-a8ec-c017801797ee',
  'High latency after v1.0.0 rollout',
  'sev-2',
  'investigating',
  'API response times spiked immediately following the production deployment.'
);

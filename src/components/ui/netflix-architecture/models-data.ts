export interface FieldDef {
  name: string;
  type: string;
  note?: string;
  pk?: boolean;
  fk?: string; // "table.column"
  unique?: boolean;
  index?: boolean;
  ttl?: boolean;
}
export interface EntityDef {
  name: string;
  store: "Aurora" | "DynamoDB" | "Cassandra" | "Redis";
  storeColor: string;
  fields: FieldDef[];
  indexes?: { name: string; desc: string }[];
  accessPatterns?: string[];
  /** One-sentence reason why THIS entity lives in THIS specific store */
  dbRationale?: string;
}
export interface ModelGroup {
  id: string;
  label: string;
  icon: string;
  store: string;
  storeColor: string;
  rationale: string;
  antiPatterns: string[];
  interviewTip: string;
  scalingNote: string;
  storageCost: string;
  entities: EntityDef[];
  ddl?: { label: string; code: string }[];
}

const AURORA  = "#f59e0b";
const DYNAMO  = "#818cf8";
const CASS    = "#38bdf8";
const REDIS_C = "#f87171";

export const MODEL_GROUPS: ModelGroup[] = [
  {
    id: "user-profile",
    label: "User & Profile",
    icon: "👤",
    store: "Aurora PostgreSQL",
    storeColor: AURORA,
    rationale: "User accounts and profiles need ACID transactions, referential integrity (CASCADE DELETE), and complex JOIN queries for billing dashboards. DynamoDB can't enforce FK constraints or run multi-table transactions without application-level orchestration. Billing errors that charge real money require strong consistency — Aurora is the only choice.",
    antiPatterns: [
      "Don't store watch history here — 500K writes/sec would kill Aurora",
      "Don't store content metadata here — 50K RPS read throughput needs DynamoDB",
      "Don't store session tokens here — sub-ms access needs Redis",
    ],
    interviewTip: "Distinguish User (billing entity) from Profile (viewing persona) immediately. Interviewers test this.",
    scalingNote: "At 10× scale: read replicas + PgBouncer pooling stays the same pattern, just more replicas. Aurora Serverless v2 for burst workloads. The schema doesn't change.",
    storageCost: "~500 GB at current scale. At $0.10/GB/month on Aurora = ~$50/month storage (trivial vs compute).",
    entities: [
      {
        name: "users",
        store: "Aurora",
        storeColor: AURORA,
        dbRationale: "Aurora because billing identity needs ACID transactions, FK constraints to subscriptions/payment_methods, and GDPR hard-delete semantics — none of which DynamoDB can enforce natively.",
        fields: [
          { name: "user_id",           type: "UUID",         pk: true,    note: "DEFAULT gen_random_uuid()" },
          { name: "email",             type: "VARCHAR(255)",  unique: true, note: "NOT NULL, indexed" },
          { name: "password_hash",     type: "VARCHAR(255)",  note: "bcrypt cost 12, never plaintext" },
          { name: "subscription_tier", type: "VARCHAR(20)",   note: "'basic'|'standard'|'premium' — authoritative billing tier; denormalised on JWT claim" },
          { name: "plan_type",         type: "VARCHAR(20)",   note: "Alias kept for FK consumers; same enum as subscription_tier" },
          { name: "region",            type: "VARCHAR(50)",   note: "e.g. 'us-east-1' — drives CDN PoP selection and content licensing" },
          { name: "country_code",      type: "CHAR(2)",       note: "ISO 3166-1, drives content geo-restriction" },
          { name: "device_limit",      type: "SMALLINT",      note: "Max concurrent streams: 1(basic)/2(standard)/4(premium)" },
          { name: "created_at",        type: "TIMESTAMP",     note: "DEFAULT NOW()" },
          { name: "updated_at",        type: "TIMESTAMP",     note: "DEFAULT NOW()" },
          { name: "deleted_at",        type: "TIMESTAMP",     note: "NULL = active, set on GDPR deletion request" },
        ],
        accessPatterns: ["get by email (login)", "get by user_id (profile load)", "list all for billing reports (rare)"],
      },
      {
        name: "profiles",
        store: "Aurora",
        storeColor: AURORA,
        dbRationale: "Aurora because profiles are a child entity of users (FK → ON DELETE CASCADE) and are always read with a JOIN to users for access-control checks — keeping them in the same RDBMS avoids cross-store transactions.",
        fields: [
          { name: "profile_id",    type: "UUID",         pk: true,    note: "DEFAULT gen_random_uuid()" },
          { name: "user_id",       type: "UUID",         fk: "users.user_id", note: "ON DELETE CASCADE" },
          { name: "name",          type: "VARCHAR(50)",  note: "NOT NULL" },
          { name: "avatar_url",    type: "TEXT",         note: "Points to S3 thumbnail" },
          { name: "is_kids",       type: "BOOLEAN",      note: "DEFAULT FALSE — drives content filtering" },
          { name: "max_rating",    type: "VARCHAR(10)",  note: "'G'|'PG'|'PG-13'|'R' — parental control" },
          { name: "language_pref", type: "VARCHAR(10)",  note: "ISO 639-1 language code" },
          { name: "pin_hash",      type: "VARCHAR(255)", note: "Profile switch PIN, bcrypt — NULL if no PIN" },
          { name: "created_at",    type: "TIMESTAMP",    note: "DEFAULT NOW()" },
        ],
        accessPatterns: ["get profiles by user_id", "get profile_id for JWT", "check is_kids for catalog filtering"],
      },
    ],
    ddl: [
      {
        label: "users.sql",
        code: `CREATE TABLE users (
  user_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(20) NOT NULL
    CHECK (subscription_tier IN ('basic','standard','premium')),
  plan_type         VARCHAR(20) GENERATED ALWAYS AS (subscription_tier) STORED,
  region            VARCHAR(50) NOT NULL,  -- e.g. 'us-east-1'
  country_code      CHAR(2) NOT NULL,      -- ISO 3166-1
  device_limit      SMALLINT NOT NULL
    CHECK (device_limit IN (1,2,4)),       -- basic=1, std=2, premium=4
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  deleted_at        TIMESTAMP              -- NULL = active (soft-delete)
);
CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_users_region  ON users(region);
CREATE INDEX idx_users_country ON users(country_code);`,
      },
      {
        label: "profiles.sql",
        code: `CREATE TABLE profiles (
  profile_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name          VARCHAR(50) NOT NULL,
  avatar_url    TEXT,
  is_kids       BOOLEAN DEFAULT FALSE,
  max_rating    VARCHAR(10),
  language_pref VARCHAR(10),
  pin_hash      VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);`,
      },
    ],
  },
  {
    id: "content-episode",
    label: "Content & Episode",
    icon: "🎬",
    store: "DynamoDB",
    storeColor: DYNAMO,
    rationale: "Content metadata is read-heavy at 50,000 RPS with well-defined access patterns: get-by-id, list-by-genre, get-episodes-of-series. DynamoDB delivers single-digit ms at any scale, deploys globally with zero ops, and the flexible document model handles the wide variety of content attributes (movie vs series vs short). No JOINs needed — all reads are single-entity lookups.",
    antiPatterns: [
      "Don't run ad-hoc analytics here — use OpenSearch or Redshift for 'find all titles released in 2022 with rating > 7'",
      "Don't store watch history here — wrong access pattern (time-series) and wrong throughput profile",
      "Don't run full-text search here — DynamoDB has no text index, use OpenSearch for that",
    ],
    interviewTip: "State access patterns before table design. Interviewers want to hear 'I defined 3 access patterns upfront: get-by-id, list-by-genre, get-episodes.' That's DynamoDB design thinking.",
    scalingNote: "At 10× scale: on-demand capacity auto-scales, no changes needed. Add a global secondary index if a new access pattern emerges — don't redesign the table.",
    storageCost: "~10 GB (1.7M items × ~6KB average). Negligible — DynamoDB costs are dominated by read/write units, not storage.",
    entities: [
      {
        name: "content",
        store: "DynamoDB",
        storeColor: DYNAMO,
        dbRationale: "DynamoDB because content metadata is read-heavy at 50 K RPS with fully predictable access patterns (get-by-id, list-by-genre). Schemaless attributes handle the wide variation between movies, series, and shorts without NULL columns or ALTER TABLE migrations.",
        fields: [
          { name: "PK: content_id",     type: "String",    pk: true,  note: "e.g. 'tt1234567' (IMDb-style ID)" },
          { name: "SK: 'METADATA'",      type: "String",    pk: true,  note: "Constant SK for metadata item" },
          { name: "title",              type: "String",    note: "Full title, used in search" },
          { name: "type",               type: "String",    note: "'MOVIE' | 'SERIES' | 'SHORT'" },
          { name: "genres",             type: "StringSet", note: "['Drama','Thriller'] — enables GSI fan-out" },
          { name: "cast",               type: "List",      note: "Array of {name, role}" },
          { name: "director",           type: "String",    note: "For search boosting" },
          { name: "release_year",       type: "Number",    note: "Used for date-sorted GSI SK" },
          { name: "maturity_rating",    type: "String",    note: "'G'|'PG'|'PG-13'|'R'|'TV-MA' — enforced by profile.max_rating" },
          { name: "thumbnail_url",      type: "String",    note: "S3 path; personalized at display time" },
          { name: "available_regions",  type: "StringSet", note: "['US','CA','GB'] — hard filter in queries" },
          { name: "duration_secs",      type: "Number",    note: "Duration in seconds (precision needed for progress % and '3 min left' UX); also stored as duration_minutes = duration_secs/60 for display" },
          { name: "duration_minutes",   type: "Number",    note: "Derived display field — kept for backward compat" },
          { name: "description",        type: "String",    note: "Used in OpenSearch full-text index" },
        ],
        indexes: [
          { name: "genre-index (GSI)",  desc: "PK=genre, SK=release_year — list all content in a genre sorted by year" },
          { name: "type-index (GSI)",   desc: "PK=type, SK=content_id — list all movies vs series" },
          { name: "region-index (GSI)", desc: "PK=region, SK=content_id — get all available titles per region (sparse)" },
        ],
        accessPatterns: [
          "get content by ID → PK=content_id, SK=METADATA",
          "list by genre sorted by year → genre-index GSI",
          "get all episodes in series → PK=series_id, SK begins_with 'S'",
          "search (full-text) → OpenSearch, not DynamoDB",
        ],
      },
      {
        name: "episodes",
        store: "DynamoDB",
        storeColor: DYNAMO,
        dbRationale: "DynamoDB because episodes belong to a series (same partition key), so get-all-episodes is a single Query with no cross-partition scatter — impossible to match with a relational range scan at this read throughput.",
        fields: [
          { name: "PK: series_id",      type: "String",  pk: true, note: "Same as content_id for series" },
          { name: "SK: 'S{n}E{n}'",     type: "String",  pk: true, note: "e.g. 'S02E05' — enables range query" },
          { name: "episode_id",         type: "String",  note: "UUID for this specific episode" },
          { name: "title",              type: "String",  note: "Episode title" },
          { name: "duration_minutes",   type: "Number",  note: "Used for resume UX" },
          { name: "thumbnail_url",      type: "String",  note: "Episode-specific thumbnail" },
          { name: "description",        type: "String",  note: "Episode synopsis" },
          { name: "release_date",       type: "String",  note: "ISO 8601 — for 'New Episode' badges" },
        ],
        accessPatterns: [
          "get all episodes for a series → PK=series_id, SK begins_with 'S'",
          "get specific episode → PK=series_id, SK='S02E05'",
          "get latest season → sort by SK descending",
        ],
      },
    ],
    ddl: [
      {
        label: "content table (PartiQL examples)",
        code: `-- Get content by ID
SELECT * FROM content WHERE PK='tt1234567' AND SK='METADATA'

-- List drama titles sorted by year (GSI)
SELECT * FROM content."genre-index"
WHERE genre='Drama' ORDER BY release_year DESC

-- Get all episodes of a series
SELECT * FROM episodes
WHERE series_id='tt9876543' AND begins_with(SK, 'S')
ORDER BY SK ASC`,
      },
    ],
  },
  {
    id: "watch-history",
    label: "Watch History",
    icon: "⏱",
    store: "Apache Cassandra",
    storeColor: CASS,
    rationale: "500K writes/second at peak (all concurrent viewers sending 30s heartbeats). Cassandra is purpose-built for this: linear write scale across nodes, time-series data partitions naturally by user, native TTL eliminates cleanup jobs, and eventual consistency is acceptable for watch progress.",
    antiPatterns: [
      "Don't use a single partition key of profile_id alone — unbounded partition growth for power users",
      "Don't use QUORUM reads — LOCAL_ONE is correct here, read freshness doesn't matter for 3-second-stale data",
      "Don't store this in Aurora — 500K writes/sec would require extreme sharding and connection pool management",
    ],
    interviewTip: "Explain the TWO table design: watch_progress (upsert, current position) vs watch_history (append-only, full log). They serve different consumers. Mentioning this distinguishes senior candidates.",
    scalingNote: "At 10× scale: add nodes (Cassandra scales linearly). Bucket partition key by month instead of year. Consider Scylla DB (same CQL API, 10× throughput on the same hardware).",
    storageCost: "~16 TB per region. At current S3/EBS pricing for Cassandra nodes (~$0.10/GB/month), ~$1,600/month per region for data storage. Cheap for the throughput it delivers.",
    entities: [
      {
        name: "watch_progress",
        store: "Cassandra",
        storeColor: CASS,
        dbRationale: "Cassandra because this table absorbs 500 K heartbeat writes/sec — its LSM-tree engine turns random writes into sequential I/O, and partitioning by profile_id keeps each resume-position lookup a single-node O(1) read.",
        fields: [
          { name: "profile_id",   type: "UUID",      pk: true, note: "Partition key — all progress for a profile on one node" },
          { name: "content_id",   type: "TEXT",      pk: true, note: "Clustering key — enables get-by-content" },
          { name: "episode_id",   type: "TEXT",      note: "NULL for movies, episode UUID for series" },
          { name: "progress_sec", type: "INT",        note: "Seconds into content — UPSERTED on each heartbeat" },
          { name: "updated_at",   type: "TIMESTAMP", note: "Last heartbeat time — drives 'recently watched' sorting" },
          { name: "completed",    type: "BOOLEAN",   note: "TRUE when progress > 95% of duration" },
        ],
        accessPatterns: [
          "get resume position → PK=profile_id, CK=content_id (O(1))",
          "list all in-progress content for 'Continue Watching' row → PK=profile_id, limit 10",
        ],
      },
      {
        name: "watch_history",
        store: "Cassandra",
        storeColor: CASS,
        dbRationale: "Cassandra because this is an append-only time-series log; year-bucketed composite partition key prevents hot partitions for power users, and native TTL auto-expires old records without a batch delete job.",
        fields: [
          { name: "profile_id",   type: "UUID",      pk: true, note: "Partition key component" },
          { name: "year",         type: "INT",        pk: true, note: "Bucket key — prevents unbounded partition growth" },
          { name: "watched_at",   type: "TIMESTAMP", pk: true, note: "Clustering key DESC — newest first" },
          { name: "content_id",   type: "TEXT",      note: "What was watched" },
          { name: "episode_id",   type: "TEXT",      note: "NULL for movies" },
          { name: "progress_sec", type: "INT",        note: "Position at time of this event" },
          { name: "duration_sec", type: "INT",        note: "Total content duration — for % completion" },
          { name: "bitrate_kbps", type: "INT",        note: "Quality tier at end of watch — analytics signal" },
        ],
        accessPatterns: [
          "get recent watch history for reco model → PK=(profile_id, current_year), newest first",
          "get watch history across years → query (profile_id, 2024) + (profile_id, 2023) and merge in app",
        ],
      },
    ],
    ddl: [
      {
        label: "watch_progress.cql",
        code: `CREATE TABLE watch_progress (
  profile_id    UUID,
  content_id    TEXT,
  episode_id    TEXT,
  progress_sec  INT,
  updated_at    TIMESTAMP,
  completed     BOOLEAN,
  PRIMARY KEY (profile_id, content_id)
) WITH default_time_to_live = 7776000; -- 90 days TTL

-- Upsert on each heartbeat
INSERT INTO watch_progress (profile_id, content_id, episode_id, progress_sec, updated_at)
VALUES (?, ?, ?, ?, toTimestamp(now()))
USING TTL 7776000;`,
      },
      {
        label: "watch_history.cql",
        code: `CREATE TABLE watch_history (
  profile_id  UUID,
  year        INT,
  watched_at  TIMESTAMP,
  content_id  TEXT,
  episode_id  TEXT,
  progress_sec INT,
  duration_sec INT,
  bitrate_kbps INT,
  PRIMARY KEY ((profile_id, year), watched_at)
) WITH CLUSTERING ORDER BY (watched_at DESC)
  AND default_time_to_live = 7776000; -- 90 days TTL`,
      },
    ],
  },
  {
    id: "subscription",
    label: "Subscription & Payment",
    icon: "💳",
    store: "Aurora PostgreSQL",
    storeColor: AURORA,
    rationale: "Payment data requires ACID transactions — the state machine transition (ACTIVE → PAST_DUE → CANCELLED) and the corresponding billing action must be atomic. PCI DSS compliance is simplified by Stripe handling raw card data; we only ever store Stripe tokens.",
    antiPatterns: [
      "NEVER store raw card numbers — only Stripe payment_method tokens",
      "Don't manage subscription retries yourself — Stripe Smart Retries does this better",
      "Don't skip idempotency keys on Stripe API calls — crash-and-retry will double-charge without them",
    ],
    interviewTip: "Lead with PCI DSS: 'We never store card numbers — only Stripe tokens, so our PCI scope is minimal.' Then walk the state machine.",
    scalingNote: "At 10× scale: sharding by user_id prefix becomes necessary if Aurora write throughput is the bottleneck. Subscriptions table grows linearly with users but write rate is low (one write per billing event per month).",
    storageCost: "Minimal — billing events are low frequency. ~50GB even at Netflix scale.",
    entities: [
      {
        name: "subscriptions",
        store: "Aurora",
        storeColor: AURORA,
        dbRationale: "Aurora because subscription state transitions (ACTIVE → PAST_DUE → CANCELLED) must be atomic with the Stripe webhook update — a DynamoDB conditional write can't enforce the state machine invariants that billing correctness requires.",
        fields: [
          { name: "subscription_id",        type: "UUID",         pk: true, note: "DEFAULT gen_random_uuid()" },
          { name: "user_id",                type: "UUID",         fk: "users.user_id", note: "ON DELETE CASCADE" },
          { name: "plan_type",              type: "VARCHAR(20)",  note: "'basic'|'standard'|'premium'" },
          { name: "status",                 type: "VARCHAR(20)",  note: "'trialing'|'active'|'past_due'|'paused'|'cancelled'" },
          { name: "stripe_sub_id",          type: "VARCHAR(100)", unique: true, note: "Stripe subscription ID for webhook correlation" },
          { name: "current_period_start",   type: "TIMESTAMP",    note: "Billing cycle start" },
          { name: "current_period_end",     type: "TIMESTAMP",    note: "Billing cycle end — grace deadline if past_due" },
          { name: "cancelled_at",           type: "TIMESTAMP",    note: "NULL if active; set on cancellation" },
          { name: "created_at",             type: "TIMESTAMP",    note: "DEFAULT NOW()" },
        ],
        accessPatterns: [
          "check subscription status for streaming access gate → PK=subscription_id OR by user_id",
          "update status on Stripe webhook → by stripe_sub_id (unique index)",
          "list all past_due for grace period job → status index",
        ],
      },
      {
        name: "payment_methods",
        store: "Aurora",
        storeColor: AURORA,
        dbRationale: "Aurora because we need a partial unique index (only one is_default=true per user) — a constraint only expressible in a relational engine; the write frequency is low (one write per card add/remove) so Aurora throughput is not a bottleneck.",
        fields: [
          { name: "pm_id",          type: "UUID",         pk: true, note: "Internal ID" },
          { name: "user_id",        type: "UUID",         fk: "users.user_id", note: "ON DELETE CASCADE" },
          { name: "stripe_pm_id",   type: "VARCHAR(100)", note: "Stripe pm_xxx token — NEVER store card number" },
          { name: "card_last4",     type: "CHAR(4)",      note: "Display only — from Stripe response" },
          { name: "card_brand",     type: "VARCHAR(20)",  note: "'visa'|'mastercard'|'amex' — display only" },
          { name: "card_exp_month", type: "INT",           note: "For 'expires soon' warning" },
          { name: "card_exp_year",  type: "INT",           note: "For 'expires soon' warning" },
          { name: "is_default",     type: "BOOLEAN",      note: "One per user — enforced by partial unique index" },
          { name: "created_at",     type: "TIMESTAMP",    note: "DEFAULT NOW()" },
        ],
        accessPatterns: [
          "get default payment method for user → user_id + is_default=true",
          "list all payment methods for account page → user_id",
        ],
      },
    ],
    ddl: [
      {
        label: "subscriptions.sql",
        code: `CREATE TABLE subscriptions (
  subscription_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(user_id),
  plan_type             VARCHAR(20) NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'trialing',
  stripe_sub_id         VARCHAR(100) UNIQUE,
  current_period_start  TIMESTAMP,
  current_period_end    TIMESTAMP,
  cancelled_at          TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
);
-- State machine transitions:
-- TRIALING → ACTIVE (first payment)
-- ACTIVE → PAST_DUE (payment fails)
-- PAST_DUE → ACTIVE (payment recovered)
-- PAST_DUE → CANCELLED (grace period expires, ~7d)
-- ACTIVE → PAUSED (user-initiated)`,
      },
      {
        label: "payment_methods.sql",
        code: `CREATE TABLE payment_methods (
  pm_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  stripe_pm_id   VARCHAR(100) NOT NULL,
  card_last4     CHAR(4),
  card_brand     VARCHAR(20),
  card_exp_month INT,
  card_exp_year  INT,
  is_default     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT NOW()
);
-- Only one default per user
CREATE UNIQUE INDEX idx_pm_default
  ON payment_methods(user_id)
  WHERE is_default = TRUE;`,
      },
    ],
  },
  {
    id: "session-drm",
    label: "Session & DRM License",
    icon: "🔑",
    store: "Redis + DynamoDB",
    storeColor: REDIS_C,
    rationale: "Sessions split across two stores by access pattern: refresh tokens live in Redis for sub-millisecond lookup on every token refresh (happens every 15 min per user). DRM licenses and device sessions live in DynamoDB for durability — we need license records to survive Redis restarts and for audit/revocation purposes.",
    antiPatterns: [
      "Don't store refresh tokens only in Redis — Redis restarts would log out all users simultaneously",
      "Don't store DRM license keys in the application database — use CloudHSM, keys never leave hardware",
      "Don't use long DRM license TTLs — short TTLs bound the blast radius of a compromised device",
    ],
    interviewTip: "Explain WHY two stores: Redis for speed (token refresh critical path), DynamoDB for durability (license audit, device revocation). Single-store designs fail either speed or durability.",
    scalingNote: "At 10× scale: Redis cluster shards by user_id prefix. DynamoDB on-demand scales automatically. No schema changes needed.",
    storageCost: "Redis: ~7.5 GB for 15M active sessions × 500B. DynamoDB licenses: ~1GB for active licenses (mostly TTL'd).",
    entities: [
      {
        name: "refresh_tokens (Redis)",
        store: "Redis",
        storeColor: REDIS_C,
        dbRationale: "Redis because token validation happens on every API call (every 15 min per active session at scale) — sub-ms GET is mandatory; TTL is automatic and DEL gives instant revocation without a full-table scan.",
        fields: [
          { name: "Key: refresh:{uuid}",  type: "String",  pk: true, note: "Opaque UUID, NOT the user_id" },
          { name: "Value: user_id",        type: "String",  note: "Maps token → user for /auth/refresh" },
          { name: "TTL: 2,592,000s",       type: "TTL",     ttl: true, note: "30 days. DEL on logout = immediate invalidation" },
        ],
        accessPatterns: [
          "GET refresh:{token} → user_id (token refresh, every 15min per active session)",
          "DEL refresh:{token} (logout, single device)",
          "KEYS refresh:{user_id}:* + DEL all (logout all devices — use scan in prod)",
        ],
      },
      {
        name: "sessions",
        store: "DynamoDB",
        storeColor: DYNAMO,
        dbRationale: "DynamoDB because session records must survive Redis restarts (durability) while still delivering single-digit ms for list-sessions-by-user — the 'manage devices' page in account settings.",
        fields: [
          { name: "PK: user_id",           type: "String",    pk: true, note: "Enables 'list all sessions for user'" },
          { name: "SK: session_id",         type: "String",    pk: true, note: "UUID per session" },
          { name: "device_type",            type: "String",    note: "'ios'|'android'|'web'|'smart_tv'|'console'" },
          { name: "device_fingerprint",     type: "String",    note: "Hashed device signature — for password sharing detection" },
          { name: "ip_address",             type: "String",    note: "Last known IP — for geo-anomaly detection" },
          { name: "last_active",            type: "String",    note: "ISO timestamp — for 'manage sessions' UI" },
          { name: "created_at",             type: "String",    note: "ISO timestamp" },
          { name: "TTL",                    type: "Number",    ttl: true, note: "30 days from last_active — auto-expires stale sessions" },
        ],
        accessPatterns: [
          "list all sessions for user (account settings page) → PK=user_id",
          "delete specific session (remote logout) → PK=user_id, SK=session_id",
        ],
      },
      {
        name: "drm_licenses",
        store: "DynamoDB",
        storeColor: DYNAMO,
        dbRationale: "DynamoDB because license records need durable audit trail (revocation, GDPR) plus a built-in TTL to auto-expire 8 h/48 h licenses — no cron job required; access pattern is always by profile_id making PK design trivial.",
        fields: [
          { name: "PK: profile_id",         type: "String",    pk: true, note: "Partition by profile for fast license lookup" },
          { name: "SK: license_id",          type: "String",    pk: true, note: "UUID per license issuance" },
          { name: "content_id",             type: "String",    note: "Which title this license covers" },
          { name: "drm_system",             type: "String",    note: "'widevine'|'fairplay'|'playready'" },
          { name: "device_fingerprint",     type: "String",    note: "Ties license to specific device" },
          { name: "issued_at",              type: "String",    note: "ISO timestamp" },
          { name: "expires_at",             type: "String",    note: "8h for streaming, 48h for downloads" },
          { name: "TTL",                    type: "Number",    ttl: true, note: "DynamoDB TTL = expires_at epoch. Auto-deletes expired licenses." },
        ],
        accessPatterns: [
          "check active license for device (playback validation) → PK=profile_id, filter content_id+device",
          "revoke all licenses for user (GDPR / account compromise) → scan PK=profile_id, delete all",
        ],
      },
    ],
    ddl: [
      {
        label: "refresh_tokens (Redis patterns)",
        code: `-- Issue new refresh token
SET refresh:{uuid} {user_id} EX 2592000

-- Validate and consume refresh token
GET refresh:{uuid}       -- returns user_id or nil
DEL refresh:{uuid}       -- rotation: delete old token
SET refresh:{new_uuid} {user_id} EX 2592000  -- issue new

-- Logout (single device)
DEL refresh:{uuid}

-- Detect reuse: if GET returns nil after rotation,
-- the old token was already used → possible theft
-- → SCAN and DEL all refresh:{user_id}:* tokens`,
      },
    ],
  },
  {
    id: "notification-prefs",
    label: "Notification Preferences",
    icon: "🔔",
    store: "DynamoDB",
    storeColor: DYNAMO,
    rationale: "Notification preferences are read on every notification send (low throughput, simple key-value lookup by user_id). DynamoDB's flexible schema means adding a new notification type (e.g. 'live_sports_alert') = new attribute, no ALTER TABLE, no migration, no downtime.",
    antiPatterns: [
      "Don't store notification content here — only preferences (boolean flags)",
      "Don't put notification log in the same table as preferences — different access patterns, different TTL needs",
      "Don't use a relational schema here — adding a new notification type requires a column migration in SQL",
    ],
    interviewTip: "The key insight: DynamoDB's schemaless flexibility means new notification types ship without schema migrations. At Netflix's release cadence (200+ deploys/day), zero-migration schema changes are operationally valuable.",
    scalingNote: "At 10× scale: throughput scales automatically (on-demand). Consider write-through cache if pref reads become a hot path.",
    storageCost: "Negligible — ~300M users × ~500B per item = ~150GB. At DynamoDB storage pricing ($0.25/GB), ~$37/month.",
    entities: [
      {
        name: "notification_preferences",
        store: "DynamoDB",
        storeColor: DYNAMO,
        dbRationale: "DynamoDB because preferences are a simple key-value lookup by user_id and the schemaless model allows adding new notification types (e.g. live_sports_alert) as new attributes without ALTER TABLE or deployment downtime.",
        fields: [
          { name: "PK: user_id",            type: "String",   pk: true, note: "Direct lookup by user_id on notification send" },
          { name: "email_new_episodes",      type: "Boolean",  note: "Default: true" },
          { name: "email_billing",           type: "Boolean",  note: "Default: true — can't disable billing alerts" },
          { name: "push_recommendations",   type: "Boolean",  note: "Default: false" },
          { name: "push_continue_watching", type: "Boolean",  note: "Default: true" },
          { name: "sms_security_alerts",    type: "Boolean",  note: "Default: true" },
          { name: "marketing_emails",       type: "Boolean",  note: "Default: false — GDPR opt-in" },
          { name: "updated_at",             type: "String",   note: "ISO timestamp — for audit" },
        ],
        accessPatterns: [
          "get preferences for user → PK=user_id (on each notification send)",
          "update preference (user settings page) → PK=user_id, UpdateItem specific attribute",
        ],
      },
      {
        name: "notification_log",
        store: "DynamoDB",
        storeColor: DYNAMO,
        dbRationale: "DynamoDB because this is an append-only deduplication log; composite SK (type#timestamp) enables idempotency checks with a single range Query, and 90-day TTL auto-purges without a cron job.",
        fields: [
          { name: "PK: user_id",            type: "String",   pk: true, note: "Partition by recipient" },
          { name: "SK: {type}#{timestamp}", type: "String",   pk: true, note: "e.g. 'billing#1718000000' — enables deduplication" },
          { name: "channel",                type: "String",   note: "'email'|'push'|'sms'" },
          { name: "template_id",            type: "String",   note: "Which template was rendered" },
          { name: "status",                 type: "String",   note: "'sent'|'failed'|'bounced'" },
          { name: "sent_at",                type: "String",   note: "ISO timestamp" },
          { name: "TTL",                    type: "Number",   ttl: true, note: "90-day TTL — auto-purge old logs" },
        ],
        accessPatterns: [
          "deduplication check → query PK=user_id, SK begins_with 'billing#' in last 24h — prevents duplicate billing emails",
          "list recent notifications for user (UI) → PK=user_id, sort by SK DESC, limit 20",
        ],
      },
    ],
    ddl: [
      {
        label: "notification_log deduplication pattern",
        code: `-- Before sending: check if we already sent this type recently
-- SK format: {notification_type}#{unix_timestamp}

Query: PK=user_id, SK between 'billing#' and 'billing#\xff'
  FilterExpression: sent_at > :cutoff  -- last 24h

-- If result is empty → send and write:
PutItem: {
  user_id: "u-123",
  SK: "billing#1718000000",
  channel: "email",
  template_id: "payment_failed_v2",
  status: "sent",
  sent_at: "2024-06-10T12:00:00Z",
  TTL: 1726000000  -- 90 days from now
}`,
      },
    ],
  },
];

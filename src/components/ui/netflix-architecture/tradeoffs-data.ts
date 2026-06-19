export interface CAPRow {
  service: string;
  choice: "AP" | "CP" | "AP*";
  choiceLabel: string;
  color: string;
  reasoning: string;
  businessJustification: string;
}

export interface DBRow {
  store: string;
  color: string;
  usedFor: string;
  whyWins: string;
  consistency: string;
  latency: string;
  throughput: string;
  costProfile: string;
  antiPattern: string;
}

export interface PushPullRow {
  name: string;
  approach: "push" | "pull" | "hybrid";
  latency: string;
  staleness: string;
  cost: string;
  usedAt: string;
  tradeoff: string;
}

export const CAP_ROWS: CAPRow[] = [
  {
    service: "Auth / Billing",
    choice: "CP",
    choiceLabel: "CP",
    color: "#3b82f6",
    reasoning: "You cannot double-charge a user. You cannot allow a session with an invalid refresh token. These require strong consistency.",
    businessJustification: "Incorrect billing = legal liability and user churn. Invalid sessions = security vulnerability. No acceptable degradation here.",
  },
  {
    service: "Watch History / Progress",
    choice: "AP",
    choiceLabel: "AP",
    color: "#22c55e",
    reasoning: "Resume position being 3 seconds stale is completely acceptable. QUORUM writes ensure durability; LOCAL_ONE reads trade freshness for speed.",
    businessJustification: "Viewer resumes 3 seconds early or late. No material harm. Availability matters more — if Cassandra partitions, we still write the heartbeat.",
  },
  {
    service: "Recommendations",
    choice: "AP",
    choiceLabel: "AP",
    color: "#22c55e",
    reasoning: "Recommendation cache is pre-computed and 6 hours stale. On partition, serve stale rows from Redis. Never block the homepage for ML freshness.",
    businessJustification: "Showing yesterday's personalized rows is infinitely better than a loading spinner. Staleness ≤ 6h is the explicit design SLA.",
  },
  {
    service: "Streaming / CDN",
    choice: "AP",
    choiceLabel: "AP",
    color: "#22c55e",
    reasoning: "Video MUST stream even if the manifest metadata is stale. Availability is the north star. CloudFront serves video segments from cache regardless of API state.",
    businessJustification: "Every second of buffering loses viewers. Availability directly maps to subscriber retention. Stale manifest = viewer sees last-known encoding. Acceptable.",
  },
  {
    service: "Active Stream Count",
    choice: "AP*",
    choiceLabel: "AP (bounded)",
    color: "#f59e0b",
    reasoning: "Per-stream Redis keys with 60s TTL allow brief overcounting (e.g., a crashed stream slot frees in 60s). A momentary extra stream is acceptable; availability of the play button is not.",
    businessJustification: "If we require CP for stream counting, a Redis partition blocks all play attempts. Brief overcounting (Premium plan allows 4; a crash briefly shows 5) is not a billing error.",
  },
  {
    service: "Search Index",
    choice: "AP",
    choiceLabel: "AP",
    color: "#22c55e",
    reasoning: "OpenSearch is indexed asynchronously via Kafka. New content appears in search results within seconds of ContentPublished event — eventual consistency is the explicit design.",
    businessJustification: "A title not searchable for 5 seconds after publish causes no user harm. Strong consistency here would require synchronous indexing in the publish hot path.",
  },
  {
    service: "Content Catalog",
    choice: "AP",
    choiceLabel: "AP",
    color: "#22c55e",
    reasoning: "DynamoDB Global Tables replicates asynchronously (~1s lag). Stale catalog metadata is acceptable. Regional availability enforcement is done at CDN layer as a second check.",
    businessJustification: "Stale genre list or thumbnail = invisible to users. The legal requirement (regional licensing) has a second enforcement layer at CloudFront geo-restriction.",
  },
];

export const DB_ROWS: DBRow[] = [
  {
    store: "Aurora PostgreSQL",
    color: "#f59e0b",
    usedFor: "User accounts, subscriptions, billing history",
    whyWins: "ACID transactions, FK constraints, complex JOINs, state machine transitions that span multiple rows atomically",
    consistency: "Strong (ACID)",
    latency: "1–10ms",
    throughput: "~10K reads/sec, ~1K writes/sec per instance",
    costProfile: "Mid — instance + storage. Expensive per query vs DynamoDB at extreme scale.",
    antiPattern: "Don't use for high-throughput writes (500K/s) or unstructured documents",
  },
  {
    store: "DynamoDB",
    color: "#818cf8",
    usedFor: "Content catalog, sessions, DRM licenses, notification preferences",
    whyWins: "Sub-millisecond at any scale, zero ops overhead, Global Tables for multi-region, flexible schema for evolving attributes",
    consistency: "Eventual (default) or Strong (per-request, costs 2× RCU)",
    latency: "< 1ms (eventual), 1–3ms (strong)",
    throughput: "Unlimited (on-demand) — designed for millions of reads/sec",
    costProfile: "Pay-per-request (on-demand) scales cost with load. Cheaper than Aurora at massive read scale.",
    antiPattern: "Don't use for ad-hoc queries, full-text search, or data requiring JOINs",
  },
  {
    store: "Apache Cassandra",
    color: "#38bdf8",
    usedFor: "Watch history, play progress — time-series, high-write-throughput data",
    whyWins: "Linear write scale, natural time-series partitioning, native TTL, QUORUM writes for durability without ACID overhead",
    consistency: "Tunable (QUORUM writes + LOCAL_ONE reads is the Netflix pattern)",
    latency: "1–5ms writes, < 1ms reads (LOCAL_ONE)",
    throughput: "500K+ writes/sec across a 12-node cluster",
    costProfile: "High ops cost (self-managed cluster), low per-write cost at scale vs DynamoDB",
    antiPattern: "Don't use for ad-hoc analytics, strong consistency requirements, or small datasets",
  },
  {
    store: "Redis (ElastiCache)",
    color: "#f87171",
    usedFor: "Session tokens, recommendation cache, rate limiting counters, active stream counts",
    whyWins: "Sub-millisecond in-memory reads, atomic operations (INCR, SETNX), TTL native, pub/sub, sorted sets",
    consistency: "Eventual (async replication to replicas)",
    latency: "< 1ms",
    throughput: "> 1M ops/sec per node",
    costProfile: "Expensive per GB of RAM. Only use for data that MUST be sub-ms or needs atomic ops.",
    antiPattern: "Not durable — never use as primary store. Always have a source of truth in Aurora or DynamoDB.",
  },
  {
    store: "OpenSearch",
    color: "#22c55e",
    usedFor: "Full-text content search, autocomplete suggestions, faceted filtering",
    whyWins: "BM25 ranking, fuzzy matching, multi-field queries with field boosting, native faceted aggregations",
    consistency: "Eventual (async Kafka indexing)",
    latency: "10–50ms (full query)",
    throughput: "~10K queries/sec per cluster",
    costProfile: "Moderate — cluster of data nodes. Cheaper than doing LIKE '%query%' in PostgreSQL at scale.",
    antiPattern: "Don't use as a primary data store — it's an index, not a system of record. Data comes from DynamoDB via Kafka.",
  },
];

export const PUSH_PULL_ROWS: PushPullRow[] = [
  {
    name: "Recommendations",
    approach: "push",
    latency: "< 2ms (Redis read)",
    staleness: "Up to 6 hours",
    cost: "SageMaker batch every 6h",
    usedAt: "Homepage load",
    tradeoff: "200ms ML inference × 150M DAU homepage loads = unacceptable latency on critical path",
  },
  {
    name: "Watch Progress",
    approach: "hybrid",
    latency: "30s heartbeat lag",
    staleness: "30 seconds max",
    cost: "500K Cassandra writes/sec peak",
    usedAt: "Resume playback",
    tradeoff: "Push (heartbeat) for writes, pull (Cassandra read) for resume. Two different latency requirements.",
  },
  {
    name: "Search Index",
    approach: "push",
    latency: "< 2ms (Redis ZSET)",
    staleness: "Seconds (new content)",
    cost: "Kafka consumer + OpenSearch write per publish",
    usedAt: "Content search, autocomplete",
    tradeoff: "Pull-on-query would require full DynamoDB scan per search. Push-to-index makes reads cheap.",
  },
  {
    name: "CDN Cache",
    approach: "push",
    latency: "< 5ms (edge cache hit)",
    staleness: "Up to 1 year (immutable segments)",
    cost: "Cache warming on publish",
    usedAt: "Video segment delivery",
    tradeoff: "Pull-from-origin = 100ms+ per segment × 15M viewers = impossible. Push-to-edge before demand = < 5ms.",
  },
  {
    name: "Email Notifications",
    approach: "push",
    latency: "Seconds to minutes",
    staleness: "N/A — event-driven",
    cost: "SES per email, Kafka consumer always on",
    usedAt: "PaymentFailed, NewEpisode alerts",
    tradeoff: "Pull would require polling — expensive and inefficient. Event-driven push via Kafka is the right model for notifications.",
  },
];

export const MICROSERVICES_BENEFITS = [
  { title: "Independent deployments", desc: "Netflix deploys 200+ times/day. Each service team ships on their own schedule without coordinating with other teams. A bug in the Notification Service doesn't require a full platform deploy to fix." },
  { title: "Fault isolation", desc: "Recommendation Service can be down without Streaming Service failing. Circuit breakers ensure cascading failures don't propagate. With a monolith, any crash kills everything." },
  { title: "Technology heterogeneity", desc: "Recommendation Service uses Python + SageMaker. Auth Service uses Java. CDN logic uses Go. Each service uses the best tool for its job, not the lowest common denominator." },
  { title: "Team autonomy (Conway's Law)", desc: "Architecture mirrors org structure. The team that owns Auth also owns its database, deployment, and on-call. Faster decisions, clearer accountability." },
  { title: "Selective scaling", desc: "Scale the Streaming Service to 1,000 instances during peak hours without scaling the Payment Service that handles low-traffic billing events." },
];

export const MICROSERVICES_COSTS = [
  { title: "Distributed complexity", desc: "Network failures, partial failures, and CAP theorem all become your problem. Operations that were local function calls are now remote calls with timeouts, retries, and circuit breakers." },
  { title: "No distributed transactions", desc: "Can't use a single ACID transaction across services. Must use Saga pattern (choreography or orchestration) which is complex to debug and reason about." },
  { title: "Operational overhead", desc: "100+ services × metrics + logs + traces + alerts + on-call rotations. Netflix employs a large SRE team. Smaller orgs often can't sustain this overhead." },
  { title: "Latency overhead", desc: "Service-to-service network hops add latency. A play request fans out to 5 services — each hop is ~1ms. Monolith function calls are nanoseconds." },
  { title: "Testing complexity", desc: "Integration testing across 10+ services requires contract testing (Pact), service virtualization, or a full staging environment. Each adds engineering cost." },
];

export type NodeId =
  | "client" | "api-gateway" | "auth" | "user" | "catalog" | "streaming"
  | "drm" | "search" | "recommendation" | "watch-history" | "payment"
  | "notification" | "analytics" | "aurora" | "dynamodb" | "redis"
  | "kafka" | "cassandra" | "opensearch" | "kinesis" | "transcoder"
  | "s3" | "cdn";

export type NodeType = "client" | "gateway" | "service" | "datastore" | "pipeline";

export interface KVPair { label: string; value: string }
export interface NodeData {
  id: NodeId;
  label: string;
  sublabel: string;
  type: NodeType;
  overview: string;
  interviewAnswer: string;
  interviewTime: string;
  deepDives: { title: string; body: string; variant: "info" | "warn" | "danger" | "success" }[];
  techChips: string[];
  kvPairs: KVPair[];
  dontForget: string[];
  relatedNodes: NodeId[];
  layer: number; // 1=client, 2=gateway, 3=services1, 4=services2, 5=data, 6=cdnvideo
  col: number;   // column position within layer (1-indexed)
}

export const NODES: NodeData[] = [
  {
    id: "client",
    label: "Client Apps",
    sublabel: "iOS / Android / Web / Smart TV",
    type: "client",
    layer: 1, col: 1,
    overview: "Client apps drive ABR playback using HLS or MPEG-DASH, switching quality tiers every segment based on measured bandwidth. Every 30 seconds they emit a VideoWatched heartbeat to the Watch History service.",
    interviewAnswer: "Client fetches a master manifest from CloudFront, picks the highest bitrate segment that fits available bandwidth, and buffers 30 seconds ahead. If bandwidth drops, the ABR engine switches to a lower-quality segment at the next boundary — the viewer sees a quality dip but no buffer spin. The heartbeat fires every 30s so we can resume from the right position on any device.",
    interviewTime: "~40 seconds",
    deepDives: [
      { variant: "info", title: "ABR Algorithm (BOLA)", body: "Netflix uses BOLA (Buffer Occupancy-based Lyapunov Algorithm): it chooses bitrate based on buffer fullness, not just throughput. If buffer > 30s, it can safely step up quality even on a momentarily slow network, reducing unnecessary quality drops." },
      { variant: "warn", title: "Offline Downloads & DRM", body: "Downloaded files are encrypted with device-bound keys stored in the device's secure enclave. Content expires after 30 days OR 48 hours after first play — whichever comes first. This is enforced entirely client-side; the DRM license has a lease TTL baked in." },
      { variant: "info", title: "Cold Start < 2s", body: "Achieved via three techniques: (1) CDN pre-positions popular titles at edge nodes before demand; (2) manifest URL is returned in the same /playback/start response so the client can start fetching immediately; (3) resume position comes back in the same response so seek is instant." },
    ],
    techChips: ["HLS / MPEG-DASH", "ABR Engine", "Signed URLs", "DRM Player", "Local Cache"],
    kvPairs: [
      { label: "Segment size", value: "4–6 seconds" },
      { label: "Buffer ahead", value: "30 seconds" },
      { label: "Device cache", value: "500 MB" },
      { label: "Heartbeat interval", value: "30 seconds" },
    ],
    dontForget: [
      "State which protocol per platform: HLS for Apple, MPEG-DASH for Android/TV",
      "ABR switching happens at segment boundaries — you can't switch mid-segment",
      "Client never talks to S3 directly — always through CloudFront signed URL",
    ],
    relatedNodes: ["api-gateway", "cdn", "streaming"],
  },
  {
    id: "api-gateway",
    label: "API Gateway",
    sublabel: "Zuul2 / Kong · JWT · Rate Limit",
    type: "gateway",
    layer: 2, col: 1,
    overview: "Single entry point for all API traffic. Validates JWTs before any upstream service sees the request, enforces rate limits via Redis counters, and routes by path prefix to the correct microservice over gRPC or HTTP/2.",
    interviewAnswer: "The API Gateway does three things before touching any service: JWT signature validation (reject early, no DB hit), IP-based rate limiting with a Redis INCR sliding window, and path-based routing to the right service. By catching bad tokens at the edge we avoid wasting downstream compute on invalid requests.",
    interviewTime: "~35 seconds",
    deepDives: [
      { variant: "warn", title: "Redis Rate Limiting Implementation", body: "For each request: INCR rate:{user_id}:{minute_bucket}, set EXPIRE 60 on first write. If count > 1000 → return HTTP 429 with Retry-After: 60. The atomic INCR is safe under concurrent requests. Per-IP limit (100 req/s) is a separate key to catch unauthenticated abuse." },
      { variant: "danger", title: "Circuit Breaker Pattern", body: "Every route to a downstream service wraps a circuit breaker (Resilience4j). States: CLOSED (normal) → OPEN (5 failures in 10s, return fallback immediately) → HALF-OPEN (allow 1 probe; if it succeeds, close again). Fallback: serve stale Redis cache or a default empty response rather than hang." },
      { variant: "warn", title: "Avoiding SPOF", body: "The Gateway itself is horizontally scaled behind an Application Load Balancer. Route 53 health checks the ALB. If the entire us-east-1 ALB fails, Route 53 shifts DNS to eu-west-1 within ~60s. There is no single Gateway instance that can take the site down." },
    ],
    techChips: ["JWT Validation", "Rate Limiting", "SSL Termination", "Kong / Zuul2", "Circuit Breaker"],
    kvPairs: [
      { label: "IP rate limit", value: "100 req/s (sliding)" },
      { label: "User rate limit", value: "1,000 req/min" },
      { label: "JWT expiry", value: "15 min access token" },
      { label: "Routing", value: "Path prefix → gRPC/HTTP2" },
    ],
    dontForget: [
      "JWT validation at the gateway means no downstream service needs to call Auth on every request",
      "Rate limiting uses Redis INCR + EXPIRE — mention this is atomic and safe under concurrent load",
      "Circuit breaker protects the system if a downstream service is degraded, not just down",
    ],
    relatedNodes: ["auth", "streaming", "catalog", "search"],
  },
  {
    id: "auth",
    label: "Auth Service",
    sublabel: "JWT · Refresh Tokens · RS256",
    type: "service",
    layer: 3, col: 1,
    overview: "Issues short-lived RS256 JWTs (15 min) and long-lived opaque refresh tokens (30 days) stored in Redis. Logout is a Redis DEL — immediate invalidation without waiting for token expiry.",
    interviewAnswer: "Login returns a 15-minute access JWT signed with RS256 and an opaque refresh token stored in Redis with a 30-day TTL. Every API call passes the JWT — the Gateway validates it without touching Auth. When the JWT expires the client silently calls /auth/refresh; Auth reads the refresh token from Redis and issues a new JWT. Logout deletes the Redis key — that session is dead immediately.",
    interviewTime: "~50 seconds",
    deepDives: [
      { variant: "warn", title: "JWT Invalidation Problem", body: "JWTs are stateless — you can't revoke them before expiry. Netflix's solution: keep access tokens short (15 min). If an account is compromised, the attacker has at most 15 min of access after the refresh token is revoked. For high-stakes actions (password change, payment), force re-authentication regardless." },
      { variant: "danger", title: "Refresh Token Rotation & Theft Detection", body: "On each refresh, issue a new refresh token and delete the old one. If the same old token arrives twice (reuse), it means the original was stolen and used. On reuse detection: delete ALL refresh tokens for this user — every session is logged out simultaneously." },
      { variant: "info", title: "bcrypt Cost Factor 12", body: "bcrypt cost 12 means ~300ms per login on a modern CPU. This is intentional: it makes brute-force attacks expensive. 300ms is acceptable for login (happens once per session) but would be catastrophic if applied per-request — which is why we issue JWTs instead." },
    ],
    techChips: ["RS256 JWT", "bcrypt cost-12", "Redis", "Aurora PG", "AWS Cognito"],
    kvPairs: [
      { label: "Access token TTL", value: "15 minutes" },
      { label: "Refresh token TTL", value: "30 days" },
      { label: "bcrypt rounds", value: "12 (~300ms)" },
      { label: "Token storage", value: "Redis SET refresh:{token}" },
    ],
    dontForget: [
      "Short JWT expiry is the solution to stateless token revocation — explicitly mention this trade-off",
      "bcrypt is for password hashing at login, not for every request — JWT handles per-request auth",
      "Refresh token rotation detects theft — if a revoked token is reused, kill all sessions",
    ],
    relatedNodes: ["api-gateway", "aurora", "redis"],
  },
  {
    id: "user",
    label: "User Service",
    sublabel: "Profiles · GDPR · Aurora PG",
    type: "service",
    layer: 3, col: 2,
    overview: "Manages account lifecycle and up to 5 profiles per account. User owns billing/email; Profile owns watch history and recommendations. GDPR deletion is handled via an async Kafka cascade.",
    interviewAnswer: "The critical distinction is User vs Profile. One Netflix account can have 5 profiles. User stores email, billing, plan type — all the stuff that needs strong consistency in Aurora. Profile stores preferences, history, recommendations — things that are profile-scoped. When a user deletes their account, we emit a UserDeletionRequested Kafka event and every service purges its own data asynchronously within a 30-day GDPR SLA.",
    interviewTime: "~45 seconds",
    deepDives: [
      { variant: "info", title: "User vs Profile — Common Interview Stumble", body: "Many candidates conflate User and Profile. Be explicit: User = billing entity (1 per subscription). Profile = viewing persona (up to 5 per user). Recommendations, watch history, and parental controls are all Profile-scoped, not User-scoped. This is why a kids' profile has different content than an adult profile on the same account." },
      { variant: "warn", title: "GDPR Right to Erasure (Kafka Cascade)", body: "Emit UserDeletionRequested → each service (Watch History, Analytics, DRM, Notification) consumes the event and purges its own records. We don't do a synchronous fan-out from User Service because we don't own the other services' databases. Each team owns their deletion. 30-day SLA gives async consumers time to process." },
      { variant: "info", title: "Parental Controls", body: "is_kids boolean on Profile + max_rating field. At query time, Catalog Service filters content by max_rating for kids profiles. The PIN for switching off a kids profile is stored hashed in the Profile row — enforced client-side with server validation." },
    ],
    techChips: ["Aurora PG", "gRPC", "Kafka producer", "Profile settings"],
    kvPairs: [
      { label: "Profiles per account", value: "Up to 5" },
      { label: "Storage", value: "Aurora PostgreSQL" },
      { label: "GDPR deletion", value: "Async Kafka, 30-day SLA" },
      { label: "Consistency", value: "Strong (ACID)" },
    ],
    dontForget: [
      "Always distinguish User (billing) from Profile (viewing) — interviewers test this",
      "GDPR deletion must be async — you don't own other services' data stores",
      "Parental controls are Profile-level, not User-level",
    ],
    relatedNodes: ["aurora", "kafka", "auth"],
  },
  {
    id: "catalog",
    label: "Catalog Service",
    sublabel: "Content Metadata · DynamoDB · Redis",
    type: "service",
    layer: 3, col: 3,
    overview: "Serves content metadata (titles, genres, cast, availability by region). Read-heavy: 50,000 RPS at peak. DynamoDB handles the throughput; Redis cache-aside with 1-hour TTL keeps p99 latency under 2ms.",
    interviewAnswer: "Catalog is pure read throughput. Access patterns are known: get-by-ID, list-by-genre (GSI on genre field), get-episodes-for-a-series. DynamoDB is the right fit because we define access patterns upfront and need sub-millisecond reads at 50K RPS. Redis sits in front with a 1-hour TTL — cache hit rate above 95% because catalog data changes infrequently. On content update, we emit a Kafka event and consumers invalidate the Redis key.",
    interviewTime: "~45 seconds",
    deepDives: [
      { variant: "info", title: "DynamoDB Access Patterns (Define Upfront)", body: "DynamoDB requires you to know your access patterns before table design. We have three: (1) get content by ID → PK=content_id, SK=METADATA. (2) list all content in a genre → GSI: PK=genre, SK=release_year. (3) get all episodes in a series → PK=series_id, SK begins_with 'S'. No ad-hoc queries — OpenSearch handles those." },
      { variant: "warn", title: "Regional Availability Filtering", body: "Each content item has an available_regions[] array. Catalog Service filters this at query time based on the user's country (from JWT). At the CDN level, CloudFront geographic restrictions provide a second enforcement layer. Two-layer enforcement: if one fails, the other catches it." },
      { variant: "info", title: "Cache Invalidation Strategy", body: "Write-through on content update: update DynamoDB then immediately DEL content:{id} in Redis. The next read re-populates the cache from DynamoDB. For new content published, a ContentPublished Kafka event triggers a consumer that DELs the relevant Redis keys (genre lists, trending lists). Never use TTL alone for catalog invalidation — stale content availability has legal implications." },
    ],
    techChips: ["DynamoDB Global Tables", "ElastiCache Redis", "Cache-aside", "GSI"],
    kvPairs: [
      { label: "Items", value: "~1.7M (titles + episodes)" },
      { label: "Cache TTL", value: "1 hour" },
      { label: "Read throughput", value: "50,000 RPS peak" },
      { label: "Cache hit rate", value: "> 95%" },
    ],
    dontForget: [
      "DynamoDB requires access patterns defined upfront — state this explicitly",
      "Regional availability must be enforced at both the service layer AND the CDN",
      "Cache invalidation for catalog is event-driven on change, not just TTL-based",
    ],
    relatedNodes: ["dynamodb", "redis", "api-gateway", "search"],
  },
  {
    id: "streaming",
    label: "Streaming Service",
    sublabel: "Playback · Concurrency · Signed URLs",
    type: "service",
    layer: 3, col: 4,
    overview: "Orchestrates the entire play flow: validates auth, checks concurrency limits, requests a DRM license, generates a CloudFront signed manifest URL, and returns the resume position — all in a single response under 200ms.",
    interviewAnswer: "Play hits the Streaming Service which does 5 things in order: validate the JWT, check catalog availability, Redis INCR active_streams to enforce plan concurrency limits, call DRM Service for a license token, and generate a CloudFront signed URL with a 6-hour TTL. All of this returns in one response: manifest URL, DRM token, and resume position from Cassandra. Client has everything it needs to start buffering immediately.",
    interviewTime: "~55 seconds",
    deepDives: [
      { variant: "danger", title: "Concurrency Counter Edge Case (App Crash)", body: "If the app crashes, the DECR on the Redis counter never fires. Solution: per-stream key 'active_stream:{user_id}:{stream_id}' with a 60-second TTL that's refreshed by the heartbeat. If the heartbeat stops (crash/network drop), the key expires after 60s and the slot frees automatically. Much safer than a shared counter with INCR/DECR." },
      { variant: "info", title: "Signed URL Security Model", body: "CloudFront Signed URL = policy JSON (path, expiry, IP restriction) + RSA signature using a CloudFront key pair. The CDN edge validates the signature cryptographically — no origin hit needed. If a URL leaks, it expires in 6 hours. If an IP restriction is set, it only works from the originating IP." },
      { variant: "info", title: "Resume Position in Same Request", body: "Cassandra read for watch_progress (profile_id, content_id) happens in the same /playback/start handler. This is why start-to-first-frame can be < 2s: the client has the manifest URL AND resume position in one round trip, so it can seek and start buffering without a second request." },
    ],
    techChips: ["CloudFront Signed URLs", "Redis concurrency", "gRPC fan-out", "DRM token"],
    kvPairs: [
      { label: "Signed URL TTL", value: "6 hours" },
      { label: "Heartbeat interval", value: "30 seconds" },
      { label: "Stream key TTL", value: "60 seconds (refreshed)" },
      { label: "Target latency", value: "< 200ms end-to-end" },
    ],
    dontForget: [
      "Streaming Service is the hub — it calls Auth, Catalog, DRM, Cassandra in one fan-out",
      "Per-stream Redis key with TTL is safer than shared INCR/DECR for concurrency",
      "Resume position is fetched in the same request — not a second round-trip",
    ],
    relatedNodes: ["drm", "cdn", "redis", "cassandra", "kafka"],
  },
  {
    id: "drm",
    label: "DRM Service",
    sublabel: "Widevine · FairPlay · PlayReady · CloudHSM",
    type: "service",
    layer: 3, col: 5,
    overview: "Issues per-session content decryption keys. Video is encrypted once using CENC (AES-128-CTR), and three DRM systems (Widevine, FairPlay, PlayReady) each wrap that key differently. The actual key material never leaves CloudHSM.",
    interviewAnswer: "One encrypted video works with all three DRM systems — that's the beauty of CENC. We encrypt the video once with AES-128-CTR. Widevine wraps that key for Chrome/Android, FairPlay wraps it for Apple devices, PlayReady wraps it for Windows/Xbox. When a client plays, the DRM Service issues a short-lived license containing the wrapped key. CloudHSM stores the actual keys — they never appear in application memory or logs.",
    interviewTime: "~50 seconds",
    deepDives: [
      { variant: "info", title: "Three DRM Systems and Device Mapping", body: "Widevine (Google): Android, Chrome, most Smart TVs. FairPlay Streaming (Apple): iOS, macOS, Safari, Apple TV. PlayReady (Microsoft): Windows, Xbox. CENC means a single S3-stored video file works with all three — you only need three license servers, not three video variants." },
      { variant: "warn", title: "License Expiry Limits Blast Radius", body: "DRM licenses have a short TTL (e.g. 8 hours for streaming, 48 hours for downloads). If a device is compromised or a license key leaks, the window of exposure is bounded. The client must call the license server again after expiry — at that point, a revoked device gets rejected." },
      { variant: "info", title: "Forensic Watermarking", body: "A unique, imperceptible watermark is embedded per stream — tied to the subscriber's profile_id. If Netflix content appears on a piracy site, they can decode the watermark to identify the source account. This is implemented at the transcoding stage using NAGRA/Irdeto solutions, not at runtime." },
    ],
    techChips: ["CloudHSM", "AWS KMS", "CENC AES-128-CTR", "Widevine", "FairPlay", "PlayReady"],
    kvPairs: [
      { label: "DRM systems", value: "3 (Widevine / FairPlay / PlayReady)" },
      { label: "Key storage", value: "CloudHSM (never leaves hardware)" },
      { label: "Encryption", value: "AES-128-CTR (CENC)" },
      { label: "License TTL", value: "8h streaming / 48h download" },
    ],
    dontForget: [
      "CENC = one encrypted video, three DRM wrappers — you don't store three copies",
      "CloudHSM keys never appear in application memory or logs",
      "Forensic watermarking = per-stream, not per-title — traces individual subscribers",
    ],
    relatedNodes: ["streaming", "s3"],
  },
  {
    id: "search",
    label: "Search Service",
    sublabel: "OpenSearch · BM25 · Redis ZSET",
    type: "service",
    layer: 3, col: 6,
    overview: "Two-tier: Redis ZSET autocomplete (sub-millisecond prefix match) for keystrokes, OpenSearch BM25 full-text search with region filtering for the actual query. Results are re-ranked using a personalization boost from the Recommendation Service.",
    interviewAnswer: "Autocomplete is a Redis ZSET — on each successful search we ZINCRBY the query term. Prefix autocomplete uses ZRANGEBYLEX in O(log N). That's sub-millisecond. Full search hits OpenSearch with a bool query: multi_match against title, cast, description, plus a hard filter on available_regions for the user's country. The Recommendation Service provides a boost list that re-ranks results for personalization before we return the top 20.",
    interviewTime: "~50 seconds",
    deepDives: [
      { variant: "info", title: "Redis ZSET Autocomplete", body: "Store query terms as members of a sorted set with score = search frequency (ZINCRBY popular_searches 1 'stranger things'). For autocomplete: ZRANGEBYLEX popular_searches '[str' '[str\\xff' returns all terms starting with 'str' in O(log N + M). Much faster than OpenSearch suggest on every keystroke — sub-millisecond vs 10–20ms." },
      { variant: "info", title: "Personalization Re-ranking", body: "After OpenSearch returns BM25-ranked results, we call Recommendation Service with the user's profile_id and the result set. It returns a boost multiplier per content_id based on the user's taste vector. We re-rank locally and return the top 20. This adds ~5ms but dramatically improves result relevance." },
      { variant: "warn", title: "Eventual Consistency is Fine Here", body: "New content becomes searchable within seconds of ContentPublished Kafka event → Search Indexer Lambda → OpenSearch. There's no strong consistency requirement — if a new title takes 5 seconds to appear in search results, no user is harmed. This lets us use an async indexer without a synchronous write path." },
    ],
    techChips: ["OpenSearch (BM25)", "Redis ZSET", "Kafka consumer", "Fuzzy matching", "Faceted filters"],
    kvPairs: [
      { label: "Autocomplete", value: "Redis ZSET, O(log N)" },
      { label: "Full-text", value: "OpenSearch BM25" },
      { label: "Index update lag", value: "Seconds (async)" },
      { label: "Results returned", value: "Top 20 + facets" },
    ],
    dontForget: [
      "Debounce keystrokes 150ms before firing autocomplete — mention this explicitly",
      "Region filter is a hard filter (bool.filter), not a soft score — unlicensed content must never appear",
      "Two tiers: Redis for autocomplete, OpenSearch for full query — separate tools for separate latency targets",
    ],
    relatedNodes: ["opensearch", "redis", "recommendation", "kafka"],
  },
  {
    id: "recommendation",
    label: "Recommendation Service",
    sublabel: "SageMaker · Collaborative Filtering · Redis",
    type: "service",
    layer: 3, col: 7,
    overview: "80% of Netflix watches come from recommendations. Pre-computed offline (SageMaker, every 6 hours) and cached per profile in Redis. VideoWatched Kafka events trigger async refresh for that profile.",
    interviewAnswer: "Recommendations are pre-computed, not real-time. SageMaker runs collaborative filtering and two-tower neural nets on a batch of all watch events every 6 hours. Results land in Redis keyed by profile_id. Homepage reads Redis — under 2ms. If we computed recommendations on the request path, ML inference would add 200ms to every homepage load. The trade-off: recommendations can be up to 6 hours stale, which is completely acceptable.",
    interviewTime: "~50 seconds",
    deepDives: [
      { variant: "warn", title: "Cold Start Problem — 3 Fallbacks", body: "New user has no watch history. Fallbacks in order: (1) Onboarding quiz: ask 3 genre preferences → seed with those genre's top titles. (2) Country popularity: top 20 titles in user's country right now. (3) Demographic defaults: age-range and gender-based trends from aggregate data. Never show an empty homepage." },
      { variant: "info", title: "Why Pre-compute Over Real-time", body: "200ms ML inference × 150M DAU homepage loads = unacceptable latency on the critical path. Pre-compute shifts cost to background batch jobs. Redis read is < 2ms. The cost is staleness: if you watch a thriller, your homepage won't update for up to 6 hours. For recommendations, that's fine. For watch progress, it's not — which is why watch progress uses Cassandra with real-time writes." },
      { variant: "info", title: "Thumbnail Personalization", body: "Same title, different artwork per profile. Netflix A/B-tests dozens of thumbnail variants and serves the variant most likely to get a click from that profile's taste vector. The thumbnail URL returned by Catalog includes a personalization parameter. Generated at publish time, not at runtime — no real-time image generation." },
    ],
    techChips: ["Amazon SageMaker", "Collaborative Filtering", "Two-Tower NN", "Redis", "Kafka consumer"],
    kvPairs: [
      { label: "Cache TTL", value: "6 hours" },
      { label: "Refresh trigger", value: "Kafka VideoWatched event" },
      { label: "Read latency", value: "< 2ms (Redis)" },
      { label: "% watches from reco", value: "~80%" },
    ],
    dontForget: [
      "Always state why pre-compute wins over real-time: 200ms ML × 150M DAU is unacceptable",
      "Cold start is a real problem — mention the 3-fallback strategy",
      "Thumbnail personalization is a differentiator worth mentioning at senior level",
    ],
    relatedNodes: ["redis", "kafka", "sagemaker" as NodeId, "dynamodb"],
  },
  {
    id: "watch-history",
    label: "Watch History Service",
    sublabel: "Cassandra · 500K writes/sec · 90-day TTL",
    type: "service",
    layer: 4, col: 1,
    overview: "Two Cassandra tables: watch_progress (upsert on heartbeat, used for resume) and watch_history (append-only log, drives recommendations). 500K writes/second at peak. AP consistency: a 3-second stale resume position is acceptable.",
    interviewAnswer: "Two tables, two purposes. watch_progress stores the last known position per profile+content — upserted on every 30s heartbeat, used for resume. watch_history is an append-only log of everything ever watched, partitioned by (profile_id, year) to bound partition size. Cassandra is the right fit because we need 500K writes/second, time-series data naturally partitions by user, and eventual consistency is fine — if your resume point is 3 seconds stale, that's acceptable.",
    interviewTime: "~55 seconds",
    deepDives: [
      { variant: "warn", title: "Partition Key Design — Preventing Hot Partitions", body: "Naive partition key = profile_id. Problem: a power user who watches 10 shows/day for years creates a massive partition. Solution: bucket by year — PK = (profile_id, year). Each year's data is a separate partition. Range queries within a year use watched_at clustering column. Cross-year queries are rare and can be merged in application." },
      { variant: "info", title: "Consistency Levels", body: "Write with QUORUM (2 of 3 replicas must ack) for safety. Read with LOCAL_ONE (fastest available local replica). Rationale: write safety matters more than write speed for progress — losing a heartbeat causes a bad resume position. Read freshness matters less — a 1-second stale position is fine." },
      { variant: "success", title: "Native TTL Keeps Dataset Bounded", body: "90-day TTL on watch_history rows means old data deletes itself — no separate cleanup job, no manual purge. At 500K events/day per region × 90 days × 200 bytes/event, the dataset stays bounded at ~16TB per region. Without TTL, storage would grow unboundedly and partition scans would degrade." },
    ],
    techChips: ["Apache Cassandra", "Kafka consumer", "Eventual consistency (AP)", "QUORUM writes"],
    kvPairs: [
      { label: "Write throughput", value: "500K writes/sec peak" },
      { label: "Partition key", value: "(profile_id, year)" },
      { label: "TTL", value: "90 days" },
      { label: "Storage per region", value: "~16 TB" },
    ],
    dontForget: [
      "Two tables, two purposes — don't merge them: different access patterns, different consistency needs",
      "Partition key must include year bucket to prevent unbounded partition growth",
      "AP choice: a 3-second stale resume position is acceptable — state the business justification",
    ],
    relatedNodes: ["cassandra", "kafka", "streaming"],
  },
  {
    id: "payment",
    label: "Payment Service",
    sublabel: "Stripe · Saga · Aurora · Idempotency",
    type: "service",
    layer: 4, col: 2,
    overview: "Stripe for payment processing; Aurora for subscription state. Subscription follows a state machine: TRIALING → ACTIVE → PAST_DUE (7-day grace) → CANCELLED. Webhook events drive state transitions. Idempotency keys prevent double-charges.",
    interviewAnswer: "Stripe handles the actual card charging — we never store card numbers, only Stripe tokens. PCI DSS compliance falls on Stripe, not us. On payment failure, Stripe sends a webhook to our /webhooks/stripe endpoint. We validate the Stripe-Signature header, emit a PaymentFailed Kafka event, move the subscription to PAST_DUE, and give the user 7 days before cancelling. Idempotency keys on all Stripe API calls prevent duplicate charges if our service retries.",
    interviewTime: "~55 seconds",
    deepDives: [
      { variant: "danger", title: "PCI DSS Compliance", body: "We never store raw card numbers — only Stripe payment method tokens. All communication with Stripe is over TLS 1.3. The Stripe SDK handles card collection in an iframe so raw card numbers never touch our servers. This scopes us to PCI DSS SAQ A (minimal requirements) instead of Level 1 (full audit)." },
      { variant: "warn", title: "Stripe Webhook Signature Validation", body: "Stripe signs each webhook with a secret using HMAC-SHA256. Our handler computes the expected signature and compares to the Stripe-Signature header before processing. Without this, any attacker can POST fake PaymentSucceeded events to our endpoint and activate accounts for free." },
      { variant: "info", title: "Idempotency Keys", body: "Every Stripe API call includes an Idempotency-Key header (UUID stored in Redis 24h TTL). If our service crashes after calling Stripe but before writing to Aurora, the retry sends the same idempotency key — Stripe returns the original result, not a second charge. Same pattern applies to our own state machine transitions using upsert semantics in Aurora." },
    ],
    techChips: ["Stripe API", "Aurora PG", "Kafka producer", "Saga choreography", "Idempotency keys"],
    kvPairs: [
      { label: "Grace period", value: "7 days PAST_DUE" },
      { label: "Card storage", value: "Stripe tokens only" },
      { label: "Consistency", value: "ACID (Aurora)" },
      { label: "Idempotency TTL", value: "24 hours (Redis)" },
    ],
    dontForget: [
      "Never store raw card data — only Stripe tokens — this is a PCI DSS requirement",
      "Validate Stripe webhook signatures — without this anyone can fake payment events",
      "Idempotency keys prevent double charges on retry — critical for payment APIs",
    ],
    relatedNodes: ["aurora", "kafka", "user"],
  },
  {
    id: "notification",
    label: "Notification Service",
    sublabel: "SES · FCM/APNs · Kafka · DLQ",
    type: "service",
    layer: 4, col: 3,
    overview: "Stateless Kafka consumer that routes events to email (SES), push (FCM/APNs), or SMS (Twilio) based on event type and user preferences stored in DynamoDB. Retries 3× then moves to a Dead Letter Queue.",
    interviewAnswer: "Notification is event-driven and stateless — it just consumes Kafka events, checks DynamoDB for the user's notification preferences, renders a template, and routes to the right channel. SES for email, FCM for Android push, APNs for iOS push, Twilio for SMS. If all 3 delivery attempts fail, the message goes to a DLQ and a Lambda triggers a PagerDuty alert for manual review. Since Kafka retains messages for 7 days, if the Notification Service goes down we don't lose events — they'll be processed when it recovers.",
    interviewTime: "~50 seconds",
    deepDives: [
      { variant: "info", title: "FCM/APNs Token Expiry Handling", body: "Push tokens expire or become invalid when users uninstall the app. On a delivery attempt, FCM/APNs returns a token-expired or invalid-registration error. Our handler deletes the stale token from DynamoDB immediately. Otherwise we'd keep retrying dead tokens forever, wasting API calls and hitting rate limits." },
      { variant: "success", title: "Non-Critical Service — Kafka Durability", body: "If Notification Service goes down for 12 hours, no events are lost — Kafka retains them for 7 days. When the service recovers, it picks up from its last committed offset. Users get slightly delayed notifications. Compare this to a synchronous notification call from Payment Service — that would cascade the failure. Event-driven decoupling is the key safety property here." },
      { variant: "warn", title: "Retry 3× then DLQ Pattern", body: "SQS maxReceiveCount=3: if a message fails processing 3 times, it moves to the Dead Letter Queue. A Lambda subscribed to the DLQ fires immediately and pages the on-call team. The message stays in DLQ for 14 days for manual inspection and reprocessing. Never let failed messages disappear silently." },
    ],
    techChips: ["AWS SES", "FCM", "APNs", "Twilio", "Kafka consumer", "Handlebars templates"],
    kvPairs: [
      { label: "Channels", value: "Email / Push / SMS" },
      { label: "Retry policy", value: "3× then DLQ" },
      { label: "Kafka retention", value: "7 days (no data loss)" },
      { label: "Preferences storage", value: "DynamoDB" },
    ],
    dontForget: [
      "Notification is non-critical — Kafka's durability means downtime = delay, not data loss",
      "Push token expiry must be handled: delete stale tokens on FCM/APNs error response",
      "DLQ + Lambda alert is the standard pattern for failed message handling",
    ],
    relatedNodes: ["kafka", "dynamodb"],
  },
  {
    id: "analytics",
    label: "Analytics Service",
    sublabel: "Kinesis · S3 Parquet · Redshift",
    type: "service",
    layer: 4, col: 4,
    overview: "Client events (play starts, pauses, buffer events, quality switches) flow into Kinesis Data Streams at 500K events/second. Kinesis Firehose batches to S3 Parquet. AWS Glue ETLs into Redshift for BI. Real-time aggregations (rebuffering ratio) run on Kinesis Analytics.",
    interviewAnswer: "Client events go to Kinesis — not Kafka — because it's the right tool for high-volume, client-side event ingestion without managing consumer groups. Firehose automatically batches and compresses to S3 Parquet partitioned by date and event type. Glue maintains the schema catalog and ETLs into Redshift for BI queries. For real-time metrics like rebuffering ratio, Kinesis Analytics runs a sliding-window SQL query over the stream with ~60 second latency to dashboards.",
    interviewTime: "~50 seconds",
    deepDives: [
      { variant: "info", title: "Key Quality-of-Experience Metrics", body: "Rebuffering ratio (target < 0.1%): buffering events ÷ total play time. Video start time (target < 2s): time from play click to first frame. Bitrate distribution: % of streams at each quality tier. These are the metrics that directly correlate with subscriber churn — Netflix monitors them in real-time on a per-edge-node basis." },
      { variant: "info", title: "A/B Testing Infrastructure", body: "Each user is bucketed into experiment groups stored in DynamoDB. When Analytics ingests a play event, it joins the experiment assignment. Redshift aggregates CTR, play rate, and completion rate per experiment variant. Results feed SageMaker for model retraining. All of this is data-warehouse-layer analytics, not real-time." },
      { variant: "warn", title: "GDPR on Analytics Data", body: "S3 log files are immutable — you can't delete a specific user's rows from a Parquet file. GDPR solution: tombstone hashing. When a user deletes their account, we store their user_id → hash mapping. Downstream analytics jobs replace the user_id with the tombstone hash in all future reads. Old data references an anonymous hash, not the real user." },
    ],
    techChips: ["Kinesis Data Streams", "Kinesis Firehose", "S3 Parquet", "AWS Glue", "Amazon Redshift"],
    kvPairs: [
      { label: "Ingest rate", value: "500K events/sec peak" },
      { label: "Storage format", value: "S3 Parquet (partitioned)" },
      { label: "Dashboard latency", value: "~60 seconds" },
      { label: "Warehouse", value: "Amazon Redshift" },
    ],
    dontForget: [
      "Kinesis for client events, Kafka for service events — different tools for different producers",
      "Rebuffering ratio < 0.1% is the north-star QoE metric — mention it by name",
      "GDPR on immutable S3 data = tombstone hashing, not deletion",
    ],
    relatedNodes: ["kinesis", "s3", "kafka"],
  },
  {
    id: "aurora",
    label: "Aurora PostgreSQL",
    sublabel: "Users · Billing · ACID · Multi-AZ",
    type: "datastore",
    layer: 5, col: 1,
    overview: "Relational store for user accounts, profiles, and subscriptions. Multi-AZ with 2 read replicas. Automatic failover to replica in < 30 seconds. PgBouncer connection pooling in front to prevent connection exhaustion under load.",
    interviewAnswer: "Aurora PostgreSQL is chosen where we need ACID guarantees and relational integrity: user accounts with cascading profile deletes, subscription state machines where incorrect transitions cost money, and billing history where no row can be lost. Multi-AZ deployment means a standby replica is always in sync — automatic failover in < 30 seconds. PgBouncer transaction-mode pooling limits the connection count each service instance can hold, preventing the 'thundering herd' problem on high concurrency.",
    interviewTime: "~45 seconds",
    deepDives: [
      { variant: "info", title: "Why Not DynamoDB for Users?", body: "User accounts need: (1) referential integrity (deleting a user must cascade to profiles — enforced by FK in PG, manual in DynamoDB). (2) ACID transactions (subscription state machine: charging card + updating status must be atomic). (3) Complex JOIN queries (billing history + subscription + payment methods in one query for a user dashboard). DynamoDB can do none of these well." },
      { variant: "warn", title: "Connection Pooling with PgBouncer", body: "Aurora has a max_connections limit (~5,000 for large instances). With 100 ECS tasks × 100 connections each = 10,000 — would exhaust the DB. PgBouncer in transaction mode: each task holds 20 connections to PgBouncer, which maps them to a shared pool of 200 to Aurora. 100 tasks → 200 actual DB connections. Essential at scale." },
      { variant: "success", title: "Read Replicas for Analytics", body: "Two read replicas in the same region handle all read traffic (profile lookups, subscription checks). A cross-region replica in eu-west-1 handles analytics queries from the EU team without touching the primary. Aurora's storage-level replication keeps replicas within seconds of the primary." },
    ],
    techChips: ["Aurora PostgreSQL", "Multi-AZ", "PgBouncer", "Read replicas", "ACID transactions"],
    kvPairs: [
      { label: "Failover RTO", value: "< 30 seconds" },
      { label: "Read replicas", value: "2 per region" },
      { label: "Rows", value: "~1.2B (users + profiles)" },
      { label: "Storage", value: "~500 GB" },
    ],
    dontForget: [
      "ACID + referential integrity = why Aurora over DynamoDB for users/billing",
      "PgBouncer is essential — connection exhaustion is a real failure mode at scale",
      "Cross-region replica for analytics keeps write traffic off the primary",
    ],
    relatedNodes: ["auth", "user", "payment"],
  },
  {
    id: "dynamodb",
    label: "DynamoDB",
    sublabel: "Catalog · Sessions · DRM · Global Tables",
    type: "datastore",
    layer: 5, col: 2,
    overview: "Content catalog, DRM licenses, and active sessions. Global Tables provides multi-region active-active replication with ~1-second lag. Ideal when access patterns are known, throughput requirements are extreme, and strong consistency is not required.",
    interviewAnswer: "DynamoDB is chosen where we have known, high-throughput key-value access patterns: catalog lookup by content_id (50K RPS), DRM license by license_id, session lookup by session_id. Global Tables means the us-east-1 and eu-west-1 replicas stay in sync within ~1 second — essential for catalog which must be available globally. We explicitly don't use DynamoDB for anything needing ad-hoc queries — that goes to OpenSearch or Aurora.",
    interviewTime: "~45 seconds",
    deepDives: [
      { variant: "warn", title: "Access Patterns Must Be Defined Upfront", body: "DynamoDB's biggest footgun: trying to query it like a relational database. Every access pattern must be solved at design time with the right PK/SK or GSI. We define exactly three for catalog: get-by-id, list-by-genre (GSI), episodes-by-series. Any new access pattern requires a new GSI or a table scan (expensive). Design the table schema from access patterns, not from entity attributes." },
      { variant: "info", title: "Global Tables Replication Model", body: "DynamoDB Global Tables replicates writes across regions asynchronously (~1s lag, not a hard SLA). On conflicting writes (two regions write different values to same key simultaneously), last-writer-wins semantics apply based on wall-clock timestamp. Acceptable for catalog (eventual consistency is fine); not acceptable for billing (use Aurora for that)." },
      { variant: "info", title: "On-Demand vs Provisioned Capacity", body: "We use on-demand (pay-per-request) for catalog because traffic spikes sharply at new content release. With provisioned, we'd either over-provision (waste money) or under-provision (throttled). On-demand costs more per read/write but removes the capacity planning burden. For predictable workloads (DRM licenses), provisioned with auto-scaling is more cost-effective." },
    ],
    techChips: ["DynamoDB Global Tables", "GSI", "On-demand capacity", "TTL"],
    kvPairs: [
      { label: "Items", value: "~1.7M catalog + sessions + licenses" },
      { label: "Replication lag", value: "~1 second (Global Tables)" },
      { label: "Read throughput", value: "50,000 RPS (catalog)" },
      { label: "Conflict resolution", value: "Last-writer-wins" },
    ],
    dontForget: [
      "Access patterns must be defined upfront — DynamoDB is not a relational database",
      "Global Tables = eventual consistency (~1s lag) — not suitable for billing",
      "GSI has its own throughput provisioning — don't forget to size it",
    ],
    relatedNodes: ["catalog", "streaming", "drm", "notification"],
  },
  {
    id: "redis",
    label: "Redis (ElastiCache)",
    sublabel: "Sessions · Reco Cache · Rate Limits · 160GB",
    type: "datastore",
    layer: 5, col: 3,
    overview: "In-memory cache cluster (~160GB) holding session tokens, pre-computed recommendations, content metadata cache, active stream counters, and rate limiting counters. Sub-millisecond reads. Not durable — used only for data that can be recomputed from a source of truth.",
    interviewAnswer: "Redis is the acceleration layer — everything in Redis has a source of truth elsewhere. Session tokens: source is Aurora. Recommendations: source is SageMaker output in S3. Content metadata: source is DynamoDB. Active stream counters: source is inferred from heartbeats. If Redis goes down entirely, the circuit breaker in the gateway falls through to the source of truth with higher latency. Degraded but not dead.",
    interviewTime: "~45 seconds",
    deepDives: [
      { variant: "danger", title: "Redis is Not Durable by Default", body: "Redis persistence (RDB snapshots + AOF) can be enabled, but even with AOF=fsync-always you can lose up to 1 second of writes on crash. For session tokens this is acceptable — users re-login. For recommendations it's fine — recomputed in 6 hours. Never use Redis as the primary store for data you can't afford to lose (use Aurora or DynamoDB for that)." },
      { variant: "warn", title: "Eviction Policy Under Memory Pressure", body: "With maxmemory-policy=allkeys-lru, Redis evicts least-recently-used keys when memory is full. This means recommendation caches for users who haven't visited in days get evicted, causing a cache miss and a (slightly slower) DynamoDB fallback. The key design principle: never store data in Redis that you can't regenerate on a miss." },
      { variant: "info", title: "ElastiCache Global Datastore", body: "For multi-region, ElastiCache Global Datastore replicates a primary cluster to read-only replicas in other regions with < 1s latency. EU users read from the eu-west-1 replica for recommendation cache hits, without crossing the Atlantic. Writes still go to the us-east-1 primary and replicate asynchronously." },
    ],
    techChips: ["ElastiCache Redis", "LRU eviction", "TTL", "Pub/Sub", "Global Datastore"],
    kvPairs: [
      { label: "Cluster size", value: "~160 GB RAM" },
      { label: "Read latency", value: "< 1ms" },
      { label: "Eviction policy", value: "allkeys-lru" },
      { label: "Durability", value: "Not durable — recomputable only" },
    ],
    dontForget: [
      "Redis is not durable — always have a source of truth in Aurora or DynamoDB",
      "Describe the fallback: circuit breaker → source of truth on Redis miss",
      "Eviction policy matters — allkeys-lru is usually correct for cache workloads",
    ],
    relatedNodes: ["auth", "streaming", "catalog", "recommendation", "search"],
  },
  {
    id: "kafka",
    label: "Apache Kafka (MSK)",
    sublabel: "Domain Events · 500K msg/sec · Replay",
    type: "datastore",
    layer: 5, col: 4,
    overview: "Event backbone for all domain events. Producers write to topics; multiple consumer groups independently consume at their own pace. 30-day retention on watch events enables ML retraining from historical data.",
    interviewAnswer: "Kafka decouples producers from consumers. Streaming Service emits VideoWatched and doesn't know or care that Watch History, Recommendation Service, and Analytics all consume it independently. Each has its own consumer group, each at its own offset, each can fall behind and catch up without affecting the producer. 30-day retention on video.watched means we can replay historical events if the Recommendation model needs retraining from scratch.",
    interviewTime: "~50 seconds",
    deepDives: [
      { variant: "info", title: "Kafka Topics and Retention Policies", body: "video.watched (30d retention): ML training needs historical data. content.published (7d): CDN warmup, search indexing, catalog update all happen within minutes. payment.failed (30d): audit trail for billing disputes. user.registered (7d): downstream services initialize within hours. Retention is a business/compliance decision, not just an ops one." },
      { variant: "warn", title: "Kafka vs Kinesis — When to Use Which", body: "Kafka (MSK): service-to-service domain events where consumers need independent offsets, replay, and complex routing. Example: VideoWatched fans out to 4 services. Kinesis: high-volume, client-side event ingestion where you just need to buffer data to S3. Example: 500K play events/sec from client devices. Kinesis is simpler to operate; Kafka is more powerful." },
      { variant: "info", title: "Avro + Schema Registry", body: "All Kafka messages use Avro schema with a Schema Registry. Benefits: (1) schema evolution — producers can add optional fields without breaking consumers. (2) compact binary format — ~5× smaller than JSON. (3) schema enforcement — malformed messages are rejected at the producer. The Schema Registry is the contract between producer and consumer teams." },
    ],
    techChips: ["Amazon MSK", "Avro + Schema Registry", "Consumer groups", "Compacted topics"],
    kvPairs: [
      { label: "video.watched retention", value: "30 days" },
      { label: "content.published retention", value: "7 days" },
      { label: "Peak throughput", value: "500K messages/sec" },
      { label: "Key guarantee", value: "At-least-once delivery" },
    ],
    dontForget: [
      "Consumer groups = independent consumers, each at their own offset — this is Kafka's key feature",
      "Retention period is a business decision — mention the ML retraining use case for 30-day retention",
      "Kafka vs Kinesis: Kafka for service events, Kinesis for client event ingest",
    ],
    relatedNodes: ["streaming", "watch-history", "recommendation", "analytics", "notification", "search"],
  },
  {
    id: "cassandra",
    label: "Apache Cassandra",
    sublabel: "Watch History · 500K writes/sec · TTL",
    type: "datastore",
    layer: 5, col: 5,
    overview: "Time-series write store for watch history and play progress. 12-node cluster across 3 AZs, replication factor 3. QUORUM writes, LOCAL_ONE reads. Native 90-day TTL on history rows keeps storage bounded at ~16TB per region.",
    interviewAnswer: "Cassandra handles our highest write throughput — 500K writes/second at peak when all concurrent viewers are sending 30-second heartbeats. It's the right fit: write throughput > read throughput, data naturally partitions by user, time-series queries cluster within a partition, and eventual consistency is acceptable. Native TTL at 90 days means we never need a cleanup job — old rows expire automatically.",
    interviewTime: "~45 seconds",
    deepDives: [
      { variant: "info", title: "Two Tables, Two Access Patterns", body: "watch_progress: PK=(profile_id, content_id). Upserted on every heartbeat. Used for resume — one row per content per profile. watch_history: PK=(profile_id, year), CK=watched_at DESC. Append-only. Used for recommendation inputs and 'continue watching' row. Different access patterns → different table designs, even though both live in Cassandra." },
      { variant: "warn", title: "QUORUM Writes vs LOCAL_ONE Reads", body: "QUORUM write = 2 of 3 replicas must acknowledge before we return success. This prevents data loss if one node dies immediately after write. LOCAL_ONE read = return data from the first available local replica — fastest possible read, may return slightly stale data. The asymmetry is intentional: we care more about write durability than read freshness for watch progress." },
      { variant: "success", title: "Why Not PostgreSQL or DynamoDB Here?", body: "PostgreSQL: 500K writes/sec would require extreme sharding and connection pooling complexity. DynamoDB: would work but costs more at this write volume (pay-per-write), and we lose the partition-design flexibility. Cassandra: purpose-built for high write throughput, linear horizontal scaling, and time-series partitioning. The operational cost is real (cluster management) but justified at Netflix scale." },
    ],
    techChips: ["Apache Cassandra", "QUORUM writes", "LOCAL_ONE reads", "TTL", "CQL"],
    kvPairs: [
      { label: "Cluster", value: "12 nodes × 3 AZs" },
      { label: "Replication factor", value: "3" },
      { label: "Write throughput", value: "500K/sec peak" },
      { label: "Storage per region", value: "~16 TB (90d TTL)" },
    ],
    dontForget: [
      "QUORUM writes + LOCAL_ONE reads: asymmetric consistency — state the business reasoning",
      "Two tables for two access patterns — don't try to merge them",
      "TTL is load-bearing — without it, storage grows unboundedly and partition scans degrade",
    ],
    relatedNodes: ["watch-history", "streaming"],
  },
  {
    id: "opensearch",
    label: "OpenSearch",
    sublabel: "BM25 · Content Index · Kafka consumer",
    type: "datastore",
    layer: 5, col: 6,
    overview: "Full-text search index for the content catalog. Indexed via a Kafka ContentPublished consumer. Supports BM25 ranking, fuzzy matching, faceted filters (genre/year/type), and region-aware filtering. New content searchable within seconds of publish.",
    interviewAnswer: "OpenSearch is the right tool for unstructured full-text search — DynamoDB can't do multi-field text matching efficiently. The index has title, cast, description, genres, and available_regions per document. Queries use a bool query with a must clause for BM25 full-text and a filter clause for the user's region — filter doesn't affect relevance scoring, just hard-excludes unlicensed content. Indexed asynchronously via Kafka consumer — eventual consistency is fine for search.",
    interviewTime: "~45 seconds",
    deepDives: [
      { variant: "info", title: "BM25 Ranking and Field Boosting", body: "BM25 is OpenSearch's default ranking algorithm. We boost the title field 3× (title^3) because a title match is more relevant than a description match containing the same words. Cast matches and genre tags get lower boosts. This tuning is done offline using click-through data from search result analytics." },
      { variant: "warn", title: "Region Filter Must Be Hard Filter", body: "available_regions is a filter (bool.filter), not a query (bool.must). In OpenSearch terms: filter doesn't affect relevance scoring AND results are cached in the filter cache. More importantly: a filter cannot be softened by relevance score. A title that's not licensed in the user's region will never appear regardless of how good the text match is. Legal requirement, not a performance choice." },
      { variant: "info", title: "Kafka-Driven Index Updates", body: "Search Indexer Lambda subscribes to content.published Kafka topic. On a new title: upsert the OpenSearch document with all catalog fields. On a title's regional availability change: update just the available_regions field. Since Kafka has 7-day retention, if the indexer falls behind it catches up without losing updates. Eventual consistency: new titles appear in search within seconds of Lambda processing." },
    ],
    techChips: ["Amazon OpenSearch", "BM25 ranking", "Faceted filters", "Kafka consumer", "Field boosting"],
    kvPairs: [
      { label: "Index size", value: "~1.7M documents" },
      { label: "Update lag", value: "Seconds (async)" },
      { label: "Region filter", value: "Hard filter (non-scoring)" },
      { label: "Autocomplete", value: "Redis ZSET (faster)" },
    ],
    dontForget: [
      "Region filter is a hard filter (bool.filter), not a scored clause — licensed content must be enforced",
      "OpenSearch handles full text; Redis ZSET handles autocomplete — two tools for two latency targets",
      "Eventual consistency is acceptable for search — new titles appearing in seconds, not milliseconds",
    ],
    relatedNodes: ["search", "kafka", "catalog"],
  },
  {
    id: "kinesis",
    label: "Amazon Kinesis",
    sublabel: "Client Events · 500K/sec · S3 Firehose",
    type: "datastore",
    layer: 5, col: 7,
    overview: "Ingests client-side play events (starts, pauses, quality switches, buffer events) from device SDKs at 500K events/second. Kinesis Firehose automatically batches and writes Parquet to S3. Kinesis Analytics runs real-time rebuffering ratio queries.",
    interviewAnswer: "Kinesis is for client event ingest, not service-to-service communication — that's Kafka's job. Client devices batch events every 30 seconds and POST to our event ingestion endpoint, which puts them on Kinesis. Two downstream consumers: Firehose (batches to S3 Parquet, no custom code) and Kinesis Analytics (SQL queries over sliding windows for real-time QoE dashboards). Separation of client events from domain events keeps the Kafka topics clean.",
    interviewTime: "~40 seconds",
    deepDives: [
      { variant: "info", title: "Kinesis vs Kafka for Client Events", body: "Kinesis: managed, serverless, no consumer group management, integrated Firehose for S3 delivery. Better for: bursty, unstructured, high-volume client events where you mainly need to buffer to storage. Kafka: more powerful consumer groups, replay, complex routing, schema registry. Better for: structured domain events between known services. Use both — right tool for the job." },
      { variant: "info", title: "Kinesis Analytics for Real-Time QoE", body: "Kinesis Data Analytics runs SQL over a sliding 5-minute window. Query: SELECT edge_node, COUNT(buffer_event)/COUNT(play_event) AS rebuffering_ratio FROM play_events WHERE event_time > NOW() - INTERVAL 5 MINUTES GROUP BY edge_node. If ratio > 1% for any edge node, alert fires. Results dashboard updates every 60 seconds." },
      { variant: "warn", title: "Shard Capacity Planning", body: "Each Kinesis shard handles 1MB/s write or 1,000 records/s. At 500K events/sec × 200 bytes/event = 100MB/s → need 100 shards minimum. Over-shard: Firehose cost scales with shards. Solution: provision 150 shards (50% headroom), enable Kinesis auto-scaling to add shards on CloudWatch RPS alarm." },
    ],
    techChips: ["Kinesis Data Streams", "Kinesis Firehose", "Kinesis Analytics", "S3 Parquet"],
    kvPairs: [
      { label: "Ingest rate", value: "500K events/sec" },
      { label: "Shards required", value: "~150 (with headroom)" },
      { label: "Firehose destination", value: "S3 Parquet" },
      { label: "Analytics latency", value: "~60 second dashboard" },
    ],
    dontForget: [
      "Kinesis for client events, Kafka for service events — explicitly state why",
      "Kinesis Firehose delivers to S3 with zero custom code — mention this operational advantage",
      "Shard count = throughput ÷ shard capacity — show you can do this math",
    ],
    relatedNodes: ["analytics", "s3"],
  },
  {
    id: "transcoder",
    label: "Transcoder",
    sublabel: "MediaConvert · Step Functions · ~120 variants",
    type: "pipeline",
    layer: 6, col: 1,
    overview: "Studio masters (4K RAW, 100GB+) are ingested to S3, triggering an SQS message to a Step Functions pipeline. AWS Elemental MediaConvert produces ~120 encoded variants (7 video bitrates, multi-language audio, subtitles). Per-title encoding optimizes quality vs bitrate per content type.",
    interviewAnswer: "New content follows a pipeline: studio uploads RAW master to S3, S3 event triggers an SQS message, a Step Functions workflow fans out parallel MediaConvert jobs — video encoding at 7 quality levels, multi-language audio, subtitle conversion. All variants land in S3 with content-addressed filenames. Then manifest generation, CDN cache warming, Catalog update, and ContentPublished Kafka event. Per-title encoding means we analyze each title's complexity and tune bitrate targets — an action film needs higher bitrate than a talking-heads documentary for the same perceptual quality.",
    interviewTime: "~55 seconds",
    deepDives: [
      { variant: "info", title: "~120 Encoded Variants per Title", body: "7 video quality levels × 3-5 audio language tracks × subtitle tracks (30+ languages) ≈ 120 files per title. All stored in S3 under content_id/video/{resolution}/{segment}.fmp4 with content-addressed filenames (hash of content in the name). Filename immutability means CDN caches never need invalidating — content is write-once." },
      { variant: "warn", title: "Per-Title Encoding (Netflix-Specific)", body: "Standard encoding uses fixed bitrate targets per resolution. Netflix's per-title approach: analyze the title's motion complexity and encode at the bitrate where quality stops improving. A quiet drama at 1080p might be perceptually equivalent at 2 Mbps vs. 5 Mbps. Result: ~20% bandwidth savings vs fixed-bitrate encoding with better or equal quality." },
      { variant: "danger", title: "SQS DLQ for Failed Transcoding", body: "MediaConvert jobs fail occasionally (corrupted source, unsupported codec, etc.). SQS maxReceiveCount=3: the transcoding job retries 3 times automatically. If all fail, message moves to the Dead Letter Queue. Lambda subscribes to DLQ → pages on-call via PagerDuty. Content team manually inspects the source file and re-submits. Content never silently fails to publish." },
    ],
    techChips: ["AWS Elemental MediaConvert", "AWS Step Functions", "Amazon SQS", "AWS Batch (Spot)", "SNS"],
    kvPairs: [
      { label: "Variants per title", value: "~120 (video + audio + subs)" },
      { label: "Source size", value: "100GB+ (4K RAW master)" },
      { label: "Orchestration", value: "AWS Step Functions" },
      { label: "Failure handling", value: "SQS DLQ → PagerDuty" },
    ],
    dontForget: [
      "Per-title encoding is a Netflix differentiator — mention it if discussing encoding at senior level",
      "Step Functions provides retries, parallel branches, and state persistence — why it's used over Lambda alone",
      "Content-addressed S3 filenames = immutable objects → CDN can cache forever, no invalidation needed",
    ],
    relatedNodes: ["s3", "kafka", "catalog"],
  },
  {
    id: "s3",
    label: "Amazon S3",
    sublabel: "Video Storage · 11-nines · Intelligent Tiering",
    type: "datastore",
    layer: 6, col: 2,
    overview: "Stores all encoded video variants, thumbnails, and original masters. Content-addressed filenames make objects immutable. S3 Intelligent-Tiering automatically moves data between Standard, IA, Glacier Instant, and Glacier Deep Archive based on access frequency.",
    interviewAnswer: "S3 stores everything: 850TB of encoded video variants plus 4.25PB of raw masters. Objects are content-addressed — the filename includes a hash of the content, so they're immutable. This is what makes CDN caching possible: a 1-year Cache-Control header is correct because the content never changes. S3 Intelligent-Tiering moves objects between tiers automatically: hot catalog titles stay in Standard, older long-tail content moves to Glacier Instant Retrieval at 1/5 the cost.",
    interviewTime: "~45 seconds",
    deepDives: [
      { variant: "info", title: "Content-Addressed Filenames = Immutable Objects", body: "Filename = hash(content_id + resolution + segment_number). Two benefits: (1) CDN can set Cache-Control: max-age=31536000, immutable — 1-year cache, never stale. (2) Re-encoding the same segment produces a new filename — old CDN-cached segments are unaffected by a re-encode. Zero-downtime content updates." },
      { variant: "info", title: "S3 Storage Tiering Cost Math", body: "S3 Standard: $0.023/GB/month. S3 Glacier Deep Archive: $0.00099/GB/month. 4.25PB of RAW masters in Deep Archive = $4.2K/month vs $97.5K/month in Standard. Annual saving on masters alone: ~$1.1M. For encoded variants, Intelligent-Tiering auto-classifies: top 20% of titles drive 80% of views and stay in Standard; the rest cascade to cheaper tiers." },
      { variant: "success", title: "11-Nines Durability Model", body: "S3 stores data across minimum 3 AZs within a region. With Cross-Region Replication, the same data exists in 2+ regions. 11 nines durability (99.999999999%) means losing one object per 100 billion stored per year. For Netflix, this is the only store acceptable for master content — losing a studio master is unrecoverable." },
    ],
    techChips: ["Amazon S3", "Intelligent-Tiering", "Cross-Region Replication", "S3 Transfer Acceleration", "Content-addressed"],
    kvPairs: [
      { label: "Encoded variants", value: "~850 TB" },
      { label: "Raw masters", value: "~4.25 PB" },
      { label: "Durability", value: "11 nines (99.999999999%)" },
      { label: "Deep Archive cost", value: "$0.00099/GB/month" },
    ],
    dontForget: [
      "Content-addressed filenames = immutable objects = CDN can cache for 1 year",
      "Show the storage tiering cost math — $97K vs $4K/month on raw masters is a compelling number",
      "Cross-Region Replication is required for the CDN in eu-west-1 and ap-southeast-1 to have local origin",
    ],
    relatedNodes: ["cdn", "transcoder"],
  },
  {
    id: "cdn",
    label: "CloudFront CDN",
    sublabel: "300 Tbps · Signed URLs · Origin Shield",
    type: "pipeline",
    layer: 6, col: 3,
    overview: "Amazon CloudFront with 400+ PoPs worldwide delivers video segments from edge cache. 99%+ cache hit rate for top titles. Origin Shield adds a regional caching layer to reduce S3 origin requests by 60–70%. Signed URLs enforce DRM access control at the edge.",
    interviewAnswer: "CloudFront is the reason the API tier never sees video bytes. Client gets a signed manifest URL pointing to CloudFront. CloudFront checks its edge cache — hit rate is above 99% for popular titles because content-addressed immutable segments can be cached for a year. On a miss, it goes to Origin Shield (a regional CloudFront layer) before hitting S3 — reducing origin load by 60–70%. Geographic restrictions on the CloudFront distribution enforce regional content licensing.",
    interviewTime: "~50 seconds",
    deepDives: [
      { variant: "info", title: "Origin Shield — Why It Matters", body: "Without Origin Shield: 400 edge PoPs × 1 miss each = 400 requests to S3 for a cold title. With Origin Shield: all 400 edge PoPs miss to a single regional Origin Shield node, which makes one request to S3. For new content releases, cache miss rate is high initially — Origin Shield prevents a miss thundering herd at S3 origin." },
      { variant: "warn", title: "Why Netflix Built Open Connect (Own CDN)", body: "At 300 Tbps peak bandwidth, commercial CDN costs are enormous. Netflix Open Connect places custom hardware (OCAs) inside ISPs — content is cached at the ISP level, eliminating transit costs entirely. Netflix pays ISPs to co-locate servers, not per-byte egress. Estimated saving: ~$1B/year vs CloudFront at Netflix's actual scale. For an interview design, CloudFront is appropriate — mention Open Connect as the production evolution." },
      { variant: "info", title: "Cache-Control Strategy", body: "Video segments (immutable): Cache-Control: public, max-age=31536000, immutable. Manifests (.m3u8): Cache-Control: max-age=300 (5 min) — manifests reference segments and need to update when new segments are available. Thumbnails: max-age=86400 (24h) — infrequently updated. DRM licenses: no-store — never cache, always go to license server." },
    ],
    techChips: ["Amazon CloudFront", "Origin Shield", "Signed URLs", "Geo restriction", "Immutable caching"],
    kvPairs: [
      { label: "Edge PoPs", value: "400+" },
      { label: "Peak bandwidth", value: "~45 Tbps (Netflix)" },
      { label: "Cache hit rate", value: "> 99% (popular titles)" },
      { label: "Origin Shield saving", value: "60–70% fewer S3 requests" },
    ],
    dontForget: [
      "Signed URLs expire after 6 hours — content is access-controlled at the edge, not just the API",
      "Origin Shield is the solution to the thundering-herd problem on new content release",
      "Mention Open Connect as the production evolution beyond CloudFront at Netflix scale",
    ],
    relatedNodes: ["s3", "client", "streaming"],
  },
];

// ── Connections ──────────────────────────────────────────────────────────────
export interface Connection {
  from: NodeId;
  to: NodeId;
  label: string;
  style?: "gRPC" | "HTTPS" | "Kafka" | "SQL" | "Redis" | "S3" | "gRPC/REST";
}

export const CONNECTIONS: Connection[] = [
  { from: "client",       to: "api-gateway",   label: "HTTPS",       style: "HTTPS" },
  { from: "client",       to: "cdn",            label: "HTTPS",       style: "HTTPS" },
  { from: "api-gateway",  to: "auth",           label: "gRPC",        style: "gRPC" },
  { from: "api-gateway",  to: "streaming",      label: "gRPC",        style: "gRPC" },
  { from: "api-gateway",  to: "catalog",        label: "gRPC",        style: "gRPC" },
  { from: "api-gateway",  to: "search",         label: "gRPC",        style: "gRPC" },
  { from: "auth",         to: "aurora",         label: "SQL",         style: "SQL" },
  { from: "auth",         to: "redis",          label: "Redis",       style: "Redis" },
  { from: "user",         to: "aurora",         label: "SQL",         style: "SQL" },
  { from: "user",         to: "kafka",          label: "Kafka",       style: "Kafka" },
  { from: "catalog",      to: "dynamodb",       label: "DynamoDB",    style: "gRPC/REST" },
  { from: "catalog",      to: "redis",          label: "Redis",       style: "Redis" },
  { from: "streaming",    to: "drm",            label: "gRPC",        style: "gRPC" },
  { from: "streaming",    to: "redis",          label: "Redis",       style: "Redis" },
  { from: "streaming",    to: "cassandra",      label: "CQL",         style: "SQL" },
  { from: "streaming",    to: "kafka",          label: "Kafka",       style: "Kafka" },
  { from: "search",       to: "opensearch",     label: "REST",        style: "HTTPS" },
  { from: "search",       to: "redis",          label: "Redis ZSET",  style: "Redis" },
  { from: "recommendation", to: "redis",        label: "Redis",       style: "Redis" },
  { from: "recommendation", to: "kafka",        label: "Kafka",       style: "Kafka" },
  { from: "watch-history", to: "cassandra",     label: "CQL",         style: "SQL" },
  { from: "watch-history", to: "kafka",         label: "Kafka",       style: "Kafka" },
  { from: "payment",      to: "aurora",         label: "SQL",         style: "SQL" },
  { from: "payment",      to: "kafka",          label: "Kafka",       style: "Kafka" },
  { from: "notification", to: "kafka",          label: "Kafka",       style: "Kafka" },
  { from: "notification", to: "dynamodb",       label: "DynamoDB",    style: "gRPC/REST" },
  { from: "analytics",    to: "kinesis",        label: "Kinesis",     style: "HTTPS" },
  { from: "analytics",    to: "kafka",          label: "Kafka",       style: "Kafka" },
  { from: "transcoder",   to: "s3",             label: "S3",          style: "S3" },
  { from: "transcoder",   to: "kafka",          label: "Kafka",       style: "Kafka" },
  { from: "s3",           to: "cdn",            label: "Origin",      style: "HTTPS" },
  { from: "cdn",          to: "client",         label: "Video",       style: "HTTPS" },
  { from: "opensearch",   to: "kafka",          label: "Kafka",       style: "Kafka" },
  { from: "kinesis",      to: "s3",             label: "Firehose",    style: "S3" },
];

// ── Flows ────────────────────────────────────────────────────────────────────
export interface FlowStep {
  nodeId: NodeId;
  name: string;
  description: string;
  payload?: string;
  whyItMatters?: string;
}

export interface Flow {
  id: string;
  label: string;
  steps: FlowStep[];
}

export const FLOWS: Flow[] = [
  {
    id: "play",
    label: "User clicks Play",
    steps: [
      { nodeId: "client",      name: "Play button pressed", description: "Client sends POST /playback/start with content_id, profile_id, episode_id, and device_type.", payload: '{ "content_id": "tt1234567", "profile_id": "p-abc", "device_type": "smart_tv" }', whyItMatters: "Everything starts here — if this request takes > 2s total, the viewer gets a loading spinner." },
      { nodeId: "api-gateway", name: "JWT validated at gateway", description: "API Gateway validates the RS256 JWT signature. Expired or malformed tokens are rejected here — no downstream service is touched.", whyItMatters: "JWT validation at the edge is a key scalability decision. Downstream services never waste cycles on invalid tokens." },
      { nodeId: "catalog",     name: "Content availability checked", description: "Catalog Service verifies content exists, is of type MOVIE/EPISODE, and is licensed in the user's country (from JWT country field).", whyItMatters: "Regional licensing is a legal requirement. Checking it here prevents DRM from issuing a license for unlicensed content." },
      { nodeId: "streaming",   name: "Concurrency check", description: "Redis INCR active_stream:{user_id}:{stream_id}. If the user is already at plan limit (1/2/4 streams), return HTTP 429.", payload: 'INCR active_stream:u-123:s-999 EX 60\n→ 2 (under Premium limit of 4, proceed)', whyItMatters: "Per-stream keys with 60s TTL handle app crashes — the slot auto-frees without a DECR." },
      { nodeId: "drm",         name: "DRM license issued", description: "DRM Service calls CloudHSM to get the content key for this content_id, wraps it for the client's DRM system, and returns a short-lived license token.", payload: '{ "license_token": "eyJ...", "drm_system": "widevine", "expires_at": 1718028800 }', whyItMatters: "License expiry bounds the blast radius if a device is compromised — attacker's access window is bounded." },
      { nodeId: "streaming",   name: "Signed manifest URL + resume position", description: "Generates CloudFront signed URL (6h TTL) for the master manifest. Reads watch_progress from Cassandra. Returns everything the client needs in one response.", payload: '{ "manifest_url": "https://cdn.netflix.com/tt1234/master.m3u8?Policy=...&Signature=...", "resume_sec": 1842, "license_token": "eyJ..." }', whyItMatters: "One round-trip for all data = client can seek and start buffering immediately. This is how < 2s start time is achieved." },
      { nodeId: "cdn",         name: "Manifest and first segments served from CDN", description: "Client fetches master manifest from CloudFront (likely cache hit — manifests are cached for 5 min). Picks quality tier, starts fetching segments. Cache hit rate > 99% for popular titles.", whyItMatters: "CDN edge serves video bytes — API tier is completely out of the hot path from this point forward." },
      { nodeId: "kafka",       name: "VideoWatched event emitted on heartbeat", description: "Every 30 seconds: Client sends heartbeat → Streaming Service emits VideoWatched to Kafka. Watch History, Recommendation Service, and Analytics all consume independently.", payload: '{ "event": "VideoWatched", "profile_id": "p-abc", "content_id": "tt1234567", "position_sec": 1872, "bitrate_kbps": 5000 }', whyItMatters: "Kafka decouples the heartbeat producer from 3+ consumers. Streaming Service doesn't wait for them." },
    ],
  },
  {
    id: "upload",
    label: "Content Upload",
    steps: [
      { nodeId: "s3",         name: "Studio uploads RAW master", description: "Studio uploads 4K RAW master (100GB+) to S3 Raw bucket via S3 Transfer Acceleration (routes through nearest edge). S3 triggers an event notification to SQS.", payload: 's3://netflix-raw/tt5678/master_4k.mxf → SQS: { "bucket": "netflix-raw", "key": "tt5678/master_4k.mxf" }', whyItMatters: "S3 Transfer Acceleration is critical for studios in other countries — routing through the nearest edge dramatically improves upload speed." },
      { nodeId: "transcoder", name: "Validation + Step Functions fan-out", description: "Validation worker checks codec, integrity, and DRM requirements. Step Functions spawns parallel MediaConvert jobs: 7 video bitrates, 5+ audio language tracks, 30+ subtitle languages.", whyItMatters: "Parallel fan-out means a 4-hour movie doesn't take 4× N encoding passes — all variants encode simultaneously." },
      { nodeId: "transcoder", name: "~120 encoded variants produced", description: "MediaConvert produces video at 240p/360p/480p/720p/1080p/1080p-HDR/4K-HDR, multi-language audio (AAC, Dolby Atmos), and WebVTT subtitles. Per-title encoding optimizes bitrate targets.", payload: 's3://netflix-encoded/tt5678/video/1080p/seg_000.fmp4\ns3://netflix-encoded/tt5678/audio/en/seg_000.m4a\ns3://netflix-encoded/tt5678/subtitles/es.vtt', whyItMatters: "Per-title encoding saves ~20% bandwidth vs fixed-bitrate — meaningful at 45 Tbps peak." },
      { nodeId: "s3",         name: "All variants written to S3 Encoded bucket", description: "Content-addressed filenames (hash in name) make these objects immutable. CDN can cache them for 1 year. HLS and MPEG-DASH manifests generated and also written to S3.", whyItMatters: "Immutability = CDN cache is always correct. No cache invalidation needed when re-encoding a title." },
      { nodeId: "cdn",        name: "CDN cache warmed for major PoPs", description: "CloudFront cache warming: pre-positions the new title's most popular bitrate segments at major edge PoPs before demand. Reduces cold-miss spike at launch.", whyItMatters: "Without warming, the first million viewers all cause cache misses simultaneously — Origin Shield would still be hit hard." },
      { nodeId: "kafka",      name: "ContentPublished event emitted", description: "Transcoding pipeline emits ContentPublished to Kafka. Multiple consumers react: Catalog marks title as available, Search Indexer adds to OpenSearch, Recommendation Service seeds initial reco rows.", payload: '{ "event": "ContentPublished", "content_id": "tt5678", "regions": ["US","CA","GB"], "publish_time": 1718100000 }', whyItMatters: "Kafka fan-out means all downstream systems update atomically relative to the event — no polling or tight coupling." },
      { nodeId: "catalog",    name: "Catalog updated + Redis invalidated", description: "Catalog Service marks content as available, updates the content item in DynamoDB, emits DEL content:tt5678 to Redis to invalidate cached metadata. Next read re-populates cache.", whyItMatters: "Cache invalidation is event-driven on change — not TTL-based — because stale availability data has legal implications." },
    ],
  },
  {
    id: "payment-fail",
    label: "Payment Fails",
    steps: [
      { nodeId: "payment",      name: "Stripe webhook received", description: "Stripe sends invoice.payment_failed webhook to POST /webhooks/stripe. We validate the Stripe-Signature HMAC-SHA256 header before processing — prevents forged events.", payload: '{ "type": "invoice.payment_failed", "data": { "object": { "customer": "cus_123", "amount_due": 1599 } } }', whyItMatters: "Webhook signature validation is a security requirement — without it, anyone can POST fake PaymentSucceeded events to activate accounts." },
      { nodeId: "kafka",        name: "PaymentFailed event emitted", description: "Payment Service emits PaymentFailed to Kafka. Decouples payment processing from downstream effects (notification, subscription state change).", payload: '{ "event": "PaymentFailed", "user_id": "u-456", "amount_cents": 1599, "reason": "insufficient_funds" }', whyItMatters: "Kafka decoupling means a slow Notification Service doesn't delay the subscription state update." },
      { nodeId: "payment",      name: "Subscription → PAST_DUE", description: "User Service consumes PaymentFailed. Subscription state: ACTIVE → PAST_DUE. User retains full access during 7-day grace period.", whyItMatters: "7-day grace period balances user experience (temporary card issue, just updated) vs revenue (chronic non-payer should be cancelled)." },
      { nodeId: "notification", name: "Email + push sent", description: "Notification Service sends email via SES ('Update your payment method') and push via FCM/APNs. Template rendered with account name and retry date.", whyItMatters: "Multi-channel notification maximizes recovery rate — email for detail, push for urgency." },
      { nodeId: "payment",      name: "Stripe retries automatically", description: "Stripe's Smart Retries retries the charge over the 7-day period using its ML-based retry schedule. On success → PaymentSucceeded event → subscription back to ACTIVE.", whyItMatters: "Stripe's retry intelligence (timing based on card type + bank) recovers more payments than fixed-interval retries." },
      { nodeId: "user",         name: "Subscription cancelled after grace period", description: "If all Stripe retries fail within 7 days: SubscriptionCancelled Kafka event → User Service marks account inactive → access to streaming revoked → final cancellation notification sent.", whyItMatters: "Saga choreography: no single orchestrator needed. Each service reacts to the event chain independently." },
    ],
  },
  {
    id: "search",
    label: "Search Request",
    steps: [
      { nodeId: "client",       name: "User types query (debounced)", description: "Client debounces keystrokes for 150ms. On each debounced keystroke: autocomplete request fired. On Enter/submit: full search request.", whyItMatters: "Debounce prevents firing a request per keypress — reduces load by ~80% on a 5-character query." },
      { nodeId: "api-gateway",  name: "Stricter rate limit for search", description: "Search endpoint has a tighter rate limit: 10 req/s per user_id. Prevents catalog scraping by bots that query systematically to extract the full content library.", whyItMatters: "Search endpoint without rate limiting would expose the entire catalog via a scraper in hours." },
      { nodeId: "redis",        name: "Autocomplete from Redis ZSET", description: "ZRANGEBYLEX popular_searches '[str' '[str\\xff' returns all terms starting with the typed prefix. Sub-millisecond. Only popular terms (those searched successfully before) appear.", payload: 'ZRANGEBYLEX popular_searches "[str" "[str\\xff"\n→ ["stranger things", "streaming", "strike"]', whyItMatters: "Redis ZSET autocomplete is O(log N + M) — sub-millisecond even for a 1M-term set. OpenSearch suggest would be 10–20ms." },
      { nodeId: "opensearch",   name: "Full-text search with region filter", description: "bool query: must=multi_match against title^3, cast, description. filter=available_regions contains user's country. Boost list from Recommendation Service applied for personalization.", payload: '{ "query": { "bool": { "must": { "multi_match": { "query": "stranger things", "fields": ["title^3","cast","description"] } }, "filter": { "term": { "available_regions": "US" } } } } }', whyItMatters: "Region filter is a hard filter (bool.filter) — unlicensed content is excluded regardless of relevance score. Legal requirement." },
      { nodeId: "recommendation", name: "Personalization boost applied", description: "Recommendation Service returns boost multipliers per content_id for this profile. Results are re-ranked locally: final_score = bm25_score × boost_multiplier.", whyItMatters: "Re-ranking adds ~5ms but dramatically improves click-through rate — the recommendation signal knows what this user watches." },
      { nodeId: "client",       name: "Top 20 results + facets returned", description: "Client receives top 20 personalized results with personalized thumbnail URLs, genre facets for filtering, and the suggestion list. All in < 100ms.", payload: '{ "results": [...], "facets": { "genre": [{"drama": 8}, {"sci-fi": 5}] }, "total": 23 }', whyItMatters: "Facets let the user narrow without a new full-text query — reduces round trips." },
    ],
  },
  {
    id: "register",
    label: "User Registers",
    steps: [
      { nodeId: "client",       name: "Registration form submitted", description: "POST /auth/register with email, password, selected plan, and country code.", payload: '{ "email": "user@example.com", "password": "...", "plan": "premium", "country": "US" }' },
      { nodeId: "auth",         name: "User created, UserRegistered emitted", description: "Auth Service hashes password (bcrypt cost 12), creates user row in Aurora, issues initial JWT + refresh token. Emits UserRegistered Kafka event.", payload: '{ "event": "UserRegistered", "user_id": "u-789", "email": "user@example.com", "plan": "premium", "country": "US" }', whyItMatters: "bcrypt cost 12 = ~300ms — acceptable for registration, prevents brute-force." },
      { nodeId: "user",         name: "Default profile created", description: "User Service consumes UserRegistered → creates a default Profile row in Aurora with name = email prefix, language from country code.", whyItMatters: "Profile creation is async — user doesn't wait for it during registration response." },
      { nodeId: "payment",      name: "Stripe customer record created", description: "Payment Service consumes UserRegistered → calls Stripe API to create a Customer object, stores stripe_customer_id in Aurora subscriptions table.", whyItMatters: "Stripe customer record must exist before any payment method can be attached." },
      { nodeId: "notification", name: "Welcome email sent", description: "Notification Service consumes UserRegistered → renders welcome template with first name and plan details → sends via SES.", whyItMatters: "Non-critical: if email fails, user is still registered. Kafka's 7-day retention means a retry is possible." },
      { nodeId: "recommendation", name: "Cold start rows seeded", description: "Recommendation Service consumes UserRegistered → no history yet, so seeds Redis with country-popularity fallback rows. User gets a populated homepage on first visit.", whyItMatters: "An empty homepage on first visit would be catastrophic for activation rate." },
    ],
  },
  {
    id: "failover",
    label: "Multi-Region Failover",
    steps: [
      { nodeId: "api-gateway",  name: "us-east-1 health check fails", description: "Route 53 health check detects that the ALB in us-east-1 is not responding. Health check polls every 10 seconds — failure after 3 consecutive misses (30s total).", whyItMatters: "Route 53 health checks are the trigger — without them, DNS continues routing to a dead region." },
      { nodeId: "api-gateway",  name: "Route 53 shifts traffic to eu-west-1", description: "Route 53 failover routing policy switches all traffic to the eu-west-1 ALB within ~60 seconds (TTL propagation). Users see no 503 — their next request hits the healthy region.", whyItMatters: "60-second RTO (Recovery Time Objective) is achievable with Route 53 failover. RPO depends on replication lag." },
      { nodeId: "dynamodb",     name: "Global Tables — eu-west-1 replica is current", description: "DynamoDB Global Tables async replication: eu-west-1 replica is ~1 second behind us-east-1. Catalog, sessions, and DRM licenses are all available in eu-west-1 immediately.", whyItMatters: "~1s RPO for DynamoDB is the cost of async replication. Acceptable for catalog and sessions." },
      { nodeId: "s3",           name: "S3 CRR — video available in eu-west-1", description: "S3 Cross-Region Replication has a 15-minute SLA for object replication. Encoded video segments are already in eu-west-1 for popular titles. Long-tail titles may have a gap during failover.", whyItMatters: "Top 20% of titles (80% of streams) are likely already replicated. Long-tail cold content may be unavailable briefly." },
      { nodeId: "aurora",       name: "Cross-region read replica promoted", description: "Aurora cross-region read replica in eu-west-1 is promoted to writer. RPO ~30 seconds (async replication lag). DBA team or automated runbook executes promotion in < 5 minutes.", payload: 'aws rds promote-read-replica-db-cluster --db-cluster-identifier netflix-eu-west-1', whyItMatters: "RPO of 30 seconds means up to 30 seconds of write data (new subscriptions, payment updates) may be lost. Acceptable for most scenarios; not acceptable for billing disputes (handled by Stripe)." },
    ],
  },
  {
    id: "gdpr",
    label: "GDPR Deletion",
    steps: [
      { nodeId: "user",         name: "User requests account deletion", description: "DELETE /users/{user_id}. User Service soft-deletes the Aurora row (marks deleted_at, doesn't hard-delete yet). Emits UserDeletionRequested Kafka event.", payload: '{ "event": "UserDeletionRequested", "user_id": "u-123", "requested_at": 1718200000, "gdpr_deadline": 1720878400 }', whyItMatters: "Soft delete first — we need the user_id to correlate downstream deletions for the next 30 days." },
      { nodeId: "auth",         name: "All sessions immediately invalidated", description: "Auth Service DELs all Redis refresh tokens for this user_id. All active sessions expire within 15 minutes (next JWT rotation attempt will fail).", whyItMatters: "Immediate session invalidation prevents the deleted user from continuing to access content during the async deletion window." },
      { nodeId: "watch-history", name: "Cassandra rows deleted", description: "Watch History Service deletes all rows in watch_progress and watch_history where profile_id is one of the user's profiles. CQL batch delete.", payload: 'DELETE FROM watch_progress WHERE profile_id IN (SELECT profile_id FROM profiles WHERE user_id = \'u-123\');\nDELETE FROM watch_history WHERE profile_id IN (...);', whyItMatters: "Cassandra native TTL would eventually clean this up, but GDPR requires proactive deletion within 30 days." },
      { nodeId: "analytics",    name: "Analytics data anonymized (tombstone hash)", description: "Analytics Service replaces user_id with tombstone hash in all future reads of S3 Parquet files. Old log files are immutable — tombstone mapping is maintained in a separate DynamoDB table.", whyItMatters: "S3 objects are immutable — can't delete individual rows. Tombstone hashing is GDPR-compliant: the data exists but is no longer attributable to the individual." },
      { nodeId: "notification",  name: "Notification preferences deleted", description: "Notification Service deletes all DynamoDB records for this user_id: preferences, notification log, and any pending notifications in the queue.", whyItMatters: "If not deleted, future notification workers could still send emails to a deleted account." },
      { nodeId: "drm",          name: "DRM licenses revoked", description: "DRM Service deletes all DRM license records in DynamoDB for this user. Any active licenses will fail validation on next playback attempt.", whyItMatters: "A deleted user must not continue streaming with an active DRM license." },
      { nodeId: "user",         name: "Aurora rows hard-deleted", description: "After all downstream services confirm deletion (or after 30-day SLA): User Service hard-deletes Aurora rows for user + profiles. Emits UserDeleted final event.", payload: '{ "event": "UserDeleted", "user_id": "u-123", "completed_at": 1718800000 }', whyItMatters: "Hard delete is the final step — only after all personal data is purged from all systems." },
    ],
  },
];

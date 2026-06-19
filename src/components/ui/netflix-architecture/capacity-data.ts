export interface HeroNumber {
  value: string;
  label: string;
  color: string;
  unit: string;
}

export interface Derivation {
  id: string;
  title: string;
  steps: string[];
  result: string;
  assumption: string;
  interviewTip: string;
}

export const HERO_NUMBERS: HeroNumber[] = [
  { value: "300M",    unit: "users",        label: "Total subscribers",       color: "#e50914" },
  { value: "150M",    unit: "DAU",          label: "Daily Active Users (50%)", color: "#f5a623" },
  { value: "15M",     unit: "concurrent",   label: "Peak concurrent viewers",  color: "#818cf8" },
  { value: "45",      unit: "Tbps",         label: "Peak video bandwidth",     color: "#38bdf8" },
  { value: "260K",    unit: "RPS",          label: "Peak API requests/sec",    color: "#22c55e" },
  { value: "500K",    unit: "events/sec",   label: "Peak Kafka/Kinesis events", color: "#f59e0b" },
];

export const DERIVATIONS: Derivation[] = [
  {
    id: "bandwidth",
    title: "Peak Bandwidth (most important number — start here)",
    steps: [
      "Peak concurrent viewers = 150M DAU × 10% peak ratio = 15M",
      "Average stream bitrate = mix of all quality levels ≈ 3 Mbps",
      "Peak bandwidth = 15M viewers × 3 Mbps = 45,000,000 Mbps",
      "Convert: 45,000,000 Mbps ÷ 1,000,000 = 45 Tbps",
      "∴ Netflix serves ~45 Tbps at peak — ~15% of global internet traffic",
    ],
    result: "45 Tbps",
    assumption: "3 Mbps average = mix of 240p (300 kbps) and 4K (15 Mbps). Most users watch 720p–1080p (~3–5 Mbps). 10% peak ratio = peak hour vs avg DAU.",
    interviewTip: "Start with bandwidth. It's the most impressive number and anchors everything else. '45 Tbps = 15% of global internet' is the headline stat.",
  },
  {
    id: "rps",
    title: "Peak API Requests Per Second",
    steps: [
      "DAU = 150M users",
      "Average API calls per user per day = 50 (browse, search, play, heartbeat, etc.)",
      "Total daily API calls = 150M × 50 = 7.5 billion",
      "Average RPS = 7.5B ÷ 86,400 seconds = ~87,000 RPS",
      "Peak factor = 3× average (8pm–10pm prime time)",
      "∴ Peak RPS = 87K × 3 = ~260,000 RPS",
    ],
    result: "~260K RPS peak",
    assumption: "50 API calls/day = conservative estimate including heartbeats (1 per 30s × 2h average watch = 240 heartbeats, plus browse/search/UI interactions). Peak factor of 3× is standard for consumer services.",
    interviewTip: "Interviewers sometimes push on the 50 calls/day estimate. Defend it: 2 hours of watching = 240 heartbeats alone. Add browse, search, and navigation = easily 50 total.",
  },
  {
    id: "kafka-events",
    title: "Peak Kafka / Kinesis Events Per Second",
    steps: [
      "Peak concurrent viewers = 15M",
      "Each viewer sends a heartbeat every 30 seconds",
      "Events/sec = 15M ÷ 30 = 500,000 events/sec",
      "Plus: content.published, payment events (~negligible vs watch events)",
      "∴ Peak event throughput ≈ 500K events/sec",
    ],
    result: "~500K events/sec",
    assumption: "Dominated by VideoWatched heartbeats. Each is ~200 bytes → 500K × 200B = 100 MB/s Kafka throughput. Well within Kafka's capacity (single partition = 100 MB/s).",
    interviewTip: "This number directly sizes your Kafka cluster. 500K events/sec × 200B = 100 MB/s. Kafka supports 1 GB/s per broker, so you need ~1–3 brokers for this workload (with replication).",
  },
  {
    id: "s3-storage",
    title: "S3 Video Storage",
    steps: [
      "Total titles = ~17,000 (movies + TV shows)",
      "Encoded variants per title ≈ 50 GB (7 video tiers × audio × subtitles)",
      "Total encoded storage = 17,000 × 50 GB = 850 TB ≈ ~1 PB",
      "Raw masters = ~5× encoded size (4K RAW mezzanine files)",
      "Total RAW storage = 850 TB × 5 = ~4.25 PB",
      "With 3× redundancy (CRR to 3 regions) = ~12–15 PB total",
    ],
    result: "~850 TB encoded, ~4.25 PB raw",
    assumption: "50 GB per title encoded = rough average across all quality levels, all audio tracks, all subtitle files. Individual titles vary widely (90-min movie vs 10-season series).",
    interviewTip: "Interviewers love the cost angle: 4.25 PB of raw masters in S3 Glacier Deep Archive = ~$4,200/month vs $97,750/month in Standard. That's ~$1.1M/year in storage savings just on masters.",
  },
  {
    id: "cassandra",
    title: "Cassandra Watch History Storage",
    steps: [
      "DAU = 150M users, avg 3 watches per day",
      "Daily write volume = 150M × 3 = 450M events/day",
      "Each event ≈ 200 bytes (profile_id + timestamps + content_id + position)",
      "Daily data = 450M × 200B = 90 GB/day",
      "With 90-day TTL: max dataset = 90 GB/day × 90 days = 8.1 TB",
      "With replication factor 3: 8.1 TB × 3 = ~24 TB total across cluster",
      "∴ ~8–16 TB per region (accounting for uneven activity distribution)",
    ],
    result: "~16 TB per region",
    assumption: "3 watches/day assumes 2h average watch time ÷ ~40min avg episode = ~3 events. Events include both watch_history appends and watch_progress upserts. Replication factor 3 across 12 nodes = 4 nodes per AZ.",
    interviewTip: "The TTL is load-bearing. Without it, storage grows unboundedly: 90 GB/day × 365 = 32 TB/year, and partition scans degrade. TTL is the right architectural constraint.",
  },
  {
    id: "redis",
    title: "Redis Cluster Memory",
    steps: [
      "Active sessions: 15M concurrent × 500B/token = 7.5 GB",
      "Recommendation cache: 150M profiles × 1 KB/profile = 150 GB",
      "Content metadata cache: 17,000 items × 10 KB/item = 170 MB",
      "Rate limit counters: ~100M active users × 100B = 10 GB (rolling window)",
      "Active stream counters: 15M keys × ~100B = 1.5 GB",
      "Total ≈ 150 + 7.5 + 10 + 1.5 + 0.17 ≈ ~170 GB",
      "∴ r6g.4xlarge × 3 nodes (128 GB each = 384 GB total, ~50% utilization)",
    ],
    result: "~160–170 GB RAM cluster",
    assumption: "Recommendations dominate at 150 GB. This assumes every DAU profile has a cached reco row. Cold profiles (haven't visited in 6h) are evicted by LRU.",
    interviewTip: "Lead with 'recommendations dominate the Redis memory budget at 150 GB.' It shows you can identify the dominant term in a back-of-envelope.",
  },
  {
    id: "aurora",
    title: "Aurora PostgreSQL Sizing",
    steps: [
      "Total users = 300M rows × ~500 bytes/row = 150 GB",
      "Total profiles = 300M users × avg 2 profiles = 600M rows × ~300B = 180 GB",
      "Subscriptions + payment_methods = ~50 GB",
      "Total = ~380 GB, call it ~500 GB with indexes and TOAST data",
      "Read replicas: 2 per region to handle 10× read-to-write ratio",
      "Write throughput: billing events are low-frequency (~1/month per user) → well under Aurora's limits",
    ],
    result: "~500 GB, 2 read replicas per region",
    assumption: "User data is small per row. The bottleneck is read throughput (profile loads, subscription checks) not storage or write throughput.",
    interviewTip: "Contrast this with Cassandra: 500 GB in Aurora is tiny. It's cheap. The value of Aurora is ACID guarantees, not scale-out capacity.",
  },
  {
    id: "dynamodb",
    title: "DynamoDB Sizing",
    steps: [
      "Content catalog: 17K titles × 50 episodes avg = 1.7M items",
      "Average item size: ~5 KB (all attributes)",
      "Total storage: 1.7M × 5 KB = ~8.5 GB ≈ ~10 GB",
      "Read throughput: 50,000 RPS for catalog (homepage + search fallback)",
      "Write throughput: catalog updates are rare (~100 per day, new title publish)",
      "On-demand pricing: pay per request, no capacity planning needed",
    ],
    result: "~10 GB, 50K reads/sec on-demand",
    assumption: "10 GB of catalog data is tiny. DynamoDB pricing at this workload is dominated by read/write units ($1.25/M read units), not storage ($0.25/GB).",
    interviewTip: "DynamoDB's value isn't storage capacity — it's the ability to deliver 50K RPS at < 1ms without any ops work. That's the justification.",
  },
];

export interface CapacityPreset {
  id: string;
  label: string;
  subscribers: number;
  dauRatio: number;
  bitrateMbps: number;
  watchesPerDay: number;
}

export const PRESETS: CapacityPreset[] = [
  { id: "startup",  label: "Startup (1M users)",    subscribers: 1_000_000,   dauRatio: 0.30, bitrateMbps: 3, watchesPerDay: 2 },
  { id: "netflix",  label: "Netflix (300M users)",   subscribers: 300_000_000, dauRatio: 0.50, bitrateMbps: 3, watchesPerDay: 3 },
  { id: "youtube",  label: "YouTube scale (2B DAU)", subscribers: 2_000_000_000, dauRatio: 0.70, bitrateMbps: 2, watchesPerDay: 5 },
];

export interface FlashCard {
  id: string;
  topic: string;
  topicColor: string;
  question: string;
  answer: string;
  explanation: string;
}

export const FLASHCARDS: FlashCard[] = [
  // Auth
  { id: "auth-1", topic: "Auth", topicColor: "#f59e0b", question: "Why use a short 15-minute JWT TTL instead of a longer one?", answer: "JWT is stateless — you can't revoke it before expiry. Short TTL bounds the exposure window if a token is stolen.", explanation: "If a JWT is compromised, the attacker has at most 15 minutes of access. After expiry, the client must use the refresh token — which can be revoked immediately. This is the Netflix solution to the JWT revocation problem." },
  { id: "auth-2", topic: "Auth", topicColor: "#f59e0b", question: "How does refresh token rotation detect theft?", answer: "Issue a new token on each refresh and delete the old one. If the old token is reused, it means someone else used it first — revoke ALL sessions for the user.", explanation: "Rotation creates a 'one-time use' semantic. If Token A is rotated to Token B, and an attacker later uses Token A, the system detects reuse and treats it as a breach — immediately logging out every device." },
  { id: "auth-3", topic: "Auth", topicColor: "#f59e0b", question: "Why is bcrypt cost-12 acceptable for login but not for per-request auth?", answer: "bcrypt-12 takes ~300ms. Login happens once per session (acceptable). Per-request auth would add 300ms to every API call (unacceptable).", explanation: "This is why we issue JWTs — the API Gateway validates the JWT's RS256 signature in microseconds. bcrypt is only called at login, not on every request." },
  { id: "auth-4", topic: "Auth", topicColor: "#f59e0b", question: "What data is in the Netflix JWT payload?", answer: "sub (user_id), profile_id, plan type, country code, iat, exp. Signed with RS256 using a private key in KMS.", explanation: "country_code enables regional licensing checks without a DB call. plan type enables concurrency limits at the Streaming Service. profile_id scopes the session to a specific profile." },
  { id: "auth-5", topic: "Auth", topicColor: "#f59e0b", question: "How does Netflix handle logging out from all devices?", answer: "Scan Redis for all refresh:{token} keys associated with this user_id and DEL all of them.", explanation: "In production, keys are stored as refresh:{uuid} → user_id, not refresh:{user_id}:{uuid}. To delete all, you need a secondary index in DynamoDB (device sessions table) to list all session tokens, then DEL each from Redis." },

  // Streaming
  { id: "stream-1", topic: "Streaming", topicColor: "#38bdf8", question: "Why use a per-stream Redis key with TTL instead of a shared INCR counter?", answer: "INCR/DECR breaks if the app crashes — DECR never fires. Per-stream key expires after 60s if not refreshed by heartbeat.", explanation: "active_stream:{user_id}:{stream_id} with 60s TTL is refreshed every 30s by the heartbeat. App crash = heartbeat stops = TTL expires = slot freed automatically. No manual cleanup." },
  { id: "stream-2", topic: "Streaming", topicColor: "#38bdf8", question: "How does a CloudFront Signed URL work?", answer: "Policy JSON (path + expiry) + RSA signature from CloudFront key pair. CDN validates signature at the edge without hitting origin.", explanation: "The edge validates the signature cryptographically — no origin call needed. If a URL leaks, it's useless after the TTL (6 hours). An IP restriction can further scope it to the originating client." },
  { id: "stream-3", topic: "Streaming", topicColor: "#38bdf8", question: "How does Netflix achieve < 2s video start time?", answer: "Manifest URL + resume position returned in one /playback/start response. Client seeks and buffers simultaneously.", explanation: "Two round trips (get manifest, then get resume position) would be ~200ms each. Bundling both in the playback start response = client has everything it needs to seek and start fetching segments in one shot." },
  { id: "stream-4", topic: "Streaming", topicColor: "#38bdf8", question: "What is ABR (Adaptive Bitrate Streaming)?", answer: "Video encoded at multiple bitrates. Player measures bandwidth and switches to a higher or lower quality tier at segment boundaries.", explanation: "Netflix uses BOLA algorithm: buffer-occupancy-based. If buffer > 30s, step up quality even if bandwidth is temporarily slow. If buffer < 10s, step down quality to prevent rebuffering. Quality only changes at segment boundaries (every 4–6 seconds)." },
  { id: "stream-5", topic: "Streaming", topicColor: "#38bdf8", question: "What happens when a user switches devices mid-watch?", answer: "Second device calls /playback/start → Streaming Service reads watch_progress from Cassandra → returns resume_sec → client seeks immediately.", explanation: "The heartbeat (every 30s) keeps watch_progress current. Max staleness = 30s. Second device resumes within 30s of where first device left off. No server-push or WebSocket needed." },

  // Recommendation
  { id: "reco-1", topic: "Recommendations", topicColor: "#8b5cf6", question: "Why pre-compute recommendations instead of computing at request time?", answer: "ML inference takes ~200ms. 150M homepage loads/day × 200ms = unacceptable. Pre-compute + Redis = < 2ms.", explanation: "200ms × 150M = 30,000,000 seconds of inference compute per day. Even if SageMaker could handle it, adding 200ms to homepage load time causes measurable user drop-off. Redis pre-compute trades 6-hour staleness for sub-ms reads." },
  { id: "reco-2", topic: "Recommendations", topicColor: "#8b5cf6", question: "How does Netflix solve the cold start problem for new users?", answer: "3 fallbacks: (1) onboarding quiz → seed with genre preferences, (2) country popularity top 20, (3) demographic defaults.", explanation: "Never show an empty homepage. Each fallback is progressively less personalized but better than nothing. As the user watches content, the recommendation model accumulates signal and the personalized rows start appearing." },
  { id: "reco-3", topic: "Recommendations", topicColor: "#8b5cf6", question: "What triggers a recommendation refresh outside the 6-hour batch?", answer: "VideoWatched Kafka event → Recommendation Service consumer → async SageMaker inference for that profile only.", explanation: "When you finish watching a thriller, your recommendations should update to show more thrillers. Event-driven refresh ensures fresh results for the next homepage load without waiting up to 6 hours for the batch job." },
  { id: "reco-4", topic: "Recommendations", topicColor: "#8b5cf6", question: "What is a Two-Tower neural network in the context of recommendations?", answer: "Two encoders: one for user features, one for item features. Dot product of embeddings = relevance score. Fast at inference time.", explanation: "User tower: embeds watch history, ratings, demographics. Item tower: embeds content attributes, genre, director. At inference: compute user embedding once, dot-product against all pre-computed item embeddings. Scales to millions of items." },
  { id: "reco-5", topic: "Recommendations", topicColor: "#8b5cf6", question: "What is thumbnail personalization and why does it matter?", answer: "Same title served with different artwork per profile. The thumbnail most likely to get a click from THIS viewer's taste vector.", explanation: "Action fan → sees explosive scene. Rom-com fan → sees emotional moment. Netflix A/B-tests dozens of thumbnails per title and selects via their recommendation model. A good thumbnail lift is 20–30% click-through improvement." },

  // Watch History
  { id: "wh-1", topic: "Watch History", topicColor: "#38bdf8", question: "Why are there two Cassandra tables for watch history?", answer: "watch_progress: upserted per heartbeat, for resume. watch_history: append-only log, for recommendations and analytics. Different access patterns need different schemas.", explanation: "watch_progress PK=(profile_id, content_id) — one row per content, always the latest position. watch_history PK=(profile_id, year) — time-series, append-only, sorted newest first for the reco model." },
  { id: "wh-2", topic: "Watch History", topicColor: "#38bdf8", question: "Why bucket the watch_history partition key by year?", answer: "PK=profile_id alone grows unboundedly for power users. Year bucket = each year is a separate partition, bounded size.", explanation: "A power user who watches 3 titles/day for 5 years accumulates 5,475 rows. With TTL=90 days, each year's partition is bounded at ~90 days of data. Cross-year queries are rare and can be merged in application code." },
  { id: "wh-3", topic: "Watch History", topicColor: "#38bdf8", question: "Why use QUORUM writes but LOCAL_ONE reads in Cassandra?", answer: "Write safety matters more than write speed for progress. Read freshness doesn't matter — 3s stale resume is fine.", explanation: "QUORUM write = 2 of 3 replicas acknowledge. Node failure after write still has data on 2 nodes. LOCAL_ONE read = fastest available replica, may return data not yet replicated. Acceptable trade-off for watch progress." },
  { id: "wh-4", topic: "Watch History", topicColor: "#38bdf8", question: "How does native Cassandra TTL keep the dataset bounded?", answer: "default_time_to_live = 7776000 (90 days) — rows auto-delete after 90 days. No cleanup job needed.", explanation: "90 GB/day × 90 days = 8.1 TB max per region. Without TTL, it would grow 90 GB/day forever. Cassandra handles tombstone cleanup during compaction — it's a first-class feature, not a workaround." },
  { id: "wh-5", topic: "Watch History", topicColor: "#38bdf8", question: "Why Cassandra over DynamoDB for watch history?", answer: "500K writes/sec is cheaper on Cassandra at this scale. DynamoDB on-demand pricing at 500K writes/sec = very expensive. Cassandra's write throughput is purpose-built.", explanation: "DynamoDB: 500K writes/sec × $1.25/M writes × 86,400 seconds/day = ~$54K/day in write costs. Cassandra: 12 EC2 nodes at ~$500/month each = ~$6,000/month total. Ops cost is real, but justified at scale." },

  // Payment
  { id: "pay-1", topic: "Payment", topicColor: "#f59e0b", question: "What PCI DSS requirement drives the card storage design?", answer: "Never store raw card numbers. Store only Stripe payment_method tokens. Stripe handles PCI DSS Level 1 compliance on our behalf.", explanation: "Raw card storage requires full PCI DSS Level 1 audit (expensive, complex). By tokenizing via Stripe, we never see raw card numbers and our PCI scope drops to SAQ A — minimal requirements." },
  { id: "pay-2", topic: "Payment", topicColor: "#f59e0b", question: "Why validate the Stripe-Signature header on webhooks?", answer: "Without it, any attacker can POST fake PaymentSucceeded events to your endpoint and activate accounts for free.", explanation: "Stripe signs every webhook payload with a secret using HMAC-SHA256. Your handler recomputes the expected signature and compares. Mismatch = reject with 400. This is a critical security requirement, not optional." },
  { id: "pay-3", topic: "Payment", topicColor: "#f59e0b", question: "How do idempotency keys prevent double charges?", answer: "Each Stripe API call includes a unique Idempotency-Key. If the same key is sent twice (crash-retry), Stripe returns the original result — no second charge.", explanation: "Without idempotency keys: your service calls Stripe, Stripe charges the card, your service crashes before writing to Aurora, your service retries → Stripe charges again. Idempotency key breaks the retry loop." },
  { id: "pay-4", topic: "Payment", topicColor: "#f59e0b", question: "Walk me through the subscription state machine.", answer: "TRIALING → ACTIVE (first payment) → PAST_DUE (payment fails, 7-day grace) → CANCELLED (all retries fail) OR → ACTIVE (payment recovered).", explanation: "The 7-day grace period is a UX decision: 'your card expired, update it' is common. Users shouldn't lose access immediately on a recoverable payment failure. After 7 days of non-payment, account is cancelled." },
  { id: "pay-5", topic: "Payment", topicColor: "#f59e0b", question: "Why use the Saga pattern instead of a distributed transaction for subscription creation?", answer: "No distributed transaction coordinator spans Stripe + Aurora + User Service. Saga choreography via Kafka achieves eventual consistency with compensating transactions on failure.", explanation: "Step 1: charge card (Stripe). Step 2: activate account (User Service). If Step 2 fails: compensating transaction = refund charge (Stripe). Each step is autonomous — no two-phase commit coordinator needed." },

  // CDN
  { id: "cdn-1", topic: "CDN", topicColor: "#818cf8", question: "Why can CloudFront cache video segments for 1 year?", answer: "Segments use content-addressed filenames (hash in the name). Same content = same filename. Never changes once created → immutable → cache forever.", explanation: "If Netflix re-encodes a title, the new segments get new hashes → new filenames → clients get the new segments. Old cached segments are still valid for sessions that started before the re-encode." },
  { id: "cdn-2", topic: "CDN", topicColor: "#818cf8", question: "What is CloudFront Origin Shield?", answer: "A regional caching layer between all edge PoPs and S3 origin. On miss at any edge PoP, Origin Shield answers — not S3. Reduces origin requests by 60–70%.", explanation: "Without Origin Shield: 400 edge PoPs × 1 miss each for a new title = 400 requests to S3. With Origin Shield: all 400 PoPs miss to the Origin Shield region, which makes 1 request to S3. Critical at launch of new popular content." },
  { id: "cdn-3", topic: "CDN", topicColor: "#818cf8", question: "Why did Netflix build its own CDN (Open Connect)?", answer: "At 300 Tbps, commercial CDN egress costs are enormous. OCA servers inside ISPs eliminate transit costs entirely. Estimated savings: ~$1B/year.", explanation: "CloudFront charges for egress bandwidth. Netflix's scale means those costs dominate infrastructure spend. Open Connect: Netflix pays ISPs to host hardware, not per-byte egress. At 45 Tbps, the hardware is cheaper than per-byte pricing." },
  { id: "cdn-4", topic: "CDN", topicColor: "#818cf8", question: "What's the difference between HLS and MPEG-DASH?", answer: "HLS (Apple): required for iOS/Safari. MPEG-DASH: open standard, used on Android/Chrome/Smart TVs. Both segment video; MPEG-DASH is codec-agnostic.", explanation: "Netflix encodes one set of video files but serves two manifest formats. The manifest is just a text file pointing to segment URLs — same segments work for both. Client device determines which manifest to request." },
  { id: "cdn-5", topic: "CDN", topicColor: "#818cf8", question: "How does CENC allow one encrypted video to work with three DRM systems?", answer: "AES-128-CTR encryption is DRM-agnostic. Each DRM system wraps the same content key differently in its license. Client uses whichever DRM system it supports.", explanation: "Before CENC: Netflix stored 3 encrypted copies of every video (Widevine, FairPlay, PlayReady). After CENC: 1 encrypted video, 3 license servers. Triples storage efficiency. All major devices adopted CENC by 2014." },

  // Kafka
  { id: "kafka-1", topic: "Kafka", topicColor: "#f59e0b", question: "What is a Kafka consumer group and why does it matter?", answer: "A named group of consumers that share the partitions of a topic. Multiple groups = each gets all messages independently. One group = load-balanced across members.", explanation: "VideoWatched topic has 3 consumer groups: watch-history-consumer, reco-consumer, analytics-consumer. Each processes every message independently. If reco-consumer falls behind, it doesn't affect the others." },
  { id: "kafka-2", topic: "Kafka", topicColor: "#f59e0b", question: "Why is Kafka retention period a business decision, not just an ops one?", answer: "video.watched retains 30 days = ML model retraining from historical data. payment events retain 30 days = billing audit trail.", explanation: "If you retain video.watched for only 1 day, you can't replay 30 days of history to retrain the recommendation model from scratch. Retention is the 'time machine' for your data pipeline." },
  { id: "kafka-3", topic: "Kafka", topicColor: "#f59e0b", question: "When would you use Kafka vs Kinesis?", answer: "Kafka: service-to-service domain events needing consumer groups, replay, complex routing. Kinesis: high-volume client event ingest where you mainly need to buffer to S3.", explanation: "Kafka's consumer group model and schema registry are powerful for microservice event buses. Kinesis Firehose is simpler for 'collect client events, dump to S3' workloads. Netflix uses both — right tool for each job." },
  { id: "kafka-4", topic: "Kafka", topicColor: "#f59e0b", question: "What does Avro + Schema Registry add to Kafka?", answer: "Schema enforcement at produce time, compact binary format (~5× smaller than JSON), and schema evolution without breaking consumers.", explanation: "Schema Registry stores the Avro schema. Producers serialize with the schema; consumers deserialize with the same schema. Adding an optional field = backward compatible. Removing a required field = breaking change caught at the Registry." },
  { id: "kafka-5", topic: "Kafka", topicColor: "#f59e0b", question: "How does Kafka enable the GDPR deletion cascade?", answer: "Emit UserDeletionRequested event → each service consumes and purges its own data independently within the 30-day SLA.", explanation: "User Service doesn't own Watch History's Cassandra or Analytics' S3. Kafka fan-out means each service acts on the deletion event autonomously, with the correct access to its own datastore." },

  // DynamoDB
  { id: "ddb-1", topic: "DynamoDB", topicColor: "#818cf8", question: "What does 'define access patterns upfront' mean for DynamoDB design?", answer: "Every query must use the primary key or a GSI — no full table scans. Design the table schema around your queries, not your entities.", explanation: "In PostgreSQL, you write the schema first and add indexes later as you discover slow queries. In DynamoDB, if you don't define access patterns before design, you end up with expensive scans or needing new GSIs in production — both costly." },
  { id: "ddb-2", topic: "DynamoDB", topicColor: "#818cf8", question: "What is a Global Secondary Index (GSI) and when do you add one?", answer: "A GSI is a full copy of the table with a different PK/SK. Add one when you have a new access pattern that can't use the base table PK.", explanation: "For content catalog: base PK=content_id handles get-by-id. GSI1 PK=genre handles list-by-genre. GSI2 PK=type handles list-by-type. Each GSI has its own read/write capacity — provision separately." },
  { id: "ddb-3", topic: "DynamoDB", topicColor: "#818cf8", question: "What are DynamoDB Global Tables?", answer: "Multi-region active-active replication with ~1s lag. Writes in any region propagate to all. Last-writer-wins on conflict.", explanation: "Netflix deploys DynamoDB Global Tables in us-east-1, eu-west-1, ap-southeast-1. Content catalog is always available globally. ~1s replication lag is acceptable for catalog. Not acceptable for billing — use Aurora for that." },
  { id: "ddb-4", topic: "DynamoDB", topicColor: "#818cf8", question: "On-demand vs provisioned DynamoDB capacity — when to use each?", answer: "On-demand: unpredictable or spiky traffic (new content release surge). Provisioned + auto-scaling: predictable workloads (DRM licenses).", explanation: "On-demand: pay per request, no throttling. More expensive per RCU/WCU. Provisioned: cheaper per RCU/WCU, but you pay for reserved capacity even when idle. For catalog (traffic spikes on new release), on-demand prevents throttling at higher cost." },
  { id: "ddb-5", topic: "DynamoDB", topicColor: "#818cf8", question: "Why use DynamoDB TTL for DRM licenses?", answer: "DRM licenses have a natural expiry. TTL auto-deletes expired licenses without application-level cleanup jobs.", explanation: "Set TTL = expires_at epoch. DynamoDB scans for expired items and deletes them within 48 hours (not instant). For licenses expired > 48 hours ago, your app code should still reject them by checking expires_at — don't rely solely on TTL for security." },

  // Cassandra
  { id: "cass-1", topic: "Cassandra", topicColor: "#38bdf8", question: "Why is Cassandra better than DynamoDB for 500K writes/sec?", answer: "At that scale, Cassandra's per-write cost is much lower. DynamoDB on-demand at 500K writes/sec ≈ $54K/day.", explanation: "DynamoDB: $1.25/M write units × 500K/sec × 86,400 sec = ~$54,000/day = $1.6M/month. Cassandra: 12 EC2 i3.4xlarge × $2/hr = ~$17,280/month. Ops overhead is real but justified at Netflix scale." },
  { id: "cass-2", topic: "Cassandra", topicColor: "#38bdf8", question: "What is the partition key design principle in Cassandra?", answer: "Partition key determines which node stores the data. All rows with the same PK live on the same node. Design to spread writes evenly and keep partitions bounded.", explanation: "Bad PK: content_id for watch_history — one viral title creates a hot partition. Good PK: (profile_id, year) — writes spread across all user partitions, and year bucket prevents single partition from growing unboundedly." },
  { id: "cass-3", topic: "Cassandra", topicColor: "#38bdf8", question: "What is a Cassandra clustering key?", answer: "The secondary part of the primary key within a partition. Determines sort order within the partition. Enables range queries within a partition.", explanation: "watch_history PK=(profile_id, year), CK=watched_at DESC. All of a user's 2024 history lives in one partition, sorted newest-first. Query: 'give me the last 20 things user watched in 2024' — single partition, O(20) read." },
  { id: "cass-4", topic: "Cassandra", topicColor: "#38bdf8", question: "What does consistency level QUORUM mean vs LOCAL_ONE?", answer: "QUORUM: majority of replicas must respond. Safer for writes. LOCAL_ONE: nearest single replica. Fastest for reads.", explanation: "With RF=3 (3 copies): QUORUM = 2 must ack a write. If 1 node dies, the write still succeeded on 2. LOCAL_ONE read: returns data from fastest local replica, which may not have the latest write yet. OK for watch progress (3s staleness acceptable)." },
  { id: "cass-5", topic: "Cassandra", topicColor: "#38bdf8", question: "When should you use Cassandra's native TTL vs application-level cleanup?", answer: "Always prefer native TTL for time-bounded data. Application-level cleanup jobs are complex, can lag, and miss edge cases.", explanation: "Native TTL is enforced at write time — the expiry is stored alongside the data. Application-level DELETE jobs require scheduled tasks, error handling, re-run logic on failure, and can fall behind under high write load." },

  // Redis
  { id: "redis-1", topic: "Redis", topicColor: "#f87171", question: "Why is Redis not suitable as a primary data store?", answer: "Redis is not durable by default. On crash, RDB snapshots may be minutes old; AOF can lose up to 1 second. Always have a source of truth in Aurora or DynamoDB.", explanation: "Redis persistence (RDB + AOF) is best-effort. For session tokens: acceptable (users re-login). For billing data: unacceptable (losing a payment record = data loss). Rule: only store in Redis what you can recompute from a durable source." },
  { id: "redis-2", topic: "Redis", topicColor: "#f87171", question: "What eviction policy should you use for a cache workload?", answer: "allkeys-lru: evict least-recently-used keys when memory is full. Ensures the cache always accepts new writes.", explanation: "noeviction (default) would return errors when memory is full — never acceptable for a cache. volatile-lru only evicts keys with TTL — fails for keys without TTL (like recommendation caches). allkeys-lru is the standard choice for cache workloads." },
  { id: "redis-3", topic: "Redis", topicColor: "#f87171", question: "How does the cache-aside pattern work?", answer: "App checks cache first. On miss: fetch from DB, write to cache, return result. On hit: return from cache directly.", explanation: "get(key) → miss → DB query → set(key, value, TTL) → return. This pattern keeps the cache populated without requiring write-through on every DB write. The TTL handles cache invalidation as a safety net." },
  { id: "redis-4", topic: "Redis", topicColor: "#f87171", question: "Why use a Redis ZSET for search autocomplete?", answer: "ZRANGEBYLEX allows prefix matching in O(log N + M). ZINCRBY tracks query frequency. Sub-millisecond, scales to 1M+ terms.", explanation: "Members = query strings, scores = search frequency. ZRANGEBYLEX '[str' '[str\xff' returns all members starting with 'str'. Much faster than OpenSearch suggest API (10–20ms) for keystroke-level autocomplete." },
  { id: "redis-5", topic: "Redis", topicColor: "#f87171", question: "What happens when Redis goes down?", answer: "Circuit breaker in API Gateway detects the failure. Fallback: route reads to DynamoDB/Aurora (slower). Degrade gracefully — don't return errors.", explanation: "Recommendations: serve cold default rows from DynamoDB. Sessions: validate refresh token from DynamoDB sessions table (slower). Rate limiting: fail-open (allow requests) — better to allow some extra traffic than block all users." },

  // CAP
  { id: "cap-1", topic: "CAP Theorem", topicColor: "#22c55e", question: "What is the CAP theorem?", answer: "A distributed system can guarantee at most 2 of 3: Consistency, Availability, Partition Tolerance. Since partitions always happen, real choice is CP or AP.", explanation: "Consistency: every read returns the latest write. Availability: every request gets a response (not an error). Partition Tolerance: system continues during network splits. Network partitions are inevitable, so you always give up either C or A." },
  { id: "cap-2", topic: "CAP Theorem", topicColor: "#22c55e", question: "Which Netflix services are CP and which are AP?", answer: "CP: Auth and Billing (can't double-charge, can't allow invalid sessions). AP: everything else (watch history, recommendations, catalog, streaming, CDN).", explanation: "The business justification is the key. Auth/Billing CP because the cost of inconsistency is financial or security harm. Watch history AP because 3-second stale resume position is invisible to the user." },
  { id: "cap-3", topic: "CAP Theorem", topicColor: "#22c55e", question: "What is 'bounded staleness' in the context of AP systems?", answer: "Accepting eventual consistency with a defined maximum lag. Example: active stream count can be overcounted by at most 60 seconds.", explanation: "Pure AP can mean arbitrarily stale data. Bounded staleness defines a maximum acceptable lag. Redis stream counter TTL = 60s → max overcounting window = 60s. This is a stronger guarantee than pure AP but weaker than CP." },
  { id: "cap-4", topic: "CAP Theorem", topicColor: "#22c55e", question: "Common interview mistake when discussing CAP?", answer: "Saying 'this service is AP' without giving the business justification. Always state what the cost of inconsistency is and whether it's acceptable.", explanation: "Wrong: 'Watch history is AP.' Right: 'Watch history is AP — the worst case is your resume position is 30 seconds stale, which is invisible to the viewer. The availability benefit is we never block on a Cassandra partition.'" },
  { id: "cap-5", topic: "CAP Theorem", topicColor: "#22c55e", question: "If recommendations were CP instead of AP, what would change?", answer: "Homepage would return an error during Cassandra/Redis partition instead of showing stale rows. User experience would be catastrophically worse for an invisible consistency benefit.", explanation: "CP recommendations: correct rows OR no rows. AP recommendations: correct OR 6-hour-stale rows. 6-hour-stale recommendations are indistinguishable from fresh ones to the viewer. But a blank homepage causes immediate subscriber churn." },

  // Capacity
  { id: "cap-e-1", topic: "Capacity", topicColor: "#e50914", question: "What is the first number to derive in a capacity estimation?", answer: "Bandwidth. It's the biggest number and anchors the conversation. Start with peak concurrent viewers × average bitrate.", explanation: "15M viewers × 3 Mbps = 45 Tbps. That number — 45 Tbps = 15% of global internet traffic — immediately shows the interviewer you understand scale. Everything else flows from this anchor." },
  { id: "cap-e-2", topic: "Capacity", topicColor: "#e50914", question: "How do you derive peak RPS from DAU?", answer: "DAU × API calls/day ÷ 86,400 seconds = average RPS. Multiply by 3× for peak (prime time hour).", explanation: "150M DAU × 50 calls/day = 7.5B calls/day ÷ 86,400 = 87K avg RPS × 3 peak = 260K RPS. The 3× peak factor is standard for consumer services — 8pm–10pm prime time drives 3× average traffic." },
  { id: "cap-e-3", topic: "Capacity", topicColor: "#e50914", question: "How much storage does Netflix's video catalog require?", answer: "~850 TB encoded (17K titles × 50 GB each), ~4.25 PB raw masters (5× encoded).", explanation: "50 GB per title = 7 video quality levels × multiple audio tracks × subtitle files for 30+ languages. Raw masters (4K RAW, Prores) are 5× the encoded size. S3 Glacier Deep Archive for masters saves ~$1.1M/year vs Standard." },
  { id: "cap-e-4", topic: "Capacity", topicColor: "#e50914", question: "How do you size a Redis cluster for recommendations?", answer: "Number of active profiles × average recommendation payload size. 150M profiles × 1 KB = 150 GB. Round up to next cluster tier.", explanation: "1 KB per profile = top 50 recommended content IDs with scores. Redis r6g.4xlarge has 128 GB RAM — need 2 nodes for 150 GB with headroom. Add replication and you have a 3-node cluster (~384 GB total, ~40% utilized)." },
  { id: "cap-e-5", topic: "Capacity", topicColor: "#e50914", question: "How do you derive Kafka throughput from viewer count?", answer: "Peak concurrent viewers ÷ heartbeat interval = events/sec. 15M ÷ 30 = 500K events/sec.", explanation: "Each viewer emits one VideoWatched heartbeat every 30 seconds. At peak, 15M concurrent viewers = 500K events/sec. At 200 bytes/event = 100 MB/s Kafka throughput. Well within a 3-broker cluster's capacity (1 GB/s per broker)." },

  // DRM
  { id: "drm-1", topic: "DRM", topicColor: "#e879f9", question: "What is CENC and how does it enable multi-DRM?", answer: "Common Encryption: video encrypted once with AES-128-CTR. Each DRM system (Widevine/FairPlay/PlayReady) wraps the same content key differently in its license.", explanation: "Before CENC, Netflix stored 3 encrypted copies of every video. After CENC: 1 video, 3 license servers. The encryption algorithm is the same; only the key-wrapping format differs per DRM." },
  { id: "drm-2", topic: "DRM", topicColor: "#e879f9", question: "Which DRM system does each platform use?", answer: "Widevine (Google): Android, Chrome, Smart TVs. FairPlay (Apple): iOS, macOS, Safari, Apple TV. PlayReady (Microsoft): Windows, Xbox.", explanation: "Device manufacturers license these DRM systems from the respective vendors. Netflix must support all three to reach their full device ecosystem. CENC lets them do this with one encoded video file." },
  { id: "drm-3", topic: "DRM", topicColor: "#e879f9", question: "Why does DRM license expiry matter for security?", answer: "Short TTL (8h streaming, 48h download) bounds the blast radius of a compromised device or leaked license.", explanation: "If a device is compromised and a DRM license is extracted, the attacker can only decrypt content for 8 hours. After expiry, the device must call the license server again — at which point a revoked device is rejected." },
  { id: "drm-4", topic: "DRM", topicColor: "#e879f9", question: "Where are DRM content keys stored?", answer: "AWS CloudHSM — Hardware Security Module. Keys never leave the hardware, never appear in application memory or logs.", explanation: "CloudHSM is a FIPS 140-2 Level 3 certified hardware device. The DRM Service calls CloudHSM to wrap the content key for the client's DRM system. The actual key material is never transmitted over the network or stored in software." },
  { id: "drm-5", topic: "DRM", topicColor: "#e879f9", question: "What is forensic watermarking and what does it detect?", answer: "Unique invisible watermark per stream tied to subscriber's profile_id. If content leaks on piracy sites, decode the watermark to identify the source account.", explanation: "Forensic watermarking is different from visible watermarking. It's imperceptible to the viewer. Implemented at transcoding time using NAGRA/Irdeto. If a piracy site posts a Netflix episode, the watermark survives compression and identifies the subscriber." },
];

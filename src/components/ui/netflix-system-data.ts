// ═══════════════════════════════════════════════════════════════
// Faithful data from Netflix_System_Design_Complete.md
// ═══════════════════════════════════════════════════════════════

export const SCALE_NUMBERS = [
  { metric: "Subscribers", number: "260–300 million" },
  { metric: "Peak concurrent streams", number: "60 million" },
  { metric: "API requests per second", number: "1 million+" },
  { metric: "Events per day (analytics)", number: "700 billion" },
  { metric: "Data per day", number: "1.5 PB compressed" },
  { metric: "Peak event ingestion", number: "15 million events/s" },
  { metric: "Open Connect Appliances (CDN)", number: "~17,000 globally" },
  { metric: "Countries", number: "190+" },
  { metric: "Microservices", number: "1,000+" },
  { metric: "Cassandra nodes", number: "~10,000" },
  { metric: "Kafka events per day", number: "~700 billion (1T raw before dedup)" },
  { metric: "Encoding variants per title", number: "1,200+" },
  { metric: "Titles in catalog", number: "36,000+" },
];



export type Service = {
  id: string;
  section: string;
  label: string;
  category: "Core Services" | "Platform Services" | "Infrastructure" | "Data Layer";
  whatItDoes: string;
  responsibilities: string[];
  techStack?: string;
  apiRoutes?: string;
  classesAndMethods: string;
  dbTables?: string;
  keyInsight?: string;
};

export const SERVICES: Service[] = [
  {
    id: "client",
    section: "1.2",
    label: "Client Layer",
    category: "Core Services",
    whatItDoes: `Every device Netflix runs on — Smart TV, iOS, Android, Web (React), Roku, PlayStation, Xbox. Each platform has a native SDK. The client authenticates, fetches metadata via API, then streams video DIRECTLY from the nearest OCA. Adaptive bitrate algorithm (BOLA) switches quality chunk-by-chunk based on buffer health and bandwidth.`,
    responsibilities: [
      "Bootstrap auth flow → get JWT + refresh token",
      "Fetch homepage, catalog, search results from API",
      "Call Playback Service → receive signed DASH/HLS manifest",
      "Stream video chunks directly from nearest OCA (not the API!)",
      "BOLA adaptive bitrate switching mid-stream",
      "DRM decryption inside Trusted Execution Environment (TEE)",
      "Heartbeat POST every 30s → update resume position",
      "Offline download with DRM-encrypted local files",
      "Report QoE events: buffer stalls, bitrate changes, errors",
    ],
    techStack: "React 18 (Web), Swift UIKit/SwiftUI (iOS/tvOS), Kotlin (Android), DASH (MPD manifests), HLS (m3u8 manifests), Widevine CDM, FairPlay Streaming, PlayReady",
    classesAndMethods: `NetflixApp
  launch() → void
  authenticate(credentials) → Session
  loadHomePage(profileId) → HomePage
  startPlayback(titleId, episodeId) → PlaybackSession

PlaybackEngine
  fields:
    currentBitrate: Int
    bufferHealthMs: Long
    sessionId: UUID
    manifestUrl: String
  methods:
    loadManifest(url) → Manifest
    selectQuality(bandwidth, buffer) → QualityLevel   // BOLA algorithm
    downloadChunk(url, range) → Chunk
    decryptChunk(chunk, drmKey) → RawFrame
    sendHeartbeat(positionMs, bitrate)

DRMManager
  acquireLicense(keyId, licenseUrl) → License
  renewLicense(licenseId) → License
  revokeLicense(licenseId)
  isLicenseValid(licenseId) → Boolean

OfflineManager
  downloadEpisode(episodeId, quality) → Download
  getDownloads() → List<Download>
  deleteDownload(downloadId)
  isExpired(downloadId) → Boolean    // 48h after first play

QoEReporter
  reportPlayStart(sessionId)
  reportBufferStall(sessionId, durationMs)
  reportBitrateChange(sessionId, fromKbps, toKbps)
  reportError(sessionId, errorCode, message)`,
    keyInsight: undefined,
  },
  {
    id: "oca",
    section: "1.3",
    label: "Open Connect (CDN)",
    category: "Infrastructure",
    whatItDoes: `Netflix's own CDN. ~17,000 Open Connect Appliances (OCAs) co-located inside ISP data centers globally — free colocation for ISPs in exchange for better peering. 3-tier hierarchy: Embed OCA (inside ISP) → Exchange OCA (at IXPs) → Netflix Origin (S3). During off-peak hours, a fill algorithm proactively pushes predicted-popular content to OCAs. ~100 Tbps peak bandwidth served.`,
    responsibilities: [
      "Serve all video chunks to clients",
      "Proactive nightly cache fill based on popularity prediction",
      "3-tier hierarchy: Embed → Exchange → S3 Origin fallback",
      "BGP Anycast routing for nearest OCA resolution",
      "Cache miss → fetch from tier above, cache locally",
      "Health reporting to Steering Service every 10s",
      "Serve signed URLs only — reject unsigned requests",
    ],
    techStack: "Custom OCA hardware (100TB NVMe + HDD), FreeBSD, nginx (custom), BGP Anycast, HTTPS with signed URL tokens",
    classesAndMethods: `OCA
  fields:
    ocaId: String
    ispId: String
    tier: Enum(EMBED | EXCHANGE | ORIGIN)
    capacityTB: Int
    cachedTitles: Set<VideoId>
    healthScore: Float
  methods:
    serveChunk(videoId, range, token) → Chunk
    isCached(videoId) → Boolean
    fetchFromUpstream(videoId) → void
    reportHealth() → HealthReport

CacheFillScheduler
  predictPopularContent(region, date) → List<VideoId>
  scheduleFill(ocaId, videoIds) → FillJob
  executeFill(fillJobId) → void
  getFillStatus(fillJobId) → FillStatus`,
    keyInsight: "During Chaos Kong tests, Netflix takes down an entire AWS region and verifies Route53 shifts traffic automatically within 30s.",
  },
  {
    id: "elb",
    section: "1.4",
    label: "AWS ELB + Route53",
    category: "Infrastructure",
    whatItDoes: `Netflix runs on AWS. ELB is the first hop for all API traffic — distributes across Zuul2 instances in multiple AZs. Route53 health checks detect region failures and shift traffic within ~30s. Netflix runs active-active across 3 AWS regions: us-east-1, us-west-2, eu-west-1.`,
    responsibilities: [
      "Layer 7 load balancing across Zuul2 fleet",
      "Health checks on Zuul instances",
      "SSL/TLS termination at edge",
      "Cross-AZ traffic distribution",
      "Route53 DNS failover between regions (30s RTO)",
      "DDoS protection via AWS Shield",
    ],
    classesAndMethods: `RegionRouter
  resolveRegion(clientIP) → Region
  isRegionHealthy(region) → Boolean
  failover(fromRegion, toRegion) → void`,
    keyInsight: "During Chaos Kong tests, Netflix takes down an entire AWS region and verifies Route53 shifts traffic automatically within 30s.",
  },
  {
    id: "eureka",
    section: "1.5",
    label: "Eureka + Ribbon (Service Mesh)",
    category: "Infrastructure",
    whatItDoes: `Eureka is Netflix's open-sourced service registry — each microservice registers itself on startup and sends heartbeats every 30s. Ribbon is the client-side load balancer — every service uses Ribbon to discover and call other services without a central proxy. Combines with Archaius for dynamic config and Hystrix for circuit breaking.`,
    responsibilities: [
      "Service registration on startup",
      "Heartbeat-based health tracking (30s intervals)",
      "Service discovery for all inter-service calls",
      "Client-side load balancing via Ribbon (round-robin / weighted)",
      "Zone-aware routing — prefer same AZ",
      "Self-preservation mode — don't evict if >85% of services miss heartbeat",
    ],
    classesAndMethods: `EurekaClient
  fields:
    serviceId: String
    instanceId: String
    ipAddr: String
    port: Int
    status: UP | DOWN | STARTING | OUT_OF_SERVICE
  methods:
    register() → void
    sendHeartbeat() → void     // every 30s
    deregister() → void
    getInstances(serviceId) → List<InstanceInfo>

RibbonLoadBalancer
  chooseServer(serviceId) → Server    // round-robin / zone-aware
  markServerDown(server)
  getAllServers(serviceId) → List<Server>

Archaius
  getProperty(key) → String
  setProperty(key, value) → void    // hot-reload without restart
  getDynamicIntProperty(key, default) → DynamicIntProperty`,
  },
  {
    id: "zuul",
    section: "1.6",
    label: "Zuul2 API Gateway",
    category: "Infrastructure",
    whatItDoes: `Single entry point for all client API traffic. Zuul2 (async, non-blocking via Netty) replaced Zuul1 (thread-per-request). Every inbound request passes through a filter chain: pre-filters (auth, rate limit), routing filters (pick microservice), post-filters (logging, response decoration), error filters. Handles >1M requests/second.`,
    responsibilities: [
      "JWT validation on every request",
      "Rate limiting: per-user (100 req/s), per-device, per-IP",
      "Request routing to 1000+ microservices via Eureka",
      "A/B test traffic splitting (route % to experiment variant)",
      "SSL termination + HTTP/2 support",
      "Correlation ID injection (tracing)",
      "GZIP compression of responses",
      "Request/response logging to Kafka",
    ],
    apiRoutes: `ALL /*   → All routes proxied through Zuul — no direct service exposure`,
    classesAndMethods: `ZuulFilter (abstract)
  fields:
    filterType: pre | route | post | error
    filterOrder: Int
    shouldFilter: Boolean
  methods:
    shouldFilter() → Boolean
    run() → Object
    filterType() → String
    filterOrder() → Int

AuthFilter extends ZuulFilter
  validateJWT(token) → Claims
  extractUserId(claims) → UUID
  extractDeviceId(claims) → UUID
  run() → void    // throws 401 if invalid

RateLimitFilter extends ZuulFilter
  getUserBucket(userId) → RateBucket
  checkLimit(bucket, limit) → Boolean   // throws 429 if exceeded
  incrementCounter(userId, endpoint)

RoutingFilter extends ZuulFilter
  resolveService(path) → ServiceId
  getInstance(serviceId) → InstanceInfo    // via Ribbon
  forwardRequest(instance, request) → Response

LoggingFilter extends ZuulFilter
  injectCorrelationId(request) → String
  logRequest(correlationId, userId, path, ms)
  publishToKafka(accessLog)`,
  },
  {
    id: "auth",
    section: "1.7",
    label: "Auth Service",
    category: "Core Services",
    whatItDoes: `Issues and validates JWTs, manages OAuth2 social login, device registry, and session lifecycle. Access tokens: 15-minute TTL (RS256 signed). Refresh tokens: 30-day TTL stored in Redis. Supports account linking (Facebook, Google, Apple Sign-In). Device fingerprinting detects account sharing.`,
    responsibilities: [
      "Login with email/password (bcrypt hash comparison)",
      "OAuth2: Google, Facebook, Apple Sign-In",
      "Issue JWT access token (15 min) + refresh token (30 days)",
      "Token refresh without re-login",
      "Revoke all sessions (account compromise)",
      "Device registration and fingerprinting",
      "Password reset flow (email token, 1h TTL)",
      "MFA support (TOTP authenticator apps)",
    ],
    techStack: "Redis (sessions + refresh tokens), MySQL (device registry, OAuth accounts), JWT RS256, bcrypt (cost 12), TOTP (RFC 6238)",
    apiRoutes: `POST   /auth/login                    → email + password → access_token, refresh_token, deviceId
POST   /auth/logout                   → Invalidate session, delete refresh token from Redis
POST   /auth/refresh                  → refresh_token → new access_token (rotate refresh token)
DELETE /auth/sessions                 → Revoke ALL sessions for userId (account compromise)
POST   /auth/oauth/:provider          → OAuth2 callback → link account or create new user
POST   /auth/password/reset/request   → Send reset email with signed token (1h TTL)
POST   /auth/password/reset/confirm   → token + newPassword → update hash, revoke sessions
GET    /auth/devices                  → List all registered devices for userId
DELETE /auth/devices/:deviceId        → Remove trusted device`,
    classesAndMethods: `AuthService
  login(email, password, deviceInfo) → AuthToken
  logout(accessToken) → void
  refreshToken(refreshToken) → AuthToken
  validateToken(token) → Claims
  revokeAllSessions(userId) → void
  registerDevice(userId, fingerprint) → Device

AuthToken
  fields:
    accessToken: JWT        // 15 min, RS256
    refreshToken: UUID      // 30 days, stored in Redis
    tokenType: 'Bearer'
    expiresIn: 900
    deviceId: UUID
    profileId: UUID

Device
  fields:
    deviceId: UUID
    userId: UUID
    deviceType: TV | MOBILE | WEB | TABLET | GAME_CONSOLE
    fingerprint: String
    lastSeen: Timestamp
    trusted: Boolean
    name: String            // e.g. "John's iPhone"

PasswordResetService
  requestReset(email) → void
  validateResetToken(token) → UserId
  confirmReset(token, newPassword) → void

OAuthService
  handleCallback(provider, code) → AuthToken
  linkAccount(userId, provider, oauthId) → void
  unlinkAccount(userId, provider) → void

SessionStore (Redis)
  storeRefreshToken(userId, deviceId, token, ttl)
  getRefreshToken(token) → Session
  deleteRefreshToken(token)
  deleteAllUserSessions(userId)`,
    dbTables: `-- MySQL: auth_db

CREATE TABLE users (
    user_id        BINARY(16) PRIMARY KEY,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password_hash  VARCHAR(60) NOT NULL,    -- bcrypt cost 12
    plan           ENUM('BASIC','STANDARD','PREMIUM') NOT NULL,
    country_code   CHAR(2) NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_email (email)
);

CREATE TABLE devices (
    device_id    BINARY(16) PRIMARY KEY,
    user_id      BINARY(16) NOT NULL,
    device_type  ENUM('TV','MOBILE','WEB','TABLET','GAME_CONSOLE'),
    fingerprint  VARCHAR(512),
    last_seen    DATETIME,
    trusted      TINYINT(1) DEFAULT 0,
    name         VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX idx_user (user_id)
);

CREATE TABLE oauth_accounts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      BINARY(16) NOT NULL,
    provider     ENUM('GOOGLE','FACEBOOK','APPLE'),
    oauth_id     VARCHAR(255) NOT NULL,
    linked_at    DATETIME,
    UNIQUE KEY uk_provider_oauth (provider, oauth_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Redis key patterns (not SQL tables):
-- refresh:{token_uuid}         → { userId, deviceId, expiresAt }   TTL 30d
-- reset:{token}                → userId                             TTL 1h
-- notif_sent:{userId}:{type}   → 1                                  TTL 24h`,
  },
  {
    id: "user",
    section: "1.8",
    label: "User Service",
    category: "Core Services",
    whatItDoes: `Manages user accounts, up to 5 profiles per account, preferences, watch history, and parental controls. Strict ACID consistency needed — changes to email/plan tie to billing. Profile-level isolation: each profile has its own watch history, recommendations, and maturity rating.`,
    responsibilities: [
      "Manage up to 5 profiles per account",
      "Store watch history per profile",
      "My List (watchlist) management",
      "Parental controls via maturity ratings",
      "Profile-level isolation",
    ],
    apiRoutes: `GET    /users/me                                      → Get current user account details
PATCH  /users/me                                      → Update email, country, communication prefs
GET    /users/me/profiles                             → List all profiles for account
POST   /users/me/profiles                             → Create new profile (max 5)
PATCH  /users/me/profiles/:profileId                  → Update profile name, avatar, language, maturity
DELETE /users/me/profiles/:profileId                  → Delete profile (irreversible, removes history)
GET    /users/me/profiles/:profileId/history          → Paginated watch history
DELETE /users/me/profiles/:profileId/history/:titleId → Remove title from history
GET    /users/me/list                                 → My List (watchlist) for active profile
PUT    /users/me/list/:titleId                        → Add title to My List
DELETE /users/me/list/:titleId                        → Remove from My List`,
    classesAndMethods: `User
  fields:
    userId: UUID
    email: String
    passwordHash: String     // bcrypt
    plan: BASIC | STANDARD | PREMIUM
    countryCode: String
    createdAt: Timestamp
    emailVerified: Boolean

Profile
  fields:
    profileId: UUID
    userId: UUID
    name: String
    avatarUrl: String
    maturityRating: LITTLE_KIDS | OLDER_KIDS | TEEN | ALL
    pinEnabled: Boolean
    pinHash: String
    language: String
    audioLanguage: String
    subtitleLanguage: String

WatchHistoryService
  recordWatch(profileId, titleId, episodeId, positionMs, completedAt)
  getHistory(profileId, page, limit) → List<WatchEvent>
  getContinueWatching(profileId) → List<WatchEvent>
  removeFromHistory(profileId, titleId)

WatchEvent
  fields:
    watchId: UUID
    profileId: UUID
    titleId: UUID
    episodeId: UUID
    positionMs: Long
    durationMs: Long
    watchedAt: Timestamp
    completed: Boolean

MyListService
  addTitle(profileId, titleId) → void
  removeTitle(profileId, titleId) → void
  getList(profileId) → List<TitleId>
  isInList(profileId, titleId) → Boolean`,
    dbTables: `-- MySQL: user_db (sharded by userId)

CREATE TABLE profiles (
    profile_id       BINARY(16) PRIMARY KEY,
    user_id          BINARY(16) NOT NULL,
    name             VARCHAR(100) NOT NULL,
    avatar_url       VARCHAR(512),
    maturity_rating  ENUM('LITTLE_KIDS','OLDER_KIDS','TEEN','ALL') DEFAULT 'ALL',
    pin_enabled      TINYINT(1) DEFAULT 0,
    pin_hash         VARCHAR(60),
    language         VARCHAR(10),
    audio_language   VARCHAR(10),
    subtitle_language VARCHAR(10),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
);

-- Cassandra: watch history (high write volume)
-- watch_history table
PRIMARY KEY ((profile_id, year), watched_at) WITH CLUSTERING ORDER BY (watched_at DESC)
  profile_id    UUID
  year          INT
  watched_at    TIMESTAMP
  title_id      UUID
  episode_id    UUID
  position_ms   BIGINT
  duration_ms   BIGINT
  completed     BOOLEAN`,
  },
  {
    id: "catalog",
    section: "1.9",
    label: "Catalog Service",
    category: "Core Services",
    whatItDoes: `Central repository of all Netflix content metadata — 36,000+ titles, localized for 190+ countries. Handles movies, series, seasons, episodes, trailers, supplemental content. Heavily read-cached via EVCache. Writes are rare (new content ingestion) but reads happen on every page load.`,
    responsibilities: [
      "Serve title metadata on every page load",
      "Multi-layer cache: EVCache (5 min TTL) → Cassandra → Elasticsearch",
      "Regional availability filtering",
      "Maturity rating filtering by profile",
    ],
    apiRoutes: `GET /catalog/titles/:titleId                                   → Full title metadata
GET /catalog/titles/:titleId/seasons                          → All seasons for a series
GET /catalog/titles/:titleId/seasons/:seasonId/episodes       → Episodes in a season
GET /catalog/genres                                           → List all genres for region
GET /catalog/genres/:genreId/titles                           → Paginated titles in genre
GET /catalog/trending?region=US                               → Trending titles (cached)
GET /catalog/new-releases?region=US                           → New releases this week
GET /catalog/titles/:titleId/similar                          → Similar titles`,
    classesAndMethods: `Title
  fields:
    titleId: UUID
    type: MOVIE | SERIES | SHORT | DOCUMENTARY | STANDUP
    originalTitle: String
    localizedTitles: Map<Locale, String>
    localizedSynopses: Map<Locale, String>
    genres: List<Genre>
    cast: List<CastMember>
    directors: List<Person>
    releaseYear: Int
    durationMs: Long              // for MOVIE
    availableCountries: Set<CountryCode>
    maturityRatings: Map<CountryCode, String>
    averageRating: Float
    thumbnailUrls: Map<ArtworkType, String>

Season
  fields:
    seasonId: UUID
    titleId: UUID
    seasonNumber: Int
    releaseYear: Int
    episodeCount: Int
    synopsis: String

Episode
  fields:
    episodeId: UUID
    seasonId: UUID
    episodeNumber: Int
    title: String
    synopsis: String
    durationMs: Long
    videoId: UUID
    thumbnailUrl: String
    releaseDate: Date

CastMember
  fields:
    personId: UUID
    name: String
    role: String
    characterName: String
    orderIndex: Int`,
    dbTables: `-- Cassandra: catalog_db (partition by titleId, high read throughput)

titles table
  PRIMARY KEY (title_id)
  title_id          UUID
  type              TEXT
  original_title    TEXT
  release_year      INT
  duration_ms       BIGINT
  average_rating    FLOAT
  created_at        TIMESTAMP
  updated_at        TIMESTAMP

title_availability table   -- which countries can watch
  PRIMARY KEY (title_id, country_code)
  title_id        UUID
  country_code    TEXT
  available_from  DATE
  available_until DATE
  maturity_rating TEXT

localized_metadata table
  PRIMARY KEY (title_id, locale)
  title_id   UUID
  locale     TEXT
  title      TEXT
  synopsis   TEXT

episodes table
  PRIMARY KEY ((title_id, season_number), episode_number)
  title_id         UUID
  season_number    INT
  episode_number   INT
  episode_id       UUID
  episode_title    TEXT
  synopsis         TEXT
  duration_ms      BIGINT
  thumbnail_url    TEXT
  release_date     DATE`,
  },
  {
    id: "playback",
    section: "1.10",
    label: "Playback Service",
    category: "Platform Services",
    whatItDoes: `Most critical service — target latency < 300ms. Checks entitlement, enforces concurrent stream limits, selects the best OCA via Steering Service, generates a signed DASH/HLS manifest URL, and returns a DRM license token. The client then streams video DIRECTLY from the OCA — this service is completely out of the video path after manifest delivery.`,
    responsibilities: [
      "Check billing entitlement (active subscription?)",
      "Acquire stream slot from Concurrency Service",
      "Call Steering Service → get best OCA endpoint",
      "Generate signed manifest URL (HMAC-SHA256, 6h TTL)",
      "Generate DRM license token (Widevine/FairPlay/PlayReady)",
      "Write initial resume position to Cassandra",
      "Publish PLAY event to Kafka topic: playback-events",
      "Handle heartbeat events → update resume position",
      "Release stream slot on END event",
    ],
    apiRoutes: `POST /playback/start                          → { titleId, episodeId, deviceInfo } → PlaybackManifest
POST /playback/:sessionId/heartbeat           → { positionMs, bitrate, bufferMs } → 200 OK
POST /playback/:sessionId/end                 → { positionMs, reason } → release slot
GET  /playback/resume/:episodeId              → Get last resume position for profile
POST /playback/:sessionId/event               → Report QoE event (buffer, quality change)`,
    classesAndMethods: `PlaybackService
  startPlayback(userId, titleId, episodeId, deviceInfo) → PlaybackManifest
  heartbeat(sessionId, event) → void
  endPlayback(sessionId, finalPositionMs) → void
  getResumePosition(profileId, episodeId) → Long

PlaybackManifest
  fields:
    sessionId: UUID
    manifestUrl: String        // signed, 6h TTL, HMAC-SHA256
    licenseUrl: String         // DRM license endpoint
    heartbeatIntervalMs: 30000
    encodingProfiles: List<EncodingProfile>
    expiresAt: Timestamp

PlaybackEvent
  fields:
    sessionId: UUID
    eventType: PLAY | PAUSE | SEEK | BUFFER_START | BUFFER_END | QUALITY_CHANGE | HEARTBEAT | END | ERROR
    positionMs: Long
    bitrateKbps: Int
    bufferHealthMs: Long
    errorCode: String
    timestamp: Timestamp

EncodingProfile
  fields:
    profileId: String           // e.g. 'hd-h264-5800k'
    codec: H264 | H265 | AV1 | VP9
    resolution: 480p | 720p | 1080p | 4K
    bitrateKbps: Int
    hdr: NONE | HDR10 | DOLBY_VISION
    audioCodec: AAC | AC3 | ATMOS`,
    dbTables: `-- Cassandra: playback_db

resume_position table
  PRIMARY KEY (profile_id, episode_id)
  profile_id   UUID
  episode_id   UUID
  position_ms  BIGINT
  updated_at   TIMESTAMP
  session_id   UUID

active_sessions table
  PRIMARY KEY (session_id)
  session_id   UUID
  user_id      UUID
  profile_id   UUID
  episode_id   UUID
  device_type  TEXT
  started_at   TIMESTAMP
  last_beat_at TIMESTAMP
  oca_id       TEXT`,
    keyInsight: "startPlayback() target: < 300ms p99. After manifest returned, API servers are completely out of the hot path — all video bytes flow Client ↔ OCA.",
  },
  {
    id: "billing",
    section: "1.11",
    label: "Billing Service",
    category: "Platform Services",
    whatItDoes: `Manages subscriptions, payment processing, and plan entitlement. Uses MySQL for ACID guarantees — money requires strict consistency. Payment cards are never stored raw — tokenized via Stripe/Braintree. Failed payments trigger a retry schedule (3 attempts over 30 days) before subscription suspension. Publishes entitlement events to Kafka consumed by Playback Service.`,
    responsibilities: [
      "Manage subscription plans and billing cycles",
      "Process payments (credit card, PayPal, Apple Pay)",
      "Track entitlements (streams, quality, downloads)",
      "Expose entitlement check API for Playback Service",
      "Retry failed payments (day 1, 7, 14, 30)",
    ],
    apiRoutes: `GET    /billing/subscription              → Get current subscription details
POST   /billing/subscription              → Create subscription { plan, paymentMethodId }
PATCH  /billing/subscription              → Change plan (proration applied)
DELETE /billing/subscription              → Cancel at end of billing period
POST   /billing/payment-methods           → Add payment method (Stripe token)
DELETE /billing/payment-methods/:id       → Remove payment method
GET    /billing/invoices                  → Paginated invoice history
GET    /billing/invoices/:id/pdf          → Download invoice PDF
POST   /billing/promo                     → Redeem promo/gift code`,
    classesAndMethods: `Subscription
  fields:
    subscriptionId: UUID
    userId: UUID
    plan: BASIC | STANDARD | PREMIUM
    status: ACTIVE | CANCELLED | PAUSED | PAST_DUE | TRIALING
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: Boolean
    paymentMethodId: UUID

PaymentMethod
  fields:
    paymentMethodId: UUID
    userId: UUID
    stripeTokenId: String     // never store raw PAN
    type: CREDIT | DEBIT | PAYPAL | GIFT_CARD
    lastFour: String
    brand: String
    expiryMonth: Int
    expiryYear: Int
    isDefault: Boolean

Invoice
  fields:
    invoiceId: UUID
    userId: UUID
    amount: Money
    currency: String
    status: PAID | OPEN | VOID
    items: List<InvoiceItem>
    createdAt: Date
    paidAt: Date

PaymentRetrySchedule
  scheduleRetry(userId, attempt) → void    // day 1, 7, 14, 30
  executeRetry(userId) → PaymentResult
  suspendOnFailure(userId) → void          // after 4 failures`,
    dbTables: `-- MySQL: billing_db (sharded by userId)

CREATE TABLE subscriptions (
    subscription_id       BINARY(16) PRIMARY KEY,
    user_id               BINARY(16) NOT NULL,
    plan                  ENUM('BASIC','STANDARD','PREMIUM') NOT NULL,
    status                ENUM('ACTIVE','CANCELLED','PAST_DUE','PAUSED','TRIALING') NOT NULL,
    current_period_start  DATE NOT NULL,
    current_period_end    DATE NOT NULL,
    cancel_at_period_end  TINYINT(1) DEFAULT 0,
    stripe_subscription_id VARCHAR(255),
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

CREATE TABLE payment_methods (
    payment_method_id  BINARY(16) PRIMARY KEY,
    user_id            BINARY(16) NOT NULL,
    stripe_token_id    VARCHAR(255) NOT NULL,    -- no raw PAN ever
    type               ENUM('CREDIT','DEBIT','PAYPAL','GIFT_CARD'),
    last_four          CHAR(4),
    brand              VARCHAR(20),
    expiry_month       TINYINT,
    expiry_year        SMALLINT,
    is_default         TINYINT(1) DEFAULT 0,
    INDEX idx_user (user_id)
);

CREATE TABLE invoices (
    invoice_id   BINARY(16) PRIMARY KEY,
    user_id      BINARY(16) NOT NULL,
    amount_cents INT NOT NULL,
    currency     CHAR(3) NOT NULL DEFAULT 'USD',
    status       ENUM('PAID','OPEN','VOID') NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at      DATETIME,
    INDEX idx_user (user_id),
    INDEX idx_status_created (status, created_at)
);`,
    keyInsight: "BASIC: $6.99/mo | 1 stream | 480p | no downloads. STANDARD: $15.49/mo | 2 streams | 1080p | 2 devices. PREMIUM: $22.99/mo | 4 streams | 4K + HDR | 6 devices.",
  },
  {
    id: "recommendation",
    section: "1.12",
    label: "Recommendation Service",
    category: "Platform Services",
    whatItDoes: `80% of watched content comes from recommendations. Uses matrix factorization + two-tower neural networks for collaborative filtering. Contextual bandits determine homepage row ordering. Even thumbnail artwork is personalized per user via a separate multi-armed bandit model. Offline Spark jobs retrain models nightly; online layer does lightweight re-ranking at request time.`,
    responsibilities: [
      "Personalize homepage rows per profile",
      "Two-tower neural model scoring",
      "Contextual bandit row ordering",
      "UCB bandit artwork selection",
      "Fallback: trending titles from EVCache",
    ],
    apiRoutes: `GET /recommendations/homepage/:profileId?device=         → Full personalized homepage
GET /recommendations/similar/:titleId?profileId=         → Titles similar to given title
GET /recommendations/row/:profileId?rowType=             → Single row: CONTINUE_WATCHING | TOP_10 | TRENDING | BECAUSE_YOU_WATCHED`,
    classesAndMethods: `RecommendationService
  getHomepage(profileId, deviceType, timestamp) → HomePage
  getSimilarTitles(titleId, profileId, limit) → List<RankedTitle>
  getRow(profileId, rowType, limit) → HomeRow
  rankCandidates(profileId, candidates) → List<RankedTitle>

HomePage
  fields:
    profileId: UUID
    rows: List<HomeRow>
    generatedAt: Timestamp
    experimentVariant: String

HomeRow
  fields:
    rowId: String
    displayTitle: String     // e.g. "Because you watched Stranger Things"
    algorithm: TWO_TOWER | TRENDING | CONTINUE_WATCHING | TOP10 | NEW_RELEASES
    titles: List<RankedTitle>
    rank: Int                // row position, bandit-determined

RankedTitle
  fields:
    title: Title
    score: Float
    artworkVariant: String   // A/B tested per user segment
    reason: String

TwoTowerModel
  getUserEmbedding(profileId) → Float[]    // 256-dim vector
  getItemEmbedding(titleId) → Float[]
  score(userEmb, itemEmb) → Float          // dot product similarity
  getTopK(profileId, k) → List<TitleId>

ArtworkBandit
  selectArtwork(profileId, titleId) → ArtworkVariant
  recordImpression(profileId, titleId, variant)
  recordClick(profileId, titleId, variant)
  updateModel() → void                     // UCB algorithm`,
    dbTables: `-- Cassandra: recommendations table
PRIMARY KEY (profile_id, row_type, rank)
  profile_id   UUID
  row_type     TEXT
  rank         INT
  title_id     UUID
  score        FLOAT
  artwork_id   TEXT
  computed_at  TIMESTAMP`,
    keyInsight: "Artwork personalization — a romance viewer sees a couple, an action viewer sees an explosion for the same title. Drives ~20% uplift in click-through rate.",
  },
  {
    id: "concurrency",
    section: "1.13",
    label: "Concurrency Control",
    category: "Platform Services",
    whatItDoes: `Enforces simultaneous stream limits per plan (Basic: 1, Standard: 2, Premium: 4). Uses Redis atomic INCR/DECR with TTL. The heartbeat from the client (every 30s) refreshes the TTL — if the client crashes without explicitly calling END, the slot auto-frees when TTL expires (36s TTL).`,
    responsibilities: [
      "Atomic check-and-increment via Redis Lua",
      "36-second TTL auto-expiry for crashed sessions",
      "Heartbeat refreshes TTL every 30s",
      "Prevent TOCTOU race conditions",
    ],
    classesAndMethods: `ConcurrencyService
  acquireStream(userId, deviceId, sessionId) → StreamToken   // HTTP 429 if over limit
  releaseStream(sessionId) → void
  heartbeat(sessionId) → void                                // refresh TTL to 36s
  getActiveStreams(userId) → List<StreamInfo>
  getPlanLimit(userId) → Int

StreamToken
  fields:
    sessionId: UUID
    userId: UUID
    deviceId: UUID
    acquiredAt: Timestamp
    expiresAt: Timestamp      // now + 36s, refreshed by heartbeat

StreamInfo
  fields:
    sessionId: UUID
    deviceType: String
    location: String          // IP-derived
    titleId: UUID
    startedAt: Timestamp

Redis Key Design:
  streams:{userId}        → count (INCR/DECR, TTL 36s refreshed by heartbeat)
  stream_set:{userId}     → Set<sessionId> (SADD/SREM)`,
    keyInsight: "The acquire uses a Lua script: check count < limit, INCR, SADD in a single atomic operation — prevents TOCTOU race conditions.",
  },
  {
    id: "drm",
    section: "1.14",
    label: "DRM License Service",
    category: "Platform Services",
    whatItDoes: `Issues DRM licenses for Widevine (Android/Chrome), FairPlay (Apple), and PlayReady (Windows/Xbox). A license contains the decryption key for the requested content — issued only to verified, entitled users with a valid playback session. Keys are never persisted on the client unencrypted; they live only in the device's TEE.`,
    responsibilities: [
      "Issue Widevine licenses (Android/Chrome/Smart TVs)",
      "Issue FairPlay licenses (iOS/macOS/Safari)",
      "Issue PlayReady licenses (Windows/Xbox/Edge)",
      "Validate session token and entitlement",
      "Deliver key to TEE only",
    ],
    classesAndMethods: `DRMLicenseService
  issueWidevineLicense(sessionToken, licenseRequest) → WidevineLicense
  issueFairPlayLicense(sessionToken, spcBlob) → CKCResponse
  issuePlayReadyLicense(sessionToken, challenge) → PlayReadyLicense
  revokeLicense(sessionId) → void
  isEntitled(userId, titleId) → Boolean

ContentKey
  fields:
    keyId: UUID
    keyValue: Bytes          // stored in HSM, never in DB plaintext
    titleId: UUID
    algorithm: AES128_CBC | AES128_CTR
    rotatedAt: Timestamp`,
    keyInsight: "Decryption keys only ever exist in the device TEE (ARM TrustZone / Intel SGX). If the device is jailbroken, Widevine L1 is refused; L3 (software-only) is issued with lower quality cap (max 480p).",
  },
  {
    id: "encoding",
    section: "1.15",
    label: "Encoding Pipeline",
    category: "Platform Services",
    whatItDoes: `Raw studio masters (4K ProRes, 8K RED RAW) become 1,200+ encoded versions per title — every combination of resolution × codec × HDR × audio. Netflix's key innovation: Per-Title Encoding. Each title's scene complexity is analyzed; bitrate per chunk is assigned based on actual visual complexity, not a fixed ladder. Saves ~20% bandwidth at same quality (same VMAF score).`,
    responsibilities: [
      "Analyze visual complexity (DCT spatial + motion vector temporal)",
      "Build per-title bitrate ladder",
      "Encode all variants in parallel (1,200+ per title)",
      "Encrypt with AES-128",
      "Publish to OCA CDN",
    ],
    classesAndMethods: `EncodingPipeline
  ingestMaster(titleId, sourceS3Key, metadata) → EncodingJob
  analyzeComplexity(jobId) → ComplexityReport
  buildBitrateLadder(complexityReport) → List<TargetProfile>
  encodeParallel(jobId, profiles) → List<EncodedAsset>
  encryptAssets(assets, contentKey) → List<EncryptedAsset>
  publishToOCAs(titleId, assets) → void

EncodingJob
  fields:
    jobId: UUID
    titleId: UUID
    sourceS3Key: String
    status: QUEUED | ANALYZING | ENCODING | ENCRYPTING | PUBLISHING | DONE | FAILED
    profiles: List<TargetProfile>
    createdAt: Timestamp
    completedAt: Timestamp
    durationMs: Long

TargetProfile
  fields:
    codec: H264 | H265 | AV1 | VP9
    resolution: 240p | 360p | 480p | 720p | 1080p | 4K
    targetBitrateKbps: Int     // per-title, not fixed
    hdr: NONE | HDR10 | DOLBY_VISION | HLG
    audioCodec: AAC | AC3 | EAC3 | ATMOS
    outputS3Key: String

SceneAnalyzer
  analyzeSpatialComplexity(frame) → Float         // DCT-based
  analyzeTemporalComplexity(frames) → Float       // motion vectors
  detectSceneBoundaries(video) → List<Long>       // timestamps
  assignBitratePerScene(complexities) → Map<SceneId, Int>`,
    keyInsight: "Per-title encoding example: A simple animated film gets ~1,000 kbps for 1080p. A dark action film gets ~4,000 kbps for the same resolution at the same VMAF quality score.",
  },
  {
    id: "kafka",
    section: "1.16",
    label: "Apache Kafka",
    category: "Data Layer",
    whatItDoes: `The nervous system of Netflix — ~1 trillion events per day. Every meaningful action in every microservice produces a Kafka event. 7-day retention in Kafka; archived to S3 as Parquet (Iceberg tables) via Kafka Connect.`,
    responsibilities: [
      "Event backbone for all microservices",
      "7-day retention, replay from any offset",
      "Fan-out: many consumer groups independently",
      "Schema Registry (Avro) backward compatibility",
      "Archive to S3 via Kafka Connect",
    ],
    classesAndMethods: `KafkaProducer<K,V>
  send(topic, key, value) → Future<RecordMetadata>
  sendSync(topic, key, value) → RecordMetadata
  flush() → void
  close() → void

KafkaConsumer<K,V>
  subscribe(topics) → void
  poll(durationMs) → ConsumerRecords<K,V>
  commitSync(offsets) → void
  pause(partitions) → void
  seek(partition, offset) → void

PlaybackEventSchema (Avro)
  fields:
    sessionId: string
    userId: string
    titleId: string
    eventType: enum { PLAY, PAUSE, SEEK, BUFFER, HEARTBEAT, END, ERROR }
    positionMs: long
    bitrateKbps: int
    bufferHealthMs: long
    timestamp: long

BillingEventSchema (Avro)
  fields:
    eventId: string
    userId: string
    eventType: enum { SUBSCRIBED, CANCELLED, PAYMENT_SUCCESS, PAYMENT_FAILED, PLAN_CHANGED }
    plan: string
    amount: double
    timestamp: long

Key Topics:
  playback-events          → heartbeats, end, QoE metrics
  billing-events           → subscription changes, payment success/fail
  content-publish-events   → new encoded content → OCA cache fill
  user-activity            → watch, search, thumbs → recommendation retraining
  encoding-job-events      → job state machine
  notification-events      → trigger email/push/SMS
  access-log-events        → Zuul → analytics

Producer settings for zero message loss:
  acks=all
  enable.idempotence=true
  retries=2147483647
  max.in.flight.requests.per.connection=5
  compression.type=zstd
  delivery.timeout.ms=120000`,
  },
  {
    id: "cassandra",
    section: "1.17",
    label: "Cassandra",
    category: "Data Layer",
    whatItDoes: `World's largest Cassandra deployment — ~10,000 nodes. Used for all high-write, high-read workloads that can tolerate eventual consistency: watch history, resume positions, pre-computed recommendations, playback session metadata. Multi-DC replication across 3 AWS regions.`,
    responsibilities: [
      "Store watch history (millions writes/min)",
      "Store resume positions",
      "Store pre-computed recommendations",
      "Multi-DC replication (NetworkTopologyStrategy)",
    ],
    classesAndMethods: `-- Not a microservice — data store used by multiple services`,
    dbTables: `-- watch_history
CREATE TABLE watch_history (
    profile_id   UUID,
    year         INT,
    watched_at   TIMESTAMP,
    title_id     UUID,
    episode_id   UUID,
    position_ms  BIGINT,
    duration_ms  BIGINT,
    completed    BOOLEAN,
    PRIMARY KEY ((profile_id, year), watched_at)
) WITH CLUSTERING ORDER BY (watched_at DESC);

-- resume_position
CREATE TABLE resume_position (
    profile_id   UUID,
    episode_id   UUID,
    position_ms  BIGINT,
    updated_at   TIMESTAMP,
    session_id   UUID,
    PRIMARY KEY (profile_id, episode_id)
);

-- recommendations
CREATE TABLE recommendations (
    profile_id   UUID,
    row_type     TEXT,
    rank         INT,
    title_id     UUID,
    score        FLOAT,
    computed_at  TIMESTAMP,
    PRIMARY KEY (profile_id, row_type, rank)
);`,
    keyInsight: "The rule: Every query must hit a single partition. No ALLOW FILTERING. No joins. Design tables around query patterns, not normalization.",
  },
  {
    id: "mysql",
    section: "1.18",
    label: "MySQL (RDS)",
    category: "Data Layer",
    whatItDoes: `Used for all data requiring ACID guarantees: user accounts, billing/subscriptions, device registry, OAuth accounts. Sharded by userId. RDS Multi-AZ with read replicas.`,
    responsibilities: [
      "ACID transactions for money/accounts",
      "Sharded by userId",
      "Multi-AZ with read replicas",
    ],
    classesAndMethods: `-- Not a microservice — data store used by Auth, Billing, User services`,
    dbTables: `CREATE TABLE users (
    user_id        BINARY(16) PRIMARY KEY,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password_hash  VARCHAR(60) NOT NULL,
    plan           ENUM('BASIC','STANDARD','PREMIUM') NOT NULL,
    country_code   CHAR(2) NOT NULL,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    email_verified TINYINT(1) DEFAULT 0
);

CREATE TABLE subscriptions (
    subscription_id      BINARY(16) PRIMARY KEY,
    user_id              BINARY(16) NOT NULL,
    plan                 ENUM('BASIC','STANDARD','PREMIUM') NOT NULL,
    status               ENUM('ACTIVE','CANCELLED','PAST_DUE','PAUSED') NOT NULL,
    current_period_start DATE NOT NULL,
    current_period_end   DATE NOT NULL,
    cancel_at_period_end TINYINT(1) DEFAULT 0,
    stripe_subscription_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE payment_methods (
    payment_method_id BINARY(16) PRIMARY KEY,
    user_id           BINARY(16) NOT NULL,
    stripe_token_id   VARCHAR(255) NOT NULL,
    last_four         CHAR(4),
    brand             VARCHAR(20),
    expiry_month      TINYINT,
    expiry_year       SMALLINT,
    is_default        TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);`,
    keyInsight: "Rule: Never use Cassandra for billing — eventual consistency + money = disaster.",
  },
  {
    id: "redis",
    section: "1.19",
    label: "Redis",
    category: "Data Layer",
    whatItDoes: `Used for all sub-millisecond, TTL-based state: auth refresh tokens, concurrent stream slots (with atomic Lua scripts), search autocomplete sorted sets, rate limit counters, notification deduplication.`,
    responsibilities: [
      "Auth refresh tokens (30d TTL)",
      "Stream slots (36s TTL + Lua atomicity)",
      "Rate limit counters",
      "Search autocomplete (sorted sets)",
      "Notification dedup (24h TTL)",
    ],
    classesAndMethods: `Key Patterns:
  refresh:{token_uuid}              → Session JSON         TTL 30d
  streams:{userId}                  → count INT            TTL 36s (heartbeat refreshed)
  stream_set:{userId}               → Set<sessionId>
  ratelimit:{userId}:{endpoint}:{window} → count INT       TTL 1m
  top_queries                       → sorted set for autocomplete
  notif_sent:{userId}:{type}        → 1                    TTL 24h
  reset:{token}                     → userId               TTL 1h

RedisSessionStore
  set(token, session, ttlSeconds) → void
  get(token) → Session
  delete(token) → void
  deletePattern(userId + ':*') → Int      // revoke all sessions

StreamSlotStore (Lua atomic operations)
  acquireSlot(userId, limit, sessionId, ttl) → Boolean
  releaseSlot(userId, sessionId) → void
  refreshTTL(userId, sessionId, ttl) → void
  getActiveCount(userId) → Int

RateLimiter
  checkLimit(userId, endpoint, limitPerMin) → Boolean
  incrementCounter(userId, endpoint) → Int
  getRemainingQuota(userId, endpoint) → Int`,
  },
  {
    id: "evcache",
    section: "1.20",
    label: "EVCache",
    category: "Data Layer",
    whatItDoes: `Netflix's Memcached wrapper (open-sourced). Replicates cache writes to all AZs simultaneously — reads served from local AZ at sub-millisecond latency. Handles ~30M requests/second at peak.`,
    responsibilities: [
      "Multi-AZ cache replication",
      "Sub-ms reads from local AZ",
      "~30M requests/second peak",
    ],
    classesAndMethods: `Key Cache Entries:
  title:{titleId}                   → Title JSON           TTL 5m
  homepage:{profileId}:{deviceType} → HomePage JSON        TTL 5m
  xp:variant:{userId}:{experimentId}→ Variant              TTL 24h
  session:{tokenHash}               → Session JSON         TTL match token

EVCacheClient
  set(key, value, ttlSeconds) → void         // replicates to all AZs
  get(key) → Optional<Value>                 // reads from local AZ
  delete(key) → void                         // deletes from all AZs
  getOrLoad(key, loader, ttl) → Value        // cache-aside pattern
  getBulk(keys) → Map<String, Value>`,
  },
  {
    id: "abtest",
    section: "1.21",
    label: "A/B Testing (XP Platform)",
    category: "Platform Services",
    whatItDoes: `Netflix runs hundreds of simultaneous experiments — every UI change, recommendation tweak, encoding parameter, and thumbnail variant is A/B tested before rollout. Deterministic bucket assignment (hash of userId + experimentId) ensures users always see the same variant. Kayenta auto-analyzes canary deployments and rolls back if metrics degrade.`,
    responsibilities: [
      "Deterministic: hash(userId + experimentId) % 100",
      "Sub-microsecond, no DB lookup",
      "Cache in EVCache 24h",
      "Log exposure async to Kafka",
      "Kayenta canary analysis + auto-rollback",
    ],
    classesAndMethods: `ExperimentService
  getVariant(userId, experimentId) → Variant    // hash(userId+expId) % 100
  logExposure(userId, experimentId, variant) → void
  getResults(experimentId) → ExperimentResults

Experiment
  fields:
    experimentId: UUID
    name: String
    variants: List<Variant>        // control + treatments
    trafficAllocation: Map<Variant, Float>
    metric: String                 // e.g. play_rate, completion_rate
    minSampleSize: Int
    startDate: Date
    status: RUNNING | STOPPED | WINNER_DECLARED

FeatureFlagService
  isEnabled(flagId, userId) → Boolean
  getValue(flagId, userId) → String
  setRollout(flagId, percent) → void

KayentaCanaryAnalyzer
  startAnalysis(canaryConfig) → AnalysisId
  getScore(analysisId) → CanaryScore     // 0–100
  shouldRollback(analysisId) → Boolean   // score < 75 triggers rollback`,
  },
  {
    id: "chaos",
    section: "1.22",
    label: "Chaos Engineering + Hystrix",
    category: "Platform Services",
    whatItDoes: `Netflix invented chaos engineering — they randomly kill production instances, introduce latency, and take down entire AWS regions to prove the system handles failure gracefully. Hystrix circuit breakers wrap every inter-service call with a fallback.`,
    responsibilities: [
      "Chaos Monkey: randomly kill instances",
      "Chaos Kong: take down entire regions",
      "Hystrix circuit breakers on every call",
      "Fallback responses for degraded mode",
    ],
    classesAndMethods: `HystrixCommand<T>
  run() → T                    // calls downstream service
  getFallback() → T            // returns degraded/cached response
  execute() → T                // sync: run() or getFallback()
  queue() → Future<T>          // async execution

HystrixCircuitBreaker
  fields:
    state: CLOSED | OPEN | HALF_OPEN
    failureCount: AtomicInt
    failureThreshold: Int       // default 50%
    sleepWindowMs: Int          // default 5000ms
    requestVolumeThreshold: Int // min 20 requests before opening
  methods:
    allowRequest() → Boolean
    markSuccess() → void
    markFailure() → void
    trip() → void               // CLOSED → OPEN
    attemptExecution() → Boolean // OPEN → HALF_OPEN probe

Fallback Matrix:
  Recommendation fails       → trending titles (never blank screen)
  Catalog slow               → stale EVCache data
  DRM service down           → graceful "unavailable" error
  Billing unreachable        → allow stream, reconcile later (fail open)
  Concurrency check fails    → allow stream, alert ops`,
  },
  {
    id: "search",
    section: "1.4",
    label: "Search Service",
    category: "Core Services",
    whatItDoes: `Handles text search, autocomplete, and personalized result ranking. Two-stage pipeline: Elasticsearch BM25 + dense-vector kNN retrieval → ML re-ranking using profile watch history. Results filtered by regional availability and maturity rating before returning.`,
    responsibilities: [
      "BM25 full-text retrieval over title, cast, director, synopsis",
      "kNN semantic search using dense embeddings for intent matching",
      "Re-rank results using user watch history from Recommendation Service",
      "Autocomplete from Redis sorted sets (top-N queries by prefix)",
      "Filter by region availability and profile maturity level",
      "Spell correction using SymSpell before Elasticsearch query",
    ],
    techStack: "Elasticsearch 8 (BM25 + kNN HNSW index), Redis sorted sets for autocomplete, Python ML re-ranking service, Kafka consumer for catalog index updates",
    apiRoutes: `GET  /search?q={query}&profileId={id}&limit=20
GET  /search/autocomplete?prefix={text}&limit=10
POST /search/index/title          (internal — catalog ingest)`,
    classesAndMethods: `SearchService
  search(query, profileId, region, maturityLevel) → List<SearchResult>
  autocomplete(prefix, limit) → List<String>
  rerank(results, profileId) → List<SearchResult>   // ML re-ranking

ElasticsearchClient
  bm25Search(index, query, filters) → List<Hit>
  knnSearch(index, vector, k) → List<Hit>
  hybridSearch(query, vector, filters) → List<Hit>  // RRF fusion

SearchIndexer
  indexTitle(title: Title) → void      // called on catalog ingest
  updateTitle(titleId, fields) → void
  deleteTitle(titleId) → void          // on content removal

AutocompleteService
  getSuggestions(prefix) → List<String>   // Redis ZRANGEBYLEX
  recordQuery(query) → void               // ZINCRBY on every search`,
    dbTables: `-- Elasticsearch index: titles
{
  "mappings": {
    "properties": {
      "content_id":    { "type": "keyword" },
      "title":         { "type": "text", "analyzer": "english" },
      "synopsis":      { "type": "text" },
      "cast":          { "type": "text" },
      "genres":        { "type": "keyword" },
      "embedding":     { "type": "dense_vector", "dims": 768 },
      "release_year":  { "type": "integer" },
      "regions":       { "type": "keyword" }
    }
  }
}

-- Redis: Autocomplete sorted set
search:autocomplete:{prefix}   → sorted set of (query, score)   TTL 24h`,
    keyInsight: `Search uses two-stage retrieval: first Elasticsearch BM25 + kNN finds candidates quickly, then a lightweight ML model re-ranks them using the user's watch history. This means two users searching "action" get different orderings — a K-drama fan sees Korean action titles ranked higher. Why Elasticsearch over a pure vector DB? Because BM25 handles exact keyword matches (actor names, exact titles) far better than vector similarity alone.`,
  },
  {
    id: "download",
    section: "1.5",
    label: "Download Service",
    category: "Core Services",
    whatItDoes: `Manages offline playback. Downloads DRM-encrypted video files to devices for offline viewing. Available only on Standard and Premium plans. Enforces expiry rules: 30 days from download date OR 48 hours after first play. Device-bound DRM licenses prevent copying between devices.`,
    responsibilities: [
      "Check plan entitlement (download allowed on Standard/Premium)",
      "Issue device-bound DRM license tied to deviceId",
      "Track download state per device: pending, active, expired",
      "Enforce 30-day download TTL and 48-hour post-first-play TTL",
      "Count downloads per device (plan limit: Standard=25, Premium=25 per device)",
      "Handle license renewal when device reconnects to internet",
      "Revoke licenses on account cancellation or plan downgrade",
    ],
    techStack: "Widevine/FairPlay/PlayReady DRM, Cassandra for download state, Redis for active device tracking",
    apiRoutes: `POST /download/start          { titleId, episodeId, deviceId, quality }
GET  /download/status/{downloadId}
DELETE /download/{downloadId}
POST /download/renew-license  { downloadId, deviceId }
GET  /download/list?deviceId={id}`,
    classesAndMethods: `DownloadService
  startDownload(titleId, episodeId, deviceId, quality) → Download
  getDownloadStatus(downloadId) → DownloadStatus
  renewLicense(downloadId, deviceId) → License
  expireDownload(downloadId) → void
  listDownloads(deviceId) → List<Download>

Download
  fields:
    downloadId: UUID
    accountId: UUID
    profileId: UUID
    deviceId: UUID                // license is device-bound
    contentId: UUID
    episodeId: UUID
    quality: ENUM(SD, HD, UHD)
    status: ENUM(DOWNLOADING, READY, EXPIRED, REVOKED)
    downloadedAt: Timestamp
    firstPlayedAt: Timestamp      // null until first play
    expiresAt: Timestamp          // min(downloadedAt+30d, firstPlayedAt+48h)

LicenseService
  issueLicense(downloadId, deviceId) → DRMLicense
  revokeLicense(downloadId) → void
  isValid(downloadId, deviceId) → Boolean`,
    dbTables: `-- Cassandra: downloads
CREATE TABLE downloads (
  device_id    UUID,
  downloaded_at TIMESTAMP,
  download_id  UUID,
  account_id   UUID,
  content_id   UUID,
  episode_id   UUID,
  quality      TEXT,
  status       TEXT,
  expires_at   TIMESTAMP,
  PRIMARY KEY ((device_id), downloaded_at, download_id)
) WITH CLUSTERING ORDER BY (downloaded_at DESC);`,
    keyInsight: `DRM licenses are device-bound — a video file downloaded on iPhone A cannot be played on iPhone B even on the same account. The license contains the decryption key encrypted for that device's hardware key. Expiry is enforced purely client-side by the DRM system — Netflix does not need to call home to check expiry, reducing infrastructure load and enabling true offline playback.`,
  },
  {
    id: "notification",
    section: "1.23",
    label: "Notification Service",
    category: "Platform Services",
    whatItDoes: `Sends push notifications, emails, and in-app alerts for new episode releases, payment reminders, and account security events. Redis deduplication prevents spamming the same user twice in 24 hours for the same notification type. Scheduled notifications stored in Redis sorted sets keyed by triggerAt timestamp.`,
    responsibilities: [
      "Push notifications (APNs for iOS, FCM for Android)",
      "Email via SES for billing events and security alerts",
      "In-app notification badge and inbox",
      "24-hour Redis dedup per user per notification type",
      "Scheduled notifications via Redis sorted set (score = triggerAt)",
      "User preference respecting (opt-out per notification type)",
    ],
    techStack: "Apple APNs, Google FCM, AWS SES for email, Redis for dedup + scheduling, Kafka consumer for trigger events",
    apiRoutes: `POST /notification/send        { userId, type, payload }
GET  /notification/inbox?userId={id}
PUT  /notification/preferences { userId, preferences }
POST /notification/mark-read   { notificationId }`,
    classesAndMethods: `NotificationService
  send(userId, type, payload) → void
  schedule(userId, type, payload, triggerAt) → void
  getInbox(userId) → List<Notification>
  markRead(notificationId) → void
  updatePreferences(userId, prefs) → void

DeduplicationGuard
  isDuplicate(userId, type) → Boolean    // Redis key: notif:{userId}:{type} TTL 24h
  markSent(userId, type) → void          // SET with 24h EX

NotificationScheduler
  enqueueFuture(userId, type, payload, triggerAt) → void  // ZADD score=triggerAt
  processDue() → List<Notification>      // ZRANGEBYSCORE 0 now()`,
    keyInsight: `Redis deduplication key: notif_sent:{userId}:{type} with 24h TTL ensures the same notification type (new episode, payment reminder) is never sent more than once per day per user. Scheduled notifications use a Redis sorted set — the score is the Unix timestamp when the notification should fire. A polling job runs every 30 seconds fetching ZRANGEBYSCORE 0 to now(). This avoids cron complexity and scales horizontally.`,
  },
];

export type QA = { id: number; q: string; a: string };

export const QA_ARCHITECTURE: QA[] = [
  { id:1, q:"Walk me through what happens when I press play on Netflix.", a:`The client calls POST /playback/start. Zuul2 validates the JWT, rate-checks the request, and routes it to the Playback Service. Playback checks billing entitlement (active subscription?), calls Concurrency Service to acquire a stream slot (Redis INCR, atomic Lua), calls Steering Service to find the best OCA for this client IP + title, generates a signed HMAC-SHA256 manifest URL (6h TTL), generates a DRM license token, writes the initial resume position to Cassandra, and publishes a PLAY event to Kafka. The manifest URL and DRM token are returned to the client in under 300ms p99. The client then contacts the OCA directly to download DASH/HLS video chunks. The API tier is completely out of the video path from this point on. Every 30 seconds the client sends a heartbeat with position and bitrate, which refreshes the Concurrency slot TTL and updates Cassandra.` },
  { id:2, q:"Why does Netflix have its own CDN (Open Connect) instead of using CloudFront?", a:`Three reasons. First, economics: at Netflix's scale (~100 Tbps peak), commercial CDN pricing would be hundreds of millions of dollars per year. With Open Connect, ISPs accept free hardware in exchange for better peering — Netflix pays mostly for hardware, not bandwidth fees. Second, control: Netflix can optimize OCA firmware, cache fill algorithms, and BGP routing specifically for video streaming. Third, quality: co-locating inside ISPs means video travels zero or one hops from the OCA to the customer, reducing RTT, packet loss, and buffering.` },
  { id:3, q:"Why Zuul2 instead of Zuul1?", a:`Zuul1 uses a thread-per-connection model. At 1M requests/second, that requires ~1M threads, which is not feasible. Zuul2 is async and non-blocking (built on Netty), handling many connections with far fewer threads. This also makes long-lived connections (WebSocket, HTTP/2 streams) practical without thread exhaustion.` },
  { id:4, q:"Why does Netflix use client-side load balancing (Ribbon) instead of a central proxy like nginx or Envoy?", a:`Central load balancers create a single bottleneck and network hop on every inter-service call. Netflix's microservices call each other thousands of times per second — a central proxy would itself need to be scaled massively. Ribbon on each client uses Eureka to discover instances and applies zone-aware round-robin locally. No extra network hop, no single point of failure, and each service independently handles discovery and routing. The tradeoff is that load balancing logic is duplicated in every service's client library, but this is acceptable given the performance benefit.` },
  { id:5, q:"How does the concurrent stream limit enforcement work? Why not use a database?", a:`Redis is used because the check-and-set must be atomic and sub-millisecond. A Lua script on Redis atomically does: check current count < plan limit, INCR the count, SADD the sessionId to a set. This is a single atomic operation. The TTL on the count key is 36 seconds. The client heartbeats every 30 seconds, which refreshes the TTL. If the client crashes, the slot auto-expires after 36 seconds. A relational database would be too slow (milliseconds of latency for every playback start) and requires transactions for atomicity. Redis gives atomicity via Lua scripting at microsecond latency.` },
  { id:6, q:"Why is the Playback Service so much more critical than other services?", a:`Its P99 latency target is <300ms because anything slower noticeably degrades the "press play" experience. More importantly, it sits in the critical path for revenue — if playback is down, users cannot watch content, which directly impacts subscriber satisfaction and churn. It also touches multiple downstream systems (Billing, Concurrency, Steering, DRM, Cassandra, Kafka) so each upstream call must be resilient with Hystrix fallbacks. For example, if Billing is unreachable, Playback fails open (assumes the subscription is active) rather than blocking the stream.` },
  { id:7, q:"How does Netflix handle the case where a user's client crashes mid-stream?", a:`The heartbeat mechanism. The client sends a heartbeat POST every 30 seconds with current position and bitrate. The Concurrency Service holds the stream slot with a 36-second Redis TTL. When the client sends each heartbeat, the TTL is refreshed to 36 seconds again. If the client crashes and stops sending heartbeats, the TTL expires after 36 seconds and the slot is automatically released, allowing the user to start a new stream. The resume position in Cassandra was last updated at the most recent heartbeat, so when the user reopens the app, it resumes from that position.` },
  { id:8, q:"How does Netflix ensure the catalog data is always fast to read?", a:`Catalog reads happen on every page load for every user. The Catalog Service uses a multi-layer caching strategy: EVCache (Memcached) caches hot title metadata with a 5-minute TTL, replicating to all AZs on every write. Reads come from the local AZ at sub-millisecond latency. On a cache miss, Cassandra is hit — it's partitioned by titleId for O(1) reads. For search, Elasticsearch maintains a full-text index that is kept current via Kafka events when new titles are ingested or metadata changes. The key design decision: writes to catalog are rare (new content launches), so a 5-minute stale cache is acceptable.` },
  { id:9, q:"How does Netflix's recommendation system personalize even the thumbnail artwork?", a:`Netflix runs a multi-armed bandit model (UCB — Upper Confidence Bound algorithm) per user segment per title. For each title, multiple artwork variants are created showing different aspects (romantic couple, action sequence, specific actor face). The bandit model tracks impression counts and click counts per variant per user segment, and selects the variant that maximizes expected click-through rate. A romance-heavy viewer might see a couple from a thriller. An action-heavy viewer sees an explosion. This is called artwork personalization and drives roughly 20% uplift in click-through rate.` },
  { id:10, q:"How does the system ensure a user can't watch on 5 devices simultaneously when they're on the Standard plan (limit: 2)?", a:`Concurrency Service tracks active streams per userId in Redis. On every playback start, it atomically checks and increments the count. On playback end, it decrements. The key expires (auto-releases) if no heartbeat arrives within 36 seconds. The plan limit is retrieved by calling the Billing Service (or from EVCache). The check must be atomic to prevent race conditions where two simultaneous requests both pass the count check before either increments it. This is why a Lua script is used — it executes check+increment+sadd as a single Redis operation.` },
  { id:11, q:"How does per-title encoding save bandwidth?", a:`Traditional encoding uses a fixed bitrate ladder (e.g., always use 4000 kbps for 1080p). Netflix's system analyzes each title's visual complexity using DCT-based spatial complexity scores and motion vector temporal complexity scores. A simple animated show (SpongeBob) has low complexity — it can be encoded at 1,000 kbps at 1080p with the same perceptual quality (same VMAF score) as a live-action dark thriller encoded at 4,000 kbps. Per-title encoding assigns bitrates based on actual visual complexity, achieving 20% bandwidth savings at equivalent quality. This matters enormously at 100 Tbps scale.` },
  { id:12, q:"What happens if the Recommendation Service is slow or down?", a:`Hystrix wraps the call. The fallback returns a pre-computed "trending titles" list from EVCache or Cassandra, which requires no ML ranking. The homepage still loads — just with less personalization. This is the "fail gracefully, never show a blank screen" principle. The EVCache-based fallback contains globally trending titles, which are refreshed every 5 minutes independently of the ML pipeline.` },
  { id:13, q:"How does DRM work across different device types?", a:`Netflix uses three DRM systems: Widevine (Android, Chrome, Smart TVs), FairPlay Streaming (iOS, tvOS, macOS, Safari), and PlayReady (Windows, Xbox, Edge). Content is encrypted using AES-128 before being stored on S3/OCAs. When a user starts playback, the DRM License Service issues a license (containing the decryption key) only after validating the playback session token and confirming entitlement. The key is delivered to the device's Trusted Execution Environment (TEE — ARM TrustZone or Intel SGX) where it is used for decryption in hardware. If the device is jailbroken, the TEE security attestation fails, and only a software-only L3 Widevine license is issued, which caps quality at 480p.` },
  { id:14, q:"How does Eureka prevent mass de-registration during a network partition?", a:`Self-preservation mode. Eureka keeps a running count of the percentage of services that have sent heartbeats in the last renewal interval. If more than 85% of services suddenly stop sending heartbeats, Eureka stops evicting services from the registry — it assumes the issue is a network partition between Eureka and the services, not that all services are actually down. This prevents Eureka from emptying its registry during a network event, which would cause a cascading failure where all callers treat healthy-but-unreachable services as dead.` },
  { id:15, q:"Why does Netflix use JWT with 15-minute expiry instead of longer-lived tokens?", a:`Short-lived tokens limit the window of exposure if a token is stolen. A 15-minute token that gets intercepted can only be misused for up to 15 minutes. Refresh tokens are 30 days but are stored server-side in Redis — they can be instantly revoked. The tradeoff: clients must refresh every 15 minutes, but this happens silently in the background using the refresh token. If an account is compromised, the security team can call DELETE /auth/sessions which deletes all refresh tokens from Redis, immediately invalidating all sessions — the 15-minute access tokens expire naturally.` },
  { id:16, q:"How does the Search Service handle personalization?", a:`Search has two stages. First, Elasticsearch does BM25 text retrieval + dense vector kNN semantic search to find matching titles. Second, the results are re-ranked using the user's watch history and profile preferences from the Recommendation Service. A user who watches a lot of Korean dramas searching for "action" will see Korean action titles ranked higher than a user with no such history. Additionally, results are filtered by regional availability and maturity rating before being returned.` },
  { id:17, q:"How does the Notification Service avoid spamming users?", a:`Redis deduplication. Before sending any notification, the service checks a Redis key notif_sent:{userId}:{type} with a 24-hour TTL. If the key exists, the notification is skipped. After sending, the key is set with 24h TTL. This ensures the same notification type (e.g., "new episode available") is not sent more than once per day per user. For scheduled notifications (new episode at release time), the notification is stored in a Redis sorted set keyed by triggerAt timestamp.` },
  { id:18, q:"How does Netflix do offline downloads and ensure they cannot be copied?", a:`Downloads are only available on Standard (2 devices) and Premium (6 devices) plans. The video files are downloaded and stored on the device in DRM-encrypted format — they cannot be played outside the Netflix app. The DRM license is device-bound, meaning a file downloaded on iPhone A cannot be played on iPhone B even with the same account. License expiry rules: 30 days from download date, OR 48 hours from first play, whichever comes first. The license renewal happens automatically when the device connects to the internet. When the license expires, the encrypted file becomes unplayable.` },
  { id:19, q:"How does Netflix handle regional AWS failures?", a:`Netflix runs active-active across 3 AWS regions: us-east-1, us-west-2, eu-west-1. Route53 uses latency-based routing with health checks on every Zuul2 instance. When health checks fail for a region, Route53 shifts DNS resolution to the next closest healthy region within ~30 seconds. During Chaos Kong experiments, Netflix deliberately terminates an entire AWS region and verifies this failover happens correctly and end users experience minimal disruption. Cassandra uses multi-DC replication (NetworkTopologyStrategy) with QUORUM reads and writes, so a region failure doesn't cause data loss — the surviving regions have at least one copy of every partition.` },
  { id:20, q:"What is the difference between EVCache and Redis at Netflix?", a:`EVCache is Memcached-based and used for read-heavy hot data where you need multi-AZ availability: homepage recommendations, title metadata, A/B test variant assignments. It replicates writes to all AZs simultaneously, so an AZ failure is transparent. It does not support TTL precision, sorted sets, or atomic operations.\n\nRedis is used where you need TTL precision (stream slots with 36-second TTL that heartbeat refreshes), atomic Lua scripts (stream slot acquire), sorted sets (search autocomplete top queries), or pub/sub. Redis is more operationally complex than Memcached but necessary for the concurrency control and rate limiting use cases.` },
  { id:21, q:"How does A/B testing variant assignment work at Netflix scale?", a:`Assignment is deterministic using a hash function: hash(userId + experimentId) % 100. If the result is < 10 (for a 10% experiment), the user gets the treatment variant. This is computed on the fly with no database lookup on the hot path, making it sub-microsecond. The result is cached in EVCache for 24 hours to avoid recomputation. Deterministic hashing ensures a user always sees the same variant in the same experiment — no user ever sees the treatment one day and the control the next (which would invalidate the experiment). Exposure is logged asynchronously to Kafka.` },
  { id:22, q:"How does Netflix enforce schema evolution without breaking consumers?", a:`Every Kafka topic uses Avro or Protobuf schemas registered in the Schema Registry. The registry enforces backward compatibility rules: you can add optional fields with defaults, but you cannot rename fields, change types, remove required fields, or reuse field numbers. A breaking change requires creating a new topic version (e.g., prod.playback.error.v5). Producers are deployed before consumers for additive changes. Old consumers continue reading the old topic while being migrated to the new one.` },
  { id:23, q:"Why does Netflix use Cassandra for watch history instead of MySQL?", a:`Watch history is written every time a user watches something (once every 30 seconds via heartbeat). With 300 million users watching, this is millions of writes per minute. MySQL cannot sustain this write throughput at Netflix scale without severe sharding complexity. Cassandra is designed for high-write, append-heavy workloads. The partition key (profile_id, year) distributes load across the cluster. The clustering key (watched_at DESC) gives efficient recent-first reads. The tradeoff is eventual consistency — a user might not see their very latest watch event immediately, but for watch history this is acceptable. ACID is not needed here.` },
  { id:24, q:"What is the Steering Service and why is it separate from Playback?", a:`The Steering Service maintains a real-time map of OCA health and cache state. It knows which OCAs are healthy (reports every 10 seconds), which OCAs have which titles cached, and can rank OCAs by ISP proximity, latency, and load. It is separate from Playback because OCA selection is a specialized problem that requires constant maintenance of network state (BGP table analysis, ISP matching). Separating it allows Playback to be kept simple — it just asks "give me the best OCA for this client IP and videoId" and gets a ranked list back. The Steering Service is stateful; the Playback Service is not.` },
  { id:25, q:"How would you scale the system to 10x the current load?", a:`At 10x load the critical constraints are: Zuul2 fleet (scale horizontally, stateless), Playback Service (scale horizontally, all state is in Cassandra/Redis), Concurrency Service Redis (use Redis Cluster with consistent hashing across shards), Cassandra (add nodes — Cassandra scales linearly), Kafka (add brokers, increase partition count), and the Encoding Pipeline (pure AWS EC2 fleet, scale by adding instances). EVCache scales by adding Memcached nodes — its multi-AZ replication handles read scaling. The bottleneck at 10x would likely be the DRM License Service, which involves HSM operations. This can be scaled by adding more HSM partitions and license server instances. The CDN (OCA) already handles 100 Tbps — at 10x it would require 10x more OCAs but those can be deployed incrementally.` },
];

export const QA_PIPELINE: QA[] = [
  { id:26, q:"What is the difference between the video delivery system and the data platform at Netflix?", a:`The video delivery system handles: Studio → Encoding → DRM → S3 Origin → OCA CDN → Client. It delivers actual video bytes to users.\n\nThe data platform handles: all analytics, telemetry, recommendations, A/B testing, ML training, finance reporting. It processes signals from user behavior to make the product smarter. The two are architecturally separate — the data platform never touches video bytes. Its input is events (JSON/Avro) from every microservice and client SDK.` },
  { id:27, q:"Why use Kafka as the foundation rather than SQS, Kinesis, or a database?", a:`Kafka provides five things that alternatives don't combine: (1) durable buffering with configurable retention so consumers can replay from any offset, (2) ordered partitions within a partition key, (3) high throughput — millions of events per second per cluster, (4) fan-out — many independent consumer groups reading the same topic independently without affecting each other, (5) a massive open-source ecosystem (Flink, Spark, Kafka Connect, Debezium). Kinesis is more managed but has fewer connectors, limited partition count per stream, and less control. SQS is a queue, not a log — consumed messages disappear. Databases cannot sustain millions of writes per second at acceptable cost.` },
  { id:28, q:"How does deduplication work in the Flink pipeline?", a:`First, every event gets a globally unique event_id generated at the SDK level (UUID v7 — time-ordered UUID). In Flink, the job keys by event_id and maintains a bloom filter or hash set in RocksDB keyed state with a TTL of 24–72 hours. If the event_id is seen again within the TTL window, it is dropped. For Bronze Iceberg tables, a deterministic batch deduplication is also run:\n\nSELECT * FROM (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY event_id\n    ORDER BY ingestion_time ASC\n  ) as rn\n  FROM bronze.playback_event\n) WHERE rn = 1\n\nThis handles cases where the same event enters the pipeline from two different paths (e.g., client retry reaching two edge nodes).` },
  { id:29, q:"What is a watermark in Flink and why does it matter for Netflix?", a:`A watermark is a statement by the Flink job: "I believe all events with event_time <= T have now arrived." It allows the engine to close event-time windows and produce results. Without watermarks, a streaming job processing playback events might wait forever for late events.\n\nFor Netflix: a playback session can have events arriving slightly out of order due to network conditions. A 5-minute watermark means "wait 5 minutes beyond the latest event time before closing the window." Events arriving more than 5 minutes late go to a side output (correction stream). The watermark setting is a tradeoff between result latency and completeness — a smaller watermark gives faster results but loses more late events.` },
  { id:30, q:"How does Netflix handle GDPR deletion in an immutable S3 data lake?", a:`GDPR's right to erasure in an immutable lakehouse requires a four-step process:\n\n1. Mark for deletion: Write a delete record to a suppression table. Iceberg records this as a positional delete or equality delete file.\n\n2. Compact: Run a scheduled Spark job that rewrites affected Iceberg data files, physically removing the deleted rows and replacing the old files. The old snapshot is then expired.\n\n3. Purge online stores: Delete the profile's data from Redis, DynamoDB, EVCache, Cassandra, and MySQL immediately.\n\n4. Suppress replays: Maintain a durable suppression list. If anyone attempts to replay the raw Bronze events for this profile_token, the suppression list blocks the records from being reprocessed into Silver or Gold.` },
  { id:31, q:"How does the system prevent a bad Spark backfill from corrupting production data?", a:`Three protections:\n\n1. Separate resources: Backfill jobs run in a separate Kubernetes namespace and compute pool with explicit quotas.\n\n2. Branch writes: Backfill output is written to an Iceberg branch (not the main table). This is like a git branch — it has its own isolated snapshot and does not affect any readers of the main table.\n\n3. Gated publication: A data quality job validates the backfill output (row counts, null rates, business rule checks). Only after these validations pass is the branch merged atomically into the main table's metadata.` },
  { id:32, q:"Explain the Bronze, Silver, Gold data architecture.", a:`Bronze = raw, source-faithful, append-only. Every event as it arrived, including duplicates, schema versions, and raw PII before tokenization. Used for replay, debugging, and audit. You never modify Bronze data — if processing logic was wrong, you replay Bronze to recompute Silver.\n\nSilver = clean, deduplicated, enriched, conformed. Duplicate events removed. PII tokenized. Events joined with reference data (title metadata, device info, geography). Sessionized. This is the layer consumed by most analytical jobs.\n\nGold = business-ready aggregations. Daily/hourly summaries. Revenue reports. Playback quality by title/country/device. Read by dashboards, finance teams, and executives. Gold is always derived from Silver, so if Silver is wrong, you recompute Gold from Silver without touching Bronze.` },
  { id:33, q:"How does exactly-once processing work end-to-end in the Flink pipeline?", a:`True exactly-once means each input event produces exactly one output effect. In practice:\n\n1. Unique event_id generated at the client — enables deduplication\n2. Idempotent Kafka producer — no duplicates introduced at ingestion\n3. Flink checkpointing — Flink periodically snapshots operator state and Kafka consumer offsets atomically. On recovery, it restores to the last checkpoint and replays from the saved offset.\n4. Transactional Kafka output — when writing derived Kafka topics, Flink uses Kafka transactions so incomplete writes from a failed checkpoint cycle are rolled back.\n5. Iceberg transactional sink — Iceberg commits are atomic snapshots.\n6. Idempotent upserts — for serving stores (Pinot, DynamoDB), upserts by natural key mean a reprocessed event overwrites rather than duplicates.` },
  { id:34, q:"Why use Apache Pinot for real-time dashboards instead of Elasticsearch or Redshift?", a:`Pinot is purpose-built for real-time OLAP — analytical aggregation queries over rapidly ingested event data. It ingests directly from Kafka and makes data queryable within seconds. Its columnar storage and inverted + star-tree indexes support sub-second GROUP BY and aggregation queries across billions of rows.\n\nElasticsearch is optimized for text search and log retrieval, not GROUP BY aggregations at scale. Redshift requires data to be loaded (minutes to hours delay) and is optimized for complex SQL joins on historical data, not sub-second latency.\n\nFor the Netflix use case "show me playback failure rate by title, country, and device for the last 10 minutes" — Pinot serves this in under 100ms.` },
  { id:35, q:"How does the system handle a schema change to an event?", a:`Backward-compatible change (adding an optional field):\n1. Register new schema version in Schema Registry with BACKWARD compatibility check\n2. Deploy new producer (adds the field with a default value)\n3. Existing consumers continue working — they ignore the new field until they upgrade\n4. Gradually upgrade consumers to use the new field\n\nBreaking change (renaming a field, changing a type):\n1. Create a new topic version: prod.playback.started.v4\n2. Deploy producer writing to both v3 and v4 for a dual-write period\n3. Migrate all consumers to v4\n4. Stop writing to v3\n5. Retire v3 after all consumers have migrated` },
  { id:36, q:"What causes the 'small files' problem and why is it dangerous?", a:`Flink writes to Iceberg with high frequency (every 1–5 minutes) across many partitions. Each Flink task writes its own small output files. Thousands of tiny files accumulate per hour.\n\nConsequences: Iceberg manifest files grow huge, query planning requires reading thousands of manifests, S3 LIST operations become expensive, reading requires opening thousands of small files, and table statistics become inaccurate.\n\nSolution: Continuous compaction — a scheduled Spark job runs rewriteDataFiles() which merges small files into 512 MB–1 GB target file sizes and rewrites the manifests atomically.` },
  { id:37, q:"How does the data mesh principle apply at Netflix?", a:`At Netflix scale, a central data team cannot own every dataset from 1,000+ microservices. The data mesh assigns ownership to domain teams:\n\n- Playback domain team owns: playback event schemas, bronze.playback_event, silver.playback_session, gold.title_country_hourly_qoe\n- Personalisation domain team owns: recommendation feature tables, model training pipelines\n- Ads domain team owns: impression, click, conversion event schemas and analytics\n\nThe platform team owns: Kafka cluster infrastructure, Flink deployment framework, Iceberg storage, Schema Registry, data quality tooling, lineage tooling. Domain teams publish data contracts — explicit schemas with SLAs, quality guarantees, and deprecation policies.` },
  { id:38, q:"How does the replay capability work when a Flink job has a bug?", a:`Because Bronze Iceberg stores every raw event immutably, a replay is possible at any time:\n\n1. Fix the Flink job logic (the bug)\n2. Create a savepoint of the current running job\n3. For the affected time window, re-read from bronze.playback_event\n4. Reprocess through the corrected Flink job logic\n5. Write corrected records to Silver using an Iceberg MERGE or upsert\n6. Recompute affected Gold aggregates from corrected Silver data\n7. Audit the correction\n\nThis is why the "immutable Bronze" principle is non-negotiable.` },
  { id:39, q:"How do you calculate how many Kafka brokers Netflix needs?", a:`Peak ingestion: 40 GB/s. With replication factor 3: 40 × 3 = 120 GB/s of broker write traffic. Assuming a safe sustained throughput of 200 MB/s per broker: 120,000 MB/s ÷ 200 = 600 brokers. Add 20% headroom: ~720 brokers globally. Spread across ~40 domain/region clusters: 18 brokers per cluster on average.\n\nNote: these are rough estimates. Actual sizing requires benchmarking with real payload sizes, compression ratios, consumer fan-out count, TLS overhead, and EBS/network throughput limits.` },
  { id:40, q:"What is the Outbox Pattern and why does Netflix use it for CDC?", a:`The Outbox Pattern solves the dual-write problem: if application code performs a database update AND publishes to Kafka independently, one can succeed while the other fails, causing data inconsistency.\n\nThe solution:\nBEGIN TRANSACTION;\n  UPDATE subscription SET plan = 'premium' WHERE account_id = 1001;\n  INSERT INTO outbox_event (event_type, payload) VALUES ('PLAN_CHANGED', '...');\nCOMMIT;\n\nDebezium reads the outbox_event table from the MySQL binary log and publishes to Kafka. The Kafka publish is now derived from the same transaction as the database update — if the transaction commits, the event will be published. No distributed transaction needed.` },
  { id:41, q:"How does Netflix achieve sub-30-second operational analytics on playback failures?", a:`The path: Client sends playback_failed event → Event Gateway validates and writes to Kafka within 1–2 seconds → Flink job consumes and processes within 3–5 seconds → Pinot receives the enriched event and makes it queryable within 2–3 seconds. Total end-to-end: ~10 seconds. Dashboards polling Pinot with 10-second refresh intervals show data within 20–30 seconds of the actual failure event. Alerting jobs running in Flink detect anomalies and trigger PagerDuty within 15 seconds of the issue starting.` },
  { id:42, q:"How does Netflix handle late-arriving events in the batch pipeline?", a:`Iceberg supports MERGE INTO for upserts. If a late event arrives for a session that was already processed into Silver:\n\nMERGE INTO silver.playback_session t\nUSING (SELECT * FROM corrected_sessions) s\nON t.playback_id = s.playback_id\nWHEN MATCHED THEN UPDATE SET ...\nWHEN NOT MATCHED THEN INSERT *;\n\nThis creates a new Iceberg snapshot with the corrected data. Downstream Gold tables must be recomputed. The correction is tracked in an audit table. This is why Silver and Gold tables store last_updated_at — analysts can see if a row has been corrected.` },
  { id:43, q:"What is point-in-time correctness in ML features and why does it matter?", a:`When training a recommendation model, you have label data (user clicked title X at time T) and feature data. Point-in-time correctness means: when you join the label at time T with features, you can ONLY use feature values that existed at or before time T.\n\nViolation example: training a model using "total watch hours in 2026" as a feature for a January event — the model would "see the future" during training, learn a spurious pattern, and perform worse in production (training-serving skew).\n\nCorrect: JOIN with feature_time <= label.event_time + QUALIFY ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY feature_time DESC) = 1` },
  { id:44, q:"How does Netflix handle schema evolution in Iceberg without downtime?", a:`Iceberg supports schema evolution without rewriting existing data files:\n\n- Add optional column: Immediately safe. New writers write the column. Old readers see NULL for old rows. Zero downtime.\n- Drop unused column: Mark as deprecated, stop writing, then drop.\n- Rename column: Uses column IDs internally — renaming updates metadata only, no data rewrite.\n- Change type (widening): INT → LONG is safe, Iceberg handles type promotion. Narrowing changes are rejected.\n- Add partition field: Iceberg's partition evolution creates a new partition spec without rewriting historical data.` },
  { id:45, q:"What happens to the data pipeline during an AWS region failure?", a:`Three protections:\n\n1. Event ingestion: Global Accelerator routes new events to the nearest healthy region. Client SDK queues events locally and retries.\n\n2. Kafka: Topics configured with MirrorMaker 2 for cross-region replication of critical topics (playback-events, billing-events). Non-critical telemetry is not replicated.\n\n3. Stream processing: Flink jobs in a healthy region can read from the replicated topics and continue processing. Savepoints are stored in S3, which is multi-region.\n\nRPO: under 5 minutes for critical domains. RTO: 15–30 minutes for streaming jobs.` },
  { id:46, q:"How does the incremental Spark job know which data to process since the last run?", a:`Iceberg snapshot IDs act as checkpoints:\n\nnew_data = spark.read.format("iceberg")\n    .option("start-snapshot-id", "12345")\n    .option("end-snapshot-id", "12789")\n    .load("bronze.playback_event")\n\nIf the job fails after processing but before saving the checkpoint, it re-runs from the last successful snapshot. Since the output is idempotent (MERGE INTO Silver), re-processing the same input produces the same output — no duplicates.` },
  { id:47, q:"What is the difference between Trino and Redshift and when do you use each?", a:`Trino: distributed SQL query engine that reads data directly from Iceberg on S3. No data loading needed. Supports federated queries across multiple data sources. Best for: data scientists running exploratory queries, ad hoc analysis, cross-system joins.\n\nRedshift: managed columnar data warehouse. Data must be COPY-ed in (minutes to hours delay). Best for: high-concurrency BI dashboards with predictable query patterns, finance reporting requiring strict governance, queries that need guaranteed sub-2-second response under high concurrency.\n\nThey coexist: Redshift serves governed dashboards. Trino serves data scientists who need direct access to full-resolution Iceberg data.` },
  { id:48, q:"How does Netflix monitor data quality automatically?", a:`Four layers:\n\n1. Schema validation: Schema Registry rejects malformed events at ingestion — wrong types, missing required fields.\n\n2. Flink quality checks: Embedded in every Flink job — null rate, value range checks, row count expectations. If a metric degrades (>5% null on playback_id), alert fires.\n\n3. Iceberg table expectations: After each Spark job, automated checks run: row count within expected range, null rate per column, referential integrity. If any check fails, the Iceberg snapshot is NOT published to Gold.\n\n4. SLA monitoring: Freshness SLA per table (e.g., silver.playback_session must be updated within 30 minutes of the hour).` },
  { id:49, q:"How would you implement a GDPR deletion that is auditable?", a:`1. Create entry in gdpr_deletion_requests table\n2. Immediately delete from online stores: Redis, Cassandra, MySQL\n3. Write equality delete files to Iceberg tables for all event_ids\n4. Background job compacts affected Iceberg partitions to physically remove rows\n5. Add profile_token to suppression list — future replays skip matching records\n6. Expire Kafka data — raw events expire with topic retention policy\n7. Update gdpr_deletion_requests.status = 'COMPLETED'\n8. The audit record remains permanently (with user_id anonymized) to prove deletion happened` },
  { id:50, q:"How do you prevent a popular title (like Squid Game) from causing a hot partition in Kafka?", a:`If you partition by title_id, every event for Squid Game goes to one partition → hot partition → backpressure → pipeline lag.\n\nSolutions:\n1. Don't partition playback events by title_id. Use playback_id as the partition key.\n2. For title-level aggregations: Key by hash(title_id + session_id) % num_partitions. Then in Flink, do a two-stage aggregation: per-partition partial count → single merge operator → final count.\n3. Dynamic repartitioning: Detect hot titles and increase their key space by salting.\n4. Monitoring: Alert when a partition's consumer lag is >2x the cluster average.` },
];

export const QA_RELIABILITY: QA[] = [
  { id:51, q:"What is the most dangerous failure mode in this system?", a:`Silent data loss or silent semantic corruption. A visible failure (job crashing, Kafka lag alert) is caught quickly. A subtle bug that processes events incorrectly without crashing — for example, miscalculating buffering_ratio by off-by-one in a window boundary — could corrupt weeks of Gold data before anyone notices. Downstream models trained on bad data will produce bad recommendations. Dashboards will show false metrics.\n\nPrevention: data quality checks after every pipeline stage, checksums on record counts, business-rule validations (e.g., completion_percentage must be 0–100), and automated comparison against historical baselines.` },
  { id:52, q:"How does Netflix do a zero-downtime Kafka broker upgrade?", a:`1. Trigger a leader re-election to move all leaders off the broker being upgraded.\n2. Stop the broker.\n3. Upgrade the software.\n4. Restart the broker — it rejoins as a follower.\n5. Let it catch up to the leader (log replication).\n6. Gradually reassign some partition leaders back to the upgraded broker.\n7. Repeat for each broker.\n\nAt no point does the cluster lose availability — RF=3, min ISR=2 means the cluster continues operating with one broker down. Upgrades are done during low-traffic periods.` },
  { id:53, q:"How does the system handle a Flink job that keeps crashing due to a poison message?", a:`1. Dead letter queue: Wrap message processing in a try-catch. On failure, route the message to a quarantine topic with error metadata. Do not crash the job.\n2. Max retry limit: Configure restart-strategy: fixed-delay with attempts: 3. After 3 failures without progress, escalate to PagerDuty.\n3. Savepoint before restart: Take a savepoint before restarting to preserve state, then restart from savepoint skipping the poison offset.\n4. Schema validation at gateway: Validate Avro schema before events reach Kafka — reduces malformed events reaching Flink.` },
  { id:54, q:"How do you ensure a deployed model doesn't silently degrade recommendation quality?", a:`1. Shadow evaluation: Before promoting, run the new model on live traffic in shadow mode — it scores candidates but its output is not shown to users.\n2. Canary with Kayenta: Deploy to 5% of traffic. Kayenta analyzes: CTR, play rate, completion rate, skip rate. If any metric degrades by >2%, auto-rollback.\n3. Champion/challenger: Run both models simultaneously on disjoint user segments. After statistical significance (1–2 weeks), the winner is promoted.\n4. Feature drift monitoring: Monitor the distribution of input features over time.` },
  { id:55, q:"How does Netflix ensure a Spark backfill covering 2 years of data doesn't cost millions?", a:`1. Spot instances for executors: 70% cheaper than On-Demand. Since backfills are retryable (idempotent), Spot interruptions just cause a retry from the last checkpoint.\n2. Separate cost center: Separate Kubernetes namespace with CPU/memory quotas.\n3. Incremental checkpointing: Process data in monthly chunks, checkpointing after each chunk.\n4. Rate limiting: Backfill jobs have S3 read rate limits.\n5. Pre-approval gate: Large backfills (>1 TB estimated output) require explicit engineer approval.` },
  { id:56, q:"How do you handle the 'training data from future' trap in a churn prediction model?", a:`Churn prediction: predict if a user will cancel in the next 30 days. A naive implementation might use "subscription_end_date" as a feature — but this is the label itself. Similarly, using "last_login_date" from today for a label from 6 months ago leaks future information.\n\nSolution: define a prediction window (predict on day T, observe outcome on day T+30). Only features with timestamps ≤ T are used. Enforced by the point-in-time join. A separate training job generates the feature snapshot as-of each label's event_time using Iceberg time travel: SELECT * FROM feature_table TIMESTAMP AS OF label.event_time.` },
  { id:57, q:"What is the trickiest operational problem specific to a 1.5 PB/day data lake?", a:`Table maintenance. At this scale, Iceberg tables accumulate:\n- Millions of small data files (from streaming writes)\n- Thousands of manifests per table\n- Hundreds of snapshots per day\n- Gigabytes of delete files (from GDPR deletions)\n\nWithout aggressive maintenance: query planning time increases, S3 storage costs grow, compaction jobs themselves take hours and compete with production queries.\n\nSolution: continuous compaction using Flink for hot tables, scheduled Spark jobs for daily deep maintenance, manifest compaction weekly, snapshot expiry daily keeping only last 7 days.` },
  { id:58, q:"How does Netflix track data lineage end-to-end?", a:`Using OpenLineage (open standard) + DataHub:\n\n1. Every Flink job emits lineage events: { inputs: [kafka:prod.playback.started.v3], outputs: [iceberg:bronze.playback_event] }\n2. Every Spark job emits lineage events via Spark listener\n3. Every Airflow/Maestro DAG records parent/child dataset relationships\n4. Trino query logs are parsed to extract table lineage\n5. All lineage flows into DataHub, which builds a searchable graph\n\nUse cases: Impact analysis ("if I change this schema, what breaks?"), root cause analysis, compliance ("prove PII not in Gold tables").` },
  { id:59, q:"How would you design the data pipeline differently if rebuilding today?", a:`1. Apache Iceberg from day one. Netflix historically had custom table formats.\n2. Flink SQL for simple jobs. Writing Java/Scala for every transformation is overhead. Flink SQL covers 80% of use cases.\n3. Data contracts as first-class citizens. Define schema, SLA, owner, quality guarantees for every topic and table before writing data.\n4. Cost visibility from day one. Per-domain cost attribution before the platform is large.\n5. Streaming and batch as one. Use a unified API (Flink Table API) to express logic once and execute in both modes.` },
  { id:60, q:"How do you present this system design in a 60-minute interview?", a:`Minutes 0–5: Clarify. "Are we designing the video delivery system or the analytical data platform? What's the event rate assumption?"\n\nMinutes 5–10: State your assumptions. "700 billion events/day, 1.5 PB compressed, 15 million events/second peak, 3 regions, streaming latency <30s."\n\nMinutes 10–20: Draw the architecture. Sources → Gateway → Kafka → Flink → (Pinot | S3 Iceberg). Then: S3 → Spark → Silver/Gold → Trino/Redshift/ML.\n\nMinutes 20–35: Ingestion and streaming. Kafka partitioning, dedup, watermarks, DLQ, exactly-once.\n\nMinutes 35–45: Storage and batch. Bronze/Silver/Gold, Iceberg, partitioning, compaction, checkpoints.\n\nMinutes 45–55: Reliability and governance. Multi-region, GDPR, quality gates, lineage, data mesh.\n\nMinutes 55–60: Sizing and trade-offs. Kafka broker math, Flink CPU estimate, why Iceberg over Delta.` },
];

export const CHEAT_SHEET = {
  criticalNumbers: `300M subscribers                     260–300M
Peak concurrent streams              60M
API requests/second                  1M+
OCA appliances                       ~17,000
Events/day (analytics)               700 billion
Data/day                             1.5 PB
Peak events/second                   15M
Cassandra nodes                      ~10,000
Encoding variants per title          1,200+
Access token TTL                     15 minutes
Refresh token TTL                    30 days
Stream slot TTL                      36 seconds (refreshed every 30s heartbeat)
Playback service P99 latency target  <300ms
Route53 failover time                ~30 seconds
EVCache peak requests/second         ~30M`,
  dbDecisionTree: `Need ACID + money?          → MySQL (RDS Multi-AZ)
High write, eventual ok?    → Cassandra
Sub-ms + TTL + atomic Lua?  → Redis
Hot reads, multi-AZ?        → EVCache (Memcached)
Full-text search?           → Elasticsearch
SQL on lake?                → Trino / Athena
Governed BI dashboards?     → Redshift
Real-time OLAP (<100ms)?    → Apache Pinot
Online ML features (<5ms)?  → DynamoDB + Redis
Long-term analytical truth? → S3 + Iceberg`,
  kafkaConfig: `acks=all
enable.idempotence=true
retries=2147483647
min.insync.replicas=2
replication.factor=3
unclean.leader.election.enable=false
compression.type=zstd`,
  icebergPartition: `DO:    PARTITIONED BY (hours(event_time), bucket(256, profile_id))
DO:    PARTITIONED BY (days(event_time), identity(country))
DON'T: Partition by raw profile_id (millions of tiny partitions)
DON'T: Partition by exact timestamp (one partition per event)
DON'T: Partition by high-cardinality IDs directly
Target file size: 512 MB – 1 GB after compaction`,
  fallbackMatrix: [
    { service: "Recommendation fails", fallback: "trending titles from EVCache — never show blank screen" },
    { service: "Catalog Service slow", fallback: "stale EVCache title metadata (5-min TTL)" },
    { service: "DRM Service down", fallback: "graceful 'content unavailable' error, no silent failure" },
    { service: "Billing unreachable", fallback: "allow stream, reconcile entitlement async (fail open)" },
    { service: "Concurrency check fails", fallback: "allow stream, alert ops, investigate post-hoc" },
    { service: "Cassandra unavailable (heartbeat)", fallback: "write to Kafka outbox, async reconcile when Cassandra recovers" },
    { service: "EVCache cold (new region)", fallback: "request coalescing on Cassandra — one thread fetches, others wait and share result" },
    { service: "Steering Service down", fallback: "static OCA list from config — no optimal selection, but streaming continues" },
    { service: "OCA cache fill fails overnight", fallback: "fallthrough to S3 Origin — higher latency, no interruption to user" },
    { service: "Search Service down", fallback: "return cached popular titles; search box shows 'results may be limited'" },
    { service: "Kafka consumer lag grows to hours", fallback: "backpressure: client SDK buffers events locally (in-memory queue, max 5k events), retries on reconnect" },
  ],
  interviewPhrases: [
    "95% of Netflix traffic is video bytes flowing Client ↔ OCA — the API tier is not in the hot path.",
    "We use atomic Lua scripts for stream slot acquisition to prevent TOCTOU races — check+increment is one atomic operation.",
    "Every query must hit a single Cassandra partition — no ALLOW FILTERING, no joins. The partition key is the access pattern.",
    "Bronze is immutable. If our processing logic was wrong, we replay Bronze to recompute Silver — never modify source data.",
    "Per-title encoding analyzes scene complexity (VMAF) and assigns bitrates based on actual visual difficulty, not a fixed ladder — 20% bandwidth savings.",
    "Artwork personalization runs a UCB bandit per user segment — a romance viewer sees a couple, an action viewer sees an explosion from the same title.",
    "We use Iceberg because it gives us atomic snapshots, schema evolution, and time travel — things you cannot get from plain Parquet folders on S3.",
    "Kafka is the short-term buffer and replay mechanism. S3 + Iceberg is the long-term source of truth. You always replay from S3, not Kafka.",
    "Zuul2 is stateless — all session state lives in Cassandra/Redis. That's what makes horizontal scaling trivial: add instances, no state migration.",
    "OCA nightly fill is prediction-driven — we push what we think users will watch tomorrow to the ISP before they ask for it. Pull becomes push.",
    "DRM key delivery to the TEE is decoupled from video bytes — the key never travels with the content. Even if an OCA is compromised, the content is unusable.",
    "Chaos Kong takes down an entire AWS region in production. If the system can't survive that test, it isn't resilient — no amount of unit tests replaces this.",
  ],
};

export const ACCESS_PATTERNS = [
  {
    table: "watch_history",
    accessPattern: "Get recent watches for a profile (recent-first)",
    db: "Cassandra",
    partitionKey: "(profile_id, year)",
    clusteringKey: "watched_at DESC",
    why: "Write-heavy (every 30s heartbeat × 300M users). Eventual consistency acceptable. Composite partition (profile_id, year) prevents unbounded partition growth for heavy users.",
    cql: `CREATE TABLE watch_history (
  profile_id       UUID,
  year             INT,
  watched_at       TIMESTAMP,
  content_id       UUID,
  episode_id       UUID,
  watch_position_secs INT,
  progress_pct     FLOAT,
  PRIMARY KEY ((profile_id, year), watched_at)
) WITH CLUSTERING ORDER BY (watched_at DESC)
  AND default_time_to_live = 31536000;  -- 1 year TTL`,
  },
  {
    table: "stream_sessions",
    accessPattern: "Get active session by session_id; list sessions by profile",
    db: "Cassandra",
    partitionKey: "profile_id",
    clusteringKey: "started_at DESC",
    why: "High write rate (every playback start). Lookups are always by profile_id. No joins needed.",
    cql: `CREATE TABLE stream_sessions (
  profile_id       UUID,
  started_at       TIMESTAMP,
  session_id       UUID,
  content_id       UUID,
  video_id         UUID,
  quality          TEXT,
  status           TEXT,
  bytes_transferred BIGINT,
  PRIMARY KEY ((profile_id), started_at, session_id)
) WITH CLUSTERING ORDER BY (started_at DESC);`,
  },
  {
    table: "subscriptions",
    accessPattern: "Check active subscription for account; billing ACID updates",
    db: "MySQL (RDS Multi-AZ)",
    partitionKey: "account_id (indexed)",
    clusteringKey: "N/A — relational",
    why: "Billing requires ACID transactions. SELECT FOR UPDATE prevents double-charge races. Low write volume (one row per account). Strong consistency required.",
    cql: `CREATE TABLE subscriptions (
  subscription_id  CHAR(36)     PRIMARY KEY,
  account_id       CHAR(36)     NOT NULL,
  plan             ENUM('basic','standard','premium') NOT NULL,
  status           ENUM('active','cancelled','past_due') NOT NULL,
  price            DECIMAL(8,2) NOT NULL,
  period_end       DATETIME     NOT NULL,
  max_streams      INT          NOT NULL,  -- 1, 2, or 4
  INDEX idx_account (account_id)
);`,
  },
  {
    table: "continue_watching",
    accessPattern: "Get all in-progress titles for a profile (homepage row)",
    db: "EVCache (Memcached) + Cassandra fallback",
    partitionKey: "profile_id",
    clusteringKey: "last_updated DESC",
    why: "Read on every homepage load. Denormalized — position already stored here, no join to watch_history needed. EVCache serves sub-ms reads; Cassandra is the durable source on cache miss.",
    cql: `-- EVCache key: continue_watching:{profileId}  TTL 5m
-- Cassandra source-of-truth:
CREATE TABLE continue_watching (
  profile_id       UUID,
  last_updated     TIMESTAMP,
  content_id       UUID,
  episode_id       UUID,
  position_secs    INT,
  PRIMARY KEY ((profile_id), last_updated, content_id)
) WITH CLUSTERING ORDER BY (last_updated DESC);`,
  },
  {
    table: "stream_slots (concurrency control)",
    accessPattern: "Atomic check-and-increment on playback start; auto-expire on crash",
    db: "Redis",
    partitionKey: "account_id",
    clusteringKey: "N/A — Redis key",
    why: "Must be atomic (Lua script), sub-millisecond, and auto-expire. No relational DB can do check+set+TTL atomically at this latency. Redis Lua ensures check+INCR is one operation.",
    cql: `-- Redis key patterns:
streams:active:{accountId}         → INT (current count)  TTL 36s
streams:sessions:{accountId}       → SET of sessionIds    TTL 36s

-- Lua script (atomic):
local count = redis.call('GET', KEYS[1]) or 0
if tonumber(count) >= tonumber(ARGV[1]) then
  return {0, 'LIMIT_REACHED'}
end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 36)
redis.call('SADD', KEYS[2], ARGV[2])
redis.call('EXPIRE', KEYS[2], 36)
return {1, 'OK'}`,
  },
  {
    table: "content / catalog",
    accessPattern: "Get title metadata by content_id (every page load)",
    db: "EVCache (hot) → Cassandra (miss)",
    partitionKey: "content_id",
    clusteringKey: "N/A",
    why: "Catalog is read-heavy, write-rare (new titles launch infrequently). A 5-minute stale cache is acceptable. EVCache replicates to all AZs on write so AZ failure is transparent.",
    cql: `-- EVCache key: title:{contentId}  TTL 5m
-- Cassandra source-of-truth:
CREATE TABLE content (
  content_id   UUID PRIMARY KEY,
  title        TEXT,
  type         TEXT,           -- 'movie' or 'series'
  status       TEXT,
  age_rating   TEXT,
  genres       LIST<TEXT>,
  release_year INT,
  regions      SET<TEXT>       -- availability
);`,
  },
];

export const ENCODING_PIPELINE = {
  overview: `Studio delivers master files (typically ProRes 4444 or IMF) to Netflix's Replication service on S3 Origin. The Encoding Pipeline transforms these into 1,200+ adaptive streaming variants per title and encrypts them with DRM before pushing to OCAs.`,
  stages: [
    { name: "Ingest & Validate", detail: "Studio uploads master via Aspera/S3. Validator checks codec, color space, audio channels, frame rate, and embedded metadata. Rejects non-compliant masters." },
    { name: "Shot Detection", detail: "FFprobe + ML model detects scene boundaries and shot-level visual complexity. Outputs a complexity profile per shot — this is what makes per-shot encoding possible." },
    { name: "Per-Title / Per-Shot Encoding", detail: "Traditional: fixed bitrate ladder (720p always at 3Mbps). Netflix: complexity-aware ladder. A simple animated episode (low DCT complexity) uses 800 kbps at 1080p. A dark live-action thriller uses 4000 kbps. Same VMAF perceptual quality score at very different bitrates." },
    { name: "VMAF Quality Validation", detail: "Every encoded variant is scored with VMAF (Video Multi-Method Assessment Fusion) — Netflix's perceptual quality metric. Variants that don't meet the VMAF target are re-encoded at a higher bitrate. This is the quality gate." },
    { name: "DRM Encryption", detail: "Each video segment encrypted with AES-128 CTR. Content Encryption Key (CEK) generated per title. CEK stored in Key Management Service (KMS). Separate Widevine/FairPlay/PlayReady license servers hold the CEK and issue it only after validating playback session token." },
    { name: "Packaging (DASH/HLS)", detail: "CMAF packaging creates DASH (MPD manifests) and HLS (m3u8 manifests) from the same encrypted segments — Common Media Application Format allows segment reuse. Manifest references all quality variants and their segment URLs." },
    { name: "S3 Origin Storage", detail: "Final segments + manifests stored on S3. Organized by titleId/episodeId/variantId. This is the origin that OCAs pull from during their nightly fill cycle." },
    { name: "OCA Fill (Proactive CDN Push)", detail: "Steering Service predicts popularity (from recommendation signals and release schedules). During off-peak hours, fill daemon pushes predicted-popular content to OCAs near the predicted viewer concentration. Client never waits for a cold OCA on a fresh release." },
  ],
  variants: `Per title: ~1,200 variants =
  6 resolutions (240p, 360p, 480p, 720p, 1080p, 4K)
  × 3 bitrates per resolution (per-title optimized)
  × 3 DRM systems (Widevine, FairPlay, PlayReady)
  × audio tracks (5.1, stereo, Atmos)
  × subtitles (20+ languages)
  × HDR variants (SDR, HDR10, Dolby Vision)`,
  keyInsight: `The insight is that visual complexity is not uniform. Encoding a talking-heads interview at 4K/4Mbps is wasteful — VMAF shows you can achieve identical quality at 1.2Mbps because there is little motion or detail. Per-title encoding optimizes per content type. Per-shot encoding (their latest approach) goes further: within one movie, the action sequence gets a higher bitrate budget than the dialogue scene.`,
};

export const RECOMMENDATION_DEEP_DIVE = {
  coldStart: `Cold start (brand new user, zero watch history):
1. Country + time-of-day signals: US, Sunday 9pm → trending US drama/comedy
2. Onboarding survey: user picks 3 genres and 3 titles they've heard of
3. These selections seed an initial user embedding
4. After 3–5 watches, the ML model takes over from the rule-based cold start
5. Parallel: show "Popular in [Country]" and "Top Picks for You" rows — the latter improves as watch history builds`,

  twoTower: `Two-Tower Model Architecture:
┌─────────────────┐     ┌─────────────────┐
│   User Tower    │     │  Content Tower  │
│                 │     │                 │
│  watch_history  │     │  genre, cast    │
│  ratings        │     │  synopsis emb.  │
│  time-of-day    │     │  popularity     │
│  device_type    │     │  freshness      │
│  country        │     │  completion_pct │
└────────┬────────┘     └────────┬────────┘
         │  user_emb (768d)      │  content_emb (768d)
         └──────────┬────────────┘
                DOT PRODUCT → relevance score

Output: top-K candidates (k ≈ 1,000) from ~36,000 titles
Next: lightweight ranker re-scores top-1000 → final 80 shown`,

  featureStore: `Feature Store — Where Features Live:
┌─────────────────────────────────────────────────────┐
│ Online Store (sub-5ms latency)                      │
│  DynamoDB: user embedding, content embeddings       │
│  Redis:    recent watch sessions (last 10), ratings │
│  EVCache:  A/B variant assignments, plan info       │
├─────────────────────────────────────────────────────┤
│ Offline Store (batch, training data)                │
│  S3 Iceberg: full watch history, ratings, clicks    │
│  gold.user_features: daily user feature snapshots  │
│  gold.content_features: title statistics            │
└─────────────────────────────────────────────────────┘
Key principle: Online features must match training features exactly.
Training-serving skew (using different feature computation) is
the most common cause of model degradation in production.`,

  artworkBandit: `Artwork Selection — UCB Bandit:
For each title × user segment:
  - 5–10 artwork variants created (romantic, action, actor face, etc.)
  - UCB score = avg_CTR + sqrt(2 * ln(total_impressions) / variant_impressions)
  - Variants with few impressions get exploration bonus (high uncertainty)
  - After statistical significance (~10K impressions): winning variant dominates

Why UCB over Thompson Sampling?
  UCB is deterministic given the same state → reproducible A/B analysis
  Thompson Sampling is stochastic → harder to debug production behavior`,
};

export const HOUSEHOLD_ENFORCEMENT = {
  problem: `Password sharing: users sharing an account across different households.
Netflix's solution (2023): "Paid Sharing" — restrict simultaneous streaming to one household (primary location), with the ability to add extra members for a fee.`,

  signals: [
    "IP geolocation: all devices on the account should resolve to the same ISP/region most of the time",
    "WiFi network BSSID: devices on same WiFi = same household",
    "GPS coordinates (mobile): optional, on permission",
    "Device fingerprint: device_id × account consistency over time",
    "Viewing time patterns: consistent timezone and viewing hours",
  ],

  dataModel: `-- MySQL: household tracking
CREATE TABLE household_locations (
  account_id      CHAR(36)     NOT NULL,
  location_hash   CHAR(64)     NOT NULL,  -- hash(ISP + postal_code)
  verified_at     DATETIME     NOT NULL,
  device_count    INT          DEFAULT 0,
  PRIMARY KEY (account_id),
  INDEX idx_location (location_hash)
);

CREATE TABLE trusted_devices (
  account_id   CHAR(36)      NOT NULL,
  device_id    CHAR(36)      NOT NULL,
  device_type  TEXT,
  last_seen_at DATETIME,
  is_home      BOOLEAN       DEFAULT FALSE,
  PRIMARY KEY (account_id, device_id)
);`,

  enforcement: `Enforcement Logic (runs on every playback start):
1. Fetch household_location for account_id
2. Compare current request IP geolocation to stored household
3. If mismatch AND device not in trusted_devices:
   - First offense: send email "Is this you?" — 7-day grace period
   - Repeated offenses: show "Set up your household" flow
   - User can explicitly add a travel device for 31 days
4. stream_sessions still allowed during grace period (fail open)`,

  keyInsight: `Never hard-block on first mismatch — false positives from hotel WiFi, VPNs, or travel would cause legitimate users to be locked out. The enforcement is soft and progressive. The system tracks signals probabilistically and only escalates after consistent mismatch patterns.`,
};

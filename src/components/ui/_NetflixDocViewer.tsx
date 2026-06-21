"use client";
import { useState, useEffect, useRef, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────
type Service = {
  id: string; name: string; color: string; tech: string;
  whatItDoes: string; responsibilities: string[];
  apiRoutes: { method: string; path: string; desc: string }[];
  codeBlock: string; dbTables: string[]; insight: string;
};
type QA = { id: string; q: string; a: string };

// ─── Services Data ───────────────────────────────────────────
const SERVICES: Service[] = [
  {
    id:"client", name:"Client App", color:"#e50914", tech:"React Native / Web",
    whatItDoes:"Netflix client runs on 2,000+ device types. Uses adaptive streaming (DASH/HLS), prefetches manifests during playback, and implements predictive buffering.",
    responsibilities:["Adaptive bitrate switching via DASH/HLS","Predictive video prefetch","DRM license caching","A/B test variant rendering","Offline download management"],
    apiRoutes:[{method:"GET",path:"/manifest/{titleId}",desc:"Fetch adaptive streaming manifest"},{method:"POST",path:"/playback/start",desc:"Report playback session start"},{method:"GET",path:"/downloads/{profileId}",desc:"List downloaded titles"}],
    codeBlock:`class AdaptiveBitrateController {
  selectBitrate(bandwidth: number, bufferLevel: number): Bitrate {
    if (bufferLevel < 5) return BITRATE.LOW;
    if (bandwidth > 20_000_000) return BITRATE.ULTRA;
    return BITRATE.MEDIUM;
  }
}`,
    dbTables:["device_profiles (device_id, capabilities, last_seen)","playback_sessions (session_id, title_id, position_ms)"],
    insight:"Netflix pre-fetches the first 30 seconds of the top 3 predicted next episodes during playback to make instant-play feel instantaneous."
  },
  {
    id:"cdn", name:"CDN / OCA", color:"#ff6b35", tech:"Open Connect Appliance",
    whatItDoes:"Netflix's own CDN with ~17,000 OCAs in 1,000+ ISP locations worldwide. OCAs cache the entire Netflix catalog locally at ISPs, eliminating backbone transit for >95% of traffic.",
    responsibilities:["Cache entire Netflix catalog at ISP PoPs","BGP anycast routing to nearest OCA","Proactive pre-population during off-peak","Health reporting to Steering Service","TLS termination for video streams"],
    apiRoutes:[{method:"GET",path:"/v/{assetId}/{bitrate}",desc:"Stream video chunk"},{method:"GET",path:"/manifest/{titleId}.mpd",desc:"DASH manifest delivery"},{method:"POST",path:"/health",desc:"OCA health beacon to steering"}],
    codeBlock:`class OCAHealthReporter {
  async reportHealth(): Promise<void> {
    const metrics = {
      availableCapacityGb: this.getAvailableCapacity(),
      cacheFillRatio: this.getCacheFill(),
      activeConnections: this.getActiveConns(),
      location: this.geoLocation
    };
    await steeringService.update(this.ocaId, metrics);
  }
}`,
    dbTables:["oca_registry (oca_id, isp, location, capacity_tb)","cache_manifest (title_id, oca_id, cached_at)"],
    insight:"During off-peak hours (2–6 AM), OCAs proactively pull popular content so that 95%+ of peak-hour traffic never leaves the ISP network."
  },
  {
    id:"elb", name:"Load Balancer", color:"#f0a500", tech:"AWS ELB + Zuul",
    whatItDoes:"Netflix uses AWS Elastic Load Balancers as the first tier, backed by Zuul (their own edge proxy) for dynamic routing, rate limiting, and auth token validation.",
    responsibilities:["L7 HTTP routing across availability zones","SSL termination","Rate limiting per client IP/token","Health-check-based failover","Request fan-out for parallel calls"],
    apiRoutes:[{method:"*",path:"/*",desc:"All traffic enters via ELB"},{method:"GET",path:"/health",desc:"ELB target health check"}],
    codeBlock:`class ZuulFilter extends ZuulFilter {
  filterType = "pre";
  run(): Object {
    const token = RequestContext.currentContext
      .getRequest().getHeader("Authorization");
    if (!authService.validate(token)) {
      RequestContext.setSendZuulResponse(false);
      RequestContext.setResponseStatusCode(401);
    }
    return null;
  }
}`,
    dbTables:["rate_limit_buckets (client_id, window_start, request_count)"],
    insight:"Netflix's Zuul 2 uses Netty for non-blocking I/O, handling 1M+ req/s per cluster with ~2ms added latency at the 99th percentile."
  },
  {
    id:"eureka", name:"Eureka", color:"#9c27b0", tech:"Service Registry",
    whatItDoes:"Netflix Eureka is a REST-based service registry. Every microservice registers on startup and sends heartbeats every 30s. Clients cache the registry locally so discovery survives Eureka outages.",
    responsibilities:["Service instance registration/deregistration","Heartbeat-based health tracking","Client-side load balancing support","Regional and zonal awareness","Self-preservation mode during network partitions"],
    apiRoutes:[{method:"POST",path:"/eureka/apps/{appName}",desc:"Register service instance"},{method:"PUT",path:"/eureka/apps/{appName}/{instanceId}",desc:"Heartbeat renew"},{method:"GET",path:"/eureka/apps",desc:"Fetch full registry"},{method:"DELETE",path:"/eureka/apps/{appName}/{instanceId}",desc:"Deregister instance"}],
    codeBlock:`@EnableEurekaClient
@SpringBootApplication
public class PlaybackService {
  // Registers automatically on startup
  // Sends heartbeat every 30s
  // Fetches registry delta every 30s
}`,
    dbTables:["service_registry (app_name, instance_id, ip, port, status, last_heartbeat)"],
    insight:"Eureka's self-preservation mode: if >85% of heartbeats are missed in 15 minutes, it stops expiring instances, assuming a network partition rather than mass failure."
  },
  {
    id:"zuul", name:"Zuul Gateway", color:"#00bcd4", tech:"Java / Netty",
    whatItDoes:"Zuul is Netflix's API gateway — the single entry point for all 1M+ req/s. It handles routing, auth, rate limiting, retry logic, and request/response transformation.",
    responsibilities:["Dynamic routing via Eureka service registry","Auth token validation (pre-filter)","Adaptive retry with exponential backoff","Request/response body transformation","Shadow traffic for canary testing"],
    apiRoutes:[{method:"GET",path:"/api/titles/{id}",desc:"Route to catalog service"},{method:"POST",path:"/api/playback/start",desc:"Route to playback service"},{method:"GET",path:"/api/user/{id}/profile",desc:"Route to user service"}],
    codeBlock:`class RateLimitFilter : ZuulFilter() {
  override fun run(): Any? {
    val key = RateLimitUtils.buildKey(request)
    val bucket = rateLimiter.tryConsume(key, 1)
    if (!bucket) {
      response.status = 429
      response.addHeader("Retry-After", "1")
      RequestContext.setSendZuulResponse(false)
    }
    return null
  }
}`,
    dbTables:["route_rules (pattern, target_service, weight)","rate_limit_config (client_tier, rps_limit)"],
    insight:"Zuul uses Hystrix circuit breakers per downstream service — if error rate exceeds 50% in a 10s window, the circuit opens and returns cached fallback responses."
  },
  {
    id:"auth", name:"Auth Service", color:"#4caf50", tech:"OAuth 2.0 / JWT",
    whatItDoes:"Handles authentication via OAuth 2.0. Issues short-lived JWTs (15 min) + long-lived refresh tokens (30 days). Stores sessions in EVCache for sub-millisecond validation at 1M+ req/s.",
    responsibilities:["OAuth 2.0 / OIDC login flows","JWT issuance and validation","Refresh token rotation","Device trust management","Fraud detection signals"],
    apiRoutes:[{method:"POST",path:"/auth/token",desc:"Exchange credentials for JWT"},{method:"POST",path:"/auth/refresh",desc:"Refresh access token"},{method:"POST",path:"/auth/logout",desc:"Revoke refresh token"},{method:"GET",path:"/auth/validate",desc:"Validate JWT (internal)"}],
    codeBlock:`class JwtService {
  issueToken(userId: string, deviceId: string): TokenPair {
    const access = jwt.sign(
      { sub: userId, did: deviceId, scope: "stream" },
      privateKey,
      { expiresIn: "15m", algorithm: "RS256" }
    );
    const refresh = crypto.randomBytes(32).toString("hex");
    evcache.set(\`rt:\${userId}:\${deviceId}\`, refresh, 30 * 86400);
    return { access, refresh };
  }
}`,
    dbTables:["sessions (session_id, user_id, device_id, refresh_token_hash, expires_at)","device_trust (device_id, user_id, trusted_at, risk_score)"],
    insight:"Netflix validates JWTs at the Zuul gateway using public keys — no database hit for 99% of requests. Only refresh token exchanges hit the Auth Service."
  },
  {
    id:"user", name:"User Service", color:"#2196f3", tech:"Java / Cassandra",
    whatItDoes:"Manages user profiles, watch history, preferences, and viewing state. Stores data in Cassandra for high write throughput and EVCache for sub-ms reads.",
    responsibilities:["CRUD for user profiles and preferences","Watch history persistence (position_ms)","Content ratings and reviews","Notification preferences","Privacy/GDPR deletion workflows"],
    apiRoutes:[{method:"GET",path:"/users/{id}/profiles",desc:"List profiles on account"},{method:"PUT",path:"/users/{id}/watch/{titleId}",desc:"Update watch position"},{method:"GET",path:"/users/{id}/history",desc:"Paginated watch history"},{method:"DELETE",path:"/users/{id}",desc:"GDPR account deletion"}],
    codeBlock:`class WatchHistoryRepository {
  async updatePosition(
    userId: string, titleId: string, positionMs: number
  ): Promise<void> {
    const key = \`wh:\${userId}:\${titleId}\`;
    await evcache.set(key, { positionMs, updatedAt: Date.now() }, 7 * 86400);
    await cassandra.execute(
      "UPDATE watch_history SET position_ms=?, updated_at=? WHERE user_id=? AND title_id=?",
      [positionMs, Date.now(), userId, titleId]
    );
  }
}`,
    dbTables:["profiles (user_id, profile_id, name, avatar, maturity_level)","watch_history (user_id, title_id, position_ms, completed, updated_at)","user_preferences (user_id, language, subtitle_lang, autoplay)"],
    insight:"Netflix uses write-through cache: every watch position update writes to EVCache first (sync) and Cassandra second (async), ensuring <5ms response time even under peak load."
  },
  {
    id:"catalog", name:"Catalog Service", color:"#ff9800", tech:"Java / MySQL + ElasticSearch",
    whatItDoes:"The source of truth for all 17,000+ Netflix titles. Stores metadata, availability by region, and content ratings. ElasticSearch powers the search index.",
    responsibilities:["Title metadata CRUD","Regional availability rules","Content rating by country","Search index synchronization","Recommendations feed for ML training"],
    apiRoutes:[{method:"GET",path:"/catalog/titles/{id}",desc:"Fetch title metadata"},{method:"GET",path:"/catalog/titles?region={cc}",desc:"Browse by region"},{method:"POST",path:"/catalog/titles",desc:"Ingest new title (internal)"},{method:"GET",path:"/catalog/search?q={query}",desc:"Full-text search"}],
    codeBlock:`class CatalogRepository {
  async getTitleWithRegionCheck(titleId: string, region: string) {
    const cached = await evcache.get(\`title:\${titleId}:\${region}\`);
    if (cached) return cached;
    const [title, avail] = await Promise.all([
      mysql.query("SELECT * FROM titles WHERE id=?", [titleId]),
      mysql.query("SELECT * FROM availability WHERE title_id=? AND region=?", [titleId, region])
    ]);
    if (!avail.length) return null;
    const result = { ...title[0], ...avail[0] };
    await evcache.set(\`title:\${titleId}:\${region}\`, result, 3600);
    return result;
  }
}`,
    dbTables:["titles (title_id, name, type, year, synopsis, maturity_rating)","availability (title_id, region, available_from, available_until)","cast_crew (title_id, person_id, role, billing_order)"],
    insight:"Catalog data is eventually consistent. Regional availability changes propagate via Kafka events, so a title becoming unavailable may take up to 60 seconds to propagate globally."
  },
  {
    id:"search", name:"Search Service", color:"#e91e63", tech:"ElasticSearch + BERT",
    whatItDoes:"Powers Netflix's search with a hybrid approach: exact-match ElasticSearch for typo-tolerance, plus BERT embeddings for semantic search ('something to watch on a rainy day').",
    responsibilities:["Full-text title and person search","Semantic/vector similarity search","Personalized result ranking","Search autocomplete and suggestions","A/B test different ranking algorithms"],
    apiRoutes:[{method:"GET",path:"/search?q={query}&profile={id}",desc:"Personalized search"},{method:"GET",path:"/search/suggest?q={prefix}",desc:"Autocomplete"},{method:"POST",path:"/search/index/{titleId}",desc:"Index title (internal)"}],
    codeBlock:`class HybridSearchService {
  async search(query: string, userId: string): Promise<SearchResult[]> {
    const [lexical, semantic] = await Promise.all([
      elasticsearch.search({
        index: "titles",
        query: { multi_match: { query, fields: ["title^3","synopsis","cast"] } }
      }),
      vectorDB.search(await bertEncoder.encode(query), { topK: 50, filter: { userId } })
    ]);
    return this.mergeAndRank(lexical.hits, semantic.results, userId);
  }
}`,
    dbTables:["search_index (title_id, tokens, embedding_vector)","search_events (user_id, query, clicked_title_id, rank, ts)"],
    insight:"Netflix's BERT-based semantic search understands context. Searching 'shows about found family' returns results the lexical engine would miss entirely."
  },
  {
    id:"playback", name:"Playback Service", color:"#009688", tech:"Java / DynamoDB",
    whatItDoes:"Orchestrates the entire video playback session: validates DRM license, selects optimal OCA, generates time-limited signed URLs, and tracks session events.",
    responsibilities:["Playback session authorization","OCA selection via Steering Service","Signed URL generation for CDN chunks","DRM license coordination","Session heartbeat and abandonment tracking"],
    apiRoutes:[{method:"POST",path:"/playback/start",desc:"Initialize playback session"},{method:"GET",path:"/playback/{sessionId}/manifest",desc:"Signed manifest URL"},{method:"POST",path:"/playback/{sessionId}/heartbeat",desc:"Keep session alive"},{method:"POST",path:"/playback/{sessionId}/end",desc:"End playback session"}],
    codeBlock:`class PlaybackSessionService {
  async startSession(userId: string, titleId: string, deviceId: string) {
    const [drm, oca] = await Promise.all([
      drmService.issueLicense(userId, titleId, deviceId),
      steeringService.selectOca(userId, deviceId)
    ]);
    const session = {
      sessionId: uuid(), userId, titleId,
      ocaUrl: oca.url, drmToken: drm.token,
      manifestUrl: this.signUrl(oca.url, titleId, "15m")
    };
    await dynamodb.put({ TableName: "sessions", Item: session });
    return session;
  }
}`,
    dbTables:["playback_sessions (session_id, user_id, title_id, oca_id, started_at, ended_at)","session_events (session_id, event_type, position_ms, ts)"],
    insight:"Playback service issues manifest URLs with 15-minute signatures. If playback pauses for >15 min, the client must call /heartbeat to get a fresh signed URL."
  },
  {
    id:"steering", name:"Steering Service", color:"#795548", tech:"Python / ML",
    whatItDoes:"Real-time OCA selection engine. Given user location, device, and current OCA health metrics, selects the best OCA(s) to serve video with lowest latency and highest reliability.",
    responsibilities:["Real-time OCA health aggregation","Latency-aware OCA ranking","Fallback OCA list generation","BGP route optimization signals","ISP peering quality scoring"],
    apiRoutes:[{method:"GET",path:"/steering/oca?userId={id}&titleId={tid}",desc:"Get ranked OCA list"},{method:"POST",path:"/steering/health/{ocaId}",desc:"OCA health update"},{method:"GET",path:"/steering/manifest/{titleId}/{ocaId}",desc:"Signed manifest"}],
    codeBlock:`class OcaRanker {
  rank(userId: string, ocas: OCA[], health: Map<string, Health>): OCA[] {
    return ocas
      .filter(o => health.get(o.id)?.status === "healthy")
      .sort((a, b) => this.score(b, health.get(b.id)!, userId)
                    - this.score(a, health.get(a.id)!, userId));
  }
  score(oca: OCA, h: Health, userId: string): number {
    return (h.availableCapacityGb * 0.4)
      + (1 / h.rttMs * 0.4)
      + (this.isSameIsp(oca, userId) ? 20 : 0);
  }
}`,
    dbTables:["oca_health (oca_id, status, rtt_ms, capacity_gb, updated_at)","oca_assignments (user_id, oca_id, assigned_at)"],
    insight:"Steering checks OCA health every 30 seconds. During Super Bowl-scale events, it pre-warms additional OCAs and shifts BGP weights to balance load before demand spikes."
  },
  {
    id:"drm", name:"DRM Service", color:"#607d8b", tech:"Widevine / PlayReady / FairPlay",
    whatItDoes:"Issues DRM licenses for Widevine (Android/Chrome), PlayReady (Windows), and FairPlay (Apple). Validates entitlements before issuing and enforces concurrent stream limits.",
    responsibilities:["DRM license issuance per device type","Entitlement validation","Concurrent stream enforcement","License expiry and renewal","Anti-piracy device fingerprinting"],
    apiRoutes:[{method:"POST",path:"/drm/license/widevine",desc:"Issue Widevine license"},{method:"POST",path:"/drm/license/fairplay",desc:"Issue FairPlay license"},{method:"GET",path:"/drm/entitlement/{userId}/{titleId}",desc:"Check streaming rights"}],
    codeBlock:`class DrmLicenseService {
  async issueLicense(userId: string, titleId: string, deviceId: string, scheme: DrmScheme) {
    const [entitlement, streamCount] = await Promise.all([
      billingService.checkActive(userId),
      concurrencyService.getStreamCount(userId)
    ]);
    if (!entitlement.active) throw new UnauthorizedError("Subscription inactive");
    if (streamCount >= entitlement.maxStreams) throw new ConcurrentStreamError();
    return drmProvider.issueLicense({ userId, titleId, deviceId, scheme, expiry: "8h" });
  }
}`,
    dbTables:["licenses (license_id, user_id, title_id, device_id, scheme, issued_at, expires_at)","entitlements (user_id, plan_type, max_streams, hdr_allowed)"],
    insight:"DRM licenses are valid for 8 hours but soft-renewed every 4 hours. Netflix can revoke access within 4 hours if a subscription is cancelled mid-stream."
  },
  {
    id:"billing", name:"Billing Service", color:"#f44336", tech:"Java / MySQL / Stripe",
    whatItDoes:"Manages subscription plans, payment processing via Stripe, invoice generation, and dunning (retry logic for failed payments). Integrates with 40+ payment methods globally.",
    responsibilities:["Subscription lifecycle management","Payment processing via Stripe","Dunning workflow for failed payments","Invoice generation and tax calculation","Fraud detection signals to Auth Service"],
    apiRoutes:[{method:"GET",path:"/billing/subscription/{userId}",desc:"Get subscription details"},{method:"POST",path:"/billing/subscription",desc:"Create new subscription"},{method:"POST",path:"/billing/payment/retry",desc:"Retry failed payment"},{method:"GET",path:"/billing/invoices/{userId}",desc:"List invoices"}],
    codeBlock:`class DunningService {
  async handleFailedPayment(userId: string, invoice: Invoice) {
    const retrySchedule = [1, 3, 7, 14]; // days after failure
    for (const dayOffset of retrySchedule) {
      await scheduler.schedule(
        \`retry-\${invoice.id}-d\${dayOffset}\`,
        new Date(Date.now() + dayOffset * 86400000),
        () => this.retryPayment(userId, invoice)
      );
    }
    await notificationService.sendPaymentFailedEmail(userId, invoice);
  }
}`,
    dbTables:["subscriptions (user_id, plan, status, started_at, next_billing_date)","payments (payment_id, user_id, amount, currency, status, stripe_charge_id)","invoices (invoice_id, user_id, amount, period_start, period_end, pdf_url)"],
    insight:"Netflix uses a smart dunning strategy: retries at 1, 3, 7, and 14 days. The 3-day retry has the highest success rate as it catches most temporary card failures."
  },
  {
    id:"recommendation", name:"Recommendation Engine", color:"#673ab7", tech:"Python / Spark / TensorFlow",
    whatItDoes:"Powers Netflix's recommendation algorithm — responsible for 80% of content watched. Uses collaborative filtering, content-based signals, and contextual bandits for the homepage rows.",
    responsibilities:["Collaborative filtering (user-user, item-item)","Content-based feature extraction","Homepage row generation and ordering","Real-time contextual adaptation (time of day, device)","Offline model training on Spark"],
    apiRoutes:[{method:"GET",path:"/recommendations/{userId}?context={ctx}",desc:"Personalized homepage rows"},{method:"POST",path:"/recommendations/feedback",desc:"Implicit feedback event"},{method:"GET",path:"/recommendations/similar/{titleId}",desc:"Similar titles"}],
    codeBlock:`class RecommendationService {
  async getHomepageRows(userId: string, context: Context): Promise<Row[]> {
    const [collaborative, contentBased, trending] = await Promise.all([
      this.cfModel.predict(userId, context),
      this.cbModel.predict(userId, context),
      this.trendingService.getRegional(context.region)
    ]);
    const merged = this.ensemble.merge([collaborative, contentBased, trending]);
    return this.ranker.rank(this.rowGenerator.generate(merged, context.device), userId);
  }
}`,
    dbTables:["user_embeddings (user_id, vector FLOAT[512], updated_at)","title_embeddings (title_id, vector FLOAT[512], genre_tags)","recommendation_cache (user_id, context_key, rows_json, expires_at)"],
    insight:"Netflix's recommendation model accounts for 'sit-down context': the same user gets different recommendations at 7pm on a phone (short content) vs 9pm on a TV (movies/dramas)."
  },
  {
    id:"notification", name:"Notification Service", color:"#ff5722", tech:"Java / SNS / FCM / SES",
    whatItDoes:"Fan-out notification system handling push (FCM/APNS), email (SES), and in-app notifications. Processes 10M+ notifications daily with deduplication and preference-aware routing.",
    responsibilities:["Multi-channel dispatch (push/email/in-app)","User notification preference enforcement","Deduplication to prevent duplicate sends","Delivery status tracking and retry","A/B testing notification copy and timing"],
    apiRoutes:[{method:"POST",path:"/notifications/send",desc:"Send notification (internal)"},{method:"GET",path:"/notifications/{userId}/inbox",desc:"In-app notification inbox"},{method:"PUT",path:"/notifications/{userId}/preferences",desc:"Update preferences"}],
    codeBlock:`class NotificationDispatcher {
  async dispatch(event: NotificationEvent): Promise<void> {
    const prefs = await prefsCache.get(event.userId);
    if (!prefs.allows(event.type)) return;
    const dedupeKey = \`notif:\${event.userId}:\${event.type}:\${event.contentId}\`;
    if (await redis.exists(dedupeKey)) return;
    await redis.setex(dedupeKey, 86400, "1");
    await Promise.allSettled(prefs.getChannels(event.type).map(c => this.send(c, event)));
  }
}`,
    dbTables:["notification_prefs (user_id, type, push_enabled, email_enabled)","notification_log (notif_id, user_id, type, channel, status, sent_at)","notification_templates (type, locale, subject, body)"],
    insight:"Netflix batches notification sends using SQS FIFO queues. Each notification type has its own queue, preventing a push notification storm from delaying billing emails."
  },
  {
    id:"abtest", name:"A/B Test Platform", color:"#00acc1", tech:"Java / Druid",
    whatItDoes:"Netflix runs 1,000+ A/B tests simultaneously. The platform handles experiment assignment, exposure logging, metric computation, and statistical significance testing.",
    responsibilities:["Deterministic user-to-variant assignment","Experiment exposure event logging","Real-time metric computation (Druid)","Statistical significance calculation","Experiment lifecycle management"],
    apiRoutes:[{method:"GET",path:"/abtest/assignment/{userId}/{experimentId}",desc:"Get variant assignment"},{method:"POST",path:"/abtest/exposure",desc:"Log experiment exposure"},{method:"GET",path:"/abtest/experiments/{id}/results",desc:"Experiment results"}],
    codeBlock:`class ExperimentAssigner {
  assign(userId: string, experimentId: string): Variant {
    const hash = murmurhash3(\`\${userId}:\${experimentId}\`);
    const bucket = hash % 100;
    const experiment = this.experimentRegistry.get(experimentId);
    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.trafficPercent;
      if (bucket < cumulative) return variant;
    }
    return experiment.controlVariant;
  }
}`,
    dbTables:["experiments (exp_id, name, status, start_date, end_date, owner)","variant_assignments (user_id, exp_id, variant_id, assigned_at)","exposure_events (exp_id, variant_id, user_id, metric, value, ts)"],
    insight:"Netflix uses murmurhash for deterministic assignment — the same user always gets the same variant for the experiment's duration, ensuring consistent UX and valid statistical analysis."
  },
  {
    id:"concurrency", name:"Concurrency Limiter", color:"#8bc34a", tech:"Redis / Lua",
    whatItDoes:"Enforces Netflix's concurrent stream limits per subscription tier (Standard: 2, Premium: 4). Uses Redis atomic Lua scripts to prevent race conditions.",
    responsibilities:["Atomic stream count increment/decrement","Per-subscription tier limit enforcement","Stream session TTL management","Reporting to DRM Service","Abuse detection (>100 streams/account)"],
    apiRoutes:[{method:"POST",path:"/concurrency/acquire",desc:"Acquire a stream slot"},{method:"POST",path:"/concurrency/release",desc:"Release a stream slot"},{method:"GET",path:"/concurrency/{userId}/count",desc:"Current stream count"}],
    codeBlock:`-- Redis Lua: atomic stream slot acquisition
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local sessionId = ARGV[2]
local ttl = tonumber(ARGV[3])
local current = redis.call('SCARD', key)
if current >= limit then
  return {0, current}
end
redis.call('SADD', key, sessionId)
redis.call('EXPIRE', key, ttl)
return {1, current + 1}`,
    dbTables:["active_streams (user_id, session_id, device_id, started_at) — Redis SET","concurrency_config (plan_type, max_streams, max_downloads)"],
    insight:"Using Redis Lua scripts ensures the 'check count → add session' operation is atomic. Without this, two simultaneous stream starts could both succeed on a 2-stream plan."
  },
  {
    id:"download", name:"Download Service", color:"#ff9800", tech:"Java / DRM / SQLite",
    whatItDoes:"Manages offline downloads — the feature allowing subscribers to save titles on mobile. Handles download scheduling, DRM key management for offline playback, and expiry enforcement.",
    responsibilities:["Download job queue management","DRM key issuance for offline playback","Download expiry enforcement (48h–30 days)","Bandwidth-aware download scheduling","Download count limits per subscription tier"],
    apiRoutes:[{method:"POST",path:"/downloads/start",desc:"Queue a download"},{method:"GET",path:"/downloads/{userId}",desc:"List active downloads"},{method:"DELETE",path:"/downloads/{id}",desc:"Delete a download"},{method:"POST",path:"/downloads/{id}/renew",desc:"Renew download DRM key"}],
    codeBlock:`class DownloadScheduler {
  async scheduleDownload(userId: string, titleId: string, quality: Quality) {
    const [entitlement, downloadCount] = await Promise.all([
      billingService.getDownloadLimit(userId),
      this.getActiveDownloadCount(userId)
    ]);
    if (downloadCount >= entitlement.maxDownloads) throw new LimitReachedError();
    const drmKey = await drmService.issueOfflineKey(userId, titleId, { expiry: "30d" });
    const download = await db.create({ userId, titleId, quality, drmKey, expiresAt: addDays(30) });
    await queue.push({ downloadId: download.id, assetUrl: await catalogService.getAsset(titleId, quality) });
    return download;
  }
}`,
    dbTables:["downloads (download_id, user_id, title_id, quality, status, drm_key, expires_at)","download_jobs (job_id, download_id, status, progress_bytes, total_bytes)"],
    insight:"Downloaded titles expire after 48 hours from first play, or 30 days if never played. DRM keys are renewed when the device comes online, extending the window without re-downloading."
  },
  {
    id:"encoding", name:"Encoding Service", color:"#9e9e9e", tech:"AWS EMR / FFmpeg / x265",
    whatItDoes:"Encodes every Netflix title into 1,200+ variants: 20 bitrate/resolution combinations × 3 video codecs (H.264, H.265, AV1) × multiple audio tracks × multiple subtitle formats.",
    responsibilities:["Per-scene optimized encoding (shot-based)","Multi-codec output (H.264/H.265/AV1)","HDR10 and Dolby Vision processing","Audio track encoding (Atmos, stereo, 5.1)","Quality validation and VMAF scoring"],
    apiRoutes:[{method:"POST",path:"/encoding/jobs",desc:"Submit encode job"},{method:"GET",path:"/encoding/jobs/{id}",desc:"Job status and progress"},{method:"GET",path:"/encoding/jobs/{id}/manifest",desc:"Output manifest when done"}],
    codeBlock:`class PerTitleOptimizer {
  async optimize(titleId: string): Promise<EncodingLadder> {
    const shots = await this.shotDetector.detect(titleId);
    const complexities = shots.map(s => this.spatiotemporalComplexity(s));
    const ladder = STANDARD_RESOLUTIONS.map(res => ({
      resolution: res,
      bitrate: this.optimizeBitrate(res, complexities),
      codec: this.selectCodec(res, complexities)
    }));
    return { titleId, rungs: ladder, vmafTargets: { low: 93, mid: 95, high: 97 } };
  }
}`,
    dbTables:["encoding_jobs (job_id, title_id, status, input_s3_path, started_at)","encoding_outputs (output_id, job_id, resolution, bitrate, codec, s3_path, vmaf_score)","title_manifests (title_id, manifest_json, updated_at)"],
    insight:"Netflix's per-title encoding means a simple cartoon streams beautifully at 1/3 the bitrate of an action film at the same perceived quality (VMAF score)."
  },
  {
    id:"kafka", name:"Apache Kafka", color:"#231f20", tech:"Kafka / Zookeeper",
    whatItDoes:"Netflix's event streaming backbone processing ~1 trillion events/day. Used for viewership events, recommendation updates, billing events, and cross-service async communication.",
    responsibilities:["Event streaming at 15M events/sec peak","Topic-based event routing","Exactly-once delivery for billing events","Consumer group offset management","Cross-datacenter replication via MirrorMaker 2"],
    apiRoutes:[{method:"PRODUCE",path:"playback.events",desc:"Stream of all playback events"},{method:"PRODUCE",path:"billing.events",desc:"Payment and subscription events"},{method:"CONSUME",path:"recommendation.input",desc:"Events for recommendation retraining"}],
    codeBlock:`// Producer config for zero data loss
const producerConfig = {
  acks: "all",
  retries: 2147483647,
  maxInFlightRequestsPerConnection: 1,
  enableIdempotence: true,
  transactionalId: "billing-producer-1"
};
// Consumer config
const consumerConfig = {
  groupId: "recommendation-consumer-group",
  autoOffsetReset: "earliest",
  enableAutoCommit: false,
  maxPollRecords: 500
};`,
    dbTables:["kafka_topics (topic_name, partitions, replication_factor, retention_ms)","consumer_offsets (group_id, topic, partition, offset) — Kafka internal"],
    insight:"Netflix configures billing.events with acks=all + idempotent producers + transactions. This guarantees exactly-once delivery even if the producer crashes mid-send — no duplicate charges."
  },
  {
    id:"cassandra", name:"Apache Cassandra", color:"#1287a8", tech:"Cassandra 4.x",
    whatItDoes:"Netflix runs ~10,000 Cassandra nodes globally, storing watch history, user preferences, and viewing state. Chosen for linear scalability, multi-region active-active, and sub-millisecond writes.",
    responsibilities:["User watch history storage (high write throughput)","Multi-region active-active replication","Time-series viewing data","Materialized views for access patterns","TTL-based data expiration"],
    apiRoutes:[{method:"CQL",path:"INSERT INTO watch_history",desc:"Write viewing event"},{method:"CQL",path:"SELECT FROM watch_history WHERE user_id=?",desc:"Fetch user history"},{method:"CQL",path:"SELECT FROM user_preferences WHERE user_id=?",desc:"Fetch preferences"}],
    codeBlock:`CREATE TABLE watch_history (
  user_id     UUID,
  title_id    UUID,
  profile_id  UUID,
  position_ms BIGINT,
  completed   BOOLEAN,
  updated_at  TIMESTAMP,
  PRIMARY KEY ((user_id), updated_at, title_id)
) WITH CLUSTERING ORDER BY (updated_at DESC)
  AND default_time_to_live = 31536000
  AND compaction = { 'class': 'TimeWindowCompactionStrategy',
                     'compaction_window_unit': 'DAYS',
                     'compaction_window_size': 1 };`,
    dbTables:["watch_history (user_id, updated_at, title_id, position_ms, completed)","user_preferences (user_id, pref_key, pref_value, updated_at)","rating_events (user_id, title_id, rating, rated_at)"],
    insight:"Netflix partitions watch_history by user_id with updated_at as clustering key. Fetching a user's recent history is a single partition scan — no cross-node reads needed."
  },
  {
    id:"mysql", name:"MySQL / CockroachDB", color:"#4479a1", tech:"MySQL 8 / CockroachDB",
    whatItDoes:"Relational databases for transactional data: subscriptions, payments, title catalog. MySQL for regional transactional workloads, CockroachDB for global distributed ACID transactions.",
    responsibilities:["ACID transactions for billing and subscriptions","Content catalog metadata storage","Audit trail for compliance","Global distribution via CockroachDB","Read replicas for reporting queries"],
    apiRoutes:[{method:"SQL",path:"SELECT * FROM subscriptions WHERE user_id=?",desc:"Subscription lookup"},{method:"SQL",path:"INSERT INTO payments VALUES(...)",desc:"Record payment"},{method:"SQL",path:"SELECT * FROM titles WHERE region_code=?",desc:"Catalog query"}],
    codeBlock:`-- CockroachDB global subscription table
CREATE TABLE subscriptions (
  user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type      STRING NOT NULL,
  status         STRING NOT NULL,
  max_streams    INT NOT NULL DEFAULT 2,
  next_billing   TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT current_timestamp()
) LOCALITY GLOBAL;`,
    dbTables:["subscriptions (user_id, plan_type, status, max_streams, next_billing_date)","payments (payment_id, user_id, amount, currency, status, gateway_ref)","titles (title_id, name, type, synopsis, year, maturity_rating)"],
    insight:"Netflix uses CockroachDB's LOCALITY GLOBAL for subscriptions — any datacenter can serve reads with linearizable consistency, eliminating cross-region latency for subscription checks."
  },
];

// ─── Sidebar Groups ──────────────────────────────────────────
const SIDEBAR_GROUPS = [
  { label:"Client & Edge",      ids:["client","cdn","elb","zuul"] },
  { label:"Core Services",      ids:["auth","user","catalog","search","playback","steering"] },
  { label:"Platform Services",  ids:["drm","billing","recommendation","notification"] },
  { label:"Reliability",        ids:["abtest","concurrency","download"] },
  { label:"Infrastructure",     ids:["encoding","kafka","cassandra","mysql","eureka"] },
];

// ─── Q&A Data ────────────────────────────────────────────────
const QA_ARCH: QA[] = [
  { id:"a1", q:"Why does Netflix use microservices instead of a monolith, and what are the tradeoffs?", a:"Netflix migrated from a monolith to 1,000+ microservices between 2008-2016 after a 3-day outage caused by a corrupt database record. Microservices allow independent scaling (Playback Service scales to handle 60M concurrent streams without affecting Billing), independent deployment (200+ deploys/day), and independent failure isolation. The tradeoffs: distributed systems complexity (network partitions, eventual consistency), service discovery overhead (Eureka), inter-service latency (each call adds 1-5ms), and operational complexity (1,000+ services to monitor). Netflix mitigates these with Zuul (gateway), Hystrix (circuit breakers), and extensive observability tooling." },
  { id:"a2", q:"How does Netflix's CDN (Open Connect) differ from traditional CDNs like Akamai or CloudFront?", a:"Netflix's Open Connect Appliances (OCAs) are co-located inside ISP networks, not in Netflix-owned data centers. When you stream Netflix in Mumbai, the video likely comes from a server inside Jio or Airtel's network, never touching Netflix's data centers. Traditional CDNs (Akamai, CloudFront) operate their own PoPs at internet exchange points. Netflix's approach: (1) eliminates transit costs — Comcast traffic stays on Comcast's network, (2) lower latency — 1 hop vs 3-5 hops, (3) higher cache hit rates — OCAs cache 100% of catalog proactively during off-peak. Tradeoff: Netflix must maintain ISP relationships and OCA hardware globally." },
  { id:"a3", q:"How does Netflix handle the CAP theorem in its distributed databases?", a:"Netflix explicitly chooses AP (availability + partition tolerance) over consistency for most services. Cassandra (watch history, user state) uses eventual consistency — a user's watch position might be 1-2 seconds out of sync across devices, which is acceptable. EVCache also prioritizes availability. For billing and subscriptions, Netflix uses MySQL/CockroachDB with strong consistency (CP) because double-charging is unacceptable. The rule: choose consistency when the cost of incorrect data is high (money, security), choose availability when stale data is tolerable (content recommendations, viewing state)." },
  { id:"a4", q:"Explain Netflix's use of the Circuit Breaker pattern with Hystrix.", a:"Hystrix implements the Circuit Breaker pattern at Zuul and within each microservice. When a downstream service has error rate >50% in a 10-second rolling window, the circuit 'opens.' For the next 5 seconds, all calls short-circuit immediately, returning a cached or degraded fallback (e.g., pre-computed popular titles instead of personalized recommendations). After the sleep window, one 'probe' request is allowed through. If it succeeds, the circuit closes. This prevents cascading failures: if Recommendation is down, Playback still works — users see non-personalized content instead of an error page." },
  { id:"a5", q:"How does Netflix achieve zero-downtime deployments across 1,000+ microservices?", a:"Netflix uses: (1) Blue-green deployments — new version spun up in parallel, Eureka registration switched atomically; (2) Canary deployments — 1% of traffic routed to new version via A/B Test Platform, monitored for 30 minutes; (3) Rolling deployments with health checks — ECS replaces instances one at a time; (4) Feature flags — code deployed but disabled, enabled separately. The key: Eureka allows Zuul to route traffic away from unhealthy instances immediately. If a new version's error rate spikes, automated rollback triggers via the CI/CD pipeline." },
  { id:"a6", q:"How does Netflix's recommendation system generate personalized rows for 300M users?", a:"The recommendation engine uses a multi-stage pipeline: (1) Candidate generation — collaborative filtering and content-based models generate ~500 candidate titles per user offline on Spark (runs nightly); (2) Ranking — a neural network ranks candidates in real-time using contextual signals (device type, time of day, recent watch history); (3) Row assembly — ranked titles are arranged into thematic rows with ML-optimized row ordering. The final result is cached in EVCache per user per context. The system accounts for 80% of content watched on Netflix." },
  { id:"a7", q:"What is Netflix's strategy for handling the 'thundering herd' problem during peak hours?", a:"Netflix combats thundering herd with: (1) EVCache pre-warming — popular content metadata and recommendations pre-populated before peak (Sundays 8-10pm ET); (2) Staggered cache expiration — TTLs randomized ±10% to avoid synchronized expiry; (3) Request coalescing in EVCache — duplicate in-flight requests merged into one upstream call; (4) Circuit breakers at Zuul — prevent a single slow service from blocking all threads; (5) Predictive scaling — based on historical viewing patterns, ECS auto-scaling pre-scales 30 minutes before anticipated peaks." },
  { id:"a8", q:"How does Netflix implement data consistency across its microservices without distributed transactions?", a:"Netflix uses the Saga pattern for multi-service operations. Example: user upgrades subscription. Step 1: Billing Service charges card and emits billing.subscription.upgraded event to Kafka. Step 2: User Service consumes event and updates user record. Step 3: DRM Service consumes event and updates stream limit. If any step fails, a compensating transaction re-queues the event with retry logic. For read consistency, Netflix uses event sourcing — the Kafka event log is the source of truth, and each service rebuilds its own state from events. This avoids distributed locks while tolerating temporary inconsistency." },
  { id:"a9", q:"Explain Netflix's approach to database sharding for Cassandra at 10,000+ nodes.", a:"Cassandra's consistent hashing ring partitions data automatically. Netflix configures Cassandra with virtual nodes (vnodes) — each physical node owns 256 virtual tokens on the hash ring, distributing data evenly. Partition keys are designed for even distribution: user_id (UUID) as partition key for watch_history ensures data spreads across all nodes. Cassandra's multi-datacenter replication uses NetworkTopologyStrategy with RF=3 per datacenter. Writes go to all replicas concurrently (quorum write: 2 of 3 must acknowledge). Netflix never runs cross-partition queries — all queries include the partition key." },
  { id:"a10", q:"How does Netflix handle video encoding for different devices and network conditions?", a:"Netflix uses per-title optimized encoding rather than fixed bitrate ladders. Each title is analyzed shot-by-shot for spatiotemporal complexity, then an optimal bitrate per resolution is calculated to achieve target VMAF quality scores (93–97). Outputs: 20+ rungs per codec (H.264, H.265, AV1) × HDR10/SDR/Dolby Vision × audio variants = 1,200+ files per title. The DASH manifest tells the client which URL to fetch for each quality level. The client's Adaptive Bitrate Controller switches quality every 2 seconds based on measured bandwidth and buffer level, never pausing playback." },
  { id:"a11", q:"What is Netflix's EVCache and how is it different from a standard Redis cluster?", a:"EVCache is Netflix's Memcached-based distributed cache built on top of AWS ElastiCache. Differences from Redis: (1) Multi-region replication — writes replicate across all AWS regions asynchronously; (2) Bulk API — fetches 100s of keys in one network round-trip for homepage rendering; (3) Zonal isolation — cache clusters per AZ prevent a single AZ failure from causing a cache stampede; (4) Fallback to source — EVCache automatically falls through to the database on miss. Netflix stores 4TB+ in EVCache across regions for sub-millisecond read latency at 1M+ operations/second." },
  { id:"a12", q:"How does Netflix's API Gateway (Zuul) handle 1 million requests per second?", a:"Zuul 2 uses Netty's non-blocking I/O event loop instead of the one-thread-per-request model of Zuul 1. A single Zuul node handles 50,000+ concurrent connections with ~20 threads. At 1M req/s across Netflix's Zuul fleet (~20 nodes), each handles ~50,000 req/s. Request processing: (1) Pre-filters run in microseconds (auth token validation via EVCache hit, rate limit check via Redis); (2) Route filter selects downstream service via Eureka; (3) Response filters add headers and log metrics. Hystrix protects each downstream service route. Average added latency: <2ms at p99." },
  { id:"a13", q:"Why did Netflix choose Cassandra over DynamoDB for watch history?", a:"Netflix needed multi-region active-active writes (a user in Tokyo shouldn't wait for a US write to complete), predictable sub-millisecond latency at high throughput, and the ability to run in their own co-located data centers (before full AWS migration). Cassandra's tunable consistency lets Netflix choose per-operation: LOCAL_QUORUM for consistency-sensitive reads, ONE for high-throughput writes. DynamoDB's regional model means cross-region writes require DynamoDB Global Tables which adds replication lag. Cassandra's data model (flexible schema, wide rows, TTLs) fits Netflix's access patterns better." },
  { id:"a14", q:"How does Netflix implement service discovery in a dynamic microservices environment?", a:"Netflix built Eureka — a REST-based service registry. Each microservice instance registers on startup with its IP, port, and health check URL. It sends heartbeats every 30 seconds. Clients (Ribbon load balancer) fetch the full registry on startup, then poll for deltas every 30 seconds, maintaining a local cache. Zuul uses this registry for routing decisions. Eureka's self-preservation mode: if Eureka stops receiving 85%+ of expected heartbeats, it assumes a network issue rather than mass failure, and stops expiring instances — preventing a mass deregistration cascade during a network partition." },
  { id:"a15", q:"How does Netflix test resilience? Explain Chaos Engineering.", a:"Netflix's Chaos Monkey (and the broader Simian Army) randomly terminates EC2 instances in production during business hours. The assumption: if your system can survive random instance termination on a Tuesday afternoon, it'll handle real failures at 2am. Expanded tools: Chaos Gorilla (terminates entire AZs), Chaos Kong (terminates entire AWS regions), Latency Monkey (injects network latency). Engineers must design services to be stateless (state in Cassandra/EVCache, not memory), use circuit breakers (Hystrix), and handle retries gracefully. Success is measured by MTTR and the SLO breach rate, not by failure rate." },
  { id:"a16", q:"How does Netflix's DRM system prevent unauthorized copying while supporting 2,000+ device types?", a:"Netflix implements a multi-DRM strategy: Widevine (Android, Chrome), PlayReady (Windows, Xbox), FairPlay (Apple). Each device has a certified DRM module handling decryption in hardware TEE or software. License flow: (1) Client sends license challenge to DRM Service; (2) DRM Service validates entitlement, checks concurrency limits, issues time-limited license (8 hours, soft-renewed every 4 hours); (3) Netflix also uses forensic watermarking — imperceptible per-stream watermarks to trace leaked content back to the specific subscriber and device." },
  { id:"a17", q:"Explain the role of Apache Kafka in Netflix's architecture.", a:"Kafka is Netflix's central nervous system — the event bus connecting all 1,000+ microservices. At 1 trillion events/day (15M/sec peak), Kafka enables: (1) Async service decoupling — Playback Service publishes events without knowing about Analytics, Recommendations, and Billing consumers; (2) Event sourcing — the Kafka log is the system of record for all events, enabling replay and recovery; (3) Exactly-once billing — Kafka transactions prevent duplicate payment processing; (4) Cross-datacenter replication — MirrorMaker 2 replicates topics across regions for DR. Key topics: playback.events (3,000 partitions), billing.events (500 partitions, 30-day retention)." },
  { id:"a18", q:"How does Netflix handle the 'noisy neighbor' problem across microservices?", a:"Netflix uses several isolation strategies: (1) Bulkhead pattern via Hystrix — each downstream dependency gets its own thread pool (e.g., 10 threads for Recommendation calls, 20 for Catalog calls). If Recommendation blocks all 10 threads, other services aren't affected; (2) Rate limiting at Zuul — per-client-tier limits prevent a single bad actor from overwhelming shared services; (3) Priority queues in Kafka — P0 (DRM failures) in separate topics with dedicated consumer groups; (4) Resource quotas — Kubernetes enforces CPU/memory limits. The philosophy: assume your downstream will fail, design for graceful degradation." },
  { id:"a19", q:"What consistency model does Netflix use for its billing system, and why?", a:"Netflix billing requires strong consistency (the C in CAP) because the cost of being wrong is a double charge or missed charge. Netflix uses MySQL/CockroachDB with synchronous replication (SYNC mode) within a region. Payment operations use ACID transactions: BEGIN; check subscription; process payment; update subscription; COMMIT. If any step fails, the transaction rolls back. Kafka's exactly-once semantics prevent duplicate billing events from being consumed twice. For global billing, CockroachDB's distributed ACID transactions allow a payment processed in Singapore to immediately reflect in Tokyo, with serializable isolation guarantees." },
  { id:"a20", q:"How would you design Netflix's video upload and encoding pipeline from scratch?", a:"Step 1: Receive raw video (up to 100GB) via multipart S3 upload. Step 2: Validate (codec, duration, metadata) and store in S3 raw bucket. Step 3: Publish encoding.job.created to Kafka. Step 4: Encoding Worker Pool (AWS EMR Spark clusters, 10,000+ vCPUs) consumes jobs, runs shot detection, then per-title optimization to determine optimal bitrate per resolution. Step 5: Parallel encoding — each resolution/codec variant encoded independently on different EMR nodes. Step 6: Quality validation (VMAF score must meet threshold). Step 7: Package (DASH/HLS manifests generated). Step 8: Push to S3 encoded bucket, publish encoding.job.completed, OCAs pull new content during next proactive fill cycle." },
  { id:"a21", q:"Explain how Netflix handles partial failures in the recommendation system.", a:"Netflix uses the fallback pattern with 3 degradation tiers: (1) Full personalization — real-time model inference from Feast Feature Store + recent history (normal operation); (2) Pre-computed fallback — nightly-computed top-50 recommendations per user, cached in EVCache for 24h (used if real-time model is slow); (3) Editorial fallback — top 50 globally trending titles for the user's region (used if EVCache is unavailable). Zuul's Hystrix detects when Recommendation Service exceeds 200ms response time and falls back to tier 2. Recommendation is never a hard dependency — users always see content, just less personalized." },
  { id:"a22", q:"How does Netflix implement geo-routing and latency-based routing?", a:"Netflix uses Route 53 latency-based routing for DNS to direct users to the closest AWS region. Within a region, ELB routes to the nearest AZ. For video specifically, the Steering Service uses: (1) IP geolocation to identify the user's ISP and geography; (2) Real-time OCA health metrics; (3) BGP routing table analysis to find the OCA with fewest network hops. Netflix also runs speed tests from the client to candidate OCAs on first app launch and periodically, storing results to improve future OCA selection. The result: >95% of streaming sessions use an OCA within the user's own ISP network." },
  { id:"a23", q:"How does Netflix handle data privacy and GDPR compliance at scale?", a:"Netflix's GDPR implementation: (1) Data inventory — every piece of personal data tagged with its location (Cassandra, MySQL, S3, Kafka topics); (2) Right to deletion — User Service's DELETE /users/{id} triggers a distributed deletion saga: publishes user.deleted to Kafka, all services subscribe and purge their stores within 30 days; (3) Data minimization — watch history auto-expires in Cassandra after 1 year via TTL; (4) Pseudonymization — analytics events replace userId with a rotating pseudonym; (5) Data portability — Netflix provides GDPR export within 30 days. Kafka's 7-day retention means viewing events auto-purge from the stream." },
  { id:"a24", q:"Why does Netflix need both Apache Pinot and Redshift? When does it use each?", a:"Pinot and Redshift serve different query patterns. Apache Pinot is optimized for sub-second aggregations on the latest data — real-time dashboards showing 'current concurrent streams per region' or 'errors in the last 60 seconds.' It ingests directly from Kafka with <1 minute latency. Queries are limited to pre-defined aggregations on indexed dimensions. Redshift is optimized for complex analytical queries on historical data — 30-day retention curves, cohort analysis. These queries can run for minutes and need join capabilities across multiple tables. The choice: use Pinot for operational dashboards and alerting, Redshift for business analytics and data science." },
  { id:"a25", q:"How does Netflix's Chaos Engineering differ from traditional load/stress testing?", a:"Traditional load testing simulates expected traffic in a staging environment. Chaos Engineering introduces failure conditions in production to discover unknown weaknesses. Netflix's principles: (1) Define a steady state (normal: 60M streams/min, error rate <0.1%); (2) Hypothesize that chaos will not change steady state; (3) Introduce real-world events — random instance termination, network latency injection, dependency blackholing; (4) Look for difference between control and experimental groups; (5) Fix the gap if steady state is disrupted. Key insight: Netflix runs chaos during business hours, not at 2am. If the system can't survive a terminated instance at 2pm Tuesday, it definitely can't survive a real failure at 2am Friday." },
];

const QA_PIPELINE: QA[] = [
  { id:"p1", q:"Why does Netflix use Apache Kafka instead of a traditional message queue like RabbitMQ or SQS?", a:"Kafka's key advantages for Netflix's scale: (1) Retention — Kafka stores messages on disk for 7 days, allowing consumers to replay events (essential for re-processing after a Flink bug); (2) Partitioning — 3,000 partitions on playback.events allows 3,000 parallel consumer threads; (3) Consumer groups — multiple independent services (Recommendations, Analytics, Billing) each maintain their own offset, consuming the same stream without coordination; (4) Log compaction for change data; (5) Throughput — Kafka handles 1M+ messages/sec on commodity hardware. SQS has lower throughput, no replay, and at-most-once semantics. RabbitMQ doesn't scale to 15M events/sec natively." },
  { id:"p2", q:"Explain Apache Flink's role in Netflix's data pipeline. Why Flink over Spark Streaming?", a:"Netflix uses Flink for sub-second stream processing of playback events. Flink's advantages over Spark Streaming: (1) True event-time processing — Flink's watermark mechanism handles out-of-order events correctly; (2) Sub-second latency — Flink processes events continuously; Spark Streaming in micro-batch mode has minimum 500ms latency; (3) Stateful exactly-once — Flink's checkpointing with RocksDB state backend enables stateful operations (sessionization, windowed aggregations) with exactly-once semantics; (4) Backpressure handling — Flink propagates backpressure through the pipeline, slowing ingestion before dropping data. Netflix uses Flink for real-time error detection, quality metric aggregation, and sessionization." },
  { id:"p3", q:"What is Apache Iceberg and why does Netflix use it instead of a plain S3 data lake?", a:"Apache Iceberg (originated at Netflix) is an open table format that adds ACID transactions, schema evolution, and time travel to files stored in S3. Problems with plain S3: (1) No atomic multi-file updates — if a Spark job writes 100 files and fails halfway, you get corrupted partial results; (2) No schema evolution — adding a column requires rewriting the entire dataset; (3) No time travel — can't query yesterday's version of data. Iceberg solves all three: atomic commits, schema evolution (add/rename/drop columns without rewriting), time travel (AS OF TIMESTAMP). Netflix stores the entire Bronze/Silver/Gold lakehouse on Iceberg over S3." },
  { id:"p4", q:"How does Netflix implement exactly-once processing in its Kafka-to-Flink pipeline for billing events?", a:"Exactly-once requires coordination at three layers: (1) Kafka Producer: transactional producer with idempotence enabled, acks=all — guarantees exactly-once produce; (2) Flink consumer: uses Kafka source connector with checkpointing enabled. Flink commits Kafka offsets as part of its checkpoint, not in Kafka's consumer group offset — offset commit is atomic with Flink state checkpoint; (3) Flink-to-Cassandra sink: Flink's two-phase commit sink — first writes to staging table (pre-commit), then on checkpoint completion, atomically moves to final table. If Flink crashes mid-processing, it restores from the last checkpoint and replays Kafka messages from the checkpointed offset." },
  { id:"p5", q:"What is the Bronze/Silver/Gold lakehouse pattern Netflix uses?", a:"The medallion architecture organizes data by quality: Bronze (raw) — events land from Kafka exactly as received, no transformation, no schema enforcement. JSON, partitioned by date+hour. Retention: 90 days. Purpose: audit trail, recovery. Silver (validated) — Spark jobs clean Bronze: deduplication, type casting, null checks, enrichment (join with title metadata, user tier). Parquet, Snappy-compressed, partitioned by date. Retention: 1 year. Gold (aggregated) — pre-computed aggregates for ML features and BI: daily viewing minutes per user, title retention curves, regional trending. Parquet, partitioned by date. Retention: 3 years. ML training reads from Gold, ad-hoc analysis reads from Silver, raw debugging reads from Bronze." },
  { id:"p6", q:"How does Netflix partition its Kafka topics for optimal throughput and parallelism?", a:"Partition count determines maximum consumer parallelism. Netflix's strategy: playback.events has 3,000 partitions (allows 3,000 parallel Flink tasks), billing.events has 500 (fewer consumers needed), analytics.raw has 5,000 (highest volume). Partition keys: playback events keyed by sessionId (ensures all events for one session land in the same partition, enabling stateful sessionization without distributed joins), billing events keyed by userId (ensures ordering). Each partition is replicated to 3 brokers (RF=3) across different AZs. Netflix targets ~1 MB/s throughput per partition to avoid hot spots." },
  { id:"p7", q:"Explain how Flink handles late-arriving events and watermarks in Netflix's pipeline.", a:"Flink's event-time processing handles the reality that events arrive out of order. A buffering event at timestamp 10:00:01 might arrive at the Flink operator at 10:00:07 due to network delays. Flink's watermark: a marker in the stream saying 'all events with timestamp < watermark are now complete.' Netflix configures watermarks with a 5-second allowed lateness — events arriving up to 5 seconds late are processed correctly. Events arriving after 5 seconds go to a side output (dead letter queue) for separate analysis. For P0 events (DRM failures), watermark is set to 0 (no lateness tolerance) to ensure sub-100ms alerting." },
  { id:"p8", q:"How does Apache Pinot enable sub-second analytics at Netflix's scale?", a:"Pinot is a real-time OLAP datastore purpose-built for sub-second aggregations. Architecture: (1) Ingestion — Kafka topic is ingested via Pinot's Kafka consumer, writing to mutable 'real-time segments' in-memory; (2) Indexing — every column is indexed by default: inverted indexes for low-cardinality dimensions (deviceType, regionCode), range indexes for metrics (bufferRatio, bitrateKbps); (3) Query routing — Pinot's broker shards queries across all servers holding relevant segments; (4) Columnar storage — only the queried columns are read from disk. Netflix query example: SELECT regionCode, COUNT(*), AVG(bitrateKbps) FROM playback_events WHERE ts > NOW() - 300 AND errorCode IS NOT NULL GROUP BY regionCode — executes in <100ms." },
  { id:"p9", q:"How does Netflix use Apache Spark for batch processing in its data pipeline?", a:"Spark EMR clusters process the Silver → Gold transformations nightly (3-6 AM PST when compute is cheapest). Key jobs: (1) Feature engineering — compute user-level features (viewing frequency, genre affinity, completion rate) from Silver Iceberg tables, write to Gold; (2) Model training — train collaborative filtering and content-based models on 30-day viewing history (100TB+); (3) Backfill — reprocess historical Bronze data when schema changes; (4) Metric computation — retention curves, cohort analysis, A/B test results. Spark reads from S3 Iceberg using the Iceberg Spark catalog, enabling partition pruning. Jobs use dynamic resource allocation — auto-scales from 50 to 5,000 executors based on data size." },
  { id:"p10", q:"How does Netflix ensure data quality in its data pipeline?", a:"Multi-layer data quality: (1) Schema validation — Confluent Schema Registry enforces Avro schemas on Kafka producer side; a producer with wrong schema is rejected before writing; (2) Bronze → Silver: Spark jobs run data quality checks (null rates, cardinality checks, value range checks) and fail loudly if quality drops >5% from baseline; (3) Great Expectations — open-source data validation framework runs automated tests on Silver datasets; (4) Data lineage — Apache Atlas tracks data from Kafka source through to Gold tables, enabling root-cause analysis; (5) Monitors — Druid-based dashboards alert on-call if pipeline lag exceeds thresholds or data volume anomalies are detected." },
  { id:"p11", q:"What is the event envelope Netflix uses for its streaming events?", a:"Netflix's event envelope contains: required fields (eventType [string], sessionId [UUID], userId [UUID], titleId [UUID], timestamp [ISO-8601 milliseconds], schemaVersion [int]) and contextual fields (position_ms [long], bitrateKbps [int], bufferRatio [float 0-1], rebufferCount [int], errorCode [string nullable], deviceType [enum], osVersion [string], appVersion [string], networkType [enum: wifi/cellular/ethernet], regionCode [ISO 3166-2]). Priority is encoded in the topic routing: P0 (errorCode not null) → playback.errors, P1 (quality events) → playback.quality, P2 (UI clicks) → playback.ui, P3 (metadata) → playback.meta." },
  { id:"p12", q:"How does Netflix handle backpressure in its Kafka-to-Flink pipeline?", a:"Backpressure occurs when Flink processes slower than Kafka produces. Netflix's handling: (1) Flink propagates backpressure upstream — if the Kafka sink is slow, the Flink operators slow down, which slows the Kafka source consumer. This prevents OOM errors but may cause Kafka consumer lag to grow; (2) Consumer lag monitoring — Prometheus tracks lag per partition per consumer group; if lag > 10 minutes of data, PagerDuty alerts on-call; (3) Horizontal scaling — Flink's reactive mode auto-scales TaskManagers based on Kafka consumer lag; (4) Priority topic separation — P0 error events are in separate topics consumed by a dedicated low-latency Flink job, never competing for resources with high-volume P3 analytics events." },
  { id:"p13", q:"How does the Feast Feature Store work in Netflix's ML pipeline?", a:"Feast (open-source, Netflix is a contributor) serves as a bridge between offline ML training and online ML inference. Offline: Spark writes feature tables to S3 (Gold layer) — e.g., user viewing features (genre_affinity_action: 0.82, avg_session_duration_mins: 47.3). Feast registers these as feature definitions. Training reads from Feast's offline store (S3 Iceberg) with point-in-time correct joins — ensuring no data leakage. Online: Feast materializes recent features (last 30 days) to Redis/DynamoDB for sub-2ms latency. During real-time recommendation serving, TorchServe calls Feast online store for a user's features, then runs the model. Feature freshness: Flink continuously updates Feast's online store for critical features." },
  { id:"p14", q:"How does Netflix prevent duplicate event processing in its analytics pipeline?", a:"Deduplication at multiple layers: (1) Client-side: each event has a clientGeneratedId (UUID) and retries include the same UUID; (2) Kafka producer idempotence: Kafka broker deduplicates identical produces within a session (PID + sequence number); (3) Flink state: Flink maintains a bloom filter of seen clientGeneratedIds with 1-hour TTL in RocksDB state — fast probabilistic duplicate check; (4) Silver layer: Spark Silver transformation does a GROUP BY (sessionId, eventType, timestamp) HAVING COUNT(*) > 1 to find exact duplicates and deduplicates deterministically; (5) Gold aggregations: COUNT(DISTINCT sessionId) rather than COUNT(*) for session-level metrics, absorbing any upstream duplicates." },
  { id:"p15", q:"How does Netflix handle schema evolution in its event pipeline?", a:"Schema evolution with Confluent Schema Registry and Avro: (1) Backward compatibility: new schema must be able to read old records (add optional fields with defaults, never remove required fields); (2) Forward compatibility: old consumers can read new records (new fields are ignored); (3) Full compatibility (default): both backward and forward; (4) Schema registry enforcement: producers cannot publish with a schema incompatible with the registered version. Deployment sequence: (1) Register new schema version; (2) Deploy consumers (they now understand both old and new schema); (3) Deploy producers with new schema. The rollback path: if new schema causes issues, revert to previous schema version — registry maintains full version history." },
  { id:"p16", q:"How does Netflix implement a Lambda Architecture vs Kappa Architecture?", a:"Netflix has evolved toward Kappa Architecture (streaming-first) but still uses Lambda for specific use cases. Lambda (batch + stream): batch layer on Spark recalculates complete accuracy nightly; speed layer (Flink) gives approximate near-real-time results; serving layer merges both. Problems: two codebases implementing the same logic, eventual consistency between layers. Kappa (stream only): Kafka is the system of record; Flink is the only processing layer; historical reprocessing done by replaying Kafka (extended retention 30 days for reprocessing). Netflix moved toward Kappa for viewership analytics — Flink handles both real-time alerts and long-term aggregations using the same Flink DAG. Lambda is kept only where historical accuracy justifies the operational overhead (ML training data)." },
  { id:"p17", q:"How does Netflix's data pipeline handle failures and guarantee data durability?", a:"Durability guarantees at each layer: (1) Kafka: RF=3 (3 copies across 3 AZs), acks=all (write acknowledged only when all ISR replicas confirm), min.insync.replicas=2; (2) Flink checkpoints: every 30 seconds to S3 — if Flink crashes, it restores from checkpoint and replays Kafka from the checkpointed offset; (3) S3: 11 nines durability, lifecycle rules move cold Bronze data to Glacier after 90 days; (4) Iceberg: ACID commit protocol ensures partial writes are never visible; failed Spark jobs leave the previous snapshot intact; (5) Replication: Bronze data replicated to EU-West-1 via S3 replication for DR. Recovery SLA: Flink jobs restart within 5 minutes; max data loss = 30 seconds of events." },
  { id:"p18", q:"How does Netflix use Trino (formerly PrestoSQL) for ad-hoc analytics?", a:"Trino is Netflix's SQL query engine for data scientists doing exploratory analysis on the Iceberg lakehouse. Key capabilities: (1) Federation — Trino queries across Iceberg (S3), Kafka (live stream), Pinot, and MySQL in a single SQL query using cross-catalog joins; (2) Iceberg integration — Trino uses Iceberg's snapshot-based reads for consistent queries; (3) Time travel — SELECT * FROM gold.viewing_summary FOR TIMESTAMP AS OF '2024-06-01 00:00:00'; (4) Cost-based optimizer — statistics from Iceberg metadata enable efficient query planning; (5) Spill to disk — large aggregations spill temporary data to local SSD before S3. Netflix data scientists write Trino SQL via Jupyter notebooks against 100TB+ Iceberg tables. Average query latency: 3-30 seconds for complex analytical queries." },
  { id:"p19", q:"What are the key differences between Apache Pinot and Apache Druid for real-time analytics?", a:"Both are OLAP stores ingesting from Kafka, but with different strengths. Pinot: better at sub-second queries with many dimensions, optimized for star-schema queries, strong Kafka integration, less mature upsert support. Druid: strong upsert/mutable data support (good for sessionization), better for roll-up aggregations at ingestion time (pre-aggregate on ingest to reduce storage), more mature for time-series dashboards. Netflix uses Pinot for playback quality dashboards (high dimensionality, sub-second SLA) and Druid for A/B test metric dashboards (pre-aggregated metrics, mutable as experiments update). Key decision: if you need to update/overwrite records frequently (Druid) vs append-only high-throughput queries (Pinot)." },
  { id:"p20", q:"How does Netflix optimize Spark job performance for its data pipeline?", a:"Key Spark optimizations at Netflix: (1) Partition optimization — target 128-256MB per partition; repartition large Iceberg reads by date to align with physical layout; (2) Predicate pushdown — Iceberg metadata contains partition statistics, Spark reads only relevant files (a query for 2024-01-01 reads <1% of total data); (3) Broadcast joins — title metadata table (~50MB) broadcast to all executors, avoiding shuffle for enrichment joins; (4) Dynamic partition pruning — runtime filter from dimension tables pruned at the partition level; (5) Adaptive Query Execution — Spark 3.x auto-coalesces small partitions after shuffle; (6) Columnar storage — Parquet + Snappy compression reduces I/O by 10-30×; (7) Kryo serialization — 10× faster than Java default for Spark RDD operations." },
  { id:"p21", q:"How does Netflix handle time zones and clock skew in its event pipeline?", a:"Time zone strategy: all events are stored in UTC. Clients include a clientTimestamp (device local time in UTC) and the API Gateway adds a serverTimestamp (server wall clock). Netflix uses serverTimestamp as the authoritative time for bucketing (prevents clock skew on client devices affecting windowed aggregations). Client clocks can be off by hours (users manually set wrong time, or DST transitions). Netflix's rule: if |serverTimestamp - clientTimestamp| > 5 minutes, flag the event for anomaly analysis. Flink watermarks are based on serverTimestamp, not clientTimestamp. For timezone-aware reports, Spark applies timezone conversion from UTC to local time in the Gold transformation." },
  { id:"p22", q:"How does Netflix implement streaming joins in Flink?", a:"Flink interval joins and temporal joins for enrichment: (1) Enriching playback events with title metadata: Flink's broadcast state — title metadata (17K titles) is broadcast to all Flink TaskManagers as a read-only HashMap. Playback events join against this in-memory map without network shuffles. (2) Sessionization join: playback.start and playback.end events join via Flink's interval join (events within 4-hour window matched by sessionId). (3) User attribute join: user preferences needed for every event — Flink async I/O calls EVCache for user data; if not in cache, falls back to User Service. Async I/O prevents blocking on lookup latency. (4) Windowed join: joining clickstream with view events using 30-minute window join for attribution analysis." },
  { id:"p23", q:"What is Netflix's approach to data governance and data catalog?", a:"Netflix uses Apache Atlas (extended internally) as the central data catalog and governance platform: (1) Automatic discovery — Atlas agents instrument Hive, Spark, and Kafka to auto-discover tables, topics, and lineage; (2) Lineage tracking — Atlas maps data flow: Kafka topic → Flink job → S3 table → Spark job → Gold table → Redshift. A compliance request to delete user data triggers a lineage walk to find all data stores holding that user's data; (3) Business glossary — business teams tag tables with domain (Content, Finance, User) and sensitivity (PII, Non-PII); (4) Access control — Apache Ranger enforces column-level security on Iceberg tables; (5) Data SLAs — Atlas monitors freshness SLAs: Gold.viewing_summary must be updated by 8 AM PST daily." },
  { id:"p24", q:"How does Netflix scale its Kafka cluster to handle 1 trillion events per day?", a:"1T events/day = ~11.5M events/sec average, 15M/sec peak. Kafka cluster sizing: assuming 500 bytes/event avg = 5.75 TB/sec throughput. With 7-day retention × 3 replicas = 157 PB of Kafka storage. Netflix Kafka architecture: 100s of broker nodes per cluster (commodity servers with 10Gbps NICs, 8TB SATA SSDs each). For 5.75 TB/sec cluster throughput: ~12,000 broker-partitions across ~100 brokers. Key configs: log.retention.bytes per partition (prevents any partition from growing beyond disk); num.io.threads=16 (parallel disk I/O); socket.send.buffer.bytes=1MB. Separate Kafka clusters by priority to prevent P3 analytics from competing with P0 billing." },
  { id:"p25", q:"How does Netflix monitor its data pipeline health?", a:"Multi-layer observability for the data pipeline: (1) Producer metrics — Kafka producer record-send-total, record-error-rate, request-latency-avg published to Prometheus via Micrometer; (2) Consumer lag — Burrow (LinkedIn) or Kafka's built-in consumer group metrics; lag > 5 min = warning, > 30 min = PagerDuty; (3) Flink metrics — Flink's metrics reporter sends checkpoint duration, backpressure ratio, and records-per-second to Grafana; (4) Data freshness SLAs — Atlas/Airflow DAG monitors: Gold.viewing_summary should complete by 8 AM PST; (5) Data quality — Great Expectations runs validation suites after each Spark job, posting pass/fail to a Slack channel; (6) End-to-end latency — trace events from Kafka produce to Pinot query availability; SLA: P0 events visible in Pinot within 60 seconds." },
];

const QA_RELIABILITY: QA[] = [
  { id:"r1", q:"Explain Netflix's four principles of resilience engineering.", a:"Netflix's resilience principles: (1) Design for failure — every service assumes its dependencies will fail. No retry-and-hope; instead, explicit fallbacks for every downstream dependency. Every Zuul route has a Hystrix fallback; every EVCache miss has a database fallback. (2) Automate recovery — MTTD must be <5 minutes (via Prometheus + PagerDuty), MTTR must be <15 minutes (automated rollback if error rate spikes). Humans aren't in the loop for routine failure recovery. (3) Test in production — Chaos Monkey runs continuously, randomly terminating instances. Gameday exercises simulate region failures. (4) Limit blast radius — circuit breakers, bulkheads, and rate limiting ensure one failing service cannot cascade into total outage. Feature flags allow instant disabling of non-critical features under load." },
  { id:"r2", q:"How does Netflix achieve 99.99% uptime (52 minutes downtime/year)?", a:"Four nines uptime requires eliminating single points of failure at every layer: (1) Multi-AZ deployment — every service deployed across 3 AZs in each AWS region; ELB distributes traffic and removes failed AZ instances; (2) Multi-region active-active — US-East-1 and US-West-2 both serve production traffic; Route 53 health checks failover DNS in <60 seconds; (3) Stateless services — all session state in EVCache/Cassandra, not service memory, so any instance can handle any request; (4) Database replication — Cassandra RF=3 per region, MySQL synchronous standby, EVCache per-AZ clusters; (5) Automated recovery — ECS replaces failed containers within 30 seconds; (6) Chaos Engineering — proactive failure injection finds weaknesses before customers experience them." },
  { id:"r3", q:"What is the Hystrix circuit breaker state machine and when does it trip?", a:"Hystrix circuit breaker has 3 states: CLOSED (normal operation — requests pass through, errors tracked in a 10-second rolling window), OPEN (circuit tripped — all requests short-circuit immediately, returning fallback. No requests reach downstream for 5-second sleep window), HALF-OPEN (probe state — after sleep window, one request is allowed through. If successful, circuit closes. If fails, circuit reopens). Trip conditions (Netflix defaults): error rate > 50% AND minimum 20 requests in the 10-second window. Trip is immediate — not gradual. Separate metrics per command key. Fallback hierarchy: (1) In-memory cache; (2) Pre-computed static result; (3) Empty/degraded response. Never return an error to the user if a reasonable fallback exists." },
  { id:"r4", q:"How does Netflix handle database failures gracefully?", a:"Database failure handling layers: (1) EVCache write-through cache — most read traffic hits EVCache, not the database. A database outage is invisible to 95%+ of read requests during the cache TTL window; (2) Read replicas — MySQL read replicas in each AZ; application switches to replica automatically if primary is unreachable; (3) Cassandra self-healing — Cassandra's gossip protocol detects node failures; hinted handoff stores writes for failed nodes locally and replays when node recovers; (4) Graceful degradation — if watch history Cassandra is down, users can still stream (Playback Service doesn't need watch history); DRM service falls back to cached entitlements for in-progress sessions; (5) Automated failover — DBA team uses Orchestrator for MySQL automatic primary failover." },
  { id:"r5", q:"What is Netflix's approach to distributed tracing and observability?", a:"Netflix's observability stack: (1) Metrics — Spectator (Netflix's Micrometer-compatible metrics library) publishes to Atlas (Netflix's time-series metrics backend, stores trillions of data points); dashboards in Grafana; (2) Distributed tracing — Zipkin (originated at Netflix) traces request flow across microservices. Each request gets a traceId, each service hop adds a span; p99 latency visible per service hop; (3) Log aggregation — ELK stack aggregates logs from all services; structured JSON logging with traceId enables correlation; (4) Error tracking — Sentry captures unhandled exceptions; (5) Real User Monitoring — client-side metrics sent as Kafka events (buffer stalls, quality switches, startup time) visualized in Pinot dashboards; (6) Alerting — Prometheus alertmanager + PagerDuty." },
  { id:"r6", q:"How does Netflix implement canary deployments and automated rollbacks?", a:"Canary deployment process: (1) New version deployed to 1% of instances via Spinnaker (Netflix's open-source CD tool); (2) Automated canary analysis (ACA) runs for 30 minutes: compares error rate, latency (p50/p99), and business metrics (stream starts, DRM failures) between canary and baseline cohorts using Mann-Whitney U statistical test; (3) If canary is statistically better or equivalent → promoted to 100%; (4) If canary is statistically worse → automated rollback triggered by Spinnaker; entire process is automated, no human needed. Automated rollback triggers: error rate increases >0.5% vs baseline, p99 latency increases >50ms, stream start success rate drops >0.1%." },
  { id:"r7", q:"How does Netflix handle memory leaks and resource exhaustion in long-running services?", a:"Memory leak prevention and detection: (1) JVM heap monitoring — JVM heap usage exported to Atlas; alert fires when old-gen heap exceeds 80% consistently; (2) Heap dump triggers — automated heap dump collection when memory exceeds threshold, uploaded to S3 for offline analysis with Eclipse MAT; (3) Off-heap memory — Cassandra uses off-heap data structures (Memtable stored off-heap) to avoid GC pressure; (4) Container memory limits — ECS tasks have hard memory limits; OOM-killed containers are replaced immediately; (5) Regular restarts — for services with known minor leaks, rolling restart scheduled weekly during low-traffic window (5 AM PST). Prevention: code review checklist includes connection pool leak detection patterns, unbounded cache checks, thread pool configuration review." },
  { id:"r8", q:"How does Netflix design for region-level failures (entire AWS region goes down)?", a:"Region failure strategy: (1) Active-active multi-region — Netflix runs US-East-1, US-West-2, and EU-West-1 as active regions simultaneously. Traffic normally split 60/20/20; (2) Route 53 health checks — if US-East-1's health check endpoint fails for 3 consecutive 30-second checks, Route 53 removes it from DNS within 90 seconds; (3) Data replication — Cassandra cross-region replication (RF=3 per region, globally); EVCache replication to secondary region; (4) Stateless application tier — application instances in US-West-2 can serve any US-East-1 user immediately; (5) Capacity reservation — US-West-2 normally runs at 40% capacity, pre-provisioned to handle 100% of US-East-1 load; (6) Recovery priority — playback for existing sessions first, new stream starts second, less critical services last." },
  { id:"r9", q:"How does Netflix use feature flags for risk mitigation during deployments?", a:"Netflix's feature flag system (built on their A/B Test Platform): (1) Dark launch — feature deployed but disabled globally; enabled only for internal employees or 1% traffic for initial validation; (2) Gradual rollout — ramp from 1% → 5% → 25% → 100% with automated metric checks at each stage; (3) Kill switch — instant disable without code deployment; all feature flags checked at request time against EVCache (sub-millisecond lookup); (4) Per-device/per-region flags — new codec (AV1) enabled for newer devices that support it; (5) Experiment-driven rollout — feature flags integrated with A/B test platform. Emergency procedure: if any P0 metric degrades, on-call engineer can flip the flag in the Netflix admin UI; EVCache propagates the change globally within 60 seconds." },
  { id:"r10", q:"What lessons from Netflix's incidents have shaped its engineering culture?", a:"Key incident-driven cultural changes: (1) The 2008 database corruption incident (3-day outage) → microservices migration. A single corrupt record brought down the entire site; microservices limit blast radius; (2) The 2012 Christmas Eve AWS outage (ELB failure in US-East-1) → active-active multi-region. Netflix was single-region; they spent Christmas bringing the site back up. Now every critical service is active in 3 regions; (3) Chaos Monkey origin — after multiple surprise instance failures, Netflix decided to proactively inject failures rather than wait for them. 'If it hurts, do it more often and automate it'; (4) Cell-based architecture — after 'global failure' incidents where a config change hit all instances simultaneously, Netflix moved to cell-based deployments (100 cells per region), so a bad deploy only hits 1/100th of users; (5) Blameless post-mortems — every incident results in a public (internal) post-mortem with systemic fixes, no individual blame." },
];

// ─── Stat Cards ──────────────────────────────────────────────
const STAT_CARDS = [
  { label:"Subscribers",          value:"300", suffix:"M",    color:"#e50914" },
  { label:"Peak Concurrent Streams", value:"60", suffix:"M", color:"#ff6b35" },
  { label:"API Requests/second",  value:"1",   suffix:"M+",  color:"#f0a500" },
  { label:"Analytics Events/day", value:"700", suffix:"B",   color:"#9c27b0" },
  { label:"Data Ingested/day",    value:"1.5", suffix:" PB", color:"#2196f3" },
  { label:"Peak Event Rate",      value:"15",  suffix:"M/s", color:"#4caf50" },
  { label:"OCA Appliances",       value:"17000",suffix:"",   color:"#ff5722" },
  { label:"Countries",            value:"190", suffix:"+",   color:"#00bcd4" },
  { label:"Microservices",        value:"1000",suffix:"+",   color:"#673ab7" },
  { label:"Cassandra Nodes",      value:"10000",suffix:"",   color:"#1287a8" },
  { label:"Kafka Events/day",     value:"1",   suffix:"T",   color:"#231f20" },
  { label:"Encoding Variants/title",value:"1200",suffix:"+", color:"#607d8b" },
];

// ─── Helpers ─────────────────────────────────────────────────
function hexToRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}
function highlight(text: string, term: string): React.ReactNode {
  if (!term.trim()) return text;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === term.toLowerCase()
      ? <mark key={i} style={{ background:"#fef08a", color:"#1a1a1a", borderRadius:"2px", padding:"0 1px" }}>{p}</mark>
      : p
  );
}

// ─── Sub-components ───────────────────────────────────────────

function StatCard({ label, value, suffix, color, index }: { label:string; value:string; suffix:string; color:string; index:number }) {
  const [displayed, setDisplayed] = useState("0");
  useEffect(() => {
    const numericVal = parseFloat(value.replace(/[^0-9.]/g, ""));
    if (isNaN(numericVal)) { setDisplayed(value); return; }
    const duration = 1500;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numericVal;
      setDisplayed(numericVal < 100 ? current.toFixed(numericVal % 1 !== 0 ? 1 : 0) : Math.round(current).toString());
      if (progress < 1) requestAnimationFrame(step);
    };
    const timer = setTimeout(() => requestAnimationFrame(step), index * 80);
    return () => clearTimeout(timer);
  }, [value, index]);
  const rgb = hexToRgb(color);
  return (
    <div style={{ background:`rgba(${rgb},0.07)`, border:`1px solid rgba(${rgb},0.2)`, borderRadius:"12px", padding:"16px", textAlign:"center" }}>
      <div style={{ fontSize:"1.75rem", fontWeight:800, color, fontVariantNumeric:"tabular-nums", letterSpacing:"-0.02em" }}>
        {displayed}{suffix}
      </div>
      <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"4px", lineHeight:1.3 }}>{label}</div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position:"relative", borderRadius:"8px", overflow:"hidden", marginTop:"10px" }}>
      <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{ position:"absolute", top:"8px", right:"8px", fontSize:"10px", padding:"2px 8px", borderRadius:"4px", border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.08)", color:"#aaa", cursor:"pointer", zIndex:1 }}>
        {copied ? "✓ Copied" : "Copy"}
      </button>
      <pre style={{ background:"#0d1117", color:"#e6edf3", fontSize:"0.75rem", lineHeight:1.6, padding:"16px", margin:0, overflowX:"auto", whiteSpace:"pre" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ServiceCard({ svc, expanded, onToggle, innerRef }: { svc:Service; expanded:boolean; onToggle:()=>void; innerRef:(el:HTMLDivElement|null)=>void }) {
  const rgb = hexToRgb(svc.color);
  return (
    <div ref={innerRef} id={`svc-${svc.id}`} style={{ border:`1px solid rgba(${rgb},0.22)`, borderRadius:"12px", overflow:"hidden", marginBottom:"12px", transition:"box-shadow 0.2s" }}>
      <button onClick={onToggle} style={{ width:"100%", textAlign:"left", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", background:`rgba(${rgb},0.06)`, border:"none", gap:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:svc.color, flexShrink:0 }} />
          <span style={{ fontWeight:700, fontSize:"0.95rem", color:"var(--text)" }}>{svc.name}</span>
          <span style={{ fontSize:"0.68rem", padding:"2px 8px", borderRadius:"20px", background:`rgba(${rgb},0.12)`, color:svc.color, flexShrink:0 }}>{svc.tech}</span>
        </div>
        <span style={{ color:"var(--text-muted)", fontSize:"0.8rem", flexShrink:0, transform:expanded?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</span>
      </button>
      <div style={{ maxHeight: expanded ? "2000px" : "0", overflow:"hidden", transition:"max-height 0.35s ease" }}>
        <div style={{ padding:"16px", borderTop:`1px solid rgba(${rgb},0.12)` }}>
          <p style={{ color:"var(--text-muted)", fontSize:"0.85rem", lineHeight:1.65, marginBottom:"14px" }}>{svc.whatItDoes}</p>
          <div style={{ marginBottom:"14px" }}>
            <div style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:svc.color, marginBottom:"6px" }}>Responsibilities</div>
            <ul style={{ margin:0, paddingLeft:"18px" }}>
              {svc.responsibilities.map((r,i) => <li key={i} style={{ fontSize:"0.82rem", color:"var(--text-muted)", marginBottom:"3px" }}>{r}</li>)}
            </ul>
          </div>
          <div style={{ marginBottom:"14px" }}>
            <div style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:svc.color, marginBottom:"6px" }}>API Routes</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
                <thead><tr style={{ borderBottom:`1px solid rgba(${rgb},0.15)` }}>
                  {["Method","Path","Description"].map(h => <th key={h} style={{ textAlign:"left", padding:"6px 8px", color:"var(--text-faint)", fontWeight:600, whiteSpace:"nowrap" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {svc.apiRoutes.map((r,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid rgba(${rgb},0.08)` }}>
                      <td style={{ padding:"6px 8px", color:svc.color, fontWeight:600, fontFamily:"monospace", whiteSpace:"nowrap" }}>{r.method}</td>
                      <td style={{ padding:"6px 8px", color:"var(--text)", fontFamily:"monospace", whiteSpace:"nowrap" }}>{r.path}</td>
                      <td style={{ padding:"6px 8px", color:"var(--text-muted)" }}>{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ marginBottom:"14px" }}>
            <div style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:svc.color, marginBottom:"4px" }}>Classes & Methods</div>
            <CodeBlock code={svc.codeBlock} />
          </div>
          <div style={{ marginBottom:"14px" }}>
            <div style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:svc.color, marginBottom:"6px" }}>DB Tables</div>
            {svc.dbTables.map((t,i) => <div key={i} style={{ fontSize:"0.78rem", fontFamily:"monospace", color:"var(--text-muted)", background:"rgba(255,255,255,0.03)", borderRadius:"4px", padding:"4px 8px", marginBottom:"3px" }}>{t}</div>)}
          </div>
          <div style={{ padding:"12px 14px", borderRadius:"8px", background:`rgba(${rgb},0.07)`, border:`1px solid rgba(${rgb},0.2)` }}>
            <div style={{ fontSize:"0.72rem", fontWeight:700, color:svc.color, marginBottom:"4px" }}>💡 KEY INSIGHT</div>
            <p style={{ margin:0, fontSize:"0.82rem", color:"var(--text)", lineHeight:1.6 }}>{svc.insight}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QAItem({ qa, isReviewed, onToggleReview, searchTerm }: { qa:QA; isReviewed:boolean; onToggleReview:()=>void; searchTerm:string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border:"1px solid var(--border)", borderRadius:"10px", marginBottom:"8px", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:"8px", padding:"12px 14px", cursor:"pointer", background:"var(--bg-card)" }}
        onClick={() => setOpen(o => !o)}>
        <button onClick={e => { e.stopPropagation(); onToggleReview(); }}
          style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.1rem", color: isReviewed ? "#f59e0b" : "var(--text-faint)", flexShrink:0, padding:0, lineHeight:1 }}>
          {isReviewed ? "★" : "☆"}
        </button>
        <p style={{ flex:1, margin:0, fontSize:"0.85rem", fontWeight:600, color:"var(--text)", lineHeight:1.5 }}>
          {highlight(qa.q, searchTerm)}
        </p>
        <span style={{ color:"var(--text-faint)", fontSize:"0.75rem", flexShrink:0, transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</span>
      </div>
      <div style={{ maxHeight: open ? "1200px" : "0", overflow:"hidden", transition:"max-height 0.3s ease" }}>
        <div style={{ padding:"12px 14px 14px 38px", borderTop:"1px solid var(--border)", background:"rgba(255,255,255,0.015)" }}>
          <p style={{ margin:0, fontSize:"0.83rem", color:"var(--text-muted)", lineHeight:1.7 }}>
            {highlight(qa.a, searchTerm)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function NetflixDocViewer({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview"|"sysdesign"|"pipeline"|"qa"|"cheatsheet">("overview");
  const [qaSubTab, setQaSubTab] = useState<"arch"|"pipeline"|"rel">("arch");
  const [expandedSvcs, setExpandedSvcs] = useState<Set<string>>(new Set());
  const [activeSvc, setActiveSvc] = useState<string>("client");
  const [qaSearch, setQaSearch] = useState("");
  const [reviewed, setReviewed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("netflix_qa_reviewed") || "[]")); } catch { return new Set(); }
  });
  const [panelIn, setPanelIn] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const svcRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setPanelIn(true))); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setActiveTab("qa");
        setTimeout(() => searchRef.current?.focus(), 100);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function toggleReview(id: string) {
    setReviewed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem("netflix_qa_reviewed", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function scrollToService(id: string) {
    setActiveTab("sysdesign");
    setExpandedSvcs(prev => new Set([...prev, id]));
    setActiveSvc(id);
    setTimeout(() => {
      svcRefs.current[id]?.scrollIntoView({ behavior:"smooth", block:"start" });
    }, 120);
  }

  const qaList = qaSubTab === "arch" ? QA_ARCH : qaSubTab === "pipeline" ? QA_PIPELINE : QA_RELIABILITY;
  const filteredQA = useMemo(() => {
    if (!qaSearch.trim()) return qaList;
    const t = qaSearch.toLowerCase();
    return qaList.filter(q => q.q.toLowerCase().includes(t) || q.a.toLowerCase().includes(t));
  }, [qaList, qaSearch]);

  const qaReviewedCount = useMemo(() => qaList.filter(q => reviewed.has(q.id)).length, [qaList, reviewed]);

  const TABS = [
    { id:"overview",    label:"Overview" },
    { id:"sysdesign",   label:"System Design" },
    { id:"pipeline",    label:"Data Pipeline" },
    { id:"qa",          label:"Interview Q&A" },
    { id:"cheatsheet",  label:"Cheat Sheet" },
  ] as const;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", background:"rgba(0,0,0,0.88)", backdropFilter:"blur(12px)", opacity: panelIn ? 1 : 0, transition:"opacity 0.22s ease" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width:"100%", maxWidth:"1100px", height:"92vh", display:"flex", flexDirection:"column", borderRadius:"16px", overflow:"hidden", background:"var(--bg-card)", border:"1px solid rgba(229,9,20,0.25)", boxShadow:"0 0 80px rgba(229,9,20,0.1), 0 40px 80px rgba(0,0,0,0.9)", transform: panelIn ? "scale(1) translateY(0)" : "scale(0.94) translateY(20px)", transition:"transform 0.4s cubic-bezier(0.34,1.5,0.64,1)" }}>

        {/* Header */}
        <div style={{ borderBottom:"1px solid var(--border)", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"rgba(229,9,20,0.04)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"#e50914", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", fontWeight:900, color:"#fff" }}>N</div>
            <div>
              <div style={{ fontWeight:800, fontSize:"1.05rem", color:"var(--text)" }}>Netflix System Design</div>
              <div style={{ fontSize:"0.7rem", color:"var(--text-faint)" }}>22 services · 60 Q&As · Full pipeline · Cheat sheet</div>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize:"0.8rem", padding:"5px 12px", borderRadius:"6px", border:"1px solid var(--border)", background:"var(--bg-muted)", color:"var(--text-muted)", cursor:"pointer" }}>✕ Close</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"2px", padding:"8px 16px 0", borderBottom:"1px solid var(--border)", flexShrink:0, overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding:"8px 16px", fontSize:"0.83rem", fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? "#e50914" : "var(--text-muted)", borderTop:"none", borderLeft:"none", borderRight:"none", borderBottom: activeTab === t.id ? "2px solid #e50914" : "2px solid transparent", background:"none", cursor:"pointer", whiteSpace:"nowrap", transition:"color 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>

          {/* ── Overview ── */}
          {activeTab === "overview" && (
            <div>
              <div style={{ textAlign:"center", marginBottom:"28px" }}>
                <div style={{ fontSize:"2rem", fontWeight:900, color:"#e50914", letterSpacing:"-0.02em", marginBottom:"6px" }}>Netflix</div>
                <div style={{ fontSize:"1.1rem", fontWeight:700, color:"var(--text)", marginBottom:"6px" }}>Streaming Infrastructure at Scale</div>
                <div style={{ fontSize:"0.85rem", color:"var(--text-muted)" }}>300M+ subscribers · 190+ countries · 60M peak concurrent streams</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:"10px", marginBottom:"32px" }}>
                {STAT_CARDS.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
              </div>
              <div style={{ borderTop:"1px solid var(--border)", paddingTop:"20px" }}>
                <div style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-faint)", marginBottom:"12px" }}>Quick Jump — Services</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                  {SERVICES.map(svc => {
                    const rgb = hexToRgb(svc.color);
                    return (
                      <button key={svc.id} onClick={() => scrollToService(svc.id)}
                        style={{ fontSize:"0.78rem", padding:"5px 12px", borderRadius:"20px", border:`1px solid rgba(${rgb},0.3)`, background:`rgba(${rgb},0.06)`, color:svc.color, cursor:"pointer", fontWeight:500 }}>
                        {svc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── System Design ── */}
          {activeTab === "sysdesign" && (
            <div style={{ display:"flex", gap:"16px", alignItems:"flex-start" }}>
              {/* Sidebar */}
              <div style={{ width:"200px", flexShrink:0, position:"sticky", top:0, overflowY:"auto", maxHeight:"80vh" }}>
                <div style={{ display:"flex", gap:"6px", marginBottom:"10px" }}>
                  <button onClick={() => setExpandedSvcs(new Set(SERVICES.map(s=>s.id)))}
                    style={{ flex:1, fontSize:"0.68rem", padding:"4px 0", borderRadius:"5px", border:"1px solid var(--border)", background:"var(--bg-muted)", color:"var(--text-muted)", cursor:"pointer" }}>
                    Expand All
                  </button>
                  <button onClick={() => setExpandedSvcs(new Set())}
                    style={{ flex:1, fontSize:"0.68rem", padding:"4px 0", borderRadius:"5px", border:"1px solid var(--border)", background:"var(--bg-muted)", color:"var(--text-muted)", cursor:"pointer" }}>
                    Collapse All
                  </button>
                </div>
                {SIDEBAR_GROUPS.map(g => (
                  <div key={g.label} style={{ marginBottom:"14px" }}>
                    <div style={{ fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-faint)", marginBottom:"4px", padding:"0 4px" }}>{g.label}</div>
                    {g.ids.map(id => {
                      const svc = SERVICES.find(s => s.id === id);
                      if (!svc) return null;
                      const rgb = hexToRgb(svc.color);
                      return (
                        <button key={id} onClick={() => { setActiveSvc(id); svcRefs.current[id]?.scrollIntoView({ behavior:"smooth", block:"start" }); }}
                          style={{ width:"100%", textAlign:"left", fontSize:"0.78rem", padding:"5px 8px", borderRadius:"6px", border:"none", background: activeSvc === id ? `rgba(${rgb},0.12)` : "transparent", color: activeSvc === id ? svc.color : "var(--text-muted)", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", marginBottom:"2px" }}>
                          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:svc.color, flexShrink:0 }} />
                          {svc.name}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              {/* Cards */}
              <div style={{ flex:1, minWidth:0 }}>
                {SERVICES.map(svc => (
                  <ServiceCard key={svc.id} svc={svc}
                    expanded={expandedSvcs.has(svc.id)}
                    onToggle={() => setExpandedSvcs(prev => { const n = new Set(prev); n.has(svc.id) ? n.delete(svc.id) : n.add(svc.id); return n; })}
                    innerRef={el => { svcRefs.current[svc.id] = el; }} />
                ))}
              </div>
            </div>
          )}

          {/* ── Data Pipeline ── */}
          {activeTab === "pipeline" && (
            <div>
              <h2 style={{ fontWeight:800, fontSize:"1.1rem", color:"var(--text)", marginBottom:"6px" }}>Data Pipeline</h2>
              <p style={{ fontSize:"0.83rem", color:"var(--text-muted)", marginBottom:"20px" }}>700B events/day · 15M events/sec peak · End-to-end from client to ML platform</p>

              {/* Pipeline diagram */}
              <div style={{ overflowX:"auto", marginBottom:"24px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0", minWidth:"700px", padding:"16px", background:"rgba(255,255,255,0.02)", borderRadius:"12px", border:"1px solid var(--border)" }}>
                  {[
                    {label:"Client Events",color:"#e50914"},
                    {label:"API Gateway",color:"#f0a500"},
                    {label:"Apache Kafka",color:"#231f20",border:"#888"},
                    {label:"Apache Flink",color:"#00bcd4"},
                    {label:"Pinot / Iceberg",color:"#8b5cf6"},
                    {label:"Spark EMR",color:"#f59e0b"},
                    {label:"Trino / Redshift / DynamoDB / ML",color:"#4caf50"},
                  ].map((node, i, arr) => {
                    const rgb = hexToRgb(node.color);
                    const isLast = i === arr.length - 1;
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", flex: isLast ? 2 : 1 }}>
                        <div style={{ flex:1, textAlign:"center", background:`rgba(${rgb},0.1)`, border:`1px solid rgba(${rgb},0.3)`, borderRadius:"8px", padding:"10px 6px", minWidth:"80px" }}>
                          <div style={{ fontSize:"0.72rem", fontWeight:700, color:node.color, lineHeight:1.4 }}>{node.label}</div>
                        </div>
                        {!isLast && (
                          <div style={{ width:"24px", textAlign:"center", color:"var(--text-faint)", fontSize:"0.9rem", flexShrink:0 }}>→</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scale Assumptions */}
              <div style={{ marginBottom:"20px", padding:"16px", background:"rgba(255,255,255,0.02)", borderRadius:"10px", border:"1px solid var(--border)" }}>
                <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"10px" }}>Scale Assumptions</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"8px" }}>
                  {[
                    ["Peak Events/sec","15M"],["Events/day","700B"],["Data/day","1.5 PB"],
                    ["Kafka partitions (playback)","3,000"],["Flink checkpoint interval","30s"],["Pinot query latency","<100ms"],
                  ].map(([k,v]) => (
                    <div key={k} style={{ fontSize:"0.78rem" }}>
                      <span style={{ color:"var(--text-faint)" }}>{k}: </span>
                      <span style={{ color:"var(--text)", fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Envelope */}
              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"8px" }}>Event Envelope</div>
                <CodeBlock code={`{
  "eventType": "PLAYBACK_QUALITY",        // P0–P3 determines topic routing
  "sessionId": "uuid-v4",
  "userId": "uuid-v4",
  "titleId": "uuid-v4",
  "timestamp": 1718000000000,             // ISO-8601 ms, serverTimestamp is authoritative
  "schemaVersion": 3,
  "position_ms": 184000,
  "bitrateKbps": 8000,
  "bufferRatio": 0.95,
  "rebufferCount": 0,
  "errorCode": null,                       // Non-null → routed to playback.errors (P0)
  "deviceType": "TV",
  "networkType": "ethernet",
  "regionCode": "IN-MH"
}`} />
              </div>

              {/* Priority Levels */}
              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"8px" }}>Event Priority Levels</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:"8px" }}>
                  {[
                    {level:"P0",color:"#ef4444",latency:"<100ms",desc:"Playback errors, DRM failures",topic:"playback.errors"},
                    {level:"P1",color:"#f59e0b",latency:"<1s",   desc:"Quality metrics, seeks",       topic:"playback.quality"},
                    {level:"P2",color:"#3b82f6",latency:"<10s",  desc:"UI clicks, previews",           topic:"playback.ui"},
                    {level:"P3",color:"#6b7280",latency:"<1min", desc:"Metadata, non-critical",        topic:"playback.meta"},
                  ].map(p => {
                    const rgb = hexToRgb(p.color);
                    return (
                      <div key={p.level} style={{ padding:"12px", borderRadius:"8px", background:`rgba(${rgb},0.07)`, border:`1px solid rgba(${rgb},0.2)` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                          <span style={{ fontWeight:800, color:p.color, fontSize:"0.9rem" }}>{p.level}</span>
                          <span style={{ fontSize:"0.7rem", color:p.color, opacity:0.8 }}>SLA: {p.latency}</span>
                        </div>
                        <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginBottom:"2px" }}>{p.desc}</div>
                        <div style={{ fontSize:"0.7rem", fontFamily:"monospace", color:"var(--text-faint)" }}>{p.topic}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kafka Config */}
              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"8px" }}>Kafka Architecture</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"8px", marginBottom:"10px" }}>
                  {[
                    {topic:"playback.events",partitions:"3,000",retention:"7d",desc:"All playback events"},
                    {topic:"billing.events",partitions:"500",retention:"30d",desc:"Payment & subscription events"},
                    {topic:"recommendation.input",partitions:"1,000",retention:"3d",desc:"Events for model retraining"},
                    {topic:"analytics.events",partitions:"5,000",retention:"7d",desc:"Raw analytics firehose"},
                  ].map(t => (
                    <div key={t.topic} style={{ padding:"10px 12px", borderRadius:"8px", background:"rgba(255,255,255,0.02)", border:"1px solid var(--border)" }}>
                      <div style={{ fontFamily:"monospace", fontSize:"0.75rem", color:"#00bcd4", marginBottom:"2px" }}>{t.topic}</div>
                      <div style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>{t.partitions} partitions · {t.retention} retention · {t.desc}</div>
                    </div>
                  ))}
                </div>
                <CodeBlock code={`// Zero-loss producer config
acks=all | enable.idempotence=true | max.in.flight=1 | retries=MAX_INT
min.insync.replicas=2 | replication.factor=3 | unclean.leader.election=false`} />
              </div>

              {/* Iceberg Lakehouse */}
              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"8px" }}>Iceberg Lakehouse (Medallion Architecture)</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"10px" }}>
                  {[
                    {tier:"Bronze",color:"#f59e0b",desc:"Raw events from Kafka. No schema enforcement. JSON, partitioned by date+hour. Retention: 90 days. Purpose: audit trail, recovery."},
                    {tier:"Silver",color:"#9ca3af",desc:"Validated & deduplicated. Type-cast, null-checked, enriched with title/user metadata. Parquet+Snappy, partitioned by date. Retention: 1 year."},
                    {tier:"Gold",color:"#ffd700",desc:"Pre-computed aggregates for ML features & BI. Daily viewing minutes, retention curves, trending. Parquet, partitioned by date. Retention: 3 years."},
                  ].map(t => {
                    const rgb = hexToRgb(t.color);
                    return (
                      <div key={t.tier} style={{ padding:"14px", borderRadius:"10px", background:`rgba(${rgb},0.07)`, border:`1px solid rgba(${rgb},0.25)` }}>
                        <div style={{ fontWeight:800, color:t.color, marginBottom:"6px" }}>{t.tier}</div>
                        <p style={{ margin:0, fontSize:"0.78rem", color:"var(--text-muted)", lineHeight:1.55 }}>{t.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Serving Layer Decision Matrix */}
              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"8px" }}>Serving Layer Decision Matrix</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
                    <thead><tr style={{ borderBottom:"1px solid var(--border)", background:"rgba(255,255,255,0.02)" }}>
                      {["System","Latency","When to Use"].map(h => <th key={h} style={{ textAlign:"left", padding:"8px 10px", color:"var(--text-faint)", fontWeight:600 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[
                        ["Apache Pinot","<10ms","Real-time operational dashboards, sub-second aggregations"],
                        ["Trino on Iceberg","1–30s","Data science ad-hoc queries, time travel, cross-source joins"],
                        ["Amazon Redshift","1–60s","Business reporting, complex historical analytics, BI tools"],
                        ["DynamoDB","<5ms","Per-user key-value lookups (playback sessions, feature flags)"],
                        ["Feast Feature Store","<2ms","ML real-time inference feature retrieval for TorchServe"],
                      ].map(([sys,lat,use]) => (
                        <tr key={sys} style={{ borderBottom:"1px solid var(--border)" }}>
                          <td style={{ padding:"8px 10px", fontWeight:600, color:"var(--text)", whiteSpace:"nowrap" }}>{sys}</td>
                          <td style={{ padding:"8px 10px", color:"#4caf50", fontFamily:"monospace", whiteSpace:"nowrap" }}>{lat}</td>
                          <td style={{ padding:"8px 10px", color:"var(--text-muted)" }}>{use}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Interview Q&A ── */}
          {activeTab === "qa" && (
            <div>
              {/* Search */}
              <div style={{ marginBottom:"16px", display:"flex", gap:"10px", alignItems:"center" }}>
                <input ref={searchRef} value={qaSearch} onChange={e => setQaSearch(e.target.value)}
                  placeholder="Search Q&As… (⌘K)"
                  style={{ flex:1, padding:"9px 14px", borderRadius:"8px", border:"1px solid var(--border)", background:"var(--bg-card)", color:"var(--text)", fontSize:"0.85rem", outline:"none" }} />
                {qaSearch && <button onClick={() => setQaSearch("")} style={{ fontSize:"0.75rem", color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer" }}>Clear</button>}
              </div>
              {/* Sub-tabs */}
              <div style={{ display:"flex", gap:"8px", marginBottom:"14px" }}>
                {([["arch","Architecture (25)"],["pipeline","Data Pipeline (25)"],["rel","Reliability (10)"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setQaSubTab(key)}
                    style={{ padding:"7px 16px", fontSize:"0.8rem", fontWeight: qaSubTab === key ? 700 : 500, borderRadius:"20px", border:`1px solid ${qaSubTab === key ? "#e50914" : "var(--border)"}`, background: qaSubTab === key ? "rgba(229,9,20,0.1)" : "transparent", color: qaSubTab === key ? "#e50914" : "var(--text-muted)", cursor:"pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
              {/* Progress bar */}
              <div style={{ marginBottom:"16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.72rem", color:"var(--text-faint)", marginBottom:"4px" }}>
                  <span>Progress</span>
                  <span>{qaReviewedCount} / {qaList.length} reviewed</span>
                </div>
                <div style={{ height:"4px", borderRadius:"2px", background:"var(--border)", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:"2px", background:"#e50914", width:`${qaList.length > 0 ? (qaReviewedCount/qaList.length)*100 : 0}%`, transition:"width 0.3s" }} />
                </div>
              </div>
              {filteredQA.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px", color:"var(--text-faint)", fontSize:"0.85rem" }}>No Q&As match "{qaSearch}"</div>
              )}
              {filteredQA.map(qa => (
                <QAItem key={qa.id} qa={qa} isReviewed={reviewed.has(qa.id)}
                  onToggleReview={() => toggleReview(qa.id)} searchTerm={qaSearch} />
              ))}
            </div>
          )}

          {/* ── Cheat Sheet ── */}
          {activeTab === "cheatsheet" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
                <div>
                  <h2 style={{ fontWeight:800, fontSize:"1.1rem", color:"var(--text)", margin:0 }}>Cheat Sheet</h2>
                  <p style={{ fontSize:"0.78rem", color:"var(--text-muted)", margin:"4px 0 0" }}>Quick reference for interviews and daily use</p>
                </div>
                <button onClick={() => window.print()} style={{ padding:"7px 16px", fontSize:"0.78rem", borderRadius:"8px", border:"1px solid var(--border)", background:"var(--bg-muted)", color:"var(--text-muted)", cursor:"pointer" }}>
                  🖨️ Print / Export
                </button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(400px, 1fr))", gap:"16px" }}>

                {/* Critical Numbers */}
                <div style={{ padding:"16px", borderRadius:"12px", border:"1px solid var(--border)", background:"rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"10px" }}>Critical Numbers</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
                    <tbody>
                      {[["Subscribers","300M"],["Peak concurrent streams","60M"],["API requests/sec","1M+"],["Analytics events/day","700B"],["Data ingested/day","1.5 PB"],["Peak event rate","15M/sec"],["OCA appliances","~17,000"],["Countries","190+"],["Microservices","1,000+"],["Cassandra nodes","~10,000"],["Kafka events/day","~1 trillion"],["Encoding variants/title","1,200+"]].map(([k,v]) => (
                        <tr key={k} style={{ borderBottom:"1px solid var(--border)" }}>
                          <td style={{ padding:"5px 8px", color:"var(--text-muted)" }}>{k}</td>
                          <td style={{ padding:"5px 8px", fontWeight:700, color:"#e50914", textAlign:"right" }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Database Decision Tree */}
                <div style={{ padding:"16px", borderRadius:"12px", border:"1px solid var(--border)", background:"rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"10px" }}>Database Decision Tree</div>
                  <div style={{ fontSize:"0.78rem", lineHeight:1.7 }}>
                    {[
                      {q:"Sub-ms reads, high write throughput, no joins?",a:"→ Cassandra (watch history, preferences)"},
                      {q:"ACID transactions, strong consistency?",a:"→ MySQL / CockroachDB (billing, subscriptions)"},
                      {q:"Sub-ms cache, session/auth data?",a:"→ EVCache / Redis (auth tokens, rate limits)"},
                      {q:"Real-time OLAP, sub-second aggregations?",a:"→ Apache Pinot (quality dashboards)"},
                      {q:"Ad-hoc SQL on PB-scale, time travel?",a:"→ Trino on Iceberg (data science)"},
                      {q:"Key-value lookups at single-digit ms?",a:"→ DynamoDB (playback sessions, feature flags)"},
                    ].map((item, i) => (
                      <div key={i} style={{ marginBottom:"8px", paddingLeft:"10px", borderLeft:"2px solid var(--border)" }}>
                        <div style={{ color:"var(--text-muted)", marginBottom:"1px" }}>{item.q}</div>
                        <div style={{ color:"#4caf50", fontWeight:600 }}>{item.a}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kafka Zero-Loss Config */}
                <div style={{ padding:"16px", borderRadius:"12px", border:"1px solid var(--border)", background:"rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"10px" }}>Kafka Zero-Loss Config</div>
                  <CodeBlock code={`acks=all
enable.idempotence=true
max.in.flight.requests.per.connection=1
retries=2147483647
min.insync.replicas=2
replication.factor=3
unclean.leader.election.enable=false
transactional.id=<unique-per-producer>`} />
                </div>

                {/* Iceberg Partition Rules */}
                <div style={{ padding:"16px", borderRadius:"12px", border:"1px solid var(--border)", background:"rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"10px" }}>Iceberg Partition Rules</div>
                  <ul style={{ margin:0, paddingLeft:"18px" }}>
                    {[
                      "Partition by date for daily batch jobs",
                      "Partition by date+hour for high-volume streaming data",
                      "Never partition by high-cardinality fields (userId, sessionId) — too many small files",
                      "Target partition size: 128MB–1GB",
                      "Use hidden partitioning: PARTITIONED BY (days(ts))",
                      "Evolve partitions without rewriting: ALTER TABLE ... SET PARTITIONED BY",
                      "Compact small files daily with REWRITE DATA FILES",
                    ].map((r, i) => <li key={i} style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginBottom:"4px" }}>{r}</li>)}
                  </ul>
                </div>

                {/* Hystrix Config */}
                <div style={{ padding:"16px", borderRadius:"12px", border:"1px solid var(--border)", background:"rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"10px" }}>Hystrix Circuit Breaker Config</div>
                  <CodeBlock code={`circuitBreaker.requestVolumeThreshold=20
circuitBreaker.errorThresholdPercentage=50
circuitBreaker.sleepWindowInMilliseconds=5000
execution.isolation.thread.timeoutInMilliseconds=1000
metrics.rollingStats.timeInMilliseconds=10000
fallback.isolation.semaphore.maxConcurrentRequests=10`} />
                </div>

                {/* Interview Power Phrases */}
                <div style={{ padding:"16px", borderRadius:"12px", border:"1px solid var(--border)", background:"rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text)", marginBottom:"10px" }}>Interview Power Phrases</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {[
                      "Netflix chooses AP over CP for watch history because stale data is tolerable; for billing they choose CP because double-charging is unacceptable.",
                      "OCAs eliminate backbone transit — 95%+ of Netflix traffic never leaves the subscriber's ISP network.",
                      "Kafka's exactly-once semantics use idempotent producers + transactional consumers; the Flink checkpoint atomically commits both state and Kafka offset.",
                      "EVCache is write-through, not write-behind — every write hits both cache and database synchronously, trading write latency for read consistency.",
                      "Netflix's per-title encoding means a 2-hour cartoon uses 40% less bandwidth than a 2-hour action film at the same perceived quality (VMAF score).",
                      "Chaos Engineering tests in production because staging doesn't replicate production traffic patterns — you can't find real failure modes without real load.",
                    ].map((phrase, i) => {
                      const [copied, setCopied] = useState(false);
                      return (
                        <div key={i} style={{ display:"flex", gap:"8px", alignItems:"flex-start", padding:"8px 10px", borderRadius:"6px", background:"rgba(255,255,255,0.025)", border:"1px solid var(--border)" }}>
                          <p style={{ flex:1, margin:0, fontSize:"0.77rem", color:"var(--text-muted)", lineHeight:1.55 }}>{phrase}</p>
                          <button onClick={() => { navigator.clipboard.writeText(phrase); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                            style={{ flexShrink:0, fontSize:"0.65rem", padding:"2px 7px", borderRadius:"4px", border:"1px solid var(--border)", background:"var(--bg-muted)", color:"var(--text-faint)", cursor:"pointer", whiteSpace:"nowrap" }}>
                            {copied ? "✓" : "Copy"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

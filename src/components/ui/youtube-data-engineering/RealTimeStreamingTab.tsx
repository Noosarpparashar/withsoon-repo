"use client";

import { Section, SectionInspector, YouTubeFrame } from "./shared";
import { STREAMING_SECTIONS } from "./data";
import { CoreTakeaway, DepthPanel, InterviewPath } from "../data-design/ProgressiveChapter";

type ExplainCardProps = {
  title: string;
  sub: string;
  detail: React.ReactNode;
  side?: "top" | "bottom";
  wide?: boolean;
};

function ExplainCard({ title, sub }: ExplainCardProps) {
  return (
    <div className="relative min-h-[94px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left">
      <span className="flex items-start justify-between gap-3"><strong className="text-sm text-[var(--text)]">{title}</strong></span>
      <span className="mt-2 block text-xs leading-5 text-[var(--text-muted)]">{sub}</span>
    </div>
  );
}

function Explanation({ what, how, example }: { what: string; how: string; example: string }) {
  return (
    <div data-testid="explainer-copy" className="max-w-[65ch] space-y-2">
      <p>{what} {how}</p>
      <p><strong>YouTube example: </strong>{example}</p>
    </div>
  );
}

const jobs = [
  { title: "Live Counters", sub: "Approximate views by video", what: "Maintains seconds-old view and engagement totals for each video.", how: "Aggregate sharded video keys into short time buckets, deduplicate event_id, then upsert the latest bucket version.", example: "A live concert's counter refreshes every few seconds while nightly batch later certifies the official total." },
  { title: "Trending", sub: "Velocity over sliding windows", what: "Finds videos gaining attention now, rather than videos with the largest lifetime count.", how: "Compare view and engagement velocity across overlapping windows, then add freshness, diversity, quality, and abuse features.", example: "A new upload moving from 2K to 80K regional views in ten minutes can outrank an old video with a larger static total." },
  { title: "Watch Time", sub: "Sessions from heartbeats", what: "Turns noisy playback heartbeats into validated played time for one playback attempt.", how: "Key by viewer plus playback_attempt_id, order by event time, remove retries, and update session state only for valid playback deltas.", example: "Playing heartbeats add time; buffering and paused intervals remain separate and do not inflate watch time." },
  { title: "Fraud Signals", sub: "Flag suspicious spikes", what: "Produces fast evidence that a view or engagement spike may be artificial.", how: "Maintain short-lived counters and sequence patterns by device, account, network, video, and campaign; publish flags for review or discounting.", example: "Thousands of identical watch attempts from a small device cluster raise a signal before those events become certified counts." },
  { title: "Online Features", sub: "Recent viewer activity", what: "Keeps recommendation features fresh between offline training runs.", how: "Update timestamped values such as recent watches, searches, topic affinity, and short-term popularity in an online feature store.", example: "After a viewer watches three guitar tutorials, the next recommendation request can use that recent sequence immediately." },
  { title: "QoE Monitor", sub: "Buffering and error alerts", what: "Detects live playback-quality regressions by region, app version, device, ISP, or CDN path.", how: "Aggregate buffer starts, startup delay, fatal errors, bitrate changes, and playback failures in short event-time windows.", example: "A rebuffer spike isolated to TV app version 9.4 in one region pages the owning playback team." },
] as const;

const concepts = [
  { title: "Event Time", sub: "When playback happened", what: "Windows use the timestamp carried by the playback event, not the moment Flink receives it.", how: "Assign timestamps from the trusted event field and preserve ingest time separately for delay monitoring.", example: "A heartbeat created at 10:02 but received at 10:07 still belongs to the 10:02 playback window." },
  { title: "Watermark", sub: "Progress with bounded waiting", what: "A watermark estimates how far event time has progressed and tells Flink when most earlier events should have arrived.", how: "Choose lateness from measured mobile and TV delay distributions, then add a documented grace period.", example: "At watermark 10:10 with five-minute allowed lateness, a 10:02 window can close while exceptional arrivals use a correction path." },
  { title: "Tumbling Window", sub: "One fixed bucket", what: "Creates non-overlapping buckets for simple periodic totals.", how: "Assign each event to exactly one minute, five-minute, or hourly interval.", example: "Live dashboard cards read one-minute view counts such as 10:02:00 through 10:02:59." },
  { title: "Sliding Window", sub: "Overlapping trend signal", what: "Recomputes a rolling interval frequently so momentum changes are visible quickly.", how: "Use a window such as the last ten minutes, advanced every minute.", example: "Trending compares the newest ten-minute view velocity every minute instead of waiting for a fixed bucket to end." },
  { title: "Session Window", sub: "One playback attempt", what: "Groups events separated by short gaps into the same viewing session and closes after inactivity.", how: "Key by privacy-approved viewer identity plus playback_attempt_id and use an inactivity timer.", example: "Play, heartbeats, pause, resume, seek, and end for attempt p-42 produce one versioned watch-session row." },
  { title: "Backpressure", sub: "A slow task blocks upstream", what: "A consumer task receives work more slowly than Kafka and upstream operators produce it.", how: "Inspect per-task busy time and lag, then fix skew, increase parallelism, tune state/checkpoints, or protect a slow sink.", example: "One viral-video key saturates a task; sharding that video removes the bottleneck instead of only adding idle consumers." },
] as const;

const stateGroups = [
  { title: "Identity", sub: "Which playback attempt?", fields: ["playback_attempt_id", "consent_state", "client_versions"], what: "Fields that identify the one playback attempt being reconstructed and the permissions attached to it.", how: "Flink uses viewer identity plus playback_attempt_id to locate the correct state object. Consent limits downstream use; client version helps trace producer defects.", example: "Every event for attempt p-42 loads the same state record, while events for the viewer's next video load a different record." },
  { title: "Timing", sub: "When did it happen?", fields: ["session_start_event_time", "last_valid_event_time"], what: "Event-time boundaries for the beginning and latest valid activity in this attempt.", how: "They order delayed heartbeats, calculate inactivity, and fire the timer that closes a session when no end event arrives.", example: "The last valid event was 10:04. When the watermark passes the inactivity deadline, Flink closes p-42." },
  { title: "Playback", sub: "How much was watched?", fields: ["last_position_ms", "total_played_ms", "unique_covered_ranges"], what: "The progress needed to calculate played time and distinct video coverage.", how: "A valid heartbeat moves last_position_ms and adds a bounded delta to total_played_ms. Covered ranges track which content intervals were actually seen.", example: "Rewatching seconds 30-40 adds ten played seconds but does not add ten new seconds of unique coverage." },
  { title: "Experience", sub: "Was playback healthy?", fields: ["buffering_ms", "pause_count", "seek_count"], what: "Playback behavior and quality measures stored separately from active watch time.", how: "Buffer, pause, and seek transitions update their own counters so product and infrastructure teams can diagnose the viewing experience.", example: "A 12-second buffer increases buffering_ms by 12 seconds and adds zero seconds to active watch time." },
  { title: "Correctness", sub: "Can this update be trusted?", fields: ["seen_event_ids", "late_update_version"], what: "Guards that prevent retry duplicates and let a late event safely correct an existing session.", how: "Ignore an event_id already seen. When accepted late data changes p-42, emit the same session key with a higher late_update_version.", example: "A repeated heartbeat e-17 is ignored; a new delayed heartbeat e-18 changes p-42 from version 2 to version 3." },
] as const;

const sessionRules = [
  { title: "Valid Playback", sub: "Only playing time contributes", detail: "A heartbeat adds a bounded played delta only when the state and event sequence show real playback. Buffering and paused time remain separate." },
  { title: "Rewind", sub: "Played time and coverage differ", detail: "Rewatching ten seconds may add ten seconds to total_played_ms, but those seconds do not expand unique_covered_ranges if that segment was already viewed." },
  { title: "Bad Delta", sub: "Quarantine impossible movement", detail: "Negative deltas, impossible position jumps, excessive clock skew, and unsupported state transitions are flagged or quarantined instead of changing watch time." },
  { title: "Close", sub: "End event or inactivity", detail: "video_end or complete closes immediately. If a player crashes and sends neither, an event-time inactivity timer closes the partial session." },
  { title: "Late Reopen", sub: "Emit a newer version", detail: "A permitted late heartbeat reopens the session state, recalculates totals, and emits the same playback-attempt key with a higher version—not a second fact." },
] as const;

const outputs = [
  { output: "Live video counter", keyName: "video + time bucket", update: "Upsert / shard merge", detail: "Each video shard emits a partial bucket count. A merge stage combines those partials and upserts the current video-and-time-bucket value." },
  { output: "Watch session", keyName: "playback attempt", update: "Versioned upsert", detail: "The sink stores one logical row for p-42. A late heartbeat writes p-42 version 4, replacing version 3 rather than creating a duplicate session." },
  { output: "Trending feature", keyName: "video + region + window", update: "Replace window version", detail: "A feature row is reproducible for one video, region, window, and formula version. Later evidence replaces the same window version safely." },
  { output: "QoE alert", keyName: "metric + region + client", update: "Append by incident", detail: "Alerts are append-only facts attached to a stable incident key so repeated evaluations update or enrich the same operational incident." },
  { output: "Online feature", keyName: "entity + feature", update: "Latest event-time value", detail: "The online store accepts the value with the newest event timestamp, preventing an older delayed update from overwriting a more recent feature." },
] as const;

const trendFeatures = [
  { title: "View Velocity", sub: "Is attention arriving quickly?", group: "Momentum", what: "Qualified views per minute in the current sliding window.", how: "Count deduplicated, eligible views for each video and region over the latest ten minutes.", example: "Video A receives 80K eligible views in ten minutes while Video B receives 10K." },
  { title: "Acceleration", sub: "Is growth getting faster?", group: "Momentum", what: "The change in view velocity between adjacent windows.", how: "Compare the newest view rate with the preceding rate instead of looking only at the current total.", example: "Video A rises from 2K/min to 8K/min, which is stronger momentum than a steady 8K/min." },
  { title: "Unique Viewers", sub: "Is the audience broad?", group: "Audience", what: "An approximate distinct count of eligible viewers in the window.", how: "Use a privacy-safe distinct-count sketch so repeated plays from the same viewer do not look like broad demand.", example: "50K views from 45K viewers is broader than 50K views from 900 viewers." },
  { title: "Geo Diversity", sub: "Is interest distributed?", group: "Audience", what: "How widely interest is spread across allowed geographic buckets.", how: "Measure concentration across countries or regions and retain regional rankings rather than forcing one global list.", example: "A video rising across 20 regions receives a broader-interest signal than the same count from one small network." },
  { title: "Engagement Quality", sub: "Are viewers meaningfully engaged?", group: "Quality", what: "Evidence such as watch depth, meaningful likes, comments, and shares.", how: "Combine normalized engagement rates with watch behavior so a click alone cannot dominate the score.", example: "Two videos have equal starts, but the one with stronger watch depth and shares receives the higher quality signal." },
  { title: "Freshness", sub: "Is the momentum recent?", group: "Quality", what: "A time-decay signal that favors recent momentum over old accumulated popularity.", how: "Reduce the contribution of older windows with a versioned decay rule.", example: "A new upload rising this hour can surface ahead of a year-old video with a much larger lifetime total." },
  { title: "Abuse Penalty", sub: "Does the traffic look trustworthy?", group: "Trust", what: "A negative signal based on invalid traffic and suspicious viewing patterns.", how: "Discount flagged devices, accounts, networks, campaigns, and coordinated bursts before ranking.", example: "A bot-driven spike loses score even when its raw view velocity is high." },
] as const;

const operations = [
  ["Checkpoint Health", "Watch checkpoint duration, failures, alignment time, and stored state size. A growing checkpoint can make recovery slower than the freshness SLO."],
  ["Event-Time Lag", "Measure now minus the newest processed event_time. Low CPU latency can still hide five-minute-old playback data."],
  ["Watermark Progress", "Track each partition's watermark and the distribution of late events. One idle or delayed partition must not freeze every window."],
  ["Savepoints", "Take a controlled state snapshot before changing code or topology so the YouTube job can be upgraded or rolled back without discarding sessions."],
  ["State TTL", "Expire dedup IDs, completed sessions, window buckets, and inactive keys after their correction horizon so state does not grow forever."],
  ["Rescaling", "Document how keyed state redistributes when parallelism changes; validate recovery time and skew before a traffic event."],
  ["Sink Commit", "Monitor upsert conflicts, transaction aborts, retries, and commit age so a healthy Flink graph cannot hide a stalled Pinot, Redis, or lake sink."],
  ["Canary Compare", "Run the new job beside the old version on the same events, compare output by key and window, then expand only after differences are understood."],
] as const;

const stateBranches = [
  { title: "Buffering", path: "PLAYING -> BUFFERING -> PLAYING", trigger: "buffering heartbeat -> playing heartbeat", detail: "Stop adding played time while the player reports BUFFERING. Continue the same session when a later PLAYING heartbeat arrives, and add the buffered duration only to buffering_ms." },
  { title: "Paused", path: "PLAYING -> PAUSED -> PLAYING", trigger: "pause -> resume", detail: "A pause keeps the session open but contributes no watch time. Resume returns to Playing unless the inactivity rule already closed the session." },
  { title: "Seeking", path: "PLAYING -> SEEKING -> PLAYING", trigger: "seek -> playing heartbeat", detail: "A seek changes playback position. The next valid Playing heartbeat establishes the new position; impossible jumps are flagged instead of being counted as watched content." },
  { title: "Closed", path: "PLAYING -> CLOSED", trigger: "inactivity > watermark + grace", detail: "If an app crashes or never sends video_end, the event-time timer closes the partial session. A permitted late event updates the same session key with a higher version." },
] as const;

function StreamingJobs() {
  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="grid gap-3 lg:grid-cols-[170px_auto_1fr_auto_180px] lg:items-center">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center"><strong className="text-sm">Kafka Topics</strong><p className="mt-2 text-xs text-[var(--text-muted)]">Playback · engagement<br />search · ads · QoE</p></div>
        <span className="hidden text-center text-[var(--text-faint)] lg:block">-&gt;</span>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{jobs.map((job) => <ExplainCard key={job.title} title={job.title} sub={job.sub} side="bottom" detail={<Explanation what={job.what} how={job.how} example={job.example} />} />)}</div>
        <span className="hidden text-center text-[var(--text-faint)] lg:block">-&gt;</span>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center"><strong className="text-sm">Live Outputs</strong><p className="mt-2 text-xs text-[var(--text-muted)]">Pinot · Redis<br />alerts · versioned facts</p></div>
      </div>
      <SectionInspector
        id="streaming-jobs-inspector"
        label="streaming job"
        items={jobs.map((job) => ({ id: job.title, title: job.title, summary: job.sub, detail: <Explanation what={job.what} how={job.how} example={job.example} /> }))}
      />
    </div>
  );
}

function StateMachine() {
  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Normal path</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
        <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">video_start</span><span>-&gt;</span>
        <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">Started</span><span className="text-[10px] text-[var(--text-faint)]">heartbeat (PLAYING)</span><span>-&gt;</span>
        <span className="rounded-lg border-2 border-[#91a9c2] bg-[var(--bg-card)] px-5 py-3">Playing</span><span className="text-[10px] text-[var(--text-faint)]">video_end / complete</span><span>-&gt;</span>
        <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">Ended</span>
      </div>
      <div className="mx-auto mt-2 max-w-md rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-center text-[11px] text-[var(--text-muted)]"><strong>Playing self-loop:</strong> each valid PLAYING heartbeat adds a bounded played delta and updates last_valid_event_time.</div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Branches from Playing</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {stateBranches.map((branch) => (
          <div key={branch.title} className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left">
            <strong className="text-xs">{branch.path}</strong>
            <span className="mt-2 block text-[10px] leading-4 text-[var(--text-muted)]">{branch.trigger}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-center text-xs"><strong>Late/offline event:</strong> reopen the same playback-attempt key, recalculate the session, and emit a versioned upsert—never a duplicate fact.</div>
    </div>
  );
}

function SessionStateFlow() {
  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="rounded-lg border border-[#a9bacb] bg-[var(--bg-card)] px-4 py-3 text-sm leading-6">
        <strong>Identity, Timing, Playback, Experience, and Correctness are not separate services.</strong>
        <span className="ml-1 text-[var(--text-muted)]">They are five groups of fields inside one Flink state record for one playback attempt.</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
        <span className="rounded-lg bg-[var(--bg-card)] px-3 py-2">heartbeat / pause / seek</span><span>-&gt;</span>
        <span className="rounded-lg bg-[var(--bg-card)] px-3 py-2">find attempt p-42</span><span>-&gt;</span>
        <span className="rounded-lg border-2 border-[#91a9c2] bg-[var(--bg-card)] px-3 py-2">read + update its state</span><span>-&gt;</span>
        <span className="rounded-lg bg-[var(--bg-card)] px-3 py-2">apply session rules</span><span>-&gt;</span>
        <span className="rounded-lg bg-[var(--bg-card)] px-3 py-2">emit p-42 version N</span>
      </div>
    </div>
  );
}

function LateHeartbeatFlow() {
  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Late mobile heartbeat</p><h3 className="mt-1 text-base font-semibold">Put delayed playback back into the session where it happened</h3></div><span className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-[10px] font-semibold">Example allowance: 5 min</span></div>
      <div className="mt-4 grid gap-2 md:grid-cols-5 md:items-stretch">
        {[
          ["10:02", "Heartbeat created", "The phone records event_time=10:02 for playback attempt p-42."],
          ["Offline", "Stored on phone", "The tunnel has no signal, so the SDK keeps the event in its bounded local queue."],
          ["10:07", "Arrives at Flink", "The network returns five minutes later. Processing time is 10:07, but event time remains 10:02."],
          ["Place", "Use event time", "Flink puts the heartbeat into p-42's original session instead of treating it as new activity at 10:07."],
          ["Correct", "Upsert p-42 v3", "The session total is recalculated and the sink replaces p-42 version 2 with version 3."],
        ].map(([step, title, detail], index) => (
          <div key={title} className="relative flex min-h-[112px] flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
            <span className="text-[10px] font-bold text-[var(--text-faint)]">{step}</span><strong className="mt-2 text-xs">{title}</strong><span className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">{detail}</span>{index < 4 ? <span className="absolute -right-2.5 top-1/2 z-10 hidden rounded-full bg-[var(--bg-muted)] px-1 text-[var(--text-faint)] md:block">-&gt;</span> : null}
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 rounded-lg border border-dashed border-[#a9bacb] bg-[var(--bg-card)] px-4 py-3 text-xs md:grid-cols-[170px_1fr] md:items-center"><strong>Arrives after the live allowance?</strong><span className="text-[var(--text-muted)]">Send it to a late-event side output -&gt; retain it in Bronze -&gt; nightly batch updates the official session and daily totals. The event is delayed, not discarded.</span></div>
      <p className="mt-2 text-[10px] leading-4 text-[var(--text-faint)]">The five-minute allowance is an interview assumption. In production, choose it from measured mobile/TV delay distributions and the freshness target.</p>
    </div>
  );
}

function RuntimePlacement() {
  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Where the engine fits</p>
      <div className="mt-3 grid gap-2 lg:grid-cols-[160px_auto_1fr_auto_190px] lg:items-center">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center"><strong className="text-sm">Kafka</strong><p className="mt-1 text-xs text-[var(--text-muted)]">ordered event streams</p></div><span className="hidden lg:block">-&gt;</span>
        <div className="rounded-xl border-2 border-[#91a9c2] bg-[var(--bg-card)] p-4 text-center"><strong className="text-sm">Flink Runtime</strong><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">runs session, trending, fraud, QoE, counter, and feature jobs<br />holds keyed state · fires timers · checkpoints progress</p></div><span className="hidden lg:block">-&gt;</span>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center"><strong className="text-sm">Serving + Storage</strong><p className="mt-1 text-xs text-[var(--text-muted)]">Pinot · Redis · alerts · lake</p></div>
      </div>
      <div className="mt-3 rounded-lg border border-dashed border-[#a9bacb] bg-[var(--bg-card)] px-4 py-3 text-center text-xs leading-5"><strong>Operations surround this runtime.</strong><span className="ml-1 text-[var(--text-muted)]">They detect lag, preserve state during failure, control memory, support upgrades, rescale jobs, and verify that outputs still commit.</span></div>
    </div>
  );
}

function OutputTable() {
  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
      <div className="hidden grid-cols-[1.1fr_1fr_1fr] gap-3 px-3 pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--text-faint)] md:grid"><span>Output</span><span>Stable key</span><span>Update model</span></div>
      <div className="grid gap-2">{outputs.map((row) => <div key={row.output} className="relative grid min-h-[60px] gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-left md:grid-cols-[1.1fr_1fr_1fr] md:items-center md:gap-3"><strong className="text-xs">{row.output}</strong><code className="text-xs">{row.keyName}</code><span className="text-xs text-[var(--text-muted)]">{row.update}</span></div>)}</div>
      <SectionInspector
        id="output-contracts-inspector"
        label="output contract"
        items={outputs.map((row) => ({ id: row.output, title: row.output, summary: `${row.keyName} · ${row.update}`, detail: row.detail }))}
      />
    </div>
  );
}

export default function RealTimeStreamingTab() {
  return (
    <YouTubeFrame activeTab="real-time-streaming" sections={STREAMING_SECTIONS} previous={{ id: "ingestion-kafka", label: "Ingestion / Kafka" }} next={{ id: "data-modeling", label: "Data Modeling" }}>
      <InterviewPath
        accent="#526b82"
        title="Turn continuous activity into fast, correct, replaceable signals"
        summary="Explain the keyed event-time pipeline first. Then show how YouTube reconstructs playback, publishes low-latency products, and lets certified batch correct incomplete live history."
        steps={[
          { title: "Route", detail: "Kafka keeps each playback attempt ordered and replayable." },
          { title: "Reconstruct", detail: "Flink applies event time, state, timers, and deduplication." },
          { title: "Compute", detail: "Jobs produce sessions, counters, trends, QoE, fraud, and features." },
          { title: "Publish", detail: "Stable keys and versioned upserts make late updates safe." },
          { title: "Certify", detail: "Batch reconciles complete history and replaces provisional windows." },
        ]}
      />
      <Section id="streaming-jobs" number="01" title="Streaming Jobs">
        <CoreTakeaway>Split the stream by decision latency: dedicated jobs consume shared Kafka evidence and publish sessions, counters, trends, alerts, and online features with stable keys.</CoreTakeaway>
        <DepthPanel title="Explore the streaming jobs" summary="Inputs, six job responsibilities, live outputs, and YouTube examples.">
          <StreamingJobs />
        </DepthPanel>
      </Section>

      <Section id="session-state" number="02" title="Session State">
        <CoreTakeaway>Keep one state record per playback attempt. Playing heartbeats add bounded time; pause, buffer, seek, duplicate, close, and late-reopen rules update that same versioned session.</CoreTakeaway>
        <DepthPanel title="Explore playback state" summary="State machine, record fields, event rules, inactivity close, and late reopen.">
        <StateMachine />
        <SessionStateFlow />
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Inside one state record</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{stateGroups.map((group) => <ExplainCard key={group.title} title={group.title} sub={group.sub} detail={<Explanation what={group.what} how={group.how} example={`${group.example} Fields: ${group.fields.join(", ")}.`} />} />)}</div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Rules applied after each event</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{sessionRules.map((rule) => <ExplainCard key={rule.title} title={rule.title} sub={rule.sub} detail={<><strong className="mb-1 block">Rule</strong>{rule.detail}</>} />)}</div>
        <SectionInspector
          id="session-state-inspector"
          label="session concept"
          items={[
            ...stateBranches.map((branch) => ({ id: `branch-${branch.title}`, title: branch.title, summary: branch.path, detail: branch.detail })),
            ...stateGroups.map((group) => ({ id: `state-${group.title}`, title: group.title, summary: group.sub, detail: <Explanation what={group.what} how={group.how} example={`${group.example} Fields: ${group.fields.join(", ")}.`} /> })),
            ...sessionRules.map((rule) => ({ id: `rule-${rule.title}`, title: rule.title, summary: rule.sub, detail: rule.detail })),
          ]}
        />
        </DepthPanel>
      </Section>

      <Section id="time-windows" number="03" title="Time + Windows">
        <CoreTakeaway>Use event time for truth, watermarks for bounded waiting, and a late-data side path for evidence outside the live allowance. Never silently discard delayed mobile events.</CoreTakeaway>
        <DepthPanel title="Explore event time and windows" summary="Watermarks, window types, late heartbeats, recovery, and live-versus-certified truth.">
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{concepts.map((item) => <ExplainCard key={item.title} title={item.title} sub={item.sub} detail={<Explanation what={item.what} how={item.how} example={item.example} />} />)}</div>
        <LateHeartbeatFlow />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ExplainCard title="Exactly Once" sub="Checkpoint + idempotent upsert" detail={<Explanation what="Prevents a recovered job from changing one logical metric twice." how="Restore Flink state and Kafka offsets from the same checkpoint, then write outputs by stable key and version." example="After a crash, watch session p-42 is replayed but replaces the same versioned row rather than adding another session." />} />
          <ExplainCard title="Live vs Official" sub="Fast estimate, certified batch truth" detail={<Explanation what="Streaming serves seconds-old decisions while batch owns final deduplicated and fraud-filtered history." how="Publish live values as provisional and let the certified nightly output overwrite the historical window." example="Creator Studio shows a fast view estimate now; the next certified run publishes the official count after late-event and abuse reconciliation." />} />
        </div>
        <SectionInspector
          id="time-windows-inspector"
          label="time concept"
          items={[
            ...concepts.map((item) => ({ id: item.title, title: item.title, summary: item.sub, detail: <Explanation what={item.what} how={item.how} example={item.example} /> })),
            { id: "exactly-once", title: "Exactly Once", summary: "Checkpoint + idempotent upsert", detail: <Explanation what="Prevents a recovered job from changing one logical metric twice." how="Restore Flink state and Kafka offsets from the same checkpoint, then write outputs by stable key and version." example="After a crash, watch session p-42 is replayed but replaces the same versioned row rather than adding another session." /> },
            { id: "live-official", title: "Live vs Official", summary: "Fast estimate, certified batch result", detail: <Explanation what="Streaming serves seconds-old decisions while batch owns final deduplicated and fraud-filtered history." how="Publish live values as provisional and let the certified nightly output overwrite the historical window." example="Creator Studio shows a fast view estimate now; the next certified run publishes the official count after late-event and abuse reconciliation." /> },
          ]}
        />
        </DepthPanel>
      </Section>

      <Section id="output-contracts" number="04" title="Output Contracts">
        <CoreTakeaway>Every live product has a stable business key and update rule, so replay and late evidence replace the intended version instead of creating duplicate facts.</CoreTakeaway>
        <DepthPanel title="Explore output contracts" summary="Keys and write semantics for counters, sessions, trending, alerts, and features.">
          <OutputTable />
        </DepthPanel>
      </Section>

      <Section id="trending-design" number="05" title="Trending">
        <CoreTakeaway>Rank recent, broad, meaningful attention—not lifetime popularity—using sliding-window momentum, audience breadth, engagement quality, freshness, and abuse penalties.</CoreTakeaway>
        <DepthPanel title="Explore trending design" summary="Eligible evidence, feature groups, regional windows, trust penalties, and versioned ranking.">
        <div className="mt-5 rounded-xl border border-[#a9bacb] bg-[var(--bg-muted)] px-4 py-3 text-sm leading-6"><strong>Problem being solved:</strong><span className="ml-1 text-[var(--text-muted)]">find trustworthy videos gaining meaningful attention now for each region—not the videos with the largest lifetime totals.</span></div>
        <div className="mt-5 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4 lg:grid-cols-[190px_auto_1fr_auto_190px] lg:items-center">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center"><strong className="text-sm">Eligible Events</strong><p className="mt-2 text-xs text-[var(--text-muted)]">deduped views · watch depth<br />engagement · trust flags</p></div><span className="hidden lg:block">-&gt;</span>
          <div>
            <div className="mb-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-center text-xs"><strong>Sliding feature window:</strong><span className="ml-1 text-[var(--text-muted)]">last 10 minutes, refreshed every minute</span></div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{trendFeatures.map((feature) => <ExplainCard key={feature.title} title={feature.title} sub={feature.sub} detail={<Explanation what={feature.what} how={feature.how} example={feature.example} />} />)}</div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">{["Momentum", "Audience", "Quality", "Trust"].map((group) => <span key={group} className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 text-[10px] font-semibold">{group}: {trendFeatures.filter((feature) => feature.group === group).map((feature) => feature.title).join(" + ")}</span>)}</div>
          </div><span className="hidden lg:block">-&gt;</span>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center"><strong className="text-sm">Versioned Policy</strong><p className="mt-2 text-xs text-[var(--text-muted)]">combines auditable features<br />publishes top-N by region</p></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold"><span className="rounded-lg bg-[var(--bg-muted)] px-3 py-2">Fast growth</span><span>+</span><span className="rounded-lg bg-[var(--bg-muted)] px-3 py-2">broad audience</span><span>+</span><span className="rounded-lg bg-[var(--bg-muted)] px-3 py-2">strong engagement</span><span>-</span><span className="rounded-lg bg-[var(--bg-muted)] px-3 py-2">abuse</span><span>-&gt;</span><span className="rounded-lg border border-[#91a9c2] bg-[var(--bg-card)] px-3 py-2">regional trending candidates</span></div>
        <SectionInspector
          id="trending-inspector"
          label="trending signal"
          items={trendFeatures.map((feature) => ({ id: feature.title, title: feature.title, summary: `${feature.group} · ${feature.sub}`, detail: <Explanation what={feature.what} how={feature.how} example={feature.example} /> }))}
        />
        </DepthPanel>
      </Section>

      <Section id="engine-choice" number="06" title="Runtime + Operations">
        <CoreTakeaway>Use Flink where keyed state, event-time timers, and low latency matter; operate it through checkpoint health, lag, watermark, state, rescaling, and sink-commit signals.</CoreTakeaway>
        <DepthPanel title="Explore runtime and operations" summary="Flink placement, Spark trade-off, recovery controls, state lifecycle, and production monitoring.">
        <RuntimePlacement />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <ExplainCard title="Apache Flink" sub="Preferred · event-at-a-time" wide detail={<Explanation what="Provides low-latency event processing with rich keyed state, event-time timers, checkpoints, and side outputs." how="Use it for playback sessionization, fraud patterns, live counters, QoE alerts, and online features." example="A late p-42 heartbeat updates its keyed session immediately while checkpointed state protects recovery." />} />
          <ExplainCard title="Spark Structured Streaming" sub="Valid · micro-batch" wide detail={<Explanation what="Processes small batches continuously and fits teams already operating Spark." how="Choose it when existing skills and lake integrations matter more than the lowest per-event latency." example="A several-second micro-batch can serve dashboard aggregates when the latency target does not require event-at-a-time timers." />} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{operations.map(([title, detail]) => <ExplainCard key={title} title={title} sub="Production control" detail={<><strong className="mb-1 block">Explanation</strong>{detail}</>} />)}</div>
        <SectionInspector
          id="runtime-operations-inspector"
          label="runtime control"
          items={[
            { id: "flink", title: "Apache Flink", summary: "Preferred · event-at-a-time", detail: <Explanation what="Provides low-latency event processing with rich keyed state, event-time timers, checkpoints, and side outputs." how="Use it for playback sessionization, fraud patterns, live counters, QoE alerts, and online features." example="A late p-42 heartbeat updates its keyed session immediately while checkpointed state protects recovery." /> },
            { id: "spark", title: "Spark Structured Streaming", summary: "Alternative · micro-batch", detail: <Explanation what="Processes small batches continuously and fits teams already operating Spark." how="Choose it when existing skills and lake integrations matter more than the lowest per-event latency." example="A several-second micro-batch can serve dashboard aggregates when the latency target does not require event-at-a-time timers." /> },
            ...operations.map(([title, detail]) => ({ id: title, title, summary: "Production control", detail })),
          ]}
        />
        </DepthPanel>
      </Section>

      <Section id="streaming-answer" number="07" title="Interview Answer">
        <CoreTakeaway>Route by playback attempt, reconstruct with event time and state, publish versioned live products, and let certified batch replace incomplete history.</CoreTakeaway>
        <DepthPanel title="Open the complete interview answer" summary="Five-part speaking structure and the full answer to rehearse.">
        <div className="mt-5 rounded-xl border border-[#a9bacb] bg-[var(--bg-muted)] px-4 py-3 text-sm leading-6"><strong>Goal:</strong><span className="ml-1 text-[var(--text-muted)]">turn continuous playback and engagement events into seconds-old watch sessions, counters, trends, alerts, and recommendation features without letting retries or delayed phones corrupt the results.</span></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{[
          ["1. Bring together", "Send every event for one playback attempt to the same Flink worker."],
          ["2. Reconstruct", "Use event time and state to understand play, pause, buffering, seek, and completion."],
          ["3. Compute live", "Produce watch time, video velocity, QoE, fraud, and recommendation signals."],
          ["4. Correct safely", "Deduplicate retries and replace an older session version when delayed data arrives."],
          ["5. Certify later", "Let nightly batch reconcile complete history and publish the official numbers."],
        ].map(([title, detail]) => <div key={title} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3"><strong className="text-xs">{title}</strong><p className="mt-2 text-[11px] leading-5 text-[var(--text-muted)]">{detail}</p></div>)}</div>
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-5 text-sm font-medium leading-7 text-[var(--text)]"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Say this</span>The goal of the real-time layer is to turn raw YouTube activity into useful signals within seconds while keeping playback sessions correct. I route all heartbeat, pause, seek, buffer, and end events for the same playback attempt to one Flink worker so it can rebuild that attempt in order and maintain its state. Event time and watermarks place delayed mobile events into the session where they happened; duplicates are ignored by event ID, and accepted late changes replace the older session version. Separate streaming jobs produce live video counters, trending features, fraud signals, QoE alerts, and recent recommendation features. These outputs are provisional for fast product decisions, while the nightly batch pipeline publishes the final deduplicated and fraud-filtered truth.</div>
        </DepthPanel>
      </Section>
    </YouTubeFrame>
  );
}

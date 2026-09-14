export const DAY_SECONDS = 86_400;
export const HEARTBEAT_BYTES = 700;
export const OTHER_EVENT_BYTES = 900;
export const COMPRESSION_RATIO = 5;
export const HEADROOM = 0.4;
export const KAFKA_RETENTION_DAYS = 7;
export const KAFKA_RF = 3;

export type Workload = {
  dauMillions: number;
  sessionsPerViewer: number;
  watchSeconds: number;
  heartbeatSeconds: number;
  otherEvents: number;
  peakMultiplier: number;
};

export const BASELINE: Workload = {
  dauMillions: 1000,
  sessionsPerViewer: 5,
  watchSeconds: 600,
  heartbeatSeconds: 15,
  otherEvents: 100,
  peakMultiplier: 3,
};

export function calculateCapacity(workload: Workload) {
  const viewers = workload.dauMillions * 1_000_000;
  const heartbeatsPerSession = workload.watchSeconds / workload.heartbeatSeconds;
  const heartbeatsPerViewer = workload.sessionsPerViewer * heartbeatsPerSession;
  const eventsPerViewer = heartbeatsPerViewer + workload.otherEvents;
  const heartbeatEventsDay = viewers * heartbeatsPerViewer;
  const dailyEvents = viewers * eventsPerViewer;
  const averageEventsSecond = dailyEvents / DAY_SECONDS;
  const peakEventsSecond = averageEventsSecond * workload.peakMultiplier;
  const weightedBytes =
    (heartbeatsPerViewer * HEARTBEAT_BYTES + workload.otherEvents * OTHER_EVENT_BYTES) /
    eventsPerViewer;
  const averageIngressGBs = (averageEventsSecond * weightedBytes) / 1_000_000_000;
  const peakIngressGBs = (peakEventsSecond * weightedBytes) / 1_000_000_000;
  const rawTBday = (dailyEvents * weightedBytes) / 1_000_000_000_000;
  const bronzeTBday = rawTBday / COMPRESSION_RATIO;
  const heartbeatAverageSecond = heartbeatEventsDay / DAY_SECONDS;
  const heartbeatPeakSecond = heartbeatAverageSecond * workload.peakMultiplier;
  const collectorByEvents = Math.ceil(peakEventsSecond / 25_000);
  const collectorByBytes = Math.ceil((peakIngressGBs * 1000) / 25);
  const collectors = Math.ceil(Math.max(collectorByEvents, collectorByBytes) * (1 + HEADROOM));
  const heartbeatPartitionsBase = Math.ceil(Math.max(
    heartbeatPeakSecond / 50_000,
    (heartbeatPeakSecond * HEARTBEAT_BYTES) / 50_000_000,
    heartbeatPeakSecond / 35_000,
  ));
  const heartbeatPartitions = Math.ceil(heartbeatPartitionsBase * (1 + HEADROOM));
  const flinkTasks = Math.ceil(Math.ceil(heartbeatPeakSecond / 35_000) * (1 + HEADROOM));
  const taskManagers = Math.ceil(flinkTasks / 4);
  const batchExecutors = Math.ceil(((bronzeTBday * 1_000_000) / (4 * 3600) / 40) * (1 + HEADROOM));
  const kafkaLogicalPB = (averageIngressGBs * DAY_SECONDS * KAFKA_RETENTION_DAYS) / 1_000_000;
  const kafkaPhysicalPB = kafkaLogicalPB * KAFKA_RF;
  const bronzeHotPB = (bronzeTBday * 30) / 1000;
  const bronzeYearPB = (bronzeTBday * 365) / 1000;
  const dashboardEdgeQps = (20_000_000 * 8 / (8 * 3600)) * 3;
  const dashboardOriginQps = dashboardEdgeQps * 0.2;

  return {
    viewers,
    heartbeatsPerSession,
    heartbeatsPerViewer,
    eventsPerViewer,
    heartbeatEventsDay,
    dailyEvents,
    averageEventsSecond,
    peakEventsSecond,
    weightedBytes,
    averageIngressGBs,
    peakIngressGBs,
    rawTBday,
    bronzeTBday,
    heartbeatAverageSecond,
    heartbeatPeakSecond,
    collectorByEvents,
    collectorByBytes,
    collectors,
    heartbeatPartitionsBase,
    heartbeatPartitions,
    flinkTasks,
    taskManagers,
    batchExecutors,
    kafkaLogicalPB,
    kafkaPhysicalPB,
    bronzeHotPB,
    bronzeYearPB,
    dashboardEdgeQps,
    dashboardOriginQps,
  };
}

export function compact(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(value);
}

export function decimal(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

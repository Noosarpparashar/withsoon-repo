"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { UBER_MODELING_SECTIONS } from "./data";
import AnchorBrand from "./AnchorBrand";

const C = {
  card: "var(--bg-card)",
  card2: "var(--bg-muted)",
  border: "var(--border)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  blue: "#526b82",
  cyan: "#657e90",
  green: "#667a70",
  amber: "#796f64",
  red: "#62595d",
};
type TableDef = {
  id: string;
  kind: "fact" | "dimension";
  grain: string;
  pk: string;
  fks: string[];
  columns: string[];
  note: string;
  scd?: string;
};
type Positioned = { id: string; x: number; y: number };

const TABLES: Record<string, TableDef> = {
  fact_trip: {
    id: "fact_trip",
    kind: "fact",
    grain: "1 row per trip request, including cancelled and expired outcomes",
    pk: "trip_key",
    fks: [
      "rider_key",
      "driver_key",
      "city_key",
      "service_key",
      "vehicle_key",
      "pickup_geo_key",
      "dropoff_geo_key",
      "trip_status_key",
      "request_date_key",
    ],
    columns: [
      "trip_id",
      "requested_at",
      "matched_at",
      "started_at",
      "completed_at",
      "cancelled_at",
      "quoted_fare",
      "surge_multiplier",
      "final_fare",
      "request_to_match_sec",
      "trip_duration_sec",
      "gps_derived_distance_km",
      "is_reconciled",
      "record_version",
    ],
    note: "Accumulating snapshot. Milestones update as the trip progresses; fact_trip_event preserves immutable history.",
  },
  fact_trip_event: {
    id: "fact_trip_event",
    kind: "fact",
    grain: "1 lifecycle event per trip",
    pk: "event_id",
    fks: [
      "trip_key",
      "event_type_key",
      "producer_key",
      "event_date_key",
      "event_time_key",
      "city_key",
    ],
    columns: [
      "trip_id",
      "event_at",
      "ingested_at",
      "processed_at",
      "sequence_number",
      "previous_state",
      "new_state",
      "reason_code",
      "schema_version",
      "trace_id",
    ],
    note: "Immutable transaction fact and authoritative audit trail for rebuilding fact_trip.",
  },
  fact_location_ping: {
    id: "fact_location_ping",
    kind: "fact",
    grain: "1 accepted device-location observation",
    pk: "location_event_id",
    fks: [
      "driver_key",
      "trip_key",
      "event_date_key",
      "event_time_key",
      "city_key",
      "geo_key",
      "device_app_key",
    ],
    columns: [
      "h3_cell",
      "latitude_restricted",
      "longitude_restricted",
      "heading",
      "speed_kmh",
      "accuracy_m",
      "ingestion_delay_ms",
      "is_on_trip",
      "is_valid",
      "anomaly_reason",
      "road_segment_id",
    ],
    note: "No relational PK index at this scale. Partition by date/hour and region; cluster by H3 and driver.",
  },
  fact_ride_request: {
    id: "fact_ride_request",
    kind: "fact",
    grain: "1 rider request attempt",
    pk: "request_key",
    fks: [
      "rider_key",
      "city_key",
      "pickup_geo_key",
      "destination_geo_key",
      "service_key",
      "request_status_key",
      "request_date_key",
    ],
    columns: [
      "request_id",
      "eventual_trip_id",
      "quoted_eta_sec",
      "quoted_price",
      "available_driver_count",
      "search_to_request_ms",
      "outcome",
      "expiry_reason",
    ],
    note: "Preserves demand that never becomes a trip.",
  },
  fact_match_attempt: {
    id: "fact_match_attempt",
    kind: "fact",
    grain: "1 dispatch offer to 1 candidate driver",
    pk: "match_attempt_key",
    fks: [
      "request_key",
      "trip_key",
      "driver_key",
      "rider_key",
      "city_key",
      "geo_key",
      "event_time_key",
    ],
    columns: [
      "candidate_rank",
      "pickup_eta_sec",
      "offer_latency_ms",
      "outcome",
      "rejection_reason",
      "model_version",
    ],
    note: "Supports acceptance and dispatch-quality analysis without exploding fact_trip.",
  },
  fact_driver_supply_snapshot: {
    id: "fact_driver_supply_snapshot",
    kind: "fact",
    grain: "1 geo cell × service × snapshot interval",
    pk: "supply_snapshot_key",
    fks: [
      "date_key",
      "time_key",
      "city_key",
      "geo_key",
      "service_key",
      "availability_status_key",
    ],
    columns: [
      "supply_count",
      "online_seconds",
      "available_seconds",
      "on_trip_seconds",
      "idle_seconds",
      "accepted_offers",
      "utilization",
    ],
    note: "Periodic snapshot; publish 1/5/15-minute aggregates instead of scanning per-driver state.",
  },
  fact_fare_quote: {
    id: "fact_fare_quote",
    kind: "fact",
    grain: "1 fare quote per rider and service option",
    pk: "fare_quote_key",
    fks: [
      "rider_key",
      "city_key",
      "pickup_geo_key",
      "dropoff_geo_key",
      "service_key",
      "date_key",
      "time_key",
    ],
    columns: [
      "quote_id",
      "estimated_fare_low",
      "estimated_fare_high",
      "eta_sec",
      "surge_multiplier",
      "supply_demand_ratio",
      "pricing_version",
      "is_selected",
      "quote_to_request_ms",
    ],
    note: "A rider may receive multiple service-option quotes before one request.",
  },
  fact_payment_transaction: {
    id: "fact_payment_transaction",
    kind: "fact",
    grain: "1 payment-ledger movement",
    pk: "payment_transaction_key",
    fks: [
      "trip_key",
      "rider_key",
      "driver_key",
      "city_key",
      "payment_method_key",
      "currency_key",
      "transaction_status_key",
      "date_key",
    ],
    columns: [
      "transaction_id",
      "parent_transaction_id",
      "transaction_type",
      "gross_amount",
      "fee_amount",
      "tax_amount",
      "net_amount",
      "fx_rate",
      "processor_reference",
      "idempotency_key",
      "settlement_date_key",
      "reconciliation_status",
    ],
    note: "Authorization, capture, refund, chargeback, tip, and payout remain separate additive movements.",
  },
  fact_driver_earning: {
    id: "fact_driver_earning",
    kind: "fact",
    grain: "1 earning component credited or debited to a driver",
    pk: "driver_earning_key",
    fks: [
      "driver_key",
      "trip_key",
      "city_key",
      "currency_key",
      "earning_type_key",
      "date_key",
    ],
    columns: [
      "earning_id",
      "base_share",
      "time_earning",
      "distance_earning",
      "surge_earning",
      "tip_amount",
      "incentive_amount",
      "adjustment_amount",
      "tax_withheld",
      "platform_commission",
    ],
    note: "Separates driver economics from rider payment flows.",
  },
  fact_rating: {
    id: "fact_rating",
    kind: "fact",
    grain: "1 rating submission",
    pk: "rating_key",
    fks: ["trip_key", "rider_key", "driver_key", "city_key", "date_key"],
    columns: [
      "reviewer_role",
      "subject_role",
      "rating_value",
      "rating_tags",
      "submitted_at",
    ],
    note: "Reviewer and subject roles prevent ambiguous rider-versus-driver ratings.",
  },
  fact_promotion_redemption: {
    id: "fact_promotion_redemption",
    kind: "fact",
    grain: "1 applied promotion component per trip",
    pk: "redemption_key",
    fks: ["rider_key", "trip_key", "city_key", "promotion_key", "date_key"],
    columns: [
      "redemption_id",
      "discount_amount",
      "funding_owner",
      "eligibility_result",
      "applied_at",
    ],
    note: "Separate rows support stacked promotions and split funding.",
  },
  fact_driver_incentive: {
    id: "fact_driver_incentive",
    kind: "fact",
    grain: "1 driver × incentive program × period",
    pk: "driver_incentive_key",
    fks: ["driver_key", "city_key", "incentive_program_key", "date_key"],
    columns: [
      "target_value",
      "progress_value",
      "earned_amount",
      "status",
      "period_start",
      "period_end",
    ],
    note: "Optionally pair with an immutable incentive-event fact for progress history.",
  },
  fact_safety_incident: {
    id: "fact_safety_incident",
    kind: "fact",
    grain: "1 reported safety incident",
    pk: "safety_incident_key",
    fks: [
      "trip_key",
      "rider_key",
      "driver_key",
      "city_key",
      "incident_type_key",
      "date_key",
      "time_key",
    ],
    columns: [
      "incident_id",
      "severity",
      "reported_at",
      "resolution_status",
      "regulatory_flag",
      "secured_extension_key",
    ],
    note: "Sensitive attributes belong in a secured extension table.",
  },
  fact_support_case: {
    id: "fact_support_case",
    kind: "fact",
    grain: "1 support case",
    pk: "support_case_key",
    fks: [
      "trip_key",
      "rider_key",
      "driver_key",
      "city_key",
      "channel_key",
      "date_key",
    ],
    columns: [
      "case_id",
      "issue_type",
      "opened_at",
      "resolved_at",
      "resolution_code",
      "contact_count",
      "satisfaction_score",
    ],
    note: "Add fact_support_interaction when message or call grain is required.",
  },
  fact_experiment_exposure: {
    id: "fact_experiment_exposure",
    kind: "fact",
    grain: "1 verified experiment exposure",
    pk: "exposure_key",
    fks: [
      "experiment_key",
      "variant_key",
      "rider_key",
      "driver_key",
      "city_key",
      "geo_key",
      "trip_key",
      "date_key",
      "time_key",
    ],
    columns: [
      "exposure_id",
      "assignment_unit",
      "interference_cluster",
      "exposed_at",
      "producer_event_id",
    ],
    note: "Exposure is distinct from assignment and should be verified from delivered treatment.",
  },
  dim_date: {
    id: "dim_date",
    kind: "dimension",
    grain: "1 calendar date",
    pk: "date_key",
    fks: [],
    columns: [
      "full_date",
      "iso_week",
      "month",
      "quarter",
      "fiscal_period",
      "is_holiday",
      "local_city_date",
    ],
    note: "Role-playing dimension for request, match, pickup, dropoff, settlement, and completion dates.",
    scd: "Static",
  },
  dim_time: {
    id: "dim_time",
    kind: "dimension",
    grain: "1 second or minute of day",
    pk: "time_key",
    fks: [],
    columns: ["hour", "minute", "second", "daypart", "is_rush_hour"],
    note: "Supports city-local operational reporting.",
    scd: "Static",
  },
  dim_rider: {
    id: "dim_rider",
    kind: "dimension",
    grain: "1 historical rider profile version",
    pk: "rider_key",
    fks: [],
    columns: [
      "rider_id_token",
      "effective_from",
      "effective_to",
      "is_current",
      "segment",
      "risk_band",
      "loyalty_state",
      "signup_cohort",
      "acquisition_channel",
    ],
    note: "Never expose direct rider PII in analytics marts.",
    scd: "SCD2",
  },
  dim_driver: {
    id: "dim_driver",
    kind: "dimension",
    grain: "1 historical driver profile version",
    pk: "driver_key",
    fks: ["home_city_key"],
    columns: [
      "driver_id_token",
      "effective_from",
      "effective_to",
      "is_current",
      "status",
      "tier",
      "onboarding_cohort",
      "risk_band",
      "fleet_key",
    ],
    note: "Resolve the driver version using event time, not ingestion time.",
    scd: "SCD2",
  },
  dim_vehicle: {
    id: "dim_vehicle",
    kind: "dimension",
    grain: "1 historical vehicle version",
    pk: "vehicle_key",
    fks: [],
    columns: [
      "vehicle_id_token",
      "effective_from",
      "effective_to",
      "is_current",
      "make",
      "model",
      "year",
      "capacity",
      "is_accessible",
      "is_ev",
      "service_eligibility",
    ],
    note: "A driver-to-vehicle bridge handles many vehicles over time.",
    scd: "SCD2",
  },
  dim_service_type: {
    id: "dim_service_type",
    kind: "dimension",
    grain: "1 service product definition",
    pk: "service_key",
    fks: [],
    columns: [
      "service_code",
      "category",
      "capacity",
      "is_pooled",
      "is_reserved",
      "effective_from",
      "effective_to",
    ],
    note: "Avoid hardcoding Uber product names in facts.",
    scd: "SCD2",
  },
  dim_city: {
    id: "dim_city",
    kind: "dimension",
    grain: "1 operating city",
    pk: "city_key",
    fks: ["currency_key"],
    columns: [
      "city_id",
      "city_name",
      "country",
      "region",
      "timezone",
      "regulatory_market",
      "operating_status",
    ],
    note: "Timezone drives local dates and daily publish deadlines.",
    scd: "SCD1/2",
  },
  dim_geo: {
    id: "dim_geo",
    kind: "dimension",
    grain: "1 historical H3/S2 cell mapping",
    pk: "geo_key",
    fks: ["city_key"],
    columns: [
      "h3_cell",
      "resolution",
      "parent_h3",
      "zone_id",
      "airport_id",
      "geofence_id",
      "effective_from",
      "effective_to",
      "is_current",
    ],
    note: "Operational zones change, so historical mappings may require SCD2.",
    scd: "SCD2",
  },
  dim_trip_status: {
    id: "dim_trip_status",
    kind: "dimension",
    grain: "1 canonical trip status",
    pk: "trip_status_key",
    fks: [],
    columns: [
      "status_code",
      "status_name",
      "funnel_group",
      "is_terminal",
      "is_success",
    ],
    note: "Standardizes producer-specific status names.",
    scd: "Static",
  },
  dim_event_type: {
    id: "dim_event_type",
    kind: "dimension",
    grain: "1 canonical event type",
    pk: "event_type_key",
    fks: [],
    columns: [
      "event_name",
      "producer",
      "business_domain",
      "criticality",
      "schema_family",
    ],
    note: "Provides a governed event taxonomy.",
    scd: "SCD1",
  },
  dim_payment_method: {
    id: "dim_payment_method",
    kind: "dimension",
    grain: "1 tokenized payment-method definition",
    pk: "payment_method_key",
    fks: [],
    columns: ["method_class", "processor", "token_type", "wallet_type"],
    note: "Never store raw card data.",
    scd: "SCD1",
  },
  dim_currency: {
    id: "dim_currency",
    kind: "dimension",
    grain: "1 ISO currency",
    pk: "currency_key",
    fks: [],
    columns: ["iso_code", "currency_name", "decimal_precision"],
    note: "Dated FX rates belong in a bridge or fact, not this static dimension.",
    scd: "Static",
  },
  dim_promotion: {
    id: "dim_promotion",
    kind: "dimension",
    grain: "1 promotion definition",
    pk: "promotion_key",
    fks: [],
    columns: [
      "promotion_code",
      "campaign",
      "mechanic",
      "eligibility_rule",
      "funding_owner",
      "valid_from",
      "valid_to",
    ],
    note: "Supports promotion stacking through bridge_trip_promotion.",
    scd: "SCD2",
  },
  dim_incentive_program: {
    id: "dim_incentive_program",
    kind: "dimension",
    grain: "1 driver incentive definition",
    pk: "incentive_program_key",
    fks: [],
    columns: [
      "program_code",
      "incentive_type",
      "target_definition",
      "funding_owner",
      "valid_from",
      "valid_to",
    ],
    note: "Separates incentive policy from driver progress.",
    scd: "SCD2",
  },
  dim_experiment: {
    id: "dim_experiment",
    kind: "dimension",
    grain: "1 experiment definition",
    pk: "experiment_key",
    fks: [],
    columns: [
      "experiment_id",
      "hypothesis",
      "owner",
      "assignment_unit",
      "start_at",
      "end_at",
    ],
    note: "Pair with dim_variant and verified exposure facts.",
    scd: "SCD1",
  },
  dim_variant: {
    id: "dim_variant",
    kind: "dimension",
    grain: "1 treatment variant",
    pk: "variant_key",
    fks: ["experiment_key"],
    columns: ["variant_id", "variant_name", "treatment_metadata"],
    note: "Variant metadata remains governed and reproducible.",
    scd: "SCD1",
  },
  dim_device_app: {
    id: "dim_device_app",
    kind: "dimension",
    grain: "1 app/device release combination",
    pk: "device_app_key",
    fks: [],
    columns: [
      "os",
      "app_version",
      "sdk_version",
      "device_class",
      "release_channel",
    ],
    note: "Useful for client-release and data-quality incidents.",
    scd: "SCD1",
  },
  dim_channel: {
    id: "dim_channel",
    kind: "dimension",
    grain: "1 interaction channel",
    pk: "channel_key",
    fks: [],
    columns: ["channel_code", "channel_name", "channel_group"],
    note: "App, web, call centre, API, and support channels.",
    scd: "Static",
  },
  dim_safety_incident_type: {
    id: "dim_safety_incident_type",
    kind: "dimension",
    grain: "1 controlled incident classification",
    pk: "incident_type_key",
    fks: [],
    columns: [
      "incident_code",
      "category",
      "severity_band",
      "regulatory_category",
    ],
    note: "Controlled taxonomy for restricted safety reporting.",
    scd: "SCD1",
  },
};

const VIEWS: { id: string; label: string; nodes: Positioned[] }[] = [
  {
    id: "trip",
    label: "Trip + marketplace",
    nodes: [
      { id: "dim_date", x: 20, y: 20 },
      { id: "dim_time", x: 280, y: 20 },
      { id: "dim_rider", x: 540, y: 20 },
      { id: "dim_driver", x: 800, y: 20 },
      { id: "dim_city", x: 1060, y: 20 },
      { id: "fact_ride_request", x: 20, y: 270 },
      { id: "fact_match_attempt", x: 280, y: 270 },
      { id: "fact_trip", x: 540, y: 245 },
      { id: "fact_trip_event", x: 800, y: 270 },
      { id: "fact_location_ping", x: 1060, y: 270 },
      { id: "dim_geo", x: 20, y: 585 },
      { id: "dim_vehicle", x: 280, y: 585 },
      { id: "dim_service_type", x: 540, y: 585 },
      { id: "dim_trip_status", x: 800, y: 585 },
      { id: "dim_event_type", x: 1060, y: 585 },
    ],
  },
  {
    id: "finance",
    label: "Finance + driver",
    nodes: [
      { id: "dim_date", x: 20, y: 20 },
      { id: "dim_driver", x: 280, y: 20 },
      { id: "dim_city", x: 540, y: 20 },
      { id: "dim_currency", x: 800, y: 20 },
      { id: "dim_payment_method", x: 1060, y: 20 },
      { id: "fact_fare_quote", x: 20, y: 270 },
      { id: "fact_payment_transaction", x: 280, y: 270 },
      { id: "fact_driver_earning", x: 540, y: 270 },
      { id: "fact_driver_supply_snapshot", x: 800, y: 270 },
      { id: "fact_driver_incentive", x: 1060, y: 270 },
      { id: "dim_rider", x: 20, y: 585 },
      { id: "dim_service_type", x: 280, y: 585 },
      { id: "dim_geo", x: 540, y: 585 },
      { id: "dim_vehicle", x: 800, y: 585 },
      { id: "dim_incentive_program", x: 1060, y: 585 },
    ],
  },
  {
    id: "growth",
    label: "Safety + growth",
    nodes: [
      { id: "dim_date", x: 20, y: 20 },
      { id: "dim_rider", x: 280, y: 20 },
      { id: "dim_driver", x: 540, y: 20 },
      { id: "dim_city", x: 800, y: 20 },
      { id: "dim_channel", x: 1060, y: 20 },
      { id: "fact_rating", x: 20, y: 270 },
      { id: "fact_promotion_redemption", x: 280, y: 270 },
      { id: "fact_safety_incident", x: 540, y: 270 },
      { id: "fact_support_case", x: 800, y: 270 },
      { id: "fact_experiment_exposure", x: 1060, y: 270 },
      { id: "dim_promotion", x: 20, y: 585 },
      { id: "dim_safety_incident_type", x: 280, y: 585 },
      { id: "dim_experiment", x: 540, y: 585 },
      { id: "dim_variant", x: 800, y: 585 },
      { id: "dim_device_app", x: 1060, y: 585 },
    ],
  },
];

const VIEW_COLORS: Record<string, string> = {
  trip: C.blue,
  finance: C.green,
  growth: C.cyan,
};

function Anchors({
  active,
  go,
  table,
}: {
  active: string;
  go: (id: string) => void;
  table: TableDef;
}) {
  return (
    <aside className="hidden w-[420px] shrink-0 xl:block">
      <div
        data-testid="anchor-rail"
        className="fixed bottom-4 top-[140px] z-30 flex w-[400px] flex-col overflow-hidden pr-1"
        style={{ left: "max(16px, calc((100vw - 1600px) / 2 + 16px))" }}
      >
        <div className="shrink-0">
          <AnchorBrand />
          <p
            className="mb-3 text-[10px] font-bold uppercase tracking-[.2em]"
            style={{ color: C.muted }}
          >
            Page anchors
          </p>
          <div className="w-[260px] space-y-2">
            {UBER_MODELING_SECTIONS.map((s, i) => {
              const on = s.id === active;
              return (
                <button
                  key={s.id}
                  data-testid={`stage-nav-${s.id}`}
                  aria-current={on ? "location" : undefined}
                  onClick={() => go(s.id)}
                  className="relative flex min-h-[54px] w-full items-center gap-3 overflow-hidden rounded-md border px-3 py-2 text-left text-xs font-semibold leading-4"
                  style={{
                    borderColor: on ? C.blue : C.border,
                    background: on
                      ? "color-mix(in srgb, #526b82 13%, var(--bg-card))"
                      : C.card,
                    color: on ? C.text : C.muted,
                  }}
                >
                  {on ? (
                    <span
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ background: C.blue }}
                    />
                  ) : null}
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: on ? C.blue : C.card2,
                      color: on ? "white" : C.muted,
                    }}
                  >
                    {i + 1}
                  </span>
                  {s.title}
                </button>
              );
            })}
          </div>
        </div>
        <div
          data-testid="model-explanation-slot"
          className="mt-4 min-h-0 flex-1 overflow-hidden pr-1"
        >
          <TableInspector table={table} />
        </div>
      </div>
    </aside>
  );
}
function Section({
  id,
  title,
  sub,
  color,
  children,
}: {
  id: string;
  title: string;
  sub?: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[24px] border p-5 md:p-6"
      style={{
        borderColor: `${color}38`,
        background: C.card,
        scrollMarginTop: 140,
      }}
    >
      <h2 className="text-2xl font-semibold">{title}</h2>
      {sub ? (
        <p className="mt-2 text-sm leading-6" style={{ color: C.muted }}>
          {sub}
        </p>
      ) : null}
      {children}
    </section>
  );
}

function ErdExplorer({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [viewId, setViewId] = useState("trip");
  const view = VIEWS.find((v) => v.id === viewId) ?? VIEWS[0];
  const viewColor = VIEW_COLORS[view.id];
  const layoutNodes = view.nodes.map((node, index) => ({
    ...node,
    x: index < 12 ? 20 + (index % 4) * 260 : 150 + (index - 12) * 260,
    y: 20 + Math.floor(index / 4) * 220,
  }));
  const edges = useMemo(() => {
    const visible = new Set(layoutNodes.map((n) => n.id));
    const dimensionFor = (fk: string) =>
      fk.endsWith("_date_key") || fk === "date_key"
        ? "dim_date"
        : fk.endsWith("_time_key") || fk === "time_key"
          ? "dim_time"
          : fk.includes("geo_key")
            ? "dim_geo"
            : `dim_${fk.replace(/_key$/, "")}`;
    return layoutNodes.flatMap((node) =>
      TABLES[node.id].fks
        .map((fk) => dimensionFor(fk))
        .filter((dimId) => visible.has(dimId))
        .map((dimId) => ({ from: node.id, to: dimId })),
    );
  }, [layoutNodes]);
  const positions = Object.fromEntries(layoutNodes.map((n) => [n.id, n]));
  return (
    <div
      className="mt-5 overflow-hidden rounded-2xl border"
      style={{ borderColor: C.border, background: C.card2 }}
    >
      <div className="border-b p-3" style={{ borderColor: C.border }}>
        <div className="grid gap-2 sm:grid-cols-3">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setViewId(v.id);
                const firstFact = v.nodes.find(
                  (n) => TABLES[n.id].kind === "fact",
                );
                if (firstFact) onSelect(firstFact.id);
              }}
              className="rounded-md border px-3 py-2 text-xs font-medium"
              style={{
                borderColor: VIEW_COLORS[v.id],
                borderLeftWidth: viewId === v.id ? 4 : 1,
                background:
                  viewId === v.id
                    ? `${VIEW_COLORS[v.id]}2e`
                    : `${VIEW_COLORS[v.id]}12`,
                color: C.text,
                opacity: viewId === v.id ? 1 : 0.82,
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div
          data-testid="model-erd-canvas"
          className="overflow-hidden border-b p-2 xl:border-b-0 xl:border-r"
          style={{ borderColor: C.border, background: `${viewColor}08` }}
        >
          <div className="mx-auto w-full">
            <svg
              data-testid="uber-model-erd"
              data-view={view.id}
              data-accent={viewColor}
              viewBox="0 0 1040 810"
              className="block h-auto w-full"
              role="img"
              aria-label={`Uber ${view.label} entity relationship diagram`}
            >
              <defs>
                <marker
                  id="erd-arrow"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <path d="M0 0L7 3.5L0 7Z" fill="#667386" />
                </marker>
              </defs>
              {edges.map((edge, edgeIndex) => {
                const a = positions[edge.from],
                  b = positions[edge.to];
                if (!a || !b) return null;
                const ax = a.x + 110,
                  ay = a.y + 65,
                  bx = b.x + 110,
                  by = b.y + 65,
                  highlighted =
                    edge.from === selectedId || edge.to === selectedId;
                return (
                  <path
                    key={`${edge.from}-${edge.to}-${edgeIndex}`}
                    d={`M${ax} ${ay} C${ax} ${(ay + by) / 2},${bx} ${(ay + by) / 2},${bx} ${by}`}
                    fill="none"
                    stroke={highlighted ? viewColor : "#667386"}
                    strokeWidth={highlighted ? 2 : 1}
                    strokeDasharray="5 5"
                    markerEnd="url(#erd-arrow)"
                    opacity={highlighted ? 0.95 : 0.16}
                  />
                );
              })}
              {layoutNodes.map((pos) => {
                const table = TABLES[pos.id],
                  on = selectedId === pos.id,
                  color = table.kind === "fact" ? viewColor : "#94a3b8";
                return (
                  <g
                    key={pos.id}
                    transform={`translate(${pos.x},${pos.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${table.id}, ${table.kind}`}
                    onMouseEnter={() => onSelect(pos.id)}
                    onFocus={() => onSelect(pos.id)}
                    onClick={() => onSelect(pos.id)}
                    className="cursor-pointer outline-none"
                  >
                    <rect
                      width="220"
                      height={table.kind === "fact" ? 170 : 130}
                      rx="8"
                      fill={on ? `${color}22` : "var(--bg-card)"}
                      stroke={color}
                      strokeWidth={on ? 3 : 1.4}
                    />
                    <rect
                      width="5"
                      height={table.kind === "fact" ? 170 : 130}
                      rx="2"
                      fill={color}
                    />
                    <text
                      x="16"
                      y="22"
                      fill={color}
                      fontSize="11"
                      fontWeight="800"
                    >
                      {table.kind === "fact" ? "FACT" : "DIMENSION"}
                    </text>
                    <text
                      x="16"
                      y="48"
                      fill="var(--text)"
                      fontSize={table.id.length > 24 ? "12" : "15"}
                      fontWeight="700"
                    >
                      {table.id}
                    </text>
                    <text
                      x="16"
                      y="76"
                      fill={color}
                      fontSize={table.pk.length > 23 ? "10" : "12"}
                      fontWeight="700"
                    >
                      PK {table.pk}
                    </text>
                    {table.fks.slice(0, 4).map((fk, i) => (
                      <text
                        key={fk}
                        x="16"
                        y={99 + i * 18}
                        fill="#aeb8c7"
                        fontSize={fk.length > 24 ? "9.5" : "11"}
                        fontWeight="600"
                      >
                        FK {fk}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const FACT_SUMMARY = Object.values(TABLES).filter((t) => t.kind === "fact");
const DIM_SUMMARY = Object.values(TABLES).filter((t) => t.kind === "dimension");

function TableCatalog({
  tables,
  color,
  selectedId,
  onSelect,
}: {
  tables: TableDef[];
  color: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="mt-5 overflow-hidden rounded-2xl border"
      style={{ borderColor: C.border, background: C.card }}
    >
      <div className="grid content-start gap-px sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => {
          const active = table.id === selectedId;
          return (
            <button
              key={table.id}
              aria-label={`Inspect ${table.id}`}
              onMouseEnter={() => onSelect(table.id)}
              onFocus={() => onSelect(table.id)}
              onClick={() => onSelect(table.id)}
              className="min-h-[92px] border-b border-r p-4 text-left"
              style={{
                borderColor: C.border,
                background: active ? `${color}16` : C.card,
                boxShadow: active ? `inset 3px 0 0 ${color}` : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <code className="text-sm font-semibold" style={{ color }}>
                  {table.id}
                </code>
                <span
                  className="shrink-0 text-[10px] font-bold uppercase"
                  style={{ color: table.scd ? C.amber : color }}
                >
                  {table.scd ?? "Fact"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5" style={{ color: C.muted }}>
                {table.grain}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TableInspector({
  table,
  testId = "model-table-inspector",
}: {
  table: TableDef;
  testId?: string;
}) {
  const color = table.kind === "fact" ? C.blue : C.cyan;
  return (
    <aside
      data-testid={testId}
      className="rounded-2xl border p-3"
      style={{
        borderColor: `${color}88`,
        background: `color-mix(in srgb, ${color} 11%, var(--bg-card))`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="flex items-center gap-2 text-[10px] font-bold uppercase"
          style={{ color }}
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold normal-case"
            style={{ borderColor: color, background: `${color}20` }}
          >
            i
          </span>
          {table.kind} explanation
        </span>
        {table.scd ? (
          <span className="text-xs font-semibold" style={{ color: C.amber }}>
            {table.scd}
          </span>
        ) : null}
      </div>
      <h3 className="mt-1 break-all text-lg font-semibold">{table.id}</h3>
      <p className="mt-1.5 text-xs leading-5" style={{ color: C.muted }}>
        <strong style={{ color: C.text }}>Grain:</strong> {table.grain}
      </p>
      <div
        className="mt-2.5 grid grid-cols-2 gap-3 border-t pt-2.5"
        style={{ borderColor: C.border }}
      >
        <div className="min-w-0">
          <p
            className="text-[10px] font-bold uppercase"
            style={{ color: C.muted }}
          >
            Keys
          </p>
          <code
            className="mt-2 block break-all text-[10px] font-semibold"
            style={{ color }}
          >
            PK · {table.pk}
          </code>
          {table.fks.length ? (
            <div className="mt-1 grid grid-cols-1 gap-x-2 [@media(max-height:800px)]:grid-cols-2">
              {table.fks.map((fk) => (
                <code
                  key={fk}
                  className="mt-1 block min-w-0 break-all text-[10px] [@media(max-height:800px)]:text-[9px]"
                >
                  FK · {fk}
                </code>
              ))}
            </div>
          ) : (
            <span className="mt-1 block text-xs" style={{ color: C.muted }}>
              No foreign keys
            </span>
          )}
        </div>
        <div
          className="min-w-0 border-l pl-3"
          style={{ borderColor: C.border }}
        >
          <p
            className="text-[10px] font-bold uppercase"
            style={{ color: C.muted }}
          >
            Important columns
          </p>
          <code
            className="mt-2 block break-words text-[9px] leading-4"
            style={{ color: C.text }}
          >
            {table.columns.join(" · ")}
          </code>
        </div>
      </div>
      <p
        className="mt-2.5 border-t pt-2.5 text-[11px] leading-4"
        style={{ borderColor: C.border, color: C.muted }}
      >
        {table.note}
      </p>
    </aside>
  );
}

export default function DataModelingTab() {
  const [active, setActive] = useState<string>(UBER_MODELING_SECTIONS[0].id);
  const [selectedTableId, setSelectedTableId] = useState("fact_trip");
  const lock = useRef<number | null>(null);
  useEffect(() => {
    const sync = () => {
      if (lock.current) return;
      const xs = UBER_MODELING_SECTIONS.map((s) => {
        const n = document.getElementById(s.id);
        return n ? { id: s.id, top: n.getBoundingClientRect().top } : null;
      }).filter((x): x is NonNullable<typeof x> => x !== null);
      if (xs.length)
        setActive(
          xs.reduce((a, b) =>
            Math.abs(b.top - 180) < Math.abs(a.top - 180) ? b : a,
          ).id,
        );
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    return () => removeEventListener("scroll", sync);
  }, []);
  const go = (id: string) => {
    const n = document.getElementById(id);
    if (!n) return;
    if (lock.current) clearTimeout(lock.current);
    history.replaceState(null, "", `/data-engineering/uber/data-modeling#${id}`);
    setActive(id);
    scrollTo({
      top: n.getBoundingClientRect().top + scrollY - 140,
      behavior: "smooth",
    });
    lock.current = window.setTimeout(() => {
      setActive(id);
      lock.current = null;
    }, 700);
  };
  return (
    <>
      <Anchors
        active={active}
        go={go}
        table={TABLES[selectedTableId] ?? TABLES.fact_trip}
      />
      <div className="xl:pl-[420px]">
        <div className="mb-5 xl:hidden">
          <TableInspector
            table={TABLES[selectedTableId] ?? TABLES.fact_trip}
            testId="mobile-model-table-inspector"
          />
        </div>
        <div className="space-y-5">
          <Section
            id="model-erd"
            title="Uber fact constellation ERD"
            sub="Explore every atomic fact and conformed dimension by domain. Dashed relationships point from fact foreign keys to shared dimensions."
            color={C.blue}
          >
            <ErdExplorer
              selectedId={selectedTableId}
              onSelect={setSelectedTableId}
            />
          </Section>
          <Section
            id="model-facts"
            title="Fact grains"
            sub="A fact table exists only when the business process has a distinct grain."
            color={C.green}
          >
            <TableCatalog
              tables={FACT_SUMMARY}
              color={C.blue}
              selectedId={selectedTableId}
              onSelect={setSelectedTableId}
            />
          </Section>
          <Section
            id="model-dimensions"
            title="Conformed dimensions"
            sub="The same historical definitions support marketplace, finance, safety, support, and experimentation facts."
            color={C.cyan}
          >
            <TableCatalog
              tables={DIM_SUMMARY}
              color={C.cyan}
              selectedId={selectedTableId}
              onSelect={setSelectedTableId}
            />
          </Section>
          <nav
            aria-label="Chapter navigation"
            className="flex items-center justify-between border-t pt-4"
            style={{ borderColor: C.border }}
          >
            <Link
              href="/data-engineering/uber/batch-pipelines"
              className="rounded-md border px-4 py-3 text-sm font-semibold"
              style={{ borderColor: C.border, background: C.card }}
            >
              ← Batch + Lakehouse
            </Link>
            <Link
              href="/data-engineering/uber/governance-quality"
              className="rounded-md border px-4 py-3 text-right text-sm font-semibold"
              style={{ borderColor: C.border, background: C.card }}
            >
              <small
                className="block text-[9px] uppercase tracking-[.16em]"
                style={{ color: C.muted }}
              >
                Next chapter
              </small>
              <span className="mt-1 block">Failures + Data Quality →</span>
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, type ReactNode } from "react";

function SourceSection({ id, eyebrow, title, subtitle, children }: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-40 rounded-[26px] border border-[#d8d8d8] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.055)] sm:p-7">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[#111]" aria-hidden />
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-[#111]">{eyebrow}</p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-[-.04em] text-[#111] sm:text-[28px]">{title}</h2>
          <p className="mt-2 max-w-[780px] text-sm leading-6 text-[#5f5f5f]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const SOURCES = [
  {
    code: "ORDER", name: "Checkout + orders", volume: "High + bursty", priority: "Critical",
    events: "checkout_started · order_placed · item_cancelled · order_closed",
    role: "Authoritative producer for order acceptance and lifecycle state. Checkout validates the offer and the order service commits headers, items, discounts, taxes, status, and fulfillment intent before publishing.",
    example: "One checkout creates order ORD-123 with three order items from two sellers. A later cancellation affects only one item, so item and order transitions remain separate facts.",
    grain: "One immutable lifecycle transition per order or order item. Current order state is a projection, not a replacement for event history.",
    capture: "Transactional outbox for business events plus table CDC for audit, recovery, and legacy fields. Publish only after the owned state commits.",
    contract: "Key order topics by order_id; carry order_item_id where applicable, source_sequence_number, amounts in minor units, currency, promotion version, and status reason.",
    consumers: "Customer service, order health, seller operations, fulfillment, finance, demand, conversion, and certified order-item facts.",
    authority: "Only the order domain declares placed, cancelled, or closed. A client purchase event is behavioral evidence, not an accepted order.",
  },
  {
    code: "PAY", name: "Payments + ledger", volume: "Medium", priority: "Restricted",
    events: "authorized · captured · declined · refunded · chargeback · settled",
    role: "Owns payment attempts and monetary state across authorization, capture, settlement, fees, refunds, and chargebacks. Several payment transactions may belong to one order.",
    example: "₹1,299.00 is authorized at checkout, captured after shipment, partially refunded days later, and matched to a processor settlement file.",
    grain: "One payment transaction or immutable ledger entry, identified independently from the order. Never overwrite authorization with capture or refund.",
    capture: "Outbox for internal state transitions, CDC for ledger completeness, and processor files or webhooks as independent external evidence.",
    contract: "Key by payment_id or order_id according to the required ordering; retain processor_reference, transaction_type, amount_minor, currency_code, source sequence, and rule version.",
    consumers: "Fraud, payment reliability, cash forecasting, refunds, seller payout, finance reconciliation, and net-sales certification.",
    authority: "The payment service owns internal transaction state; the processor settlement owns what actually settled. Finance reconciles both rather than choosing one blindly.",
  },
  {
    code: "STOCK", name: "Inventory + supply", volume: "Very high", priority: "Critical",
    events: "reserved · released · picked · adjusted · received · transferred",
    role: "Reports every stock mutation across SKU and location. Reservations, warehouse receipts, transfers, damages, picks, releases, and returns explain how availability changed.",
    example: "Two units of SKU-7 at BLR-1 move from available to reserved for an order; one is later released after an item cancellation.",
    grain: "One immutable inventory movement for one SKU, location, reason, and quantity delta. Inventory snapshots are derived checkpoints.",
    capture: "Domain events for reservations and movements, CDC for operational stores, and warehouse feeds for physical adjustments and cycle counts.",
    contract: "Key by sku_id + location_id when mutation order matters; carry movement_id, reservation_id, order_id, signed quantity_delta, event time, and source sequence.",
    consumers: "Availability trends, replenishment, demand planning, stockout analysis, shrinkage, seller views, and movement-to-snapshot reconciliation.",
    authority: "The reservation service owns sellable availability. The analytical lake explains stock history but must never authorize checkout inventory.",
  },
  {
    code: "SHIP", name: "Fulfillment + returns", volume: "High", priority: "High",
    events: "allocated · picked · packed · shipped · delivered · returned",
    role: "Describes package and item movement from fulfillment assignment through delivery and reverse logistics. One order can split into multiple packages and carriers.",
    example: "Three order items produce two packages. One arrives today; the other fails delivery and is returned to a different fulfillment center.",
    grain: "One transition per shipment, package, or fulfillment item. Preserve the exact entity grain rather than treating order status as package status.",
    capture: "Internal domain events plus carrier webhooks and files. Late carrier scans enrich history without rewriting the original source timestamp.",
    contract: "Key shipment streams by shipment_id; include package_id, order_item_id, carrier event code, normalized state, facility, event time, ingestion time, and sequence.",
    consumers: "Delivery promises, late-shipment alerts, carrier scorecards, seller SLAs, customer support, returns, and fulfillment reliability.",
    authority: "Internal services own fulfillment intent; carrier evidence owns external scans. A delivered order is derived only after package-grain rules are applied.",
  },
  {
    code: "EDGE", name: "Web + mobile behavior", volume: "Extreme", priority: "Noisy",
    events: "page_view · search · impression · click · cart · checkout_start",
    role: "Captures the customer journey before and around a transaction. It dominates volume and is affected by offline buffering, retries, ad blockers, client clocks, instrumentation bugs, and declared sampling.",
    example: "An anonymous Android session searches for headphones, sees ten results, opens two products, adds one SKU, signs in, and starts checkout.",
    grain: "One user interaction or impression in one session. Impression, click, cart action, and purchase are different facts and denominators.",
    capture: "Bounded client batches through an edge collector that validates schema, attaches receive time, rate-limits abuse, rejects prohibited PII, and quarantines invalid records.",
    contract: "Key by session_id for local ordering; keep anonymous_id and optional customer_id, platform, app version, page, product/SKU, experiment assignments, event and ingestion time.",
    consumers: "Funnels, search quality, recommendations, experimentation, marketing attribution, product analytics, and popularity features.",
    authority: "Clients describe intent and interaction. The order service—not a client purchase event—proves that commerce accepted a purchase.",
  },
  {
    code: "CAT", name: "Catalog + price", volume: "Medium + bursty", priority: "High",
    events: "product_changed · offer_changed · price_changed · promotion_changed",
    role: "Defines products, SKUs, seller offers, prices, categories, attributes, and promotion validity. These dimensions change independently and require versioned history.",
    example: "One product has black and blue SKUs, offers from three sellers, and a two-hour promotion. The order item preserves the chosen offer and effective price.",
    grain: "One versioned change for a product, SKU, offer, price, or promotion. Product, physical variant, and seller offer must not be collapsed.",
    capture: "Domain events for approved changes, CDC for master tables, and seller/vendor feeds staged behind validation and approval workflows.",
    contract: "Carry the entity type and ID, seller where relevant, effective_from/to, change reason, source version, money in minor units, currency, and catalog taxonomy version.",
    consumers: "Search, recommendations, offer quality, price history, promotion attribution, product analytics, and point-in-time order enrichment.",
    authority: "Catalog owns descriptive identity; pricing and promotion services own effective commercial terms. Analytics joins the version valid at business time.",
  },
  {
    code: "TENANT", name: "Seller + customer domains", volume: "Medium", priority: "Sensitive",
    events: "seller_updated · offer_submitted · customer_updated · consent_changed",
    role: "Supplies seller tenancy, account status, customer profile mutations, identity links, consent, and policy attributes used to govern downstream interpretation and access.",
    example: "A guest session becomes associated with a customer after sign-in while a seller changes payout status. Both histories must remain effective-dated and access-controlled.",
    grain: "One versioned state transition for a seller, customer, identity link, consent purpose, or account-policy decision.",
    capture: "CDC is useful for profile mutations and legacy records; domain events express reviewed business changes and consent or policy semantics.",
    contract: "Use tokenized identifiers, source version, effective time, tenant ID, consent purpose, region, classification, and deletion behavior. Restrict identity translation.",
    consumers: "Tenant-isolated seller analytics, customer timelines, personalization eligibility, privacy enforcement, payout controls, and audit.",
    authority: "Operational identity and policy services own status and consent. Analytical dimensions may reflect them but cannot grant access or reactivate an account.",
  },
  {
    code: "EXT", name: "Partners + finance feeds", volume: "Batch / uneven", priority: "Certified",
    events: "settlement_file · carrier_manifest · warehouse_adjustment · vendor_feed",
    role: "Brings in evidence the platform does not create: processor settlements, carrier manifests, vendor inventory, warehouse counts, tax files, and seller submissions.",
    example: "A daily processor file reports captures, refunds, fees, and deposits with control totals that must match the internal payment ledger before close.",
    grain: "One landed file plus one normalized business row. Preserve file identity, reporting period, row number, checksum, and control totals.",
    capture: "Land immutable bytes first, fingerprint each delivery, validate manifest and control totals, normalize only after acceptance, and never interpret a missing file as zero.",
    contract: "Carry source_partner, file_id, checksum, reporting_period, extracted_at, row identity, schema version, expected/actual totals, and completeness status.",
    consumers: "Finance close, carrier reconciliation, physical inventory, seller onboarding, tax, disputes, and certified completeness checks.",
    authority: "The partner owns its external evidence. The platform owns normalization and reconciliation, while certification waits for every required feed or an approved exception.",
  },
] as const;

const CONTRACT_FIELDS = [
  { name: "event_id", purpose: "Idempotency", detail: "A stable logical event ID identifies one business transition, not one attempt to publish it. The producer reuses it across retry, broker redelivery, and replay so consumers can suppress duplicate application.", example: "A timed-out order_placed publish is retried with the same event_id; the order-item fact is applied once." },
  { name: "event_type + event_version", purpose: "Meaning", detail: "The type names the business transition and the version defines its payload contract. Producers can add compatible fields or run explicit versions while consumers migrate deliberately.", example: "order_placed v3 can add promotion allocations without silently changing the amount semantics used by v2 consumers." },
  { name: "event_time + ingestion_time", purpose: "Two clocks", detail: "Event time says when the business action occurred; ingestion time says when the platform accepted it. Keeping both makes mobile delay, CDC lag, partner lateness, and pipeline delay measurable.", example: "A 10:00 cart event uploaded at 10:08 belongs to the 10:00 session window and carries eight minutes of source-to-platform lateness." },
  { name: "producer + region", purpose: "Ownership", detail: "The emitting service and failure domain identify who may state the fact, where it originated, and which team owns a delay, schema failure, replay, or data-quality incident.", example: "order-service in ap-south-1 owns order_placed; an edge client cannot publish that authoritative transition." },
  { name: "entity_id + business_key", purpose: "Join + order", detail: "Entity IDs connect related facts while the chosen business key defines partition-local order. The key follows the lifecycle being protected rather than a generic customer partition.", example: "Orders use order_id; inventory uses sku_id + location_id; shipments use shipment_id; behavior commonly uses session_id." },
  { name: "source_sequence_number", purpose: "Reordering", detail: "A monotonic source version or log position resolves retries and out-of-order CDC updates. Event time alone cannot tell which of two competing state mutations is newer.", example: "Payment status version 18 arriving before version 17 remains current; the later-arriving older record stays in history but cannot regress the projection." },
  { name: "amount_minor + currency", purpose: "Money", detail: "Monetary events use integer minor units and an explicit ISO currency. Floating point and silent unit changes create irreconcilable finance errors and incompatible contracts.", example: "₹1,299.00 is amount_minor=129900 and currency_code=INR; changing cents to whole currency units requires a new contract." },
  { name: "schema_id + privacy_class", purpose: "Policy", detail: "Schema identity enables decoding and compatibility checks; privacy classification drives topic access, masking, retention, residency, audit, and deletion behavior from the moment of ingestion.", example: "A customer identity mutation enters a restricted topic, while a coarse catalog update can be broadly discoverable." },
] as const;

const RECONCILIATION_CASES = [
  {
    id: "order", label: "Order lifecycle", key: "order_id + order_item_id",
    inputs: [
      { producer: "Checkout", event: "checkout_started", detail: "Behavioral intent: the customer reached checkout with a priced cart. It does not prove acceptance, payment, reservation, or revenue." },
      { producer: "Order service", event: "order_placed", detail: "The authoritative acceptance event creates the order and item identities, committed commercial terms, and first source sequence." },
      { producer: "Inventory", event: "inventory_reserved", detail: "Links the exact SKU and location reservation to the order item; retries preserve reservation identity." },
      { producer: "Payment", event: "payment_authorized", detail: "Records an authorization transaction. Capture and settlement remain separate monetary evidence." },
      { producer: "Fulfillment", event: "item_shipped / delivered", detail: "Adds package-grain execution and delivery outcomes, which may split one order item or combine several items." },
    ],
    rules: [
      { label: "start at accepted order", detail: "Use order_placed as the authoritative beginning; checkout_start remains funnel evidence rather than an order count." },
      { label: "preserve item grain", detail: "Keep one canonical order-item row so partial cancellation, fulfillment, return, and seller attribution remain correct." },
      { label: "apply source sequence", detail: "Use the producer version to build current state without losing immutable transitions or regressing on late arrival." },
      { label: "derive order state", detail: "Compute header status from item, payment, and fulfillment rules; never assume one raw event represents the whole order." },
    ],
    output: "One event history plus canonical order and order-item projections with committed amounts, current lifecycle state, seller, offer, fulfillment, and lineage.",
    edge: "One checkout can fail before order acceptance, one order can contain many items, and items can cancel or ship independently—so raw checkout or event counts never equal orders.",
  },
  {
    id: "payment", label: "Payment + settlement", key: "payment_id + payment_txn_id",
    inputs: [
      { producer: "Payment service", event: "authorized", detail: "Represents approved spending capacity, not collected cash. Multiple attempts may exist for one order." },
      { producer: "Capture service", event: "captured", detail: "Creates a separate transaction when money is captured, often after shipment and possibly in partial amounts." },
      { producer: "Refund service", event: "refund_completed", detail: "References the original capture and order item while preserving its own transaction identity and amount." },
      { producer: "Risk / processor", event: "chargeback", detail: "External or reviewed evidence can arrive weeks later and changes net financial outcome without rewriting history." },
      { producer: "Settlement file", event: "processor_settled", detail: "Independent external evidence states what the processor deposited, withheld, or charged in a reporting period." },
    ],
    rules: [
      { label: "immutable transactions", detail: "Store authorization, capture, refund, fee, chargeback, and settlement as separate typed ledger entries." },
      { label: "minor units only", detail: "Reconcile integer amounts within currency; conversion belongs in a versioned reporting layer." },
      { label: "dedupe references", detail: "Use payment transaction and processor references to prevent webhook, CDC, file, or replay duplicates." },
      { label: "reconcile external cash", detail: "Compare internal eligible transactions to processor settlement, explain timing differences, and certify only balanced periods." },
    ],
    output: "An immutable payment-transaction ledger and a reconciliation result that explains authorized, captured, refunded, charged back, fee, and settled amounts.",
    edge: "Authorization, capture, settlement, and revenue are different concepts. A successful authorization cannot be counted as settled cash or certified net sales.",
  },
  {
    id: "inventory", label: "Inventory movement", key: "sku_id + location_id",
    inputs: [
      { producer: "Reservation", event: "reserved / released", detail: "Checkout-related mutations move sellable quantity into and out of reservation with a stable reservation ID." },
      { producer: "Warehouse", event: "received / adjusted", detail: "Physical receipts, cycle counts, damage, and corrections explain stock changes not caused by customer orders." },
      { producer: "Fulfillment", event: "picked / shipped", detail: "Execution converts reservations into physical outbound movement at item and facility grain." },
      { producer: "Returns", event: "returned / restocked", detail: "A return does not always become sellable stock; inspection outcome determines the resulting movement." },
      { producer: "Snapshot", event: "periodic quantity checkpoint", detail: "A checkpoint bounds reconciliation and recovery, but it cannot explain every reason or replace the movement ledger." },
    ],
    rules: [
      { label: "signed movement", detail: "Represent every change as an immutable signed quantity delta with reason, source, and business references." },
      { label: "ordered per stock key", detail: "Use SKU plus location and source sequence to preserve mutation order without forcing global ordering." },
      { label: "movement + snapshot", detail: "Rebuild quantity from a trusted checkpoint plus subsequent movements and compare it with the operational snapshot." },
      { label: "quarantine imbalance", detail: "Do not hide unexplained differences; expose variance by location, SKU, reason, and interval for investigation." },
    ],
    output: "An immutable inventory-movement fact, derived availability history, and a movement-to-snapshot reconciliation result for each SKU and location.",
    edge: "A current quantity is not an audit trail. Reservation, pick, shipment, damage, transfer, and return can change different quantity buckets independently.",
  },
  {
    id: "conversion", label: "Session to purchase", key: "session_id → customer_id → order_id",
    inputs: [
      { producer: "Web / mobile", event: "impression / click", detail: "High-volume client evidence describes exposure and interaction but may be sampled, blocked, retried, or late." },
      { producer: "Cart", event: "add_to_cart", detail: "A server-confirmed cart mutation is stronger evidence than a client gesture and connects a session to concrete SKU intent." },
      { producer: "Identity", event: "anonymous linked to customer", detail: "A time-bounded identity link joins pre-login and post-login activity only where consent and policy allow." },
      { producer: "Checkout", event: "checkout_started", detail: "Marks funnel progression and preserves price or experiment context, but still does not prove order acceptance." },
      { producer: "Order service", event: "order_placed", detail: "Provides the authoritative purchase outcome and order items used for conversion and attribution." },
    ],
    rules: [
      { label: "validate client events", detail: "Reject invalid shapes, prohibited PII, oversized records, and impossible values; attach trusted receive time and sampling status." },
      { label: "sessionize by event time", detail: "Place delayed mobile interactions in the correct journey using event time and explicit inactivity rules." },
      { label: "policy-safe identity", detail: "Apply consent, purpose, retention, and effective-time rules before joining anonymous and customer identifiers." },
      { label: "purchase from orders", detail: "Use accepted order items as the conversion numerator and retain the attribution model and lookback-window version." },
    ],
    output: "A governed journey with explicit impression, click, cart, checkout, and accepted-order stages plus a versioned attribution result.",
    edge: "Client purchase events can be missing or duplicated, while one session may create zero, one, or several orders. Conversion must end at the authoritative order domain.",
  },
] as const;

export default function AmazonEventSources() {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [caseIndex, setCaseIndex] = useState(0);
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const [ruleIndex, setRuleIndex] = useState(0);
  const source = SOURCES[sourceIndex];
  const field = CONTRACT_FIELDS[fieldIndex];
  const scenario = RECONCILIATION_CASES[caseIndex];
  const evidence = scenario.inputs[evidenceIndex] ?? scenario.inputs[0];
  const resolutionRule = scenario.rules[ruleIndex] ?? scenario.rules[0];

  return (
    <div className="mt-5 space-y-5">
      <SourceSection id="source-producer-map" eyebrow="01 · Source map" title="Map the commerce event producers" subtitle="Eight source families observe different parts of a purchase. Select a source to inspect what it owns, its exact event grain, how it is captured, and what downstream consumers may safely conclude.">
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
          <div className="grid gap-2 sm:grid-cols-2">
            {SOURCES.map((item, index) => <button data-testid={`amazon-event-source-${item.code.toLowerCase()}`} key={item.code} type="button" aria-pressed={sourceIndex === index} onMouseEnter={() => setSourceIndex(index)} onFocus={() => setSourceIndex(index)} onClick={() => setSourceIndex(index)} className={`min-h-[112px] rounded-2xl border p-4 text-left outline-none transition ${sourceIndex === index ? "border-[#111] bg-[#ededed] shadow-sm ring-2 ring-[#111]/10" : "border-[#d8d8d8] bg-[#f7f7f7] hover:-translate-y-0.5 hover:border-[#777] hover:bg-white"}`}><div className="flex items-center justify-between gap-2"><span className={`flex h-8 min-w-12 items-center justify-center rounded-lg px-2 font-mono text-[9px] font-bold ${sourceIndex === index ? "bg-[#111] text-white" : "bg-white text-[#111]"}`}>{item.code}</span><span className="text-[9px] font-bold text-[#666]">{item.volume}</span></div><h3 className="mt-3 text-xs font-bold text-[#111]">{item.name}</h3><p className="mt-1 line-clamp-2 font-mono text-[9px] leading-4 text-[#5f5f5f]">{item.events}</p></button>)}
          </div>
          <article className="overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-[#f7f7f7] xl:sticky xl:top-28" aria-live="polite" aria-label={`${source.name} explanation`}>
            <div className="flex items-start justify-between gap-3 border-b border-[#d8d8d8] bg-white p-5"><div><p className="font-mono text-[9px] font-bold tracking-[.14em] text-[#666]">{source.code} · {source.priority} priority</p><h3 className="mt-1 text-lg font-bold">{source.name}</h3><p className="mt-2 text-xs leading-5 text-[#555]">{source.role}</p></div><span className="shrink-0 rounded-full border border-[#c9c9c9] bg-[#ededed] px-2.5 py-1.5 font-mono text-[9px] font-bold">{sourceIndex + 1}/{SOURCES.length}</span></div>
            <div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2 xl:grid-cols-1">{[
              ["Amazon example", source.example], ["Event grain", source.grain], ["Capture behavior", source.capture], ["Contract + ordering", source.contract], ["Downstream use", source.consumers], ["Source authority", source.authority],
            ].map(([label, value]) => <div key={label} className="bg-[#f7f7f7] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">{label}</p><p className="mt-2 text-[11px] leading-5 text-[#444]">{value}</p></div>)}</div>
          </article>
        </div>
      </SourceSection>

      <SourceSection id="source-event-contract" eyebrow="02 · Shared contract" title="Standardize the wrapper, preserve domain meaning" subtitle="Every producer uses the same identity, time, ownership, ordering, schema, and policy envelope. The payload remains specific to orders, payments, inventory, behavior, or another owned domain.">
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-[#c9c9c9] bg-[#c9c9c9] md:grid-cols-3">
          {[
            ["One common wrapper", "All events carry stable identity, type and version, business and ingestion clocks, producer, region, entity keys, schema, and classification."],
            ["Different domain payloads", "An order adds items and committed amounts; an inventory event adds location and quantity delta; a payment adds transaction type and currency."],
            ["Authority travels with data", "Producer, source sequence, capture mode, and contract version tell consumers who may state the fact and how to resolve retries or conflicts."],
          ].map(([title, detail], index) => <div key={title} className="bg-[#ededed] p-4"><span className="font-mono text-[9px] font-bold text-[#777]">0{index + 1}</span><h3 className="mt-2 text-xs font-bold">{title}</h3><p className="mt-2 text-[11px] leading-5 text-[#4b4b4b]">{detail}</p></div>)}
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <div className="grid gap-2 sm:grid-cols-2">{CONTRACT_FIELDS.map((item, index) => <button data-testid={`amazon-contract-field-${index}`} key={item.name} type="button" aria-pressed={fieldIndex === index} onMouseEnter={() => setFieldIndex(index)} onFocus={() => setFieldIndex(index)} onClick={() => setFieldIndex(index)} className={`rounded-xl border p-3 text-left outline-none transition ${fieldIndex === index ? "border-[#111] bg-[#ededed] ring-2 ring-[#111]/10" : "border-[#d8d8d8] bg-white hover:border-[#777]"}`}><code className="text-[11px] font-bold text-[#111]">{item.name}</code><span className="mt-1 block text-[10px] text-[#5f5f5f]">{item.purpose}</span></button>)}</div>
            <article className="mt-3 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#f7f7f7]" aria-live="polite" aria-label={`${field.name} explanation`}><div className="border-b border-[#d8d8d8] bg-white px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#666]">Field explanation · {field.purpose}</p><h3 className="mt-1 font-mono text-sm font-bold">{field.name}</h3></div><div className="p-4"><p className="text-xs leading-6 text-[#333]">{field.detail}</p><div className="mt-3 border-t border-[#d8d8d8] pt-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">Commerce example</p><p className="mt-1 text-[11px] leading-5 text-[#444]">{field.example}</p></div></div></article>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#111] bg-[#111] text-white shadow-[0_12px_28px_rgba(0,0,0,.14)] xl:self-start">
            <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/70">Example · order_placed v3</p><span className="h-2.5 w-2.5 rounded-full bg-white"/></div>
            <pre className="overflow-x-auto p-4 font-mono text-[10px] leading-5 text-[#e5e5e5]">{`{
  "event_id": "01K7...",
  "event_type": "order_placed",
  "event_version": 3,
  "event_time": "2026-10-05T02:40:30.123Z",
  "ingestion_time": "2026-10-05T02:40:30.450Z",
  "producer": "order-service",
  "region": "ap-south-1",
  "entity_type": "order",
  "entity_id": "ORD-123",
  "business_key": "ORD-123",
  "source_sequence_number": 18,
  "schema_id": "order_placed_v3",
  "privacy_class": "CUSTOMER_SENSITIVE",
  "payload": {
    "order_item_count": 3,
    "amount_minor": 129900,
    "currency_code": "INR"
  }
}`}</pre>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[
          ["Safe", "Add a nullable field or a field with a default."], ["Version", "Create a new event version for changed meaning."], ["Danger", "Never silently change cents to whole currency units."], ["Block", "Reject incompatible schemas before they reach consumers."],
        ].map(([label, detail]) => <div key={label} className="rounded-xl border border-[#d8d8d8] bg-[#f7f7f7] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#555]">{label}</p><p className="mt-1.5 text-[10px] leading-5 text-[#444]">{detail}</p></div>)}</div>
      </SourceSection>

      <SourceSection id="source-reconciliation" eyebrow="03 · Lifecycle reconciliation" title="Turn independent evidence into one trustworthy fact" subtitle="No producer sees the entire commerce journey. Choose a lifecycle to see how authoritative events are matched, deduplicated, ordered, and converted into an explicit analytical grain.">
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-[#c9c9c9] bg-[#c9c9c9] sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
          <div className="h-full bg-[#ededed] p-4"><p className="font-mono text-[9px] font-bold text-[#777]">01 · EVIDENCE</p><p className="mt-1 text-xs font-bold">Independent source facts</p><p className="mt-1 text-[10px] leading-5 text-[#555]">Keep each producer’s grain, clock, identity, and authority.</p></div><span className="hidden bg-white px-2 text-[#777] sm:block" aria-hidden>→</span>
          <div className="h-full bg-[#ededed] p-4"><p className="font-mono text-[9px] font-bold text-[#777]">02 · RESOLVE</p><p className="mt-1 text-xs font-bold">Match, order, reconcile</p><p className="mt-1 text-[10px] leading-5 text-[#555]">Use stable IDs, source sequence, event time, and business rules.</p></div><span className="hidden bg-white px-2 text-[#777] sm:block" aria-hidden>→</span>
          <div className="h-full bg-[#ededed] p-4"><p className="font-mono text-[9px] font-bold text-[#777]">03 · PUBLISH</p><p className="mt-1 text-xs font-bold">One declared product grain</p><p className="mt-1 text-[10px] leading-5 text-[#555]">Expose lineage, completeness, freshness, and metric version.</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Commerce reconciliation scenario">{RECONCILIATION_CASES.map((item, index) => <button key={item.id} type="button" aria-pressed={caseIndex === index} onClick={() => { setCaseIndex(index); setEvidenceIndex(0); setRuleIndex(0); }} className={`rounded-xl border px-4 py-2.5 text-xs font-bold outline-none transition ${caseIndex === index ? "border-[#111] bg-[#111] text-white" : "border-[#d8d8d8] bg-white text-[#444] hover:border-[#777]"}`}>{item.label}</button>)}</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_285px_minmax(0,1fr)] xl:items-center">
          <div><p className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#666]">01 · Evidence from producers</p><div className="grid gap-2">{scenario.inputs.map((item, index) => <button key={`${item.producer}-${item.event}`} type="button" aria-pressed={evidenceIndex === index} onMouseEnter={() => setEvidenceIndex(index)} onFocus={() => setEvidenceIndex(index)} onClick={() => setEvidenceIndex(index)} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left outline-none transition ${evidenceIndex === index ? "border-[#111] bg-[#ededed] ring-2 ring-[#111]/10" : "border-[#d8d8d8] bg-[#f7f7f7] hover:border-[#777] hover:bg-white"}`}><span className="text-xs font-bold">{item.producer}</span><code className="text-right text-[9px] leading-4 text-[#555]">{item.event}</code></button>)}</div></div>
          <div><p className="mb-2 text-center text-[9px] font-bold uppercase tracking-[.15em] text-[#666]">02 · Rules applied</p><div className="rounded-[22px] border border-[#111] bg-[#ededed] p-5 text-center"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">Match records on</p><strong className="mt-2 block font-mono text-sm">{scenario.key}</strong><div className="mt-4 flex flex-wrap justify-center gap-2">{scenario.rules.map((rule, index) => <button key={rule.label} type="button" aria-pressed={ruleIndex === index} onMouseEnter={() => setRuleIndex(index)} onFocus={() => setRuleIndex(index)} onClick={() => setRuleIndex(index)} className={`inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-[9px] font-bold outline-none transition ${ruleIndex === index ? "border-[#111] bg-[#111] text-white" : "border-[#c9c9c9] bg-white text-[#333] hover:border-[#777]"}`}>{rule.label}</button>)}</div></div></div>
          <article><p className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#666]">03 · Final analytical fact</p><div className="rounded-[22px] border border-[#d8d8d8] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">Trusted output</p><h3 className="mt-2 text-base font-bold">{scenario.label}</h3><p className="mt-3 text-xs leading-6 text-[#444]">{scenario.output}</p><div className="mt-4 border-t border-[#d8d8d8] pt-3"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#666]">Why raw counts disagree</p><p className="mt-1 text-[10px] leading-5 text-[#555]">{scenario.edge}</p></div></div></article>
        </div>
        <article className="mt-4 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#f7f7f7]" aria-live="polite">
          <div className="grid gap-px bg-[#d8d8d8] md:grid-cols-2">
            <div className="bg-[#f7f7f7] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">Selected evidence</p><h3 className="mt-1 text-sm font-bold">{evidence.producer}</h3><code className="mt-1 block text-[9px] leading-4 text-[#555]">{evidence.event}</code><p className="mt-3 text-[11px] leading-5 text-[#333]">{evidence.detail}</p></div>
            <div className="bg-[#f7f7f7] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">Selected resolution rule</p><h3 className="mt-1 font-mono text-sm font-bold">{resolutionRule.label}</h3><p className="mt-3 text-[11px] leading-5 text-[#333]">{resolutionRule.detail}</p></div>
          </div>
        </article>
      </SourceSection>
    </div>
  );
}

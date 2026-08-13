# Kerbside Darwin passenger-loading probe

This probe measures whether the National Rail Darwin Push Port / Rail Data Marketplace PubSub stream contains passenger-loading evidence often enough to justify using it in Kerbside's crowding model.

It is deliberately **measurement-only**. The passenger-facing app can consume explicit live formation loading through its existing LDB path, while this probe remains a coverage/quality monitor and does not itself serve passenger data.

## Two different Darwin loading signals

Darwin exposes two loading message families with different meanings. Kerbside must keep them separate.

### `formationLoading` — real-time coach loading

`formationLoading` is the direct signal Kerbside uses when available for live crowding. It supplies estimated percentage loading for coaches associated with a particular service, formation and location. When present and fresh, Kerbside can present explicit provenance such as **Live train-loading evidence** and, where the coach spread is meaningful, guidance about a relatively quieter coach.

This is operator-supplied/maintained loading evidence. It should not be described as a physical passenger count or ticket count.

### `serviceLoading` — provider typical/expected loading

`serviceLoading` describes provider-supplied typical or expected loading for the whole service at a location, using percentage and/or category values. It does **not** become live occupancy merely because it is delivered on the live Push Port stream.

Kerbside may later use `serviceLoading` as a stronger forecast prior than a generic heuristic, but it must be labelled as operator expected/typical evidence and not as live train loading.

## What the probe measures

Every scheduled run starts at the Kafka live edge and samples a short window. The report contains only aggregate counters:

- Kafka/XML messages observed;
- distinct service RIDs seen transiently in memory during the sample;
- real-time `formationLoading` service coverage;
- services with real-time coach values;
- provider `serviceLoading` coverage, split into Expected/Typical evidence where supplied;
- the two evidence families grouped by train operator;
- operator-attribution coverage and whether the attribution came from another live Darwin message in the sample or from Kerbside's current compact Darwin timetable snapshot;
- parser/decode failure counters and common XML element names, to detect schema drift.

The denominator is **services observed during the sample**, not all trains running on the GB network. The same service may appear in multiple hourly samples. This is a coverage study, not a unique-train census.

Schema-v1 reports created before `formationLoading` and `serviceLoading` were separated are treated as **legacy unclassified loading** by the summarizer. They are never reclassified as real-time evidence. Schema-v2 reports separated the two loading families. Schema-v3 adds privacy-safe timetable-assisted operator attribution.

## Operator attribution

A `formationLoading` message often carries the RID but not the train operator code. An eight-minute live-edge sample may therefore see the loading update without seeing the earlier schedule message that contained the TOC.

The probe uses this order:

1. If any live Darwin message in the current sample exposes a TOC for that RID, use it.
2. Otherwise, look up the RID in Kerbside's already-generated compact Darwin timetable shard for the current GB railway date and use that row's TOC.
3. If neither source can identify the operator, keep the service under `__unknown__`.

The timetable is used **only to attribute the operator**. It never supplies, creates or modifies a loading value. All `formationLoading` counts and coach values still originate from the live Darwin PubSub stream.

The current timetable shard is generated from Darwin timetable files and is already part of the Kerbside repository/Pages data pipeline. No additional external credential or API call is needed for this fallback.

## Privacy and storage boundary

The probe never writes raw Darwin payloads. RIDs, train IDs, station identifiers and individual loading values exist only transiently in runner memory so records can be counted and associated with an operator. The timetable RID-to-TOC map also exists only in runner memory. The uploaded artifact contains no service identity, timetable identity or per-service passenger value.

Artifacts are retained for seven days. `.github/scripts/summarize-darwin-loading.py` can combine downloaded reports across several days without reconstructing any train identity.

## RDM subscription and repository secrets

The existing `RDM_LDB_API_KEY` is for the Live Departure Board JSON API. Darwin Push Port is a separate RDM PubSub product and uses Kafka SASL credentials.

Subscribe the Kerbside RDM account to **Darwin Real Time Train Information PubSub**, then copy the connection values supplied by RDM into these GitHub repository secrets:

- `RDM_DARWIN_KAFKA_BOOTSTRAP`
- `RDM_DARWIN_KAFKA_GROUP_ID`
- `RDM_DARWIN_KAFKA_USERNAME`
- `RDM_DARWIN_KAFKA_PASSWORD`
- `RDM_DARWIN_KAFKA_TOPIC`
- `RDM_DARWIN_KAFKA_CA_LOCATION` (optional; GitHub runners otherwise use the normal CA bundle via `certifi`)

The probe uses `SASL_SSL`, the `PLAIN` SASL mechanism, `auto.offset.reset=latest`, and disables auto-commit. It therefore samples new messages only and does not deliberately replay a historical backlog.

## Schedule

`.github/workflows/kerbside-darwin-loading-probe.yml` runs an eight-minute sample at minute 23 of every hour. It also runs once after probe changes are merged to `main`, and it supports manual runs from GitHub Actions with a 30-1800 second duration.

If the Kafka secrets are not configured, scheduled runs exit successfully after writing a clear setup notice; they do not create empty or misleading coverage artifacts.

## Evidence rules

Do not use a generic XML element containing the word "loading" as proof of live occupancy. Keep these rules intact:

1. `formationLoading` is the only signal in this probe counted as real-time coach-loading evidence.
2. `serviceLoading` remains provider Typical/Expected evidence and is not called live occupancy.
3. Missing loading never means a train is quiet.
4. Direct loading can outrank Forecast v4 only for the specific service where explicit valid loading exists.
5. Operator attribution from the timetable does not make the loading itself timetable-derived; the loading remains a live PubSub observation.

The hourly samples should continue answering which operators contribute real-time loading consistently, whether coach-level coverage stays useful throughout the day, and whether the observed coverage is broad and stable enough to justify further passenger-facing coach guidance.

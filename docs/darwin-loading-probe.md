# Kerbside Darwin passenger-loading probe

This probe measures whether the National Rail Darwin Push Port / Rail Data Marketplace PubSub stream contains passenger-loading evidence often enough to justify using it in Kerbside's crowding model.

It is deliberately **measurement-only**. Forecast v4 and `bus.html` are not changed by this probe.

## Two different Darwin loading signals

Darwin exposes two loading message families with different meanings. Kerbside must keep them separate.

### `formationLoading` — real-time coach loading

`formationLoading` is the direct signal Kerbside is investigating for live crowding. It supplies estimated percentage loading for coaches associated with a particular service, formation and location. When present and fresh, this may support explicit provenance such as **Live train-loading evidence** and, if coverage proves adequate, guidance about relatively quieter coaches.

This is operator-supplied/maintained loading evidence. It should not be described as a physical passenger count or ticket count.

### `serviceLoading` — provider typical/expected loading

`serviceLoading` describes provider-supplied typical or expected loading for the whole service at a location, using percentage and/or category values. It does **not** become live occupancy merely because it is delivered on the live Push Port stream.

Kerbside may later use `serviceLoading` as a stronger forecast prior than a generic heuristic, but it must be labelled as operator expected/typical evidence and not as live train loading.

## What the probe measures

Every scheduled run starts at the Kafka live edge and samples a short window. The schema-v2 report contains only aggregate counters:

- Kafka/XML messages observed;
- distinct service RIDs seen transiently in memory during the sample;
- real-time `formationLoading` service coverage;
- services with real-time coach values;
- provider `serviceLoading` coverage, split into Expected/Typical evidence where supplied;
- the two evidence families grouped by train operator where the Push Port payload exposes an operator code;
- parser/decode failure counters and common XML element names, to detect schema drift.

The denominator is **services observed during the sample**, not all trains running on the GB network. The same service may appear in multiple hourly samples. This is a coverage study, not a unique-train census.

Schema-v1 reports created before this distinction was introduced are treated as **legacy unclassified loading** by the summarizer. They are never reclassified as real-time evidence.

## Privacy and storage boundary

The probe never writes raw Darwin payloads. RIDs, train IDs, station identifiers and individual loading values exist only transiently in runner memory so records can be counted and associated with an operator. The uploaded artifact contains no service identity or per-service passenger value.

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

## Decision gate before Forecast integration

Do not use a generic XML element containing the word "loading" as proof of live occupancy. First collect enough classified samples to answer:

1. What percentage of sampled services expose real-time `formationLoading`?
2. Which operators contribute real-time loading consistently?
3. Is coach-level evidence common enough to support a "quieter part of train" feature?
4. How often is `serviceLoading` available as provider expected/typical evidence?
5. Are values stable and interpretable under the current Darwin schema?
6. Is coverage broad enough that surfacing direct evidence improves rather than confuses the Forecast v4 result?

If real-time `formationLoading` is useful, it should outrank statistical crowding prediction for the specific service/location where it is fresh, with explicit provenance such as **Live train-loading evidence**. Missing live loading must never imply that a train is quiet; services without direct evidence continue to use Forecast v4.

If only `serviceLoading` is useful, it can be considered as an operator-provided prediction/prior while Forecast v4 remains responsible for the final estimate. It must not be labelled as live occupancy.

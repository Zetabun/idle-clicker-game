# Kerbside Darwin passenger-loading probe

This probe measures whether the National Rail Darwin Push Port / Rail Data Marketplace PubSub stream contains passenger-loading evidence often enough to justify using it in Kerbside's crowding model.

It is deliberately **measurement-only**. Forecast v4 and `bus.html` are not changed by this probe.

## What it measures

Every scheduled run starts at the Kafka live edge and samples a short window. The report contains only aggregate counters:

- Kafka/XML messages observed;
- distinct service RIDs seen in memory during the sample;
- how many of those services emitted a loading element;
- whether loading evidence appears to be whole-train or coach/carriage level;
- loading coverage grouped by train operator where the Push Port payload exposes an operator code;
- parser/decode failure counters and common XML element names, to detect schema drift.

The denominator is **services observed during the sample**, not all trains running on the GB network. The same service may appear in multiple hourly samples. This is a coverage study, not a unique-train census.

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

`.github/workflows/kerbside-darwin-loading-probe.yml` runs an eight-minute sample at minute 23 of every hour. It also runs once after the probe is merged to `main`, and it supports manual runs from GitHub Actions with a 30-1800 second duration.

If the Kafka secrets are not configured, scheduled runs exit successfully after writing a clear setup notice; they do not create empty or misleading coverage artifacts.

## Decision gate before Forecast integration

Do not use the loading feed in Forecast simply because the XML schema contains a loading field. First collect several days of artifacts and answer:

1. What percentage of sampled services expose loading at all?
2. Which operators contribute it consistently?
3. Is coach-level evidence common enough to support a "quieter part of train" feature?
4. Are loading values stable and interpretable under the current Darwin schema?
5. Is coverage broad enough that surfacing direct loading would improve rather than confuse the current Forecast v4 result?

If direct loading is useful, it should be treated as stronger evidence than statistical crowding prediction, with explicit provenance such as **Live train-loading evidence**. Services without direct evidence should continue to use Forecast v4 rather than being inferred as quiet.

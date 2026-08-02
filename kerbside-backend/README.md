# Kerbside Pages data and live Worker

Kerbside 0.6 separates static timetable delivery from live bus positions:

- **Cloudflare Pages** serves official stop, timetable and journey-pattern JSON.
- **Cloudflare Worker** protects the BODS key and proxies live vehicle positions only.
- **GitHub Actions** rebuilds England's regional BODS timetable data and deploys it to Pages.

No R2 bucket, R2 API token or R2 billing setup is required.

## Public endpoints

Static data is deployed to `https://kerbside-data-zetabun.pages.dev`:

- `GET /manifest.json` - national build status and regional bounds.
- `GET /regions/{region}/tiles/{tile}.json` - nearby official stop metadata for one geographic tile.
- `GET /regions/{region}/departures/{prefix}.json` - a balanced timetable shard selected by the stop's hash.
- `GET /regions/{region}/patterns/{prefix}.json` - ordered journey patterns loaded only when needed.

`bus.html` uses that Pages hostname directly, so timetable traffic does not consume Worker requests.

Kerbside 0.6.2 tolerates individual regional tile failures and resolves cached or overlapping stop records against every matching timetable shard, preferring the regional copy with the fullest departure set. This also self-heals older OpenStreetMap stop selections when they contain an official ATCO or NaPTAN code.

Kerbside 0.6.3 adds a Settings Stats tab that reads current network totals and per-region coverage directly from the live Pages manifest. It also wraps long destination filters and gives scheduled ETA values a wider, clearer column.

Kerbside 0.6.4 places the settings tabs beside the dialog title, adds live GPS and Worker statistics, and continuously animates a short bounded visual estimate between confirmed vehicle snapshots. The compact Times header keeps destination filters on one horizontal scroller and moves route-source and confidence explanations behind its information button. The information panel explains the Verified, Likely and Rough labels without permanently occupying departure-board space. Timetable matching and ETA calculations continue to use confirmed vehicle records rather than the visual estimate.

Kerbside 0.6.5 increases the visual separation between the Settings title and its tabs. It suppresses two-finger browser zoom on the controls, departure board and settings dialog while preserving pinch-to-zoom on the Leaflet map.

Kerbside 0.6.6 adds dedicated Apple touch and PWA icons plus an installable web-app manifest. iPhone and iPad home-screen saves use the 180px Kerbside icon, while other supported browsers can use the 192px and 512px icons and launch the app in standalone mode.

Kerbside 0.6.7 corrects standalone iPhone safe-area layout. The top controls now sit below the status bar and Dynamic Island, the app shell uses the dynamic viewport height, and the outer page canvas matches the mobile navigation so no contrasting strip appears beneath it. The navigation remains above the home-indicator safety area rather than placing controls inside it.

Kerbside 0.6.8 pins the standalone app shell to all four viewport edges, removing the remaining iOS home-screen gap. The Settings overlay now starts beneath the status bar and constrains its height between the top and bottom safe areas, preventing its title and close control from being clipped. This keeps the same safe layout after reopening the saved home-screen app.

Kerbside 0.6.9 prevents iOS focus zoom inside Settings by keeping mobile form controls at 16px, locking browser-page scaling, and containing Settings gestures. Leaflet map pinch zoom remains handled by the map itself. This prevents the main standalone viewport remaining enlarged or shortened after the Settings sheet closes.

Kerbside 0.6.10 avoids the WebKit installed-app viewport gap by removing `viewport-fit=cover` and switching from the translucent status bar to Apple's normally inset black standalone status bar. The saved iOS app now receives a stable viewport below the status bar instead of relying on the broken edge-to-edge height calculation; map pinch zoom remains available.

Kerbside 0.6.11 pins the leave-alert bell to the compact departure header when live details expand, labels every real tracked vehicle with a clear `LIVE GPS` badge, and explains why future timetable rows remain scheduled until a vehicle begins broadcasting. Background OpenStreetMap anchor and route lookups no longer display a misleading stop-service error, and official national timetable stops skip the redundant route lookup entirely.

Kerbside 0.6.12 removes the misleading visible town-centre direction marker, labels the green point as the user's search location, and prevents accidental taps on map attribution links on touch devices while preserving clickable source links in Settings. Returning from an external page now repairs the iOS layout and refetches without clearing the existing board. Fresh GPS reports retain the `LIVE GPS` badge; reports between two and four minutes old remain briefly visible as `GPS DELAYED` rather than disappearing between irregular operator updates.

Kerbside 0.6.13 makes the public Worker the default so new visitors start with real BODS data and Simulator becomes opt-in. The information panel now shows staged live-matching diagnostics, each live row displays its GPS position age, and WebKit mobile regression checks cover Settings, tabs, public-source defaults and viewport containment. The retired West Midlands-only timetable workflow is removed in favour of the national Pages build.

Kerbside 0.6.14 periodically expands live GPS coverage to an 18 km area around the selected stop. The wider area is guarded by exact timetable journey matching: distant vehicles are shown only when the live journey is scheduled to call at that stop, while the existing nearby route matching and dim background markers remain limited to the original 9 km area. Wide scans run less often than nearby refreshes to limit extra BODS traffic.

Kerbside 0.6.15 adds exact live journey progress. Tapping a timetable-matched vehicle shows its ordered stops, passed stops, next stop, selected-stop position, stops remaining and percentage through the journey. The national builder now retains optional GTFS `shapes.txt` geometry and stop metadata. Kerbside draws the map route only when that exact journey has an authoritative GTFS shape; older or shape-less patterns continue to support matching but never produce a guessed road line.

Kerbside 0.6.16 improves live-GPS recovery. It normalises compatible SIRI and timetable journey references, resolves uniquely matching route-pattern aliases, and lets exact journey geometry or a plausible scheduled call override weaker straight-line bearing and town-centre direction inferences. Official timetable direction still blocks a contradictory journey. The live diagnostics panel now reports rejection reasons and recovered vehicles, while each schedule-only row explains whether no GPS was received, no vehicle matched the route, the branch was uncertain, or a received position was filtered.

Kerbside 0.6.17 corrects timetable direction handling. GTFS `direction_id` values `0` and `1` are route-local identifiers rather than universal inbound/outbound labels, so Kerbside no longer rejects vehicles or scheduled rows on that assumption. Explicit inbound/outbound text is still honoured, while other scheduled direction is derived conservatively from the ordered journey around the selected stop and the current town anchor.

Kerbside 0.6.18 makes the live Worker cache-first and deadline-safe. Very recent cached responses are returned without another upstream call. For older cached positions, the Worker gives BODS a short opportunity to refresh, then returns the cache immediately and completes the refresh with `waitUntil`. Uncached requests use at most two four-second attempts, keeping the Worker within the browser's twelve-second request deadline. Cache keys now include optional `lineRef`, and Worker tests cover fresh cache hits, stale background refresh and bounded outages.

Kerbside 0.6.19 makes compatible journey-reference matching uniqueness-safe. Literal, compact, prefix/suffix and shared-token matches are ranked; only one uniquely strongest timetable trip may receive exact-journey privileges, distant-bus admission or exact pattern geometry. Ambiguous aliases fall back to route-level evidence, are excluded from timetable ETA blending, and are reported explicitly. The WebKit regression suite now executes the matching helpers with exact, compact, unique-alias and ambiguous fixtures instead of checking source strings alone.

Kerbside 0.6.20 separates stop discovery from live-feed coverage. The selectable 800 m to 6 km radius controls which nearby stops are loaded, but routine BODS polling is now always the existing 9 km vehicle area around the selected stop. The deliberate 18 km exact-journey scan remains periodic. This prevents a 6 km stop-search setting from expanding every normal live request to roughly 15 km and reduces XML size, mobile parsing work and upstream traffic.

Kerbside 0.6.21 resets location-dependent direction state immediately. Choosing a new address or device location now clears the previous town anchor before stops or live vehicles are loaded, so a slow place lookup cannot temporarily classify buses using the town centre from the user's former area. Inbound/outbound remains neutral until the new anchor resolves.

Kerbside 0.6.22 removes the retired recorder/history client. The Settings button for copying `WATCHED_STOPS`, the silent `/history` request, its in-memory state and all call sites have been deleted because the live-only Worker exposes only `/`, `/feed` and `/health`. Local observed-arrival learning remains available in the browser, but the interface no longer implies that a Cloudflare recorder is active.

Kerbside 0.6.23 makes address lookup race-safe and country-scoped. Each Photon request cancels the preceding request, stale responses are ignored by a sequence guard, and clicking away, pressing Escape or reducing the query below three characters also cancels pending work. Forward searches now include both `countrycode=GB` and the Great Britain bounding box, matching the app's timetable and BODS coverage.

Kerbside 0.6.24 isolates local ETA learning by service identity. Learned detour factors and speeds now use a composite operator, route-reference and displayed-line key instead of the line number alone. The unsafe version-1 cache is discarded rather than migrated, preventing a route `9` in one city or operator from affecting another route `9` elsewhere.

Kerbside 0.6.25 corrects ambiguous `St` name cleanup. The app no longer expands every standalone `St` token to `Street`; it keeps the readable abbreviation instead, preserving place names such as St Helens and Bury St Edmunds while still normalising unambiguous road suffixes.

Kerbside 0.6.26 adds a leave-alert disappearance grace period. Once an alert has fired for a particular vehicle or journey, a missing live row is retained for up to two minutes rather than resetting immediately. The alert still resets for a genuinely different vehicle or after the grace period, preventing duplicate notifications caused by one missed GPS poll.

Kerbside 0.6.27 makes schedule-only explanations evidence-based. The app now distinguishes no fresh GPS in the fetched area, no fresh GPS for the route, an uncertain destination, a filtered possible match, an ambiguous alias and no unique journey match. It no longer infers that an operator's GPS service is unavailable from an empty or filtered local snapshot.

The Worker remains backwards-compatible for live data:

- `GET /?bbox=minLon,minLat,maxLon,maxLat`
- `GET /feed?bbox=minLon,minLat,maxLon,maxLat`
- `GET /health`

Each live bounding-box span must be no more than 0.35 degrees. Kerbside 0.6 clamps its requests to 0.34 degrees so the BODS upstream limit is not exceeded.

## One-time Cloudflare setup

1. Create a Cloudflare API token with:
   - **Account / Cloudflare Pages / Edit**
   - **Account / Workers Scripts / Edit**
2. Add these GitHub Actions repository secrets:
   - `BODS_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
3. Run **Build Kerbside national timetable data** manually.
   - The workflow creates the `kerbside-data-zetabun` Pages project when it does not exist.
   - It builds all nine English BODS regions and deploys the static site.
4. Run **Deploy Kerbside Worker** manually.
5. Confirm:
   - `https://kerbside-data-zetabun.pages.dev/manifest.json` returns a national manifest.
   - the Worker's `/health` response says `role: "live-only"` and `bods: true`.
6. Add the repository Actions variable `KERBSIDE_NATIONAL_ENABLED=true` to enable automatic daily timetable deployments and Worker deployments after future code changes.

Do not put BODS or Cloudflare credentials in `bus.html`, source code or repository variables.

## Pages free-tier safeguards

The builder writes lightweight 0.05-degree stop-index tiles plus balanced two-character departure and pattern shards. This prevents dense city timetables from producing oversized geographic files. The workflow fails before deployment when:

- the site contains more than 20,000 files; or
- any individual asset reaches 25 MiB.

A `_headers` file enables cross-origin browser access and sets CDN caching for manifests, tiles and pattern shards.

## Local checks

```bash
npm install
npm run check
npm test
```

Build one extracted regional GTFS folder with:

```bash
node scripts/build-region.js /path/to/gtfs west_midlands ./dist
```

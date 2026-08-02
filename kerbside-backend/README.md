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

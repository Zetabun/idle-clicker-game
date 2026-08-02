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

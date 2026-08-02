# Kerbside national data backend

This directory contains the Cloudflare Worker and regional timetable builder used by Kerbside 0.5.

## What it provides

- `GET /?bbox=minLon,minLat,maxLon,maxLat` - backwards-compatible BODS live vehicle proxy.
- `GET /health` - BODS, R2 and timetable manifest status.
- `GET /nearby-stops?lat=...&lon=...&radius=1500` - official GTFS/NaPTAN stop identifiers near a location.
- `GET /departures/{stopId}?region=west_midlands&tile=2850-3558` - the compact timetable tile containing the selected stop.
- `GET /pattern/{patternId}?region=west_midlands` - the route-pattern shard containing an ordered journey pattern.

The Worker retries failed BODS requests and can return a very recent cached feed during a brief upstream outage. This prevents a temporary BODS 5xx response from immediately emptying the live board.

## Cloudflare setup

1. Create an R2 bucket named `kerbside-data`.
2. Create an R2 API token with object read/write access to that bucket.
3. Create a Cloudflare API token with Workers Scripts edit permission for the account.
4. Add these GitHub Actions repository secrets:
   - `BODS_KEY` (already used by the existing timetable workflow)
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
5. Run **Build Kerbside national timetable data** manually.
6. Run **Deploy Kerbside Worker** manually.
7. Confirm `/health` reports `bods: true`, `timetable: true`, and a national manifest.
8. Add a repository Actions variable named `KERBSIDE_NATIONAL_ENABLED` with value `true` to enable automatic daily builds and Worker deployments after future code changes.

Do not place BODS or Cloudflare credentials in `bus.html`, `wrangler.toml`, source code or repository variables.

## Data design

BODS publishes very large national files. Kerbside processes the smaller regional GTFS packages in parallel and uploads compact geographic tiles to R2. The browser downloads only nearby stop metadata, one selected-stop timetable tile, and route-pattern shards as they are needed.

Regional timetable jobs extract only `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt` and `calendar_dates.txt`. Large GTFS shape files are deliberately excluded. Ordered paths are reconstructed from stop sequences, which is sufficient for determining whether a live bus is before or after the selected stop.

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

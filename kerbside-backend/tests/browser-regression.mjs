assert.doesNotMatch(busSource, /cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet/);
assert.match(busSource, /const TILE_ERROR_THRESHOLD=4/);
assert.match(busSource, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
assert.match(busSource, /function useTileProvider\(index,reason\)/);
assert.match(busSource, /currentTileProvider/);
assert.match(busSource, /function liveVehicleIdentity\(fields\)/);
// Two buses working one journey/block code must stay two records. Keying on
// the journey alone dropped all but the last, and the survivor's track was
// reset every poll by the apparent jump between them.
assert.match(busSource, /if\(journey&&vehicle\) return owner\+'\|journey\|'\+journey\+'\|vehicle\|'\+vehicle;/);
assert.match(busSource, /function physicalVehicleKey\(v\)/);
// VehicleRef alone does not identify a bus: some operators publish one
// placeholder code for every bus on a route. A code repeated within a single
// snapshot therefore carries no identity and must never retire a sibling.
assert.match(busSource, /function ingestBatchIndex\(list,now=Date\.now\(\)\)/);
assert.match(busSource, /function retirableVehicleKey\(v,batch\)/);
assert.match(busSource, /return physical&&!batch\.shared\.has\(physical\)\?physical:'';/);
assert.match(busSource, /if\(otherId===v\.id\|\|batch\.ids\.has\(otherId\)\) continue;/);
// ...and the bus that moves on to its next journey must not be left behind as
// a second, frozen row under the identity it was reporting a moment ago.
assert.match(busSource, /if\(physicalVehicleKey\(other\)===physical && Number\(other\.ts\)<=Number\(rec\.ts\)\) S\.vehicles\.delete\(otherId\)/);
// ...and the mirror case: a straggling report must not resurrect an identity
// the bus has already moved on from, beside the newer record.
assert.match(busSource, /function supersededByNewerRecord\(v,batch\)/);
assert.match(busSource, /if\(!prev && supersededByNewerRecord\(v,batch\)\) continue;/);
assert.match(busSource, /function parseLivePayloads\(items,now\)/);
assert.match(busSource, /vehicleRef:f\.VehicleRef\|\|''/);
assert.doesNotMatch(busSource, /const id = f\.VehicleRef \|\| journey/);
assert.match(busSource, /async function fetchLiveBatch\(wide,signal\)/);
assert.match(busSource, /if\(wide\) S\.lastWideFetch=Date\.now\(\)/);
assert.match(busSource, /requested:urls\.length/);
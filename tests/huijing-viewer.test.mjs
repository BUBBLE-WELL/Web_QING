import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, await fs.access(path.join(root, 'web')).then(() => 'web', () => 'h5-static/3d/huijing-huayuan'));
const threeURL = pathToFileURL(path.join(web, 'vendor/three/build/three.module.js')).href;
const THREE = await import(threeURL);
const { MeshoptDecoder } = await import(pathToFileURL(path.join(web, 'vendor/three/examples/jsm/libs/meshopt_decoder.module.js')).href);
const asModule = (s) => `data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const utils = (await fs.readFile(path.join(web, 'vendor/three/examples/jsm/utils/BufferGeometryUtils.js'), 'utf8')).replace("from 'three'", `from '${threeURL}'`);
const loaderCode = (await fs.readFile(path.join(web, 'vendor/three/examples/jsm/loaders/GLTFLoader.js'), 'utf8'))
  .replace("from 'three'", `from '${threeURL}'`).replace("'../utils/BufferGeometryUtils.js'", JSON.stringify(asModule(utils)));
const { GLTFLoader } = await import(asModule(loaderCode));
class LocalLoader extends GLTFLoader {
  async loadAsync(url) {
    const b = await fs.readFile(path.join(web, url));
    return this.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
  }
}
class Element {
  constructor(id) { this.id = id; this.value = id === 'opacity' ? '0.9' : '0'; this.checked = true; this.hidden = false; this.textContent = ''; this.children = []; }
  addEventListener() {} replaceChildren(...children) { this.children = children; }
  getBoundingClientRect() { return { right: 290, bottom: 405 }; }
}
const elements = new Map();
const get = (id) => { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); };
class MapStub {
  constructor() { this.sources = {}; this.layers = {}; this.filters = {}; }
  on() {} addControl() {} triggerRepaint() {} setPadding() {}
  addSource(id, value) { this.sources[id] = { ...value, setData(data) { this.data = data; } }; }
  getSource(id) { return this.sources[id]; }
  addLayer(l) { this.layers[l.id] = l; } getLayer(id) { return this.layers[id]; }
  setFilter(id, filter) { this.filters[id] = filter; }
  getCanvas() { return { clientWidth: 1000, clientHeight: 1000 }; }
}
const context = vm.createContext({ THREE, MeshoptDecoder, GLTFLoader: LocalLoader, console, URLSearchParams,
  location: { search: process.env.HUIJING_SERVICE_TEST === '1' ? '?data=services' : '' }, window: {}, innerWidth: 1440, addEventListener() {}, requestAnimationFrame() {},
  document: { getElementById: get, querySelectorAll: () => [], querySelector: () => get('panel'), createElement: (tag) => new Element(tag) },
  maplibregl: { Map: MapStub, NavigationControl: class {}, ScaleControl: class {} },
  fetch: async (url) => url.startsWith('/api/') ? fetch('http://127.0.0.1:8872' + url) : ({ ok: true, json: async () => JSON.parse(await fs.readFile(path.join(web, url), 'utf8')) })
});
const source = (await fs.readFile(path.join(web, 'main.js'), 'utf8')).replace(/^import .*;\r?\n/gm, '');
assert.ok(!/localStorage|align-tools|dragOn|params.get\('align'\)/.test(source), 'no deployment alignment entry point');
const georef = JSON.parse(await fs.readFile(path.join(web, 'georef.json'), 'utf8'));
assert.equal(georef.origin_lng, 118.74105172242268);
assert.equal(georef.origin_lat, 31.98216367396415);
assert.equal(georef.rotation_deg, 0);
vm.runInContext(source, context);
const run = (s) => vm.runInContext(s, context);
run('geo = '+JSON.stringify(georef)+'; modelLayer.scene = new THREE.Scene(); modelLayer.camera = new THREE.Camera();');
await run('loadBuildings()');
const data = JSON.parse(await fs.readFile(path.join(web, 'assets/buildings.geojson'), 'utf8'));
const plates = JSON.parse(await fs.readFile(path.join(web, 'assets/floorplates.geojson'), 'utf8'));
assert.equal(data.features.length, 80); assert.equal(plates.features.length, 384);
const gids = data.features.flatMap((f) => f.properties.ifc_globalids);
assert.equal(new Set(gids).size, gids.length, 'each IFC slab belongs to one building');
assert.equal(new Set(data.features.map((f) => f.properties.building_id)).size, 80);
for (const b of data.features) {
  assert.equal(b.properties.floors, plates.features.filter((p) => p.properties.building_id === b.properties.building_id).length);
}
const layers = JSON.parse(await fs.readFile(path.join(web, 'assets/layers.json'), 'utf8'));
for (const l of layers) {
  context.layerDefinition = l;
  run('materials[layerDefinition.id] = new THREE.MeshLambertMaterial();');
  await run('ensureLayer(layerDefinition)');
}
assert.equal(run('Object.keys(meshesByBuilding).length'), 80);
assert.equal(run('Object.values(meshesByBuilding).flat().length'), gids.length);
assert.equal(run('Object.values(meshesByBuilding).flat().filter(o => o.name !== o.userData.name).length'), 0);
assert.ok(run("Object.values(meshesByBuilding).flat().every(o => gidToBuilding.get(o.userData.name) === o.userData.buildingId)"));
run("select('B01')");
assert.ok(run("meshesByBuilding.B01.every(o => o.material === highlight)"));
assert.equal(get('info-title').textContent, '建筑 B01');
assert.throws(() => run("select('missing')"), /unknown building/);
assert.equal(run('selected'), 'B01');
run('clear()'); assert.equal(run('selected'), null); assert.equal(get('info').hidden, true);
assert.ok(run("meshesByBuilding.B01.every(o => o.material === materials[o.userData.layer])"));
assert.throws(() => run('setSection(NaN)'), /finite/);
assert.throws(() => run('setVerticalSection(Infinity)'), /finite/);
for (const h of [0, 3.8, 30, 106.4, 113.9, 114]) {
  run(`setSection(${h})`);
  assert.equal(run('clip.distanceToPoint(new THREE.Vector3(0, section - 1, 0))'), 1);
  assert.equal(run('clip.distanceToPoint(new THREE.Vector3(0, section + 1, 0))'), -1);
  const expected = plates.features.filter((p) => p.properties.z0 <= h && p.properties.z1 > h);
  if (h === 114) assert.equal(expected.length, 0, 'roof level is empty');
  assert.equal(run("map.filters['plate-fill'][1][2]"), h);
}
run('setSection(null); setVerticalSection(0)');
for (const deg of [0, 35, -90]) {
  run(`geo.rotation_deg = ${deg}; updateSectionGeometry()`);
  assert.ok(run('Math.abs(verticalClip.distanceToPoint(sectionBoards.children[1].position)) < 1e-7'));
  assert.ok(run('verticalClip.distanceToPoint(new THREE.Vector3(0,0,0).addScaledVector(verticalClip.normal, 10)) > 0'));
}
run('setVerticalSection(null); geo.rotation_deg = 0; updateSectionGeometry();');
// A real ray through the center of a loaded tower must resolve its stable ID.
run(`modelLayer.scene.updateMatrixWorld(true);
  var targetMesh = meshesByBuilding.B01.find(o => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y > 100);
  var target = new THREE.Box3().setFromObject(targetMesh).getCenter(new THREE.Vector3());
  var testCamera = new THREE.OrthographicCamera(-10,10,10,-10,0.1,1000);
  testCamera.position.copy(target).add(new THREE.Vector3(0, 0, 200)); testCamera.lookAt(target); testCamera.updateMatrixWorld(true);
  modelLayer.camera.projectionMatrix.copy(testCamera.projectionMatrix).multiply(testCamera.matrixWorldInverse);`);
assert.equal(run('pick3D({x:500,y:500})'), 'B01');
run('setSection(1)'); assert.equal(run('pick3D({x:500,y:500})'), null, 'clipped tower cannot intercept ray');
run('setSection(null)');
assert.equal(run('queryBuildings({minHeight:60}).length'), 6);
const transformed = run('wgs84ToGcj02([118.742,31.982])');
assert.ok(transformed[0] > 118.742 && transformed[0] < 118.75 && transformed[1] < 31.982);
assert.equal(JSON.stringify(run('wgs84ToGcj02([0,0])')), '[0,0]');
// The large final CAD layer must load only on demand, including rapid toggle/retry.
run('map.setLayoutProperty = (id, key, value) => { map.layers[id].layout[key] = value; };');
const finalDef = JSON.parse(await fs.readFile(path.join(web, 'scene.json'), 'utf8')).groups
  .find((g) => g.id === 'final-plan').items[0];
context.finalDef = finalDef;
context.finalItem = await run('lineItem(finalDef)');
assert.equal(run('map.getSource(finalDef.source)'), undefined, 'disabled final plan does not fetch at boot');
await run('finalItem.setVisible(false)');
const pendingFinal = run('finalItem.setVisible(true)');
await run('finalItem.setVisible(false)');
await pendingFinal;
assert.equal(run('map.getLayer(finalDef.id).layout.visibility'), 'none', 'latest toggle wins while loading');
await run('finalItem.setVisible(true)');
assert.equal(run('map.getLayer(finalDef.id).layout.visibility'), 'visible');
const finalFC = JSON.parse(await fs.readFile(path.join(web, finalDef.source), 'utf8'));
assert.ok(finalFC.features.length > 30000);
assert.ok(finalFC.features.every((f) => Object.keys(f.properties).join() === 'kind'
  && ['design','context','detail'].includes(f.properties.kind)
  && f.geometry.type === 'LineString' && f.geometry.coordinates.length >= 2
  && f.geometry.coordinates.every((p) => p.length === 2 && p.every(Number.isFinite))));
// A failed lazy source can be retried; error handling must not poison the cache.
const originalFetch = context.fetch;
let failures = 0;
context.fetch = async (url) => {
  if (url === 'retry-final.geojson' && failures++ === 0) throw new Error('temporary load failure');
  return originalFetch(url === 'retry-final.geojson' ? finalDef.source : url);
};
context.retryItem = await run("lineItem({...finalDef, id:'retry-final', source:'retry-final.geojson'})");
await assert.rejects(run('retryItem.setVisible(true)'), /temporary load failure/);
await run('retryItem.setVisible(true)');
assert.equal(run("map.getLayer('retry-final').layout.visibility"), 'visible');
context.fetch = originalFetch;
console.log(JSON.stringify({result:'PASS',buildings:data.features.length,storeys:plates.features.length,mappedSlabs:gids.length,
  layers:layers.length,towers:data.features.slice(0,6).map(({properties:p})=>({id:p.building_id,floors:p.floors,height_m:p.height_m,floor_area_m2:p.floor_area_m2}))}, null, 2));

if (process.env.HUIJING_SERVICE_TEST === '1') {
  assert.equal(run('window.huijingViewer.dataSource'), 'geoserver-wfs');
  assert.equal((await run('queryBuildingsRemote({minHeight:100})')).length,6);
  console.log('PASS: real viewer regression with live GeoServer-backed building and floorplate data.');
}

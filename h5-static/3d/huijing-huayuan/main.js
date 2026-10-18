// Huijing site viewer: MapLibre basemap + three.js custom layer for the IFC massing.
// Georeference = project origin (0,0) at origin_lng/lat, project X axis rotated rotation_deg CCW from east.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const STORE_KEY = 'huijing-georef';
const $ = (id) => document.getElementById(id);
const status = (msg) => { $('status').textContent = msg; };

let defaults;
let geo; // stored truth, always WGS-84
// GeoJSON sources by file path: { crs: 'project' | 'wgs84', raw } — re-projected for display on every refresh()
const vectorSources = {};
const pointItems = []; // { features, markers, crs, visible }
const params = new URLSearchParams(location.search);
// ?align=1 shows the georeferencing tools and uses this browser's stored alignment; visitors always get georef.json
const ALIGN = params.get('align') === '1';
// ?basemap=tencent|osm|sat picks the starting basemap (tencent for a mainland-China deployment)
const startBase = params.get('basemap');
let basemap = ['osm', 'sat', 'tencent'].includes(startBase) ? startBase : 'osm';

// ---------- WGS-84 -> GCJ-02 (Tencent tiles) ----------
// Standard GCJ-02 forward transform, same as the Shanghai venue map. geo stays WGS-84; this is render-only.
const outOfChina = (lng, lat) => lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
function gcjLat(x, y) {
  let v = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  v += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  v += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
  return v + (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
}
function gcjLng(x, y) {
  let v = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  v += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  v += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
  return v + (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
}
function wgs84ToGcj02([lng, lat]) {
  if (outOfChina(lng, lat)) return [lng, lat];
  const a = 6378245;
  const ee = 0.006693421622965943;
  const radLat = lat / 180 * Math.PI;
  const magic = 1 - ee * Math.sin(radLat) ** 2;
  const sqrtMagic = Math.sqrt(magic);
  const dLat = gcjLat(lng - 105, lat - 35) * 180 / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  const dLng = gcjLng(lng - 105, lat - 35) * 180 / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  return [lng + dLng, lat + dLat];
}
const isGcj = () => basemap === 'tencent';
// WGS-84 lng/lat -> the datum of the active basemap
const toDisplay = (ll) => (isGcj() ? wgs84ToGcj02(ll) : ll);

// ---------- georeference helpers ----------
function projectToLngLat([x, y]) {
  const t = THREE.MathUtils.degToRad(geo.rotation_deg);
  const e = x * Math.cos(t) - y * Math.sin(t);
  const n = x * Math.sin(t) + y * Math.cos(t);
  const kx = 111320 * Math.cos(THREE.MathUtils.degToRad(geo.origin_lat));
  return [geo.origin_lng + e / kx, geo.origin_lat + n / 110540];
}

function modelMatrix() {
  // GCJ-02 is near-rigid over the 600 m site, so shifting the origin is enough for the model
  const mc = maplibregl.MercatorCoordinate.fromLngLat(toDisplay([geo.origin_lng, geo.origin_lat]), 0);
  const s = mc.meterInMercatorCoordinateUnits();
  return new THREE.Matrix4()
    .makeTranslation(mc.x, mc.y, mc.z)
    .scale(new THREE.Vector3(s, -s, s))
    .multiply(new THREE.Matrix4().makeRotationZ(THREE.MathUtils.degToRad(geo.rotation_deg)))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)); // glTF Y-up -> Z-up
}

// project metres -> WGS-84 via georef, then (per vertex) into the active basemap's datum
const toDisplayCoord = (crs) => (crs === 'project' ? (p) => toDisplay(projectToLngLat(p)) : (p) => toDisplay(p));

function displayFC(raw, crs) {
  const f = toDisplayCoord(crs);
  const map1 = (g) => {
    if (g.type === 'Point') return { type: 'Point', coordinates: f(g.coordinates) };
    if (g.type === 'LineString') return { type: 'LineString', coordinates: g.coordinates.map(f) };
    if (g.type === 'Polygon') return { type: 'Polygon', coordinates: g.coordinates.map((r) => r.map(f)) };
    return g;
  };
  return { type: 'FeatureCollection', features: raw.features.map((ft) => ({ ...ft, geometry: map1(ft.geometry) })) };
}

// ---------- map ----------
// tile.openstreetmap.org and jsdelivr are unreachable from the author's network; OpenFreeMap vector tiles
// (OSM data, WGS-84) and Esri imagery are. Tencent raster tiles (keyless rt0-3.map.gtimg.com, TMS rows) serve
// mainland China; they are GCJ-02, so the model and underlay are shifted into GCJ-02 while that basemap is shown.
// warm-paper palette matching the portfolio (--bg #f8f8f4, --soft #efefea, --border #deded6)
const ROAD = ['match', ['get', 'class'], ['motorway', 'trunk'], '#ecd9ac', ['primary', 'secondary'], '#f4e9cc',
  ['tertiary', 'minor', 'service'], '#ffffff', '#ffffff'];
const OSM_LAYERS = [
  { id: 'osm-bg', type: 'background', paint: { 'background-color': '#f8f8f4' } },
  { id: 'osm-landuse', type: 'fill', source: 'ofm', 'source-layer': 'landuse',
    filter: ['in', ['get', 'class'], ['literal', ['residential', 'commercial', 'industrial', 'railway']]],
    paint: { 'fill-color': '#efefea' } },
  { id: 'osm-park', type: 'fill', source: 'ofm', 'source-layer': 'park', paint: { 'fill-color': '#e4eedd' } },
  { id: 'osm-water', type: 'fill', source: 'ofm', 'source-layer': 'water', paint: { 'fill-color': '#dce7ec' } },
  { id: 'osm-building', type: 'fill', source: 'ofm', 'source-layer': 'building', minzoom: 14,
    paint: { 'fill-color': '#e4e4dc', 'fill-outline-color': '#cfcfc6' } },
  { id: 'osm-road-casing', type: 'line', source: 'ofm', 'source-layer': 'transportation',
    filter: ['!=', ['get', 'class'], 'rail'],
    paint: { 'line-color': '#deded6', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 1, 18, 22] } },
  { id: 'osm-road', type: 'line', source: 'ofm', 'source-layer': 'transportation',
    filter: ['!=', ['get', 'class'], 'rail'],
    paint: { 'line-color': ROAD, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 0.5, 18, 18] } },
  { id: 'osm-rail', type: 'line', source: 'ofm', 'source-layer': 'transportation',
    filter: ['==', ['get', 'class'], 'rail'],
    paint: { 'line-color': '#b3abcf', 'line-width': 1.2, 'line-dasharray': [3, 2] } },
  { id: 'osm-road-label', type: 'symbol', source: 'ofm', 'source-layer': 'transportation_name', minzoom: 14,
    layout: { 'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name:zh'], ['get', 'name']],
      'text-font': ['Noto Sans Regular'], 'text-size': 12 },
    paint: { 'text-color': '#44443f', 'text-halo-color': '#f8f8f4', 'text-halo-width': 1.5 } },
];
const OFM_SOURCE = { type: 'vector', url: 'https://tiles.openfreemap.org/planet',
  attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> © OpenStreetMap contributors' };
// OpenFreeMap is only put in the start style when OSM is the start basemap: map 'load' waits for every source's
// TileJSON, so a blocked openfreemap.org (mainland China) would otherwise stop ?basemap=tencent from ever loading.
const withOsm = basemap === 'osm';
const vis = (id) => ({ visibility: basemap === id ? 'visible' : 'none' });
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      ...(withOsm ? { ofm: OFM_SOURCE } : {}),
      sat: { type: 'raster', tileSize: 256, maxzoom: 19,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        attribution: 'Imagery © Esri' },
      tencent: { type: 'raster', tileSize: 256, maxzoom: 18, scheme: 'tms',
        tiles: [0, 1, 2, 3].map((i) => `https://rt${i}.map.gtimg.com/tile?z={z}&x={x}&y={y}&styleid=1000&scene=0`),
        attribution: '© Tencent 腾讯地图' },
    },
    layers: [
      ...(withOsm ? OSM_LAYERS : OSM_LAYERS.slice(0, 1)),
      { id: 'sat', type: 'raster', source: 'sat', layout: vis('sat') },
      { id: 'tencent', type: 'raster', source: 'tencent', layout: vis('tencent') },
    ],
  },
  center: toDisplay([118.742, 31.982]),
  zoom: 16.2,
  pitch: 55,
  bearing: -15,
  maxPitch: 80,
  antialias: true,
});
window.huijingMap = map; // console handle for debugging
map.on('error', (e) => console.warn('map error:', e.error?.message || e));
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

// ---------- three.js custom layer ----------
const layerGroups = {};
const materials = {};
const modelLayer = {
  id: 'ifc-model',
  type: 'custom',
  renderingMode: '3d',
  onAdd(m, gl) {
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-0.4, 1, 0.6); // glTF space: Y up
    this.scene.add(sun);
    this.renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
    this.renderer.autoClear = false;
  },
  render(gl, matrix) {
    this.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(modelMatrix());
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
  },
};

const loader = new GLTFLoader();

// fetches a layer's GLB once; later calls reuse the same promise
function ensureLayer(l) {
  if (!layerGroups[l.id]) {
    layerGroups[l.id] = loader.loadAsync(`assets/${l.file}`).then((gltf) => {
      gltf.scene.traverse((o) => { if (o.isMesh) o.material = materials[l.id]; });
      modelLayer.scene.add(gltf.scene);
      map.triggerRepaint();
      return gltf.scene;
    });
  }
  return layerGroups[l.id];
}

// ---------- scene: grouped, toggleable layers from scene.json ----------
const fetchJSON = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
});

// one control per renderable item: setVisible(bool) shows/hides it, loading lazily where needed
async function glbItems(def) {
  const layers = await fetchJSON(def.source);
  const lazy = new Set(def.lazy || []);
  return layers.map((l) => {
    // flatShading derives face normals in the shader; the GLBs carry no normals
    materials[l.id] = new THREE.MeshLambertMaterial({ color: l.color, transparent: true, flatShading: true,
      opacity: +$('opacity').value, side: THREE.DoubleSide });
    return {
      label: l.label, color: l.color, count: l.count, on: !lazy.has(l.id),
      async setVisible(v) {
        if (!v && !layerGroups[l.id]) return;
        if (v && !layerGroups[l.id]) status(`加载 ${l.label}…`);
        const scene = await ensureLayer(l);
        scene.visible = v;
        status('');
        map.triggerRepaint();
      },
    };
  });
}

async function vectorSource(path, crs) {
  if (!vectorSources[path]) {
    vectorSources[path] = fetchJSON(path).then((raw) => {
      vectorSources[path] = { crs, raw };
      map.addSource(path, { type: 'geojson', data: displayFC(raw, crs) });
      return vectorSources[path];
    });
  }
  return vectorSources[path];
}

async function lineItem(def) {
  await vectorSource(def.source, def.crs);
  map.addLayer({ id: def.id, type: 'line', source: def.source, ...(def.filter ? { filter: def.filter } : {}),
    layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': def.color, 'line-width': def.width || 1.5 } }, 'ifc-model');
  return { label: def.label, color: def.color, on: def.on !== false,
    setVisible(v) { map.setLayoutProperty(def.id, 'visibility', v ? 'visible' : 'none'); } };
}

// points are HTML markers (dot + label), so they need no glyph server, which may be blocked in China
async function pointItem(def) {
  const raw = await fetchJSON(def.source);
  const item = { crs: def.crs, features: raw.features, markers: [] };
  item.markers = raw.features.map((ft) => {
    const el = document.createElement('div');
    el.className = 'poi';
    el.innerHTML = `<i style="background:${def.color}"></i><span></span>`;
    // short label on the map (nearby exits otherwise overlap); the full one goes in the tooltip
    const full = ft.properties[def.label_field] || '';
    el.querySelector('span').textContent = (def.short_field && ft.properties[def.short_field]) || full;
    el.title = full;
    return new maplibregl.Marker({ element: el, anchor: 'left', offset: [-5, 0] });
  });
  pointItems.push(item);
  return { label: def.label, color: def.color, count: raw.features.length, on: def.on !== false,
    setVisible(v) {
      item.visible = v;
      item.markers.forEach((mk, i) => {
        if (v) mk.setLngLat(toDisplayCoord(item.crs)(item.features[i].geometry.coordinates)).addTo(map);
        else mk.remove();
      });
    } };
}

function itemRow(it, onChange) {
  const row = document.createElement('label');
  row.className = 'row';
  row.innerHTML = `<input type="checkbox"> <span class="sw" style="background:${it.color}"></span><span class="lbl"></span>` +
    (it.count != null ? `<span class="n">${it.count}</span>` : '');
  row.querySelector('.lbl').textContent = it.label;
  const box = row.querySelector('input');
  box.addEventListener('change', () => onChange(box.checked));
  return { row, box };
}

async function buildScene(scene) {
  const host = $('layers');
  const pending = [];
  for (const g of scene.groups) {
    const resolved = [];
    for (const def of g.items) {
      if (def.type === 'glb-set') resolved.push(...await glbItems(def));
      else if (def.type === 'line') resolved.push(await lineItem(def));
      else if (def.type === 'point') resolved.push(await pointItem(def));
      else console.warn('unknown scene item type', def.type);
    }
    if (!resolved.length) continue; // empty groups (data still to come) are not shown

    const wrap = document.createElement('section');
    wrap.className = 'grp';
    const head = document.createElement('div');
    head.className = 'grp-head';
    head.innerHTML = '<label class="row"><input type="checkbox"> <span class="grp-name"></span></label>' +
      '<button type="button" class="grp-toggle" aria-expanded="false"></button>';
    head.querySelector('.grp-name').textContent = g.label;
    const all = head.querySelector('input');
    const caret = head.querySelector('.grp-toggle');
    caret.setAttribute('aria-label', `展开或收起 ${g.label}`);
    const body = document.createElement('div');
    body.className = 'grp-body';
    wrap.append(head, body);
    if (g.attribution) {
      const note = document.createElement('p');
      note.className = 'grp-note';
      note.textContent = g.attribution;
      body.after(note);
    }
    host.appendChild(wrap);

    const rows = [];
    const syncGroup = () => {
      const n = rows.filter((r) => r.box.checked).length;
      all.checked = n === rows.length;
      all.indeterminate = n > 0 && n < rows.length;
    };
    for (const it of resolved) {
      const r = itemRow(it, (v) => { it.setVisible(v); syncGroup(); });
      r.box.checked = g.on !== false && it.on;
      rows.push(r);
      body.appendChild(r.row);
      if (r.box.checked) pending.push(it.setVisible(true));
    }
    all.addEventListener('change', () => {
      rows.forEach((r, i) => { if (r.box.checked !== all.checked) { r.box.checked = all.checked; resolved[i].setVisible(all.checked); } });
      syncGroup();
    });
    const setOpen = (open) => { body.hidden = !open; caret.setAttribute('aria-expanded', String(open)); caret.textContent = open ? '▾' : '▸'; };
    caret.addEventListener('click', () => setOpen(body.hidden));
    setOpen(g.open !== false);
    syncGroup();
  }
  await Promise.all(pending);
}

// ---------- georef UI ----------
function readStored() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; }
}
function store() {
  if (!ALIGN) return;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(geo)); } catch { /* storage unavailable */ }
}

function refresh() {
  $('rot').value = geo.rotation_deg;
  $('rot-num').value = geo.rotation_deg.toFixed(2);
  let txt = `origin ${geo.origin_lat.toFixed(7)}, ${geo.origin_lng.toFixed(7)}\nrotation ${geo.rotation_deg.toFixed(2)}°`;
  if (isGcj()) {
    const [lng, lat] = toDisplay([geo.origin_lng, geo.origin_lat]);
    txt += `\nGCJ 显示 ${lat.toFixed(7)}, ${lng.toFixed(7)}（保存仍为 WGS-84）`;
  }
  $('readout').textContent = txt;
  for (const [path, s] of Object.entries(vectorSources)) {
    if (s.raw && map.getSource(path)) map.getSource(path).setData(displayFC(s.raw, s.crs));
  }
  for (const it of pointItems) {
    if (it.visible) it.markers.forEach((mk, i) => mk.setLngLat(toDisplayCoord(it.crs)(it.features[i].geometry.coordinates)));
  }
  store();
  map.triggerRepaint();
}

function moveMeters(de, dn) {
  if (!geo) return;
  const kx = 111320 * Math.cos(THREE.MathUtils.degToRad(geo.origin_lat));
  geo.origin_lng += de / kx;
  geo.origin_lat += dn / 110540;
  refresh();
}

function setRotation(deg) {
  // rotates about the project origin (0,0), which sits inside the design site
  if (!geo) return;
  geo.rotation_deg = Math.max(-180, Math.min(180, Math.round(deg * 100) / 100));
  refresh();
}

document.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => {
  const [dx, dy] = b.dataset.move.split(',').map(Number);
  const s = +$('step').value;
  moveMeters(dx * s, dy * s);
}));
document.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => setRotation(geo.rotation_deg + +b.dataset.rot)));
$('rot').addEventListener('input', (e) => setRotation(+e.target.value));
$('rot-num').addEventListener('change', (e) => setRotation(+e.target.value));
$('opacity').addEventListener('input', (e) => {
  Object.values(materials).forEach((m) => { m.opacity = +e.target.value; });
  map.triggerRepaint();
});

function setBasemap(value) {
  const wasGcj = isGcj();
  basemap = value;
  if (value === 'osm' && !map.getSource('ofm')) {
    map.addSource('ofm', OFM_SOURCE);
    OSM_LAYERS.slice(1).forEach((l) => map.addLayer(l, 'sat'));
  }
  // hidden layers stop their source from fetching tiles, so OpenFreeMap is not requested under Tencent
  OSM_LAYERS.slice(1).forEach((l) => {
    if (map.getLayer(l.id)) map.setLayoutProperty(l.id, 'visibility', value === 'osm' ? 'visible' : 'none');
  });
  map.setLayoutProperty('sat', 'visibility', value === 'sat' ? 'visible' : 'none');
  map.setLayoutProperty('tencent', 'visibility', value === 'tencent' ? 'visible' : 'none');
  $('sub').textContent = `Archicad IFC → GLB，叠加在 ${isGcj() ? 'GCJ-02（腾讯）' : 'WGS-84'} 底图上`;
  if (wasGcj !== isGcj()) {
    // keep the camera on the same ground: shift it by the local WGS-84 -> GCJ-02 offset
    const c = map.getCenter();
    const [gl, ga] = wgs84ToGcj02([c.lng, c.lat]);
    const s = isGcj() ? 1 : -1;
    map.jumpTo({ center: [c.lng + s * (gl - c.lng), c.lat + s * (ga - c.lat)] });
  }
  if (geo) refresh();
}
document.querySelectorAll('input[name=base]').forEach((r) => r.addEventListener('change', () => {
  if (r.checked) setBasemap(r.value);
}));

// drag-to-move
let dragOn = false;
let dragFrom = null;
$('drag').addEventListener('click', () => {
  dragOn = !dragOn;
  $('drag').classList.toggle('on', dragOn);
  $('drag').textContent = `拖动模型：${dragOn ? '开' : '关'}`;
  if (dragOn) map.dragPan.disable(); else map.dragPan.enable();
  map.getCanvas().style.cursor = dragOn ? 'move' : '';
});
map.on('mousedown', (e) => { if (dragOn) dragFrom = e.lngLat; });
map.on('mousemove', (e) => {
  if (!dragOn || !dragFrom || !geo) return;
  // deltas are taken in the display datum; GCJ-02 is near-rigid locally, so they apply to WGS-84 as-is
  geo.origin_lng += e.lngLat.lng - dragFrom.lng;
  geo.origin_lat += e.lngLat.lat - dragFrom.lat;
  dragFrom = e.lngLat;
  refresh();
});
map.on('mouseup', () => { dragFrom = null; });

$('save').addEventListener('click', () => {
  const out = { ...geo, note: `Aligned by hand in the viewer, ${new Date().toISOString().slice(0, 10)}.` };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  a.download = 'georef.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(geo)); status('已复制到剪贴板'); } catch { status('复制失败，请手动抄写上面的读数'); }
});
$('reset').addEventListener('click', () => { geo = { ...defaults }; refresh(); });

// ---------- boot ----------
map.on('load', async () => {
  try {
    const [g, scene] = await Promise.all([fetchJSON('georef.json'), fetchJSON('scene.json')]);
    defaults = { origin_lng: g.origin_lng, origin_lat: g.origin_lat, rotation_deg: g.rotation_deg };
    const stored = ALIGN ? readStored() : null;
    $('align-tools').hidden = !ALIGN;
    geo = stored && Number.isFinite(stored.origin_lng) ? stored : { ...defaults };

    map.addLayer(modelLayer); // vector layers are inserted beneath it
    document.querySelector(`input[name=base][value=${basemap}]`).checked = true;
    setBasemap(basemap); // syncs the subtitle; no camera shift since the datum is unchanged
    refresh();
    // frame the site in the part of the map the panel doesn't cover
    const panel = document.querySelector('.panel').getBoundingClientRect();
    const padding = innerWidth <= 600 ? { top: panel.bottom } : { left: panel.right };
    map.jumpTo({ center: toDisplay([geo.origin_lng + 0.0012, geo.origin_lat]), padding });
    status('加载模型…');
    await buildScene(scene);
    status(ALIGN ? (stored ? '对准模式：已恢复本浏览器上次的位置' : '对准模式：使用 georef.json') : '');
  } catch (err) {
    console.error(err);
    status(`加载失败：${err.message}`);
  }
});

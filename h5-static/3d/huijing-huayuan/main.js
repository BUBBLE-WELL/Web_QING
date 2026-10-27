// Huijing site viewer: MapLibre basemap + three.js custom layer for the IFC massing.
// Georeference = project origin (0,0) at origin_lng/lat, project X axis rotated rotation_deg CCW from east.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createToolBridge, mountToolPanel } from './tool-actions.js?v=a445520da8a6';
import { mountPoiPanel } from './poi-panel.js?v=0ed5a68eac93';
import { mountGisChat } from './qing-gis.js?v=af6bdbda9da7';
import './workspace-ui.js?v=a2657035015c';
import { mountSpatialAgent, isSpatialSandbox } from './spatial-agent.js?v=0de48ce58b9a';

const $ = (id) => document.getElementById(id);
const status = (msg) => { $('status').textContent = msg; };

let geo; // stored truth, always WGS-84
let viewerReady = false, viewerCatalogHash = null, toolPanel = null, gisChat = null, spatialPanel = null;
// GeoJSON sources by file path: { crs: 'project' | 'wgs84', raw } — re-projected for display on every refresh()
const vectorSources = {};
const pointItems = []; // { features, markers, crs, visible }
const params = new URLSearchParams(location.search);
// ?basemap=tencent|osm|sat picks the starting basemap (tencent for a mainland-China deployment)
const startBase = params.get('basemap');
const useServices = params.get('data') === 'services';
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

let poiFocus = null;
function refreshPoiFocus() {
  if (map.getSource('poi-proximity')) map.getSource('poi-proximity').setData(displayFC(poiFocus || {type:'FeatureCollection',features:[]}, 'wgs84'));
}
function focusPoi(origin, row) {
  const point = (coordinates, role) => ({type:'Feature',properties:{role},geometry:{type:'Point',coordinates}});
  poiFocus = {type:'FeatureCollection',features:[point(origin,'origin'),point(row.coordinates,'entrance'),
    {type:'Feature',properties:{role:'distance'},geometry:{type:'LineString',coordinates:[origin,row.coordinates]}}]};
  if (!map.getSource('poi-proximity')) {
    map.addSource('poi-proximity',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    map.addLayer({id:'poi-distance-guide',type:'line',source:'poi-proximity',filter:['==',['geometry-type'],'LineString'],
      paint:{'line-color':'#8054b0','line-width':2,'line-dasharray':[3,3]}});
    map.addLayer({id:'poi-query-points',type:'circle',source:'poi-proximity',filter:['==',['geometry-type'],'Point'],
      paint:{'circle-radius':7,'circle-color':['match',['get','role'],'origin','#8054b0','#d08a12'],'circle-stroke-color':'#fff','circle-stroke-width':2}});
  }
  refreshPoiFocus();
  const bounds = new maplibregl.LngLatBounds(); [origin,row.coordinates].forEach(ll=>bounds.extend(toDisplay(ll)));
  map.stop();
  map.jumpTo({pitch:0,bearing:0,padding:{top:0,bottom:0,left:0,right:0}});
  map.fitBounds(bounds,{padding:{top:(framePadding.top||0)+30,bottom:(framePadding.bottom||0)+35,left:(framePadding.left||0)+25,right:(framePadding.right||0)+35},pitch:0,bearing:0,maxZoom:17.5,duration:700});
}

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
    if (g.type === 'MultiPolygon') return { type: 'MultiPolygon', coordinates: g.coordinates.map((p) => p.map((r) => r.map(f))) };
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
  // Fractional browser zoom can collapse the shared WebGL drawing buffer during resize.
  // Keep the map/Three.js canvas on a bounded integer pixel grid.
  pixelRatio: Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1))),
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
    this.renderer.localClippingEnabled = true; // section view
  },
  render(gl, matrix) {
    // map matrix × model matrix: model space (glTF, metres) -> clip space; picking inverts the same matrix
    this.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(modelMatrix());
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    if (this.readyPending) {
      this.readyPending = false;
      viewerReady = true;
      toolPanel?.ready();
      gisChat?.ready();
      spatialPanel?.ready();
      window.QingTransition?.ready(); // all initial GLBs are loaded and their first frame is drawn
    }
  },
};

// the Twinmotion render models are meshopt-compressed (EXT_meshopt_compression); the IFC massing GLBs are not
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const extraMaterials = new Set(); // materials of 'gltf' items, so the section planes reach them too

// fetches a layer's GLB once; later calls reuse the same promise
function ensureLayer(l) {
  if (!layerGroups[l.id]) {
    layerGroups[l.id] = loader.loadAsync(`assets/${l.file}`).then((gltf) => {
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.material = materials[l.id];
        o.userData.layer = l.id;
        // GLB nodes are named by IFC GlobalId; buildings.geojson maps GlobalIds to buildings
        // Prefer the original glTF name; future loaders may sanitize Object3D.name.
        // userData.name preserves the original glTF node name.
        const bid = gidToBuilding.get(o.userData.name ?? o.name);
        o.userData.buildingId = bid;
        if (bid) (meshesByBuilding[bid] ||= []).push(o);
      });
      paintSelection();
      modelLayer.scene.add(gltf.scene);
      map.triggerRepaint();
      return gltf.scene;
    }).catch((err) => {
      delete layerGroups[l.id]; // allow retry after a failed lazy-load request
      throw err;
    });
  }
  return layerGroups[l.id];
}

// ---------- scene: grouped, toggleable layers from scene.json ----------
const SERVICE_DATASETS = { 'assets/buildings.geojson': 'buildings',
  'assets/floorplates.geojson': 'floorplates', 'assets/site/metro_entrances.geojson': 'metro_entrances' };
function lngLatToProject([lng, lat]) {
  const e = (lng - geo.origin_lng) * 111320 * Math.cos(geo.origin_lat * Math.PI / 180);
  const n = (lat - geo.origin_lat) * 110540;
  const t = geo.rotation_deg * Math.PI / 180;
  return [e * Math.cos(t) + n * Math.sin(t), -e * Math.sin(t) + n * Math.cos(t)];
}
function serviceToProject(fc) {
  const walk = (a) => typeof a[0] === 'number' ? lngLatToProject(a) : a.map(walk);
  return { ...fc, features: fc.features.map((ft) => ({ ...ft,
    properties: { ...ft.properties, ...(typeof ft.properties.ifc_globalids === 'string'
      ? { ifc_globalids: JSON.parse(ft.properties.ifc_globalids) } : {}) },
    geometry: { ...ft.geometry, coordinates: walk(ft.geometry.coordinates) } })) };
}
async function fetchFeatureJSON(url) {
  const table = useServices && SERVICE_DATASETS[url];
  if (!table) return fetch(url);
  const response = await fetch('/api/' + table);
  if (!response.ok) return response;
  const fc = await response.json();
  if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) throw new Error('Invalid GIS response');
  if (fc.numberMatched != null && Number(fc.numberMatched) > fc.features.length) throw new Error('GIS response truncated');
  return { ok: true, json: async () => table === 'metro_entrances' ? fc : serviceToProject(fc) };
}
async function queryBuildingsRemote(filters = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([,v]) => v != null));
  const response = await fetch('/api/buildings?' + query);
  if (!response.ok) throw new Error('GIS query failed: ' + response.status);
  const fc = await response.json();
  return fc.features.map(({ properties: p }) => ({ building_id:p.building_id, layer:p.layer,
    floors:p.floors, height_m:p.height_m, floor_area_m2:p.floor_area_m2 }));
}

const fetchJSON = (url) => fetchFeatureJSON(url).then((r) => {
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
      opacity: +$('opacity').value, side: THREE.DoubleSide, clippingPlanes: clipPlanes() });
    layerLabels[l.id] = l.label;
    return {
      id: l.id, label: l.label, color: l.color, count: l.count, on: !lazy.has(l.id),
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

// a whole GLB with its own materials (the textured Twinmotion export), in the same project frame as the massing;
// loaded on first show. Not pickable: building selection stays on the IFC massing and the 2D footprints.
function gltfItem(def) {
  let loading = null;
  return {
    id: def.id, label: def.label, color: def.color, count: def.size, on: def.on === true,
    async setVisible(v) {
      if (!v && !loading) return;
      if (!loading) {
        status(`加载 ${def.label}${def.size ? `（${def.size}）` : ''}…`);
        loading = loader.loadAsync(def.source).then((gltf) => {
          gltf.scene.traverse((o) => {
            if (!o.isMesh) return;
            // Lit like the massing (Lambert, flat, double-sided). The glTF PBR materials render almost black here:
            // the model matrix mirrors one axis (scale s, -s, s) inside the projection matrix, which three.js can't
            // see, so their culling and smooth normals come out inverted. Colour, texture and opacity are kept.
            const src = o.material;
            o.material = new THREE.MeshLambertMaterial({ color: src.color, map: src.map, transparent: src.transparent,
              opacity: src.opacity, depthWrite: !src.transparent, side: THREE.DoubleSide, flatShading: true,
              clippingPlanes: clipPlanes() });
            src.dispose();
            extraMaterials.add(o.material);
          });
          modelLayer.scene.add(gltf.scene);
          return gltf.scene;
        }).catch((err) => { loading = null; status(`加载失败：${def.label}`); throw err; });
      }
      const scene = await loading;
      scene.visible = v;
      status('');
      map.triggerRepaint();
    },
  };
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

// ---------- buildings: one selection shared by 3D and 2D ----------
const BUILDINGS = 'assets/buildings.geojson';
const PLATES = 'assets/floorplates.geojson';
const buildings = new Map(); // building_id -> feature (project metres)
const gidToBuilding = new Map(); // IFC GlobalId -> building_id
const meshesByBuilding = {};
const layerLabels = {};
let selected = null;
const highlight = new THREE.MeshLambertMaterial({ color: '#2bb673', flatShading: true, side: THREE.DoubleSide,
  transparent: true, opacity: 0.95 });

async function loadBuildings() {
  const [{ raw }] = await Promise.all([vectorSource(BUILDINGS, 'project'), vectorSource(PLATES, 'project')]);
  for (const ft of raw.features) {
    buildings.set(ft.properties.building_id, ft);
    ft.properties.ifc_globalids.forEach((gid) => gidToBuilding.set(gid, ft.properties.building_id));
  }
  const none = ['==', ['get', 'building_id'], ''];
  const add = (l) => map.addLayer(l, 'ifc-model');
  // transparent hit area: clicks on the ground footprint resolve to the building even where no mesh is drawn
  add({ id: 'bld-hit', type: 'fill', source: BUILDINGS, paint: { 'fill-color': '#000', 'fill-opacity': 0 } });
  add({ id: 'plate-fill', type: 'fill', source: PLATES, filter: none, paint: { 'fill-color': '#d08a12', 'fill-opacity': 0.18 } });
  add({ id: 'plate-line', type: 'line', source: PLATES, filter: none, paint: { 'line-color': '#111111', 'line-width': 1.4 } });
  add({ id: 'bld-sel-fill', type: 'fill', source: BUILDINGS, filter: none, paint: { 'fill-color': '#2bb673', 'fill-opacity': 0.22 } });
  add({ id: 'bld-sel-line', type: 'line', source: BUILDINGS, filter: none, paint: { 'line-color': '#2bb673', 'line-width': 2.6 } });
  const trace = { type: 'FeatureCollection', features: [] };
  vectorSources['section-trace'] = { crs: 'project', raw: trace };
  map.addSource('section-trace', { type: 'geojson', data: trace });
  add({ id: 'section-trace', type: 'line', source: 'section-trace', paint: { 'line-color': '#27728c', 'line-width': 2, 'line-dasharray': [3, 2] } });
  sectionBounds = new THREE.Box3();
  for (const f of raw.features) {
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    polygons.flat(2).forEach(([x, y]) => sectionBounds.expandByPoint(new THREE.Vector3(x, 0, -y)));
  }
  updateClipping();
}

function paintSelection() {
  for (const [bid, meshes] of Object.entries(meshesByBuilding)) {
    meshes.forEach((o) => { o.material = bid === selected ? highlight : materials[o.userData.layer]; });
  }
  if (map.getLayer('bld-sel-fill')) {
    const f = ['==', ['get', 'building_id'], selected || ''];
    map.setFilter('bld-sel-fill', f);
    map.setFilter('bld-sel-line', f);
  }
  map.triggerRepaint();
}

const LAYER_SHORT = { towers: '高层塔楼', midrise: '多层', lowrise: '低层', flat: '单层 / 平台' };
function showCard() {
  const card = $('info');
  if (!selected) { card.hidden = true; return; }
  const p = buildings.get(selected).properties;
  $('info-title').textContent = `建筑 ${p.building_id}`;
  const rows = [
    ['类型', LAYER_SHORT[p.layer] || p.layer],
    ['地上层数', `${p.floors}`],
    ['高度', `${p.height_m.toFixed(1)} m`],
    ['楼板面积合计', `${p.floor_area_m2.toLocaleString('zh-CN')} m²`],
    ['IFC 构件', `${p.ifc_count}`],
  ];
  const dl = $('info-rows');
  dl.replaceChildren(...rows.flatMap(([k, v]) => {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    return [dt, dd];
  }));
  card.hidden = false;
}

function select(id, { fly = false } = {}) {
  if (id != null && !buildings.has(id)) throw new Error(`unknown building ${id}`);
  selected = id ?? null;
  paintSelection();
  showCard();
  if (fly && selected) flyTo(selected);
  return selected;
}
const clear = () => select(null);

function centroidLngLat(id) {
  const g = buildings.get(id).geometry;
  const ring = (g.type === 'Polygon' ? g.coordinates : g.coordinates.flatMap((p) => p))[0];
  const [sx, sy] = ring.reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]);
  return toDisplay(projectToLngLat([sx / ring.length, sy / ring.length]));
}

let framePadding = {};
function updateFramePadding() {
  const rect = (selector) => {
    const node = document.querySelector(selector);
    if (!node || node.hidden) return null;
    const box = node.getBoundingClientRect();
    return box.width && box.height ? box : null;
  };
  const tools = rect('#map-tools'), chat = rect('#spatial-agent'), header = rect('.workspace-header');
  const top = header ? header.bottom + 12 : 12;
  framePadding = innerWidth <= 600
    ? { top: tools ? Math.max(top, tools.bottom + 12) : top, left: 0, right: 0,
        bottom: chat ? Math.max(0, innerHeight - chat.top + 10) : 10 }
    : { top, bottom: 16, left: tools ? tools.right + 16 : 16,
        right: chat ? Math.max(16, innerWidth - chat.left + 16) : 16 };
  map.setPadding(framePadding);
}
addEventListener('resize', () => { if (geo) { map.stop(); updateFramePadding(); } });
addEventListener('huijing-layout-change', () => { if (geo) { map.stop(); updateFramePadding(); } });
function flyTo(target) {
  const center = typeof target === 'string' ? centroidLngLat(target) : toDisplay(target);
  map.flyTo({ center, zoom: Math.max(map.getZoom(), 17.3), padding: framePadding, duration: 900 });
}

// 3D pick: unproject the click through the inverse of (map matrix × model matrix) into model space and raycast
const raycaster = new THREE.Raycaster();
function pick3D(point) {
  if (!modelLayer.camera) return null;
  const c = map.getCanvas();
  const x = (point.x / c.clientWidth) * 2 - 1;
  const y = 1 - (point.y / c.clientHeight) * 2;
  const inv = modelLayer.camera.projectionMatrix.clone().invert();
  const near = new THREE.Vector3(x, y, -1).applyMatrix4(inv);
  const far = new THREE.Vector3(x, y, 1).applyMatrix4(inv);
  raycaster.set(near, far.sub(near).normalize());
  const meshes = [];
  modelLayer.scene.traverseVisible((o) => { if (o.isMesh && o.userData.buildingId) meshes.push(o); });
  // hits above the section plane are cut away; site slab, terrain and walls are not buildings and are seen through
  const hit = raycaster.intersectObjects(meshes, false)
    .find((h) => clipPlanes().every((p) => p.distanceToPoint(h.point) >= -1e-6) && h.object.userData.buildingId);
  return hit ? hit.object.userData.buildingId : null;
}

function pickAt(point) {
  const b3 = pick3D(point);
  if (b3) return { id: b3, from: '3d' };
  const f = map.getLayer('bld-hit') && map.queryRenderedFeatures(point, { layers: ['bld-hit'] })[0];
  return f ? { id: f.properties.building_id, from: '2d' } : null;
}

// ---------- section ----------
let section = null; // metres above ±0.00, or null
const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // keeps y <= constant (glTF Y-up = project z)
let verticalSection = null; // geographic north offset from project origin, metres
const verticalClip = new THREE.Plane();
const clipPlanes = () => [...(section == null ? [] : [clip]), ...(verticalSection == null ? [] : [verticalClip])];
let sectionBoards;
let sectionBounds;

function updateSectionGeometry() {
  if (!geo || !sectionBounds || !modelLayer.scene) return;
  const t = THREE.MathUtils.degToRad(geo.rotation_deg);
  const east = new THREE.Vector3(Math.cos(t), 0, Math.sin(t));
  const north = new THREE.Vector3(Math.sin(t), 0, -Math.cos(t));
  const corners = [];
  for (const x of [sectionBounds.min.x, sectionBounds.max.x]) {
    for (const z of [sectionBounds.min.z, sectionBounds.max.z]) corners.push(new THREE.Vector3(x, 0, z));
  }
  const es = corners.map((p) => p.dot(east));
  const ns = corners.map((p) => p.dot(north));
  const e0 = Math.min(...es) - 10, e1 = Math.max(...es) + 10;
  const n0 = Math.floor(Math.min(...ns)) - 10, n1 = Math.ceil(Math.max(...ns)) + 10;
  $('vertical-section').min = n0;
  $('vertical-section').max = n1;
  if (verticalSection != null) verticalSection = THREE.MathUtils.clamp(verticalSection, n0, n1);
  $('vertical-section').value = verticalSection ?? (n0 + n1) / 2;
  $('vertical-val').textContent = verticalSection == null ? '关' : `${verticalSection.toFixed(1)} m`;
  verticalClip.normal.copy(north).negate();
  verticalClip.constant = verticalSection ?? 0;
  if (!sectionBoards) {
    sectionBoards = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: '#3a96b8', transparent: true, opacity: 0.18,
      side: THREE.DoubleSide, depthWrite: false });
    for (let i = 0; i < 2; i++) {
      const board = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(board.geometry),
        new THREE.LineBasicMaterial({ color: '#27728c', transparent: true, opacity: 0.7 }));
      board.add(edge);
      sectionBoards.add(board);
    }
    modelLayer.scene.add(sectionBoards);
  }
  const [horizontal, vertical] = sectionBoards.children;
  horizontal.visible = section != null;
  horizontal.rotation.x = -Math.PI / 2;
  horizontal.scale.set(sectionBounds.max.x - sectionBounds.min.x + 20, sectionBounds.max.z - sectionBounds.min.z + 20, 1);
  horizontal.position.set((sectionBounds.min.x + sectionBounds.max.x) / 2, section ?? 0,
    (sectionBounds.min.z + sectionBounds.max.z) / 2);
  vertical.visible = verticalSection != null;
  vertical.rotation.y = -t;
  vertical.scale.set(e1 - e0, SECTION_MAX + 10, 1);
  vertical.position.copy(east.clone().multiplyScalar((e0 + e1) / 2)
    .addScaledVector(north, verticalSection ?? 0));
  vertical.position.y = (SECTION_MAX - 10) / 2;
  sectionBoards.visible = $('section-board').checked;
  const projectPoint = (e) => [e * Math.cos(t) + verticalSection * Math.sin(t),
    -e * Math.sin(t) + verticalSection * Math.cos(t)];
  const trace = { type: 'FeatureCollection', features: verticalSection == null ? [] : [{ type: 'Feature',
    properties: {}, geometry: { type: 'LineString', coordinates: [projectPoint(e0), projectPoint(e1)] } }] };
  if (vectorSources['section-trace']) {
    vectorSources['section-trace'].raw = trace;
    map.getSource('section-trace').setData(displayFC(trace, 'project'));
  }
}

function updateClipping() {
  updateSectionGeometry();
  for (const m of [...Object.values(materials), highlight, ...extraMaterials]) {
    m.clippingPlanes = clipPlanes();
    m.needsUpdate = true;
  }
  map.triggerRepaint();
}

function setVerticalSection(n) {
  if (n != null && !Number.isFinite(+n)) throw new TypeError('section position must be finite');
  verticalSection = n == null ? null : +n;
  $('vertical-on').checked = verticalSection != null;
  $('vertical-section').disabled = verticalSection == null;
  updateClipping();
  return verticalSection;
}

function setSection(h) {
  if (h != null && !Number.isFinite(+h)) throw new TypeError('section height must be finite');
  section = h == null ? null : Math.max(0, Math.min(SECTION_MAX, +h));
  clip.constant = section ?? 0;
  updateClipping();
  // 2D: the storey each building is cut through (z0 <= h < z1)
  const f = section == null ? ['==', ['get', 'building_id'], '']
    : ['all', ['<=', ['get', 'z0'], section], ['>', ['get', 'z1'], section]];
  if (map.getLayer('plate-fill')) { map.setFilter('plate-fill', f); map.setFilter('plate-line', f); }
  $('section-on').checked = section != null;
  $('section').disabled = section == null;
  if (section != null) $('section').value = section;
  $('section-val').textContent = section == null ? '关' : `${section.toFixed(1)} m`;
  map.triggerRepaint();
  return section;
}
const SECTION_MAX = 114;

function queryBuildings({ minHeight = -Infinity, maxHeight = Infinity, minFloors = 0, layer } = {}) {
  return [...buildings.values()].map((f) => f.properties)
    .filter((p) => p.height_m >= minHeight && p.height_m <= maxHeight && p.floors >= minFloors && (!layer || p.layer === layer))
    .map(({ building_id, layer: l, floors, height_m, floor_area_m2 }) => ({ building_id, layer: l, floors, height_m, floor_area_m2 }));
}

async function lineItem(def) {
  let ready = null, visible = false;
  const ensure = () => ready ||= vectorSource(def.source, def.crs).then(() => {
    map.addLayer({ id: def.id, type: 'line', source: def.source, ...(def.filter ? { filter: def.filter } : {}),
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': def.color, 'line-width': def.width || 1.5 } }, 'ifc-model');
  }).catch((err) => {
    ready = null;
    if (!vectorSources[def.source]?.raw) delete vectorSources[def.source];
    throw err;
  });
  if (!def.lazy) await ensure();
  return { id: def.id, label: def.label, color: def.color, on: def.on !== false,
    setVisible(v) {
      visible = v;
      if (!v && !ready) return;
      return ensure().then(() => map.setLayoutProperty(def.id, 'visibility', visible ? 'visible' : 'none'));
    } };
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
  return { id: def.id, label: def.label, color: def.color, count: raw.features.length, on: def.on !== false,
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

const itemsById = {}; // scene item / massing layer id -> setter(bool)

async function buildScene(scene) {
  const host = $('layers');
  const pending = [];
  for (const g of scene.groups) {
    const resolved = [];
    for (const def of g.items) {
      if (def.type === 'glb-set') resolved.push(...await glbItems(def));
      else if (def.type === 'line') resolved.push(await lineItem(def));
      else if (def.type === 'point') resolved.push(await pointItem(def));
      else if (def.type === 'gltf') resolved.push(gltfItem(def));
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
      const r = itemRow(it, (v) => { Promise.resolve(it.setVisible(v)).catch((err) => status(`图层加载失败：${err.message}`)); syncGroup(); });
      r.box.checked = g.on !== false && it.on;
      rows.push(r);
      // setLayer() goes through the same checkbox state as a click
      if (it.id) itemsById[it.id] = (v) => { r.box.checked = v; const pending = it.setVisible(v); syncGroup(); return pending; };
      body.appendChild(r.row);
      if (r.box.checked) pending.push(it.setVisible(true));
    }
    all.addEventListener('change', () => {
      rows.forEach((r, i) => { if (r.box.checked !== all.checked) { r.box.checked = all.checked; Promise.resolve(resolved[i].setVisible(all.checked)).catch((err) => status(`图层加载失败：${err.message}`)); } });
      syncGroup();
    });
    const setOpen = (open) => { body.hidden = !open; caret.setAttribute('aria-expanded', String(open)); caret.textContent = open ? '▾' : '▸'; };
    caret.addEventListener('click', () => setOpen(body.hidden));
    setOpen(g.open !== false);
    syncGroup();
  }
  await Promise.all(pending);
}

// ---------- refresh display datum; georeference is fixed by georef.json ----------
function refresh() {
  refreshPoiFocus();
  for (const [path, s] of Object.entries(vectorSources)) {
    if (s.raw && map.getSource(path)) map.getSource(path).setData(displayFC(s.raw, s.crs));
  }
  for (const it of pointItems) {
    if (it.visible) it.markers.forEach((mk, i) => mk.setLngLat(toDisplayCoord(it.crs)(it.features[i].geometry.coordinates)));
  }
  updateSectionGeometry();
  map.triggerRepaint();
}

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

// selection: a click picks in 3D first, then falls back to the 2D footprint; a 2D pick also flies there
map.on('click', (e) => {
  const hit = pickAt(e.point);
  if (!hit) { clear(); return; }
  select(hit.id === selected && hit.from === '3d' ? null : hit.id, { fly: hit.from === '2d' });
});
let hoverQueued = false;
map.on('mousemove', (e) => {
  if (hoverQueued) return;
  hoverQueued = true;
  requestAnimationFrame(() => {
    hoverQueued = false;
    map.getCanvas().style.cursor = pickAt(e.point) ? 'pointer' : '';
  });
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && selected) clear(); });
$('gis-query')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('gis-query-button'); if (button.disabled) return; button.disabled = true;
  const output = $('gis-query-results'); output.textContent = '查询中…';
  try {
    const height = Number($('gis-min-height').value);
    if (!Number.isFinite(height) || height < 0) throw new Error('请输入有效高度');
    const rows = useServices ? await queryBuildingsRemote({ minHeight: height }) : queryBuildings({ minHeight: height });
    output.replaceChildren();
    const label = document.createElement('span'); label.textContent = `${rows.length} 个几何分组：`; output.appendChild(label);
    rows.forEach((row) => { const b = document.createElement('button'); b.type = 'button';
      b.textContent = `${row.building_id} · ${row.height_m} m`; b.addEventListener('click', () => { select(row.building_id); flyTo(row.building_id); });
      output.appendChild(b); });
  } catch (error) { output.textContent = `查询失败：${error.message}`; }
  finally { button.disabled = false; }
});
$('info-fly').addEventListener('click', () => selected && flyTo(selected));
$('info-clear').addEventListener('click', clear);
$('section-on').addEventListener('change', (e) => setSection(e.target.checked ? +$('section').value : null));
$('section').addEventListener('input', (e) => setSection(+e.target.value));
$('vertical-on').addEventListener('change', (e) => setVerticalSection(e.target.checked ? +$('vertical-section').value : null));
$('vertical-section').addEventListener('input', (e) => setVerticalSection(+e.target.value));
$('section-board').addEventListener('change', () => { updateSectionGeometry(); map.triggerRepaint(); });

// ---------- viewer API (roadmap #3: NL tool use calls these, not the DOM) ----------
window.huijingViewer = {
  select: (id) => select(id, { fly: true }),
  clear,
  setSection,
  setVerticalSection,
  setLayer(id, on) {
    if (!itemsById[id]) throw new Error(`unknown layer ${id}; known: ${Object.keys(itemsById).join(', ')}`);
    return itemsById[id](!!on);
  },
  flyTo,
  queryBuildings, queryBuildingsRemote,
  get dataSource() { return useServices ? 'geoserver-wfs' : 'static'; },
  get ready() { return viewerReady; },
  get catalogHash() { return viewerCatalogHash; },
  get selected() { return selected; },
  get section() { return section; },
  get verticalSection() { return verticalSection; },
};

// ---------- boot ----------
map.on('load', async () => {
  try {
    const [g, scene] = await Promise.all([fetchJSON('georef.json'), fetchJSON('scene.json')]);
    geo = Object.freeze({ origin_lng: g.origin_lng, origin_lat: g.origin_lat, rotation_deg: g.rotation_deg });

    map.addLayer(modelLayer); // vector layers are inserted beneath it
    document.querySelector(`input[name=base][value=${basemap}]`).checked = true;
    setBasemap(basemap); // syncs the subtitle; no camera shift since the datum is unchanged
    refresh();
    // frame the site in the part of the map the panel doesn't cover
    updateFramePadding();
    map.jumpTo({ center: toDisplay([geo.origin_lng + 0.0012, geo.origin_lat]), padding: framePadding });
    status('加载模型…');
    if ($('gis-source')) $('gis-source').textContent = useServices ? '数据：GeoServer WFS · PostGIS' : '数据：静态文件';
    await loadBuildings(); // before the GLBs, so their meshes can be mapped to buildings as they load
    const catalogBytes = await (await fetch(BUILDINGS)).arrayBuffer();
    viewerCatalogHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', catalogBytes))]
      .map((byte) => byte.toString(16).padStart(2, '0')).join('');
    setSection(null);
    await buildScene(scene);
    window.huijingTools = createToolBridge(window.huijingViewer);
    if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && $('tool-demo')) {
      document.querySelectorAll('[data-local-tools]').forEach(node => { node.hidden = false; });
      toolPanel = mountToolPanel(window.huijingViewer, window.huijingTools, $('tool-demo'));
      window.huijingPois = mountPoiPanel(window.huijingViewer, $('poi-query'), focusPoi, () => { poiFocus = null; refreshPoiFocus(); });
      gisChat = window.huijingGisChat = mountGisChat(window.huijingViewer, window.huijingTools, $('qing-gis'));
    }
    if ((['localhost','127.0.0.1','[::1]'].includes(location.hostname) || isSpatialSandbox()) && $('spatial-agent')) {
      spatialPanel = mountSpatialAgent(window.huijingViewer, window.huijingTools, $('spatial-agent'));
    }
    if ($('gis-query-button')) $('gis-query-button').disabled = false;
    modelLayer.readyPending = true;
    map.triggerRepaint();
    status('');
  } catch (err) {
    window.QingTransition?.fail();
    console.error(err);
    status(`加载失败：${err.message}`);
  }
});

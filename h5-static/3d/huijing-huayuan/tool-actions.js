// Validated data crosses this boundary; executable model text never does.
const requestId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
const fail = (code) => { const error = new Error(code); error.code = code; throw error; };
const sameKeys = (obj, keys) => obj && !Array.isArray(obj) && typeof obj === 'object'
  && Object.keys(obj).sort().join('|') === [...keys].sort().join('|');

export function createToolBridge(viewer) {
  const seen = new Set();
  let running = false, last = null;
  const result = (request_id, ok, acknowledgements, code = null) => {
    last = { request_id, ok, acknowledgements, error: code ? { code } : null };
    return last;
  };
  function validate(envelope) {
    if (!sameKeys(envelope, ['request_id','ok','results','viewer_actions','catalog_sha256','error'])
        || !requestId(envelope.request_id) || envelope.ok !== true || envelope.error !== null) fail('invalid_envelope');
    if (envelope.catalog_sha256 !== viewer.catalogHash || !/^[a-f0-9]{64}$/.test(envelope.catalog_sha256)) fail('stale_catalog');
    if (!Array.isArray(envelope.results) || !envelope.results.length || envelope.results.length > 8
        || !Array.isArray(envelope.viewer_actions) || envelope.viewer_actions.length > 8) fail('invalid_envelope');
    const catalog = new Map(viewer.queryBuildings().map((row) => [row.building_id, row]));
    const ids = new Set(catalog.keys());
    const normalize = (action) => {
      if (!action || typeof action !== 'object') fail('invalid_action');
      if (action.type === 'show_metro_entrances') {
        if (!sameKeys(action,['type','poi_catalog_sha256','poi_ids']) || !/^[a-f0-9]{64}$/.test(action.poi_catalog_sha256)
          || action.poi_catalog_sha256 !== viewer.metroCatalogHash || !Array.isArray(action.poi_ids)
          || action.poi_ids.length>20 || new Set(action.poi_ids).size!==action.poi_ids.length
          || JSON.stringify([...action.poi_ids].sort())!==JSON.stringify((viewer.metroPois||[]).map(p=>p.poi_id).sort())) fail('stale_poi_catalog');
        return {type:action.type,poi_catalog_sha256:action.poi_catalog_sha256,poi_ids:[...action.poi_ids]};
      }
      if (['select_building','fly_to'].includes(action.type)) {
        if (!sameKeys(action, ['type','building_id']) || !ids.has(action.building_id)) fail('invalid_action');
        return { type: action.type, building_id: action.building_id };
      }
      if (action.type === 'set_section' && sameKeys(action, ['type','height_m'])
          && (action.height_m === null || (typeof action.height_m === 'number'
            && Number.isFinite(action.height_m) && action.height_m >= 0 && action.height_m <= 114))) {
        return { type: action.type, height_m: action.height_m };
      }
      fail('invalid_action');
    };
    const fromResults = [];
    envelope.results.forEach((entry, index) => {
      if (!entry || entry.index !== index || !Array.isArray(entry.building_ids)
          || entry.building_ids.some((id) => !ids.has(id)) || !Array.isArray(entry.viewer_actions)) fail('invalid_result');
      if (entry.tool === 'show_metro_entrances') {
        if (entry.status!=='action_requested' || entry.data_source!=='local-osm-snapshot' || entry.viewer_actions.length!==1
          || !Array.isArray(entry.pois) || entry.pois.length>20 || entry.poi_catalog_sha256!==viewer.metroCatalogHash
          || entry.building_ids.length || entry.pois.length!==(viewer.metroPois||[]).length) fail('invalid_result');
        const own=new Map(viewer.metroPois.map(p=>[p.poi_id,p]));
        if (new Set(entry.pois.map(p=>p.poi_id)).size!==entry.pois.length || entry.pois.some(p=>!own.has(p.poi_id)
          || p.label!==own.get(p.poi_id).label || JSON.stringify(p.coordinates)!==JSON.stringify(own.get(p.poi_id).coordinates))) fail('invalid_result');
        const action=normalize(entry.viewer_actions[0]);
        if (action.type!==entry.tool) fail('invalid_result');
        fromResults.push(action);
      } else if (entry.tool === 'query_buildings') {
        if (entry.status !== 'query_completed' || entry.data_source !== viewer.dataSource
            || entry.viewer_actions.length || !Array.isArray(entry.buildings)
            || entry.buildings.length > 100 || entry.returned !== entry.buildings.length
            || entry.buildings.map((b) => b.building_id).join('|') !== entry.building_ids.join('|')) fail('invalid_result');
        if (new Set(entry.building_ids).size !== entry.building_ids.length || entry.buildings.some((row) =>
          ['layer','floors','height_m','floor_area_m2'].some((key) => row[key] !== catalog.get(row.building_id)?.[key]))) fail('invalid_result');
      } else {
        if (entry.status !== 'action_requested' || entry.data_source !== 'viewer-catalog'
            || entry.viewer_actions.length !== 1) fail('invalid_result');
        const action = normalize(entry.viewer_actions[0]);
        if (entry.tool !== action.type) fail('invalid_result');
        fromResults.push(action);
      }
    });
    const actions = envelope.viewer_actions.map(normalize);
    if (JSON.stringify(actions) !== JSON.stringify(fromResults)) fail('invalid_envelope');
    return actions;
  }
  return {
    get last() { return last; },
    async apply(envelope, { signal } = {}) {
      const rid = requestId(envelope?.request_id) ? envelope.request_id : null;
      const acknowledgements = [];
      let ownsRun = false;
      try {
        if (!viewer.ready) fail('not_ready');
        if (running) fail('busy');
        const actions = validate(envelope);
        if (seen.has(rid)) fail('duplicate_request');
        if (seen.size >= 256) fail('session_limit');
        if (signal?.aborted) fail('cancelled');
        seen.add(rid); running = true; ownsRun = true;
        for (const action of actions) {
          if (signal?.aborted) fail('cancelled');
          if (action.type === 'show_metro_entrances') {
            await viewer.showMetroEntrances();
            if (JSON.stringify([...(viewer.metroShownIds||[])].sort())!==JSON.stringify([...action.poi_ids].sort())) fail('state_mismatch');
            acknowledgements.push({...action,status:'points_confirmed',navigation:'requested'});
          } else if (action.type === 'select_building') {
            await viewer.select(action.building_id);
            if (viewer.selected !== action.building_id) fail('state_mismatch');
            acknowledgements.push({ ...action, status: 'state_confirmed' });
          } else if (action.type === 'fly_to') {
            await viewer.flyTo(action.building_id);
            acknowledgements.push({ ...action, status: 'navigation_requested' });
          } else {
            await viewer.setSection(action.height_m);
            if (viewer.section !== action.height_m) fail('state_mismatch');
            acknowledgements.push({ ...action, status: 'state_confirmed' });
          }
        }
        return result(rid, true, acknowledgements);
      } catch (error) {
        // Actual earlier effects are acknowledged; cancellation never claims browser rollback.
        return result(rid, false, acknowledgements, error.code || 'execution_failed');
      } finally {
        if (ownsRun) running = false;
      }
    },
  };
}

export function mountToolPanel(viewer, bridge, host) {
  const run = host.querySelector('#tool-run'), cancel = host.querySelector('#tool-cancel');
  const status = host.querySelector('#tool-status'), results = host.querySelector('#tool-results');
  let controller = null;
  const messages = { cancelled: '已取消', duplicate_request: '该请求已执行', not_ready: '场景尚未就绪',
    stale_catalog: '数据版本不一致，请刷新页面', busy: '另一个请求仍在执行', service_unavailable: 'GIS 服务不可用',
    invalid_result: '查询来源或结果不一致', invalid_envelope: '工具响应未通过校验' };
  const showError = (code) => messages[code] || '执行失败，请重试';
  host.hidden = false;
  run.addEventListener('click', async () => {
    if (controller) return;
    controller = new AbortController();
    const signal = controller.signal;
    run.disabled = true; cancel.disabled = false; results.replaceChildren();
    status.textContent = '查询至少 100 米的建筑…';
    try {
      const response = await fetch('/api/tools', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: crypto.randomUUID(), calls: [
          { tool: 'query_buildings', arguments: { min_height_m: 100 } },
          { tool: 'select_building', arguments: { building_id: 'B01' } },
          { tool: 'fly_to', arguments: { building_id: 'B01' } },
          { tool: 'set_section', arguments: { height_m: 30 } },
        ] }) });
      const envelope = await response.json();
      if (!response.ok || !envelope.ok) { status.textContent = showError(envelope.error?.code); return; }
      const acknowledgement = await bridge.apply(envelope, { signal });
      if (!acknowledgement.ok) {
        status.textContent = `${showError(acknowledgement.error.code)}；已执行 ${acknowledgement.acknowledgements.length} 个动作`;
        return;
      }
      const query = envelope.results.find((item) => item.tool === 'query_buildings');
      status.textContent = `执行记录 · ${query.data_source === 'static' ? '静态数据' : 'GeoServer WFS'} · ${query.returned} 栋；B01 选择已确认，剖切 30 米，已请求定位`;
      query.buildings.forEach((building) => {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = `${building.building_id} · ${building.height_m} m`;
        button.addEventListener('click', () => viewer.select(building.building_id));
        results.appendChild(button);
      });
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? '已取消' : '本地工具服务不可用，请重试';
    } finally {
      controller = null; run.disabled = !viewer.ready; cancel.disabled = true;
    }
  });
  cancel.addEventListener('click', () => controller?.abort());
  return { ready() { run.disabled = false; status.textContent = '已就绪，可运行固定演示'; } };
}

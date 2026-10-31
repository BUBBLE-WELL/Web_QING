// POI identities never enter the building selection API.
export function mountPoiPanel(viewer, host, focus, clearFocus) {
  const form = host.querySelector('form'), button = host.querySelector('button[type=submit]');
  const output = host.querySelector('[data-poi-results]'), status = host.querySelector('[data-poi-status]');
  const clearButton = host.querySelector('[data-poi-clear]');
  let pending = false, results = new Map(), response = null;
  host.hidden = false;
  function clear() { results.clear(); response = null; output.replaceChildren(); clearFocus(); }
  host.querySelector('[data-poi-clear]').addEventListener('click', () => {
    clear(); status.textContent = '已清除 POI 结果与直线距离示意';
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    const selectedOrigin = form.elements.origin.value === 'selected';
    const origin = selectedOrigin ? viewer.selected : 'site';
    if (!origin) { clear(); status.textContent = '请先在地图或建筑查询中选中一栋建筑'; return; }
    clear(); pending = true; button.disabled = true; clearButton.disabled = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
    status.textContent = '查询已记录的地铁出入口…';
    try {
      const query = new URLSearchParams({origin, radius_m: form.elements.radius.value, limit: '20', category: 'metro_entrance'});
      const http = await fetch('/api/pois?'+query, {signal: controller.signal});
      const data = await http.json();
      if (!http.ok || !data.ok) throw new Error('query_failed');
      response = data;
      status.textContent = `${data.origin.label} · ${data.radius_m} 米内 ${data.returned} 个记录\n仅比较现有 ${data.catalog_count} 个出入口；直线距离，非步行路线。来源：OSM 本地快照，采集日期未记录，现状未核验。`;
      data.results.forEach((row, index) => {
        results.set(row.poi_id, row);
        const card = document.createElement('div'); card.className = 'readout';
        const locate = document.createElement('button'); locate.type = 'button';
        locate.textContent = `${index === 0 ? '记录中最近 · ' : ''}${row.label} · ${Math.round(row.distance_m)} 米`;
        locate.addEventListener('click', () => focus(data.origin.coordinates, results.get(row.poi_id)));
        const note = document.createElement('p'); note.className = 'hint';
        note.textContent = '站名为导出时邻近站点推配；开放状态／无障碍：未知';
        const source = document.createElement('a'); source.textContent = 'OSM 原始对象 ↗';
        source.href = row.source_url; source.target = '_blank'; source.rel = 'noopener noreferrer';
        card.append(locate, note, source); output.appendChild(card);
      });
      if (data.results.length) focus(data.origin.coordinates, data.results[0]);
    } catch (error) {
      clear(); status.textContent = error.name === 'AbortError' ? 'POI 查询超时，请重试' : '本地 POI 查询不可用；请使用支持 /api/pois 的预览服务';
    } finally { clearTimeout(timer); pending = false; button.disabled = false; clearButton.disabled = false; }
  });
  return { get last() { return response; } };
}

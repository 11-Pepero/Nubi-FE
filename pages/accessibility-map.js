const layers = [['opportunities', '참여 기회'], ['facilities', '복지시설'], ['programs', '프로그램']];
const mapWidth = 900;
const mapHeight = 640;
const number = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

export function renderAccessibilityMap(container, { data, escapeText }) {
  const districts = data?.districts ?? [];
  if (!districts.length) {
    container.innerHTML = '<p class="empty">표시할 지역 정보가 없어요.</p>';
    return;
  }
  let selected = data.defaultDistrictId ?? districts[0].id;
  let layer = 'opportunities';
  let zoom = 1;
  const ratios = districts.map(district => district.facilityCount ? district.programCount / district.facilityCount : 0);
  const minRatio = Math.min(...ratios);
  const maxRatio = Math.max(...ratios);

  container.innerHTML = `
    <section class="access-map" aria-label="용인시 지역별 참여 기회">
      <div class="access-map-layers" role="group" aria-label="지도 표시 항목">
        ${layers.map(([key, label]) => `<button type="button" data-layer="${key}" aria-pressed="${key === layer}">${label}</button>`).join('')}
      </div>
      <div class="access-map-viewport">
        <svg class="access-map-svg" viewBox="0 0 ${mapWidth} ${mapHeight}" role="group" aria-label="용인시 3개 구 개략 지도">
          ${districts.map((district, index) => {
            const intensity = maxRatio === minRatio ? 28 : 20 + 52 * (maxRatio - ratios[index]) / (maxRatio - minRatio);
            return `<g class="access-district" data-district="${index}" tabindex="0" role="button" aria-label="${escapeText(district.name)} 상세 보기" aria-pressed="false" style="--area-intensity:${intensity}%">
              <polygon points="${escapeText(district.boundary)}"></polygon>
              <g class="access-markers" aria-hidden="true">
                ${district.facilityPoints.map(([x, y]) => `<rect class="access-facility" x="${Number(x) - 3}" y="${Number(y) - 3}" width="6" height="6" rx="1"></rect>`).join('')}
                ${district.programPoints.map(([x, y]) => `<circle class="access-program" cx="${Number(x)}" cy="${Number(y)}" r="3.5"></circle>`).join('')}
              </g>
              <g class="access-district-label" transform="translate(${Number(district.labelPoint[0])} ${Number(district.labelPoint[1])})" aria-hidden="true">
                <rect x="-62" y="-15" width="124" height="30" rx="15"></rect><text text-anchor="middle" dominant-baseline="central"><tspan>${escapeText(district.name)}</tspan><tspan class="access-label-count" dx="5"></tspan></text>
              </g>
            </g>`;
          }).join('')}
          <polygon class="access-district-outline" aria-hidden="true"></polygon>
        </svg>
      </div>
      <aside class="access-map-panel" aria-label="선택한 지역 상세"></aside>
      <div class="access-map-bottom">
        <div class="access-map-zoom" role="group" aria-label="지도 확대 및 축소"><button type="button" data-zoom="in" aria-label="지도 확대">+</button><button type="button" data-zoom="out" aria-label="지도 축소">−</button></div>
        <div class="access-map-legend" aria-label="지도 범례">
          <span class="access-legend-facility"><i aria-hidden="true"></i>장애인복지시설</span>
          <span class="access-legend-program"><i aria-hidden="true"></i>접근성 정보 있는 프로그램</span>
          <span class="access-legend-scale"><i aria-hidden="true"></i>시설 대비 프로그램이 적을수록 짙어요</span>
        </div>
      </div>
    </section>`;
  const map = container.firstElementChild;
  const svg = map.querySelector('svg');
  const panel = map.querySelector('.access-map-panel');
  const shapes = [...svg.querySelectorAll('[data-district]')];
  const outline = svg.querySelector('.access-district-outline');
  const zoomIn = map.querySelector('[data-zoom="in"]');
  const zoomOut = map.querySelector('[data-zoom="out"]');

  function updateLayer() {
    map.dataset.layer = layer;
    for (const button of map.querySelectorAll('[data-layer]')) {
      button.setAttribute('aria-pressed', String(button.dataset.layer === layer));
    }
    shapes.forEach((shape, index) => {
      const district = districts[index];
      shape.querySelector('.access-label-count').textContent = layer === 'facilities'
        ? `시설 ${number.format(district.facilityCount)}`
        : `프로그램 ${number.format(district.programCount)}`;
    });
  }

  function updateSelection() {
    const district = districts.find(item => item.id === selected);
    shapes.forEach((shape, index) => shape.setAttribute('aria-pressed', String(districts[index].id === selected)));
    outline.setAttribute('points', district?.boundary ?? '');
    panel.hidden = !district;
    if (!district) return;
    const ratio = district.facilityCount ? number.format(district.programCount / district.facilityCount) : '—';
    panel.innerHTML = `
      <header><h2>${escapeText(district.name)}</h2><button type="button" class="icon-button" data-close-map aria-label="지역 상세 닫기">×</button></header>
      <dl class="access-map-stats">
        <div><dt>복지시설</dt><dd>${number.format(district.facilityCount)}곳</dd></div>
        <div><dt>1천명당 시설</dt><dd>${district.facilitiesPerThousand == null ? '—' : number.format(district.facilitiesPerThousand)}</dd></div>
        <div><dt>${data.month ? escapeText(data.month) + '월 ' : ''}프로그램</dt><dd>${number.format(district.programCount)}개</dd></div>
      </dl>
      <p class="access-map-insight">${escapeText(district.summary)} ${district.facilityCount ? `시설 한 곳당 ${ratio}개예요.` : ''}</p>
      <h3>참여 기회가 적은 동네</h3>
      <ul class="access-map-neighborhoods">${district.neighborhoods.map(item => `<li><strong>${escapeText(item.name)}</strong><span>시설 ${number.format(item.facilityCount)}</span><span class="${item.programCount === 0 ? 'access-no-programs' : ''}">프로그램 ${number.format(item.programCount)}</span></li>`).join('') || '<li>등록된 동네 정보가 없어요.</li>'}</ul>
      <a class="pill primary access-map-create" href="#events/new/${encodeURIComponent(district.id)}">이 지역에 행사 올리기</a>`;
  }

  function updateZoom() {
    const width = mapWidth / zoom;
    const height = mapHeight / zoom;
    svg.setAttribute('viewBox', `${(mapWidth - width) / 2} ${(mapHeight - height) / 2} ${width} ${height}`);
    zoomIn.disabled = zoom >= 2;
    zoomOut.disabled = zoom <= 1;
  }

  map.addEventListener('click', event => {
    const layerButton = event.target.closest('button[data-layer]');
    const shape = event.target.closest('[data-district]');
    const zoomButton = event.target.closest('[data-zoom]');
    if (layerButton) {
      layer = layerButton.dataset.layer;
      updateLayer();
    } else if (shape) {
      selected = districts[Number(shape.dataset.district)].id;
      updateSelection();
    } else if (zoomButton) {
      zoom += zoomButton.dataset.zoom === 'in' ? .25 : -.25;
      updateZoom();
    } else if (event.target.closest('[data-close-map]')) {
      const previous = districts.findIndex(district => district.id === selected);
      selected = null;
      updateSelection();
      shapes[previous]?.focus();
    }
  });
  svg.addEventListener('keydown', event => {
    const shape = event.target.closest('[data-district]');
    if (!shape || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    selected = districts[Number(shape.dataset.district)].id;
    updateSelection();
  });
  updateLayer();
  updateSelection();
  updateZoom();
}

/* ============================================================
   MERCI À VOUS — DASHBOARD LOGIC
   Nessuna dipendenza esterna: SVG generati a mano, zero librerie chart.
   ============================================================ */

const state = {
  data: null,
  selectedMonth: null,
  compareMode: 'prev_month', // 'prev_month' | 'prev_year' | 'custom' | 'none'
  customCompareMonth: null,
};

const MONTH_NAMES_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function formatMonthLabel(meseKey) {
  if (!meseKey) return '—';
  const [y, m] = meseKey.split('-');
  return `${MONTH_NAMES_IT[parseInt(m, 10) - 1]} ${y}`;
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '€0';
  return '€' + Math.round(val).toLocaleString('it-IT');
}

function formatNumber(val) {
  if (val === null || val === undefined) return '0';
  return Math.round(val).toLocaleString('it-IT');
}

function formatPct(val, withSign = true) {
  if (val === null || val === undefined || !isFinite(val)) return '—';
  const sign = withSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

function deltaPct(current, previous) {
  if (previous === 0 || previous === null || previous === undefined) return null;
  return ((current - previous) / previous) * 100;
}

/* ============================================================
   COMPARISON MONTH RESOLUTION
   ============================================================ */
function getComparisonMonth() {
  if (state.compareMode === 'none') return null;
  if (state.compareMode === 'custom') return state.customCompareMonth;

  const [y, m] = state.selectedMonth.split('-').map(Number);
  if (state.compareMode === 'prev_month') {
    let py = y, pm = m - 1;
    if (pm === 0) { pm = 12; py -= 1; }
    const key = `${py}-${String(pm).padStart(2, '0')}`;
    return state.data.mesi[key] ? key : null;
  }
  if (state.compareMode === 'prev_year') {
    const key = `${y - 1}-${String(m).padStart(2, '0')}`;
    return state.data.mesi[key] ? key : null;
  }
  return null;
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */
async function init() {
  try {
    const res = await fetch('dati.json');
    state.data = await res.json();
  } catch (e) {
    document.querySelector('main').innerHTML = `<div class="empty-state">
      Impossibile caricare <code>dati.json</code>. Assicurati che il file sia nella stessa cartella di questa dashboard.
    </div>`;
    console.error(e);
    return;
  }

  const months = state.data.mesi_disponibili || Object.keys(state.data.mesi).sort();
  if (months.length === 0) {
    document.querySelector('main').innerHTML = `<div class="empty-state">Nessun dato disponibile.</div>`;
    return;
  }

  state.selectedMonth = months[months.length - 1];

  populatePeriodSelect(months);
  populateCustomCompareSelect(months);
  setupControls();

  document.getElementById('updated-time').textContent = state.data.generato_il || '—';

  render();
}

function populatePeriodSelect(months) {
  const sel = document.getElementById('period-select');
  sel.innerHTML = months.slice().reverse().map(m =>
    `<option value="${m}">${formatMonthLabel(m)}</option>`
  ).join('');
  sel.value = state.selectedMonth;
  sel.addEventListener('change', () => {
    state.selectedMonth = sel.value;
    populateCustomCompareSelect(months);
    render();
  });
}

function populateCustomCompareSelect(months) {
  const sel = document.getElementById('custom-compare-select');
  const available = months.filter(m => m !== state.selectedMonth);
  sel.innerHTML = available.slice().reverse().map(m =>
    `<option value="${m}">${formatMonthLabel(m)}</option>`
  ).join('');
  if (!state.customCompareMonth || !available.includes(state.customCompareMonth)) {
    state.customCompareMonth = available[0] || null;
  }
  sel.value = state.customCompareMonth;
  sel.onchange = () => {
    state.customCompareMonth = sel.value;
    render();
  };
}

function setupControls() {
  const toggle = document.getElementById('compare-toggle');
  toggle.querySelectorAll('button').forEach(btn => {
    if (btn.dataset.mode === state.compareMode) btn.classList.add('active');
    btn.addEventListener('click', () => {
      toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.compareMode = btn.dataset.mode;
      document.getElementById('custom-compare-group').style.display =
        state.compareMode === 'custom' ? 'flex' : 'none';
      render();
    });
  });
}

/* ============================================================
   MAIN RENDER
   ============================================================ */
function render() {
  const cur = state.data.mesi[state.selectedMonth];
  const compareMonth = getComparisonMonth();
  const prev = compareMonth ? state.data.mesi[compareMonth] : null;

  renderVsLabel(compareMonth);
  renderGA4Warning(cur);
  renderKPIs(cur, prev);
  renderRevenueChart();
  renderChannels(cur, prev);
  renderProducts(cur);
  renderLineaChart(cur);
  renderFunnel(cur);
  renderSegments();
  renderAds(cur, prev);
  renderAdsSpendChart();
  renderAdvancedSections();
}

function renderVsLabel(compareMonth) {
  const el = document.getElementById('vs-label');
  if (!compareMonth) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `vs <strong>${formatMonthLabel(compareMonth)}</strong>`;
}

function renderGA4Warning(cur) {
  const pill = document.getElementById('ga4-warning');
  if (cur.funnel && cur.funnel.affidabile === false) {
    pill.classList.add('show');
  } else {
    pill.classList.remove('show');
  }
}

/* ============================================================
   KPI CARDS
   ============================================================ */
function renderKPIs(cur, prev) {
  const cards = [
    {
      label: 'Revenue', value: formatCurrency(cur.revenue), accent: 'navy',
      delta: prev ? deltaPct(cur.revenue, prev.revenue) : null,
    },
    {
      label: 'Ordini', value: formatNumber(cur.ordini), accent: 'navy',
      delta: prev ? deltaPct(cur.ordini, prev.ordini) : null,
    },
    {
      label: 'AOV', value: formatCurrency(cur.aov), accent: 'gold',
      delta: prev ? deltaPct(cur.aov, prev.aov) : null, sub: 'Valore medio ordine',
    },
    {
      label: 'Nuovi clienti', value: formatNumber(cur.nuovi_clienti), accent: 'bordeaux',
      delta: prev ? deltaPct(cur.nuovi_clienti, prev.nuovi_clienti) : null,
      sub: cur.ordini ? `${((cur.nuovi_clienti / cur.ordini) * 100).toFixed(1)}% del totale` : '',
    },
    {
      label: 'Clienti attivi', value: formatNumber(cur.clienti_attivi), accent: 'slate',
      delta: prev ? deltaPct(cur.clienti_attivi, prev.clienti_attivi) : null,
    },
  ];

  document.getElementById('kpi-grid').innerHTML = cards.map(c => `
    <div class="kpi-card" data-accent="${c.accent}">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      ${renderDelta(c.delta)}
      ${c.sub ? `<div class="kpi-sub">${c.sub}</div>` : ''}
    </div>
  `).join('');
}

function renderDelta(delta) {
  if (delta === null || delta === undefined) {
    return `<div class="kpi-delta neutral">— periodo non disponibile</div>`;
  }
  const cls = delta > 0.05 ? 'positive' : delta < -0.05 ? 'negative' : 'neutral';
  const arrow = delta > 0.05 ? '↑' : delta < -0.05 ? '↓' : '→';
  return `<div class="kpi-delta ${cls}">${arrow} ${formatPct(delta)} vs periodo prec.</div>`;
}

/* ============================================================
   REVENUE CHART (bar chart, full history, selected + compare highlighted)
   ============================================================ */
function renderRevenueChart() {
  const months = state.data.mesi_disponibili;
  const compareMonth = getComparisonMonth();
  const svg = document.getElementById('revenue-chart');
  const W = 1400, H = 380, padL = 60, padB = 40, padT = 20, padR = 20;
  const chartW = W - padL - padR, chartH = H - padT - padB;

  const values = months.map(m => state.data.mesi[m].revenue);
  const maxVal = Math.max(...values, 1) * 1.15;
  const barGap = 10;
  const barW = (chartW / months.length) - barGap;

  let bars = '', labels = '', gridLines = '';

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padT + chartH - (chartH / gridSteps) * i;
    const val = (maxVal / gridSteps) * i;
    gridLines += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
    gridLines += `<text x="${padL - 10}" y="${y + 4}" text-anchor="end" class="axis-label">€${Math.round(val / 1000)}k</text>`;
  }

  months.forEach((m, i) => {
    const val = state.data.mesi[m].revenue;
    const barH = (val / maxVal) * chartH;
    const x = padL + i * (barW + barGap);
    const y = padT + chartH - barH;

    let cls = 'muted';
    if (m === state.selectedMonth) cls = 'current';
    else if (m === compareMonth) cls = 'compare';

    bars += `<rect class="bar-rect ${cls}" x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2">
      <title>${formatMonthLabel(m)}: ${formatCurrency(val)}</title>
    </rect>`;

    if (m === state.selectedMonth || m === compareMonth) {
      bars += `<text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" class="bar-value-label">${formatCurrency(val)}</text>`;
    }

    const lbl = formatMonthLabel(m);
    labels += `<text x="${x + barW / 2}" y="${H - padB + 18}" text-anchor="middle" class="axis-label">${lbl.split(' ')[0]} ${lbl.split(' ')[1].slice(2)}</text>`;
  });

  svg.innerHTML = gridLines + bars + labels;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
}

/* ============================================================
   CHANNELS — donut + table
   ============================================================ */
const CHANNEL_COLORS = {
  'Diretto': '#0D1B2E',
  'Meta Ads': '#9DB8DC',
  'Google Ads': '#4A7FB5',
  'Google Merchant': '#7BAE8F',
  'Google Organic': '#2D5C82',
  'Altro': '#C9A961',
  'Altro (Paid)': '#C9A961',
  'Social Organic': '#E4D4A8',
  'Referral': '#8C3F3F',
};
function colorForChannel(name) {
  return CHANNEL_COLORS[name] || '#8E96A3';
}

function renderChannels(cur, prev) {
  const channels = cur.canali || [];
  const total = channels.reduce((s, c) => s + c.revenue, 0);

  const svg = document.getElementById('channel-donut');
  const cx = 110, cy = 110, rOuter = 100, rInner = 62;
  let angle = -90;
  let paths = '';
  channels.forEach(c => {
    const pct = total ? c.revenue / total : 0;
    const sweep = pct * 360;
    const path = describeArc(cx, cy, rOuter, rInner, angle, angle + sweep);
    paths += `<path d="${path}" fill="${colorForChannel(c.canale)}">
      <title>${c.canale}: ${formatCurrency(c.revenue)} (${(pct * 100).toFixed(1)}%)</title>
    </path>`;
    angle += sweep;
  });
  svg.innerHTML = paths;

  document.getElementById('channel-legend').innerHTML = channels.map(c => {
    const pct = total ? (c.revenue / total) * 100 : 0;
    return `<div class="donut-legend-item">
      <span class="legend-swatch" style="background:${colorForChannel(c.canale)}"></span>
      <span>${c.canale}</span>
      <span class="donut-legend-pct">${pct.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const prevByChannel = {};
  if (prev) (prev.canali || []).forEach(c => { prevByChannel[c.canale] = c; });

  document.getElementById('channel-table-body').innerHTML = channels.map(c => {
    const pct = total ? (c.revenue / total) * 100 : 0;
    const prevC = prevByChannel[c.canale];
    const delta = prevC ? deltaPct(c.revenue, prevC.revenue) : null;
    return `<tr>
      <td class="row-label"><span class="dot" style="background:${colorForChannel(c.canale)}"></span>${c.canale}</td>
      <td class="num">${formatNumber(c.ordini)}</td>
      <td class="num">${formatCurrency(c.revenue)}</td>
      <td class="num">${pct.toFixed(1)}%</td>
      <td class="num">${deltaCellHtml(delta)}</td>
    </tr>`;
  }).join('');
}

function deltaCellHtml(delta) {
  if (delta === null || delta === undefined) return `<span style="color:var(--slate-light)">—</span>`;
  const color = delta > 0.05 ? 'var(--positive)' : delta < -0.05 ? 'var(--negative)' : 'var(--slate-light)';
  return `<span style="color:${color}; font-weight:600;">${formatPct(delta)}</span>`;
}

function describeArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, endAngle);
  const endInner = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', startOuter.x, startOuter.y,
    'A', rOuter, rOuter, 0, largeArc, 0, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', rInner, rInner, 0, largeArc, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/* ============================================================
   PRODUCTS
   ============================================================ */
function renderProducts(cur) {
  const products = cur.top_prodotti || [];
  document.getElementById('products-table-body').innerHTML = products.map(p => `
    <tr>
      <td>
        <div>${p.prodotto}</div>
        <div class="linea-tag"><span class="dot" style="background:${colorForLinea(p.linea)}"></span>${p.linea}</div>
      </td>
      <td class="num">${formatNumber(p.qty)}</td>
      <td class="num">${formatCurrency(p.revenue)}</td>
    </tr>
  `).join('') || `<tr><td colspan="3" class="empty-state">Nessun dato prodotto per questo periodo</td></tr>`;
}

const LINEA_COLORS = {
  'Linea Magico': '#0D1B2E',
  'Linea Unico': '#8C3F3F',
  'Linea Aria': '#C9A8A8',
  'Bundle Promo': '#C9A961',
  'Gift Card': '#5B6573',
};
function colorForLinea(name) {
  return LINEA_COLORS[name] || '#8E96A3';
}

function renderLineaChart(cur) {
  const lines = (cur.revenue_per_linea || []).slice().sort((a, b) => a.revenue - b.revenue);
  const svg = document.getElementById('linea-chart');
  const W = 600, H = 280, padL = 130, padR = 70, padT = 10, padB = 10;
  const chartW = W - padL - padR;
  const maxVal = Math.max(...lines.map(l => l.revenue), 1) * 1.1;
  const barH = lines.length ? Math.min(34, (H - padT - padB) / lines.length - 10) : 0;
  const gap = lines.length ? (H - padT - padB) / lines.length : 0;

  let bars = '';
  lines.forEach((l, i) => {
    const y = padT + i * gap + (gap - barH) / 2;
    const w = (l.revenue / maxVal) * chartW;
    bars += `<text x="${padL - 12}" y="${y + barH / 2 + 4}" text-anchor="end" class="axis-label" style="font-size:11px;">${l.linea}</text>`;
    bars += `<rect x="${padL}" y="${y}" width="${w}" height="${barH}" rx="2" fill="${colorForLinea(l.linea)}">
      <title>${l.linea}: ${formatCurrency(l.revenue)}</title>
    </rect>`;
    bars += `<text x="${padL + w + 8}" y="${y + barH / 2 + 4}" class="bar-value-label">${formatCurrency(l.revenue)}</text>`;
  });

  svg.setAttribute('viewBox', `0 0 ${W} ${Math.max(H, lines.length * 44 + 20)}`);
  svg.innerHTML = bars || '';
}

/* ============================================================
   FUNNEL
   ============================================================ */
function renderFunnel(cur) {
  const f = cur.funnel;
  const panel = document.getElementById('funnel-panel');
  const note = document.getElementById('funnel-note');

  if (!f) {
    panel.innerHTML = `<div class="empty-state">Nessun dato funnel GA4 per questo periodo.</div>`;
    note.textContent = '';
    return;
  }

  note.textContent = f.affidabile ? '' : 'Dati indicativi — tracking GA4 non affidabile in questo periodo';

  const steps = [
    { label: 'Articoli visualizzati', value: f.visualizzati, rate: null },
    { label: 'Aggiunti al carrello', value: f.aggiunti_carrello, rate: f.tasso_carrello },
    { label: 'Acquistati', value: f.acquistati, rate: f.tasso_acquisto },
  ];
  const maxVal = Math.max(...steps.map(s => s.value), 1);

  panel.innerHTML = steps.map(s => {
    const pct = Math.max((s.value / maxVal) * 100, s.value > 0 ? 4 : 0);
    return `<div class="funnel-row">
      <div class="funnel-label">${s.label}</div>
      <div class="funnel-bar-track">
        <div class="funnel-bar-fill" style="width:${pct}%"><span>${formatNumber(s.value)}</span></div>
      </div>
      <div class="funnel-rate">${s.rate !== null ? s.rate.toFixed(1) + '%' : ''}</div>
    </div>`;
  }).join('');

  if (!f.affidabile) {
    panel.innerHTML += `<div class="data-flag" style="margin-top:8px;">⚠ dato indicativo, tracking non affidabile</div>`;
  }
}

/* ============================================================
   CUSTOMER SEGMENTS (strategic section)
   ============================================================ */
const SEGMENT_TIERS = {
  'Clienti fedeli top': 'top',
  'Clienti abituali': 'good',
  'Nuovi acquirenti': 'good',
  'Acquisto singolo attivo': 'neutral',
  'Clienti inattivi': 'neutral',
  'Clienti a rischio abbandono': 'risk',
};

function renderSegments() {
  const segments = state.data.segmenti_clienti || [];
  if (segments.length === 0) {
    document.getElementById('segments-grid').innerHTML = `<div class="empty-state">Nessun dato di segmentazione disponibile.</div>`;
    document.getElementById('customer-insight').innerHTML = '';
    return;
  }

  const sorted = segments.slice().sort((a, b) => (b.clienti * b.ltv_medio) - (a.clienti * a.ltv_medio));

  document.getElementById('segments-grid').innerHTML = sorted.map(s => {
    const tier = SEGMENT_TIERS[s.segmento] || 'neutral';
    return `<div class="segment-card" data-tier="${tier}">
      <div class="segment-name">${s.segmento}</div>
      <div class="segment-stats">
        <div>
          <div class="segment-count">${formatNumber(s.clienti)}</div>
          <div class="segment-count-label">clienti</div>
        </div>
        <div class="segment-ltv">
          <div class="segment-ltv-value">${formatCurrency(s.ltv_medio)}</div>
          <div class="segment-ltv-label">LTV medio · freq. ${s.freq_media}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  const top = segments.find(s => s.segmento === 'Clienti fedeli top');
  const singolo = segments.find(s => s.segmento === 'Acquisto singolo attivo');
  const rischio = segments.find(s => s.segmento === 'Clienti a rischio abbandono');

  let insight = '';
  if (top && singolo && singolo.ltv_medio > 0) {
    const moltiplicatore = (top.ltv_medio / singolo.ltv_medio).toFixed(1);
    insight += `I <strong>Clienti fedeli top</strong> valgono <strong>${moltiplicatore}×</strong> il LTV di un cliente all'acquisto singolo (${formatCurrency(top.ltv_medio)} vs ${formatCurrency(singolo.ltv_medio)}). `;
  }
  if (rischio) {
    insight += `${formatNumber(rischio.clienti)} clienti sono classificati "a rischio abbandono" (LTV medio ${formatCurrency(rischio.ltv_medio)}): una campagna di win-back mirata su questo segmento ha probabilità di ritorno più alta di un'acquisizione fredda. `;
  }
  if (singolo) {
    insight += `${formatNumber(singolo.clienti)} clienti hanno fatto un solo acquisto recente: il secondo acquisto è il momento critico per costruire fedeltà — vale la pena testare un flusso post-acquisto dedicato.`;
  }

  document.getElementById('customer-insight').innerHTML = `
    <div class="insight-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
    <div class="insight-text">${insight}</div>
  `;
}

/* ============================================================
   ADS
   ============================================================ */
function renderAds(cur, prev) {
  const meta = cur.meta_ads || {};
  const gads = cur.google_ads || {};
  const prevMeta = prev ? prev.meta_ads : null;
  const prevGads = prev ? prev.google_ads : null;

  document.getElementById('meta-ads-metrics').innerHTML = adMetricsHtml([
    { label: 'Spesa', value: meta.spesa ? formatCurrency(meta.spesa) : '—', accent: 'navy',
      delta: prevMeta ? deltaPct(meta.spesa, prevMeta.spesa) : null },
    { label: 'Risultati', value: (meta.risultati || meta.risultati === 0) ? formatNumber(meta.risultati) : '—', accent: 'navy' },
    { label: 'ROAS', value: meta.roas ? meta.roas.toFixed(2) : '—', accent: 'gold' },
    { label: 'CPA', value: meta.cpa ? formatCurrency(meta.cpa) : '—', accent: 'gold', sub: 'Costo per acquisto' },
  ]);

  document.getElementById('google-ads-metrics').innerHTML = adMetricsHtml([
    { label: 'Spesa', value: gads.spesa ? formatCurrency(gads.spesa) : '—', accent: 'navy',
      delta: prevGads ? deltaPct(gads.spesa, prevGads.spesa) : null },
    { label: 'Click', value: formatNumber(gads.click), accent: 'navy' },
    { label: 'ROAS', value: gads.roas ? gads.roas.toFixed(2) : '—', accent: 'gold' },
    { label: 'Conversioni', value: formatNumber(gads.conversioni), accent: 'gold' },
  ]);
}

function adMetricsHtml(metrics) {
  return metrics.map(m => `
    <div class="ad-metric" data-accent="${m.accent}">
      <div class="ad-metric-label">${m.label}</div>
      <div class="ad-metric-value ${m.value === '—' ? 'dash' : ''}">${m.value}</div>
      ${m.sub ? `<div class="ad-metric-sub">${m.sub}</div>` : ''}
    </div>
  `).join('');
}

function renderAdsSpendChart() {
  const months = state.data.mesi_disponibili;
  const svg = document.getElementById('ads-spend-chart');
  const W = 1400, H = 320, padL = 60, padB = 40, padT = 20, padR = 20;
  const chartW = W - padL - padR, chartH = H - padT - padB;

  const metaVals = months.map(m => (state.data.mesi[m].meta_ads || {}).spesa || 0);
  const gadsVals = months.map(m => (state.data.mesi[m].google_ads || {}).spesa || 0);
  const maxVal = Math.max(...metaVals, ...gadsVals, 1) * 1.15;

  const groupGap = 10;
  const groupW = (chartW / months.length) - groupGap;
  const barW = groupW / 2 - 2;

  let bars = '', labels = '', gridLines = '';
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padT + chartH - (chartH / gridSteps) * i;
    const val = (maxVal / gridSteps) * i;
    gridLines += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
    gridLines += `<text x="${padL - 10}" y="${y + 4}" text-anchor="end" class="axis-label">€${(val / 1000).toFixed(1)}k</text>`;
  }

  months.forEach((m, i) => {
    const groupX = padL + i * (groupW + groupGap);
    const metaH = (metaVals[i] / maxVal) * chartH;
    const gadsH = (gadsVals[i] / maxVal) * chartH;

    bars += `<rect x="${groupX}" y="${padT + chartH - metaH}" width="${barW}" height="${metaH}" fill="#9DB8DC" rx="1">
      <title>${formatMonthLabel(m)} Meta Ads: ${formatCurrency(metaVals[i])}</title>
    </rect>`;
    bars += `<rect x="${groupX + barW + 4}" y="${padT + chartH - gadsH}" width="${barW}" height="${gadsH}" fill="var(--navy-900)" rx="1">
      <title>${formatMonthLabel(m)} Google Ads: ${formatCurrency(gadsVals[i])}</title>
    </rect>`;

    const lbl = formatMonthLabel(m);
    labels += `<text x="${groupX + groupW / 2}" y="${H - padB + 18}" text-anchor="middle" class="axis-label">${lbl.split(' ')[0]} ${lbl.split(' ')[1].slice(2)}</text>`;
  });

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = gridLines + bars + labels;
}

/* ============================================================
   BOOT
   ============================================================ */
init();

/* ============================================================
   SEZIONI AVANZATE (entry level, riacquisto, multilinea, canali quality)
   Dati globali — non dipendono dal mese selezionato
   ============================================================ */

function renderAdvancedSections() {
  const av = state.data.avanzato;
  if (!av) return;
  renderEntryLevel(av.entry_level || []);
  renderRiacquisto(av.riacquisto_prodotto || []);
  renderMultilinea(av.multilinea_combinazioni || [], av.multilinea_kpi || {});
  renderCanaliQuality(av.canali_totale || []);
  renderCanaliTrend();
}

/* --- ENTRY LEVEL --- */
function renderEntryLevel(data) {
  if (!data.length) { document.getElementById('section-entry-level').style.display='none'; return; }

  const maxConv = Math.max(...data.map(d => d.tasso_conversione_2o_acquisto_pct || 0), 1);
  const maxVol = Math.max(...data.map(d => d.volte_come_primo_acquisto || 0), 1);
  const H = 320, padL = 200, padR = 60, padT = 20, padB = 10;
  const chartW = 600 - padL - padR;
  const rows = data.slice(0, 8);
  const barH = Math.min(28, (H - padT - padB) / rows.length - 8);
  const gap = (H - padT - padB) / rows.length;

  let bars = '';
  rows.forEach((d, i) => {
    const y = padT + i * gap + (gap - barH) / 2;
    const wVol = (d.volte_come_primo_acquisto / maxVol) * chartW;
    const wConv = ((d.tasso_conversione_2o_acquisto_pct || 0) / maxConv) * chartW;
    bars += `<rect x="${padL}" y="${y}" width="${wVol}" height="${barH}" fill="var(--cream-dim)" rx="2"/>`;
    bars += `<rect x="${padL}" y="${y}" width="${wConv}" height="${barH}" fill="var(--positive)" rx="2" opacity="0.8"><title>${d.prodotto}: ${d.tasso_conversione_2o_acquisto_pct}%</title></rect>`;
    const name = d.prodotto.length > 28 ? d.prodotto.substring(0,28)+'…' : d.prodotto;
    bars += `<text x="${padL-10}" y="${y+barH/2+4}" text-anchor="end" class="axis-label" style="font-size:11px">${name}</text>`;
    if (wConv > 20) bars += `<text x="${padL+wConv+6}" y="${y+barH/2+4}" class="bar-value-label" style="fill:var(--positive)">${d.tasso_conversione_2o_acquisto_pct}%</text>`;
  });

  const svg = document.getElementById('entry-level-chart');
  svg.innerHTML = bars;
  svg.setAttribute('viewBox', `0 0 600 ${H}`);

  document.getElementById('entry-level-table').innerHTML = data.slice(0,10).map(d => {
    const pct = d.tasso_conversione_2o_acquisto_pct || 0;
    const color = pct >= 40 ? 'var(--positive)' : pct >= 25 ? 'var(--gold)' : 'var(--negative)';
    return `<tr>
      <td>${d.prodotto}</td>
      <td class="num">${formatNumber(d.volte_come_primo_acquisto)}</td>
      <td class="num">${formatNumber(d.clienti_con_secondo_ordine)}</td>
      <td class="num" style="color:${color};font-weight:600">${pct.toFixed(1)}%</td>
      <td class="num">${d.giorni_medi_al_secondo ? Math.round(d.giorni_medi_al_secondo)+'gg' : '—'}</td>
    </tr>`;
  }).join('');
}

/* --- RIACQUISTO --- */
function renderRiacquisto(data) {
  if (!data.length) { document.getElementById('section-riacquisto').style.display='none'; return; }

  const rows = data.slice(0, 8);
  const W = 1200, H = 280, padL = 210, padR = 20, padT = 20, padB = 30;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const maxVal = Math.max(...rows.map(d => d.giorni_medi_riacquisto || 0), 1) * 1.15;
  const barGap = 14;
  const barW = (chartW / rows.length) - barGap;
  const barWHalf = barW / 2 - 2;
  const y0 = padT + chartH;

  let out = '';
  for (let s = 0; s <= 4; s++) {
    const x = padL + (chartW / 4) * s;
    const val = Math.round((maxVal / 4) * s);
    out += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${y0}" stroke="var(--line)" stroke-width="1"/>`;
    out += `<text x="${x}" y="${H}" text-anchor="middle" class="axis-label">${val}gg</text>`;
  }

  rows.forEach((d, i) => {
    const gx = padL + i * (barW + barGap);
    const hm = ((d.giorni_medi_riacquisto || 0) / maxVal) * chartH;
    const hmed = ((d.giorni_mediani_riacquisto || 0) / maxVal) * chartH;
    out += `<rect x="${gx}" y="${y0-hm}" width="${barWHalf}" height="${hm}" fill="var(--navy-700)" rx="1"><title>${d.prodotto} — media: ${d.giorni_medi_riacquisto}gg</title></rect>`;
    out += `<rect x="${gx+barWHalf+4}" y="${y0-hmed}" width="${barWHalf}" height="${hmed}" fill="var(--gold)" rx="1"><title>${d.prodotto} — mediana: ${d.giorni_mediani_riacquisto}gg</title></rect>`;
    const name = d.prodotto.length > 22 ? d.prodotto.substring(0,22)+'…' : d.prodotto;
    out += `<text x="${gx+barW/2}" y="${H-padB+16}" text-anchor="middle" class="axis-label" style="font-size:10px">${name}</text>`;
    out += `<text x="${gx+barWHalf/2}" y="${y0-hm-6}" text-anchor="middle" class="bar-value-label" style="font-size:10px">${d.giorni_medi_riacquisto}gg</text>`;
  });

  // legenda
  out += `<rect x="${padL}" y="${H-12}" width="10" height="10" fill="var(--navy-700)" rx="2"/>`;
  out += `<text x="${padL+14}" y="${H-2}" class="axis-label">Media</text>`;
  out += `<rect x="${padL+70}" y="${H-12}" width="10" height="10" fill="var(--gold)" rx="2"/>`;
  out += `<text x="${padL+84}" y="${H-2}" class="axis-label">Mediana</text>`;

  const svg = document.getElementById('riacquisto-chart');
  svg.innerHTML = out;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
}

/* --- MULTILINEA KPI + TABELLA --- */
function renderMultilinea(combos, kpi) {
  document.getElementById('pct-multilinea').textContent = (kpi.pct_multilinea || 0).toFixed(1) + '%';
  document.getElementById('n-multilinea').textContent = formatNumber(kpi.clienti_multilinea || 0);
  document.getElementById('tot-clienti-multilinea').textContent = formatNumber(kpi.totale_clienti || 0);

  document.getElementById('multilinea-table').innerHTML = combos.slice(0, 8).map(c => `
    <tr>
      <td>
        <div style="font-size:12.5px">${c.combo}</div>
        <div style="font-size:10.5px;color:var(--slate-light)">${c.n_linee} line${c.n_linee === 1 ? 'a' : 'e'}</div>
      </td>
      <td class="num">${formatNumber(c.n_clienti)}</td>
      <td class="num">${formatCurrency(c.revenue_media_cliente)}</td>
      <td class="num">${(c.ordini_medi_cliente||0).toFixed(1)}</td>
    </tr>`).join('');
}

/* --- CANALI QUALITY --- */
function renderCanaliQuality(canali) {
  document.getElementById('canali-quality-table').innerHTML = canali.map(c => {
    const roas = c.roas_totale != null ? c.roas_totale.toFixed(2)+'×' : '—';
    const roasColor = c.roas_totale != null ? (c.roas_totale >= 3 ? 'var(--positive)' : c.roas_totale >= 1.5 ? 'var(--gold)' : 'var(--negative)') : 'var(--slate-light)';
    const riacqColor = (c.tasso_riacquisto_pct||0) >= 25 ? 'var(--positive)' : (c.tasso_riacquisto_pct||0) >= 15 ? 'var(--gold)' : 'var(--slate-light)';
    const multiColor = (c.pct_multilinea||0) >= 25 ? 'var(--positive)' : (c.pct_multilinea||0) >= 15 ? 'var(--gold)' : 'var(--slate-light)';
    return `<tr>
      <td class="row-label"><span class="dot" style="background:${colorForChannel(c.canale)}"></span>${c.canale}</td>
      <td class="num">${formatCurrency(c.revenue_totale)}</td>
      <td class="num" style="color:${roasColor};font-weight:600">${roas}</td>
      <td class="num" style="color:${riacqColor};font-weight:600">${(c.tasso_riacquisto_pct||0).toFixed(1)}%</td>
      <td class="num" style="color:${multiColor};font-weight:600">${(c.pct_multilinea||0).toFixed(1)}%</td>
    </tr>`;
  }).join('');
}

/* ============================================================
   TREND CANALI MENSILE
   ============================================================ */

const _canaliTrendState = { active: new Set() };

function renderCanaliTrend() {
  const av = state.data.avanzato;
  if (!av || !av.canali_mensile || !av.canali_mensile.length) {
    const sec = document.getElementById('section-canali-trend');
    if (sec) sec.style.display = 'none';
    return;
  }

  const data = av.canali_mensile;
  const canali = [...new Set(data.map(d => d.canale))].sort((a, b) => {
    const totA = data.filter(d => d.canale === a).reduce((s, d) => s + (d.revenue || 0), 0);
    const totB = data.filter(d => d.canale === b).reduce((s, d) => s + (d.revenue || 0), 0);
    return totB - totA;
  });

  // inizializza filtri attivi (top 4 canali per default)
  if (_canaliTrendState.active.size === 0) {
    canali.slice(0, 4).forEach(c => _canaliTrendState.active.add(c));
  }

  // costruisci filtri pill
  const filterEl = document.getElementById('canali-trend-filters');
  filterEl.innerHTML = canali.map(c => {
    const col = colorForChannel(c);
    const isActive = _canaliTrendState.active.has(c);
    return `<button class="canale-filter-pill ${isActive ? 'active' : ''}"
      data-canale="${c}"
      style="${isActive ? `background:${col};border-color:${col}` : ''}"
      onclick="toggleCanaleTrend('${c}')">
      <span class="pill-dot" style="background:${isActive ? 'rgba(255,255,255,0.7)' : col}"></span>
      ${c}
    </button>`;
  }).join('');

  // legenda
  const legendEl = document.getElementById('canali-trend-legend');
  legendEl.innerHTML = [..._canaliTrendState.active].map(c => `
    <div class="legend-item">
      <span class="legend-swatch" style="background:${colorForChannel(c)}"></span>
      ${c}
    </div>`).join('');

  // grafico a linee
  const mesi = [...new Set(data.map(d => d.mese))].sort();
  const activeCanali = canali.filter(c => _canaliTrendState.active.has(c));

  const W = 1400, H = 360, padL = 70, padR = 20, padT = 30, padB = 40;
  const chartW = W - padL - padR, chartH = H - padT - padB;

  let maxVal = 0;
  activeCanali.forEach(c => {
    mesi.forEach(m => {
      const row = data.find(d => d.canale === c && d.mese === m);
      if (row && row.revenue > maxVal) maxVal = row.revenue;
    });
  });
  maxVal = maxVal * 1.15 || 1;

  let out = '';

  // griglia
  for (let s = 0; s <= 5; s++) {
    const y = padT + chartH - (chartH / 5) * s;
    const val = (maxVal / 5) * s;
    out += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
    out += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" class="axis-label">€${Math.round(val / 1000)}k</text>`;
  }

  // etichette mesi asse X
  const barW = chartW / mesi.length;
  mesi.forEach((m, i) => {
    const x = padL + i * barW + barW / 2;
    const lbl = formatMonthLabel(m);
    out += `<text x="${x}" y="${H - padB + 18}" text-anchor="middle" class="axis-label">${lbl.split(' ')[0]} ${lbl.split(' ')[1].slice(2)}</text>`;
  });

  // linee per canale
  activeCanali.forEach(c => {
    const col = colorForChannel(c);
    const points = mesi.map((m, i) => {
      const row = data.find(d => d.canale === c && d.mese === m);
      const val = row ? (row.revenue || 0) : 0;
      const x = padL + i * barW + barW / 2;
      const y = padT + chartH - (val / maxVal) * chartH;
      return `${x},${y}`;
    }).join(' ');

    out += `<polyline points="${points}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;

    // punti + tooltip
    mesi.forEach((m, i) => {
      const row = data.find(d => d.canale === c && d.mese === m);
      const val = row ? (row.revenue || 0) : 0;
      const x = padL + i * barW + barW / 2;
      const y = padT + chartH - (val / maxVal) * chartH;
      out += `<circle cx="${x}" cy="${y}" r="4" fill="${col}" stroke="white" stroke-width="1.5">
        <title>${c} · ${formatMonthLabel(m)}: ${formatCurrency(val)}</title>
      </circle>`;
    });
  });

  const svg = document.getElementById('canali-trend-chart');
  svg.innerHTML = out;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
}

function toggleCanaleTrend(canale) {
  if (_canaliTrendState.active.has(canale)) {
    if (_canaliTrendState.active.size > 1) _canaliTrendState.active.delete(canale);
  } else {
    _canaliTrendState.active.add(canale);
  }
  renderCanaliTrend();
}

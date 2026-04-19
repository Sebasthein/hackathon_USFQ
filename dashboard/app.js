// RAW_DATA is injected by data.js (no server required)

const ACCIONES = {
    Alto_Declive: 'Ofrecer Crédito Pichincha',
    Alto_Inactivo: 'Campaña Reactivación',
    Medio: 'Enviar Email Engagement',
    Bajo: 'Monitoreo Pasivo'
};

const SEMAFORO_COLOR = {
    Alto_Declive: 'red',
    Alto_Inactivo: 'orange',
    Medio: 'yellow',
    Bajo: 'green'
};

const RIESGO_ORDEN = { Alto_Declive: 0, Alto_Inactivo: 1, Medio: 2, Bajo: 3 };

const TIPO_MAP = {
    'Restaurante / Comida': 'Restaurante',
    'Supermercado / Abarrotes': 'Supermercado',
    'Salud / Farmacia': 'Farmacia',
    'Retail / Tienda': 'Tienda',
    'Servicios Profesionales': 'Servicios',
    'Construcción / Ferretería': 'Construcción',
    'Tecnología': 'Tecnología',
    'Transporte': 'Transporte',
    'Educación': 'Educación',
    'Belleza / Estética': 'Belleza'
};

function generarMotivo(row) {
    const r = row.segmento_riesgo;
    const peakRatio = parseFloat(row.peak_to_current_ratio) || 0;
    const months = parseInt(row.months_below_avg) || 0;
    const days = parseInt(row.days_since_last_txn) || 0;
    const ief = parseFloat(row.ief) || 0;
    const pct = Math.round((1 - peakRatio) * 100);

    if (r === 'Alto_Declive') {
        return `Volumen cayó ${pct}% vs su mejor mes. ${months} mes(es) consecutivos bajo su promedio histórico. IEF: ${ief.toFixed(2)}. Candidato a microcrédito Banco Pichincha.`;
    } else if (r === 'Alto_Inactivo') {
        return `Sin transacciones hace ${days} días. Posible migración a canal alternativo. Acción: campaña de reactivación + soporte proactivo.`;
    } else if (r === 'Medio') {
        return `Señales tempranas de desenganche. Frecuencia descendente en últimos 30 días. Seguimiento preventivo recomendado.`;
    }
    return `Métricas estables. Sin riesgo inmediato de abandono. Incluir en campaña general de engagement.`;
}

function calcularBreaks(volumes) {
    const sorted = [...volumes].sort((a, b) => a - b);
    const n = sorted.length;
    return [
        sorted[Math.floor(n * 0.2)],
        sorted[Math.floor(n * 0.4)],
        sorted[Math.floor(n * 0.6)],
        sorted[Math.floor(n * 0.8)]
    ];
}

function asignarQuintil(vol, breaks) {
    if (vol <= breaks[0]) return 'Quintil 5';
    if (vol <= breaks[1]) return 'Quintil 4';
    if (vol <= breaks[2]) return 'Quintil 3';
    if (vol <= breaks[3]) return 'Quintil 2';
    return 'Quintil 1';
}

// ── Parse RAW_DATA ────────────────────────────────────────────────────────────
const volumes = RAW_DATA.map(r => parseFloat(r.total_volume_last30) || 0);
const breaks = calcularBreaks(volumes);

let allData = RAW_DATA.map(r => ({
    id: r.merchant_id,
    nombre: r.usuario,
    ciudad: r.ciudad,
    nivel: r.nivel_deuna,
    tipo: TIPO_MAP[r.tipo_negocio] || r.tipo_negocio,
    tipo_raw: r.tipo_negocio,
    riesgo: r.segmento_riesgo,
    s_color: SEMAFORO_COLOR[r.segmento_riesgo] || 'green',
    accion: ACCIONES[r.segmento_riesgo] || 'Monitoreo Pasivo',
    razon: generarMotivo(r),
    quintil: asignarQuintil(parseFloat(r.total_volume_last30) || 0, breaks),
    cac: parseFloat(r.cac) || 0,
    coc: parseFloat(r.costo_mantenimiento_mensual) || 0,
    revenue: parseFloat(r.revenue_mensual) || 0,
    ief: parseFloat(r.ief) || 0,
    churned: parseInt(r.churned_next30) || 0,
    lat: parseFloat(r.latitud),
    lng: parseFloat(r.longitud),
    num_quejas: parseInt(r.num_quejas) || 0,
    volume_last30: parseFloat(r.total_volume_last30) || 0
}));

// Sort: risk priority first, then IEF descending
allData.sort((a, b) => {
    const d = RIESGO_ORDEN[a.riesgo] - RIESGO_ORDEN[b.riesgo];
    return d !== 0 ? d : b.ief - a.ief;
});

let activeFilters = { nivel: 'all', negocio: 'all', riesgo: 'all', ciudad: 'all' };
let chartInst1 = null, chartInst2 = null;
let currentPage = 1;
const itemsPerPage = 8;
let mapInstance = null;
let mapMarkers = [];

// ── KPIs ──────────────────────────────────────────────────────────────────────
function updateKPIs(data) {
    if (!data.length) return;
    const avgCac = (data.reduce((s, r) => s + r.cac, 0) / data.length).toFixed(1);
    const avgCoc = (data.reduce((s, r) => s + r.coc, 0) / data.length).toFixed(1);
    const realChurn = (data.filter(r => r.churned === 1).length / data.length * 100).toFixed(1);
    const predChurn = (data.filter(r => r.riesgo === 'Alto_Declive' || r.riesgo === 'Alto_Inactivo').length / data.length * 100).toFixed(1);

    document.getElementById('kpi-cac').innerText = `${avgCac} USD`;
    document.getElementById('kpi-coc').innerText = `${avgCoc} USD`;
    document.getElementById('kpi-real-churn').innerText = `${realChurn} %`;
    document.getElementById('kpi-pred-churn').innerText = `${predChurn} %`;
}

// ── Table ─────────────────────────────────────────────────────────────────────
function renderTable(data, resetPage = true) {
    if (resetPage) currentPage = 1;
    const tbody = document.querySelector('#intervention-table tbody');
    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No se encontraron comercios con esos filtros</td></tr>`;
        document.getElementById('results-count').innerText = 'Mostrando 0 comercios';
        renderPagination(0, 0);
        return;
    }

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const slice = data.slice(startIdx, startIdx + itemsPerPage);

    slice.forEach(item => {
        const riesgoTexto = item.riesgo.replace('_', ' – ');
        const riskClass = item.riesgo.startsWith('Alto') ? 'alto' : (item.riesgo === 'Medio' ? 'medio' : 'bajo');
        tbody.innerHTML += `
            <tr>
                <td><div class="badge ${item.s_color}" title="${riesgoTexto}"></div></td>
                <td><strong>${item.nombre}</strong><br><small style="color:#888;">${item.quintil}</small></td>
                <td>${item.ciudad}</td>
                <td>${item.nivel}</td>
                <td>
                    <span class="tag ${riskClass}">${riesgoTexto}</span><br>
                    <small style="color:#777;margin-top:4px;display:inline-block">${item.tipo}</small>
                </td>
                <td><button class="action-btn">${item.accion}</button></td>
                <td><div style="max-width:250px;line-height:1.4;">${item.razon}</div></td>
            </tr>`;
    });

    document.getElementById('results-count').innerText = `Mostrando ${data.length} comercio(s) totales`;
    renderPagination(data.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
    const container = document.getElementById('pagination-controls');
    if (!container) return;
    if (totalItems <= itemsPerPage) { container.innerHTML = ''; return; }

    let html = `<span class="page-info">Página ${currentPage} de ${totalPages}</span>`;
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="window.goToPage(${currentPage - 1})">Anterior</button>`;

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.goToPage(${currentPage + 1})">Siguiente</button>`;
    container.innerHTML = html;
}

window.goToPage = (page) => { currentPage = page; applyFilters(false); };

// ── Filters ───────────────────────────────────────────────────────────────────
function applyFilters(resetPage = true) {
    const filtered = allData.filter(item =>
        (activeFilters.nivel === 'all' || item.nivel === activeFilters.nivel) &&
        (activeFilters.negocio === 'all' || item.tipo === activeFilters.negocio) &&
        (activeFilters.riesgo === 'all' || item.riesgo === activeFilters.riesgo) &&
        (activeFilters.ciudad === 'all' || item.ciudad === activeFilters.ciudad)
    );

    updateKPIs(filtered);
    updateCharts(filtered);
    updateMapMarkers(filtered);
    renderTable(filtered, resetPage);
    if (chartInst1) chartInst1.update();
    if (chartInst2) chartInst2.update();
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        const ft = e.target.getAttribute('data-filter');
        const fv = e.target.getAttribute('data-val');
        document.querySelectorAll(`.filter-btn[data-filter="${ft}"]`).forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeFilters[ft] = fv;
        applyFilters();
    });
});

const citySelect = document.getElementById('city-select');
if (citySelect) citySelect.addEventListener('change', e => { activeFilters.ciudad = e.target.value; applyFilters(); });

// ── Charts ────────────────────────────────────────────────────────────────────
function getQuintilData(data) {
    const sums = { 'Quintil 1': 0, 'Quintil 2': 0, 'Quintil 3': 0, 'Quintil 4': 0, 'Quintil 5': 0 };
    const counts = { ...sums };
    data.forEach(r => { sums[r.quintil] += r.volume_last30; counts[r.quintil]++; });
    return ['Quintil 1', 'Quintil 2', 'Quintil 3', 'Quintil 4', 'Quintil 5'].map(q =>
        counts[q] ? Math.round(sums[q] / counts[q]) : 0
    );
}

const CHART_TIPOS = ['Restaurante', 'Supermercado', 'Farmacia', 'Tienda', 'Servicios', 'Construcción', 'Tecnología', 'Transporte', 'Educación', 'Belleza'];

function getQuejasByTipo(data) {
    const counts = Object.fromEntries(CHART_TIPOS.map(t => [t, 0]));
    data.forEach(r => { if (counts[r.tipo] !== undefined) counts[r.tipo] += r.num_quejas; });
    return CHART_TIPOS.map(t => counts[t]);
}

function updateCharts(data) {
    if (chartInst1) chartInst1.data.datasets[0].data = getQuintilData(data);
    if (chartInst2) chartInst2.data.datasets[0].data = getQuejasByTipo(data);
}

function initCharts() {
    Chart.defaults.font.family = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    Chart.defaults.color = '#555';

    chartInst1 = new Chart(document.getElementById('chart1').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Quintil 1', 'Quintil 2', 'Quintil 3', 'Quintil 4', 'Quintil 5'],
            datasets: [{
                label: 'Vol. Promedio ($)',
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#3a285c', '#57447d', '#7a5fa0', '#9e84c0', '#c4aadf'],
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
        }
    });

    chartInst2 = new Chart(document.getElementById('chart2').getContext('2d'), {
        type: 'pie',
        data: {
            labels: CHART_TIPOS,
            datasets: [{
                data: CHART_TIPOS.map(() => 0),
                backgroundColor: ['#3a285c','#57447d','#00c49a','#5bc483','#7a5fa0','#9e84c0','#c4aadf','#d4e8e0','#e8c4d4','#a7a7a7'],
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} quejas` }
                }
            },
            onClick: (_event, elements) => {
                if (!elements.length) return;
                const clicked = CHART_TIPOS[elements[0].index];
                activeFilters.negocio = activeFilters.negocio === clicked ? 'all' : clicked;
                document.querySelectorAll('.filter-btn[data-filter="negocio"]').forEach(b => b.classList.remove('active'));
                const btn = document.querySelector(`.filter-btn[data-val="${activeFilters.negocio}"][data-filter="negocio"]`);
                if (btn) btn.classList.add('active');
                applyFilters();
            }
        }
    });
}

// ── Map ───────────────────────────────────────────────────────────────────────
function initMap() {
    mapInstance = L.map('heatmap', { zoomControl: true, attributionControl: false }).setView([-1.8312, -78.1834], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 12 }).addTo(mapInstance);
}

function updateMapMarkers(data) {
    if (!mapInstance) return;
    mapMarkers.forEach(m => mapInstance.removeLayer(m));
    mapMarkers = [];

    data.forEach(item => {
        if (isNaN(item.lat) || isNaN(item.lng)) return;
        const isHigh = item.riesgo.startsWith('Alto');
        const color = isHigh ? '#e53e3e' : (item.riesgo === 'Medio' ? '#d69e2e' : '#00c49a');
        const marker = L.circleMarker([item.lat, item.lng], {
            radius: isHigh ? 6 : 4,
            fillColor: color,
            color: '#fff',
            weight: 0.8,
            fillOpacity: 0.85
        }).bindTooltip(`<strong>${item.nombre}</strong><br>${item.ciudad} · ${item.riesgo.replace('_', ' ')}`, { direction: 'top' });
        marker.addTo(mapInstance);
        mapMarkers.push(marker);
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────
initCharts();
initMap();
applyFilters(true);

// RAW_DATA injected by data.js — real XGBoost predictions (5,000 stratified sample from 64,374)

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

function generarMotivo(row) {
    const r = row.riesgo;
    const prob = Math.round(parseFloat(row.porcentaje_xgboost) * 100);
    const delay = parseInt(row.payment_delay) || 0;
    const calls = parseInt(row.support_calls) || 0;
    const freq = parseInt(row.usage_frequency) || 0;
    const ief = parseFloat(row.ief) || 0;

    if (r === 'Alto_Declive') {
        return `Prob. abandono: ${prob}%. Retraso de pago: ${delay} días. ${calls} llamada(s) de soporte. IEF: ${ief.toFixed(2)}. Perfil de estrés financiero — candidato a microcrédito Banco Pichincha.`;
    } else if (r === 'Alto_Inactivo') {
        return `Prob. abandono: ${prob}%. Frecuencia de uso: ${freq} transacciones. Sin retraso financiero significativo. Posible migración a canal alternativo — campaña de reactivación.`;
    } else if (r === 'Medio') {
        return `Prob. abandono: ${prob}%. Señales tempranas: retraso ${delay} días, ${calls} soporte(s). Seguimiento preventivo antes de que escale a riesgo alto.`;
    }
    return `Prob. abandono: ${prob}%. Métricas estables. Frecuencia de uso: ${freq} transacciones. Sin riesgo inmediato.`;
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
    tipo: r.tipo_negocio,
    riesgo: r.segmento_riesgo,
    s_color: SEMAFORO_COLOR[r.segmento_riesgo] || 'green',
    accion: ACCIONES[r.segmento_riesgo] || 'Monitoreo Pasivo',
    razon: generarMotivo({
        riesgo: r.segmento_riesgo,
        porcentaje_xgboost: r.porcentaje_xgboost,
        payment_delay: r.payment_delay,
        support_calls: r.support_calls,
        usage_frequency: r.usage_frequency,
        ief: r.ief
    }),
    quintil: asignarQuintil(parseFloat(r.total_volume_last30) || 0, breaks),
    cac: parseFloat(r.cac) || 0,
    coc: parseFloat(r.costo_mantenimiento_mensual) || 0,
    revenue: parseFloat(r.revenue_mensual) || 0,
    ief: parseFloat(r.ief) || 0,
    churned: parseInt(r.churned_next30) || 0,
    ganancia: parseFloat(r.ganancia) || 0,
    tenure: parseFloat(r.tenure) || 0,
    lat: parseFloat(r.latitud),
    lng: parseFloat(r.longitud),
    num_quejas: parseInt(r.num_quejas) || 0,
    volume_last30: parseFloat(r.total_volume_last30) || 0,
    prob: parseFloat(r.porcentaje_xgboost) || 0
}));

// Sort: risk priority first, then churn probability descending
allData.sort((a, b) => {
    const d = RIESGO_ORDEN[a.riesgo] - RIESGO_ORDEN[b.riesgo];
    return d !== 0 ? d : b.prob - a.prob;
});

let activeFilters = { nivel: 'all', negocio: 'all', riesgo: 'all', ciudad: 'all', quintil: 'all' };
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

    const avgGanancia = (data.reduce((s, r) => s + r.ganancia, 0) / data.length).toFixed(2);
    const avgTenure = Math.round(data.reduce((s, r) => s + r.tenure, 0) / data.length);

    document.getElementById('kpi-cac').innerText = `${avgCac} USD`;
    document.getElementById('kpi-coc').innerText = `${avgCoc} USD`;
    document.getElementById('kpi-real-churn').innerText = `${realChurn} %`;
    document.getElementById('kpi-pred-churn').innerText = `${predChurn} %`;
    document.getElementById('kpi-ganancia').innerText = `${avgGanancia} USD`;
    document.getElementById('kpi-tenure').innerText = `${avgTenure} meses`;
}

// ── Table ─────────────────────────────────────────────────────────────────────
function renderTable(data, resetPage = true) {
    if (resetPage) currentPage = 1;
    const tbody = document.querySelector('#intervention-table tbody');
    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No se encontraron comercios con esos filtros</td></tr>`;
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
        const probPct = Math.round(item.prob * 100);
        tbody.innerHTML += `
            <tr>
                <td><div class="badge ${item.s_color}" title="${riesgoTexto}"></div></td>
                <td><strong>${item.nombre}</strong><br><small style="color:#888;">${item.quintil} · ${probPct}% prob.</small></td>
                <td>${item.ciudad}</td>
                <td>${item.nivel}</td>
                <td>
                    <span class="tag ${riskClass}">${riesgoTexto}</span>
                </td>
                <td><div style="max-width:350px;line-height:1.4;">${item.razon}</div></td>
            </tr>`;
    });

    document.getElementById('results-count').innerText = `Mostrando ${data.length} comercio(s)`;
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
    const filtered = allData.filter(item => {
        let matchRiesgo = activeFilters.riesgo === 'all' || item.riesgo === activeFilters.riesgo || (activeFilters.riesgo === 'Alto' && item.riesgo.startsWith('Alto'));
        
        return (activeFilters.nivel === 'all' || item.nivel === activeFilters.nivel) &&
               (activeFilters.negocio === 'all' || item.tipo === activeFilters.negocio) &&
               matchRiesgo &&
               (activeFilters.ciudad === 'all' || item.ciudad === activeFilters.ciudad) &&
               (activeFilters.quintil === 'all' || item.quintil === activeFilters.quintil);
    });

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
const CHART_TIPOS = ['Tienda', 'Farmacia', 'Ferreteria', 'Restaurante', 'Otros'];

function getQuintilData(data) {
    const sums = { 'Quintil 1': 0, 'Quintil 2': 0, 'Quintil 3': 0, 'Quintil 4': 0, 'Quintil 5': 0 };
    const counts = { ...sums };
    data.forEach(r => { sums[r.quintil] += r.volume_last30; counts[r.quintil]++; });
    return ['Quintil 1', 'Quintil 2', 'Quintil 3', 'Quintil 4', 'Quintil 5'].map(q =>
        counts[q] ? Math.round(sums[q] / counts[q]) : 0
    );
}

function getQuejasByTipo(data) {
    const counts = Object.fromEntries(CHART_TIPOS.map(t => [t, 0]));
    data.forEach(r => { if (counts[r.tipo] !== undefined) counts[r.tipo] += r.num_quejas; });
    return CHART_TIPOS.map(t => counts[t]);
}

function updateCharts(data) {
    if (chartInst1) {
        // Ignorar su propio filtro para no colapsar la barra a un solo elemento al dar click
        const barData = allData.filter(item => {
            let mRiesgo = activeFilters.riesgo === 'all' || item.riesgo === activeFilters.riesgo || (activeFilters.riesgo === 'Alto' && item.riesgo.startsWith('Alto'));
            return (activeFilters.nivel === 'all' || item.nivel === activeFilters.nivel) &&
                   (activeFilters.negocio === 'all' || item.tipo === activeFilters.negocio) &&
                   mRiesgo &&
                   (activeFilters.ciudad === 'all' || item.ciudad === activeFilters.ciudad);
        });
        chartInst1.data.datasets[0].data = getQuintilData(barData);
        chartInst1.update();
    }
    
    if (chartInst2) {
        // El pastel recalcula sus tamaños dinámicamente según los demás filtros (ej: Región/Ciudad),
        // pero IGNORA su propio filtro de 'negocio' para evitar llenarse 100% de esa sección al darle clic.
        const pieData = allData.filter(item => {
            let mRiesgo = activeFilters.riesgo === 'all' || item.riesgo === activeFilters.riesgo || (activeFilters.riesgo === 'Alto' && item.riesgo.startsWith('Alto'));
            return (activeFilters.nivel === 'all' || item.nivel === activeFilters.nivel) &&
                   mRiesgo &&
                   (activeFilters.ciudad === 'all' || item.ciudad === activeFilters.ciudad) &&
                   (activeFilters.quintil === 'all' || item.quintil === activeFilters.quintil);
        });
        
        chartInst2.data.datasets[0].data = getQuejasByTipo(pieData);
        chartInst2.update(); // Fuerza repintar para aplicar proporciones y la lógica visual de opacidad
    }
}

function initCharts() {
    Chart.defaults.font.family = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    Chart.defaults.color = '#555';

    chartInst1 = new Chart(document.getElementById('chart1').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Quintil 1', 'Quintil 2', 'Quintil 3', 'Quintil 4', 'Quintil 5'],
            datasets: [{
                label: 'Gasto Promedio ($)',
                data: [0, 0, 0, 0, 0],
                backgroundColor: (context) => {
                    const baseColors = ['#3a285c', '#57447d', '#7a5fa0', '#9e84c0', '#c4aadf'];
                    if (activeFilters.quintil === 'all') return baseColors[context.dataIndex];
                    const labels = ['Quintil 1', 'Quintil 2', 'Quintil 3', 'Quintil 4', 'Quintil 5'];
                    return labels[context.dataIndex] === activeFilters.quintil ? '#00c49a' : '#cecece';
                },
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            onClick: (_event, elements) => {
                if (!elements.length) return;
                const labels = ['Quintil 1', 'Quintil 2', 'Quintil 3', 'Quintil 4', 'Quintil 5'];
                const clicked = labels[elements[0].index];
                
                // Toggle logica
                activeFilters.quintil = activeFilters.quintil === clicked ? 'all' : clicked;
                applyFilters();
            }
        }
    });

    chartInst2 = new Chart(document.getElementById('chart2').getContext('2d'), {
        type: 'pie',
        data: {
            labels: CHART_TIPOS,
            datasets: [{
                data: CHART_TIPOS.map(() => 0),
                backgroundColor: (context) => {
                    const baseColors = ['#3a285c', '#57447d', '#00c49a', '#5bc483', '#a7a7a7'];
                    if (activeFilters.negocio === 'all') return baseColors[context.dataIndex];
                    return CHART_TIPOS[context.dataIndex] === activeFilters.negocio ? baseColors[context.dataIndex] : '#cecece';
                },
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} quejas` } }
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
    mapInstance = L.map('heatmap', { zoomControl: true, attributionControl: false }).setView([-1.4, -78.8], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 12 }).addTo(mapInstance);
}

function updateMapMarkers(data) {
    if (!mapInstance) return;
    mapMarkers.forEach(m => mapInstance.removeLayer(m));
    mapMarkers = [];

    // Limit map markers to 2000 for performance
    const display = data.length > 2000
        ? [...data].sort((a,b) => b.prob - a.prob).slice(0, 2000)
        : data;

    display.forEach(item => {
        if (isNaN(item.lat) || isNaN(item.lng)) return;
        const isHigh = item.riesgo.startsWith('Alto');
        const color = isHigh ? '#e53e3e' : (item.riesgo === 'Medio' ? '#d69e2e' : '#00c49a');
        const marker = L.circleMarker([item.lat, item.lng], {
            radius: isHigh ? 5 : 3,
            fillColor: color,
            color: '#fff',
            weight: 0.5,
            fillOpacity: 0.8
        }).bindTooltip(
            `<strong>${item.nombre}</strong><br>${item.ciudad} · ${Math.round(item.prob*100)}% prob.<br>${item.riesgo.replace('_',' ')}`,
            { direction: 'top' }
        );
        marker.addTo(mapInstance);
        mapMarkers.push(marker);
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────
initCharts();
initMap();
applyFilters(true);

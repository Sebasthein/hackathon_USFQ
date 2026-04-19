import streamlit as st
import pandas as pd
import plotly.graph_objects as go

# ── Configuración de página ───────────────────────────────────────────────────
st.set_page_config(
    page_title="Deuna — Churn Dashboard",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ── Paleta de colores Deuna ───────────────────────────────────────────────────
PURPLE_DARK  = "#1a0a3d"
PURPLE_MID   = "#2d1b5e"
PURPLE_LIGHT = "#6b4fa0"
MINT         = "#00c49a"
MINT_LIGHT   = "#00e5b5"
WHITE        = "#ffffff"
BG           = "#f4f2f8"
GRAY_LIGHT   = "#e8e4f0"

# ── CSS global ────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  /* ── Fondo blanco global ── */
  html, body {{
    font-family: 'Inter', sans-serif !important;
    background-color: #ffffff !important;
  }}
  .stApp,
  [data-testid="stAppViewContainer"],
  [data-testid="stMain"],
  [data-testid="block-container"],
  [data-testid="stVerticalBlock"],
  .main, .element-container {{
    background-color: #ffffff !important;
  }}

  /* ── Color de texto base: púrpura oscuro sobre blanco ── */
  .stApp {{
    color: {PURPLE_DARK} !important;
  }}

  /* Streamlit genera texto en <p> dentro de stMarkdown */
  .stMarkdown p,
  .stMarkdown span {{
    color: {PURPLE_DARK} !important;
    font-weight: 500;
  }}

  /* Títulos de sección personalizados */
  .section-title, .filter-title, .deuna-logo {{
    color: {PURPLE_DARK} !important;
  }}

  /* Radio buttons — texto legible */
  [data-testid="stRadio"] > label,
  [data-testid="stRadio"] label > div > p,
  [data-testid="stRadio"] label span {{
    color: {PURPLE_DARK} !important;
    font-size: 13px !important;
    font-weight: 500 !important;
  }}

  /* Selectbox — texto legible */
  [data-testid="stSelectbox"] > label,
  [data-baseweb="select"] [data-testid="stMarkdownContainer"] p,
  [data-baseweb="select"] span {{
    color: {PURPLE_DARK} !important;
    font-size: 13px !important;
    font-weight: 500 !important;
  }}
  div[data-baseweb="select"] > div {{
    background-color: #f4f2f8 !important;
    border-color: {PURPLE_LIGHT} !important;
    color: {PURPLE_DARK} !important;
  }}

  /* Tabla / dataframe */
  [data-testid="stDataFrame"] * {{
    color: {PURPLE_DARK} !important;
    font-size: 12px !important;
  }}

  .block-container {{ padding: 1.2rem 2rem 1rem 2rem; max-width: 100%; }}
  header {{ visibility: hidden; }}
  #MainMenu {{ visibility: hidden; }}
  footer {{ visibility: hidden; }}

  /* KPI cards — colores forzados con !important para no ser sobreescritos */
  .kpi-dark {{
    background: {PURPLE_DARK} !important;
    border-radius: 14px;
    padding: 18px 24px;
    min-height: 90px;
  }}
  .kpi-mint {{
    background: {MINT} !important;
    border-radius: 14px;
    padding: 18px 24px;
    min-height: 90px;
  }}
  .kpi-dark .kpi-value, .kpi-dark .kpi-label {{
    color: #ffffff !important;
  }}
  .kpi-mint .kpi-value, .kpi-mint .kpi-label {{
    color: {PURPLE_DARK} !important;
  }}
  .kpi-value {{
    font-size: 2rem !important;
    font-weight: 800 !important;
    line-height: 1.1;
    margin: 0;
  }}
  .kpi-label {{
    font-size: 0.80rem !important;
    font-weight: 700 !important;
    opacity: 1 !important;
    margin: 0;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }}

  /* Logo */
  .deuna-logo {{
    font-size: 2.2rem !important;
    font-weight: 900 !important;
    color: {PURPLE_DARK} !important;
    letter-spacing: -1px;
    text-align: right;
    padding-top: 8px;
  }}
  .deuna-logo span {{ color: {MINT} !important; }}

  /* Section titles */
  .section-title {{
    font-size: 0.72rem !important;
    font-weight: 700 !important;
    color: {PURPLE_DARK} !important;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: {PURPLE_DARK};
    margin-bottom: 6px;
    margin-top: 2px;
  }}

  /* Filter pill buttons */
  .filter-title {{
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: {PURPLE_DARK};
    margin-bottom: 8px;
    margin-top: 14px;
  }}

  /* Chart card container */
  .chart-card {{
    background: {WHITE};
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 14px;
    box-shadow: 0 2px 8px rgba(26,10,61,0.07);
  }}

  /* Streamlit selectbox styling */
  div[data-baseweb="select"] > div {{
    border-radius: 10px !important;
    border-color: {PURPLE_LIGHT} !important;
  }}

  /* Divider */
  hr {{ border: none; border-top: 1px solid {GRAY_LIGHT}; margin: 10px 0; }}
</style>
""", unsafe_allow_html=True)


# ── Carga de datos ────────────────────────────────────────────────────────────
@st.cache_data
def load_data():
    df = pd.read_csv("../data/deuna_merchants_ecuador.csv")
    return df

df_full = load_data()


# ══════════════════════════════════════════════════════════════════════════════
# HEADER — Logo + KPIs
# ══════════════════════════════════════════════════════════════════════════════
col_logo, col_k1, col_k2, col_k3, col_k4 = st.columns([2, 1.2, 1.2, 1.2, 1.2])

with col_logo:
    st.markdown('<div class="deuna-logo">deuna<span>!</span></div>', unsafe_allow_html=True)

cac_avg  = df_full["cac"].mean()
coc_avg  = df_full["costo_mantenimiento_mensual"].mean()
churn_real = df_full["churned_next30"].mean() * 100
ief_avg  = df_full["ief"].mean() * 100

with col_k1:
    st.markdown(f"""
    <div class="kpi-dark">
      <p class="kpi-value">${cac_avg:.1f}</p>
      <p class="kpi-label">CAC</p>
    </div>""", unsafe_allow_html=True)

with col_k2:
    st.markdown(f"""
    <div class="kpi-dark">
      <p class="kpi-value">${coc_avg:.1f}</p>
      <p class="kpi-label">COC</p>
    </div>""", unsafe_allow_html=True)

with col_k3:
    st.markdown(f"""
    <div class="kpi-mint">
      <p class="kpi-value">{churn_real:.1f} %</p>
      <p class="kpi-label">Real Churn</p>
    </div>""", unsafe_allow_html=True)

with col_k4:
    st.markdown(f"""
    <div class="kpi-mint">
      <p class="kpi-value">{ief_avg:.1f} %</p>
      <p class="kpi-label">Estrés Financiero</p>
    </div>""", unsafe_allow_html=True)

st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# FILTROS (sidebar derecha — columna derecha del layout)
# ══════════════════════════════════════════════════════════════════════════════
col_left, col_center, col_right = st.columns([1.6, 2.6, 1.1])

with col_right:
    st.markdown('<div class="filter-title">Filtro 1 — Nivel Deuna</div>', unsafe_allow_html=True)
    nivel_sel = st.radio(
        "", ["Todos", "Bronce", "Silver", "Gold"],
        label_visibility="collapsed", key="nivel"
    )

    st.markdown('<div class="filter-title">Filtro 2 — Segmento de Riesgo</div>', unsafe_allow_html=True)
    seg_options = ["Todos", "Alto - Declive Financiero", "Alto - Inactivo", "Medio", "Bajo"]
    seg_sel = st.radio(
        "", seg_options,
        label_visibility="collapsed", key="segmento"
    )

    st.markdown('<div class="filter-title">Filtro 3 — Ciudad</div>', unsafe_allow_html=True)
    ciudades = ["Todas"] + sorted(df_full["ciudad"].unique().tolist())
    ciudad_sel = st.selectbox("", ciudades, label_visibility="collapsed")

# Aplicar filtros
df = df_full.copy()
if nivel_sel != "Todos":
    df = df[df["nivel_deuna"] == nivel_sel]
if seg_sel != "Todos":
    df = df[df["segmento_riesgo"] == seg_sel]
if ciudad_sel != "Todas":
    df = df[df["ciudad"] == ciudad_sel]


# ══════════════════════════════════════════════════════════════════════════════
# COLUMNA IZQUIERDA — Quintiles + Quejas
# ══════════════════════════════════════════════════════════════════════════════
with col_left:

    # ── Gasto por Quintil ──────────────────────────────────────────────────
    st.markdown('<div class="section-title">Gasto por Quintil de Ingresos (USD)</div>', unsafe_allow_html=True)

    df["quintil"] = pd.qcut(df["cantidad_dinero_usd"], q=5,
                             labels=["Quintil 5", "Quintil 4", "Quintil 3", "Quintil 2", "Quintil 1"])
    quintil_data = df.groupby("quintil", observed=True)["cantidad_dinero_usd"].mean().reset_index()
    quintil_data.columns = ["Quintil", "Gasto Promedio"]

    fig_quintil = go.Figure(go.Bar(
        x=quintil_data["Gasto Promedio"],
        y=quintil_data["Quintil"],
        orientation="h",
        marker_color=PURPLE_DARK,
        text=quintil_data["Gasto Promedio"].apply(lambda v: f"${v:,.0f}"),
        textposition="outside",
        textfont=dict(color=PURPLE_DARK, size=11, family="Inter"),
    ))
    fig_quintil.update_layout(
        margin=dict(l=0, r=50, t=4, b=4),
        height=200,
        paper_bgcolor="white",
        plot_bgcolor="white",
        xaxis=dict(showticklabels=False, showgrid=False, zeroline=False),
        yaxis=dict(tickfont=dict(size=11, color=PURPLE_DARK, family="Inter")),
    )
    st.plotly_chart(fig_quintil, use_container_width=True, config={"displayModeBar": False})

    # ── Quejas por Sector ──────────────────────────────────────────────────
    st.markdown('<div class="section-title">Distribución de Quejas por Sector</div>', unsafe_allow_html=True)

    quejas_sector = df.groupby("tipo_negocio")["num_quejas"].sum().reset_index()
    quejas_sector.columns = ["Sector", "Total Quejas"]
    quejas_sector = quejas_sector.sort_values("Total Quejas", ascending=False).head(6)

    COLORES_PIE = [PURPLE_DARK, PURPLE_MID, PURPLE_LIGHT, MINT, "#9b8ec4", "#c5bde0"]

    fig_pie = go.Figure(go.Pie(
        labels=quejas_sector["Sector"],
        values=quejas_sector["Total Quejas"],
        hole=0.0,
        marker_colors=COLORES_PIE,
        textinfo="percent",
        textfont=dict(size=11, color=WHITE, family="Inter"),
        hovertemplate="<b>%{label}</b><br>Quejas: %{value}<extra></extra>",
    ))
    fig_pie.update_layout(
        margin=dict(l=0, r=0, t=4, b=4),
        height=220,
        paper_bgcolor="white",
        legend=dict(font=dict(size=9, family="Inter"), orientation="v",
                    x=1.0, y=0.5),
        showlegend=True,
    )
    st.plotly_chart(fig_pie, use_container_width=True, config={"displayModeBar": False})


# ══════════════════════════════════════════════════════════════════════════════
# COLUMNA CENTRAL — Mapa + Histograma
# ══════════════════════════════════════════════════════════════════════════════
with col_center:

    # ── Mapa Ecuador ───────────────────────────────────────────────────────
    st.markdown('<div class="section-title">Distribución Geográfica de Clientes y Abandonos en Ecuador</div>',
                unsafe_allow_html=True)

    df_activos  = df[df["churned_next30"] == 0]
    df_churners = df[df["churned_next30"] == 1]

    fig_map = go.Figure()

    fig_map.add_trace(go.Scattergeo(
        lat=df_activos["latitud"],
        lon=df_activos["longitud"],
        mode="markers",
        name="Clientes",
        marker=dict(size=5, color=PURPLE_DARK, opacity=0.6),
        hovertemplate="<b>%{text}</b><br>Ciudad: %{customdata}<extra></extra>",
        text=df_activos["usuario"],
        customdata=df_activos["ciudad"],
    ))

    fig_map.add_trace(go.Scattergeo(
        lat=df_churners["latitud"],
        lon=df_churners["longitud"],
        mode="markers",
        name="Abandonos",
        marker=dict(size=6, color=MINT, opacity=0.75),
        hovertemplate="<b>%{text}</b><br>Ciudad: %{customdata}<extra></extra>",
        text=df_churners["usuario"],
        customdata=df_churners["ciudad"],
    ))

    fig_map.update_geos(
        visible=True,
        resolution=50,
        showcountries=True, countrycolor="#c5bde0",
        showcoastlines=True, coastlinecolor="#c5bde0",
        showland=True, landcolor="#ede9f5",
        showocean=True, oceancolor="#daf4ef",
        showlakes=False,
        center=dict(lat=-1.8, lon=-78.2),
        projection_scale=5.5,
        lataxis_range=[-5.5, 1.5],
        lonaxis_range=[-82, -74.5],
    )
    fig_map.update_layout(
        margin=dict(l=0, r=0, t=4, b=4),
        height=290,
        paper_bgcolor="white",
        legend=dict(
            orientation="v", x=0.01, y=0.99,
            font=dict(size=10, family="Inter"),
            bgcolor="rgba(255,255,255,0.85)",
            bordercolor=GRAY_LIGHT, borderwidth=1,
        ),
        geo=dict(bgcolor="white"),
    )
    st.plotly_chart(fig_map, use_container_width=True, config={"displayModeBar": False})

    # ── Histograma de frecuencia ───────────────────────────────────────────
    st.markdown('<div class="section-title">Distribución de Frecuencia — Meses en Deuna</div>',
                unsafe_allow_html=True)

    bins = list(range(0, 41, 2))

    fig_hist = go.Figure()
    fig_hist.add_trace(go.Histogram(
        x=df_activos["meses_en_deuna"],
        xbins=dict(start=0, end=40, size=2),
        name="Clientes",
        marker_color=PURPLE_DARK,
        opacity=0.85,
    ))
    fig_hist.add_trace(go.Histogram(
        x=df_churners["meses_en_deuna"],
        xbins=dict(start=0, end=40, size=2),
        name="Abandonos",
        marker_color=MINT,
        opacity=0.75,
    ))
    fig_hist.update_layout(
        barmode="overlay",
        margin=dict(l=0, r=0, t=4, b=4),
        height=195,
        paper_bgcolor="white",
        plot_bgcolor="white",
        xaxis=dict(
            title=dict(text="Tiempo en aplicación (meses)", font=dict(size=10, family="Inter")),
            tickfont=dict(size=9, family="Inter"),
            gridcolor=GRAY_LIGHT
        ),
        yaxis=dict(
            title=dict(text="Frecuencia", font=dict(size=10, family="Inter")),
            tickfont=dict(size=9, family="Inter"),
            gridcolor=GRAY_LIGHT
        ),
        legend=dict(font=dict(size=10, family="Inter"),
                    orientation="h", x=0.5, xanchor="center", y=1.02),
        bargap=0.05,
    )
    st.plotly_chart(fig_hist, use_container_width=True, config={"displayModeBar": False})


# ══════════════════════════════════════════════════════════════════════════════
# TABLA DE INTERVENCIÓN — debajo del mapa (ancho completo)
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("<hr>", unsafe_allow_html=True)
st.markdown('<div class="section-title">Top Comercios a Intervenir Hoy</div>', unsafe_allow_html=True)

col_tbl, col_detail = st.columns([3, 1])

with col_tbl:
    df["score_intervencion"] = (
        df["ief"] * 0.40 +
        df["roi_retencion"].clip(0, 10) / 10 * 0.35 +
        df["txn_vs_potencial_sector"].apply(lambda x: max(0, 1 - x)) * 0.25
    ).round(4)

    top = df[df["segmento_riesgo"].str.startswith("Alto", na=False)] \
            .nlargest(10, "score_intervencion")[
        ["usuario", "ciudad", "tipo_negocio", "segmento_riesgo",
         "ief", "days_since_last_txn", "num_quejas",
         "roi_retencion", "score_intervencion"]
    ].copy()

    top.columns = ["Comercio", "Ciudad", "Negocio", "Segmento",
                   "IEF", "Días sin txn", "Quejas", "ROI Retención", "Score"]

    def color_seg(val):
        if "Declive" in str(val):
            return f"background-color: #fde8e8; color: #8b0000; font-weight:600"
        return f"background-color: #fff3e0; color: #7a4000; font-weight:600"

    styled = top.style \
        .format({"IEF": "{:.3f}", "ROI Retención": "{:.2f}", "Score": "{:.4f}"}) \
        .applymap(color_seg, subset=["Segmento"]) \
        .set_properties(**{"font-size": "12px", "font-family": "Inter"})

    st.dataframe(styled, use_container_width=True, height=320)

with col_detail:
    st.markdown(f"""
    <div style="background:{PURPLE_DARK}; border-radius:14px; padding:18px; color:white;">
      <p style="font-size:0.7rem; font-weight:700; letter-spacing:0.08em;
                text-transform:uppercase; opacity:0.7; margin-bottom:4px;">
        Total en seguimiento
      </p>
      <p style="font-size:2rem; font-weight:800; margin:0;">
        {len(df[df['segmento_riesgo'].str.startswith('Alto', na=False)]):,}
      </p>
      <p style="font-size:0.75rem; opacity:0.8; margin-top:4px;">comercios en riesgo alto</p>
      <hr style="border-color:rgba(255,255,255,0.2); margin:12px 0;">
      <p style="font-size:0.7rem; font-weight:700; letter-spacing:0.08em;
                text-transform:uppercase; color:{MINT_LIGHT}; margin-bottom:4px;">
        Revenue en riesgo
      </p>
      <p style="font-size:1.6rem; font-weight:800; color:{MINT_LIGHT}; margin:0;">
        ${df[df['churned_next30']==1]['revenue_mensual'].sum():,.0f}
      </p>
      <p style="font-size:0.75rem; opacity:0.8; margin-top:4px;">USD / mes si no se actúa</p>
      <hr style="border-color:rgba(255,255,255,0.2); margin:12px 0;">
      <p style="font-size:0.7rem; font-weight:700; letter-spacing:0.08em;
                text-transform:uppercase; color:{MINT_LIGHT}; margin-bottom:4px;">
        Candidatos a crédito Pichincha
      </p>
      <p style="font-size:1.6rem; font-weight:800; color:{MINT_LIGHT}; margin:0;">
        {len(df[df['segmento_riesgo']=='Alto - Declive Financiero']):,}
      </p>
      <p style="font-size:0.75rem; opacity:0.8; margin-top:4px;">comercios en declive financiero</p>
    </div>
    """, unsafe_allow_html=True)

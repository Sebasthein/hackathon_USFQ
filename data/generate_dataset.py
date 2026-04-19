import pandas as pd
import numpy as np
import random

np.random.seed(42)
random.seed(42)

N = 2000

cities = [
    ("Quito",           -0.2295, -78.5243),
    ("Guayaquil",       -2.1962, -79.8862),
    ("Cuenca",          -2.9001, -79.0059),
    ("Ambato",          -1.2491, -78.6167),
    ("Loja",            -3.9931, -79.2042),
    ("Machala",         -3.2581, -79.9554),
    ("Manta",           -0.9677, -80.7089),
    ("Portoviejo",      -1.0546, -80.4541),
    ("Riobamba",        -1.6635, -78.6546),
    ("Ibarra",           0.3517, -78.1222),
    ("Santo Domingo",   -0.2542, -79.1719),
    ("Esmeraldas",       0.9592, -79.6536),
    ("Babahoyo",        -1.8013, -79.5340),
    ("Latacunga",       -0.9304, -78.6152),
    ("Tulcán",           0.8112, -77.7178),
]
city_weights = [0.25, 0.22, 0.10, 0.06, 0.05, 0.05, 0.05, 0.04, 0.04, 0.03, 0.04, 0.02, 0.02, 0.02, 0.01]

business_types = [
    "Retail / Tienda",
    "Restaurante / Comida",
    "Servicios Profesionales",
    "Salud / Farmacia",
    "Transporte",
    "Educación",
    "Tecnología",
    "Construcción / Ferretería",
    "Belleza / Estética",
    "Supermercado / Abarrotes",
]

first_names = [
    "Carlos", "María", "Juan", "Ana", "Luis", "Carmen", "José", "Rosa",
    "Pedro", "Gloria", "Miguel", "Patricia", "Jorge", "Lucia", "Roberto",
    "Sandra", "Diego", "Verónica", "Andrés", "Gabriela", "Fernando", "Mónica",
    "Cristian", "Valeria", "Santiago", "Daniela", "Sebastián", "Natalia",
    "Eduardo", "Paola", "Alejandro", "Silvia", "Ricardo", "Andrea", "Marcos",
    "Isabel", "Ramón", "Beatriz", "Felipe", "Carolina",
]
last_names = [
    "García", "Rodríguez", "López", "Martínez", "González", "Pérez", "Sánchez",
    "Ramírez", "Torres", "Flores", "Rivera", "Morales", "Jiménez", "Herrera",
    "Medina", "Castro", "Vargas", "Romero", "Díaz", "Mendoza", "Guerrero",
    "Reyes", "Ortiz", "Vega", "Alvarado", "Muñoz", "Ramos", "Chávez",
    "Suárez", "Cabrera", "Aguirre", "Molina", "Benítez", "Paredes", "Mora",
]

records = []

for i in range(1, N + 1):
    # ── Identificación ──────────────────────────────────────────────
    city_idx = np.random.choice(len(cities), p=city_weights)
    city, base_lat, base_lon = cities[city_idx]
    lat = round(base_lat + np.random.uniform(-0.05, 0.05), 6)
    lon = round(base_lon + np.random.uniform(-0.05, 0.05), 6)
    name    = f"{random.choice(first_names)} {random.choice(last_names)}"
    btype   = random.choice(business_types)
    age     = int(np.clip(np.random.normal(38, 10), 20, 70))
    months_active = int(np.clip(np.random.exponential(14), 1, 60))

    # Nivel Deuna
    level_roll = np.random.rand()
    if months_active > 24 and level_roll > 0.4:
        deuna_level = "Gold"
    elif months_active > 6 and level_roll > 0.35:
        deuna_level = "Silver"
    else:
        deuna_level = "Bronce"

    # Tarjeta
    has_card = np.random.choice([1, 0], p=[0.72, 0.28])
    card_type = (
        np.random.choice(["Visa", "Mastercard", "Diners Club", "American Express"],
                         p=[0.45, 0.35, 0.12, 0.08])
        if has_card else "Ninguna"
    )

    # Quejas y miembro activo
    num_complaints = int(min(np.random.exponential(1.2), 15))
    active_member  = np.random.choice([1, 0], p=[0.78, 0.22])

    # Monto base correlacionado con nivel
    base_amount = {"Bronce": 800, "Silver": 3500, "Gold": 12000}[deuna_level]
    amount = round(abs(np.random.normal(base_amount, base_amount * 0.4)), 2)

    # ── Riesgo de churn latente (score interno, no expuesto) ─────────
    # Factores que aumentan riesgo: quejas altas, nivel bajo, inactividad, sin tarjeta
    churn_score = (
        0.30 * (num_complaints / 15) +
        0.20 * (1 - has_card) +
        0.20 * (1 - active_member) +
        0.15 * ({"Bronce": 1.0, "Silver": 0.5, "Gold": 0.1}[deuna_level]) +
        0.15 * (1 - min(months_active, 24) / 24)
    )
    churn_score = float(np.clip(churn_score + np.random.normal(0, 0.08), 0, 1))

    # ── Variables transaccionales (coherentes con churn_score) ───────
    # Comercios con alto riesgo tienen menor actividad reciente
    activity_factor = 1 - churn_score * 0.75

    level_base_txn = {"Bronce": 12, "Silver": 35, "Gold": 80}[deuna_level]

    txn_count_last30 = max(0, int(np.random.poisson(level_base_txn * activity_factor)))
    txn_count_last90 = max(txn_count_last30, int(np.random.poisson(level_base_txn * 3 * min(activity_factor + 0.15, 1))))

    avg_ticket_last30 = round(max(5, np.random.normal(amount / max(txn_count_last30, 1), 20)), 2)
    avg_ticket_last90 = round(max(5, np.random.normal(amount / max(txn_count_last90 / 3, 1), 20)), 2)

    total_volume_last30 = round(txn_count_last30 * avg_ticket_last30, 2)
    total_volume_last90 = round(txn_count_last90 * avg_ticket_last90, 2)

    # Recencia — comercios en riesgo llevan más días sin transaccionar
    if churn_score > 0.65:
        days_since_last_txn = int(np.random.uniform(15, 60))
    elif churn_score > 0.40:
        days_since_last_txn = int(np.random.uniform(5, 20))
    else:
        days_since_last_txn = int(np.random.uniform(0, 7))

    active_days_last30 = max(0, int(np.random.poisson(22 * activity_factor)))
    active_days_last30 = min(active_days_last30, 30)

    # ── Variables de tendencia ────────────────────────────────────────
    # Tendencia negativa correlacionada con riesgo de churn
    volume_trend    = round(np.random.normal(-churn_score * 40, 15), 2)   # % cambio vs mes anterior
    frequency_trend = round(np.random.normal(-churn_score * 35, 12), 2)

    consecutive_inactive_days = max(0, int(np.random.poisson(days_since_last_txn * 0.6)))
    months_below_avg          = max(0, int(np.random.poisson(churn_score * 4)))
    months_below_avg          = min(months_below_avg, months_active)

    peak_to_current_ratio = round(max(0.05, np.random.normal(1 - churn_score * 0.7, 0.15)), 2)

    # ── Índice de Estrés Financiero (IEF) ────────────────────────────
    # Detecta si el comercio está en declive financiero sostenido,
    # no solo inactivo. Combina las 4 señales de deterioro más fuertes.
    def normalize_0_1(val, min_v, max_v):
        return float(np.clip((val - min_v) / (max_v - min_v + 1e-9), 0, 1))

    ief = (
        normalize_0_1(months_below_avg, 0, 6)          * 0.35 +
        normalize_0_1(1 - peak_to_current_ratio, 0, 1) * 0.35 +
        normalize_0_1(-frequency_trend, -20, 60)        * 0.20 +
        normalize_0_1(-volume_trend, -20, 60)           * 0.10
    )
    ief = round(float(np.clip(ief + np.random.normal(0, 0.04), 0, 1)), 4)

    # ── Segmento de riesgo: sub-clasificación dentro del tier Alto ────
    # Separa "declive financiero" (candidato a crédito Pichincha)
    # de "inactivo sin declive" (candidato a reactivación)
    churn_prob = 1 / (1 + np.exp(-10 * (churn_score - 0.55)))
    churned_next30 = int(np.random.rand() < churn_prob)

    if churn_prob >= 0.7:
        if ief >= 0.55:
            segmento_riesgo = "Alto - Declive Financiero"
        else:
            segmento_riesgo = "Alto - Inactivo"
    elif churn_prob >= 0.4:
        segmento_riesgo = "Medio"
    else:
        segmento_riesgo = "Bajo"

    # ── Variables de contexto demográfico del sector (censo INEC) ────
    # Simula datos de proporción de población joven en el radio del comercio.
    # Comercios en zonas jóvenes tienen mayor potencial transaccional con Deuna.
    pct_jovenes = round(float(np.clip(np.random.normal(0.38, 0.10), 0.10, 0.70)), 3)
    edad_mediana_sector = int(np.clip(np.random.normal(32, 6), 18, 55))
    densidad_poblacional = np.random.choice(
        ["Alta", "Media", "Baja"], p=[0.40, 0.40, 0.20]
    )

    # Índice de potencial digital del sector: ajusta expectativa de transacciones
    potencial_digital = round(float(np.clip(
        pct_jovenes * 1.2 + (1 if densidad_poblacional == "Alta" else 0.5 if densidad_poblacional == "Media" else 0.2) * 0.3,
        0, 1
    )), 3)

    # txn normalizado por potencial del sector: señal real de bajo rendimiento
    txn_vs_potencial = round(
        txn_count_last30 / max(potencial_digital * {"Bronce": 12, "Silver": 35, "Gold": 80}[deuna_level], 1),
        3
    )

    # ── Variables económicas: CAC y costo de mantenimiento ───────────
    cac = round(abs(np.random.normal(
        {"Bronce": 45, "Silver": 120, "Gold": 350}[deuna_level], 30
    )), 2)
    costo_mantenimiento_mensual = round(abs(np.random.normal(
        {"Bronce": 8, "Silver": 20, "Gold": 55}[deuna_level], 5
    )), 2)
    revenue_mensual = round(total_volume_last30 * 0.012, 2)  # ~1.2% de comisión efectiva
    meses_para_recuperar_cac = round(cac / max(revenue_mensual, 0.01), 1)
    ltv_estimado = round(revenue_mensual * max(24 - months_active, 1), 2)
    roi_retencion = round((ltv_estimado - costo_mantenimiento_mensual * 3) / max(cac, 1), 3)

    records.append({
        # Identificación
        "merchant_id":                  f"MER{i:04d}",
        "usuario":                      name,
        "ciudad":                       city,
        "tipo_negocio":                 btype,
        "cantidad_dinero_usd":          amount,
        "latitud":                      lat,
        "longitud":                     lon,
        "meses_en_deuna":               months_active,
        "num_quejas":                   num_complaints,
        "nivel_deuna":                  deuna_level,
        "tiene_tarjeta":                has_card,
        "tipo_tarjeta":                 card_type,
        "miembro_activo":               active_member,
        "edad":                         age,
        # Transaccionales
        "txn_count_last30":             txn_count_last30,
        "txn_count_last90":             txn_count_last90,
        "total_volume_last30":          total_volume_last30,
        "total_volume_last90":          total_volume_last90,
        "avg_ticket_last30":            avg_ticket_last30,
        "avg_ticket_last90":            avg_ticket_last90,
        "days_since_last_txn":          days_since_last_txn,
        "active_days_last30":           active_days_last30,
        # Tendencia
        "volume_trend":                 volume_trend,
        "frequency_trend":              frequency_trend,
        "consecutive_inactive_days":    consecutive_inactive_days,
        "months_below_avg":             months_below_avg,
        "peak_to_current_ratio":        peak_to_current_ratio,
        # Estrés financiero
        "ief":                          ief,
        "segmento_riesgo":              segmento_riesgo,
        # Contexto demográfico del sector (censo INEC)
        "pct_jovenes_sector":           pct_jovenes,
        "edad_mediana_sector":          edad_mediana_sector,
        "densidad_poblacional":         densidad_poblacional,
        "potencial_digital_sector":     potencial_digital,
        "txn_vs_potencial_sector":      txn_vs_potencial,
        # Económicas: CAC y retención
        "cac":                          cac,
        "costo_mantenimiento_mensual":  costo_mantenimiento_mensual,
        "revenue_mensual":              revenue_mensual,
        "meses_recuperar_cac":          meses_para_recuperar_cac,
        "ltv_estimado":                 ltv_estimado,
        "roi_retencion":                roi_retencion,
        # Target
        "churned_next30":               churned_next30,
    })

df = pd.DataFrame(records)

output_path = "/Users/sebas/Documents/Proyectos/HackathonSFQ/data/deuna_merchants_ecuador.csv"
df.to_csv(output_path, index=False, encoding="utf-8-sig")

print(f"Dataset generado: {len(df)} filas x {len(df.columns)} columnas")
print(f"Guardado en: {output_path}")
print(f"\nDistribución churn (churned_next30):")
print(df["churned_next30"].value_counts())
print(f"Tasa de churn: {df['churned_next30'].mean():.1%}")
print(f"\nDistribución nivel Deuna:")
print(df["nivel_deuna"].value_counts())
print(f"\nEstadísticas transaccionales:")
print(df[["txn_count_last30", "days_since_last_txn", "volume_trend", "peak_to_current_ratio"]].describe().round(2))

# Solución: Antes de que se vayan
## Scoring Predictivo de Abandono de Comerciantes — Reto 3 Deuna, Interact2Hack 2026

---

## El Problema Real de Deuna

Deuna cobra **cero comisiones** a sus comercios. Eso cambia todo: si un comercio se va, **no es por precio**. Se va porque el negocio está muriendo, porque no percibe valor, o porque un competidor como PeiGo le ofreció algo diferente.

Con +620.000 comercios registrados y +500.000 PyMEs incorporadas al sistema financiero formal por primera vez, Deuna enfrenta un problema de escala: el equipo comercial no puede monitorear a todos. Cuando detecta que un comercio se fue, ya es tarde — recuperarlo cuesta entre 5 y 7 veces más que haberlo retenido.

**El reto no es predecir churn. Es convertir esa predicción en una acción concreta antes de que sea tarde.**

---

## Nuestra Propuesta

Una solución en tres capas que va más allá del modelo estándar de churn:

```
┌─────────────────────────────────────────────────────────────────┐
│  CAPA 1: ¿Quién se va a ir?                                     │
│  Modelo predictivo XGBoost — AUC > 0.75                         │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 2: ¿Por qué se va a ir?                                   │
│  Índice de Estrés Financiero (IEF) + contexto demográfico INEC  │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 3: ¿A quién llamar primero y qué ofrecerle?               │
│  Score de intervención = P(churn) × ROI retención × IEF        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Capa 1 — Modelo Predictivo de Churn

### Variables clave (ancladas al modelo de negocio Deuna)

Dado que Deuna opera principalmente via **pagos QR sin comisión**, las señales de abandono no están en el precio sino en el comportamiento transaccional:

| Variable | Por qué importa en Deuna |
|---|---|
| `days_since_last_txn` | Deuna es una app de uso frecuente — días sin transaccionar es la señal más directa de desenganche |
| `txn_count_last30` vs `txn_count_last90` | Captura la caída gradual antes del abandono total |
| `consecutive_inactive_days` | Racha de inactividad = el comercio ya eligió otro canal |
| `volume_trend` | Si el volumen cae, el negocio pierde actividad o está migrando a PeiGo |
| `num_quejas` + `unresolved_tickets` | El único costo que Deuna le genera al comercio es el soporte — una queja sin resolver es una salida anunciada |
| `miembro_activo` + `login_count_last30` | Uso del panel Deuna Negocios: quien no lo usa no percibe valor |
| `payment_methods_used` | Bajo uso de features = bajo costo de cambio a otro proveedor |
| `ciudad` | Zonas con fuerte presencia de PeiGo muestran mayor tasa de churn |
| `nivel_deuna` | Bronce tiene mayor churn — menor inversión de Deuna en la relación |

### Arquitectura del modelo

- **Algoritmo:** XGBoost con `scale_pos_weight` para manejar el desbalance (~15% churn)
- **Validación:** StratifiedKFold 5-fold para asegurar robustez en cada segmento
- **Métricas objetivo:** AUC-ROC > 0.75, F1-Score en clase positiva, Recall priorizando cobertura de churners
- **Explicabilidad:** SHAP values por comercio — el equipo comercial ve en lenguaje natural *por qué* ese comercio está en riesgo

---

## Capa 2 — Índice de Estrés Financiero (IEF)

### La hipótesis central

> Deuna ve la salud financiera de un microcomercio antes que cualquier banco, antes que el SRI, y antes que el propio dueño lo admita.

Un comercio que deja de usar Deuna generalmente no lo hace porque encontró algo mejor — lo hace porque **su negocio está en declive** y ya no tiene suficiente actividad para necesitar la plataforma. Esta es la ventana de oportunidad.

### Construcción del IEF

```python
IEF = (
    normalize(months_below_avg)             × 0.35  # ¿Cuánto tiempo lleva mal?
  + normalize(1 - peak_to_current_ratio)    × 0.35  # ¿Cuánto cayó desde su mejor momento?
  + normalize(-frequency_trend)             × 0.20  # ¿Está transaccionando cada vez menos?
  + normalize(-volume_trend)                × 0.10  # ¿El volumen de ventas cae?
)
```

| Componente | Peso | Interpretación de negocio |
|---|---|---|
| `months_below_avg` | 35% | Meses consecutivos facturando menos que su propio promedio histórico — deterioro sostenido |
| `1 - peak_to_current_ratio` | 35% | Distancia entre su mejor momento y hoy — ¿cuánto negocio perdió? |
| `-frequency_trend` | 20% | Tendencia de caída en número de transacciones |
| `-volume_trend` | 10% | Tendencia de caída en volumen total procesado |

### Sub-segmentación del Riesgo Alto

Dentro del tier **Alto Riesgo** (prob ≥ 0.7), separamos dos perfiles con acciones completamente distintas:

| Sub-segmento | Criterio | Acción |
|---|---|---|
| **Alto — Declive Financiero** | IEF ≥ 0.55 + volumen cayendo | Oferta de microcrédito de reactivación vía Banco Pichincha |
| **Alto — Inactivo** | IEF < 0.55 + días sin transaccionar | Campaña de reactivación + soporte prioritario Deuna |

Esta distinción es crítica: un comercio inactivo sin estrés financiero puede volver con el incentivo correcto. Un comercio en declive financiero necesita capital, no incentivos.

---

## Capa 3 — Contexto Demográfico y Priorización por ROI

### El problema del umbral único

Un modelo estándar usa el mismo umbral de "pocas transacciones" para todos los comercios. Pero un almacén en Tulcán, rodeado de población adulta mayor, naturalmente tendrá menos transacciones digitales que una tienda en el norte de Quito. Penalizarlo con el mismo umbral genera **falsos positivos** y diluye el esfuerzo comercial.

### Solución: normalización por potencial del sector (datos INEC)

Incorporamos variables de **censo INEC 2022** a nivel de sector censal, cruzadas por las coordenadas geográficas de cada comercio:

| Variable | Descripción | Impacto en el modelo |
|---|---|---|
| `pct_jovenes_sector` | % de población de 18-35 años en el radio del comercio | Ajusta la expectativa de transacciones digitales |
| `edad_mediana_sector` | Perfil etario de la zona | Contextualiza el volumen esperado |
| `densidad_poblacional` | Alta / Media / Baja | Comercios en zonas densas tienen más clientes potenciales |
| `potencial_digital_sector` | Índice compuesto de potencial Deuna en esa zona | Base de normalización |
| `txn_vs_potencial_sector` | `txn_count_last30 / txn_esperado_por_sector` | Señal real de bajo rendimiento vs ruido demográfico |

**Si `txn_vs_potencial_sector` < 1, el comercio transacciona menos de lo que su contexto permite. Eso sí es señal de riesgo.**

### Score de intervención final

```
score_intervencion = P(churn) × 0.40
                   + ROI_retencion_normalizado × 0.35
                   + (1 - txn_vs_potencial_sector) × 0.25
```

Este score ordena la lista de contacto diaria del equipo comercial combinando:
- **Quién se va a ir** (modelo predictivo)
- **Cuánto cuesta perderlo** (CAC + LTV + revenue mensual)
- **Si su bajo rendimiento es real o es ruido del sector** (censo)

### Variables económicas integradas

| Variable | Descripción | Uso en la priorización |
|---|---|---|
| `cac` | Costo de adquisición del cliente | Define el piso del ROI de retención |
| `revenue_mensual` | Comisiones efectivas generadas para Deuna | Cuantifica lo que se pierde si churn |
| `ltv_estimado` | Valor de vida proyectado si se retiene | Argumento para escalar la inversión de retención |
| `meses_recuperar_cac` | CAC / revenue_mensual | Comercios que aún no amortizaron su costo de adquisición tienen prioridad crítica |
| `roi_retencion` | (LTV - costo retención) / CAC | Ordena qué comercios justifican esfuerzo activo |

---

## El Rol de Banco Pichincha — La Oportunidad Oculta

### Más allá del churn: detección de candidatos a crédito

Deuna no gana dinero directamente de los microcomercios. Su modelo real es:

> **Usar Deuna como sistema de adquisición de clientes para que Pichincha les venda productos financieros una vez que tienen historial transaccional.**

Un comercio con IEF alto está en declive financiero — y es el candidato ideal para un **microcrédito de reactivación Pichincha**:

- Pichincha ya conoce su historial real de ventas sin necesidad de estados de cuenta ni declaraciones de impuestos
- Puede calcular capacidad de pago basada en transacciones reales de los últimos 12 meses
- Puede hacer la oferta en el momento exacto en que el negocio más lo necesita

**Si el comercio cierra antes de que se le ofrezca el crédito, Pichincha pierde el cliente para siempre.**

### El mismo modelo, dos productos

```
Comercio con IEF alto (declive financiero)
        │
        ├─► Para el equipo Deuna:    "Este comercio puede dejar de transaccionar en 30 días"
        │                             → Activar retención antes de que sea tarde
        │
        └─► Para el equipo Pichincha: "Este comercio necesita capital para no cerrar"
                                       → Oferta proactiva de microcrédito de reactivación
```

Deuna no es solo una app de pagos — es el **sistema de alerta temprana del brazo crediticio de Banco Pichincha**.

---

## Dashboard — Lo que ve el equipo comercial

El dashboard convierte las predicciones en una herramienta operativa diaria. No muestra probabilidades — muestra decisiones:

### Vista principal: lista de intervención del día
- Comercios ordenados por `score_intervencion`
- Semáforo por segmento (rojo / naranja / amarillo / verde)
- Para cada comercio en rojo: nombre, ciudad, tipo de negocio, acción sugerida y razón en lenguaje natural

### Razones en lenguaje natural (SHAP → texto)
En lugar de "SHAP value = -0.34 en peak_to_current_ratio", el dashboard muestra:

> *"Este comercio facturó 62% menos que en su mejor mes. Lleva 3 meses consecutivos por debajo de su promedio. Acción: contactar para oferta de crédito Pichincha."*

### Filtros disponibles
- Por ciudad / región
- Por tipo de negocio
- Por nivel Deuna (Bronce / Silver / Gold)
- Por segmento de riesgo
- Por acción recomendada (crédito / reactivación / monitoreo)

---

## Plan de Acción por Segmento

### Alto — Declive Financiero (IEF ≥ 0.55)
**Señal:** El negocio está perdiendo ingresos de forma sostenida. No es inactividad — es deterioro real.

1. Llamada del ejecutivo comercial en menos de 48h
2. Presentar oferta de microcrédito de reactivación Banco Pichincha (con historial transaccional como aval)
3. Si acepta crédito: asignar gestor de cuenta dedicado durante 90 días
4. Si no acepta: ofrecer capacitación gratuita en herramientas Deuna Negocios

### Alto — Inactivo (IEF < 0.55, días sin transaccionar alto)
**Señal:** El comercio dejó de usar Deuna pero no está en crisis financiera. Probablemente migró a otro canal.

1. Email personalizado con resumen de lo que dejó de ganar (ventas que no procesó por Deuna)
2. Campaña de incentivo: bonificación por reactivación en los próximos 15 días
3. Soporte técnico proactivo — revisar si hay fricción de uso no reportada
4. Si hay quejas sin resolver: escalar a soporte prioritario antes de cualquier campaña

### Medio (0.4 ≤ prob < 0.7)
**Señal:** Señales tempranas de desenganche. Aún es fácil y barato retener.

1. Secuencia de email automatizada con casos de éxito de comercios similares
2. Invitación a webinar de nuevas funcionalidades Deuna Negocios
3. Alerta al ejecutivo de zona si el score sube al tier Alto en los siguientes 15 días

### Bajo (prob < 0.4)
**Señal:** Sin riesgo inmediato. Monitoreo pasivo.

1. Incluir en campaña general de engagement (newsletter, nuevas features)
2. Revisión automática mensual del score — alertar si cambia de tier

---

## Por Qué Esta Solución Supera el Estándar

| Criterio del jurado | Solución estándar | Nuestra solución |
|---|---|---|
| Desempeño predictivo | AUC sobre variables crudas | AUC + IEF contextualizado por potencial del sector |
| Explicabilidad | SHAP genérico | SHAP traducido a razones de negocio en lenguaje natural |
| Dashboard | Lista de riesgo con probabilidades | Lista de acción con razón y acción concreta por comercio |
| Plan de acción | Genérico por tier | Diferenciado por sub-segmento (declive vs inactivo) |
| Modelo de negocio | Retención pura | Retención + oportunidad de crédito Pichincha |
| Contexto | Mismo umbral para todos | Ajustado por demografía del sector (censo INEC 2022) |
| ROI de la solución | No cuantificado | Cuantificado por CAC, LTV y revenue mensual por comercio |

# Hipótesis: Estrés Financiero como Señal de Churn y Oportunidad de Crédito

> Insight estratégico para el Reto 3 — Interact2Hack 2026

---

## La Idea Central

Las variables transaccionales de DEUNA permiten detectar cuándo un comercio está quebrando o perdiendo ingresos. Este mismo signal sirve para dos cosas simultáneamente:

```
Comercio con volumen cayendo
        │
        ├─► RIESGO DE CHURN alto → predecir y retener
        │
        └─► CANDIDATO A CRÉDITO Pichincha → ofrecer financiamiento antes de que cierre
```

No son dos acciones separadas — **el mismo modelo resuelve ambos problemas.**

---

## Evidencia en el Dataset

Correlaciones con `churned_next30` (dataset de 2.000 comercios):

| Variable | Correlación | Qué representa |
|---|---|---|
| `peak_to_current_ratio` | **-0.316** (más alta del dataset) | Distancia entre el mejor momento histórico y el volumen actual |
| `months_below_avg` | **+0.241** | Meses consecutivos facturando por debajo de su promedio |
| `frequency_trend` | **-0.244** | Si está transaccionando cada vez menos |
| `volume_trend` | **-0.200** | Si el volumen de ventas está en caída |

Un comercio con `peak_to_current_ratio` bajo + `months_below_avg` alto es un negocio en **declive financiero sostenido** — y el predictor de churn más fuerte que hay en el dataset.

---

## Por Qué Esto Tiene Sentido de Negocio

DEUNA cobra **cero comisiones** a los microcomercios. Eso significa que el churn no es por precio. Un comercio que se va de DEUNA probablemente se va porque **ya no tiene suficiente actividad para necesitar la app** — es decir, el negocio está muriendo antes de que el comercio haga churn.

DEUNA ve esto antes que nadie: antes que el SRI, antes que cualquier banco, antes que el propio dueño del negocio lo admita. Esa ventana de tiempo es la oportunidad.

---

## El Rol de Banco Pichincha

DEUNA no gana dinero directamente de los microcomercios. Su modelo real es:

> Usar DEUNA como sistema de adquisición de clientes para que Pichincha les venda productos financieros una vez que tienen historial transaccional.

Un comercio que está en declive financiero es el cliente ideal para un **microcrédito de reactivación**:
- Pichincha ya conoce su historial de ventas (sin necesidad de estados de cuenta ni declaraciones)
- Puede calcular capacidad de pago real basada en transacciones
- Puede ofrecer el crédito en el momento exacto en que el negocio más lo necesita

Si el comercio cierra antes de que se le ofrezca el crédito, **Pichincha pierde el cliente para siempre.**

---

## Cómo Aterrizar Esto en la Solución

### 1. Feature Engineering
Construir un **Índice de Estrés Financiero (IEF)** combinando:

```python
IEF = (
    normalize(months_below_avg) * 0.35 +
    normalize(1 - peak_to_current_ratio) * 0.35 +
    normalize(-frequency_trend) * 0.20 +
    normalize(-volume_trend) * 0.10
)
```

### 2. Segmentación de Comercios en Riesgo Alto

Dentro del tier **Alto riesgo** (prob ≥ 0.7), separar en dos sub-grupos con acciones distintas:

| Sub-grupo | Criterio | Acción recomendada |
|---|---|---|
| **En declive financiero** | IEF alto + volumen cayendo | Oferta de microcrédito Pichincha |
| **Inactivos sin declive** | IEF bajo + days_since_last_txn alto | Campaña de reactivación / soporte |

### 3. Narrativa en el Dashboard

En lugar de mostrar solo "probabilidad de churn", mostrar:

- "Este comercio facturó 60% menos que en su mejor mes"
- "Lleva 3 meses por debajo de su promedio histórico"
- "Acción sugerida: contactar para oferta de crédito Pichincha"

Esto convierte el dashboard en una **herramienta accionable para el equipo comercial**, no solo un reporte de riesgo.

---

## Por Qué Esto Gana el Hackathon

La mayoría de soluciones van a predecir churn con buena métrica técnica (AUC). Esta solución hace eso **y además**:

1. Conecta el modelo con el modelo de negocio real de DEUNA/Pichincha
2. Convierte cada predicción en una acción de negocio concreta
3. Muestra que retener un comercio no es solo evitar churn — es abrir una oportunidad de crédito
4. El "costo de no actuar" es cuantificable: valor del crédito que Pichincha no colocó

> DEUNA no es solo una app de pagos — es el **sistema de alerta temprana del brazo crediticio de Banco Pichincha.**

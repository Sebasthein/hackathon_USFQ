# DEUNA — Contexto y Modelo de Negocio

> Documento de referencia para el equipo del Reto 3: "Antes de que se vayan" — Interact2Hack 2026

---

## Origen y Respaldo Institucional

DEUNA nació en **2020 en Ecuador** con el respaldo de **Banco Pichincha**, el banco más grande del país (fundado en 1906). McKinsey & Company participó como consultor estratégico en el lanzamiento. No es una startup independiente: opera bajo el paraguas financiero y la red de distribución de Pichincha, lo que le da acceso inmediato a su base de clientes y credibilidad institucional.

---

## Dos Entidades Bajo el Mismo Nombre

| Entidad | Dominio | Enfoque | Mercado objetivo |
|---|---|---|---|
| **DEUNA Ecuador** | `deuna.ec` | Billetera digital para personas y comercios locales | Ecuador — B2C y B2B local |
| **DEUNA Global** | `deuna.com` | Checkout y orquestador de pagos para e-commerce | LatAm — B2B regional |

Este documento se enfoca en **DEUNA Ecuador**, que es el contexto directo del dataset del hackathon.

---

## Modelo de Negocio — DEUNA Ecuador

### Para Personas (B2C)
- Billetera digital gratuita respaldada por Banco Pichincha
- Pagos QR y transferencias sin costo entre usuarios
- Cuenta de ahorro digital dentro del app
- Sin comisiones por uso

### Para Comercios (B2B local)
- Cobros sin comisiones, sin necesidad de datáfono físico
- Integración QR con más de 10 cooperativas de ahorro y crédito
- **Deuna Negocios** (lanzado abril 2026): app para PyMEs con:
  - Cobro con tarjeta de débito/crédito directo desde el celular
  - Reportes de ventas y administración del negocio
  - Servicios financieros integrados

### Escala Actual
- **+6 millones** de usuarios activos en Ecuador
- **+620.000 comercios** registrados en la plataforma
- **+500.000 pequeños negocios** incorporados al sistema financiero formal por primera vez

---

## Propuesta de Valor Central

> **Inclusión financiera + infraestructura de pagos de costo cero.**

DEUNA elimina la fricción del sistema financiero tradicional (cuentas bancarias, datáfonos, comisiones) para conectar personas y comercios en un ecosistema transaccional digital. Su diferenciador clave es el **costo cero para usuarios y comercios**, sostenido por el respaldo de Banco Pichincha.

---

## Relevancia para el Reto de Churn

El modelo de negocio de DEUNA tiene implicaciones directas sobre qué hace que un comercio abandone la plataforma:

| Factor de negocio | Hipótesis de churn |
|---|---|
| Costo cero para comercios | El churn no es por precio — probablemente es por **falta de uso o valor percibido** |
| PyMEs y negocios informales | Alta sensibilidad a la **frecuencia de transacciones** y el **ticket promedio** |
| Respaldo de Pichincha | Comercios con cuenta Pichincha tienen menor probabilidad de churn |
| Pagos QR como canal principal | Caída en frecuencia de QR = señal temprana de desenganche |
| Soporte al cliente | Tickets de soporte sin resolver pueden acelerar la salida |
| Competidor PeiGo | Comercios en regiones con fuerte presencia de PeiGo podrían migrar |

### Variables del dataset a priorizar
Dado el modelo de negocio, las features más predictivas probablemente sean:
1. **Frecuencia de transacciones** (últimos 30, 60, 90 días)
2. **Tendencia del ticket promedio** (¿está bajando?)
3. **Tipo de negocio** (comercios informales vs. establecidos)
4. **Región** (densidad de competencia)
5. **Tickets de soporte** (número y resolución)
6. **Recencia** (días desde última transacción)

---

## Ecosistema Competitivo en Ecuador

| Jugador | Tipo | Fortaleza |
|---|---|---|
| **DEUNA** | Fintech + banco | Red Pichincha, costo cero, escala |
| **PeiGo** | Fintech independiente | Agilidad, enfoque en pagos digitales |
| **Banca tradicional** | Banco | Confianza, productos de crédito |

---

## DEUNA Global — Contexto Adicional (B2B e-commerce)

- **One-click checkout**: login sin contraseña por email/teléfono
- **DEUNA Now**: orquestador de pagos con +50 métodos de pago
- **Serie A (2022):** $37M USD para expansión en México, Colombia, Chile y Argentina
- Operaciones en: Ecuador, México, Colombia, Chile y Argentina

---

## Fuentes

- [DEUNA Ecuador](https://www.deuna.ec/)
- [DEUNA Global](https://www.deuna.com/)
- [DEUNA entra al sector checkout con $37M — TechCrunch](https://techcrunch.com/2022/07/08/deuna-latin-americas-one-click-checkout-series-a/)
- [Deuna Negocios lanzamiento — CCQ Ecuador](https://ccq.ec/deuna-i-deuna-lanza-deuna-negocios-su-nueva-app-para-impulsar-la-gestion-y-el-crecimiento-de-los-comercios-en-ecuador/)
- [PeiGo y Deuna ganan terreno en bancarización — El Universo](https://www.eluniverso.com/noticias/economia/peigo-y-deuna-las-fintech-de-pagos-digitales-ganan-terreno-en-bancarizacion-nota/)
- [Banco Pichincha lanza Deuna con McKinsey — Consultancy.lat](https://www.consultancy.lat/news/1558/with-mckinseys-support-pichincha-launches-digital-bank-deuna)

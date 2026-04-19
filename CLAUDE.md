# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is a hackathon project for **Interact2Hack 2026 — Reto 3 Deuna: "Antes de que se vayan"**.

**Goal:** Build a churn prediction model for Deuna's merchant platform that identifies merchants at high risk of abandoning in the next 30 days, with explainability, an interactive dashboard, and an actionable retention plan.

**Dataset:** Synthetic dataset of 2,000 merchants with 12 months of transactional behavior (avg ticket, frequency, business type, region, support tickets) + historical churn labels.

**Success criteria:** AUC > 0.75, explainable features, non-technical dashboard, executable action plan.

## Expected Project Structure

```
HackathonSFQ/
├── data/               # Synthetic dataset (CSV/Parquet)
├── notebooks/          # EDA and model training notebooks
├── src/                # Reusable Python modules
│   ├── features.py     # Feature engineering logic
│   ├── model.py        # Training and evaluation pipeline
│   └── explain.py      # SHAP explainability helpers
├── dashboard/          # Streamlit or Dash app
│   └── app.py
├── docs/               # Analysis document + action plan
└── CLAUDE.md
```

## Common Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run Jupyter notebooks
jupyter lab

# Launch dashboard (Streamlit)
streamlit run dashboard/app.py

# Launch dashboard (Dash alternative)
python dashboard/app.py

# Run model training script
python src/model.py

# Run tests
pytest tests/
```

## Architecture

### Pipeline flow
1. **Feature engineering** (`src/features.py`) — build recency/frequency/trend features from raw transactional data
2. **Model training** (`src/model.py`) — XGBoost/LightGBM classifier with cross-validation; outputs churn probability per merchant
3. **Explainability** (`src/explain.py`) — SHAP values for global feature importance and per-merchant waterfall charts
4. **Dashboard** (`dashboard/app.py`) — Streamlit app consuming model output CSV; filterable by region/segment/risk tier

### Risk tier classification
Merchants are bucketed into three tiers based on predicted churn probability:
- **Alto (High):** prob ≥ 0.7
- **Medio (Medium):** 0.4 ≤ prob < 0.7
- **Bajo (Low):** prob < 0.4

### Key design constraints
- Model must be **explainable** — the commercial team must understand *why* a merchant is at risk; use SHAP, not black-box outputs
- Dashboard must be usable **without data science knowledge** — avoid technical jargon, show plain-language risk reasons
- Action plan must rely only on resources Deuna already has today (no new integrations)
- All work uses the **synthetic dataset only** — no real Deuna data

## Tech Stack Decisions

- **Model:** XGBoost or LightGBM (best AUC + native SHAP support)
- **Explainability:** `shap` library — global summary plot + per-merchant waterfall
- **Dashboard:** Streamlit (fastest to build in hackathon context)
- **Notebooks:** Jupyter, one per phase (EDA, feature engineering, training, evaluation)
- **Key metrics to report:** AUC-ROC, Precision, Recall, F1 at chosen threshold

## Deliverables Checklist

- [ ] Executable model notebook/script with clear metrics
- [ ] SHAP explainability analysis
- [ ] Interactive dashboard (filterable by region, segment, risk)
- [ ] Analysis document with model metrics + top features
- [ ] Action plan document by risk tier (Alto / Medio / Bajo)
- [ ] 1-page executive summary
- [ ] 5-minute pitch

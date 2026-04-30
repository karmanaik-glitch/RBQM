# RBQM Platform

**Risk-Based Quality Management for Clinical Trials**
Fully aligned with ICH E6 R3 (2023) | Built by a PharmD Student

---

## Overview

RBQM Platform is a production-grade clinical trial monitoring tool that automates Key Risk Indicator (KRI) calculations, detects site-level data quality issues, and generates AI-driven regulatory reports. It supports the complete RBQM lifecycle from data ingestion to database lock readiness assessment.

### Key Features

- **20 KRI Engine** — Automated risk indicators across 6 domains (Data Quality, Safety, Protocol Adherence, Site Performance, Investigational Product, Statistical Monitoring)
- **Lock Readiness** — Database lock score with hard/soft blocker identification and critical path analysis
- **AI Narrative Reports** — LLM-powered clinical data management review memos via Groq (Llama 3.3 70B)
- **ICH E6 R3 Compliance** — 9-point regulatory checklist with live pass/fail status mapping
- **Site Heatmap** — Visual domain × site risk grid for portfolio-level monitoring
- **Statistical Fraud Detection** — Digit preference analysis (chi-square), intra-site variability, cross-site endpoint outlier detection

---

## Architecture

```
rbqm-platform/
├── rbqm_engine/        ← Backend (FastAPI + Python)
│   ├── api/            ← REST API routes
│   ├── db/             ← SQLAlchemy ORM models + database config
│   ├── engine/         ← KRI calculator, lock readiness, report generator
│   ├── Data/           ← Synthetic CSV data
│   └── uploads/        ← EDC CSV uploads per trial
│
├── rbqm_frontend/      ← Frontend (React + TypeScript + Vite)
│   └── src/
│       ├── components/ ← Reusable UI components
│       ├── pages/      ← Route pages
│       ├── context/    ← Auth context
│       ├── api/        ← API client
│       └── types/      ← TypeScript type definitions
│
├── .gitignore
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pandas, NumPy, SciPy |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v3 |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| AI | Groq SDK (Llama 3.3 70B) |
| PDF | ReportLab |
| Charts | Recharts |
| Database | SQLite (dev) / PostgreSQL via Supabase (prod) |
| Deploy | Backend: Render.com · Frontend: Vercel |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm

### Backend Setup

```bash
cd rbqm_engine

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Generate synthetic data
python generate_data.py

# Seed demo data (creates user, trial, runs KRI engine)
python seed_demo.py

# Start the API server
python -m uvicorn api.main:app --reload
```

### Frontend Setup

```bash
cd rbqm_frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Supabase Integration (Production)

The platform is designed to switch from local SQLite to Supabase (PostgreSQL) with a single environment variable change.

1. **Create a Supabase Project**:
   - Go to [Supabase](https://supabase.com/) and create a new project.
   - Go to Project Settings > Database and copy the **Connection string** (URI).

2. **Configure Environment Variables**:
   - In `rbqm_engine/.env`, set the `DATABASE_URL`:
     ```bash
     DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
     ```

3. **Initialize Cloud Schema**:
   - Run the setup helper to create all tables in your Supabase instance:
     ```bash
     cd rbqm_engine
     python setup_supabase.py
     ```

4. **Seed Cloud Data** (Optional):
   - Populate your Supabase instance with demo trials and users:
     ```bash
     python seed_demo.py
     ```

---

## Demo Credentials

| Field | Value |
|---|---|
| Email | demo@rbqm.com |
| Password | demo1234 |
| Role | CDM Lead |
| Organisation | Veeda Clinical Research |

The demo trial `TRIAL-2024-001` is pre-loaded with 5 Indian clinical sites and full KRI analysis results.

---

## API Endpoints

### Auth
- `POST /api/auth/register` — Create user
- `POST /api/auth/login` — JWT login (OAuth2 form)
- `GET /api/auth/me` — Current user profile

### Trials
- `POST /api/trials` — Create trial
- `GET /api/trials` — List trials
- `GET /api/trials/{id}` — Trial detail
- `PUT /api/trials/{id}` — Update trial
- `DELETE /api/trials/{id}` — Delete trial
- `POST /api/trials/{id}/sites` — Add site
- `GET /api/trials/{id}/sites` — List sites

### Data Ingestion
- `POST /api/ingest/{id}/upload` — Upload CSV
- `GET /api/ingest/{id}/uploads` — Upload status
- `POST /api/ingest/{id}/run-kri` — Run all 20 KRIs
- `GET /api/ingest/schema` — CSV column schemas

### KRI Engine
- `GET /api/kri/summary` — Portfolio summary
- `GET /api/kri/sites` — All sites with risk levels
- `GET /api/kri/site/{site_id}` — Full 20-KRI report
- `GET /api/kri/alerts` — All RED KRIs
- `GET /api/kri/domain/{domain}` — KRIs by domain

### Lock Readiness
- `GET /api/lock/trial` — Trial lock score
- `GET /api/lock/sites` — All sites lock scores
- `GET /api/lock/site/{id}` — Site lock report

### Reports
- `POST /api/report/stream` — Groq SSE streaming AI report
- `POST /api/report/generate` — Full AI narrative
- `GET /api/report/pdf` — PDF report (synthetic)
- `GET /api/report/pdf/{trial_id}` — PDF report (trial)
- `GET /api/report/compliance` — ICH checklist
- `GET /api/report/compliance/{trial_id}` — Live compliance status
- `GET /api/report/audit-csv` — Audit log CSV export

### Alerts & Actions
- `GET /api/actions/alerts` — All alerts
- `GET /api/actions/alerts/{trial_id}` — Trial alerts
- `PUT /api/actions/alert/{id}` — Update alert status
- `POST /api/actions/alert/{id}/item` — Create action item
- `GET /api/actions/alert/{id}/items` — List action items
- `PUT /api/actions/item/{id}` — Update action item
- `GET /api/actions/audit-log` — Full audit log

---

## Regulatory References

- **ICH E6 R3** (2023) — Good Clinical Practice, Section 5.0, 5.3, 5.5, 5.18, Appendix C
- **CDSCO Schedule Y** — Indian clinical trial SAE reporting requirements
- **FDA 21 CFR Part 11** — Electronic records and signatures
- **TransCelerate CSM** — Centralized Statistical Monitoring framework

---

## License

Private — Built by a 5th Year PharmD Student for Clinical Data Management.

# Yörünge Temizliği — Space Debris Tracking System

Turkish satellite conjunction risk detection using SGP4 orbit propagation and Chan-series collision probability.

[![Tests](https://github.com/Umutcagn/space-debris-tracking-system/actions/workflows/tests.yml/badge.svg)](https://github.com/Umutcagn/space-debris-tracking-system/actions/workflows/tests.yml)

**Demo arayüzü:** https://umutcagn.github.io/space-debris-tracking-system/ (statik örnek uyarılar gösterir; Python pipeline'ına bağlı değildir)

> Hackathon project — detects potential collisions between Turkish satellites and space debris using real orbital data from NASA/US Space Force.

---

## What It Does

There are **22,000+ tracked objects** in Earth's orbit. This system:

1. Fetches real-time orbital data (TLEs) from CelesTrak and Space-Track.org
2. Propagates all objects' trajectories 72 hours forward using the SGP4 algorithm
3. Finds which debris objects will pass dangerously close to Turkish satellites
4. Computes collision probability using Chan's series in the encounter plane
5. Optionally scores events with a Random Forest + LSTM ensemble (SHAP explainability) — **scaffold only, no trained model is included**; without one, alerts use the analytic Pc tiers
6. Generates tiered alerts: 🟢 GREEN / 🟡 YELLOW / 🟠 ORANGE / 🔴 RED

---

## Monitored Satellites

| Satellite | NORAD ID | Orbit | Operator |
|-----------|----------|-------|----------|
| Türksat 4A | 39522 | GEO ~35,786 km | Türksat A.Ş. |
| Türksat 4B | 40985 | GEO ~35,786 km | Türksat A.Ş. |
| Türksat 5A | 47790 | GEO ~35,786 km | Türksat A.Ş. |
| Türksat 5B | 49077 | GEO ~35,786 km | Türksat A.Ş. |
| GÖKTÜRK-1 | 41875 | LEO ~681 km | Milli Savunma |
| GÖKTÜRK-2 | 38704 | LEO ~686 km | TÜBİTAK UZAY |
| RASAT | 37791 | LEO ~689 km | TÜBİTAK UZAY |
| İMECE | 55491 | LEO ~680 km | ROKETSAN / TÜBİTAK |

---

## Pipeline

```
CelesTrak / Space-Track
        ↓
[tle-ingestion-agent]      → fetch + validate TLE data (every 6h)
        ↓
[orbit-propagation-agent]  → SGP4 72h propagation + coarse screening
        ↓
[conjunction-analysis-agent] → precise TCA, Chan Pc, ML features
        ↓
[ml-scoring-agent]         → analytic Pc tiers (optional RF + LSTM, untrained)
        ↓
[alert-reporting-agent]    → tiered alerts + weekly report
```

---

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. (Optional) Add Space-Track credentials
Create `agents/tle-ingestion-agent/data/imports/credentials.env`:
```
SPACETRACK_USER=your_email@example.com
SPACETRACK_PASS=your_password
```
Free account at [space-track.org](https://www.space-track.org/auth/createAccount).
Without this, the system still works using CelesTrak (free, no auth).

### 3. Run the pipeline
```bash
python agents/tle-ingestion-agent/scripts/fetch_tles.py
python agents/tle-ingestion-agent/scripts/validate_tles.py
python agents/orbit-propagation-agent/scripts/propagate_orbits.py
python agents/orbit-propagation-agent/scripts/screen_conjunctions.py
python agents/conjunction-analysis-agent/scripts/compute_tca.py
python agents/conjunction-analysis-agent/scripts/compute_pc.py
python agents/conjunction-analysis-agent/scripts/extract_features.py
python agents/ml-scoring-agent/scripts/score_conjunctions.py
python agents/alert-reporting-agent/scripts/generate_alerts.py
```

Each step writes dated output files to its agent's `outputs/` folder. The next step reads from there automatically.

---

## ML Model

The system works **without a trained model** — it uses the analytic Chan formula as the risk baseline.

To train the ML model:
1. Export historical CDM data from Space-Track → see `agents/ml-scoring-agent/data/imports/training-data/HOW_TO_EXPORT_TRAINING_DATA.md`
2. Run: `python agents/ml-scoring-agent/scripts/train_model.py`
3. Set `"status": "approved"` in `agents/ml-scoring-agent/data/models/model_manifest.json`

For quick demo/testing, generate synthetic training data:
```python
# See HOW_TO_EXPORT_TRAINING_DATA.md for the synthetic data generation snippet
```

---

## Collision Probability (Pc)

`compute_pc.py` projects the combined position covariance onto the encounter plane (perpendicular to the relative velocity) and evaluates **Chan's series** in its principal axes:

$$P_c = \sum_{m \ge 0} \frac{e^{-v/2}(v/2)^m}{m!}\left[1 - e^{-u/2}\sum_{k=0}^{m}\frac{(u/2)^k}{k!}\right], \quad u = \frac{R^2}{\sigma_u\sigma_v},\ v = \frac{x^2}{\sigma_u^2} + \frac{y^2}{\sigma_v^2}$$

Earlier versions used only the leading term with a small-radius approximation, which overestimated Pc by up to ~20% when the hard-body radius is comparable to the position uncertainty. Accuracy against direct numerical integration of the 2D Gaussian over the hard-body circle (`tests/test_collision_probability.py`):

| Geometry | Chan series | Old leading-term formula |
|---|---|---|
| Isotropic covariance (any radius) | exact (< 1e-6 relative) | up to +21% |
| 10:1 elongated covariance | −1% to −6% | −1% to −6% |

The elongated-covariance error is the known limitation of Chan's equal-area approximation.

### Known limitations
- Covariances are fixed defaults per orbital band (`DEFAULT_COVARIANCE`), not real CDM covariances, and primary and secondary are assumed equal.
- In the pipeline, the miss vector is taken in the primary's RSW frame and the relative velocity is approximated as purely along-track; the Pc values are therefore screening-level estimates, not operational ones.
- No trained ML model is included; training requires exported CDM data and has not been evaluated in this repository.

---

## Tests

```bash
pip install numpy scipy sgp4 pytest
python -m pytest tests -q
```

The tests cover Chan's series against numerical integration, frame-rotation invariance of Pc, severity tiers, TLE parsing, mean-motion-to-altitude conversion, RSW frame construction, TCA refinement on SGP4-propagated orbits and vectorized conjunction screening. They run on every push via GitHub Actions.

---

## Google Colab

The entire pipeline runs on Google Colab. Recommended notebook structure for team collaboration:

| Notebook | Agent(s) |
|----------|---------|
| `01_data_pipeline.ipynb` | tle-ingestion + orbit-propagation |
| `02_conjunction_analysis.ipynb` | conjunction-analysis |
| `03_ml_model.ipynb` | ml-scoring (use GPU runtime) |
| `04_alerts_viz.ipynb` | alert-reporting + visualization |

Mount a shared Google Drive folder so all notebooks read/write to the same location.

```python
# Add to top of each notebook
from google.colab import drive
drive.mount('/content/drive')
import os, subprocess
subprocess.run(['git', 'clone', 'https://github.com/YOUR_USERNAME/bursenal.git'])
os.chdir('bursenal')
```

---

## Project Structure

```
space-debris-tracking-system/
├── agents/
│   ├── tle-ingestion-agent/        # TLE data fetching & validation
│   ├── orbit-propagation-agent/    # SGP4 propagation & screening
│   ├── conjunction-analysis-agent/ # TCA, Pc, ML features
│   ├── ml-scoring-agent/           # ML training & inference
│   └── alert-reporting-agent/      # Alerts & weekly reports
│
├── knowledge/
│   ├── SATELLITE_REGISTRY.md       # Turkish satellite NORAD IDs & specs
│   ├── ORBITAL_MECHANICS_REFERENCE.md
│   └── DEBRIS_CATALOG_GUIDE.md     # CelesTrak & Space-Track guide
│
├── scripts/                        # Historical CDM fetch & processing
├── index.html                      # Interactive Collision Tracker UI (static sample alerts, not wired to the pipeline)
├── app.js                          # Web visualizer & telemetry engine
└── requirements.txt
```

---

## Data Sources

| Source | URL | Auth | What it provides |
|--------|-----|------|-----------------|
| CelesTrak | celestrak.org | None (free) | TLEs for 8,000+ objects |
| Space-Track | space-track.org | Free account | Full GP catalog, CDM data |

---

## Tech Stack

- **SGP4** — NASA standard orbit propagation
- **Chan series** — analytic 2D collision probability, validated against numerical integration
- **Random Forest** — tabular risk scoring (scikit-learn)
- **LSTM** — temporal approach sequence model (TensorFlow)
- **SHAP** — model explainability

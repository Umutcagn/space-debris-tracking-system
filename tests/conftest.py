import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent

# Agent scripts live in hyphenated folders, so they are loaded by path instead of imported
SCRIPTS = {
    "compute_pc": "agents/conjunction-analysis-agent/scripts/compute_pc.py",
    "compute_tca": "agents/conjunction-analysis-agent/scripts/compute_tca.py",
    "validate_tles": "agents/tle-ingestion-agent/scripts/validate_tles.py",
    "screen_conjunctions": "agents/orbit-propagation-agent/scripts/screen_conjunctions.py",
}

# Synthetic ISS-like TLE (epoch 2024-01-01 12:00 UTC)
ISS_LINE1 = "1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9994"
ISS_LINE2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / SCRIPTS[name])
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def compute_pc():
    return load_script("compute_pc")


@pytest.fixture(scope="session")
def compute_tca():
    return load_script("compute_tca")


@pytest.fixture(scope="session")
def validate_tles():
    return load_script("validate_tles")


@pytest.fixture(scope="session")
def screen_conjunctions():
    return load_script("screen_conjunctions")

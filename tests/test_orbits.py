from datetime import datetime, timezone

import numpy as np
import pytest
from sgp4.api import Satrec

from conftest import ISS_LINE1, ISS_LINE2


def test_parse_tle_fields(validate_tles):
    assert validate_tles.parse_epoch(ISS_LINE1) == datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
    assert validate_tles.parse_mean_motion(ISS_LINE2) == pytest.approx(15.72125391)
    assert validate_tles.parse_bstar(ISS_LINE1) == pytest.approx(0.10270e-3)


def test_parse_epoch_rejects_garbage(validate_tles):
    assert validate_tles.parse_epoch("not a tle line") is None


@pytest.mark.parametrize("mean_motion, altitude_km, tol_km", [
    (15.72125391, 340.0, 15.0),   # low LEO (ISS-like)
    (1.00273791, 35786.0, 5.0),   # geostationary
])
def test_mean_motion_to_altitude(validate_tles, mean_motion, altitude_km, tol_km):
    assert validate_tles.mean_motion_to_altitude(mean_motion) == pytest.approx(altitude_km, abs=tol_km)


def test_rsw_frame_is_right_handed_orthonormal(compute_tca):
    pos = np.array([6778.0, 120.0, -40.0])
    vel = np.array([0.1, 7.6, 1.2])
    r, s, w = compute_tca.compute_rsw_frame(pos, vel)
    basis = np.column_stack([r, s, w])
    assert np.allclose(basis.T @ basis, np.eye(3), atol=1e-12)
    assert np.allclose(np.cross(r, s), w, atol=1e-12)
    assert np.dot(s, vel) > 0


def test_tca_finds_local_minimum_and_consistent_geometry(compute_tca):
    primary = Satrec.twoline2rv(ISS_LINE1, ISS_LINE2)
    # Secondary on a slightly rotated plane (RAAN +0.5 deg), so the orbits cross
    line2_secondary = ISS_LINE2[:17] + "247.9627" + ISS_LINE2[25:]
    secondary = Satrec.twoline2rv(ISS_LINE1, line2_secondary)

    result = compute_tca.compute_tca_for_pair(primary, secondary, primary.jdsatepoch, primary.jdsatepochF)
    assert result is not None

    def distance(jd_full):
        jd_i = int(jd_full)
        _, r1, _ = primary.sgp4(jd_i, jd_full - jd_i)
        _, r2, _ = secondary.sgp4(jd_i, jd_full - jd_i)
        return np.linalg.norm(np.subtract(r2, r1))

    tca = result["tca_jd"]
    assert distance(tca) <= distance(tca - 1 / 86400) + 1e-6
    assert distance(tca) <= distance(tca + 1 / 86400) + 1e-6

    rsw = np.array([result["radial_miss_km"], result["intrack_miss_km"], result["crosstrack_miss_km"]])
    assert np.linalg.norm(rsw) == pytest.approx(result["miss_distance_km"], rel=1e-9)


def test_screen_band_flags_close_objects_only(screen_conjunctions):
    turkish_id = next(iter(screen_conjunctions.TURKISH_NORAD_IDS))
    steps = 10
    track = np.stack([np.linspace(7000, 7010, steps), np.zeros(steps), np.zeros(steps)], axis=1)
    positions = np.stack([
        track,
        track + np.array([0.0, 5.0, 0.0]),     # 5 km away the whole window
        track + np.array([0.0, 500.0, 0.0]),   # far away
    ]).astype(np.float32)
    norad_ids = np.array([turkish_id, 90001, 90002], dtype=np.int32)

    candidates = screen_conjunctions.screen_band(positions, norad_ids, "LEO", threshold_km=50.0)
    assert [c["debris_norad_id"] for c in candidates] == [90001]
    assert candidates[0]["coarse_min_dist_km"] == pytest.approx(5.0, abs=1e-3)

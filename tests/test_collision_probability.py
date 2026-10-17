import math

import numpy as np
import pytest
from scipy import integrate


def numerical_pc(x, y, sigma_u, sigma_v, hbr):
    """Reference: integrate the 2D Gaussian density over the hard-body circle."""
    def density(yy, xx):
        return math.exp(-0.5 * ((xx / sigma_u) ** 2 + (yy / sigma_v) ** 2)) / (2 * math.pi * sigma_u * sigma_v)

    def half_chord(xx):
        return math.sqrt(max(hbr * hbr - (xx - x) ** 2, 0.0))

    value, _ = integrate.dblquad(density, x - hbr, x + hbr,
                                 lambda xx: y - half_chord(xx), lambda xx: y + half_chord(xx),
                                 epsabs=1e-14, epsrel=1e-10)
    return value


@pytest.mark.parametrize("x, y, sigma, hbr", [
    (0.1, 0.0, 0.14, 0.02),    # typical LEO default covariance
    (0.5, 0.2, 0.30, 0.05),
    (0.0, 0.0, 0.05, 0.04),    # head-on, HBR comparable to sigma
    (0.02, 0.0, 0.03, 0.03),
])
def test_chan_series_is_exact_for_isotropic_covariance(compute_pc, x, y, sigma, hbr):
    expected = numerical_pc(x, y, sigma, sigma, hbr)
    assert compute_pc.chan_series_pc(x, y, sigma, sigma, hbr) == pytest.approx(expected, rel=1e-6)


@pytest.mark.parametrize("x, y, sigma_u, sigma_v, hbr", [
    (0.3, 0.1, 0.14, 1.41, 0.02),   # 10:1 in-track elongation (LEO default)
    (1.0, 0.5, 0.20, 2.00, 0.03),
])
def test_chan_series_stays_close_for_elongated_covariance(compute_pc, x, y, sigma_u, sigma_v, hbr):
    # Chan's equal-area approximation is not exact here; known error is a few percent
    expected = numerical_pc(x, y, sigma_u, sigma_v, hbr)
    assert compute_pc.chan_series_pc(x, y, sigma_u, sigma_v, hbr) == pytest.approx(expected, rel=0.10)


def test_pc_is_invariant_to_frame_rotation(compute_pc):
    rng = np.random.default_rng(0)
    miss = np.array([0.12, 0.40, -0.05])
    rel_vel = np.array([0.3, 7.2, 1.1])
    cov = np.diag([0.02, 2.0, 0.02])
    hbr = 0.02

    q, _ = np.linalg.qr(rng.normal(size=(3, 3)))
    base = compute_pc.chan_pc(miss, rel_vel, cov, hbr)
    rotated = compute_pc.chan_pc(q @ miss, q @ rel_vel, q @ cov @ q.T, hbr)
    assert rotated == pytest.approx(base, rel=1e-9)


def test_pc_ignores_miss_component_along_relative_velocity(compute_pc):
    rel_vel = np.array([0.0, 7.5, 0.0])
    cov = np.diag([0.02, 2.0, 0.02])
    in_plane = compute_pc.chan_pc(np.array([0.1, 0.0, 0.05]), rel_vel, cov, 0.02)
    with_along_track = compute_pc.chan_pc(np.array([0.1, 3.0, 0.05]), rel_vel, cov, 0.02)
    assert with_along_track == pytest.approx(in_plane, rel=1e-9)


def test_pc_decreases_with_miss_distance(compute_pc):
    rel_vel = np.array([0.0, 7.5, 0.0])
    cov = np.diag([0.02, 2.0, 0.02])
    pcs = [compute_pc.chan_pc(np.array([d, 0.0, 0.0]), rel_vel, cov, 0.02) for d in (0.05, 0.2, 0.5, 1.0)]
    assert pcs == sorted(pcs, reverse=True)
    assert pcs[-1] < 1e-6 < pcs[0]


@pytest.mark.parametrize("pc, tier", [(2e-3, "RED"), (1e-3, "RED"), (5e-4, "ORANGE"), (1e-6, "YELLOW"), (1e-9, "GREEN"), (0.0, "GREEN")])
def test_assign_tier_thresholds(compute_pc, pc, tier):
    assert compute_pc.assign_tier(pc) == tier

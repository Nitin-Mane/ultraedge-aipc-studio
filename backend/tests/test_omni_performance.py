"""Tests for low-latency Omni audio generation primitives."""

from __future__ import annotations

import pytest

from app.runtime.omni.ode import create_ode_solver
from app.runtime.speech import _tts_generation_limits


def test_euler_uses_one_model_call_per_interval():
    calls = 0

    def derivative(_time, value):
        nonlocal calls
        calls += 1
        return value

    result = create_ode_solver("euler", derivative, 1.0).integrate_final(
        [0.0, 0.25, 0.5, 0.75, 1.0]
    )

    assert calls == 4
    assert result > 1.0


def test_rk4_uses_four_model_calls_per_interval():
    calls = 0

    def derivative(_time, value):
        nonlocal calls
        calls += 1
        return value

    result = create_ode_solver("rk4", derivative, 1.0).integrate_final(
        [0.0, 0.25, 0.5, 0.75, 1.0]
    )

    assert calls == 16
    assert result == pytest.approx(2.71828, rel=1e-3)


def test_unknown_solver_is_rejected():
    with pytest.raises(ValueError, match="euler.*rk4"):
        create_ode_solver("unknown", lambda _time, value: value, 1.0)


def test_fast_tts_profile_has_smaller_budgets():
    text = "This is a short spoken response for the real-time voice agent."
    fast = _tts_generation_limits(text, "fast")
    balanced = _tts_generation_limits(text, "balanced")

    assert fast[0] <= balanced[0]
    assert fast[1] <= balanced[1]
    assert fast[2] < balanced[2]

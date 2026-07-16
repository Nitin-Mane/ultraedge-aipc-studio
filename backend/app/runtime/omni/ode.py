"""Small ODE solvers used by the token2wav flow-matching decoder."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any


class EulerODESolver:
    """First-order solver optimized for low-latency token2wav inference."""

    def __init__(self, function: Callable, initial_value: Any):
        self.function = function
        self.initial_value = initial_value

    def integrate_final(self, time_points: Sequence):
        if len(time_points) < 2:
            raise ValueError("At least two ODE time points are required")
        value = self.initial_value
        for time_start, time_end in zip(time_points[:-1], time_points[1:], strict=False):
            value = value + (time_end - time_start) * self.function(time_start, value)
        return value


class RungeKutta4ODESolver:
    """Higher-quality RK4 fallback; approximately four times Euler's work."""

    def __init__(self, function: Callable, initial_value: Any):
        self.function = function
        self.initial_value = initial_value
        self._one_third = 1 / 3
        self._two_thirds = 2 / 3

    def _step(self, time_start, time_end, value_start):
        time_step = time_end - time_start
        k1 = self.function(time_start, value_start)
        k2 = self.function(
            time_start + time_step * self._one_third,
            value_start + time_step * k1 * self._one_third,
        )
        k3 = self.function(
            time_start + time_step * self._two_thirds,
            value_start + time_step * (k2 - k1 * self._one_third),
        )
        k4 = self.function(time_end, value_start + time_step * (k1 - k2 + k3))
        return value_start + (k1 + 3 * (k2 + k3) + k4) * time_step / 8

    def integrate_final(self, time_points: Sequence):
        if len(time_points) < 2:
            raise ValueError("At least two ODE time points are required")
        value = self.initial_value
        for time_start, time_end in zip(time_points[:-1], time_points[1:], strict=False):
            value = self._step(time_start, time_end, value)
        return value


def create_ode_solver(method: str, function: Callable, initial_value: Any):
    normalized = method.strip().lower()
    if normalized == "euler":
        return EulerODESolver(function, initial_value)
    if normalized == "rk4":
        return RungeKutta4ODESolver(function, initial_value)
    raise ValueError("token2wav solver must be 'euler' or 'rk4'")

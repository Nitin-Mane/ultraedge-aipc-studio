"""Tests for the mandatory Intel Core Ultra startup gate."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.hardware.suitability import (
    UnsupportedHardwareError,
    assess_hardware_suitability,
    require_supported_hardware,
)


@pytest.mark.parametrize(
    "cpu",
    [
        "Intel(R) Core(TM) Ultra 7 155H",
        "Intel Core Ultra 9 processor 288V",
    ],
)
def test_core_ultra_is_supported(cpu):
    result = assess_hardware_suitability(cpu)
    assert result.suitable is True
    assert result.requirement == "Intel Core Ultra processor"


@pytest.mark.parametrize(
    "cpu",
    [
        "Intel(R) Core(TM) i7-13700H",
        "AMD Ryzen 9 7940HS",
        "Apple M3 Pro",
        "Unknown CPU",
    ],
)
def test_non_ultra_cpu_is_rejected(cpu):
    assert assess_hardware_suitability(cpu).suitable is False


def test_required_gate_raises_on_unsupported_cpu():
    with patch(
        "app.hardware.suitability.detect_cpu_name",
        return_value="Intel Core i7-12700H",
    ):
        with pytest.raises(UnsupportedHardwareError, match="will not start"):
            require_supported_hardware()

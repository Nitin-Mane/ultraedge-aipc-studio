"""Tests for app.runtime.device_policy — hardware detection and resolution."""

from __future__ import annotations

from unittest.mock import patch

from app.runtime.device_policy import (
    HardwareCapabilities,
    detect_hardware,
    resolve_device,
    resolve_omni_devices,
)


def test_hardware_capabilities_defaults():
    caps = HardwareCapabilities()
    assert caps.has_gpu is False
    assert caps.has_npu is False
    assert caps.best_device == "CPU"


@patch("app.runtime.device_policy.detect_hardware")
def test_resolve_auto_defaults_to_cpu(mock_detect):
    mock_detect.return_value = HardwareCapabilities(has_gpu=False, has_npu=False, best_device="CPU")
    assert resolve_device("AUTO") == "CPU"


@patch("app.runtime.device_policy.detect_hardware")
def test_resolve_auto_prefers_gpu(mock_detect):
    mock_detect.return_value = HardwareCapabilities(has_gpu=True, has_npu=False, best_device="GPU")
    assert resolve_device("AUTO") == "GPU"


@patch("app.runtime.device_policy.detect_hardware")
def test_resolve_auto_prefers_npu_over_cpu(mock_detect):
    mock_detect.return_value = HardwareCapabilities(has_gpu=False, has_npu=True, best_device="NPU")
    assert resolve_device("AUTO") == "NPU"


@patch("app.runtime.device_policy.detect_hardware")
def test_resolve_explicit_device_passthrough(mock_detect):
    mock_detect.return_value = HardwareCapabilities(has_gpu=True, best_device="GPU")
    assert resolve_device("CPU") == "CPU"
    assert resolve_device("NPU") == "NPU"


@patch("app.runtime.device_policy.detect_hardware")
def test_omni_devices_dit_always_cpu(mock_detect):
    mock_detect.return_value = HardwareCapabilities(has_gpu=True, best_device="GPU")
    devices = resolve_omni_devices("AUTO")
    assert devices["dit"] == "CPU"
    assert devices["thinker"] == "GPU"
    assert devices["audio"] == "GPU"


@patch("app.runtime.device_policy.detect_hardware")
def test_omni_devices_no_gpu_all_cpu_except_dit(mock_detect):
    mock_detect.return_value = HardwareCapabilities(has_gpu=False, has_npu=False, best_device="CPU")
    devices = resolve_omni_devices("AUTO")
    assert devices["thinker"] == "CPU"
    assert devices["audio"] == "CPU"
    assert devices["dit"] == "CPU"


@patch("app.runtime.device_policy.detect_hardware")
def test_omni_devices_explicit_cpu_no_gpu(mock_detect):
    """When user requests CPU and there is no GPU, all components go to CPU."""
    mock_detect.return_value = HardwareCapabilities(has_gpu=False, has_npu=False, best_device="CPU")
    devices = resolve_omni_devices("CPU")
    assert devices["thinker"] == "CPU"
    assert devices["audio"] == "CPU"
    assert devices["dit"] == "CPU"


@patch("app.hardware.scanner.scan_hardware", side_effect=Exception("scanner broken"))
def test_detect_hardware_gracefully_handles_scan_failure(_mock_scan):
    caps = detect_hardware()
    assert caps.has_gpu is False
    assert caps.best_device == "CPU"

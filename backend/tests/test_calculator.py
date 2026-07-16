import pytest

from app.runtime.inference import _safe_calculate


def test_safe_calculator_supports_arithmetic():
    assert _safe_calculate("(2 + 3) * 4") == 20
    assert _safe_calculate("7 / 2") == 3.5


@pytest.mark.parametrize(
    "expression",
    ["__import__('os').system('whoami')", "2 ** 999999", "1" * 101],
)
def test_safe_calculator_rejects_unsafe_or_expensive_input(expression):
    with pytest.raises((ValueError, SyntaxError)):
        _safe_calculate(expression)

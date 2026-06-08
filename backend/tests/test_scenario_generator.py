"""Tests for adversarial scenario generation."""

import pytest
from app.models.schemas import AttackCategory, Severity
from app.services.scenario_generator import (
    generate_scenarios,
    ADVERSARIAL_SCENARIOS,
    _hardcoded_fallback,
)


def test_all_attack_categories_have_templates():
    """Every attack category must have at least one hardcoded template."""
    for cat in AttackCategory:
        assert cat in ADVERSARIAL_SCENARIOS, f"Missing templates for {cat.value}"
        assert len(ADVERSARIAL_SCENARIOS[cat]) >= 2, f"Need at least 2 templates for {cat.value}"


def test_data_exfiltration_templates():
    """Verify the new data_exfiltration category has scenarios."""
    scenarios = ADVERSARIAL_SCENARIOS[AttackCategory.DATA_EXFILTRATION]
    assert len(scenarios) >= 2
    for s in scenarios:
        assert "severity" in s
        assert "input" in s
        assert "expected_behavior" in s


def test_hardcoded_fallback_returns_subset():
    cats = [AttackCategory.PROMPT_INJECTION, AttackCategory.PARAMETER_ATTACK]
    result = _hardcoded_fallback(cats, count=5)
    assert len(result) <= 5
    assert len(result) > 0
    for s in result:
        assert s.category in cats
        assert s.id  # has an ID
        assert s.input  # has input text


def test_hardcoded_fallback_count_limit():
    """Requesting fewer scenarios than available should return count."""
    result = _hardcoded_fallback(list(AttackCategory), count=3)
    assert len(result) <= 3


def test_generate_scenarios_without_tools():
    """Without tool definitions and no API key, should use hardcoded fallback."""
    scenarios = generate_scenarios(
        tool_definitions=[],
        categories=[AttackCategory.PROMPT_INJECTION],
        count=5,
    )
    assert len(scenarios) > 0
    for s in scenarios:
        assert s.category == AttackCategory.PROMPT_INJECTION


def test_generate_scenarios_covers_categories():
    """All requested categories should be represented in the output."""
    cats = [AttackCategory.TOOL_MISUSE, AttackCategory.EDGE_CASE, AttackCategory.MULTI_TURN]
    scenarios = generate_scenarios(tool_definitions=[], categories=cats, count=10)
    categories_in_result = {s.category for s in scenarios}
    assert categories_in_result == set(cats)


def test_generate_scenarios_default_categories():
    """Without specifying categories, should use all categories."""
    scenarios = generate_scenarios(tool_definitions=[], count=30)
    cats_in_result = {s.category for s in scenarios}
    assert len(cats_in_result) >= 5  # should cover most categories

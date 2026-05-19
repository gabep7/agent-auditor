"""PDF report generator for completed audits.

Generates a formatted PDF security report with cover page, executive summary,
category breakdown, full scenario details, judge evaluations, remediation
suggestions, and rule violation heatmap data.

Uses fpdf2 — pure Python, zero system dependencies.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fpdf import FPDF

from app.models.schemas import AuditResult, Severity
from app.services.rule_analysis import analyse_rule_violations


# ── Colour palette ─────────────────────────────────────────────────────

_COLORS = {
    "critical": (220, 38, 38),
    "high": (234, 88, 12),
    "medium": (202, 138, 4),
    "low": (37, 99, 235),
    "info": (71, 85, 105),
    "pass": (22, 163, 74),
    "bg_dark": (15, 23, 42),
    "bg_card": (241, 245, 249),
    "border": (203, 213, 225),
    "text_primary": (15, 23, 42),
    "text_secondary": (71, 85, 105),
    "muted": (100, 116, 139),
    "accent": (16, 185, 129),
    "accent_blue": (2, 132, 199),
}

class AuditPDF(FPDF):
    """Custom PDF class with header/footer."""

    def __init__(self, result: AuditResult):
        super().__init__()
        self.result = result
        self.rule_data = None
        # Try to get rule analysis
        try:
            self.rule_data = analyse_rule_violations(result)
        except Exception:
            pass
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() <= 1:
            return  # Cover page has its own header
        self.set_fill_color(*_COLORS["bg_dark"])
        self.rect(0, 0, 210, 14, style="F")
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(255, 255, 255)
        self.set_xy(12, 4)
        self.cell(0, 6, "Agent Auditor Security Report", align="L")
        self.ln(13)

    def footer(self):
        if self.page_no() <= 1:
            return
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*_COLORS["text_secondary"])
        self.cell(0, 10, f"Page {self.page_no() - 1}", align="C")

    def _section_title(self, title: str):
        title = self._sanitize(title)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*_COLORS["bg_dark"])
        self.cell(0, 10, title)
        self.ln(2)
        self.set_draw_color(*_COLORS["accent_blue"])
        self.set_line_width(0.5)
        self.line(self.get_x(), self.get_y(), self.get_x() + 55, self.get_y())
        self.ln(6)

    def _sub_title(self, title: str):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*_COLORS["accent_blue"])
        self.cell(0, 7, self._sanitize(title))
        self.ln(5)

    def _metric_card(self, x: float, y: float, w: float, title: str, value: str, color: tuple):
        self.set_xy(x, y)
        self.set_fill_color(*_COLORS["bg_card"])
        self.set_draw_color(*_COLORS["border"])
        self.rect(x, y, w, 24, style="DF")
        self.set_xy(x + 4, y + 4)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*_COLORS["muted"])
        self.cell(w - 8, 5, self._sanitize(title.upper()))
        self.set_xy(x + 4, y + 11)
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(*color)
        self.cell(w - 8, 8, self._sanitize(value))

    def _sanitize(self, text: Any) -> str:
        """Strip or replace characters that Helvetica core font can't render."""
        if text is None:
            return ""
        text = str(text)
        replacements = {
            "\u2014": "--",   # em dash
            "\u2013": "-",    # en dash
            "\u2018": "'",    # left single quote
            "\u2019": "'",    # right single quote
            "\u201c": "\"",   # left double quote
            "\u201d": "\"",   # right double quote
            "\u2026": "...",  # ellipsis
            "\u00a0": " ",    # non-breaking space
            "\u2022": "-",     # bullet
            "\u2122": "(TM)",
            "\u00ae": "(R)",
            "\u00a9": "(C)",
            "\u2713": "OK",
            "\u2714": "OK",
            "\u2705": "OK",
            "\u274c": "X",
            "\u26a0": "!",
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        # Strip any remaining non-latin-1
        return text.encode("latin-1", errors="replace").decode("latin-1")

    def _body_text(self, text: str, indent: float = 0):
        text = self._sanitize(text)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*_COLORS["text_primary"])
        self.multi_cell(0, 4.5, text, align="L")
        self.ln(1)

    def _label_value(self, label: str, value: str, color=None):
        label = self._sanitize(label)
        value = self._sanitize(value)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*_COLORS["text_secondary"])
        self.cell(40, 5, label)
        self.set_font("Helvetica", "", 8)
        if color:
            self.set_text_color(*color)
        else:
            self.set_text_color(*_COLORS["text_primary"])
        self.cell(0, 5, value)
        self.ln(5)

    def _verdict_color(self, score: float) -> tuple:
        if score < 40:
            return _COLORS["critical"]
        if score < 70:
            return _COLORS["high"]
        if score < 90:
            return _COLORS["medium"]
        return _COLORS["pass"]

    def _severity_color(self, severity: str) -> tuple:
        return _COLORS.get(str(severity).lower(), _COLORS["info"])

    def _colored_cell(self, w: float, h: float, text: str, color: tuple, align: str = "C"):
        """Draw a filled cell with coloured background."""
        self.set_fill_color(*color)
        self.set_font("Helvetica", "B", 7)
        if color == _COLORS["bg_card"]:
            self.set_text_color(*_COLORS["text_primary"])
        else:
            self.set_text_color(255, 255, 255)
        self.cell(w, h, self._sanitize(text), align=align, fill=True)

    def _progress_bar(self, w: float, h: float, pct: float, color: tuple):
        """Draw a progress bar."""
        self.set_fill_color(*_COLORS["bg_card"])
        self.rect(self.get_x(), self.get_y(), w, h, style="F")
        self.set_fill_color(*color)
        self.rect(self.get_x(), self.get_y(), w * min(max(pct, 0) / 100, 1), h, style="F")

    # ── Cover page ────────────────────────────────────────────

    def render_cover(self):
        self.add_page()
        self.set_fill_color(*_COLORS["bg_dark"])
        self.rect(0, 0, 210, 74, style="F")
        self.set_fill_color(*_COLORS["accent"])
        self.rect(0, 72, 210, 2, style="F")
        self.set_xy(18, 20)

        # Title
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(255, 255, 255)
        self.cell(0, 13, "Agent Auditor")
        self.ln(11)

        self.set_font("Helvetica", "", 14)
        self.set_text_color(203, 213, 225)
        self.cell(0, 8, "Security Audit Report")
        self.set_xy(18, 88)

        score = self.result.overall_score or 0
        vcolor = self._verdict_color(score)
        if score < 40:
            verdict = "CRITICAL VULNERABILITIES"
        elif score < 70:
            verdict = "MAJOR ISSUES"
        elif score < 90:
            verdict = "SOME ISSUES"
        else:
            verdict = "PASSED"

        self.set_font("Helvetica", "B", 44)
        self.set_text_color(*vcolor)
        self.cell(58, 20, f"{int(score)}")
        self.set_font("Helvetica", "", 13)
        self.set_text_color(*_COLORS["muted"])
        self.cell(0, 20, "/100 overall score")
        self.ln(16)

        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*vcolor)
        self.cell(0, 9, verdict)
        self.ln(18)

        card_y = self.get_y()
        self._metric_card(18, card_y, 52, "Vulnerabilities", str(self.result.vulnerabilities_found), _COLORS["critical"] if self.result.vulnerabilities_found else _COLORS["pass"])
        self._metric_card(78, card_y, 52, "Scenarios", str(self.result.scenarios_run), _COLORS["accent_blue"])
        self._metric_card(138, card_y, 52, "Categories", str(len(self.result.category_scores or {})), _COLORS["info"])
        self.set_y(card_y + 36)

        # Metadata
        self._label_value("Target Agent:", self.result.agent_name.replace("target_agent", "Enterprise Support"))
        self._label_value("Audit ID:", self.result.id)
        self._label_value("Date:", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
        self._label_value("Scenarios:", f"{self.result.scenarios_run} run, {self.result.vulnerabilities_found} vulnerabilities")
        if self.result.category_scores:
            best_cat = max(self.result.category_scores.items(), key=lambda x: x[1])
            worst_cat = min(self.result.category_scores.items(), key=lambda x: x[1])
            self._label_value("Best category:", f"{best_cat[0]}: {best_cat[1]}/100")
            self._label_value("Worst category:", f"{worst_cat[0]}: {worst_cat[1]}/100")

    # ── Executive summary ─────────────────────────────────────

    def render_summary(self):
        self.add_page()
        self._section_title("Executive Summary")
        self.ln(2)

        score = self.result.overall_score or 0
        vcolor = self._verdict_color(score)

        self._label_value("Overall Score:", f"{int(score)}/100", vcolor)
        self._label_value("Vulnerabilities:", str(self.result.vulnerabilities_found),
                          _COLORS["critical"] if self.result.vulnerabilities_found > 0 else _COLORS["pass"])
        self._label_value("Scenarios Run:", str(self.result.scenarios_run))
        self._label_value("Scenarios Planned:", str(self.result.total_scenarios))
        self.ln(4)

        self._sub_title("Critical Findings")
        if self.result.critical_findings:
            for i, finding in enumerate(self.result.critical_findings[:10]):
                self.set_font("Helvetica", "", 7)
                self.set_text_color(*_COLORS["critical"])
                self.cell(5, 4, f"{i + 1}.")
                self.set_text_color(*_COLORS["text_primary"])
                self.multi_cell(0, 4, self._sanitize(finding[:300]))
                self.ln(0.5)
        else:
            self._body_text("No critical findings. Agent passed all high-severity tests.")
        self.ln(4)

        self._sub_title("Category Scores")
        if self.result.category_scores:
            for cat, cat_score in sorted(self.result.category_scores.items(), key=lambda x: x[1]):
                cat_color = _COLORS["pass"] if cat_score >= 70 else _COLORS["high"] if cat_score >= 40 else _COLORS["critical"]
                sev_label = "Low" if cat_score >= 70 else "Medium" if cat_score >= 40 else "High"
                x, y = self.get_x(), self.get_y()
                self.set_font("Helvetica", "B", 8)
                self.set_text_color(*_COLORS["text_primary"])
                self.cell(52, 6, self._sanitize(cat.replace("_", " ").title()))
                self._progress_bar(78, 4, cat_score, cat_color)
                self.set_xy(x + 136, y)
                self.set_font("Helvetica", "B", 8)
                self.set_text_color(*cat_color)
                self.cell(20, 6, f"{int(cat_score)}/100", align="R")
                self.set_font("Helvetica", "", 7)
                self.cell(28, 6, sev_label, align="R")
                self.ln(7)

    # ── Scenario details ──────────────────────────────────────

    def render_scenarios(self):
        self.add_page()
        self._section_title("Scenario Details")
        self.ln(2)

        for i, scenario in enumerate(self.result.scenarios):
            # Check if we need a new page (estimated space)
            if self.get_y() > 240 and self.pages_count < 50:
                self.add_page()

            is_vuln = scenario.vulnerability_found
            col = _COLORS["critical"] if is_vuln else _COLORS["pass"]
            bg = _COLORS["critical"] if is_vuln else _COLORS["bg_card"]

            # Scenario header
            self.set_fill_color(254, 242, 242 if is_vuln else 240)
            self.set_draw_color(*(_COLORS["critical"] if is_vuln else _COLORS["border"]))
            self.set_font("Helvetica", "B", 8)
            if is_vuln:
                self.set_text_color(*_COLORS["critical"])
                self.cell(0, 7, self._sanitize(f"[VULNERABLE] Scenario {i + 1}: {scenario.name}"), border=1, fill=True)
            else:
                self.set_text_color(*_COLORS["pass"])
                self.cell(0, 7, self._sanitize(f"[PASS] Scenario {i + 1}: {scenario.name}"), border=1, fill=True)
            self.ln(8)

            # Severity + category badges
            sev_col = self._severity_color(scenario.severity.value)
            self._colored_cell(15, 4, scenario.severity.value.upper(), sev_col)
            self._colored_cell(25, 4, scenario.category.value.replace("_", " ").title(), _COLORS["info"] if not is_vuln else _COLORS["high"])
            self.cell(10, 4, "")
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*col)
            self.cell(0, 4, self._sanitize(f"Score: {int(scenario.score or 0)}/100"))
            self.ln(6)

            # Attack input
            self._sub_title("Attack Input")
            self._body_text(scenario.input[:500])

            # Target response
            self._sub_title("Target Response")
            self._body_text((scenario.target_response or "(empty)")[:400])

            # Tool calls
            if scenario.target_tool_calls:
                self._sub_title("Tool Calls")
                tool_str = ", ".join(t.get("name", "") for t in scenario.target_tool_calls)
                self._body_text(tool_str)

            # Judge evaluation
            if scenario.auditor_evaluation:
                self._sub_title("LLM Judge Reasoning")
                self._body_text(scenario.auditor_evaluation)

            # Remediation
            if scenario.remediation:
                self._sub_title("Remediation")
                self.set_fill_color(255, 251, 235)
                self.set_draw_color(234, 179, 8)
                self.set_font("Helvetica", "", 7)
                self.set_text_color(78, 50, 0)
                x0, y0 = self.get_x(), self.get_y()
                self.multi_cell(0, 4, self._sanitize(scenario.remediation), border=1, fill=True)
                self.ln(1)

            self.ln(3)

    # ── Rule analysis ─────────────────────────────────────────

    def render_rules(self):
        if not self.rule_data or not self.rule_data.get("rule_summary"):
            return

        self.add_page()
        self._section_title("Security Rule Violation Analysis")
        self.ln(2)

        self._body_text(
            "The following analysis maps each audited scenario against the enterprise "
            "victim's system prompt security rules. Red bars indicate rules that were "
            "bypassed; green bars indicate rules that held."
        )
        self.ln(4)

        rules = sorted(self.rule_data["rule_summary"].items(), key=lambda x: x[1]["rate"], reverse=True)

        for rule_id, rule in rules:
            rate = rule["rate"]
            bar_width = 80
            bar_color = _COLORS["critical"] if rate > 0.5 else _COLORS["high"] if rate > 0.2 else _COLORS["pass"]
            label = self._sanitize(f"{rule_id}: {rule['label']}")

            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*_COLORS["text_primary"])
            self.cell(60, 5, label)
            self.set_font("Helvetica", "", 7)
            self.set_text_color(*_COLORS["text_secondary"])
            self.cell(20, 5, self._sanitize(f"{rule['violations']}/{rule['total_tests']} failed"), align="R")

            # Progress bar
            pct = rate * 100
            self._progress_bar(60, 4, pct, bar_color)
            self.ln(5)

            # Percentage
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*bar_color)
            self.cell(0, 4, f"{int(pct)}% violation rate")
            self.ln(3)

        self.ln(4)
        self._sub_title("Most Violated Rules")
        for r in self.rule_data.get("most_violated", []):
            self._body_text(f"{r['rule_id']}: {r['label']} — {int(r['rate'] * 100)}% violation rate")

        self._sub_title("Best Performing Rules")
        for r in self.rule_data.get("least_violated", []):
            self._body_text(f"{r['rule_id']}: {r['label']} — {int(r['rate'] * 100)}% violation rate")

    # ── Remediation summary ───────────────────────────────────

    def render_remediation_summary(self):
        vulns = [s for s in self.result.scenarios if s.vulnerability_found and s.remediation]
        if not vulns:
            return

        self.add_page()
        self._section_title("Remediation Summary")
        self._body_text(
            "The following remediation suggestions target the specific vulnerabilities "
            "found during this audit. Each suggestion identifies the affected component "
            "and describes the fix in developer-actionable language."
        )
        self.ln(4)

        # sort by severity
        sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        vulns.sort(key=lambda s: sev_order.get(s.severity.value if hasattr(s.severity, 'value') else str(s.severity), 5))

        for i, s in enumerate(vulns):
            if self.get_y() > 250:
                self.add_page()

            sev_col = self._severity_color(s.severity.value if hasattr(s.severity, 'value') else str(s.severity))

            self.set_font("Helvetica", "B", 9)
            self.set_text_color(*sev_col)
            severity_label = s.severity.value.upper() if hasattr(s.severity, 'value') else str(s.severity).upper()
            self.cell(0, 6, self._sanitize(f"{i + 1}. [{severity_label}] {s.name}"))
            self.ln(7)

            self.set_font("Helvetica", "", 7)
            self.set_text_color(*_COLORS["text_secondary"])
            self.cell(0, 4, self._sanitize(f"Category: {s.category.value.replace('_', ' ').title()}  |  Tools: {', '.join(t.get('name', '') for t in s.target_tool_calls) or 'none'}"))
            self.ln(6)

            self.set_fill_color(255, 251, 235)
            self.set_draw_color(234, 179, 8)
            self.set_font("Helvetica", "", 7)
            self.set_text_color(78, 50, 0)
            self.multi_cell(0, 4, self._sanitize(s.remediation), border=1, fill=True)
            self.ln(4)

    # ── Build full report ─────────────────────────────────────

    def build(self) -> bytes:
        self.render_cover()
        self.render_summary()
        self.render_scenarios()
        self.render_remediation_summary()
        self.render_rules()
        raw = self.output(dest="S")
        if isinstance(raw, bytearray):
            return bytes(raw)
        if isinstance(raw, bytes):
            return raw
        return raw.encode("latin-1")


def generate_pdf_report(result: AuditResult) -> bytes:
    """Generate a complete PDF security audit report.

    Returns the PDF as bytes for download.
    """
    pdf = AuditPDF(result)
    return pdf.build()

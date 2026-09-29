"""PDF report generator for completed audits.

Generates a dark-themed PDF security report matching the Agent Auditor UI.
Uses fpdf2: pure Python, zero system dependencies.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fpdf import FPDF

from app.models.schemas import AuditResult, Severity
from app.services.rule_analysis import analyse_rule_violations


# -- Dark theme palette (matches UI) -----------------------------------

_COLORS = {
    "bg": (9, 9, 11),            # #09090b
    "bg_card": (18, 18, 22),     # subtle card bg
    "surface": (28, 28, 34),     # elevated surface
    "border": (39, 39, 46),      # subtle borders
    "text": (228, 228, 231),     # #e4e4e7: white text
    "text_dim": (113, 113, 122), # #71717a: muted text
    "text_muted": (63, 63, 70),  # very muted
    "green": (74, 222, 128),     # #4ade80
    "red": (248, 113, 113),      # #f87171
    "yellow": (251, 191, 36),    # #fbbf24
    "blue": (96, 165, 250),      # #60a5fa
    "white": (250, 250, 250),    # #fafafa
}


class AuditPDF(FPDF):
    """Custom PDF class with dark theme header/footer."""

    def __init__(self, result: AuditResult):
        super().__init__()
        self.result = result
        self.rule_data = None
        try:
            self.rule_data = analyse_rule_violations(result)
        except Exception:
            pass
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() <= 1:
            return
        self.set_fill_color(*_COLORS["bg"])
        self.rect(0, 0, 210, 297, style="F")
        self.set_fill_color(*_COLORS["surface"])
        self.rect(0, 0, 210, 12, style="F")
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*_COLORS["text_dim"])
        self.set_xy(12, 3.5)
        self.cell(0, 5, "AGENT AUDITOR  |  SECURITY REPORT", align="L")
        self.set_xy(12, 14)

    def footer(self):
        if self.page_no() <= 1:
            return
        self.set_y(-15)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*_COLORS["text_muted"])
        self.cell(0, 10, f"{self.page_no() - 1}", align="C")

    def _fill_page_bg(self):
        self.set_fill_color(*_COLORS["bg"])
        self.rect(0, 0, 210, 297, style="F")

    def _section_title(self, title: str):
        title = self._sanitize(title)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*_COLORS["text"])
        self.cell(0, 8, title)
        self.ln(2)
        self.set_draw_color(*_COLORS["border"])
        self.set_line_width(0.3)
        self.line(self.get_x(), self.get_y(), self.get_x() + 50, self.get_y())
        self.ln(6)

    def _sub_title(self, title: str):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*_COLORS["text_dim"])
        self.cell(0, 6, self._sanitize(title))
        self.ln(5)

    def _metric_card(self, x: float, y: float, w: float, title: str, value: str, color: tuple):
        self.set_xy(x, y)
        self.set_fill_color(*_COLORS["surface"])
        self.set_draw_color(*_COLORS["border"])
        self.rect(x, y, w, 22, style="DF")
        self.set_xy(x + 4, y + 3)
        self.set_font("Helvetica", "", 6)
        self.set_text_color(*_COLORS["text_muted"])
        self.cell(w - 8, 4, self._sanitize(title.upper()))
        self.set_xy(x + 4, y + 10)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*color)
        self.cell(w - 8, 8, self._sanitize(value))

    def _sanitize(self, text: Any) -> str:
        """Strip or replace characters that Helvetica core font can't render."""
        if text is None:
            return ""
        text = str(text)
        replacements = {
            "\u2014": "--", "\u2013": "-", "\u2018": "'", "\u2019": "'",
            "\u201c": "\"", "\u201d": "\"", "\u2026": "...", "\u00a0": " ",
            "\u2022": "-", "\u2122": "(TM)", "\u00ae": "(R)", "\u00a9": "(C)",
            "\u2713": "OK", "\u2714": "OK", "\u2705": "OK", "\u274c": "X", "\u26a0": "!",
            "\u2192": "->", "\u2022": "-",
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        return text.encode("latin-1", errors="replace").decode("latin-1")

    def _body_text(self, text: str, indent: float = 0):
        text = self._sanitize(text)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(*_COLORS["text_dim"])
        self.multi_cell(0, 4.5, text, align="L")
        self.ln(1)

    def _label_value(self, label: str, value: str, color=None):
        label = self._sanitize(label)
        value = self._sanitize(value)
        self.set_font("Helvetica", "B", 7.5)
        self.set_text_color(*_COLORS["text_muted"])
        self.cell(35, 5, label)
        self.set_font("Helvetica", "", 7.5)
        if color:
            self.set_text_color(*color)
        else:
            self.set_text_color(*_COLORS["text"])
        self.cell(0, 5, value)
        self.ln(5)

    def _verdict_color(self, score: float) -> tuple:
        if score < 40:
            return _COLORS["red"]
        if score < 70:
            return _COLORS["yellow"]
        return _COLORS["green"]

    def _severity_color(self, severity: str) -> tuple:
        mapping = {
            "critical": _COLORS["red"],
            "high": (251, 146, 60),
            "medium": _COLORS["yellow"],
            "low": _COLORS["blue"],
            "info": _COLORS["text_muted"],
        }
        return mapping.get(str(severity).lower(), _COLORS["text_muted"])

    def _progress_bar(self, w: float, h: float, pct: float, color: tuple):
        self.set_fill_color(*_COLORS["surface"])
        self.rect(self.get_x(), self.get_y(), w, h, style="F")
        self.set_fill_color(*color)
        bar_w = w * min(max(pct, 0) / 100, 1)
        if bar_w > 0:
            self.rect(self.get_x(), self.get_y(), bar_w, h, style="F")

    # -- Cover page --------------------------------------------

    def render_cover(self):
        self.add_page()
        self._fill_page_bg()

        # Title block
        self.set_xy(18, 28)
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(*_COLORS["white"])
        self.cell(0, 12, "Agent Auditor")
        self.ln(10)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(*_COLORS["text_dim"])
        self.cell(0, 8, "Security Audit Report")
        self.ln(10)

        # Divider
        self.set_draw_color(*_COLORS["border"])
        self.set_line_width(0.3)
        self.line(18, self.get_y(), 192, self.get_y())
        self.ln(10)

        # Score
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

        self.set_font("Helvetica", "B", 48)
        self.set_text_color(*vcolor)
        self.cell(50, 20, f"{int(score)}")
        self.set_font("Helvetica", "", 12)
        self.set_text_color(*_COLORS["text_muted"])
        self.cell(0, 20, "/100")
        self.ln(16)

        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*vcolor)
        self.cell(0, 8, verdict)
        self.ln(14)

        # Metric cards
        card_y = self.get_y()
        vuln_col = _COLORS["red"] if self.result.vulnerabilities_found else _COLORS["green"]
        self._metric_card(18, card_y, 52, "Vulnerabilities", str(self.result.vulnerabilities_found), vuln_col)
        self._metric_card(78, card_y, 52, "Scenarios", str(self.result.scenarios_run), _COLORS["blue"])
        self._metric_card(138, card_y, 52, "Categories", str(len(self.result.category_scores or {})), _COLORS["text_dim"])
        self.set_y(card_y + 32)

        # Metadata
        self._label_value("Target:", self.result.agent_name.replace("target_agent", "Enterprise Support"))
        self._label_value("Audit ID:", self.result.id)
        self._label_value("Date:", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
        self._label_value("Scenarios:", f"{self.result.scenarios_run} run, {self.result.vulnerabilities_found} vulnerabilities")
        if self.result.category_scores:
            best_cat = max(self.result.category_scores.items(), key=lambda x: x[1])
            worst_cat = min(self.result.category_scores.items(), key=lambda x: x[1])
            self._label_value("Best:", f"{best_cat[0].replace('_', ' ').title()}: {int(best_cat[1])}/100", _COLORS["green"])
            self._label_value("Worst:", f"{worst_cat[0].replace('_', ' ').title()}: {int(worst_cat[1])}/100", _COLORS["red"])

    # -- Executive summary -------------------------------------

    def render_summary(self):
        self.add_page()
        self._fill_page_bg()
        self._section_title("Executive Summary")
        self.ln(2)

        score = self.result.overall_score or 0
        vcolor = self._verdict_color(score)

        self._label_value("Overall Score:", f"{int(score)}/100", vcolor)
        self._label_value("Vulnerabilities:", str(self.result.vulnerabilities_found),
                          _COLORS["red"] if self.result.vulnerabilities_found > 0 else _COLORS["green"])
        self._label_value("Scenarios Run:", str(self.result.scenarios_run))
        self.ln(4)

        self._sub_title("Critical Findings")
        if self.result.critical_findings:
            for i, finding in enumerate(self.result.critical_findings[:10]):
                self.set_font("Helvetica", "", 7)
                self.set_text_color(*_COLORS["red"])
                self.cell(5, 4, f"{i + 1}.")
                self.set_text_color(*_COLORS["text_dim"])
                self.multi_cell(0, 4, self._sanitize(finding[:300]))
                self.ln(0.5)
        else:
            self._body_text("No critical findings. Agent passed all high-severity tests.")
        self.ln(4)

        self._sub_title("Category Scores")
        if self.result.category_scores:
            for cat, cat_score in sorted(self.result.category_scores.items(), key=lambda x: x[1]):
                cat_color = _COLORS["green"] if cat_score >= 70 else _COLORS["yellow"] if cat_score >= 40 else _COLORS["red"]
                sev_label = "Low" if cat_score >= 70 else "Medium" if cat_score >= 40 else "High"
                x, y = self.get_x(), self.get_y()
                self.set_font("Helvetica", "", 7.5)
                self.set_text_color(*_COLORS["text"])
                self.cell(50, 6, self._sanitize(cat.replace("_", " ").title()))
                self._progress_bar(75, 3.5, cat_score, cat_color)
                self.set_xy(x + 132, y)
                self.set_font("Helvetica", "B", 7.5)
                self.set_text_color(*cat_color)
                self.cell(18, 6, f"{int(cat_score)}/100", align="R")
                self.set_font("Helvetica", "", 6.5)
                self.set_text_color(*_COLORS["text_muted"])
                self.cell(20, 6, sev_label, align="R")
                self.ln(7)

    # -- Scenario details --------------------------------------

    def render_scenarios(self):
        self.add_page()
        self._fill_page_bg()
        self._section_title("Scenario Details")
        self.ln(2)

        for i, scenario in enumerate(self.result.scenarios):
            if self.get_y() > 240 and self.pages_count < 50:
                self.add_page()
                self._fill_page_bg()

            is_vuln = scenario.vulnerability_found
            col = _COLORS["red"] if is_vuln else _COLORS["green"]

            # Scenario header
            self.set_fill_color(*_COLORS["surface"])
            self.set_draw_color(*_COLORS["border"])
            self.set_font("Helvetica", "B", 8)
            if is_vuln:
                self.set_text_color(*_COLORS["red"])
                prefix = "VULNERABLE"
            else:
                self.set_text_color(*_COLORS["green"])
                prefix = "PASS"
            self.cell(0, 7, self._sanitize(f"{prefix}  |  Scenario {i + 1}: {scenario.name}"), border="B", fill=True)
            self.ln(8)

            # Severity + category
            sev_col = self._severity_color(scenario.severity.value)
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*sev_col)
            severity_label = scenario.severity.value.upper()
            self.cell(12, 4, severity_label)
            self.set_text_color(*_COLORS["text_muted"])
            self.cell(30, 4, self._sanitize(scenario.category.value.replace("_", " ").title()))
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
                self.set_font("Helvetica", "", 7)
                self.set_text_color(*_COLORS["blue"])
                self.multi_cell(0, 4, self._sanitize(tool_str))
                self.ln(2)

            # Judge evaluation
            if scenario.auditor_evaluation:
                self._sub_title("LLM Judge")
                self._body_text(scenario.auditor_evaluation)

            # Remediation
            if scenario.remediation:
                self._sub_title("Remediation")
                self.set_fill_color(*_COLORS["surface"])
                self.set_draw_color(*_COLORS["border"])
                self.set_font("Helvetica", "", 7)
                self.set_text_color(*_COLORS["yellow"])
                self.multi_cell(0, 4, self._sanitize(scenario.remediation), border=1, fill=True)
                self.ln(1)

            self.ln(3)

    # -- Rule analysis -----------------------------------------

    def render_rules(self):
        if not self.rule_data or not self.rule_data.get("rule_summary"):
            return

        self.add_page()
        self._fill_page_bg()
        self._section_title("Security Rule Violations")
        self.ln(2)

        self._body_text(
            "Maps each scenario against the enterprise victim's security rules. "
            "Red bars indicate bypassed rules; green bars indicate rules that held."
        )
        self.ln(4)

        rules = sorted(self.rule_data["rule_summary"].items(), key=lambda x: x[1]["rate"], reverse=True)

        for rule_id, rule in rules:
            rate = rule["rate"]
            bar_color = _COLORS["red"] if rate > 0.5 else _COLORS["yellow"] if rate > 0.2 else _COLORS["green"]
            label = self._sanitize(f"{rule_id}: {rule['label']}")

            self.set_font("Helvetica", "", 7)
            self.set_text_color(*_COLORS["text"])
            self.cell(55, 5, label)
            self.set_font("Helvetica", "", 6.5)
            self.set_text_color(*_COLORS["text_muted"])
            self.cell(20, 5, self._sanitize(f"{rule['violations']}/{rule['total_tests']}"), align="R")
            self.cell(3, 5, "")
            self._progress_bar(55, 3, rate * 100, bar_color)
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*bar_color)
            self.cell(0, 5, f"  {int(rate * 100)}%", align="R")
            self.ln(6)

    # -- Remediation summary -----------------------------------

    def render_remediation_summary(self):
        vulns = [s for s in self.result.scenarios if s.vulnerability_found and s.remediation]
        if not vulns:
            return

        self.add_page()
        self._fill_page_bg()
        self._section_title("Remediation Summary")
        self._body_text(
            "Developer-actionable fixes for each vulnerability found, sorted by severity."
        )
        self.ln(4)

        sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        vulns.sort(key=lambda s: sev_order.get(
            s.severity.value if hasattr(s.severity, 'value') else str(s.severity), 5
        ))

        for i, s in enumerate(vulns):
            if self.get_y() > 250:
                self.add_page()
                self._fill_page_bg()

            sev_col = self._severity_color(s.severity.value if hasattr(s.severity, 'value') else str(s.severity))
            severity_label = s.severity.value.upper() if hasattr(s.severity, 'value') else str(s.severity).upper()

            self.set_font("Helvetica", "B", 8)
            self.set_text_color(*sev_col)
            self.cell(0, 6, self._sanitize(f"{i + 1}. [{severity_label}] {s.name}"))
            self.ln(7)

            self.set_font("Helvetica", "", 6.5)
            self.set_text_color(*_COLORS["text_muted"])
            cat = s.category.value.replace("_", " ").title() if hasattr(s.category, 'value') else str(s.category)
            tools = ", ".join(t.get("name", "") for t in s.target_tool_calls) or "none"
            self.cell(0, 4, self._sanitize(f"{cat}  |  Tools: {tools}"))
            self.ln(6)

            self.set_fill_color(*_COLORS["surface"])
            self.set_draw_color(*_COLORS["border"])
            self.set_font("Helvetica", "", 7)
            self.set_text_color(*_COLORS["text_dim"])
            self.multi_cell(0, 4, self._sanitize(s.remediation), border=1, fill=True)
            self.ln(4)

    # -- Build full report -------------------------------------

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
    """Generate a complete PDF security audit report."""
    pdf = AuditPDF(result)
    return pdf.build()

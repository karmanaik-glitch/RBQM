"""
report_generator.py — AI CDM Narrative Report Generator
---------------------------------------------------------
Takes the full KRI + lock readiness state of the trial and generates
a structured Clinical Data Management review memo using Groq's
llama-3.3-70b-versatile model.

The prompt is built deterministically from live engine output —
no hallucination risk on numbers because all values are injected.
The LLM's job is narrative synthesis and clinical interpretation,
not data retrieval.

Report sections:
  1. Executive Summary
  2. Trial Quality Overview
  3. Site-by-Site Assessment
  4. Safety Data Status
  5. Database Lock Readiness
  6. Critical Path & Recommended Actions
  7. Regulatory Risk Assessment
"""

import os
from groq import Groq
from engine.models import SiteReport
from engine.lock_readiness import compute_trial_lock_readiness, TrialLockReport


def _build_kri_summary_block(report: SiteReport) -> str:
    """Compact KRI state for one site — injected into prompt."""
    red    = [k for k in report.kris if k.status == "RED"]
    yellow = [k for k in report.kris if k.status == "YELLOW"]

    lines = [f"  Site: {report.site_id} ({report.site_name}) — Risk: {report.risk_level}"]
    if red:
        lines.append(f"    RED KRIs ({len(red)}):")
        for k in red:
            val = f"{k.value} {k.unit}" if k.value is not None else "N/A"
            lines.append(f"      - KRI {k.kri_id} {k.kri_name}: {val}")
            if k.interpretation:
                lines.append(f"        {k.interpretation}")
    if yellow:
        lines.append(f"    YELLOW KRIs ({len(yellow)}):")
        for k in yellow:
            val = f"{k.value} {k.unit}" if k.value is not None else "N/A"
            lines.append(f"      - KRI {k.kri_id} {k.kri_name}: {val}")
    return "\n".join(lines)


def _build_lock_block(trial_lock: TrialLockReport) -> str:
    """Lock readiness summary block for prompt injection."""
    lines = [
        f"  Trial Lock Score: {trial_lock.trial_lock_score}/100",
        f"  Lock Status: {trial_lock.trial_lock_status}",
        f"  Estimated days to lock: {trial_lock.predicted_lock_days}",
        f"  Summary: {trial_lock.summary}",
        "",
        "  Site lock scores:",
    ]
    for s in trial_lock.sites:
        lines.append(
            f"    {s.site_id}: {s.lock_score}/100 — {s.lock_status} "
            f"({len(s.hard_blockers)} hard, {len(s.soft_blockers)} soft blockers)"
        )
    if trial_lock.critical_path:
        lines.append("\n  Critical path actions:")
        for i, action in enumerate(trial_lock.critical_path[:8], 1):
            lines.append(f"    {i}. {action}")
    return "\n".join(lines)


def build_prompt(site_reports: list, trial_lock: TrialLockReport) -> str:
    """Build the full deterministic prompt for the LLM."""

    kri_blocks = "\n\n".join(_build_kri_summary_block(r) for r in site_reports)
    lock_block = _build_lock_block(trial_lock)

    total_red    = sum(r.red_count for r in site_reports)
    total_yellow = sum(r.yellow_count for r in site_reports)
    critical     = [r.site_id for r in site_reports if r.risk_level == "CRITICAL"]
    blocked      = [s.site_id for s in trial_lock.sites if s.lock_status == "BLOCKED"]

    return f"""You are a senior Clinical Data Manager with 15 years of experience in GCP-compliant trials, ICH E6 R3, and regulatory submissions to FDA, EMA, and CDSCO.

You are writing a formal CDM Data Review Memo for trial TRIAL-2024-001 (Phase II, Type 2 Diabetes, 5 sites across India).

The following data has been extracted from a live RBQM KRI engine. All numbers are factual — do not invent or modify any values. Your role is to synthesise this data into a professional, clinically-grounded narrative memo.

═══════════════════════════════════════
TRIAL KRI DATA (live engine output)
═══════════════════════════════════════
Total sites: 5
Total RED KRIs: {total_red}
Total YELLOW KRIs: {total_yellow}
Critical-risk sites: {', '.join(critical) if critical else 'None'}
Sites blocked from lock: {', '.join(blocked) if blocked else 'None'}

{kri_blocks}

═══════════════════════════════════════
DATABASE LOCK READINESS
═══════════════════════════════════════
{lock_block}

═══════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════
Write a formal CDM Data Review Memo with exactly these sections. Use professional clinical data management language. Be specific — cite actual KRI values and site IDs. Do not add fictional data.

## 1. Executive Summary
2-3 sentences. Current state of the trial data quality and lock readiness. Suitable for a sponsor or project director.

## 2. Trial Quality Overview
Overall data quality assessment. Reference total RED/YELLOW KRI counts. Call out patterns across sites.

## 3. Site-by-Site Assessment
For each site, 2-4 sentences covering its risk level, most critical findings, and clinical significance of any RED KRIs. Be specific about what each finding means for patient safety or data integrity.

## 4. Safety Data Status
Assess SAE reporting compliance, SAE reconciliation status, AE rate patterns. Flag any regulatory risk under ICH E2A and ICH E6 R3.

## 5. Database Lock Readiness
State current lock score, blocked sites, and hard blockers. Estimate timeline. Reference ICH E6 R3 lock requirements.

## 6. Recommended Actions (Priority Order)
Numbered list. Specific, actionable items. Each action must name the site, the KRI, and the required resolution step. Ordered by urgency and regulatory consequence.

## 7. Regulatory Risk Assessment
Assess the risk of an inspection finding if audited in the current state. Reference specific ICH E6 R3 sections, FDA 21 CFR Part 11, or CDSCO Schedule Y where relevant.

Write the memo now. Use formal tone. No preamble — start directly with ## 1. Executive Summary."""


def generate_report_stream(site_reports: list, api_key: str):
    """
    Generate the CDM narrative report using Groq streaming.
    Yields text chunks as they arrive.
    """
    trial_lock = compute_trial_lock_readiness(site_reports)
    prompt     = build_prompt(site_reports, trial_lock)

    client = Groq(api_key=api_key)

    stream = client.chat.completions.create(
        model    = "llama-3.3-70b-versatile",
        messages = [{"role": "user", "content": prompt}],
        max_tokens  = 2000,
        temperature = 0.3,   # low temperature — factual, consistent tone
        stream      = True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def generate_report_full(site_reports: list, api_key: str) -> str:
    """Generate full report as a single string (non-streaming)."""
    return "".join(generate_report_stream(site_reports, api_key))

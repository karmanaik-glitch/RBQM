"""
run_engine.py — RBQM KRI Engine Entry Point
---------------------------------------------
Usage:
    python run_engine.py

Loads all synthetic CSV data, runs all 20 KRIs across all sites,
and prints a structured report to the terminal.
"""

import pandas as pd
import sys
import os
from colorama import init, Fore, Style

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from engine.kri_calculator import calculate_all_kris
from engine.models import SiteReport

init(autoreset=True)   # colorama — works on Windows


# ── LOAD DATA ─────────────────────────────────────────────────────────────────

def load_data(data_dir="data"):
    required = ["sites", "patients", "visits", "queries",
                "saes", "deviations", "ip_records", "measurements"]
    missing = [f for f in required if not os.path.exists(f"{data_dir}/{f}.csv")]
    if missing:
        print(f"\n[ERROR] Missing data files: {missing}")
        print("Run:  python generate_data.py   first.\n")
        sys.exit(1)

    return {
        "sites":        pd.read_csv(f"{data_dir}/sites.csv"),
        "patients":     pd.read_csv(f"{data_dir}/patients.csv"),
        "visits":       pd.read_csv(f"{data_dir}/visits.csv"),
        "queries":      pd.read_csv(f"{data_dir}/queries.csv"),
        "saes":         pd.read_csv(f"{data_dir}/saes.csv"),
        "deviations":   pd.read_csv(f"{data_dir}/deviations.csv"),
        "ip_records":   pd.read_csv(f"{data_dir}/ip_records.csv"),
        "measurements": pd.read_csv(f"{data_dir}/measurements.csv"),
    }


# ── FORMATTING HELPERS ────────────────────────────────────────────────────────

STATUS_COLOR = {
    "GREEN":             Fore.GREEN,
    "YELLOW":            Fore.YELLOW,
    "RED":               Fore.RED,
    "INSUFFICIENT_DATA": Fore.WHITE + Style.DIM,
}

STATUS_ICON = {
    "GREEN":             "●",
    "YELLOW":            "▲",
    "RED":               "✖",
    "INSUFFICIENT_DATA": "–",
}

RISK_COLOR = {
    "LOW":      Fore.GREEN,
    "MEDIUM":   Fore.CYAN,
    "HIGH":     Fore.YELLOW,
    "CRITICAL": Fore.RED,
}


def color_status(status):
    c = STATUS_COLOR.get(status, "")
    i = STATUS_ICON.get(status, "?")
    return f"{c}{i} {status}{Style.RESET_ALL}"


def print_divider(char="─", width=76):
    print(Fore.WHITE + Style.DIM + char * width + Style.RESET_ALL)


def print_header(text):
    print()
    print(Fore.WHITE + Style.BRIGHT + text + Style.RESET_ALL)
    print_divider()


# ── SITE REPORT ───────────────────────────────────────────────────────────────

def print_site_report(report: SiteReport):
    risk_c = RISK_COLOR.get(report.risk_level, "")

    print()
    print(Fore.WHITE + Style.BRIGHT +
          f"  SITE: {report.site_id}  —  {report.site_name}" +
          Style.RESET_ALL)
    print(f"  Overall Risk:  {risk_c}{Style.BRIGHT}{report.risk_level}{Style.RESET_ALL}   "
          f"{Fore.RED}✖ {report.red_count} RED{Style.RESET_ALL}  "
          f"{Fore.YELLOW}▲ {report.yellow_count} YELLOW{Style.RESET_ALL}  "
          f"{Fore.GREEN}● {report.green_count} GREEN{Style.RESET_ALL}")
    print_divider("·")

    current_domain = None
    for kri in report.kris:
        if kri.domain != current_domain:
            current_domain = kri.domain
            print(f"\n  {Fore.CYAN}{Style.DIM}[ {kri.domain.upper()} ]{Style.RESET_ALL}")

        value_str = (f"{kri.value} {kri.unit}"
                     if kri.value is not None else "N/A")

        status_str = color_status(kri.status)
        print(f"    KRI {kri.kri_id:<4}  {kri.kri_name:<35}  "
              f"{value_str:<18}  {status_str}")

        if kri.status in ("RED", "YELLOW") and kri.interpretation:
            print(f"            {Fore.WHITE}{Style.DIM}↳ {kri.interpretation}{Style.RESET_ALL}")


# ── PORTFOLIO SUMMARY ─────────────────────────────────────────────────────────

def print_portfolio_summary(reports):
    print_header("  TRIAL PORTFOLIO SUMMARY — TRIAL-2024-001")

    header = (f"  {'SITE':<10}  {'NAME':<30}  {'RISK':<10}  "
              f"{'RED':>4}  {'YELLOW':>7}  {'GREEN':>6}")
    print(Fore.WHITE + Style.DIM + header + Style.RESET_ALL)
    print_divider("·")

    for r in reports:
        risk_c = RISK_COLOR.get(r.risk_level, "")
        print(f"  {r.site_id:<10}  {r.site_name:<30}  "
              f"{risk_c}{r.risk_level:<10}{Style.RESET_ALL}  "
              f"{Fore.RED}{r.red_count:>4}{Style.RESET_ALL}  "
              f"{Fore.YELLOW}{r.yellow_count:>7}{Style.RESET_ALL}  "
              f"{Fore.GREEN}{r.green_count:>6}{Style.RESET_ALL}")


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print()
    print(Fore.WHITE + Style.BRIGHT +
          "  ╔══════════════════════════════════════════════╗")
    print("  ║   RBQM KRI Engine  —  ICH E6 R3 Aligned     ║")
    print("  ║   20 KRIs · 6 Domains · 5 Sites             ║")
    print("  ╚══════════════════════════════════════════════╝" +
          Style.RESET_ALL)

    print(f"\n  Loading data...", end="", flush=True)
    data = load_data()
    print(f"  {Fore.GREEN}done{Style.RESET_ALL}")

    sites   = data["sites"]
    reports = []

    print(f"  Running KRI engine across {len(sites)} sites...", end="", flush=True)
    for _, site in sites.iterrows():
        kri_results = calculate_all_kris(data, site["site_id"])
        report = SiteReport(
            site_id   = site["site_id"],
            site_name = site["site_name"],
            kris      = kri_results,
        )
        reports.append(report)
    print(f"  {Fore.GREEN}done{Style.RESET_ALL}")

    # Portfolio summary first
    print_portfolio_summary(reports)

    # Detailed site reports
    print_header("  DETAILED KRI REPORT — ALL SITES")
    for report in reports:
        print_site_report(report)
        print()

    # Final alert list: all RED KRIs across all sites
    print_header("  ACTION REQUIRED — ALL RED KRIs")
    red_found = False
    for report in reports:
        for kri in report.kris:
            if kri.status == "RED":
                red_found = True
                print(f"  {Fore.RED}✖{Style.RESET_ALL}  "
                      f"{report.site_id}  KRI {kri.kri_id}  {kri.kri_name}")
                print(f"     {Fore.WHITE}{Style.DIM}{kri.interpretation}{Style.RESET_ALL}")
    if not red_found:
        print(f"  {Fore.GREEN}No RED KRIs across all sites.{Style.RESET_ALL}")

    print()
    print_divider()
    total_red    = sum(r.red_count for r in reports)
    total_yellow = sum(r.yellow_count for r in reports)
    critical     = sum(1 for r in reports if r.risk_level == "CRITICAL")
    print(f"  Engine complete.  "
          f"{Fore.RED}{total_red} RED{Style.RESET_ALL}  "
          f"{Fore.YELLOW}{total_yellow} YELLOW{Style.RESET_ALL}  "
          f"across {len(reports)} sites.  "
          f"{Fore.RED}{critical} CRITICAL site(s).{Style.RESET_ALL}")
    print()


if __name__ == "__main__":
    main()

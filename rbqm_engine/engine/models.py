"""
models.py — KRI result data structures
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class KRIResult:
    """Single KRI calculation result for one site."""
    kri_id:        str          # e.g. "1.1"
    kri_name:      str          # e.g. "Missing Data Rate"
    domain:        str          # e.g. "Data Quality"
    site_id:       str
    value:         Optional[float]   # calculated value (None if insufficient data)
    unit:          str          # e.g. "%" or "days" or "z-score"
    threshold_yellow: float
    threshold_red:    float
    higher_is_worse:  bool      # True for most KRIs (e.g. deviation rate)
    status:        str          # "GREEN" / "YELLOW" / "RED" / "INSUFFICIENT_DATA"
    interpretation: str         # one-line plain English explanation


@dataclass
class SiteReport:
    """All KRI results for a single site."""
    site_id:   str
    site_name: str
    kris:      list = field(default_factory=list)

    @property
    def red_count(self):
        return sum(1 for k in self.kris if k.status == "RED")

    @property
    def yellow_count(self):
        return sum(1 for k in self.kris if k.status == "YELLOW")

    @property
    def green_count(self):
        return sum(1 for k in self.kris if k.status == "GREEN")

    @property
    def risk_level(self):
        if self.red_count >= 3:
            return "CRITICAL"
        if self.red_count >= 1 or self.yellow_count >= 4:
            return "HIGH"
        if self.yellow_count >= 2:
            return "MEDIUM"
        return "LOW"

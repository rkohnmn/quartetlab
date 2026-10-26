#!/usr/bin/env python3
"""
prose_linter.py -- Deterministic AI-slop detector and Authentic Human Voice
Score calculator for technical prose.

Stdlib only: re, sys, math, statistics, json, argparse.

Usage:
    python3 prose_linter.py draft.md
    python3 prose_linter.py --json draft.md
    cat draft.md | python3 prose_linter.py --stdin
"""

from __future__ import annotations

import argparse
import json
import math
import re
import statistics
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


# --------------------------------------------------------------------------
# 1. STATIC RULE TABLES
# --------------------------------------------------------------------------

LATINATE_BUZZWORDS: Dict[str, str] = {
    "delve": "dig into / examine",
    "delves": "digs into / examines",
    "delving": "digging into / examining",
    "tapestry": "mix / set",
    "pivotal": "key / central",
    "landscape": "field / market / system",
    "foster": "build / grow",
    "testament": "proof / evidence",
    "multifaceted": "[enumerate the facets explicitly]",
    "beacon": "model / example",
    "overarching": "main / top-level",
    "bespoke": "custom / purpose-built",
    "holistic": "[enumerate the parts explicitly]",
    "paradigm": "model / approach",
    "nuance": "[state the specific distinction]",
    "nuanced": "[state the specific distinction]",
    "synergy": "[state the specific combined effect]",
    "interplay": "[name the specific interaction]",
    "leverage": "use",
    "leveraging": "using",
    "utilize": "use",
    "utilizing": "using",
    "robust": "[state the failure modes it withstands]",
    "seamless": "[state what specifically doesn't break]",
    "seamlessly": "[state what specifically doesn't break]",
    "unlock": "enable / allow",
    "harness": "use / apply",
    "elevate": "improve / raise",
    "navigate": "handle / work through",
    "cutting-edge": "[cite the benchmark or date]",
    "state-of-the-art": "[cite the benchmark or date]",
    "game-changer": "[state the measured impact]",
    "game-changing": "[state the measured impact]",
    "unprecedented": "[state the prior baseline]",
    "myriad": "many / [give the count]",
    "plethora": "many / [give the count]",
    "crucial": "[state the consequence of failure]",
    "essential": "[state the consequence of failure]",
    "comprehensive": "[state the scope explicitly]",
    "innovative": "[state what is new, specifically]",
    "dynamic": "[state what changes and when]",
    "empower": "let / allow",
    "empowers": "lets / allows",
    "streamline": "simplify / shorten",
    "streamlined": "simplified / shortened",
    "facilitate": "help / [name the direct verb]",
    "facilitates": "helps / [name the direct verb]",
    "ecosystem": "system / stack",
    "journey": "process / sequence",
    "robustness": "[state the specific failure modes it withstands]",
}

FALSE_SIGNIFIERS: List[str] = [
    "moreover", "furthermore", "in summary", "in conclusion",
    "it is important to remember", "it is worth noting that",
    "at the end of the day", "needless to say", "suffice it to say",
    "with that said", "all things considered", "as previously mentioned",
    "it goes without saying",
]

SYCOPHANTIC_RESIDUE: List[str] = [
    "as an ai", "i hope this helps", "let's explore", "let's dive in",
    "navigating the world of", "in today's fast-paced", "i'd be happy to",
    "great question", "certainly!", "happy to help",
]

WEAK_MODIFIERS: List[str] = [
    "very", "quite", "relatively", "fairly", "essentially", "basically",
    "arguably", "somewhat", "rather", "particularly", "really", "actually",
    "simply", "just", "truly", "virtually", "practically",
]

META_LANGUAGE: List[str] = [
    "this section describes", "as stated above", "as mentioned previously",
    "in this document", "the following section will", "as we can see",
    "it should be noted that", "this document covers", "this guide will",
]

UNEARNED_SUPERLATIVES: List[str] = [
    "vital", "transformative", "groundbreaking", "cutting-edge",
    "revolutionary", "game-changing", "world-class", "industry-leading",
    "best-in-class", "next-generation",
]

ANTHROPOMORPHISMS: Dict[str, str] = {
    "wants to": "is configured to / must",
    "tries to": "attempts, then [name the fallback]",
    "decides": "selects / evaluates and returns",
    "understands": "parses / matches",
    "knows": "has access to / stores",
    "believes": "evaluates [condition] as true",
    "thinks": "evaluates",
    "expects": "requires",
    "hopes": "[remove -- software has no intent]",
    "remembers": "caches / persists",
    "prefers": "defaults to / selects",
    "assumes": "defaults to",
}

BLOCKLIST_CATEGORIES: List[Tuple[str, Dict[str, str]]] = [
    ("latinate_buzzword", LATINATE_BUZZWORDS),
]
BLOCKLIST_LISTS: List[Tuple[str, List[str]]] = [
    ("false_signifier", FALSE_SIGNIFIERS),
    ("sycophantic_residue", SYCOPHANTIC_RESIDUE),
    ("weak_modifier", WEAK_MODIFIERS),
    ("meta_language", META_LANGUAGE),
    ("unearned_superlative", UNEARNED_SUPERLATIVES),
]

# --------------------------------------------------------------------------
# 2. STRUCTURAL PATTERNS
# --------------------------------------------------------------------------

NEGATIVE_PARALLELISM_PATTERN = re.compile(
    r"\bit(?:'s| is)\s+not\s+(?:just|only)\b.{0,80}?\b(?:it(?:'s| is)|but(?:\s+also)?)\b",
    re.IGNORECASE,
)

NOT_ONLY_BUT_ALSO_PATTERN = re.compile(
    r"\bnot\s+only\b.{0,80}?\bbut\s+also\b", re.IGNORECASE
)

RULE_OF_THREE_PATTERN = re.compile(
    r"\b([A-Za-z]+),\s+([A-Za-z]+),?\s+and\s+([A-Za-z]+)\b"
)

FALSE_RANGE_PATTERN = re.compile(
    r"\branging from\b.{0,60}?\bto\b", re.IGNORECASE
)

BE_FORMS = r"(?:is|are|was|were|be|been|being)"
PASSIVE_PATTERN = re.compile(rf"\b{BE_FORMS}\s+(\w+ed|\w+en)\b", re.IGNORECASE)

# Passive voice is acceptable when the actor is genuinely unknown/irrelevant.
# These lead-ins mark a likely-legitimate passive and suppress the flag.
PASSIVE_ALLOWLIST_PATTERN = re.compile(
    r"\bwhen\s+the\b|\bif\s+the\b|\buntil\s+the\b", re.IGNORECASE
)

NOMINALIZATION_SUFFIXES = ("tion", "sion", "ment", "ance", "ence", "ity", "ization")
NOMINALIZATION_TRIGGER_PATTERN = re.compile(
    r"\b(?:perform|conduct|make|provide|achieve|carry\s+out|facilitate)\s+"
    r"(?:an?\s+|the\s+)?(\w+(?:tion|sion|ment|ance|ence|ity|ization))\b",
    re.IGNORECASE,
)


# --------------------------------------------------------------------------
# 3. SENTENCE SEGMENTATION AND READABILITY
# --------------------------------------------------------------------------

_ABBREV = {"e.g.", "i.e.", "etc.", "vs.", "fig.", "eq.", "no.", "cf.", "dr.", "mr.", "mrs."}


def split_sentences(text: str) -> List[str]:
    text = re.sub(r"\s+", " ", text.strip())
    # Protect common abbreviations from being read as sentence boundaries.
    protected = text
    for ab in _ABBREV:
        protected = protected.replace(ab, ab.replace(".", "<DOT>"))
    raw = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9`\"'])", protected)
    return [s.replace("<DOT>", ".").strip() for s in raw if s.strip()]


def word_count(sentence: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", sentence))


def count_syllables(word: str) -> int:
    word = word.lower().strip(".,;:!?\"'()")
    if not word:
        return 0
    word = re.sub(r"e$", "", word)
    groups = re.findall(r"[aeiouy]+", word)
    return max(1, len(groups))


def flesch_kincaid_grade(text: str, sentences: List[str]) -> float:
    words = re.findall(r"[A-Za-z']+", text)
    if not sentences or not words:
        return 0.0
    syllables = sum(count_syllables(w) for w in words)
    return round(
        0.39 * (len(words) / len(sentences))
        + 11.8 * (syllables / len(words))
        - 15.59,
        2,
    )


def coleman_liau_index(text: str, sentences: List[str]) -> float:
    words = re.findall(r"[A-Za-z']+", text)
    if not words:
        return 0.0
    letters = sum(len(re.sub(r"[^A-Za-z]", "", w)) for w in words)
    L = (letters / len(words)) * 100
    S = (len(sentences) / len(words)) * 100
    return round(0.0588 * L - 0.296 * S - 15.8, 2)


def gunning_fog_index(text: str, sentences: List[str]) -> float:
    words = re.findall(r"[A-Za-z']+", text)
    if not sentences or not words:
        return 0.0
    complex_words = [w for w in words if count_syllables(w) >= 3 and not re.search(
        r"(ing|ed|es)$", w.lower())]
    return round(
        0.4 * ((len(words) / len(sentences)) + 100 * (len(complex_words) / len(words))),
        2,
    )


# --------------------------------------------------------------------------
# 4. FINDING / REPORT DATA MODEL
# --------------------------------------------------------------------------

@dataclass
class Finding:
    category: str
    text: str
    line: int
    snippet: str


@dataclass
class LintReport:
    findings: List[Finding] = field(default_factory=list)
    sentence_count: int = 0
    word_count_total: int = 0
    mean_sentence_length: float = 0.0
    stdev_sentence_length: float = 0.0
    distribution: Dict[str, float] = field(default_factory=dict)
    passive_ratio: float = 0.0
    fkgl: float = 0.0
    cli: float = 0.0
    fog: float = 0.0
    score: float = 100.0
    deductions: List[Tuple[str, float]] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "score": self.score,
            "sentence_count": self.sentence_count,
            "word_count_total": self.word_count_total,
            "mean_sentence_length": self.mean_sentence_length,
            "stdev_sentence_length": self.stdev_sentence_length,
            "distribution": self.distribution,
            "passive_ratio": self.passive_ratio,
            "readability": {
                "flesch_kincaid_grade": self.fkgl,
                "coleman_liau_index": self.cli,
                "gunning_fog_index": self.fog,
            },
            "deductions": [{"reason": r, "points": p} for r, p in self.deductions],
            "findings": [
                {
                    "category": f.category,
                    "text": f.text,
                    "line": f.line,
                    "snippet": f.snippet,
                }
                for f in self.findings
            ],
        }


# --------------------------------------------------------------------------
# 5. THE LINTER
# --------------------------------------------------------------------------

class ProseLinter:
    """Deterministic prose auditor. No network calls, no ML models."""

    TARGET_DISTRIBUTION = {"short": 0.30, "medium": 0.50, "long": 0.20}
    PASSIVE_RATIO_CEILING = 0.15
    FKGL_BAND = (7.0, 11.0)

    def __init__(self, text: str):
        self.text = text
        self.lines = text.splitlines() or [text]

    def _line_of(self, needle: str) -> int:
        for i, line in enumerate(self.lines, start=1):
            if needle.lower() in line.lower():
                return i
        return 1

    def sentence_length_stats(self, sentences: List[str]) -> Tuple[float, float, Dict[str, float]]:
        lengths = [word_count(s) for s in sentences] or [0]
        mean = round(statistics.fmean(lengths), 2)
        stdev = round(statistics.pstdev(lengths), 2) if len(lengths) > 1 else 0.0
        short = sum(1 for l in lengths if l < 8)
        medium = sum(1 for l in lengths if 12 <= l <= 20)
        long_ = sum(1 for l in lengths if 21 <= l <= 30)
        n = len(lengths)
        distribution = {
            "short_pct": round(short / n, 3),
            "medium_pct": round(medium / n, 3),
            "long_pct": round(long_ / n, 3),
        }
        return mean, stdev, distribution

    def blocklist_scan(self) -> List[Finding]:
        findings: List[Finding] = []
        for category, table in BLOCKLIST_CATEGORIES:
            for term, replacement in table.items():
                for m in re.finditer(rf"\b{re.escape(term)}\b", self.text, re.IGNORECASE):
                    line = self.text.count("\n", 0, m.start()) + 1
                    findings.append(Finding(category, term, line, f"-> {replacement}"))
        for category, terms in BLOCKLIST_LISTS:
            for term in terms:
                for m in re.finditer(re.escape(term), self.text, re.IGNORECASE):
                    line = self.text.count("\n", 0, m.start()) + 1
                    findings.append(Finding(category, term, line, ""))
        for phrase, replacement in ANTHROPOMORPHISMS.items():
            for m in re.finditer(re.escape(phrase), self.text, re.IGNORECASE):
                line = self.text.count("\n", 0, m.start()) + 1
                findings.append(Finding("anthropomorphism", phrase, line, f"-> {replacement}"))
        return findings

    def negative_parallelism_scan(self) -> List[Finding]:
        findings = []
        for pat in (NEGATIVE_PARALLELISM_PATTERN, NOT_ONLY_BUT_ALSO_PATTERN):
            for m in pat.finditer(self.text):
                line = self.text.count("\n", 0, m.start()) + 1
                findings.append(Finding("negative_parallelism", m.group(0), line, ""))
        return findings

    def rule_of_three_scan(self) -> List[Finding]:
        findings = []
        for m in RULE_OF_THREE_PATTERN.finditer(self.text):
            line = self.text.count("\n", 0, m.start()) + 1
            findings.append(Finding("rule_of_three_candidate", m.group(0), line,
                                     "verify: single attribute or full enumeration?"))
        return findings

    def false_range_scan(self) -> List[Finding]:
        findings = []
        for m in FALSE_RANGE_PATTERN.finditer(self.text):
            line = self.text.count("\n", 0, m.start()) + 1
            findings.append(Finding("false_range", m.group(0), line, ""))
        return findings

    def passive_voice_scan(self, sentences: List[str]) -> Tuple[float, List[Finding]]:
        findings = []
        passive_sentences = 0
        for s in sentences:
            if PASSIVE_PATTERN.search(s) and not PASSIVE_ALLOWLIST_PATTERN.search(s):
                passive_sentences += 1
                line = self._line_of(s[:40])
                findings.append(Finding("passive_voice", s[:80], line, ""))
        ratio = round(passive_sentences / len(sentences), 3) if sentences else 0.0
        return ratio, findings

    def nominalization_scan(self) -> List[Finding]:
        findings = []
        for m in NOMINALIZATION_TRIGGER_PATTERN.finditer(self.text):
            line = self.text.count("\n", 0, m.start()) + 1
            findings.append(Finding("nominalization", m.group(0), line,
                                     f"-> convert '{m.group(1)}' to its base verb"))
        return findings

    def run(self) -> LintReport:
        report = LintReport()
        sentences = split_sentences(self.text)
        report.sentence_count = len(sentences)
        report.word_count_total = sum(word_count(s) for s in sentences)

        mean, stdev, dist = self.sentence_length_stats(sentences)
        report.mean_sentence_length = mean
        report.stdev_sentence_length = stdev
        report.distribution = dist

        report.fkgl = flesch_kincaid_grade(self.text, sentences)
        report.cli = coleman_liau_index(self.text, sentences)
        report.fog = gunning_fog_index(self.text, sentences)

        blocklist_hits = self.blocklist_scan()
        neg_parallel = self.negative_parallelism_scan()
        rule_of_three = self.rule_of_three_scan()
        false_ranges = self.false_range_scan()
        passive_ratio, passive_hits = self.passive_voice_scan(sentences)
        nominalizations = self.nominalization_scan()

        report.passive_ratio = passive_ratio
        report.findings = (
            blocklist_hits + neg_parallel + rule_of_three
            + false_ranges + passive_hits + nominalizations
        )

        score = 100.0
        deductions: List[Tuple[str, float]] = []

        def deduct(reason: str, points: float):
            nonlocal score
            points = round(points, 2)
            if points <= 0:
                return
            score -= points
            deductions.append((reason, points))

        deduct("Blocklist lexical hits", min(len(blocklist_hits) * 1.5, 30))
        deduct("Negative parallelism constructions", len(neg_parallel) * 4)
        deduct("Rule-of-three candidates (manual review)", min(len(rule_of_three) * 1.0, 10))
        deduct("False-range clauses", len(false_ranges) * 3)
        deduct("Nominalized zombie nouns", min(len(nominalizations) * 1.5, 15))

        if passive_ratio > self.PASSIVE_RATIO_CEILING:
            deduct("Passive voice over ceiling",
                   (passive_ratio - self.PASSIVE_RATIO_CEILING) * 100 * 0.5)

        target = self.TARGET_DISTRIBUTION
        deviation = (
            abs(dist["short_pct"] - target["short"])
            + abs(dist["medium_pct"] - target["medium"])
            + abs(dist["long_pct"] - target["long"])
        )
        deduct("Burstiness deviation from target distribution", deviation * 20)

        lo, hi = self.FKGL_BAND
        if report.fkgl < lo:
            deduct("Flesch-Kincaid grade below target band", (lo - report.fkgl) * 1.5)
        elif report.fkgl > hi:
            deduct("Flesch-Kincaid grade above target band", (report.fkgl - hi) * 1.5)

        report.score = round(max(0.0, min(100.0, score)), 1)
        report.deductions = deductions
        return report


# --------------------------------------------------------------------------
# 6. REPORT RENDERING
# --------------------------------------------------------------------------

def render_text_report(report: LintReport) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append(f"AUTHENTIC HUMAN VOICE SCORE: {report.score} / 100.0")
    lines.append("=" * 60)
    lines.append("")
    lines.append(f"Sentences: {report.sentence_count}   Words: {report.word_count_total}")
    lines.append(f"Mean sentence length: {report.mean_sentence_length}  "
                 f"Stdev: {report.stdev_sentence_length}")
    lines.append(f"Length distribution -- short(<8): {report.distribution.get('short_pct', 0):.0%}  "
                 f"medium(12-20): {report.distribution.get('medium_pct', 0):.0%}  "
                 f"long(21-30): {report.distribution.get('long_pct', 0):.0%}")
    lines.append(f"Passive voice ratio: {report.passive_ratio:.1%}")
    lines.append(f"Flesch-Kincaid grade: {report.fkgl}   "
                 f"Coleman-Liau index: {report.cli}   Gunning Fog: {report.fog}")
    lines.append("")
    lines.append("-- Deductions --")
    if not report.deductions:
        lines.append("  none")
    for reason, points in report.deductions:
        lines.append(f"  -{points:>5.2f}  {reason}")
    lines.append("")
    lines.append(f"-- Findings ({len(report.findings)}) --")
    for f in report.findings[:200]:
        extra = f"  {f.snippet}" if f.snippet else ""
        lines.append(f"  L{f.line:<5} [{f.category}] {f.text}{extra}")
    if len(report.findings) > 200:
        lines.append(f"  ... {len(report.findings) - 200} more findings suppressed")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic prose slop linter.")
    parser.add_argument("path", nargs="?", help="Path to draft file")
    parser.add_argument("--stdin", action="store_true", help="Read draft from stdin")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text")
    args = parser.parse_args()

    if args.stdin:
        text = sys.stdin.read()
    elif args.path:
        with open(args.path, "r", encoding="utf-8") as fh:
            text = fh.read()
    else:
        parser.print_help()
        return 1

    report = ProseLinter(text).run()
    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        print(render_text_report(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python
"""Project-aware microphone dictation normalizer for Escape! zombie school.

Stdlib only. The normalizer never mutates protected literals such as numbers,
paths, URLs, emails, hashes, ids, filenames, quoted text, or backticked text.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


LEDGER_SCHEMA_VERSION = 1
SEED_CORRECTIONS = [
    {"variant": "기터브", "canonical": "GitHub", "source": "context_confirmed_seed"},
    {"variant": "서브웨이 전투 라운지", "canonical": "Subagent Lounge", "source": "context_confirmed_seed"},
    {"variant": "스쿨백", "canonical": "스크롤백", "source": "context_confirmed_seed"},
]
DESTRUCTIVE_ALIASES = {"뻐꾸기", "오리", "메기"}
SENSITIVE_WORD_RE = re.compile(r"(?i)(api[_-]?key|secret|password|passwd|token|credential|firebase|browser profile|oauth)")

PROTECTED_PATTERNS = [
    r"`[^`]*`",
    r"'[^'\n]*'",
    r'"[^"\n]*"',
    r"https?://[^\s'\"`]+",
    r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
    r"(?:[A-Za-z]:[\\/]|\\\\|/)(?=[^'\"`\n]*[\\/])[^'\"`\n]*?\.(?:glb|gltf|bbmodel|png|jpg|jpeg|webp|gif|svg|json|md|py|js|jsx|ts|tsx|mjs|cjs|ps1|sh|toml|yaml|yml|html|css|aab|apk|zip|txt)\b",
    r"(?:[A-Za-z]:[\\/]|\\\\)[^\s'\"`]+",
    r"/(?:[^\s'\"`]+/)+[^\s'\"`]*?\.(?:glb|gltf|bbmodel|png|jpg|jpeg|webp|gif|svg|json|md|py|js|jsx|ts|tsx|mjs|cjs|ps1|sh|toml|yaml|yml|html|css|aab|apk|zip|txt)\b",
    r"\b[A-Za-z0-9_.-]+\.(?:glb|gltf|bbmodel|png|jpg|jpeg|webp|gif|svg|json|md|py|js|jsx|ts|tsx|mjs|cjs|ps1|sh|toml|yaml|yml|html|css|aab|apk|zip|txt)\b",
    r"\bFirebase\s+revision\s+[A-Za-z0-9_.:-]+\b",
    r"\b(?:revision|sourceRevision|schemaVersion|contentHash)\s*[:=]\s*[^\s,;}]+",
    r"\b(?:E0[1-7]|B0[1-4]|RZT|RZG|RZL|RZC|Matilda|unconsciousStudent|classPresidentStudent)\b",
    r"\bt_[0-9a-fA-F]{8}\b",
    r"\b[A-Za-z]+_[0-9A-Za-z_-]{6,}\b",
    r"\b[0-9a-fA-F]{12,}\b",
    r"\b(?:localhost|[A-Za-z0-9.-]+):\d{2,5}\b",
    r"(?<![\w.])-?\d+(?:\.\d+)?\s*(?:%|percentage points|ms|s|sec|seconds|초|분|hours?|units?|블록|blocks?|px|MB|GB|bytes?)(?![\w.])",
    r"(?<![\w.])-?\d+(?:\.\d+)?(?![\w.])",
]


@dataclass(frozen=True)
class Span:
    start: int
    end: int


def load_lexicon(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def default_personal_ledger_path() -> Path:
    configured = os.environ.get("ESCAPE_VOICE_PERSONAL_LEDGER")
    if configured:
        return Path(configured)
    return Path.home() / "AppData" / "Local" / "hermes" / "voice_input" / "korean_personal_pronunciation_ledger.json"


def looks_like_path_or_url(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in ("://", "\\", "/", "file:", "localhost:")) or bool(re.match(r"^[A-Za-z]:", text))


def looks_sensitive(text: str) -> bool:
    if SENSITIVE_WORD_RE.search(text):
        return True
    if re.search(r"(?i)\b(token|secret|password|api[_-]?key)\s*[:=]", text):
        return True
    if re.search(r"[A-Za-z0-9_-]{20,}", text):
        return True
    return False


def is_safe_personal_correction(variant: str, canonical: str) -> bool:
    variant = variant.strip()
    canonical = canonical.strip()
    if not variant or not canonical or variant == canonical:
        return False
    if len(variant) < 2 or len(canonical) < 2:
        return False
    if looks_like_path_or_url(variant) or looks_like_path_or_url(canonical):
        return False
    if looks_sensitive(variant) or looks_sensitive(canonical):
        return False
    if canonical.strip() in DESTRUCTIVE_ALIASES or variant.strip() in DESTRUCTIVE_ALIASES:
        return False
    if canonical.replace(" ", "") in DESTRUCTIVE_ALIASES or variant.replace(" ", "") in DESTRUCTIVE_ALIASES:
        return False
    if protected_spans(variant) or protected_spans(canonical):
        return False
    return True


class PersonalPronunciationLedger:
    """Safe personal STT pronunciation ledger.

    Observed variants are recorded as evidence only. Only context-confirmed seeds
    and explicit user-approved safe corrections are active for normalization.
    """

    def __init__(self, path: Path | str | None = None):
        self.path = Path(path) if path is not None else default_personal_ledger_path()
        self.data = self._load_or_create()
        self._ensure_seed_corrections()
        self.save()

    def _empty_data(self) -> dict:
        return {"schema_version": LEDGER_SCHEMA_VERSION, "active_corrections": [], "observations": []}

    def _load_or_create(self) -> dict:
        if not self.path.exists():
            return self._empty_data()
        try:
            with self.path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
        except (OSError, json.JSONDecodeError):
            return self._empty_data()
        if not isinstance(data, dict):
            return self._empty_data()
        data.setdefault("schema_version", LEDGER_SCHEMA_VERSION)
        data.setdefault("active_corrections", [])
        data.setdefault("observations", [])
        return data

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.path.with_suffix(self.path.suffix + ".tmp")
        with tmp_path.open("w", encoding="utf-8") as handle:
            json.dump(self.data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        tmp_path.replace(self.path)

    def _ensure_seed_corrections(self) -> None:
        for seed in SEED_CORRECTIONS:
            self._add_active(seed["variant"], seed["canonical"], seed["source"], validate=False)

    def _add_active(self, variant: str, canonical: str, source: str, validate: bool = True) -> bool:
        variant = variant.strip()
        canonical = canonical.strip()
        if validate and not is_safe_personal_correction(variant, canonical):
            return False
        for item in self.data["active_corrections"]:
            if item.get("variant") == variant and item.get("canonical") == canonical:
                item["source"] = item.get("source") or source
                return True
        self.data["active_corrections"].append({
            "variant": variant,
            "canonical": canonical,
            "source": source,
            "created_at": utc_now_iso(),
        })
        return True

    def add_explicit_correction(self, variant: str, canonical: str) -> bool:
        added = self._add_active(variant, canonical, "explicit_user_approved", validate=True)
        if added:
            self.save()
        return added

    def observe_variant(self, variant: str, canonical: str, source: str = "recurring") -> bool:
        variant = variant.strip()
        canonical = canonical.strip()
        # Observations are evidence only, but the ledger itself is durable. Keep
        # the same literal/safety boundary as active corrections so paths, URLs,
        # IDs, hashes, quoted text, secrets, Firebase/browser material, and
        # destructive aliases never become stored personal pronunciation data.
        if not is_safe_personal_correction(variant, canonical):
            return False
        for item in self.data["observations"]:
            if item.get("variant") == variant and item.get("canonical") == canonical and item.get("source") == source:
                item["count"] = int(item.get("count", 0)) + 1
                item["last_seen_at"] = utc_now_iso()
                self.save()
                return True
        self.data["observations"].append({
            "variant": variant,
            "canonical": canonical,
            "source": source,
            "count": 1,
            "first_seen_at": utc_now_iso(),
            "last_seen_at": utc_now_iso(),
            "active": False,
        })
        self.save()
        return True

    def active_replacements(self) -> list[dict]:
        return sorted(
            [item for item in self.data.get("active_corrections", []) if item.get("variant") and item.get("canonical")],
            key=lambda item: len(item.get("variant", "")),
            reverse=True,
        )


def merge_spans(spans: Iterable[Span]) -> list[Span]:
    ordered = sorted(spans, key=lambda span: (span.start, span.end))
    merged: list[Span] = []
    for span in ordered:
        if not merged or span.start > merged[-1].end:
            merged.append(span)
        elif span.end > merged[-1].end:
            merged[-1] = Span(merged[-1].start, span.end)
    return merged


def protected_spans(text: str) -> list[Span]:
    spans: list[Span] = []
    for pattern in PROTECTED_PATTERNS:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            spans.append(Span(match.start(), match.end()))
    return merge_spans(spans)


def split_unprotected(text: str, spans: list[Span]) -> list[tuple[str, str]]:
    chunks: list[tuple[str, str]] = []
    cursor = 0
    for span in spans:
        if cursor < span.start:
            chunks.append(("open", text[cursor:span.start]))
        chunks.append(("protected", text[span.start:span.end]))
        cursor = span.end
    if cursor < len(text):
        chunks.append(("open", text[cursor:]))
    return chunks


def protected_literals(text: str, spans: list[Span]) -> list[str]:
    """Return exact immutable spans for callers that need an audit trail."""
    return [text[span.start:span.end] for span in spans]


def replace_literal(segment: str, old: str, new: str) -> tuple[str, int]:
    pattern = re.compile(re.escape(old), flags=re.IGNORECASE)
    return pattern.subn(new, segment)


def normalize_text(raw_prompt: str, lexicon: dict, personal_ledger: PersonalPronunciationLedger | None = None) -> dict:
    spans = protected_spans(raw_prompt)
    chunks = split_unprotected(raw_prompt, spans)
    corrections: list[dict] = []
    ambiguities: list[dict] = []
    normalized_chunks: list[str] = []

    replacements = sorted(
        lexicon.get("replacements", []),
        key=lambda item: max((len(v) for v in item.get("variants", [])), default=0),
        reverse=True,
    )
    personal_replacements = personal_ledger.active_replacements() if personal_ledger else []
    ambiguity_specs = lexicon.get("ambiguities", [])

    for kind, segment in chunks:
        if kind == "protected":
            normalized_chunks.append(segment)
            continue

        current = segment
        for item in replacements:
            canonical = item["canonical"]
            for variant in sorted(item.get("variants", []), key=len, reverse=True):
                if variant == canonical:
                    continue
                current, count = replace_literal(current, variant, canonical)
                for _ in range(count):
                    corrections.append({"from": variant, "to": canonical})

        for item in personal_replacements:
            variant = item["variant"]
            canonical = item["canonical"]
            if variant == canonical:
                continue
            current, count = replace_literal(current, variant, canonical)
            for _ in range(count):
                corrections.append({"from": variant, "to": canonical, "source": "personal_ledger"})

        for item in ambiguity_specs:
            term = item["term"]
            candidates = item.get("candidates", [])
            marker = f"[[AMBIGUOUS: {term} -> {' / '.join(candidates)}]]"
            current, count = replace_literal(current, term, marker)
            for _ in range(count):
                ambiguities.append({"term": term, "candidates": candidates, "reason": item.get("reason", "")})

        normalized_chunks.append(current)

    normalized_prompt = "".join(normalized_chunks)
    review_flags: list[str] = []
    if looks_sensitive(raw_prompt):
        review_flags.append("sensitive_literal_present")
    if raw_prompt.strip() in ("뻐꾸기", "오리", "메기"):
        command = raw_prompt.strip()
        if command:
            review_flags.append("destructive_command_alias_present")
            ambiguities.append({
                "term": command,
                "candidates": [command],
                "reason": "Known workflow command; raw prompt remains authoritative and requires review.",
            })
    for variant in ("뻐꾸 기", "오 리", "메 기"):
        if variant in raw_prompt:
            review_flags.append("ambiguous_destructive_command_candidate")
            ambiguities.append({
                "term": variant,
                "candidates": [],
                "reason": "Not normalized because destructive intent is ambiguous.",
            })
    if ambiguities:
        review_flags.append("ambiguity_present")
    return {
        "original": raw_prompt,
        "normalized": normalized_prompt,
        "changes": corrections,
        "protected_literals": protected_literals(raw_prompt, spans),
        "review_flags": sorted(set(review_flags)),
        "review_required": bool(review_flags or ambiguities),
        "raw_prompt": raw_prompt,
        "normalized_prompt": normalized_prompt,
        "changed": normalized_prompt != raw_prompt,
        "corrections": corrections,
        "ambiguities": ambiguities,
        "protected_spans": len(spans),
        "policy": "protected spans preserved; high-confidence terminology only; ambiguity marked without invention",
    }


def extract_prompt_from_hook_payload(payload_text: str) -> str:
    try:
        json_text = payload_text[payload_text.find("{"):] if "{" in payload_text else ""
        payload = json.loads(json_text.lstrip("\ufeff")) if json_text.strip() else {}
    except json.JSONDecodeError:
        return ""
    for key in ("prompt", "user_prompt", "message"):
        value = payload.get(key)
        if isinstance(value, str):
            return value
    return ""


def hook_specific_output(result: dict) -> dict | None:
    if not (result["changed"] or result["review_required"] or result["ambiguities"]):
        return None
    context = {
        "voice_dictation_normalizer": {
            "raw_prompt_preserved": True,
            "normalized_prompt": result["normalized_prompt"],
            "corrections": result["corrections"],
            "ambiguities": result["ambiguities"],
            "review_required": result["review_required"],
            "policy": result["policy"],
        }
    }
    return {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": json.dumps(context, ensure_ascii=False)}}


def run_hook(payload_text: str, lexicon_data: dict, personal_ledger_path: Path | str | None = None) -> dict:
    raw_prompt = extract_prompt_from_hook_payload(payload_text)
    if not raw_prompt.strip():
        return {}
    ledger = PersonalPronunciationLedger(personal_ledger_path) if personal_ledger_path is not False else None
    result = normalize_text(raw_prompt, lexicon_data, personal_ledger=ledger)
    context = {
        "voice_dictation_normalizer": {
            "raw_prompt_preserved": True,
            "normalized_prompt": result["normalized_prompt"],
            "corrections": result["corrections"],
            "ambiguities": result["ambiguities"],
            "review_required": result["review_required"],
            "review_flags": result["review_flags"],
            "protected_literals_count": result["protected_spans"],
            "policy": result["policy"],
        }
    }
    return {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": json.dumps(context, ensure_ascii=False)}}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lexicon", type=Path, default=Path(__file__).with_name("escape_zombie_school_voice_lexicon.json"))
    parser.add_argument("--personal-ledger", type=Path, default=None, help="Optional personal pronunciation ledger JSON path.")
    parser.add_argument("--hook-json", action="store_true", help="Read Claude UserPromptSubmit hook JSON and emit hookSpecificOutput JSON.")
    subparsers = parser.add_subparsers(dest="learner_action")

    add_parser = subparsers.add_parser(
        "add-correction",
        help="Add an explicit user-approved personal STT correction if it passes safety guards.",
    )
    add_parser.add_argument("variant")
    add_parser.add_argument("canonical")

    observe_parser = subparsers.add_parser(
        "observe-variant",
        help="Record a safe recurring STT variant as inactive evidence only.",
    )
    observe_parser.add_argument("variant")
    observe_parser.add_argument("canonical")
    observe_parser.add_argument("--source", default="recurring")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    lexicon = load_lexicon(args.lexicon)

    if args.learner_action:
        ledger = PersonalPronunciationLedger(args.personal_ledger)
        if args.learner_action == "add-correction":
            ok = ledger.add_explicit_correction(args.variant, args.canonical)
            print(json.dumps({"ok": ok, "action": args.learner_action}, ensure_ascii=False))
            return 0 if ok else 2
        if args.learner_action == "observe-variant":
            ok = ledger.observe_variant(args.variant, args.canonical, source=args.source)
            print(json.dumps({"ok": ok, "action": args.learner_action}, ensure_ascii=False))
            return 0 if ok else 2

    stdin_text = sys.stdin.read()

    if args.hook_json:
        output = run_hook(stdin_text, lexicon, personal_ledger_path=args.personal_ledger)
        print(json.dumps(output, ensure_ascii=False) if output else "{}")
        return 0

    result = normalize_text(stdin_text, lexicon, personal_ledger=PersonalPronunciationLedger(args.personal_ledger))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

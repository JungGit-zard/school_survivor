import json
import sys
import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
NORMALIZER = ROOT / "Developer" / "voice_input" / "prompt_normalizer.py"
LEXICON = ROOT / "Developer" / "voice_input" / "escape_zombie_school_voice_lexicon.json"

SPEC = importlib.util.spec_from_file_location("prompt_normalizer", NORMALIZER)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)
LEXICON_DATA = MODULE.load_lexicon(LEXICON)

def run_normalizer(text):
    return MODULE.normalize_text(text, LEXICON_DATA)


class PromptNormalizerTests(unittest.TestCase):
    def test_corrects_high_confidence_project_terms(self):
        result = run_normalizer("탈출 좀비 학교 그래픽 스타지오에서 알 쓰리 에프 라피어 바이트 개발 서버 확인")

        self.assertEqual(
            result["normalized_prompt"],
            "Escape! zombie school Graphics Studio에서 R3F Rapier Vite 개발 서버 확인",
        )
        self.assertIn("탈출 좀비 학교", result["corrections"][0]["from"])
        self.assertFalse(result["ambiguities"])

    def test_preserves_numbers_paths_urls_hashes_ids_and_quoted_text(self):
        raw = (
            "그래픽 스타지오 33% 1.575 units :5173 D:/tmp/그래픽 스타지오/file.glb "
            "https://example.com/그래픽-스타지오 a@b.com abcdef1234567890 `그래픽 스타지오` "
            "'알 쓰리 에프' Firebase revision 42 t_6a43fd54"
        )

        result = run_normalizer(raw)

        self.assertIn("Graphics Studio 33% 1.575 units :5173", result["normalized_prompt"])
        self.assertIn("D:/tmp/그래픽 스타지오/file.glb", result["normalized_prompt"])
        self.assertIn("https://example.com/그래픽-스타지오", result["normalized_prompt"])
        self.assertIn("a@b.com", result["normalized_prompt"])
        self.assertIn("abcdef1234567890", result["normalized_prompt"])
        self.assertIn("`그래픽 스타지오`", result["normalized_prompt"])
        self.assertIn("'알 쓰리 에프'", result["normalized_prompt"])
        self.assertIn("Firebase revision 42", result["normalized_prompt"])
        self.assertIn("t_6a43fd54", result["normalized_prompt"])

    def test_preserves_unquoted_paths_with_spaces_and_project_terms(self):
        raw = "D:/tmp/a 그래픽 스타지오/file.glb 확인"
        result = run_normalizer(raw)

        self.assertEqual(result["normalized"], raw)
        self.assertIn("D:/tmp/a 그래픽 스타지오/file.glb", result["protected_literals"])
        self.assertNotIn({"from": "그래픽 스타지오", "to": "Graphics Studio"}, result["corrections"])

    def test_preserves_extensionless_folder_paths_and_host_ports(self):
        raw = "D:\\JungSil\\2.Minigame_project\\school_survivor-integration localhost:5173 그래픽 스타지오"
        result = run_normalizer(raw)

        self.assertIn("D:\\JungSil\\2.Minigame_project\\school_survivor-integration", result["normalized"])
        self.assertIn("localhost:5173", result["normalized"])
        self.assertIn("Graphics Studio", result["normalized"])
        self.assertIn("localhost:5173", result["protected_literals"])

    def test_broad_dictation_words_need_context(self):
        result = run_normalizer("비트와 바이트와 엑스와 트위터 바이트 개발 서버 엑스 포스팅")

        self.assertEqual(result["normalized"], "비트와 바이트와 엑스와 트위터 Vite 개발 서버 X 포스팅")

    def test_ordinary_hana_word_is_unchanged(self):
        result = run_normalizer("하나만 더 확인")

        self.assertEqual(result["normalized"], "하나만 더 확인")

    def test_signed_literals_keep_their_sign(self):
        result = run_normalizer("x=-1.25 -3.5 units -20%")

        self.assertEqual(result["normalized"], "x=-1.25 -3.5 units -20%")
        for literal in ("-1.25", "-3.5 units", "-20%"):
            self.assertIn(literal, result["protected_literals"])

    def test_marks_ambiguity_without_guessing(self):
        result = run_normalizer("오르카로 훅을 확인")

        self.assertIn("[[AMBIGUOUS: 오르카 -> Orca / orca CLI / ORCA?]]", result["normalized_prompt"])
        self.assertEqual(result["ambiguities"][0]["term"], "오르카")

    def test_reports_requested_audit_fields_and_preserves_project_ids(self):
        result = run_normalizer("그래픽 스타지오 E01 revision=rev-2026-08-30 x=-1.25 33%")

        self.assertEqual(result["original"], "그래픽 스타지오 E01 revision=rev-2026-08-30 x=-1.25 33%")
        self.assertIn("Graphics Studio", result["normalized"])
        self.assertIn("E01", result["protected_literals"])
        self.assertIn("revision=rev-2026-08-30", result["protected_literals"])

    def test_marks_destructive_dictation_ambiguity_without_creating_a_command(self):
        result = run_normalizer("메 기 실행해")

        self.assertEqual(result["normalized"], "메 기 실행해")
        self.assertTrue(result["review_required"])
        self.assertIn("ambiguous_destructive_command_candidate", result["review_flags"])

    def test_korean_word_containing_command_is_not_a_command(self):
        result = run_normalizer("오리요강 확인")

        self.assertFalse(result["review_required"])
        self.assertNotIn("destructive_command_alias_present", result["review_flags"])

    def test_exact_command_requires_review_but_is_not_rewritten(self):
        result = run_normalizer("메기")

        self.assertEqual(result["normalized"], "메기")
        self.assertTrue(result["review_required"])
        self.assertIn("destructive_command_alias_present", result["review_flags"])

    def test_hook_output_includes_unchanged_review_required_prompt(self):
        result = run_normalizer("메기")
        output = MODULE.hook_specific_output(result)

        self.assertIsNotNone(output)
        context = json.loads(output["hookSpecificOutput"]["additionalContext"])
        self.assertTrue(context["voice_dictation_normalizer"]["review_required"])

    def test_personal_ledger_seeded_context_confirmed_variants(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger = MODULE.PersonalPronunciationLedger(Path(tmp) / "ledger.json")
            result = MODULE.normalize_text(
                "기터브에 서브웨이 전투 라운지 등록하고 스쿨백 확인",
                LEXICON_DATA,
                personal_ledger=ledger,
            )

        self.assertEqual(result["normalized_prompt"], "GitHub에 Subagent Lounge 등록하고 스크롤백 확인")
        self.assertIn({"from": "기터브", "to": "GitHub", "source": "personal_ledger"}, result["corrections"])
        self.assertIn({"from": "서브웨이 전투 라운지", "to": "Subagent Lounge", "source": "personal_ledger"}, result["corrections"])
        self.assertIn({"from": "스쿨백", "to": "스크롤백", "source": "personal_ledger"}, result["corrections"])

    def test_personal_learner_records_recurring_variant_but_does_not_activate_without_explicit_authority(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger = MODULE.PersonalPronunciationLedger(Path(tmp) / "ledger.json")
            before = MODULE.normalize_text("깃 허브 확인", LEXICON_DATA, personal_ledger=ledger)
            ledger.observe_variant("깃 허브", "GitHub", source="recurring")
            ledger.observe_variant("깃 허브", "GitHub", source="recurring")
            after = MODULE.normalize_text("깃 허브 확인", LEXICON_DATA, personal_ledger=ledger)

        self.assertEqual(before["normalized_prompt"], "깃 허브 확인")
        self.assertEqual(after["normalized_prompt"], "깃 허브 확인")
        self.assertFalse(after["changed"])

    def test_explicit_personal_correction_is_authoritative_but_rejects_sensitive_or_destructive_literals(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger = MODULE.PersonalPronunciationLedger(Path(tmp) / "ledger.json")
            self.assertTrue(ledger.add_explicit_correction("깃 허브", "GitHub"))
            self.assertFalse(ledger.add_explicit_correction("오 리", "오리"))
            self.assertFalse(ledger.add_explicit_correction("D:/tmp/foo", "bar"))
            self.assertFalse(ledger.add_explicit_correction("secret", "token=abcdef123456"))
            result = MODULE.normalize_text("깃 허브 확인하고 오 리 D:/tmp/foo token=abcdef123456", LEXICON_DATA, personal_ledger=ledger)

        self.assertIn("GitHub 확인", result["normalized_prompt"])
        self.assertIn("오 리", result["normalized_prompt"])
        self.assertIn("D:/tmp/foo", result["normalized_prompt"])
        self.assertIn("token=abcdef123456", result["normalized_prompt"])
        self.assertTrue(result["review_required"])

    def test_observed_variants_reject_literals_ids_hashes_paths_quotes_and_destructive_aliases(self):
        blocked_pairs = [
            ("D:/tmp/foo.txt", "foo"),
            ("https://example.com/a", "example"),
            ("t_6a43fd54", "task"),
            ("abcdef1234567890", "hash"),
            ("'기터브'", "GitHub"),
            ("오 리", "오리"),
            ("secret", "token=abcdef123456"),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            ledger = MODULE.PersonalPronunciationLedger(Path(tmp) / "ledger.json")
            for variant, canonical in blocked_pairs:
                self.assertFalse(ledger.observe_variant(variant, canonical), (variant, canonical))
            self.assertTrue(ledger.observe_variant("깃 허브", "GitHub"))
            observations = ledger.data["observations"]

        self.assertEqual(len(observations), 1)
        self.assertEqual(observations[0]["variant"], "깃 허브")
        self.assertFalse(observations[0]["active"])

    def test_cli_add_correction_and_observe_variant_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger_path = Path(tmp) / "ledger.json"
            self.assertEqual(MODULE.main(["--personal-ledger", str(ledger_path), "add-correction", "깃 허브", "GitHub"]), 0)
            self.assertEqual(MODULE.main(["--personal-ledger", str(ledger_path), "observe-variant", "서브 에이전트", "Subagent"]), 0)
            self.assertEqual(MODULE.main(["--personal-ledger", str(ledger_path), "observe-variant", "D:/tmp/foo.txt", "foo"]), 2)
            ledger_data = json.loads(ledger_path.read_text(encoding="utf-8"))

        self.assertIn(
            {"variant": "깃 허브", "canonical": "GitHub", "source": "explicit_user_approved", "created_at": ledger_data["active_corrections"][-1]["created_at"]},
            ledger_data["active_corrections"],
        )
        self.assertEqual(ledger_data["observations"][-1]["variant"], "서브 에이전트")

    def test_hook_output_normalizes_every_prompt_as_interpretation_context(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger_path = Path(tmp) / "ledger.json"
            payload = json.dumps({"prompt": "기터브 확인"}, ensure_ascii=False)
            result = MODULE.run_hook(payload, LEXICON_DATA, personal_ledger_path=ledger_path)
            context = json.loads(result["hookSpecificOutput"]["additionalContext"])

        self.assertEqual(context["voice_dictation_normalizer"]["normalized_prompt"], "GitHub 확인")
        self.assertTrue(context["voice_dictation_normalizer"]["raw_prompt_preserved"])
        self.assertNotEqual(context["voice_dictation_normalizer"]["normalized_prompt"], payload)


if __name__ == "__main__":
    unittest.main()

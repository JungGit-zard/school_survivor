from __future__ import annotations

import builtins
import importlib.util
import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("single_branch_guard.py")
ALLOWED_BRANCH = "zombie_only"
_TEMP_DIRS: list[tempfile.TemporaryDirectory] = []
_SPEC = importlib.util.spec_from_file_location("single_branch_guard", SCRIPT)
assert _SPEC and _SPEC.loader
guard = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = guard
_SPEC.loader.exec_module(guard)


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def init_repo() -> Path:
    temp_dir = tempfile.TemporaryDirectory()
    _TEMP_DIRS.append(temp_dir)
    repo = Path(temp_dir.name)
    repo.joinpath(".keep").write_text("x", encoding="utf-8")
    git(repo, "init")
    git(repo, "config", "user.name", "Codex Test")
    git(repo, "config", "user.email", "codex@example.com")
    git(repo, "checkout", "-b", ALLOWED_BRANCH)
    repo.joinpath("README.md").write_text("branch guard test\n", encoding="utf-8")
    git(repo, "add", "README.md")
    git(repo, "commit", "-m", "initial")
    return repo


class BranchGuardTests(unittest.TestCase):
    def assertRun(self, repo: Path, *args: str, expected: int = 0) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            cwd=repo,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

    def test_check_passes_on_allowed_branch(self) -> None:
        repo = init_repo()
        result = self.assertRun(repo, "check")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(f"branch={ALLOWED_BRANCH}", result.stdout)
        self.assertIn("branch guard: ok", result.stdout)

    def test_print_state_flushes_immediately(self) -> None:
        captured: list[tuple[tuple[object, ...], dict[str, object]]] = []

        original_print = builtins.print

        def fake_print(*args: object, **kwargs: object) -> None:
            captured.append((args, kwargs))

        builtins.print = fake_print
        try:
            guard.print_state(
                guard.RepoState(
                    root=Path("C:/repo"),
                    branch=ALLOWED_BRANCH,
                    head="abc123",
                    detached=False,
                    merge_active=False,
                    rebase_active=False,
                )
            )
        finally:
            builtins.print = original_print

        self.assertGreater(len(captured), 0)
        self.assertTrue(all(kwargs.get("flush") is True for _, kwargs in captured))

    def test_check_fails_on_wrong_branch(self) -> None:
        repo = init_repo()
        git(repo, "checkout", "-b", "feature/not-allowed")
        result = self.assertRun(repo, "check")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("expected branch", result.stderr)

    def test_check_fails_on_detached_head(self) -> None:
        repo = init_repo()
        git(repo, "checkout", "--detach", "HEAD")
        result = self.assertRun(repo, "check")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("detached HEAD", result.stderr)

    def test_check_fails_on_merge_state(self) -> None:
        repo = init_repo()
        merge_head = repo / git(repo, "rev-parse", "--git-path", "MERGE_HEAD").stdout.strip()
        merge_head.write_text("deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\n", encoding="utf-8")
        result = self.assertRun(repo, "check")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("merge in progress", result.stderr)

    def test_check_fails_on_rebase_state(self) -> None:
        repo = init_repo()
        rebase_merge = repo / git(repo, "rev-parse", "--git-path", "rebase-merge").stdout.strip()
        rebase_merge.mkdir(parents=True, exist_ok=True)
        result = self.assertRun(repo, "check")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("rebase in progress", result.stderr)

    def test_run_fails_when_head_changes_during_command(self) -> None:
        repo = init_repo()

        def mutate_head() -> None:
            time.sleep(1.2)
            git(repo, "commit", "--allow-empty", "-m", "head bump")

        thread = threading.Thread(target=mutate_head, daemon=True)
        thread.start()

        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "run",
                "--",
                sys.executable,
                "-c",
                "import time; time.sleep(10)",
            ],
            cwd=repo,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        thread.join(timeout=5)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("head changed", result.stderr)

    def test_run_preserves_calling_cwd(self) -> None:
        repo = init_repo()
        nested = repo / "nested" / "inner"
        nested.mkdir(parents=True, exist_ok=True)

        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "run",
                "--",
                sys.executable,
                "-c",
                "from pathlib import Path; Path('cwd-marker.txt').write_text(str(Path.cwd()), encoding='utf-8')",
            ],
            cwd=nested,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        marker = nested / "cwd-marker.txt"
        self.assertTrue(marker.exists())
        self.assertEqual(marker.read_text(encoding='utf-8'), str(nested.resolve()))
        self.assertFalse((repo / "cwd-marker.txt").exists())

    def test_run_handles_popen_failure_without_traceback(self) -> None:
        repo = init_repo()
        original_collect_state = guard.collect_state
        original_popen = guard.subprocess.Popen
        try:
            guard.collect_state = lambda start=None: guard.RepoState(  # type: ignore[assignment]
                root=repo,
                branch=ALLOWED_BRANCH,
                head="abc123",
                detached=False,
                merge_active=False,
                rebase_active=False,
            )

            def boom(*args: object, **kwargs: object) -> subprocess.Popen[str]:
                raise OSError("cannot start")

            guard.subprocess.Popen = boom  # type: ignore[assignment]
            result = guard.run_command([sys.executable, "-c", "print('x')"], start=repo)
        finally:
            guard.collect_state = original_collect_state  # type: ignore[assignment]
            guard.subprocess.Popen = original_popen  # type: ignore[assignment]

        self.assertEqual(result, 1)


if __name__ == "__main__":
    unittest.main()

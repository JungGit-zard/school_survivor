from __future__ import annotations

import argparse
import os
import shlex
import signal
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


ALLOWED_BRANCH = "zombie_only"
POLL_SECONDS = 0.5


@dataclass(frozen=True)
class RepoState:
    root: Path
    branch: str
    head: str
    detached: bool
    merge_active: bool
    rebase_active: bool


class GuardError(RuntimeError):
    pass


def _run_git(args: list[str], cwd: Path) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return completed.stdout.strip()


def _git_path(cwd: Path, relative_name: str) -> Path:
    raw = _run_git(["rev-parse", "--git-path", relative_name], cwd)
    path = Path(raw)
    if not path.is_absolute():
        path = (cwd / path).resolve()
    return path


def detect_repo_root(start: Path | None = None) -> Path:
    cwd = (start or Path.cwd()).resolve()
    root = _run_git(["rev-parse", "--show-toplevel"], cwd)
    return Path(root).resolve()


def collect_state(start: Path | None = None) -> RepoState:
    root = detect_repo_root(start)
    try:
        branch = _run_git(["symbolic-ref", "--quiet", "--short", "HEAD"], root)
        detached = False
    except subprocess.CalledProcessError:
        branch = "HEAD"
        detached = True

    head = _run_git(["rev-parse", "HEAD"], root)
    merge_active = _git_path(root, "MERGE_HEAD").exists()
    rebase_active = any(
        _git_path(root, git_name).exists()
        for git_name in ("rebase-apply", "rebase-merge")
    )
    return RepoState(
        root=root,
        branch=branch,
        head=head,
        detached=detached,
        merge_active=merge_active,
        rebase_active=rebase_active,
    )


def validate_state(state: RepoState) -> None:
    if state.detached:
        raise GuardError("detached HEAD is not allowed")
    if state.merge_active:
        raise GuardError("merge in progress is not allowed")
    if state.rebase_active:
        raise GuardError("rebase in progress is not allowed")
    if state.branch != ALLOWED_BRANCH:
        raise GuardError(f"expected branch {ALLOWED_BRANCH}, got {state.branch}")


def format_command(command: list[str]) -> str:
    if not command:
        return ""
    if os.name == "nt":
        return subprocess.list2cmdline(command)
    return shlex.join(command)


def print_state(state: RepoState) -> None:
    print(f"repo_root={state.root}", flush=True)
    print(f"branch={state.branch}", flush=True)
    print(f"head={state.head}", flush=True)
    print(f"allowed_branch={ALLOWED_BRANCH}", flush=True)
    print(f"detached={'yes' if state.detached else 'no'}", flush=True)
    print(f"merge_active={'yes' if state.merge_active else 'no'}", flush=True)
    print(f"rebase_active={'yes' if state.rebase_active else 'no'}", flush=True)


def check_command(start: Path | None = None) -> int:
    try:
        state = collect_state(start)
        print_state(state)
        validate_state(state)
        print("branch guard: ok", flush=True)
        return 0
    except (GuardError, subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"branch guard: fail: {exc}", file=sys.stderr, flush=True)
        return 1


def _terminate_child(child: subprocess.Popen[str]) -> None:
    if child.poll() is not None:
        return
    if os.name == "nt":
        try:
            child.send_signal(signal.CTRL_BREAK_EVENT)
        except (ValueError, OSError):
            child.terminate()
    else:
        try:
            os.killpg(child.pid, signal.SIGINT)
        except ProcessLookupError:
            child.terminate()

    try:
        child.wait(timeout=5)
    except subprocess.TimeoutExpired:
        child.kill()
        child.wait(timeout=5)


def run_command(command: list[str], start: Path | None = None) -> int:
    if not command:
        print("branch guard: missing command after --", file=sys.stderr)
        return 2

    call_cwd = (start or Path.cwd()).resolve()
    try:
        initial = collect_state(call_cwd)
        print_state(initial)
        validate_state(initial)
    except (GuardError, subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"branch guard: fail: {exc}", file=sys.stderr, flush=True)
        return 1

    popen_kwargs: dict[str, object] = {
        "cwd": call_cwd,
        "stdout": None,
        "stderr": None,
        "stdin": None,
        "text": True,
    }
    if os.name == "nt":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs["start_new_session"] = True

    print(f"branch guard: run {format_command(command)}", flush=True)
    try:
        child = subprocess.Popen(command, **popen_kwargs)
    except (OSError, subprocess.SubprocessError) as exc:
        print(f"branch guard: fail: unable to start command: {exc}", file=sys.stderr, flush=True)
        return 1
    try:
        while True:
            exit_code = child.poll()
            if exit_code is not None:
                break

            time.sleep(POLL_SECONDS)
            try:
                current = collect_state(call_cwd)
            except (GuardError, subprocess.CalledProcessError, FileNotFoundError) as exc:
                print(f"branch guard: fail: unable to collect repo state: {exc}", file=sys.stderr, flush=True)
                _terminate_child(child)
                return 1
            try:
                validate_state(current)
            except GuardError as exc:
                print(f"branch guard: fail: {exc}", file=sys.stderr, flush=True)
                _terminate_child(child)
                return 1

            if current.head != initial.head:
                print(
                    f"branch guard: fail: head changed from {initial.head} to {current.head}",
                    file=sys.stderr,
                    flush=True,
                )
                _terminate_child(child)
                return 1

            if current.branch != initial.branch:
                print(
                    f"branch guard: fail: branch changed from {initial.branch} to {current.branch}",
                    file=sys.stderr,
                    flush=True,
                )
                _terminate_child(child)
                return 1

        return int(exit_code)
    except KeyboardInterrupt:
        print("branch guard: interrupted, stopping child", file=sys.stderr, flush=True)
        _terminate_child(child)
        return 130


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Fail-closed single-branch guard")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("check", help="verify the current repo branch")
    run_parser = subparsers.add_parser("run", help="run a command while watching the repo branch")
    run_parser.add_argument("command", nargs=argparse.REMAINDER)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "check":
        return check_command()

    command = list(args.command)
    if command and command[0] == "--":
        command = command[1:]
    return run_command(command)


if __name__ == "__main__":
    raise SystemExit(main())

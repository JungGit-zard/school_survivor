#!/usr/bin/env python3
"""Human review collector only. Never authorizes or executes a shell command."""
from __future__ import annotations
import base64
import hashlib
import json
import sys

def collect_reviews(command, cwd, reader, writer):
    writer(f"작업 경로: {cwd}\n명령 (아직 실행 안 됨): {command}")
    writer("사람이 직접 답하세요. 검토용이며 자동 삭제하지 않습니다.")
    try:
        for step in range(1, 4):
            if reader(f"[{step}/3] 할 거예요? [y/N]: ").strip().lower() not in {"y", "yes", "예", "네"}:
                writer("취소. 삭제 차단 유지.")
                return False
    except (EOFError, KeyboardInterrupt):
        writer("취소. 삭제 차단 유지.")
        return False
    writer("3회 확인 완료. 자동 삭제하지 않습니다. 차단 유지.")
    return True


def show_dialog(command, cwd):
    import os
    if os.name != 'nt':
        return sys.stdin.isatty() and collect_reviews(command, cwd, input, print)
    import ctypes
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_bool, ctypes.c_wchar_p]
    kernel.CreateMutexW.restype = ctypes.c_void_p
    kernel.CloseHandle.argtypes = [ctypes.c_void_p]
    digest = hashlib.sha256(json.dumps([command, cwd]).encode()).hexdigest()
    mutex = kernel.CreateMutexW(None, False, 'Local' + chr(92) + 'TerryCleanupReview_' + digest)
    if not mutex or ctypes.get_last_error() == 183:
        if mutex:
            kernel.CloseHandle(mutex)
        return False
    try:
        # Never take approval from JSON hook stdin, pipes or a persistent file.
        with open('CONIN$', 'r', encoding='utf-8') as source, open('CONOUT$', 'w', encoding='utf-8') as target:
            def writer(text):
                print(text, file=target, flush=True)
            def reader(prompt):
                print(prompt, end='', file=target, flush=True)
                answer = source.readline()
                if not answer:
                    raise EOFError
                return answer
            result = collect_reviews(command, cwd, reader, writer)
            try:
                reader('창을 닫으려면 Enter: ')
            except (EOFError, KeyboardInterrupt):
                pass
            return result
    finally:
        kernel.CloseHandle(mutex)


def main():
    if len(sys.argv) != 2:
        return 2
    try:
        payload = json.loads(base64.urlsafe_b64decode(sys.argv[1]).decode())
        command = payload['command']
        cwd = payload['cwd']
        if not isinstance(command, str) or not command or not isinstance(cwd, str):
            return 2
        return 0 if show_dialog(command, cwd) else 1
    except Exception:
        return 2

if __name__ == '__main__':
    raise SystemExit(main())

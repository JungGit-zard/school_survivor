#!/usr/bin/env python3
"""Human review collector only. Never authorizes or executes a shell command."""
from __future__ import annotations
import base64
import hashlib
import json
import secrets
import sys
import time
from dataclasses import dataclass, field

@dataclass
class Ceremony:
    command: str
    cwd: str
    created: float = field(default_factory=time.monotonic)
    count: int = 0
    cancelled: bool = False
    nonce: str = field(default_factory=lambda: secrets.token_hex(4))

    @property
    def fingerprint(self):
        return hashlib.sha256(json.dumps([self.command, self.cwd], ensure_ascii=False).encode()).hexdigest()

    @property
    def expected(self):
        return f'CONFIRM {self.count + 1}/10 {self.nonce}'

    def confirm(self, text):
        if self.cancelled or self.count >= 10 or time.monotonic() - self.created > 900:
            return False
        if text != self.expected:
            return False
        self.count += 1
        self.nonce = secrets.token_hex(4)
        return True

    def cancel(self):
        self.cancelled = True


def show_dialog(command, cwd):
    import tkinter as tk
    from tkinter import messagebox
    state = Ceremony(command, cwd)
    # One active dialog per exact command/cwd. Windows mutex is process-owned;
    # no editable approval file and no filesystem cleanup is required.
    mutex = None
    if sys.platform == 'win32':
        import ctypes
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_bool, ctypes.c_wchar_p]
        kernel.CreateMutexW.restype = ctypes.c_void_p
        kernel.CloseHandle.argtypes = [ctypes.c_void_p]
        mutex = kernel.CreateMutexW(None, False, 'Local' + chr(92) + 'TerryCleanupReview_' + state.fingerprint)
        if not mutex or ctypes.get_last_error() == 183:
            if mutex:
                kernel.CloseHandle(mutex)
            return False
    root = tk.Tk()
    root.title('Terry: ten independent cleanup confirmations')
    root.geometry('820x620')
    tk.Label(root, text='BLOCKED cleanup attempt - HUMAN REVIEW ONLY', fg='red', font=('Arial', 16)).pack(pady=10)
    tk.Label(root, text='No approval here permits raw shell execution. Do not let an agent answer for you.').pack()
    details = tk.Text(root, height=12, wrap='word')
    details.insert('1.0', chr(10).join([f'Working directory: {cwd}', 'Exact proposed command (NOT executed):', command, '', f'Request fingerprint: {state.fingerprint}']))
    details.configure(state='disabled')
    details.pack(fill='both', expand=True, padx=12, pady=12)
    step = tk.StringVar()
    token = tk.StringVar()
    entry = tk.Entry(root, width=65)
    tk.Label(root, textvariable=step, font=('Arial', 14)).pack()
    tk.Label(root, text='Read the target and impact again, then type the exact fresh confirmation:').pack()
    tk.Label(root, textvariable=token, font=('Consolas', 14)).pack(pady=8)
    entry.pack(pady=8)
    def refresh():
        step.set(f'Confirmation {state.count + 1}/10')
        token.set(state.expected)
        entry.delete(0, 'end')
        entry.focus_set()
    def cancel():
        state.cancel()
        root.destroy()
    def submit():
        if not state.confirm(entry.get()):
            messagebox.showwarning('Not confirmed', 'Wrong token, expired request, or cancelled ceremony. No execution is permitted.')
            return
        if state.count == 10:
            messagebox.showinfo('Ten reviews collected', 'Ten separate confirmations were collected for this request only. The shell guard STILL DENIES execution. No permission token was issued.')
            root.destroy()
        else:
            refresh()
    tk.Button(root, text='Confirm this step only', command=submit).pack(pady=6)
    tk.Button(root, text='Cancel - keep blocked', command=cancel).pack(pady=6)
    root.protocol('WM_DELETE_WINDOW', cancel)
    root.after(900000, cancel)
    refresh()
    try:
        root.mainloop()
    finally:
        if mutex:
            kernel.CloseHandle(mutex)
    return state.count == 10 and not state.cancelled


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

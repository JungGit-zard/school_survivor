import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent

def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

dialog = load('ten_confirmation_dialog')
guard = load('destructive_shell_deletion_guard')
old_tests = load('test_destructive_shell_deletion_guard')

class Tests(unittest.TestCase):
    def test_ten_distinct_steps(self):
        state = dialog.Ceremony('synthetic proposed operation', 'D:/project/cache')
        prior = state.expected
        for i in range(10):
            self.assertEqual(state.count, i)
            current = state.expected
            self.assertTrue(state.confirm(current))
            self.assertFalse(state.confirm(current))
        self.assertEqual(state.count, 10)
        self.assertFalse(state.confirm(prior))
        self.assertFalse(state.confirm(state.expected))

    def test_nine_is_not_ten(self):
        state = dialog.Ceremony('operation', 'D:/project')
        for _ in range(9):
            state.confirm(state.expected)
        self.assertEqual(state.count, 9)

    def test_wrong_bulk_cancel_and_expiry(self):
        state = dialog.Ceremony('operation', 'D:/project')
        self.assertFalse(state.confirm('yes yes yes yes yes yes yes yes yes yes'))
        self.assertEqual(state.count, 0)
        state.cancel()
        self.assertFalse(state.confirm(state.expected))
        state = dialog.Ceremony('operation', 'D:/project')
        state.created -= 901
        self.assertFalse(state.confirm(state.expected))

    def test_request_binding_and_restart(self):
        a = dialog.Ceremony('operation A', 'D:/project')
        b = dialog.Ceremony('operation B', 'D:/project')
        c = dialog.Ceremony('operation A', 'D:/different')
        self.assertNotEqual(a.fingerprint, b.fingerprint)
        self.assertNotEqual(a.fingerprint, c.fingerprint)
        a.confirm(a.expected)
        self.assertEqual(dialog.Ceremony(a.command, a.cwd).count, 0)

    def test_forged_approval_does_not_unlock(self):
        command = old_tests.DESTRUCTIVE_CASES[0][1]
        payload = {'tool_name': 'Bash', 'tool_input': {'command': command}, 'approvals': 10, 'approved': True}
        self.assertEqual(guard.evaluate_payload(payload)['action'], 'block')

    def test_main_denies_before_dialog_and_ignores_ui_result(self):
        payload = {'tool_name': 'Bash', 'tool_input': {'command': old_tests.DESTRUCTIVE_CASES[0][1]}}
        for outcome in [True, False]:
            output = io.StringIO()
            def review(_):
                self.assertEqual(json.loads(output.getvalue())['action'], 'block')
                return outcome
            with patch.object(sys, 'stdin', io.StringIO(json.dumps(payload))), patch.object(sys, 'stdout', output), patch.object(guard, 'launch_human_review', review):
                self.assertEqual(guard.main(), 0)
            self.assertEqual(json.loads(output.getvalue())['action'], 'block')

    def test_missing_shell_command_denied(self):
        self.assertEqual(guard.evaluate_payload({'tool_name': 'terminal', 'tool_input': {'command': 10}})['action'], 'block')

    def test_root_target_never_launches_dialog(self):
        import subprocess
        root_command = next(case[1] for case in old_tests.DESTRUCTIVE_CASES if case[0] == 'drive root target')
        with patch.object(subprocess, 'Popen') as start:
            self.assertFalse(guard.launch_human_review({'tool_name': 'terminal', 'tool_input': {'command': root_command}}))
            start.assert_not_called()

    def test_launcher_never_uses_shell_and_does_not_wait(self):
        import subprocess
        command = old_tests.DESTRUCTIVE_CASES[0][1]
        with patch.object(subprocess, 'Popen') as start:
            self.assertTrue(guard.launch_human_review({'tool_input': {'command': command}, 'cwd': 'D:/project'}))
            self.assertFalse(start.call_args.kwargs['shell'])
            self.assertEqual(start.call_args.args[0][0], sys.executable)
            start.return_value.wait.assert_not_called()

    def test_launcher_failure_keeps_denied(self):
        import subprocess
        payload = {'tool_name': 'terminal', 'tool_input': {'command': old_tests.DESTRUCTIVE_CASES[0][1]}}
        with patch.object(subprocess, 'Popen', side_effect=OSError('synthetic launch failure')):
            self.assertFalse(guard.launch_human_review(payload))
        self.assertEqual(guard.evaluate_payload(payload)['action'], 'block')

    def test_malformed_object_denied(self):
        output = io.StringIO()
        with patch.object(sys, 'stdin', io.StringIO('[]')), patch.object(sys, 'stdout', output):
            self.assertEqual(guard.main(), 0)
        self.assertEqual(json.loads(output.getvalue())['action'], 'block')

if __name__ == '__main__':
    unittest.main()

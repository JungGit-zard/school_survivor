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
    def review(self, answers):
        prompts, output = [], []
        stream = iter(answers)
        def reader(prompt):
            prompts.append(prompt)
            try:
                return next(stream)
            except StopIteration:
                raise EOFError
        return dialog.collect_reviews('synthetic operation', 'D:/project', reader, output.append), prompts, output

    def test_three_prompts_only(self):
        ok, prompts, output = self.review(['y', 'y', 'y'])
        self.assertTrue(ok)
        self.assertEqual(len(prompts), 3)
        self.assertIn('[3/3]', prompts[-1])
        self.assertIn('자동 삭제하지 않습니다', output[-1])

    def test_two_not_enough(self):
        self.assertFalse(self.review(['y', 'y'])[0])

    def test_simple_answers(self):
        self.assertTrue(self.review(['Y', '예', '네'])[0])

    def test_cancel_blank_and_bulk(self):
        for answer in ['n', '', 'anything', 'y y y']:
            ok, prompts, _ = self.review([answer])
            self.assertFalse(ok)
            self.assertEqual(len(prompts), 1)

    def test_keyboard_interrupt(self):
        def cancel(_):
            raise KeyboardInterrupt
        self.assertFalse(dialog.collect_reviews('synthetic', 'D:/project', cancel, lambda _: None))

    def test_noninteractive_input_denied(self):
        with patch.object(dialog.os if hasattr(dialog, 'os') else __import__('os'), 'name', 'posix'), patch.object(sys, 'stdin', io.StringIO('y\ny\ny\n')):
            self.assertFalse(dialog.show_dialog('synthetic', 'D:/project'))

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
            self.assertEqual(start.call_args.kwargs['creationflags'], subprocess.CREATE_NEW_CONSOLE)
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

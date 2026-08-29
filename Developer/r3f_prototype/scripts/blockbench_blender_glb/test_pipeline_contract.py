from pathlib import Path
import sys
import tempfile
import unittest

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from pipeline_contract import require_asset_id, require_output_path


class PipelineContractTests(unittest.TestCase):
    def test_asset_id_is_preserved_exactly(self) -> None:
        self.assertEqual(require_asset_id("zombie-e01"), "zombie-e01")

    def test_invalid_asset_id_fails_without_normalizing(self) -> None:
        with self.assertRaisesRegex(ValueError, "received: 'Zombie E01'"):
            require_asset_id("Zombie E01")

    def test_output_contract_requires_force_and_different_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.glb"
            output = root / "output.glb"
            source.write_bytes(b"source")
            output.write_bytes(b"existing")
            with self.assertRaisesRegex(ValueError, "pass --force"):
                require_output_path(source, output, force=False)
            require_output_path(source, output, force=True)
            with self.assertRaisesRegex(ValueError, "must be different"):
                require_output_path(source, source, force=True)


if __name__ == "__main__":
    unittest.main()

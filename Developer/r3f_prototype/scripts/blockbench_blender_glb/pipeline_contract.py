"""Pure input/output contract shared by the Blender pipeline commands."""

from __future__ import annotations

import re
from pathlib import Path


ASSET_ID_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")


def require_asset_id(asset_id: str) -> str:
    """Accept the exact user value or fail; never normalize a user asset id."""
    if not ASSET_ID_PATTERN.fullmatch(asset_id):
        raise ValueError(
            "asset-id must be lower-kebab-case ([a-z0-9]+ separated by single hyphens); "
            f"received: {asset_id!r}"
        )
    return asset_id


def require_output_path(source: Path, output: Path, force: bool) -> None:
    if source == output:
        raise ValueError("input and output must be different paths")
    if output.exists() and not force:
        raise ValueError(f"output already exists; pass --force to overwrite: {output}")

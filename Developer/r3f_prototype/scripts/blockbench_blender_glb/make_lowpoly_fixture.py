"""Create a disposable low-poly GLB fixture for pipeline smoke tests.

Run only through Blender in background mode.  This is not a game asset generator.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    body_material = bpy.data.materials.new("fixture_body_material")
    body_material.diffuse_color = (0.22, 0.62, 0.34, 1.0)
    accent_material = bpy.data.materials.new("fixture_accent_material")
    accent_material.diffuse_color = (0.95, 0.78, 0.18, 1.0)

    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0.75))
    body = bpy.context.active_object
    body.name = "body"
    body.scale = (0.45, 0.30, 0.75)
    body.data.materials.append(body_material)

    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.42, radius2=0.26, depth=0.62, location=(0, 0, 1.8))
    head = bpy.context.active_object
    head.name = "head"
    head.rotation_euler[2] = 0.78539816339
    head.data.materials.append(accent_material)

    bpy.ops.wm.save_as_mainfile(filepath=str(output.with_suffix(".blend")))
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)


if __name__ == "__main__":
    main()

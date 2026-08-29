"""Re-import and validate the minimum contract of a normalized pipeline GLB."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--armature", choices=("optional", "required", "forbid"), default="optional")
    return parser.parse_args(argv)


def near(value: float, expected: float) -> bool:
    return math.isclose(value, expected, abs_tol=1e-6)


def main() -> None:
    args = parse_args()
    source = Path(args.input).resolve()
    if not source.is_file():
        raise RuntimeError(f"GLB not found: {source}")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))

    root = bpy.data.objects.get(args.asset_id)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    errors: list[str] = []
    if root is None or root.type != "EMPTY":
        errors.append("stable empty root is missing")
    elif not all(near(value, expected) for value, expected in zip(root.location, (0, 0, 0))):
        errors.append("root location is not origin")
    elif not all(near(value, expected) for value, expected in zip(root.scale, (1, 1, 1))):
        errors.append("root scale is not one")
    if not meshes:
        errors.append("no mesh objects")
    if args.armature == "required" and not armatures:
        errors.append("required armature is missing")
    if args.armature == "forbid" and armatures:
        errors.append("armature is present when forbidden")

    triangle_count = 0
    for mesh in meshes:
        if not mesh.name.startswith(f"{args.asset_id}__"):
            errors.append(f"unstable mesh name: {mesh.name}")
        if not mesh.data.materials:
            errors.append(f"mesh has no material: {mesh.name}")
        for material in mesh.data.materials:
            if material is not None and not material.name.startswith(f"{args.asset_id}__material"):
                errors.append(f"unstable material name: {material.name}")
        # GLB stores one discontinuous normal per face. Validate the exported
        # rendering data itself: every loop normal must match its face normal.
        for polygon in mesh.data.polygons:
            face_normal = polygon.normal.normalized()
            for loop_index in polygon.loop_indices:
                loop_normal = mesh.data.loops[loop_index].normal.normalized()
                if face_normal.dot(loop_normal) < 0.9999:
                    errors.append(f"mesh has interpolated normals: {mesh.name}")
                    break
        mesh.data.calc_loop_triangles()
        triangle_count += len(mesh.data.loop_triangles)

    report = {
        "input": str(source),
        "asset_id": args.asset_id,
        "mesh_count": len(meshes),
        "armature_count": len(armatures),
        "triangle_count": triangle_count,
        "status": "pass" if not errors else "fail",
        "errors": errors,
    }
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    if errors:
        raise RuntimeError("GLB validation failed")


if __name__ == "__main__":
    main()

"""Normalize a Blockbench-exported GLB and export a game-ready GLB.

This script does not alter Firebase, Graphics Studio, or product source.  It only
operates on the GLB explicitly supplied with --input and writes --output.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import bmesh
import bpy

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from pipeline_contract import require_asset_id, require_output_path


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Blockbench GLB export")
    parser.add_argument("--output", required=True, help="normalized GLB path")
    parser.add_argument("--asset-id", required=True, help="stable lower-kebab asset id")
    parser.add_argument("--force", action="store_true", help="explicitly overwrite an existing output GLB")
    parser.add_argument(
        "--armature",
        choices=("optional", "required", "forbid"),
        default="optional",
        help="rig expectation; this script never creates a rig",
    )
    return parser.parse_args(argv)


def safe_name(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value or "part"


def unique_name(base: str, taken: set[str]) -> str:
    candidate = base
    suffix = 2
    while candidate in taken:
        candidate = f"{base}-{suffix}"
        suffix += 1
    taken.add(candidate)
    return candidate


def root_objects() -> list[bpy.types.Object]:
    return sorted((obj for obj in bpy.context.scene.objects if obj.parent is None), key=lambda obj: obj.name.casefold())


def ensure_default_material(asset_id: str) -> None:
    material_name = f"{asset_id}__material-00-default"
    material = bpy.data.materials.get(material_name) or bpy.data.materials.new(material_name)
    material.diffuse_color = (0.8, 0.8, 0.8, 1.0)
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and not obj.data.materials:
            obj.data.materials.append(material)


def normalize_materials(asset_id: str) -> None:
    """Give every mesh material a deterministic asset-scoped name."""
    used_materials = {
        material
        for obj in bpy.context.scene.objects
        if obj.type == "MESH"
        for material in obj.data.materials
        if material is not None
    }
    taken: set[str] = set()
    for index, material in enumerate(sorted(used_materials, key=lambda item: item.name.casefold()), start=1):
        material.name = unique_name(f"{asset_id}__material-{index:02d}-{safe_name(material.name)}", taken)
        material.diffuse_color = tuple(max(0.0, min(1.0, channel)) for channel in material.diffuse_color)


def apply_mesh_transforms() -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        bpy.ops.object.shade_flat()
        # glTF has no standalone "flat shading" switch.  Splitting every face
        # boundary stores discontinuous per-face normals, which Blender's glTF
        # importer can faithfully restore as flat faces.
        mesh_bm = bmesh.new()
        mesh_bm.from_mesh(obj.data)
        bmesh.ops.split_edges(mesh_bm, edges=list(mesh_bm.edges))
        mesh_bm.to_mesh(obj.data)
        mesh_bm.free()
        obj.data.update()
        for polygon in obj.data.polygons:
            polygon.use_smooth = False
        obj.select_set(False)


def main() -> None:
    args = parse_args()
    source = Path(args.input).resolve()
    output = Path(args.output).resolve()
    asset_id = require_asset_id(args.asset_id)
    if not source.is_file():
        raise RuntimeError(f"input GLB not found: {source}")
    if source.suffix.lower() != ".glb":
        raise RuntimeError("input must be a .glb exported from Blockbench")
    require_output_path(source, output, args.force)
    output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if not meshes:
        raise RuntimeError("input GLB has no mesh objects")
    if args.armature == "required" and not armatures:
        raise RuntimeError("--armature required but no armature was imported")
    if args.armature == "forbid" and armatures:
        raise RuntimeError("--armature forbid but an armature was imported")

    root = bpy.data.objects.new(asset_id, None)
    bpy.context.collection.objects.link(root)
    root.location = (0, 0, 0)
    root.rotation_euler = (0, 0, 0)
    root.scale = (1, 1, 1)
    for obj in root_objects():
        if obj != root:
            obj.parent = root

    taken = {root.name}
    for obj in sorted((obj for obj in bpy.context.scene.objects if obj != root), key=lambda item: item.name.casefold()):
        kind = "armature" if obj.type == "ARMATURE" else safe_name(obj.name)
        obj.name = unique_name(f"{asset_id}__{kind}", taken)

    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    ensure_default_material(asset_id)
    normalize_materials(asset_id)
    apply_mesh_transforms()
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=True,
        export_normals=False,
    )
    print(f"normalized_glb={output}")
    print(f"mesh_count={len(meshes)}")
    print(f"armature_count={len(armatures)}")


if __name__ == "__main__":
    main()

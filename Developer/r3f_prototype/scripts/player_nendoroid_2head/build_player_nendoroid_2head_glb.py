"""Build the deterministic 2-head Nendoroid protagonist GLB.

This script intentionally uses only Blender primitives. It does not restore the old
Image2 pipeline and does not call external/AI services.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ASSET_ID = "player-nendoroid-2head"
HEAD_HEIGHT = 1.3
BODY_HEIGHT = 1.3
TOP_Y = 1.3
CHIN_Y = 0.0
FOOT_BOTTOM_Y = -1.3
COLORS = {
    "skin": (1.0, 0.70, 0.50, 1.0),
    "hair_light": (1.0, 0.50, 0.68, 1.0),
    "hair_dark": (0.78, 0.18, 0.38, 1.0),
    "eye": (0.33, 0.04, 0.12, 1.0),
    "clip": (0.95, 0.95, 1.0, 1.0),
    "blazer": (0.84, 0.08, 0.10, 1.0),
    "shirt": (0.96, 0.96, 0.94, 1.0),
    "tie": (1.0, 0.83, 0.10, 1.0),
    "skirt": (0.05, 0.20, 0.70, 1.0),
    "socks": (0.92, 0.92, 0.95, 1.0),
    "shoe_top": (0.40, 0.52, 0.66, 1.0),
    "shoe_sole": (0.16, 0.22, 0.30, 1.0),
    "bag": (0.02, 0.70, 0.92, 1.0),
    "strap": (0.02, 0.18, 0.62, 1.0),
    "line": (0.04, 0.05, 0.09, 1.0),
}

# name, size xyz, center xyz, material key
PARTS = [
    ("player__head_face", (0.86, 0.82, 0.56), (0.0, 0.38, 0.03), "skin"),
    ("player__hair_top", (1.08, 0.58, 0.76), (0.0, 1.01, 0.0), "hair_light"),
    ("player__hair_front_bangs", (0.92, 0.28, 0.18), (0.0, 0.69, 0.35), "hair_light"),
    ("player__hair_left_side", (0.25, 0.92, 0.52), (-0.56, 0.46, 0.02), "hair_dark"),
    ("player__hair_right_side", (0.25, 0.86, 0.52), (0.56, 0.49, 0.02), "hair_dark"),
    ("player__hair_back_tail", (0.24, 0.68, 0.20), (-0.50, 0.10, -0.34), "hair_dark"),
    ("player__hair_clip", (0.28, 0.12, 0.08), (0.35, 0.87, 0.43), "clip"),
    ("player__eye_left", (0.13, 0.20, 0.035), (-0.20, 0.38, 0.325), "eye"),
    ("player__eye_right", (0.13, 0.20, 0.035), (0.20, 0.38, 0.325), "eye"),
    ("player__body_blazer", (0.82, 0.58, 0.42), (0.0, -0.24, 0.0), "blazer"),
    ("player__shirt_front", (0.36, 0.36, 0.06), (0.0, -0.20, 0.245), "shirt"),
    ("player__tie", (0.14, 0.38, 0.07), (0.0, -0.30, 0.29), "tie"),
    ("player__skirt", (0.92, 0.28, 0.48), (0.0, -0.61, 0.0), "skirt"),
    ("player__backpack", (0.54, 0.72, 0.22), (0.0, -0.24, -0.39), "bag"),
    ("player__backpack_pocket", (0.34, 0.20, 0.07), (0.0, -0.12, -0.525), "strap"),
    ("player__strap_left", (0.10, 0.68, 0.08), (-0.26, -0.24, 0.27), "strap"),
    ("player__strap_right", (0.10, 0.68, 0.08), (0.26, -0.24, 0.27), "strap"),
    ("player__sleeve_left", (0.25, 0.58, 0.30), (-0.60, -0.25, 0.0), "blazer"),
    ("player__hand_left", (0.24, 0.24, 0.24), (-0.60, -0.66, 0.0), "skin"),
    ("player__sleeve_right", (0.25, 0.58, 0.30), (0.60, -0.25, 0.0), "blazer"),
    ("player__hand_right", (0.24, 0.24, 0.24), (0.60, -0.66, 0.0), "skin"),
    ("player__leg_left", (0.23, 0.50, 0.24), (-0.22, -0.90, 0.0), "socks"),
    ("player__shoe_left_top", (0.40, 0.18, 0.45), (-0.22, -1.19, 0.08), "shoe_top"),
    ("player__shoe_left_sole", (0.42, 0.08, 0.48), (-0.22, -1.26, 0.08), "shoe_sole"),
    ("player__leg_right", (0.23, 0.50, 0.24), (0.22, -0.90, 0.0), "socks"),
    ("player__shoe_right_top", (0.40, 0.18, 0.45), (0.22, -1.19, 0.08), "shoe_top"),
    ("player__shoe_right_sole", (0.42, 0.08, 0.48), (0.22, -1.26, 0.08), "shoe_sole"),
    ("player__lantern_body", (0.34, 0.20, 0.24), (0.0, -0.58, 0.20), "strap"),
    ("player__lantern_head", (0.18, 0.24, 0.28), (0.0, -0.80, 0.22), "line"),
    ("player__lantern_button", (0.12, 0.05, 0.08), (0.0, -0.44, 0.28), "tie"),
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_material(name: str, rgba):
    mat = bpy.data.materials.new(name=f"mat__{name}")
    mat.diffuse_color = rgba
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = 0.82
    return mat


def gltf_to_blender_size(size):
    sx, sy, sz = size
    return (sx, sz, sy)


def gltf_to_blender_center(center):
    gx, gy, gz = center
    return (gx, -gz, gy)


def make_beveled_box(name: str, size, center, material, bevel_ratio=0.055):
    blender_size = gltf_to_blender_size(size)
    blender_center = gltf_to_blender_center(center)
    bpy.ops.mesh.primitive_cube_add(size=1, location=blender_center)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"mesh__{name}"
    obj.dimensions = blender_size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("single_step_low_poly_chamfer", "BEVEL")
    bevel.width = min(blender_size) * bevel_ratio
    bevel.segments = 1
    bevel.affect = "EDGES"
    bevel.profile = 0.5
    obj.modifiers.new("weighted_face_normals", "WEIGHTED_NORMAL")
    bpy.ops.object.shade_flat()
    obj.data.materials.append(material)
    obj["asset_id"] = ASSET_ID
    obj["semantic_part"] = name
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def build_scene():
    mats = {key: make_material(key, rgba) for key, rgba in COLORS.items()}
    root = bpy.data.objects.new(ASSET_ID, None)
    root.empty_display_type = "CUBE"
    root["asset_id"] = ASSET_ID
    root["head_height"] = HEAD_HEIGHT
    root["body_height"] = BODY_HEIGHT
    root["total_height"] = HEAD_HEIGHT + BODY_HEIGHT
    bpy.context.collection.objects.link(root)
    for name, size, center, mat_key in PARTS:
        obj = make_beveled_box(name, size, center, mats[mat_key])
        obj.parent = root
    return root


def compute_metrics():
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    depsgraph = bpy.context.evaluated_depsgraph_get()
    tri_count = 0
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        tri_count += sum(max(1, len(poly.vertices) - 2) for poly in mesh.polygons)
        evaluated.to_mesh_clear()
    return {
        "asset_id": ASSET_ID,
        "head_height": HEAD_HEIGHT,
        "body_height": BODY_HEIGHT,
        "total_height": HEAD_HEIGHT + BODY_HEIGHT,
        "top_y": TOP_Y,
        "chin_y": CHIN_Y,
        "foot_bottom_y": FOOT_BOTTOM_Y,
        "head_to_body_ratio": HEAD_HEIGHT / BODY_HEIGHT,
        "visual_head_count": (HEAD_HEIGHT + BODY_HEIGHT) / HEAD_HEIGHT,
        "mesh_count": len(meshes),
        "triangle_count": tri_count,
        "armature_count": len([obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]),
        "semantic_parts": sorted(obj.name for obj in meshes),
        "front_axis": "+Z",
        "up_axis": "+Y",
    }


def setup_camera(view: str):
    bpy.ops.object.light_add(type="AREA", location=(0, -3.2, 4.0))
    light = bpy.context.object
    light.name = f"qa_light_{view}"
    light.data.energy = 460
    light.data.size = 4.0
    cam_positions = {
        "front": (0.0, -5.5, 0.25),
        "right": (5.5, 0.0, 0.25),
        "back": (0.0, 5.5, 0.25),
    }
    bpy.ops.object.camera_add(location=cam_positions[view], rotation=(math.radians(90), 0, 0))
    cam = bpy.context.object
    target = Vector((0, 0, 0))
    direction = target - Vector(cam.location)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 3.25
    bpy.context.scene.camera = cam


def render_view(output: Path, view: str):
    for obj in [o for o in bpy.context.scene.objects if o.type in {"CAMERA", "LIGHT"}]:
        bpy.data.objects.remove(obj, do_unlink=True)
    setup_camera(view)
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.eevee.taa_render_samples = 32
    bpy.context.scene.render.resolution_x = 1200
    bpy.context.scene.render.resolution_y = 1200
    bpy.context.scene.view_settings.view_transform = "Standard"
    bpy.context.scene.world.color = (0.78, 0.78, 0.78)
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--metrics", required=True)
    parser.add_argument("--render-dir", default="")
    script_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(script_args)

    clear_scene()
    build_scene()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=False,
        export_lights=False,
        export_cameras=False,
    )
    metrics = compute_metrics()
    metrics_path = Path(args.metrics)
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.write_text(json.dumps(metrics, indent=2, sort_keys=True), encoding="utf-8")
    if args.render_dir:
        render_dir = Path(args.render_dir)
        render_dir.mkdir(parents=True, exist_ok=True)
        for view in ("front", "right", "back"):
            render_view(render_dir / f"player-nendoroid-2head-{view}.png", view)
    print(json.dumps(metrics, sort_keys=True))


if __name__ == "__main__":
    main()

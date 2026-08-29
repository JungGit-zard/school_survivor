"""Build the Player Image 2.0 low-poly source GLB from the Blockbench part contract.

The editable source remains player-image2-2026-08-29.bbmodel. This script is the
Blender-side material and bevel authoring step used when Blockbench GUI export
cannot be verified by the desktop provider. It creates the same named part and
pivot hierarchy before the normalizer/validator runs.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


PALETTE = {
    "skin": "#ffd0ad",
    "hair_top": "#ff93b6",
    "hair_side": "#db3f78",
    "eye": "#5b1e30",
    "jacket": "#d81f43",
    "shirt": "#fbf7ef",
    "tie": "#facb2c",
    "uniform": "#193f93",
    "backpack": "#049de2",
    "backpack_flap": "#204e9a",
    "strap": "#113d8b",
    "leg": "#f4f5fb",
    "shoe": "#5d738b",
    "lantern": "#087bd2",
    "lantern_lens": "#f5f6eb",
    "lantern_button": "#ffd137",
    "lantern_loop": "#202b3a",
}


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    arguments = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    return parser.parse_args(arguments)


def color(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in range(0, 6, 2)) + (1.0,)


def material(name: str, hex_value: str):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    base = result.node_tree.nodes.get("Principled BSDF")
    base.inputs["Base Color"].default_value = color(hex_value)
    base.inputs["Roughness"].default_value = 0.82
    result.diffuse_color = color(hex_value)
    return result


def make_empty(name: str, location: tuple[float, float, float], parent=None):
    node = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(node)
    node.parent = parent
    node.location = location
    return node


def make_cube(name: str, dimensions, location, parent, surface):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    cube = bpy.context.object
    cube.name = f"{name}_mesh"
    cube.parent = parent
    cube.location = location
    cube.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = cube.modifiers.new("one_step_chamfer", "BEVEL")
    bevel.width = min(dimensions) * 0.12
    bevel.segments = 1
    bevel.affect = "EDGES"
    bpy.context.view_layer.objects.active = cube
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    cube.data.materials.append(surface)


def main() -> None:
    args = parse_args()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    materials = {name: material(f"player_image2_{name}", value) for name, value in PALETTE.items()}
    root = make_empty("player_root", (0, 0, 0))

    # name, parent, local location, dimensions, color key. Locations preserve
    # the existing PlayerMesh floor lift and articulated animation pivots.
    specs = [
        ("head", root, (0, 1.10, 0), (0.80, 0.68, 0.58), "skin"),
        ("hair_top", root, (0, 1.58, 0), (0.98, 0.34, 0.82), "hair_top"),
        ("hair_front", root, (0, 1.32, 0.32), (0.84, 0.28, 0.22), "hair_top"),
        ("hair_side_l", root, (-0.46, 1.15, 0), (0.22, 0.60, 0.50), "hair_side"),
        ("hair_side_r", root, (0.46, 1.18, 0), (0.22, 0.50, 0.46), "hair_side"),
        ("hair_tail_l", root, (-0.50, 0.72, -0.06), (0.22, 0.52, 0.20), "hair_side"),
        ("hair_clip_r", root, (0.34, 1.70, 0.28), (0.25, 0.16, 0.20), "shirt"),
        ("eye_l", root, (-0.18, 1.02, 0.28), (0.12, 0.13, 0.08), "eye"),
        ("eye_r", root, (0.18, 1.02, 0.28), (0.12, 0.13, 0.08), "eye"),
        ("torso_jacket", root, (0, 0.44, 0), (0.68, 0.70, 0.46), "jacket"),
        ("shirt_panel", root, (0, 0.58, 0.30), (0.38, 0.40, 0.10), "shirt"),
        ("tie_yellow", root, (0, 0.48, 0.36), (0.18, 0.40, 0.08), "tie"),
        ("lower_uniform_blue", root, (0, 0.08, 0), (0.92, 0.30, 0.56), "uniform"),
        ("backpack", root, (-0.52, 0.46, -0.22), (0.48, 0.68, 0.30), "backpack"),
        ("backpack_flap", None, (0, 0.24, -0.18), (0.32, 0.22, 0.10), "backpack_flap"),
        ("strap_l", root, (-0.22, 0.46, 0.30), (0.10, 0.62, 0.10), "strap"),
        ("strap_r", root, (0.22, 0.46, 0.30), (0.10, 0.62, 0.10), "strap"),
        ("arm_l", root, (-0.60, 0.72, 0), (0.36, 0.66, 0.36), "jacket"),
        ("hand_l", None, (0, -0.76, 0), (0.26, 0.26, 0.26), "skin"),
        ("arm_r", root, (0.60, 0.72, 0), (0.36, 0.66, 0.36), "jacket"),
        ("hand_r", None, (0, -0.76, 0), (0.26, 0.26, 0.26), "skin"),
        ("leg_l", root, (-0.22, -0.34, 0), (0.26, 0.70, 0.30), "leg"),
        # The Blockbench source puts shoes 0.47 units below the leg origin.
        # The earlier -0.76 value copied a runtime wrapper pivot instead,
        # creating a visible air gap in the authored GLB.
        ("shoe_l", None, (0, -0.48, 0.06), (0.40, 0.25, 0.46), "shoe"),
        ("leg_r", root, (0.22, -0.34, 0), (0.26, 0.70, 0.30), "leg"),
        ("shoe_r", None, (0, -0.48, 0.06), (0.40, 0.25, 0.46), "shoe"),
        ("lantern", None, (0, -0.76, 0.20), None, None),
        ("lantern_body", None, (0, 0, 0), (0.34, 0.20, 0.24), "lantern"),
        ("lantern_lens", None, (0, -0.23, 0.02), (0.18, 0.24, 0.28), "lantern_lens"),
        ("lantern_button", None, (0, 0.11, 0.03), (0.12, 0.05, 0.08), "lantern_button"),
        ("lantern_loop", None, (0, 0.21, -0.02), (0.24, 0.06, 0.11), "lantern_loop"),
    ]
    groups = {}
    for name, parent, location, dimensions, color_name in specs:
        if parent is None:
            if name == "backpack_flap":
                parent = groups["backpack"]
            elif name == "hand_l":
                parent = groups["arm_l"]
            elif name == "hand_r":
                parent = groups["arm_r"]
            elif name == "shoe_l":
                parent = groups["leg_l"]
            elif name == "shoe_r":
                parent = groups["leg_r"]
            elif name.startswith("lantern_"):
                parent = groups["lantern"]
            else:
                parent = groups["arm_r"]
        group = make_empty(name, location, parent)
        if dimensions is not None:
            make_cube(name, dimensions, (0, 0, 0), group, materials[color_name])
        groups[name] = group

    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=False,
    )
    print(f"raw_glb={output}")
    print(f"semantic_part_count={len(specs)}")


if __name__ == "__main__":
    main()

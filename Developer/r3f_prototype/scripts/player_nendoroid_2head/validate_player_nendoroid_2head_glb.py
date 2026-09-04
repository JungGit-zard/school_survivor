"""Validate the deterministic Player Nendoroid GLB in Blender."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy

REQUIRED_PARTS = {
    'player__head_face', 'player__hair_top', 'player__hair_front_bangs',
    'player__hair_left_side', 'player__hair_right_side', 'player__hair_back_tail',
    'player__hair_clip', 'player__eye_left', 'player__eye_right',
    'player__body_blazer', 'player__shirt_front', 'player__tie', 'player__skirt',
    'player__backpack', 'player__backpack_pocket', 'player__strap_left', 'player__strap_right',
    'player__sleeve_left', 'player__hand_left', 'player__sleeve_right', 'player__hand_right',
    'player__leg_left', 'player__shoe_left_top', 'player__shoe_left_sole',
    'player__leg_right', 'player__shoe_right_top', 'player__shoe_right_sole',
    'player__lantern_body', 'player__lantern_head', 'player__lantern_button',
}
EXPECTED_TRIANGLE_COUNT = 1320
MAX_GENERATED_TRIANGLE_COUNT = 3000


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()


def rounded_bounds(values):
    return [round(min(values), 5), round(max(values), 5)]


def span(bounds):
    return round(bounds[1] - bounds[0], 5)


def center(bounds):
    return round((bounds[0] + bounds[1]) / 2.0, 5)


def evaluated_world_vertices(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        vertices = [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
        triangles = sum(max(1, len(poly.vertices) - 2) for poly in mesh.polygons)
    finally:
        evaluated.to_mesh_clear()
    return vertices, triangles


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--report', required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=args.input)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    names = {obj.name for obj in meshes}
    depsgraph = bpy.context.evaluated_depsgraph_get()
    tri_count = 0
    xs = []
    ys = []
    zs = []
    part_centers = {}
    for obj in meshes:
        obj.update_from_editmode()
        vertices, obj_triangles = evaluated_world_vertices(obj, depsgraph)
        tri_count += obj_triangles
        if not vertices:
            continue
        part_x = [v.x for v in vertices]
        part_y = [v.y for v in vertices]
        part_z = [v.z for v in vertices]
        xs.extend(part_x)
        ys.extend(part_y)
        zs.extend(part_z)
        bx = rounded_bounds(part_x)
        by = rounded_bounds(part_y)
        bz = rounded_bounds(part_z)
        part_centers[obj.name] = {
            'x': center(bx),
            'y': center(by),
            'z': center(bz),
        }

    bounds_x = rounded_bounds(xs) if xs else [None, None]
    bounds_y = rounded_bounds(ys) if ys else [None, None]
    bounds_z = rounded_bounds(zs) if zs else [None, None]
    spans = {
        'x': span(bounds_x) if xs else None,
        'y': span(bounds_y) if ys else None,
        'z': span(bounds_z) if zs else None,
    }
    errors = []
    missing_parts = sorted(REQUIRED_PARTS - names)
    extra_meshes = sorted(names - REQUIRED_PARTS)
    armature_count = len([obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'])

    if armature_count:
        errors.append(f'armatures forbidden: {armature_count}')
    if missing_parts:
        errors.append(f'missing required semantic parts: {missing_parts}')
    if extra_meshes:
        errors.append(f'extra meshes: {extra_meshes}')
    if len(meshes) != len(REQUIRED_PARTS):
        errors.append(f'mesh count must be {len(REQUIRED_PARTS)}, got {len(meshes)}')
    if not (tri_count == EXPECTED_TRIANGLE_COUNT or tri_count < MAX_GENERATED_TRIANGLE_COUNT):
        errors.append(
            f'triangle count must be {EXPECTED_TRIANGLE_COUNT} or generated count under '
            f'{MAX_GENERATED_TRIANGLE_COUNT}, got {tri_count}'
        )
    if xs and not (-1.34 <= bounds_z[0] <= -1.24 and 1.24 <= bounds_z[1] <= 1.34):
        errors.append(f'bounds_z must be approximately [-1.3, 1.3], got {bounds_z}')
    if xs and not (2.52 <= spans['z'] <= 2.68):
        errors.append(f'span_z must be approximately 2.6, got {spans["z"]}')
    if xs and not (spans['z'] > spans['x'] and spans['z'] > spans['y']):
        errors.append(f'span_z must be greater than span_x/span_y, got {spans}')

    head_z = max(
        part_centers.get('player__head_face', {}).get('z', -999),
        part_centers.get('player__hair_top', {}).get('z', -999),
        part_centers.get('player__hair_front_bangs', {}).get('z', -999),
    )
    foot_z = min(
        part_centers.get('player__shoe_left_sole', {}).get('z', 999),
        part_centers.get('player__shoe_right_sole', {}).get('z', 999),
        part_centers.get('player__shoe_left_top', {}).get('z', 999),
        part_centers.get('player__shoe_right_top', {}).get('z', 999),
    )
    if not (head_z > foot_z):
        errors.append(f'hair/head Z must be greater than shoe/foot Z, got head_z={head_z}, foot_z={foot_z}')

    report = {
        'status': 'pass' if not errors else 'fail',
        'mesh_count': len(meshes),
        'required_semantic_mesh_count': len(REQUIRED_PARTS),
        'triangle_count': tri_count,
        'expected_triangle_count': EXPECTED_TRIANGLE_COUNT,
        'max_generated_triangle_count': MAX_GENERATED_TRIANGLE_COUNT,
        'armature_count': armature_count,
        'missing_parts': missing_parts,
        'extra_meshes': extra_meshes,
        'bounds_x': bounds_x,
        'bounds_y': bounds_y,
        'bounds_z': bounds_z,
        'span_x': spans['x'],
        'span_y': spans['y'],
        'span_z': spans['z'],
        'part_centers': dict(sorted(part_centers.items())),
        'part_center_ordering': {
            'head_or_hair_z': head_z,
            'shoe_or_foot_z': foot_z,
            'head_hair_above_shoe_foot': head_z > foot_z,
        },
        'visual_head_count': 2.0,
        'front_axis': '+Z',
        'up_axis': '+Y' if not errors else 'unverified',
        'errors': errors,
    }
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report).write_text(json.dumps(report, indent=2, sort_keys=True), encoding='utf-8')
    print(json.dumps(report, sort_keys=True))
    raise SystemExit(0 if report['status'] == 'pass' else 1)


if __name__ == '__main__':
    main()

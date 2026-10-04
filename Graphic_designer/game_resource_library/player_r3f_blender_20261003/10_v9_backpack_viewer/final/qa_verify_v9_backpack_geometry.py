import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[5]
BASE = ROOT / 'Graphic_designer' / 'game_resource_library' / 'player_r3f_blender_20261003'
V8_BLEND = BASE / '09_v8_turnaround' / 'final' / 'PLAYER_v8_final.blend'
V9_BLEND = BASE / '10_v9_backpack_viewer' / 'final' / 'PLAYER_v9_final.blend'
V8_GLB = BASE / '09_v8_turnaround' / 'final' / 'PLAYER_v8_final.glb'
V9_GLB = BASE / '10_v9_backpack_viewer' / 'final' / 'PLAYER_v9_final.glb'
OUT = BASE / '10_v9_backpack_viewer' / 'final' / 'PLAYER_v9_backpack_geometry_verification.json'


def world_bbox(obj):
    pts = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minv = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    maxv = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return {"min": [minv.x, minv.y, minv.z], "max": [maxv.x, maxv.y, maxv.z], "dims": [maxv.x-minv.x, maxv.y-minv.y, maxv.z-minv.z]}


def union_bbox(objs):
    bbs = [world_bbox(o) for o in objs]
    minv = [min(bb['min'][i] for bb in bbs) for i in range(3)]
    maxv = [max(bb['max'][i] for bb in bbs) for i in range(3)]
    return {"min": minv, "max": maxv, "dims": [maxv[i]-minv[i] for i in range(3)]}


def mesh_triangles(obj):
    return sum(len(poly.vertices) - 2 for poly in obj.data.polygons)


def manifold_volume_audit(mesh_objs, merge_distance=0.0):
    nonmanifold = {}
    negative = {}
    open_decals = {}
    for ob in mesh_objs:
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        if merge_distance > 0:
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=merge_distance)
        broken = [e for e in bm.edges if not e.is_manifold]
        vol = bm.calc_volume(signed=True)
        bm.free()
        if ob.name.startswith('Decal_'):
            if broken:
                open_decals[ob.name] = len(broken)
            continue
        if broken:
            nonmanifold[ob.name] = len(broken)
        if vol < -1e-8:
            negative[ob.name] = vol
    return nonmanifold, negative, open_decals


def analyze_blend(label, blend_path):
    bpy.ops.wm.open_mainfile(filepath=str(blend_path))
    bpy.context.view_layer.update()
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    pack_objs = [o for o in meshes if o.name.startswith('Backpack_') or o.name.startswith('Decal_backpack')]
    main = [o for o in meshes if o.name == 'Backpack_main_rectangular']
    torso = [o for o in meshes if o.name == 'Torso_short_school_jacket']
    straps = [o for o in meshes if o.name.startswith('Backpack_strap_')]
    side_rails = [o for o in meshes if o.name.startswith('Backpack_side_rail_')]
    nonmanifold, negative, open_decals = manifold_volume_audit(meshes)
    result = {
        'label': label,
        'blend': str(blend_path),
        'mesh_count': len(meshes),
        'triangle_count_total_meshes': sum(mesh_triangles(o) for o in meshes),
        'pack_object_names': sorted(o.name for o in pack_objs),
        'strap_object_names': sorted(o.name for o in straps),
        'side_rail_object_names': sorted(o.name for o in side_rails),
        'nonmanifold_edges_by_closed_object': nonmanifold,
        'negative_signed_volume_by_closed_object': negative,
        'expected_open_decal_nonmanifold_edges': open_decals,
    }
    if pack_objs:
        result['pack_union_bbox'] = union_bbox(pack_objs)
    if main:
        result['backpack_main_bbox'] = world_bbox(main[0])
    if torso:
        result['torso_bbox'] = world_bbox(torso[0])
    if main and torso:
        mb = result['backpack_main_bbox']; tb = result['torso_bbox']
        # Positive gap would mean separation along front/back axis. Negative means physical overlap/contact.
        result['main_pack_front_to_torso_back_y_gap'] = mb['min'][1] - tb['max'][1]
    if straps:
        result['strap_union_bbox'] = union_bbox(straps)
        if torso:
            sb = result['strap_union_bbox']; tb = result['torso_bbox']
            result['strap_y_overlap_with_torso'] = min(sb['max'][1], tb['max'][1]) - max(sb['min'][1], tb['min'][1])
        if main:
            sb = result['strap_union_bbox']; mb = result['backpack_main_bbox']
            result['strap_y_overlap_with_main_pack'] = min(sb['max'][1], mb['max'][1]) - max(sb['min'][1], mb['min'][1])
    return result


def analyze_glb(label, glb_path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    bpy.context.view_layer.update()
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    nonmanifold, negative, open_decals = manifold_volume_audit(meshes)
    welded_nonmanifold, welded_negative, welded_open_decals = manifold_volume_audit(meshes, merge_distance=1e-6)
    return {
        'label': label,
        'glb': str(glb_path),
        'load_ok': True,
        'mesh_count': len(meshes),
        'triangle_count_total_meshes': sum(mesh_triangles(o) for o in meshes),
        'pack_like_imported_meshes': sorted(o.name for o in meshes if 'Backpack' in o.name or 'backpack' in o.name),
        'raw_import_nonmanifold_edges_by_closed_object': nonmanifold,
        'raw_import_negative_signed_volume_by_closed_object': negative,
        'raw_import_expected_open_decal_nonmanifold_edges': open_decals,
        'welded_1e_6_nonmanifold_edges_by_closed_object': welded_nonmanifold,
        'welded_1e_6_negative_signed_volume_by_closed_object': welded_negative,
        'welded_1e_6_expected_open_decal_nonmanifold_edges': welded_open_decals,
    }

report = {
    'purpose': 'Independent QA verification: v9 backpack geometry, non-stale renders, v8/v9 comparison',
    'axis_note': 'Authored Blender is +Z up; front is -Y, back is +Y. BBox dims are X(width), Y(depth), Z(height).',
    'blend_analysis': [analyze_blend('v8 actual final blend', V8_BLEND), analyze_blend('v9 actual final blend', V9_BLEND)],
    'glb_analysis': [analyze_glb('v8 actual final glb', V8_GLB), analyze_glb('v9 actual final glb', V9_GLB)],
}
v8, v9 = report['blend_analysis']
report['v8_v9_backpack_delta'] = {
    'main_width_x_delta': v9['backpack_main_bbox']['dims'][0] - v8['backpack_main_bbox']['dims'][0],
    'main_depth_y_delta': v9['backpack_main_bbox']['dims'][1] - v8['backpack_main_bbox']['dims'][1],
    'main_height_z_delta': v9['backpack_main_bbox']['dims'][2] - v8['backpack_main_bbox']['dims'][2],
    'pack_union_depth_y_delta': v9['pack_union_bbox']['dims'][1] - v8['pack_union_bbox']['dims'][1],
    'pack_object_count_delta': len(v9['pack_object_names']) - len(v8['pack_object_names']),
    'strap_object_count_delta': len(v9['strap_object_names']) - len(v8['strap_object_names']),
}
OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))

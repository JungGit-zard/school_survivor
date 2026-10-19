import bpy, json, hashlib
from pathlib import Path
ROOT=Path('F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration')
OUT=ROOT/'Graphic_designer/game_resource_library/source-art/player_wholebody_refined_t_efe49b7c'
BASE=OUT/'before_lower_face_cleanup/PLAYER_wholebody_refined_t_efe49b7c.blend'
CUR=OUT/'PLAYER_wholebody_refined_t_efe49b7c.blend'
QA=ROOT/'Quaility_Assurance/player_wholebody_refined_t_efe49b7c'
def collect(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    data={}
    for o in sorted([o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('LOCKED_')], key=lambda o:o.name):
        verts=[tuple(round(c,8) for c in v.co) for v in o.data.vertices]
        polys=[tuple(p.vertices) for p in o.data.polygons]
        loops=[]
        if o.data.uv_layers.active:
            loops=[tuple(round(c,8) for c in l.uv) for l in o.data.uv_layers.active.data]
        data[o.name]={'verts':verts,'polys':polys,'uv':loops,'materials':[m.name if m else None for m in o.data.materials], 'poly_mats':[p.material_index for p in o.data.polygons]}
    return data
base=collect(BASE); cur=collect(CUR)
geom_mismatches=[]; uv_mismatches=[]; material_diffs=[]
for name in sorted(set(base)|set(cur)):
    if name not in base or name not in cur:
        geom_mismatches.append({'object':name,'missing_in':'base' if name not in base else 'current'}); continue
    if base[name]['verts']!=cur[name]['verts'] or base[name]['polys']!=cur[name]['polys']:
        geom_mismatches.append({'object':name,'base_v':len(base[name]['verts']),'cur_v':len(cur[name]['verts']),'base_p':len(base[name]['polys']),'cur_p':len(cur[name]['polys'])})
    if base[name]['uv']!=cur[name]['uv']:
        uv_mismatches.append(name)
    if base[name]['materials']!=cur[name]['materials'] or base[name]['poly_mats']!=cur[name]['poly_mats']:
        material_diffs.append({'object':name,'base_materials':base[name]['materials'],'cur_materials':cur[name]['materials'],'changed_poly_indices':[i for i,(a,b) in enumerate(zip(base[name]['poly_mats'],cur[name]['poly_mats'])) if a!=b]})
report={'baseline':str(BASE),'current':str(CUR),'object_count_base':len(base),'object_count_current':len(cur),'geometry_identical':not geom_mismatches,'uv_identical':not uv_mismatches,'geometry_mismatches':geom_mismatches,'uv_mismatches':uv_mismatches,'material_diffs':material_diffs}
(QA/'lower_face_cleanup_geometry_identity.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'geometry_identical':report['geometry_identical'],'uv_identical':report['uv_identical'],'material_diff_objects':[d['object'] for d in material_diffs], 'changed_poly_indices':material_diffs[0]['changed_poly_indices'] if material_diffs else []},ensure_ascii=False))

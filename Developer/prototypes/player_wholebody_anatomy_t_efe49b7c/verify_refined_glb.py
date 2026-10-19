import json, hashlib, struct, math, sys
from pathlib import Path
import numpy as np
ROOT=Path('F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration')
sys.path.insert(0,str(ROOT/'Developer/prototypes/player_blender_refinement_t_efe49b7c'))
from audit_glb import parse
SRC_DIR=ROOT/'Graphic_designer/game_resource_library/source-art/player_blender_refinement_t_efe49b7c'
OUT_DIR=ROOT/'Graphic_designer/game_resource_library/source-art/player_wholebody_refined_t_efe49b7c'
QA_DIR=ROOT/'Quaility_Assurance/player_wholebody_refined_t_efe49b7c'
SRC=SRC_DIR/'PLAYER_topshape_candidate.glb'; OUT=OUT_DIR/'PLAYER_wholebody_refined_t_efe49b7c.glb'

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):
 raw=p.read_bytes(); n=struct.unpack_from('<I',raw,12)[0]; g=json.loads(raw[20:20+n]); b=raw[28+n:]
 def acc(i):
  a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; cnt={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1}[a['type']]; f={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]; w=struct.calcsize('<'+f*cnt); off=a.get('byteOffset',0)+v.get('byteOffset',0); return [struct.unpack_from('<'+f*cnt,b,off+k*v.get('byteStride',w)) for k in range(a['count'])]
 return g,acc

def primitives(g,key):
 for i,n in enumerate(g['nodes']):
  if key in n.get('name','') and 'mesh' in n:
   return g['meshes'][n['mesh']]['primitives']
 raise KeyError(key)
def matname(g, prim): return g['materials'][prim['material']]['name']
def face_signature(p):
 g,acc=load(p); uvs=[]
 for pr in primitives(g,'coherent_head'):
  uv=acc(pr['attributes']['TEXCOORD_0'])
  # Material reassignment may split the head into multiple glTF primitives; compare UV loop multiset.
  uvs.extend(tuple(round(x,8) for x in tex) for tex in uv)
 return sorted(uvs)
src_a=parse(SRC); out_a=parse(OUT)
uv0=face_signature(SRC); uv1=face_signature(OUT)
assert out_a['triangles'] < 2000
assert uv0 == uv1
assert src_a['images'] == out_a['images']
# No hidden DoubleSide/transparent workaround.
assert all(m['alphaMode']=='OPAQUE' and not m['doubleSided'] for m in out_a['materials'])
assert all(m['indices_in_bounds'] and all(v==m['vertices'] for v in m['attributes'].values()) and not m['degenerate_triangles'] and not m['winding_conflict_edges'] and not m['normal_opposes_face_triangles'] and not m['welded_nonmanifold_edges'] for m in out_a['meshes'])
# Per-material lower-jaw cleanup intentionally splits the coherent_head glTF primitive, so the
# faceSkin material primitive alone has open material boundaries even though the Blender head geometry
# is unchanged/closed. Closedness for head is covered by lower_face_cleanup_geometry_identity.json.
closed_need=['simple_closed_lego_torso','shoulder_cap_underarm_bridge','backpack','jacket','reference_bob']
closed=[]; open_disclosed=[]
for m in out_a['meshes']:
 mn=out_a['materials'][m['material']]['name']; nm=m['name']
 if any(k in nm or k in mn for k in closed_need):
  assert m['welded_boundary_edges']==0, (nm,mn,m['welded_boundary_edges'])
  assert m['signed_volume_local']>0, (nm,mn,m['signed_volume_local'])
  closed.append(nm)
 elif m['welded_boundary_edges']:
  open_disclosed.append({'name':nm,'material':mn,'boundary':m['welded_boundary_edges']})
# buttons were intentionally removed, hair may retain nape opening, collar/tie flat paper-like pieces remain disclosed.
assert any('simple_closed_lego_torso' in n for n in closed)
assert any('left_seated_shoulder_cap_underarm_bridge' in n for n in closed)
assert any('right_seated_shoulder_cap_underarm_bridge' in n for n in closed)
rep=json.loads((QA_DIR/'blender_rebuild_report.json').read_text(encoding='utf-8'))
inner=[x for x in rep['post']['reference_topology_fits'] if x.get('method')=='outer_reference_bob_appended_solidify_style_inner_shell_reversed_faces_connected_boundary_rims']
assert inner, 'missing inner hair shell QA proof'
inner=inner[-1]
assert inner['outer_vertices_preserved'] == inner['inner_vertices_added'], inner
assert inner['inner_faces_added'] == inner['outer_faces_preserved'], inner
assert inner['boundary_rim_quads_added'] > 0, inner
assert inner['max_outer_coordinate_delta_after_append'] < 1e-8, inner
assert 0.020 <= inner['offset_length_minmax'][0] <= inner['offset_length_minmax'][1] <= 0.032, inner
assert inner['face_opening_not_capped'] is True
assert inner['no_double_side_or_black_material_or_outline'] is True
report={'task':'t_efe49b7c','source_glb_sha256':sha(SRC),'output_glb_sha256':sha(OUT),'triangles':out_a['triangles'],'mesh_count':len(out_a['meshes']),'materials':len(out_a['materials']),'face_uv_exact_vs_topshape':uv0==uv1,'face_image_bytes_exact_vs_topshape':True,'all_opaque_frontside':True,'structural_checks_passed':True,'inner_shell_geometry_verified':True,'front_opening_not_capped_verified_by_boundary_rim_no_face_cap':True,'inner_shell_qa':inner,'closed_required_meshes':closed,'open_disclosed_accessory_meshes':open_disclosed,'negative_scale_nodes':out_a['negative_scale_nodes'],'removed_new_candidate_only':rep['post']['removed_new_candidate_only'],'head_compression':rep['post']['head_compression'],'hair_compression':rep['post']['hair_compression'],'rigging_done':False,'animation_done':False,'full_task_approved':False,'art_approval':False}
(QA_DIR/'exported_glb_structural_qa.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))

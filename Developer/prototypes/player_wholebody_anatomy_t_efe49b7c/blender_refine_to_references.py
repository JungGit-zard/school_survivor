"""t_efe49b7c archive-only PLAYER closed-volume rebuild.
New candidate only: simple closed torso exterior, rounded skull width compression,
seated shoulder-cap/underarm bridges. No runtime/Firebase/Git/config writes.
"""
import bpy, bmesh, json, hashlib, math, shutil
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path('F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration')
SRC_DIR=ROOT/'Graphic_designer/game_resource_library/source-art/player_blender_refinement_t_efe49b7c'
OUT_DIR=ROOT/'Graphic_designer/game_resource_library/source-art/player_wholebody_refined_t_efe49b7c'
QA_DIR=ROOT/'Quaility_Assurance/player_wholebody_refined_t_efe49b7c'
SRC_BLEND=SRC_DIR/'PLAYER_topshape_candidate.blend'
SRC_GLB=SRC_DIR/'PLAYER_topshape_candidate.glb'
OUT_BLEND=OUT_DIR/'PLAYER_wholebody_refined_t_efe49b7c.blend'
OUT_GLB=OUT_DIR/'PLAYER_wholebody_refined_t_efe49b7c.glb'
OUT_DIR.mkdir(parents=True,exist_ok=True); QA_DIR.mkdir(parents=True,exist_ok=True)

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def mat(name, fallback=(1,1,1,1)):
    if name in bpy.data.materials: return bpy.data.materials[name]
    m=bpy.data.materials.new(name); m.diffuse_color=fallback; return m

def tris(o):
    o.data.calc_loop_triangles(); return len(o.data.loop_triangles)

def mesh_obj(key):
    return next(o for o in bpy.data.objects if o.type=='MESH' and key in o.name)

def topo(o):
    bm=bmesh.new(); bm.from_mesh(o.data); bm.normal_update()
    r={'boundary':sum(e.is_boundary for e in bm.edges),'nonmanifold':sum(len(e.link_faces)>2 for e in bm.edges),'winding_conflicts':sum(e.is_manifold and not e.is_contiguous for e in bm.edges),'signed_volume':bm.calc_volume(signed=True),'verts':len(bm.verts),'faces':len(bm.faces)}
    bm.free(); return r

def bounds(o):
    ps=[o.matrix_world@v.co for v in o.data.vertices]
    return [[min(p[i] for p in ps),max(p[i] for p in ps)] for i in range(3)]

def recalc_outward(obj):
    bm=bmesh.new(); bm.from_mesh(obj.data); bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(obj.data); bm.free(); obj.data.update()
    # If volume is negative after standard recalc, reverse all faces and recalc custom normals.
    if topo(obj)['signed_volume'] < 0:
        bm=bmesh.new(); bm.from_mesh(obj.data); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.normal_update(); bm.to_mesh(obj.data); bm.free(); obj.data.update()
    obj.data.polygons.foreach_set('use_smooth',[False]*len(obj.data.polygons))

bpy.ops.wm.open_mainfile(filepath=str(SRC_BLEND)); bpy.context.view_layer.update()
pre={'source_blend_sha256':sha(SRC_BLEND),'source_glb_sha256':sha(SRC_GLB),'original_topshape_html_sha256':sha(SRC_DIR/'PLAYER_topshape_clean_toon_standalone.html'),'front_ref_sha256':sha(ROOT/'Graphic_designer/game_resource_library/player_face_texture_v3_t_34a7ea5d/final/viewport_original_front_reference.png'),'side_ref_sha256':sha(ROOT/'Graphic_designer/game_resource_library/player_face_texture_v3_t_34a7ea5d/final/viewport_original_side_reference.png')}

# Reference registration: pack/lock the exact modeling front/side refs in-scene, aspect-correct, baseline/crown aligned.
FRONT_REF=ROOT/'Graphic_designer/game_resource_library/player_face_texture_v3_t_34a7ea5d/final/viewport_original_front_reference.png'
SIDE_REF=ROOT/'Graphic_designer/game_resource_library/player_face_texture_v3_t_34a7ea5d/final/viewport_original_side_reference.png'
WORLD_H=3.17  # chosen modeling registration: ref crown canvas y=0 -> z=WORLD_H, foot baseline canvas y=720 -> z=0
FRONT_W=WORLD_H*402/720
SIDE_W=WORLD_H*300/720
REF_REG={
 'world_height':WORLD_H,
 'mapping_note':'frontX=(px-201)*3.17/720; sideY=(160-px)*3.17/720; worldZ=(720-py)*3.17/720. Landmarks are explicitly approximate from actual alpha silhouette review and advisor pixel evidence, not hidden exact approval.',
 'front':{'image_size':[402,720],'world_width':FRONT_W,'center_pixel_x':201,'foot_baseline_y':720,'crown_y':0,'alpha_bbox':[8,5,399,717],'rough_face_bbox':[110,151,294,260],'rough_hair_bbox':[40,8,368,275],
          'landmarks_px':{'crown':[201,5],'face_center':[202,204],'chin':[202,260],'shoulders_l':[130,280],'shoulders_r':[275,280],'torso_l':[118,400],'torso_r':[290,400],'torso_top_l':[130,330],'torso_top_r':[275,330],'skirt_top_l':[110,440],'skirt_top_r':[298,440],'skirt_l':[97,516],'skirt_r':[312,516],'arm_tip_l':[17,475],'arm_tip_r':[388,475],'ankle_l':[107,610],'ankle_r':[299,610],'foot_l':[90,715],'foot_r':[317,715]}},
 'side':{'image_size':[300,720],'world_width':SIDE_W,'torso_ankle_anchor_pixel_x':160,'foot_baseline_y':720,'crown_y':0,'alpha_bbox':[5,5,292,715],
         'landmarks_px':{'crown':[150,5],'face_front':[290,183],'hair_back':[38,128],'torso_front':[234,356],'torso_back':[110,356],'skirt_front':[277,510],'skirt_back':[84,510],'ankle':[160,610],'shoe_front':[218,704],'shoe_back':[91,704]}}
}
def front_px_to_world(x,y): return ((x-REF_REG['front']['center_pixel_x'])*WORLD_H/720, 0, WORLD_H*(1-y/720))
def side_px_to_world(x,y): return (0, (REF_REG['side']['torso_ankle_anchor_pixel_x']-x)*WORLD_H/720, WORLD_H*(1-y/720))
def add_ref_plane(name,path,kind,loc,rot):
    img=bpy.data.images.load(str(path), check_existing=True)
    try: img.pack()
    except Exception: pass
    mat=bpy.data.materials.new(name+'_mat'); mat.use_nodes=True; mat.blend_method='BLEND'; mat.diffuse_color=(1,1,1,.25); mat.use_screen_refraction=False
    mat.show_transparent_back=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=img
    alpha_mul=mat.node_tree.nodes.new('ShaderNodeMath'); alpha_mul.operation='MULTIPLY'; alpha_mul.inputs[1].default_value=0.25
    mat.node_tree.links.new(tex.outputs.get('Color'), bsdf.inputs.get('Base Color'))
    mat.node_tree.links.new(tex.outputs.get('Alpha'), alpha_mul.inputs[0])
    mat.node_tree.links.new(alpha_mul.outputs[0], bsdf.inputs.get('Alpha'))
    w=REF_REG[kind]['world_width']; h=WORLD_H
    mesh=bpy.data.meshes.new(name+'_mesh')
    mesh.from_pydata([(-w/2,0,-h/2),(w/2,0,-h/2),(w/2,0,h/2),(-w/2,0,h/2)], [], [(0,1,2,3)]); mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    # Explicit quad UVs matching vertices: lower-left, lower-right, upper-right, upper-left.
    for li,uvco in zip(mesh.polygons[0].loop_indices,[(0,0),(1,0),(1,1),(0,1)]): uv.data[li].uv=uvco
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj); obj.location=loc; obj.rotation_euler=rot
    obj.data.materials.append(mat); obj.hide_select=True; obj.hide_render=False; obj.show_in_front=True
    obj['reference_registration']=json.dumps(REF_REG[kind],ensure_ascii=False)
    return obj
# front image plane in XZ behind model; side image plane in YZ beside model. Both use exact decoded image aspect: width=worldHeight*imageWidth/720.
front_ref=add_ref_plane('LOCKED_ref_front_registered_exact',FRONT_REF,'front',(0,-0.82,WORLD_H/2),(0,0,0))
side_ref_center_y=(REF_REG['side']['torso_ankle_anchor_pixel_x']-REF_REG['side']['image_size'][0]/2)*WORLD_H/720
side_ref=add_ref_plane('LOCKED_ref_side_registered_exact',SIDE_REF,'side',(1.42,side_ref_center_y,WORLD_H/2),(0,0,math.radians(-90)))

# Preserve approved facial UV/texture: snapshot UVs, true lower-face/head local rings, image hashes.
# Head object local Z is the Blender cranial vertical axis; exported glTF presents this as local Y.
# Crown rings above localZ .78 are intentionally editable for the Advisor-requested dome fix.
head=mesh_obj('coherent_head'); hair=mesh_obj('reference_bob')
# Restore clean render/material sanity after geometry refit: bob should be opaque pink, not evidence-wire white/transparent.
def force_object_base_color(ob, rgba):
    for m in ob.data.materials:
        if not m: continue
        m.diffuse_color=rgba; m.blend_method='OPAQUE'; m.use_nodes=True
        bsdf=m.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            for link in list(m.node_tree.links):
                if link.to_node==bsdf and link.to_socket.name in ('Base Color','Alpha'):
                    m.node_tree.links.remove(link)
            bsdf.inputs['Base Color'].default_value=rgba
            bsdf.inputs['Alpha'].default_value=1.0
force_object_base_color(hair,(0.86,0.43,0.56,1.0))
head_source_local={v.index:v.co.copy() for v in head.data.vertices}
uv_before=[tuple(d.uv) for d in head.data.uv_layers.active.data]
lower_face_before=[(v.index, tuple(v.co)) for v in head.data.vertices if v.co.z <= 0.7805]
face_images=[img.filepath or img.name for img in bpy.data.images]
# Remove rejected fragmented upper body stack in NEW candidate only.
remove_keys=['coral_jacket_continuous_torso_envelope_with_center_opening','tapered_torso_contour_ring_core_under_uniform','tiny_jacket_button']
removed=[]
for o in list(bpy.data.objects):
    if o.type=='MESH' and any(k in o.name for k in remove_keys):
        removed.append({'name':o.name,'tris':tris(o)})
        bpy.data.objects.remove(o, do_unlink=True)
# Make one simple closed torso exterior: faceted tapered prism with top/bottom/front/back/sides.
jacket=mat('jacket.002',(0.9,0.12,0.18,1)); shirt=mat('shirt.002',(1,1,1,1))
# z rings, half width, front y, back y. Keep near the actual TOPSHAPE jacket/skirt WORLD bounds:
# original jacket z 1.075..1.815 and skirt top 1.17. The prior draft bottomed at .88 and buried the skirt.
# This candidate sets the visible hem just above the skirt top, removes the mid-bulge, and keeps the
# front surface behind tie/collar/straps so accessories can sit on the exterior after base verification.
rings=[(1.185,0.455,-0.335,0.305),(1.30,0.475,-0.340,0.310),(1.58,0.445,-0.335,0.300),(1.805,0.375,-0.315,0.275)]
verts=[]
for z,w,yf,yb in rings:
    # 8-point softened rectangle clockwise from front-left; top/front corners keep chibi blockiness.
    verts += [(-w,yf,z),(-w*.46,yf,z),(w*.46,yf,z),(w,yf,z),(w,yb*.15,z),(w,yb,z),(-w,yb,z),(-w,yb*.15,z)]
faces=[]; mat_indices=[]
# sides between rings
for r in range(len(rings)-1):
    a=r*8; b=(r+1)*8
    for i in range(8):
        j=(i+1)%8; faces.append((a+i,a+j,b+j,b+i)); mat_indices.append(0)
# caps
faces.append(tuple(range(7,-1,-1))); mat_indices.append(0)
faces.append(tuple(range((len(rings)-1)*8,(len(rings)-1)*8+8))); mat_indices.append(0)
mesh=bpy.data.meshes.new('simple_closed_lego_torso_exterior_mesh'); mesh.from_pydata(verts,[],faces); mesh.update()
torso=bpy.data.objects.new('simple_closed_lego_torso_exterior_one_piece',mesh); bpy.context.collection.objects.link(torso)
torso.data.materials.append(jacket); torso.data.materials.append(shirt)
for i,p in enumerate(torso.data.polygons): p.material_index=mat_indices[i]
recalc_outward(torso)
# Shoulder cap / underarm bridges: closed seated low-poly tapered connectors, not exposed balls.
def make_bridge(side):
    s=-1 if side=='left' else 1
    name=f'{side}_seated_shoulder_cap_underarm_bridge'
    m=bpy.data.meshes.new(name+'_mesh')
    # torso ring (inner) and arm ring (outer) in world coords; closed frustum with underarm bottom.
    inner_x=s*0.405; outer_x=s*0.585
    ring=[(0,-0.155,1.635),(0,-0.055,1.735),(0,0.105,1.675),(0,0.125,1.515),(0,-0.015,1.445)]
    vin=[(inner_x,y,z) for _,y,z in ring]
    vout=[(outer_x,y*1.08,z-0.035 if z<1.55 else z-0.015) for _,y,z in ring]
    vs=vin+vout
    fs=[]
    for i in range(len(ring)):
        j=(i+1)%len(ring); fs.append((i,j,5+j,5+i))
    fs.append(tuple(range(4,-1,-1))); fs.append(tuple(range(5,10)))
    m.from_pydata(vs,[],fs); m.update(); o=bpy.data.objects.new(name,m); bpy.context.collection.objects.link(o); o.data.materials.append(jacket); recalc_outward(o); return o
bridges=[make_bridge('left'),make_bridge('right')]
# Seat existing sleeve roots slightly into bridge/torso; no global scaling.
for key,s in [('left_upper_sleeve',-1),('right_upper_sleeve',1)]:
    try: ob=mesh_obj(key)
    except StopIteration: continue
    inv=ob.matrix_world.inverted(); changed=0
    for v in ob.data.vertices:
        p=ob.matrix_world@v.co
        if p.z>1.38 and abs(p.x)<0.43:
            p.x=s*0.43; v.co=inv@p; changed+=1
        elif p.z>1.50 and abs(p.x)<0.55:
            p.x=s*max(abs(p.x),0.55); v.co=inv@p; changed+=1
    ob.data.update(); recalc_outward(ob)
# Refit straps onto new exterior while preserving source front/back runs.
# Negative world-Y is the visible front side in this archive; the rejected draft forced all strap
# vertices to positive/back Y and hid the front straps. Keep front vertices just in front of torso.
for key,s in [('left_fitted_continuous_backpack_strap',-1),('right_fitted_continuous_backpack_strap',1)]:
    try: ob=mesh_obj(key)
    except StopIteration: continue
    inv=ob.matrix_world.inverted()
    world=[ob.matrix_world@v.co for v in ob.data.vertices]
    front=[p.y for p in world if p.y < 0.02]
    front_center=sum(front)/len(front) if front else -0.18
    for v in ob.data.vertices:
        p=ob.matrix_world@v.co
        if p.z>1.55:
            p.x=s*min(0.39,max(0.27,abs(p.x)+0.006))
        elif p.z>1.18:
            p.x=s*min(0.415,max(0.285,abs(p.x)+0.004))
        if p.y < 0.02:
            # translate/soften, do not collapse: preserve strap thickness and local variation.
            p.y=-0.372+(p.y-front_center)*0.35
            p.y=max(-0.405,min(-0.345,p.y))
        elif p.z>1.55:
            p.y=max(p.y,0.20)
        elif p.z>1.18:
            p.y=max(p.y,0.14)
        v.co=inv@p
    ob.data.update(); recalc_outward(ob)
# Refit collar/tie onto the front exterior AFTER torso foundation; translate to target front depth
# while preserving object thickness instead of flattening all vertices to one plane.
for key in ['white_collar_left_triangle','white_collar_right_triangle','yellow_tie_knot','yellow_tie_long_drop']:
    try: ob=mesh_obj(key)
    except StopIteration: continue
    inv=ob.matrix_world.inverted()
    world=[ob.matrix_world@v.co for v in ob.data.vertices]
    zvals=[p.z for p in world]
    ycenter=sum(p.y for p in world)/len(world)
    target_y=-0.405 if 'tie' in key else -0.395
    zmin,zmax=min(zvals),max(zvals)
    for v in ob.data.vertices:
        p=ob.matrix_world@v.co
        p.y += target_y-ycenter
        if key=='yellow_tie_long_drop':
            u=0 if zmax==zmin else (p.z-zmin)/(zmax-zmin)
            p.z=1.225+u*(1.60-1.225)
        v.co=inv@p
    ob.data.update(); recalc_outward(ob)
# Crown/vault correction: exact local-ring dome edit. Facial UV pixels stay untouched, and localZ<=.78
# lower face/temple geometry is locked. Advisor implementation values, not user-specified measurements:
# source halfwidths .78=.50, .98=.64, 1.18=.49 -> target .98=.38, 1.18=.10.
def reshape_cranial_vault_local_rings(ob, is_hair=False):
    z0,z1,z2=0.7805,0.9805,1.1805
    ring0_x=0.50
    target1_x=0.38 if not is_hair else 0.50
    target2_x=0.10 if not is_hair else 0.22
    ring0_y=0.731
    target1_y=0.50 if not is_hair else 0.62
    target2_y=0.16 if not is_hair else 0.30
    # Preserve fringe / face-covering hair below the brow/temple band; refit only cranial cap.
    n=0; max_dx=0; max_dy=0
    for v in ob.data.vertices:
        z=v.co.z
        if z <= z0:
            continue
        if z <= z1:
            t=(z-z0)/(z1-z0)
            tx=ring0_x+(target1_x-ring0_x)*t
            ty=ring0_y+(target1_y-ring0_y)*t
            cx=0.50+(0.64-0.50)*t
            cy=0.731+(0.672-0.731)*t
        else:
            t=min(1,(z-z1)/(z2-z1))
            # smooth rounded cap closure from .98 to 1.18.
            s=t*t*(3-2*t)
            tx=target1_x+(target2_x-target1_x)*s
            ty=target1_y+(target2_y-target1_y)*s
            cx=0.64+(0.49-0.64)*t
            cy=0.672+(0.4575-0.672)*t
        oldx,oldy=v.co.x,v.co.y
        # Scale each existing ring about the local center instead of clamping; this preserves angular order,
        # native topology, and avoids collapsed/degenerate faceSkin triangles.
        if cx>1e-6:
            v.co.x *= tx/cx
        if cy>1e-6:
            v.co.y *= ty/cy
        max_dx=max(max_dx,abs(oldx-v.co.x)); max_dy=max(max_dy,abs(oldy-v.co.y)); n+=1
    ob.data.update()
    # Topology/winding is unchanged; do not rebuild mesh with bmesh here because it can reorder loops/UVs.
    # Blender will export updated face normals from moved vertex positions while UV loop data remains byte-for-byte stable.
    return {'object':ob.name,'mode':'head_localZ_ring_dome','locked_local_z_lte':z0,'target_halfwidths':{'z0_0.78':ring0_x,'z1_0.98':target1_x,'z2_1.18':target2_x},'target_depth_half':{'z0_0.78':ring0_y,'z1_0.98':target1_y,'z2_1.18':target2_y},'changed_vertices':n,'max_local_x_delta':max_dx,'max_local_y_delta':max_dy,'advisor_values_not_user_measurements':True,'face_uv_preserved_not_crown_xyz_locked':True}
# Advisor visual reject: do NOT reuse the prior narrow ring reshape.  It collapsed hair and made a conical bald head.
# Start each build from original TOPSHAPE meshes and preserve face PNG/UV bytes only; head/hair XYZ may change by measured reference fit.
head_comp={'object':head.name,'mode':'prior_narrow_ring_reshape_removed_after_visual_reject','changed_vertices':0,'face_uv_preserved_not_crown_xyz_locked':True}
hair_comp={'object':hair.name,'mode':'prior_narrow_ring_reshape_removed_after_visual_reject','changed_vertices':0,'face_uv_preserved_not_crown_xyz_locked':True}
# Remove possible hair/head intersections by nudging hair upward/back just enough if needed.
def tree(o):
    o.data.calc_loop_triangles(); return BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[tuple(t.vertices) for t in o.data.loop_triangles],all_triangles=True)
intersections=len(tree(head).overlap(tree(hair)))
if intersections:
    for v in hair.data.vertices:
        p=hair.matrix_world@v.co; p.y+=0.012; p.z+=0.006; v.co=hair.matrix_world.inverted()@p
    hair.data.update(); intersections=len(tree(head).overlap(tree(hair)))

# Reference-first topology fitting pass after Advisor visual reject.
# Use source TOPSHAPE meshes as base every build and map each named part by clear positive affine bounds.
# Reference conversion: frontX=(px-201)*S, sideY=(160-px)*S, Z=(720-py)*S with S=3.17/720.
def lerp(a,b,t):
    t=max(0,min(1,t))
    if isinstance(a,(tuple,list)):
        return tuple(a[i]+(b[i]-a[i])*t for i in range(len(a)))
    return a+(b-a)*t
def piecewise(v, rows):
    rows=sorted(rows)
    if v<=rows[0][0]: return rows[0][1]
    if v>=rows[-1][0]: return rows[-1][1]
    for (a,va),(b,vb) in zip(rows,rows[1:]):
        if a<=v<=b: return lerp(va,vb,(v-a)/(b-a))
    return rows[-1][1]
def FX(px): return (px-201)*WORLD_H/720
def SY(px): return (160-px)*WORLD_H/720
def ZZ(py): return (720-py)*WORLD_H/720
def obj_world_bounds(ob):
    ps=[ob.matrix_world@v.co for v in ob.data.vertices]
    return {'minx':min(p.x for p in ps),'maxx':max(p.x for p in ps),'miny':min(p.y for p in ps),'maxy':max(p.y for p in ps),'minz':min(p.z for p in ps),'maxz':max(p.z for p in ps),'cx':sum(p.x for p in ps)/len(ps),'cy':sum(p.y for p in ps)/len(ps),'cz':sum(p.z for p in ps)/len(ps)}
def require_mesh(key):
    ob=mesh_obj(key)
    if not ob or ob.type!='MESH': raise RuntimeError('missing required mesh '+key)
    return ob
def bbox_from_front(x0,x1,y0,y1):
    return {'x':(FX(x0),FX(x1)), 'z':(ZZ(y1),ZZ(y0))}
def bbox_y_from_side(px_back,px_front):
    # returned minY,maxY; px increasing means more negative worldY.
    return (min(SY(px_front),SY(px_back)), max(SY(px_front),SY(px_back)))
def fit_bbox_world(key, x=None, y=None, z=None, label='measured_bbox_affine'):
    ob=require_mesh(key); b=obj_world_bounds(ob); inv=ob.matrix_world.inverted(); changed=0; maxd=0
    sx=(x[1]-x[0])/max(1e-6,(b['maxx']-b['minx'])) if x else None
    sy=(y[1]-y[0])/max(1e-6,(b['maxy']-b['miny'])) if y else None
    sz=(z[1]-z[0])/max(1e-6,(b['maxz']-b['minz'])) if z else None
    assert (sx is None or sx>0) and (sy is None or sy>0) and (sz is None or sz>0), (key,sx,sy,sz,x,y,z,b)
    for v in ob.data.vertices:
        p=ob.matrix_world@v.co; old=p.copy()
        if x: p.x=x[0]+(p.x-b['minx'])*sx
        if y: p.y=y[0]+(p.y-b['miny'])*sy
        if z: p.z=z[0]+(p.z-b['minz'])*sz
        if (p-old).length>1e-7:
            v.co=inv@p; changed+=1; maxd=max(maxd,(p-old).length)
    ob.data.update()
    return {'object':ob.name,'changed':changed,'max_world_delta':maxd,'method':label,'source_bounds':b,'target_x':x,'target_y':y,'target_z':z,'positive_scales':[sx,sy,sz]}

def fit_head_from_original_rings(ob, src_local):
    inv=ob.matrix_world.inverted()
    zs=sorted({round(co.z,4) for co in src_local.values()})
    zmin=min(co.z for co in src_local.values()); zmax=max(co.z for co in src_local.values())
    target_hw=[(0.00,0.27),(0.16,0.37),(0.30,0.41),(0.52,0.43),(0.78,0.41),(0.98,0.33),(1.18,0.23)]
    # Advisor final bounded correction: keep Z/X ring fit, but replace symmetric depth with
    # separate front/back Y values to reduce lower-face side wedge while preserving closed skull.
    target_yfb=[(0.00,(-0.46,0.13)),(0.16,(-0.51,0.22)),(0.30,(-0.53,0.38)),(0.52,(-0.52,0.45)),(0.78,(-0.39,0.47)),(0.98,(-0.26,0.37)),(1.18,(-0.17,0.26))]
    # Group source vertices by nearest real localZ ring family. Actual TOPSHAPE has jittered rows
    # around 0,.10,.28,.52,.78,.98,1.18; grouping exact rounded z creates near-zero spans and degenerates.
    canonical=[0.0,0.10,0.28,0.52,0.78,0.98,1.18]
    rings={}
    vertex_ring={}
    for i,co in src_local.items():
        rz=min(canonical, key=lambda r: abs(co.z-r)); vertex_ring[i]=rz; rings.setdefault(rz,[]).append((i,co))
    ring_bounds={}
    for rz,items in rings.items():
        xs=[co.x for _,co in items]; ys=[co.y for _,co in items]
        ring_bounds[rz]={'minx':min(xs),'maxx':max(xs),'miny':min(ys),'maxy':max(ys),'cx':(min(xs)+max(xs))/2,'cy':(min(ys)+max(ys))/2}
    changed=0; maxd=0
    for v in ob.data.vertices:
        co=src_local[v.index]; rz=vertex_ring[v.index]; b=ring_bounds[rz]
        hx=max(1e-6,(b['maxx']-b['minx'])/2)
        nx=(co.x-b['cx'])/hx if hx>1e-6 else 0.0
        lz=co.z
        hw=piecewise(lz,target_hw); yf,yb=piecewise(lz,target_yfb)
        wz=2.02+(lz/max(1e-6,zmax))*1.00
        ty=(co.y-b['miny'])/max(1e-6,(b['maxy']-b['miny']))
        world=Vector((0.013+nx*hw, yf+ty*(yb-yf), wz))
        old=ob.matrix_world@v.co
        v.co=inv@world
        if (world-old).length>1e-7:
            changed+=1; maxd=max(maxd,(world-old).length)
    ob.data.update()
    # Do not bmesh-rewrite head here; bmesh.to_mesh can reorder loops/UVs. Topology is unchanged.
    return {'object':ob.name,'mode':'original_localZ_ring_positive_affine_skull_volume_separate_front_back_depth','changed_vertices':changed,'max_world_delta':maxd,'source_local_z_minmax':[zmin,zmax],'actual_source_rings':zs,'canonical_ring_groups':canonical,'target_world_z':'2.02+(localZ/sourceMaxZ)*1.00','target_halfwidths':target_hw,'target_front_back_y':target_yfb,'target_centerX':0.013,'advisor_values_not_user_measurements':True,'face_uv_preserved_not_xyz_locked':True}
def fit_row_world(key, front_rows, side_rows=None, z_px_span=None, label='measured_row_affine'):
    ob=require_mesh(key); inv=ob.matrix_world.inverted(); changed=0; maxd=0
    # Final bounded correction: snapshot original world vertices and edges first, then use
    # original per-Z cross-section envelopes (vertices at Z + edge/Z intersections) instead of
    # dividing every row by one global bbox. This avoids double taper while preserving topology.
    src_world={v.index:(ob.matrix_world@v.co).copy() for v in ob.data.vertices}
    src_edges=[(e.vertices[0], e.vertices[1]) for e in ob.data.edges]
    b={'minx':min(p.x for p in src_world.values()),'maxx':max(p.x for p in src_world.values()),
       'miny':min(p.y for p in src_world.values()),'maxy':max(p.y for p in src_world.values()),
       'minz':min(p.z for p in src_world.values()),'maxz':max(p.z for p in src_world.values())}
    zmin,zmax=(ZZ(z_px_span[1]), ZZ(z_px_span[0])) if z_px_span else (min(ZZ(r[0]) for r in front_rows), max(ZZ(r[0]) for r in front_rows))
    old_zspan=max(1e-6,b['maxz']-b['minz'])
    xrow=[]
    for py,x0,x1 in front_rows:
        xrow.append((ZZ(py), (FX(x0), FX(x1))))
    yrow=[]
    if side_rows:
        for py,xb,xf in side_rows:
            yy=bbox_y_from_side(xb,xf); yrow.append((ZZ(py), (yy[0], yy[1])))
    def env_at_z(z):
        pts=[]
        eps=max(1e-3, old_zspan*1e-3)  # Source ring Z jitter is about 0.0005; keep each ring together.
        for p in src_world.values():
            if abs(p.z-z)<=eps:
                pts.append((p.x,p.y))
        for a,bidx in src_edges:
            p0=src_world[a]; p1=src_world[bidx]
            z0,z1=p0.z,p1.z
            if abs(z1-z0)<=1e-9:
                continue
            if (z0<=z<=z1) or (z1<=z<=z0):
                t=(z-z0)/(z1-z0)
                if -1e-7<=t<=1+1e-7:
                    pts.append((p0.x+(p1.x-p0.x)*t, p0.y+(p1.y-p0.y)*t))
        if not pts:
            # robust fallback: nearest source vertices; should be rare on closed/rowed meshes.
            near=sorted(src_world.values(), key=lambda p: abs(p.z-z))[:8]
            pts=[(p.x,p.y) for p in near]
        xs=[q[0] for q in pts]; ys=[q[1] for q in pts]
        return min(xs),max(xs),min(ys),max(ys),len(pts)
    samples=[]
    for v in ob.data.vertices:
        orig=src_world[v.index]
        nz=(orig.z-b['minz'])/old_zspan
        target_z=zmin+nz*(zmax-zmin)
        sx0,sx1,sy0,sy1,npts=env_at_z(orig.z)
        tx0,tx1=piecewise(target_z,xrow)
        if abs(sx1-sx0)<=1e-7:
            newx=(tx0+tx1)/2
        else:
            newx=tx0+(orig.x-sx0)/(sx1-sx0)*(tx1-tx0)
        if yrow:
            ty0,ty1=piecewise(target_z,yrow)
            if abs(sy1-sy0)<=1e-7:
                newy=(ty0+ty1)/2
            else:
                newy=ty0+(orig.y-sy0)/(sy1-sy0)*(ty1-ty0)
        else:
            newy=orig.y
        p=Vector((newx,newy,target_z)); old=ob.matrix_world@v.co
        if (p-old).length>1e-7:
            v.co=inv@p; changed+=1; maxd=max(maxd,(p-old).length)
        if len(samples)<8:
            samples.append({'orig_z':orig.z,'target_z':target_z,'source_env':[sx0,sx1,sy0,sy1,npts],'target_x':[tx0,tx1]})
    ob.data.update()
    return {'object':ob.name,'changed':changed,'max_world_delta':maxd,'method':label+'_source_per_z_envelope','source_bounds':b,'front_rows_px':front_rows,'side_rows_px':side_rows,'target_z_px_span':z_px_span,'envelope_sample':samples}
# Pixel-derived world landmark table used for fitting/evidence.
LM={'front':{k:front_px_to_world(*v) for k,v in REF_REG['front']['landmarks_px'].items()}, 'side':{k:side_px_to_world(*v) for k,v in REF_REG['side']['landmarks_px'].items()}}
ref_fits=[]
# Head first: UV/image are locked, not old XYZ. Keep broad skull inside bob; do not cone-cap.
head_comp=fit_head_from_original_rings(head, head_source_local)
ref_fits.append(head_comp)
# Hair from original TOPSHAPE mesh. Keep lower hair / bangs from y100 down unchanged,
# but add upper contour rows so the crown rounds/tapers instead of clamping the top to y40 width.
ref_fits.append(fit_row_world('reference_bob',
    front_rows=[(5,160,248),(20,105,308),(40,79,330),(100,61,348),(150,50,358),(200,40,368),(250,45,363),(275,70,340)],
    side_rows=[(5,112,196),(20,62,250),(40,37,275),(100,26,289),(150,18,291),(200,9,276),(250,14,268),(275,30,250)],
    z_px_span=(5,275), label='hair_upper_crown_rounded_top_contour_preserve_lower_bangs'))
# Core body/clothing.
ref_fits.append(fit_bbox_world('simple_closed_lego_torso_exterior_one_piece', x=(FX(110),FX(298)), y=bbox_y_from_side(110,234), z=(ZZ(440),ZZ(275)), label='closed_torso_top_hem_bbox_affine'))
ref_fits.append(fit_bbox_world('short_neck_visible_below_complete_skull', x=(FX(172),FX(230)), y=bbox_y_from_side(138,202), z=(ZZ(285),ZZ(260)), label='neck_bbox_affine'))
ref_fits.append(fit_bbox_world('reference_tapered_pleated_skirt_shell', x=(FX(97),FX(312)), y=bbox_y_from_side(84,277), z=(ZZ(516),ZZ(440)), label='skirt_bbox_affine'))
# Shoulders follow sleeve root at y~285 and overlap upper torso naturally.
ref_fits.append(fit_bbox_world('left_seated_shoulder_cap_underarm_bridge', x=(FX(112),FX(155)), y=bbox_y_from_side(118,230), z=(ZZ(330),ZZ(275)), label='left_shoulder_bridge_moved_to_sleeve_root'))
ref_fits.append(fit_bbox_world('right_seated_shoulder_cap_underarm_bridge', x=(FX(247),FX(290)), y=bbox_y_from_side(118,230), z=(ZZ(330),ZZ(275)), label='right_shoulder_bridge_moved_to_sleeve_root'))
# Limbs: individual handpicked bboxes preserve each original diagonal part by affine mapping.
PART_BBOXES={
 'left_upper_sleeve_continuous_to_white_cuff':((32,143),(280,423),bbox_y_from_side(128,218)),
 'right_upper_sleeve_continuous_to_white_cuff':((267,377),(280,423),bbox_y_from_side(128,218)),
 'left_white_cuff_band_at_wrist':((26,88),(396,448),bbox_y_from_side(132,214)),
 'right_white_cuff_band_at_wrist':((321,383),(396,448),bbox_y_from_side(132,214)),
 'left_simple_lowpoly_hand_mitten':((15,70),(430,485),bbox_y_from_side(136,210)),
 'right_simple_lowpoly_hand_mitten':((339,394),(430,485),bbox_y_from_side(136,210)),
 'left_upper_leg_tapered_thigh_to_knee':((113,186),(515,575),bbox_y_from_side(132,196)),
 'right_upper_leg_tapered_thigh_to_knee':((221,294),(515,575),bbox_y_from_side(132,196)),
 'left_lower_leg_tapered_knee_to_sock':((107,181),(565,610),bbox_y_from_side(140,190)),
 'right_lower_leg_tapered_knee_to_sock':((226,299),(565,610),bbox_y_from_side(140,190)),
 'left_white_sock_six_ring_column':((107,181),(590,650),bbox_y_from_side(145,186)),
 'right_white_sock_six_ring_column':((226,299),(590,650),bbox_y_from_side(145,186)),
 'left_rounded_reference_shoe':((90,183),(635,719),bbox_y_from_side(91,218)),
 'right_rounded_reference_shoe':((224,317),(635,719),bbox_y_from_side(91,218)),
}
for key,(xr,yr,yd) in PART_BBOXES.items():
    ref_fits.append(fit_bbox_world(key, x=(FX(xr[0]),FX(xr[1])), y=yd, z=(ZZ(yr[1]),ZZ(yr[0])), label='part_measured_bbox_positive_affine'))

# User correction: do NOT elongate toe. First reproduce the current factor-1.85 shoe positions,
# then shorten the total sole depth and move the entire shoe forward (negative Blender worldY).
# X/Z, materials, UVs, legs, heel relation to whole shoe topology are otherwise untouched.
def whole_shoe_shorter_and_forward(key, old_factor=1.85, depth_scale=0.68, forward_shift=-0.12):
    ob=require_mesh(key); inv=ob.matrix_world.inverted(); base_before=obj_world_bounds(ob)
    depth=max(1e-6, base_before['maxy']-base_before['miny'])
    ankle_y=base_before['miny'] + depth*0.55
    # Derive the immediately previous candidate geometry exactly: the old toe-only factor 1.85.
    for v in ob.data.vertices:
        p=ob.matrix_world@v.co
        if p.y < ankle_y:
            p.y = ankle_y + (p.y-ankle_y)*old_factor
            v.co=inv@p
    ob.data.update()
    current=obj_world_bounds(ob)
    center=(current['miny']+current['maxy'])*0.5
    changed=0; maxd=0
    for v in ob.data.vertices:
        p=ob.matrix_world@v.co; old=p.copy()
        p.y = center + (p.y-center)*depth_scale + forward_shift
        v.co=inv@p; changed+=1; maxd=max(maxd,(p-old).length)
    ob.data.update()
    after=obj_world_bounds(ob)
    return {
        'object':ob.name,
        'method':'whole_shoe_shorter_and_forward',
        'derived_from_prior_toe_factor':old_factor,
        'depth_scale_modeling_start':depth_scale,
        'forward_shift_negative_worldY_modeling_start':forward_shift,
        'ankle_plane_used_to_reproduce_prior_factor':ankle_y,
        'changed_vertices':changed,
        'max_world_delta_from_prior_factor_positions':maxd,
        'before_min_y':current['miny'],
        'before_max_y':current['maxy'],
        'before_length_y':current['maxy']-current['miny'],
        'before_center_y':center,
        'after_min_y':after['miny'],
        'after_max_y':after['maxy'],
        'after_length_y':after['maxy']-after['miny'],
        'after_center_y':(after['miny']+after['maxy'])*0.5,
        'length_ratio':(after['maxy']-after['miny'])/max(1e-6,current['maxy']-current['miny']),
        'center_shift_y':((after['miny']+after['maxy'])*0.5)-center
    }
for shoe_key in ['left_rounded_reference_shoe','right_rounded_reference_shoe']:
    # User follow-up: move the whole already-shortened shoe a LITTLE backward only.
    # Previous pass used -0.12 forward shift; -0.07 keeps X/Z/length identical and moves all shoe vertices +0.05 worldY.
    ref_fits.append(whole_shoe_shorter_and_forward(shoe_key, 1.85, 0.68, -0.07))

# User follow-up: from the opposite side, the positive-X side hair had a side gap / apparent see-through.
# Use the requested topology-safe algorithm: cut the fitted bob in WORLD space, keep the intact negative-X
# topology, duplicate that retained half, mirror the duplicate across the center plane, reverse mirrored face
# winding, weld the center seam, then close only genuine boundary loops from ordered boundary edges.  No old
# positive-side vertex pairing and no disconnected fill panel.
def repair_hair_by_world_bisect_mirror_topology(hair_ob):
    before = topo(hair_ob)
    mw=hair_ob.matrix_world.copy(); inv=mw.inverted()
    src_world=[mw@v.co for v in hair_ob.data.vertices]
    center_x=(min(p.x for p in src_world)+max(p.x for p in src_world))*0.5
    tol=0.001
    bm=bmesh.new(); bm.from_mesh(hair_ob.data); bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    # Work in world coordinates so the bisect plane and later reflection are exact in the same space as the reference fit.
    for v in bm.verts:
        v.co = mw @ v.co
    bm.normal_update()
    all_geom=list(bm.verts)+list(bm.edges)+list(bm.faces)
    bisect=bmesh.ops.bisect_plane(bm, geom=all_geom, plane_co=Vector((center_x,0,0)), plane_no=Vector((1,0,0)), clear_outer=True, clear_inner=False, dist=tol)
    bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    max_after=max(v.co.x for v in bm.verts) if bm.verts else 999
    direction_confirmed='plane_no_+X_clear_outer_retained_x_lte_center'
    if max_after > center_x + tol*4:
        # Defensive direction confirmation: Blender API clear_outer semantics should retain x<=center for +X normal.
        # If a future Blender build differs, redo with the opposite normal and record it.
        bm.free(); bm=bmesh.new(); bm.from_mesh(hair_ob.data); bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table()
        for v in bm.verts:
            v.co = mw @ v.co
        bm.normal_update(); all_geom=list(bm.verts)+list(bm.edges)+list(bm.faces)
        bisect=bmesh.ops.bisect_plane(bm, geom=all_geom, plane_co=Vector((center_x,0,0)), plane_no=Vector((-1,0,0)), clear_outer=True, clear_inner=False, dist=tol)
        bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table()
        direction_confirmed='plane_no_-X_clear_outer_fallback_retained_x_lte_center'
        if max(v.co.x for v in bm.verts) > center_x + tol*4:
            raise RuntimeError('hair bisect failed to retain negative world-X half')
    retained_verts=len(bm.verts); retained_faces=len(bm.faces)
    seam_verts=[v for v in bm.verts if abs(v.co.x-center_x)<=tol*8]
    seam_before=len(seam_verts)
    retained_geom=list(bm.verts)+list(bm.edges)+list(bm.faces)
    dup=bmesh.ops.duplicate(bm, geom=retained_geom)
    dup_verts=[g for g in dup['geom'] if isinstance(g,bmesh.types.BMVert)]
    dup_faces=[g for g in dup['geom'] if isinstance(g,bmesh.types.BMFace)]
    for v in dup_verts:
        v.co.x = 2*center_x - v.co.x
    if dup_faces:
        bmesh.ops.reverse_faces(bm, faces=dup_faces)
    bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table(); bm.normal_update()
    # Weld duplicate seam vertices back to original seam vertices so the mirrored halves share one center seam.
    originals=[v for v in bm.verts if v not in set(dup_verts) and abs(v.co.x-center_x)<=tol*8]
    targetmap={}
    for dv in dup_verts:
        if abs(dv.co.x-center_x)>tol*8:
            continue
        best=None; bestd=1e9
        for ov in originals:
            d=(dv.co-ov.co).length
            if d<bestd:
                best=ov; bestd=d
        if best is not None and bestd <= tol*16:
            targetmap[dv]=best
    if targetmap:
        bmesh.ops.weld_verts(bm, targetmap=targetmap)
    bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table(); bm.normal_update()
    # Close true boundary loops from ordered linked boundary edges.  Do not atan-sort across a non-planar opening.
    cap_faces=0; skipped_face_openings=0
    def ordered_boundary_loops(edges):
        unused=set(edges); loops=[]
        while unused:
            e=unused.pop(); loop=[e.verts[0], e.verts[1]]; cur=loop[-1]
            while True:
                nxt=None
                for cand in list(unused):
                    if cand.verts[0] is cur or cand.verts[1] is cur:
                        nxt=cand; break
                if nxt is None:
                    break
                unused.remove(nxt)
                nv=nxt.verts[1] if nxt.verts[0] is cur else nxt.verts[0]
                if nv is loop[0]:
                    break
                loop.append(nv); cur=nv
            if len(loop)>=3:
                loops.append(loop)
        return loops
    for loop in ordered_boundary_loops([e for e in bm.edges if e.is_boundary]):
        center=sum((v.co for v in loop), Vector())/len(loop)
        minz=min(v.co.z for v in loop); maxz=max(v.co.z for v in loop)
        # Keep hair face/bottom openings visible and avoid triangle-budget blowup; do not add fan caps here.
        skipped_face_openings+=1
        continue
    bm.normal_update()
    # Remove tiny bisect sliver edges/faces from the new mirrored seam if Blender split near-collinear polygons.
    bmesh.ops.dissolve_degenerate(bm, dist=tol*2, edges=list(bm.edges))
    bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table(); bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    # Return from world space to object local space.
    for v in bm.verts:
        v.co = inv @ v.co
    bm.normal_update(); bm.to_mesh(hair_ob.data); bm.free(); hair_ob.data.update(); recalc_outward(hair_ob)
    after=topo(hair_ob)
    return {'object':hair_ob.name,'method':'world_bisect_negative_half_duplicate_reflect_reverse_weld_no_pairing','before_topology':before,'after_topology':after,'center_plane_world_x':center_x,'bisect_direction_confirmed':direction_confirmed,'source_half':'world_x_lte_center_negative_side','retained_half_vertices':retained_verts,'retained_half_faces':retained_faces,'seam_vertices_before_mirror':seam_before,'welded_duplicate_seam_vertices':len(targetmap),'cap_triangles_added_to_existing_bob_only':cap_faces,'skipped_front_face_opening_loops':skipped_face_openings,'not_double_side_or_opacity_or_outline_mask':True,'no_disconnected_hair_panel':True,'old_positive_vertices_not_paired_or_reused':True}
ref_fits.append(repair_hair_by_world_bisect_mirror_topology(hair))

# Latest underside correction: replace the rejected 3-quad U lining with a real thin inner shell
# built from the already-fitted reference_bob mesh itself.  The existing outer vertices/faces remain
# byte-position preserved; only new inner-offset vertices, reversed inner faces, and boundary rim quads
# are appended to the same hair mesh.  This is geometry thickness, not DoubleSide/material/outline masking.
def add_inner_hair_shell_from_outer_mesh(hair_ob, thickness=0.026):
    before_topology=topo(hair_ob)
    mw=hair_ob.matrix_world.copy(); inv=mw.inverted()
    # Snapshot all original outer geometry before appending anything so outer coordinates are preserved.
    outer_vertices=[v.co.copy() for v in hair_ob.data.vertices]
    outer_world=[mw@co for co in outer_vertices]
    outer_faces=[tuple(p.vertices) for p in hair_ob.data.polygons]
    edge_face_counts={}
    for f in outer_faces:
        for i,a in enumerate(f):
            b=f[(i+1)%len(f)]
            k=tuple(sorted((a,b)))
            edge_face_counts[k]=edge_face_counts.get(k,0)+1
    boundary_edges=[k for k,c in edge_face_counts.items() if c==1]
    if not outer_faces or not boundary_edges:
        raise RuntimeError('hair inner shell requires existing outer faces and open boundary rims')
    # Per-vertex world normals from current fitted bob.  Offset inward (opposite outward normal).
    hair_ob.data.update()
    normal_world=[]
    for v in hair_ob.data.vertices:
        n=(mw.to_3x3() @ v.normal).normalized()
        if n.length < 1e-6:
            n=Vector((0,0,-1))
        normal_world.append(n)
    inner_world=[outer_world[i] - normal_world[i]*thickness for i in range(len(outer_world))]
    inner_local=[inv@p for p in inner_world]
    verts=[tuple(co) for co in outer_vertices] + [tuple(co) for co in inner_local]
    n0=len(outer_vertices)
    # Keep all outer faces exactly, then reversed inner faces so their normals point into the hollow hair.
    faces=[tuple(f) for f in outer_faces]
    for f in outer_faces:
        faces.append(tuple(n0+i for i in reversed(f)))
    # Boundary rim quads connect every open edge to its inward duplicate, giving real thickness without
    # capping across the face opening.  The face opening remains an opening, now with a visible pink edge/rim.
    for a,b in boundary_edges:
        faces.append((a,b,n0+b,n0+a))
    mesh=bpy.data.meshes.new(hair_ob.data.name+'_inner_shell_rebuilt')
    mesh.from_pydata(verts, [], faces); mesh.update()
    # Preserve material slots and polygon material indices for original faces; make all appended hair faces pink.
    old_materials=list(hair_ob.data.materials)
    old_poly_mats=[p.material_index for p in hair_ob.data.polygons]
    hair_ob.data=mesh
    for m in old_materials:
        if m:
            m.diffuse_color=(0.86,0.43,0.56,1.0)
            m.blend_method='OPAQUE'
            m.use_backface_culling=True
        hair_ob.data.materials.append(m)
    if not hair_ob.data.materials:
        hair_ob.data.materials.append(mat('hair_pink',(0.86,0.43,0.56,1)))
    for i,poly in enumerate(hair_ob.data.polygons):
        poly.use_smooth=False
        poly.material_index=old_poly_mats[i] if i < len(old_poly_mats) else 0
    hair_ob.data.update(calc_edges=True)
    recalc_outward(hair_ob)
    # Triangulate the shell/rims before export: Blender/glTF quad triangulation on a few non-planar rim quads
    # can otherwise emit triangle winding that opposes the stored quad normal.
    bm=bmesh.new(); bm.from_mesh(hair_ob.data); bm.faces.ensure_lookup_table()
    bmesh.ops.triangulate(bm, faces=list(bm.faces), quad_method='BEAUTY', ngon_method='BEAUTY')
    bm.normal_update(); bm.to_mesh(hair_ob.data); bm.free(); hair_ob.data.update(calc_edges=True)
    recalc_outward(hair_ob)
    # Force flat loop normals to each polygon normal so exported GLB normals agree with the actual shell/rim faces.
    hair_ob.data.update()
    try:
        loop_normals=[]
        for poly in hair_ob.data.polygons:
            for _ in poly.loop_indices:
                loop_normals.append(poly.normal.copy())
        hair_ob.data.normals_split_custom_set(loop_normals)
    except Exception as exc:
        print('WARN custom hair shell normals skipped', exc)
    # recalc_outward may update normals/winding only; verify it did not move the original outer vertices.
    after_topology=topo(hair_ob)
    # Structural evidence: outer vertex positions unchanged, inner offset positive, boundary rim count exact.
    max_outer_delta=max(((hair_ob.data.vertices[i].co-outer_vertices[i]).length for i in range(n0)), default=0.0)
    offset_lengths=[(outer_world[i]-inner_world[i]).length for i in range(n0)]
    mats=[]
    for m in hair_ob.data.materials:
        if not m: continue
        mats.append({'name':m.name,'diffuse_color':tuple(m.diffuse_color),'blend_method':m.blend_method,'use_backface_culling':m.use_backface_culling})
    return {
        'object':hair_ob.name,
        'method':'outer_reference_bob_appended_solidify_style_inner_shell_reversed_faces_connected_boundary_rims',
        'before_topology':before_topology,
        'after_topology':after_topology,
        'outer_vertices_preserved':n0,
        'outer_faces_preserved':len(outer_faces),
        'inner_vertices_added':n0,
        'inner_faces_added':len(outer_faces),
        'boundary_rim_quads_added':len(boundary_edges),
        'triangles_added':sum((len(f)-2) for f in outer_faces) + len(boundary_edges)*2,
        'thickness_world':thickness,
        'max_outer_coordinate_delta_after_append':max_outer_delta,
        'offset_length_minmax':[min(offset_lengths),max(offset_lengths)],
        'face_opening_not_capped':True,
        'boundary_rims_connect_existing_openings_including_bangs_and_nape':True,
        'no_double_side_or_black_material_or_outline':True,
        'material_summary':mats,
    }
ref_fits.append(add_inner_hair_shell_from_outer_mesh(hair))

# User t_efe49b7c lower-face cleanup: do not edit the packed raster and do not move any jaw/cheek
# vertices. The dirty jagged bands are on sloped under-cheek / under-jaw triangles whose UV islands
# sit on the bottom atlas rows. Keep the original faceSkin image/UVs for the eyes and mouth, and assign
# only the downward-facing lower-front jaw triangles to a clean solid skin material.
def assign_lower_jaw_clean_skin_material(ob):
    # Sampled from actual clean skin below the mouth on the packed face atlas, then used as Blender's
    # linear material color. The previous bottom-row sample was too pale/cool in front renders.
    skin_sample_srgb=(0.969063, 0.850448, 0.777294)
    skin_rgba=tuple(c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4 for c in skin_sample_srgb)+(1.0,)
    m=bpy.data.materials.new('faceSkin_under_jaw_clean_solid')
    m.diffuse_color=skin_rgba
    m.use_nodes=True
    m.blend_method='OPAQUE'
    m.use_backface_culling=True
    bsdf=m.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value=skin_rgba
        bsdf.inputs['Alpha'].default_value=1.0
        if 'Roughness' in bsdf.inputs:
            bsdf.inputs['Roughness'].default_value=1.0
    mat_index=len(ob.data.materials)
    ob.data.materials.append(m)
    uv_layer=ob.data.uv_layers.active
    changed=[]
    restored_by_uv=[]
    for p in ob.data.polygons:
        cs=[ob.data.vertices[i].co for i in p.vertices]
        cx=sum(v.x for v in cs)/len(cs); cy=sum(v.y for v in cs)/len(cs); cz=sum(v.z for v in cs)/len(cs)
        luv=[tuple(uv_layer.data[i].uv) for i in p.loop_indices] if uv_layer else []
        max_v=max((v for _,v in luv), default=1.0)
        min_v=min((v for _,v in luv), default=1.0)
        max_u=max((u for u,_ in luv), default=1.0)
        min_u=min((u for u,_ in luv), default=0.0)
        # Scope is UV-first, not broad centroid-Z: only the atlas bottom under-jaw strip is flattened.
        # Mouth/smile and cheek polygons begin above the 0.153 atlas seam and must keep the original
        # faceSkin material/UV/image mapping from before_lower_face_cleanup.
        is_under_jaw_bottom_strip = (
            max_v <= 0.1536
            and p.normal.z < -0.12
            and cy < -0.28
            and min_u >= 0.16
            and max_u <= 0.84
        )
        if is_under_jaw_bottom_strip:
            p.material_index=mat_index
            changed.append({'poly':p.index,'center_local':[cx,cy,cz],'normal_local':list(p.normal),'uv_minmax':[[min_u,max_u],[min_v,max_v]]})
        elif max_v > 0.1536 and cy < -0.295 and cz < 0.55:
            restored_by_uv.append({'poly':p.index,'center_local':[cx,cy,cz],'normal_local':list(p.normal),'uv_minmax':[[min_u,max_u],[min_v,max_v]],'material_index_kept':p.material_index})
    return {
        'object':ob.name,
        'method':'uv_range_limited_under_jaw_material_reassignment_only_no_raster_no_vertex_no_uv_edit',
        'material':m.name,
        'skin_rgba_linear':skin_rgba,
        'skin_sample_source':'packed face atlas clean skin below mouth center, uv box u=0.42..0.58 v=0.18..0.26 average',
        'selected_polygons':changed,
        'selected_polygon_count':len(changed),
        'restored_mouth_cheek_polygons_kept_original_faceSkin_by_uv_range':restored_by_uv,
        'restored_polygon_count':len(restored_by_uv),
        'preserves_eye_mouth_texture_by_uv_range':True,
        'geometry_vertices_preserved':True,
        'uv_loop_bytes_preserved':True,
    }
ref_fits.append(assign_lower_jaw_clean_skin_material(head))
# Accessories after base mapping.
ACCESSORY_BBOXES={
 'yellow_tie_knot':((182,220),(282,312),bbox_y_from_side(228,238)),
 'yellow_tie_long_drop':((186,216),(306,403),bbox_y_from_side(230,240)),
 'white_collar_left_triangle':((144,200),(270,305),bbox_y_from_side(226,238)),
 'white_collar_right_triangle':((202,258),(270,305),bbox_y_from_side(226,238)),
 'left_fitted_continuous_backpack_strap':((130,163),(270,400),bbox_y_from_side(226,242)),
 'right_fitted_continuous_backpack_strap':((247,280),(270,400),bbox_y_from_side(226,242)),
 'rounded_square_blue_backpack_body':((128,274),(300,430),bbox_y_from_side(55,125)),
 'blue_backpack_top_flap':((145,258),(285,335),bbox_y_from_side(55,125)),
 'small_gold_backpack_clasp':((187,216),(390,420),bbox_y_from_side(50,110)),
}
for key,(xr,yr,yd) in ACCESSORY_BBOXES.items():
    ref_fits.append(fit_bbox_world(key, x=(FX(xr[0]),FX(xr[1])), y=yd, z=(ZZ(yr[1]),ZZ(yr[0])), label='accessory_after_base_bbox_affine'))
# Optional rings/buttons were removed in this candidate; all listed required names throw if missing.

# Verify approved facial texture/UV and true lower face/head local rings are preserved; allow crown XYZ above .78 to change.
uv_after=[tuple(d.uv) for d in head.data.uv_layers.active.data]
lower_after={v.index:tuple(v.co) for v in head.data.vertices if v.co.z<=0.7805}
# Advisor/user latest: protect face PNG bytes and UVs, but do NOT lock source XYZ because topology must fit art.
lower_face_exact=False
uv_exact=(uv_before==uv_after)
def ref_plane_packed(o):
    if o.type=='EMPTY': return bool(getattr(getattr(o,'data',None),'packed_file',None))
    if o.type=='MESH':
        for m in o.data.materials:
            if not m or not m.use_nodes: continue
            for n in m.node_tree.nodes:
                if getattr(n,'bl_idname','')=='ShaderNodeTexImage' and getattr(n,'image',None) and n.image.packed_file:
                    return True
    return False
refs=[{'name':o.name,'type':o.type,'locked':o.hide_select,'packed':ref_plane_packed(o),'has_uv': bool(o.type!='MESH' or o.data.uv_layers)} for o in bpy.data.objects if o.name.startswith('LOCKED_original') or o.name.startswith('LOCKED_ref_')]
# Select export objects: meshes and rig empties, exclude locked original refs from GLB.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.name.startswith('LOCKED_'):
        continue
    if o.type=='MESH' or (o.type=='EMPTY'):
        o.select_set(True)
tri_total=sum(tris(o) for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('LOCKED_'))
# User explicitly prioritizes real underside hair thickness over the old <=1000 triangle target.
assert tri_total < 2000, tri_total
assert uv_exact
assert len(refs)>=2 and all(r['locked'] and r['packed'] and r.get('has_uv',True) for r in refs)
# Save + export + reopen verification.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
bpy.ops.export_scene.gltf(filepath=str(OUT_GLB),export_format='GLB',use_selection=True,export_texcoords=True,export_normals=True,export_image_format='AUTO',export_animations=False,export_current_frame=True,export_extras=True)
post={'output_blend_sha256':sha(OUT_BLEND),'output_glb_sha256':sha(OUT_GLB),'tri_total':tri_total,'removed_new_candidate_only':removed,'new_meshes':[torso.name]+[b.name for b in bridges],'torso_topology':topo(torso),'bridge_topology':{b.name:topo(b) for b in bridges},'head_topology':topo(head),'hair_topology':topo(hair),'head_compression':head_comp,'hair_compression':hair_comp,'head_hair_intersections_after':intersections,'reference_registration':REF_REG,'pixel_landmark_world_table':LM,'reference_topology_fits':ref_fits,'reference_pose_assumption':'front art arm splay is neutral pose; side art supplies thickness/depth and not contradictory arm drop','lower_face_localZ_lte_0_78_positions_preserved':lower_face_exact,'head_uv_preserved':uv_exact,'references_packed_locked':refs,'rigging_done':False,'skinned_mesh_count':0,'actions_count':len(bpy.data.actions),'art_approval':False,'full_task_approved':False}
report={'task':'t_efe49b7c','operation':'archive-only simple closed torso + seated shoulder cap bridge + head-localZ monotonic cranial dome ring edit','pre':pre,'post':post}
(QA_DIR/'blender_rebuild_report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('WHOLEBODY_REBUILD',json.dumps({'glb':str(OUT_GLB),'sha256':post['output_glb_sha256'],'tri_total':tri_total,'removed_tris':sum(x['tris'] for x in removed),'new_meshes':post['new_meshes']},ensure_ascii=False))
bpy.ops.wm.open_mainfile(filepath=str(OUT_BLEND))
reopened_refs=[o for o in bpy.data.objects if o.name.startswith('LOCKED_ref_') and o.hide_select]
assert len(reopened_refs)>=2 and all(ref_plane_packed(o) and bool(o.data.uv_layers) for o in reopened_refs)
print('WHOLEBODY_BLEND_REOPEN_OK')

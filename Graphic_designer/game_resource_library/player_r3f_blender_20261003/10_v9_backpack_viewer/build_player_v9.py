"""Reference-measured PLAYER blockout / final asset. Blender 5.2, Z-up, -Y front."""
import bpy
import bmesh
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REF = ROOT / 'character_sheets' / 'PLAYER_front_side_back_face_v1.png'
MODE = 'final' if '--final' in sys.argv else 'blockout'
OUT = HERE / MODE
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for old in list(bpy.data.collections):
    if old.name != 'Collection' and old.users == 0:
        bpy.data.collections.remove(old)

parts = []
def material(name, color):
    mat = bpy.data.materials.new(name)
    def to_linear(channel):
        value=int(channel,16)/255
        return value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4
    rgba = tuple(to_linear(color[i:i+2]) for i in (1,3,5)) + (1,)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = 1
    return mat

gray = material('GATE2_SINGLE_GRAY_MATERIAL', '#a8a8a8')
palette = {key: material(key, color) for key, color in {
    'pink_hair': '#ee80aa', 'face_skin': '#fff1df', 'hand_skin': '#ffebd4',
    'jacket_red': '#dc4655', 'shirt_white': '#fff8ed', 'skirt_blue': '#26558b',
    'pack_blue': '#235389', 'socks_white': '#f7e8e6', 'shoes_blue': '#809aba',
    'shoe_sole_blue': '#6e89a9',
}.items()}

def finish(obj, group, mat_name):
    # Every closed component needs consistently outward faces for GLB back-face culling.
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    obj['part_group'] = group
    obj['source_view'] = 'FRONT_SIDE_BACK_FACE'
    obj['source_sheet'] = str(REF)
    obj.data.materials.clear()
    obj.data.materials.append(gray if MODE == 'blockout' else palette[mat_name])
    for poly in obj.data.polygons:
        poly.use_smooth = False
    parts.append(obj)
    return obj

def rounded_box(name, loc, dims, bevel, group, mat_name, bevel_segments=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = ob.modifiers.new('designed corner bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = bevel_segments
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod = ob.modifiers.new('weighted planes', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(ob, group, mat_name)

def prism(name, xy_top, xy_bottom, z_top, z_bottom, group, mat_name):
    n = len(xy_top)
    verts = [(x,y,z_top) for x,y in xy_top] + [(x,y,z_bottom) for x,y in xy_bottom]
    faces = [tuple(range(n-1,-1,-1)), tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name+'_mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    return finish(ob, group, mat_name)

def polybox(name, xz_front, yfront, yback, group, mat_name):
    n = len(xz_front)
    verts = [(x,yfront,z) for x,z in xz_front] + [(x,yback,z) for x,z in xz_front]
    faces = [tuple(range(n-1,-1,-1)), tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name+'_mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(ob)
    return finish(ob,group,mat_name)

def loft(name, sections, group, mat_name):
    n=len(sections[0])
    verts=[point for ring in sections for point in ring]
    faces=[tuple(range(n-1,-1,-1))]
    for row in range(len(sections)-1):
        for i in range(n):
            a=row*n+i; b=row*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
    faces.append(tuple((len(sections)-1)*n+i for i in range(n)))
    mesh=bpy.data.meshes.new(name+'_mesh')
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(ob)
    return finish(ob,group,mat_name)

def crown_ring(z,w,depth,front_extra=0):
    # Wide nearly flat top, diagonal shoulders, broad front/back planes.
    front=-depth+.055-front_extra; back=depth*.90-.030
    return [(-w*.55,front,z),(w*.55,front,z),(w,front+.14,z),
      (w,back-.15,z),(w*.65,back,z),(-w*.65,back,z),
      (-w,back-.15,z),(-w,front+.14,z)]

def bob_u_ring(z, scale=1):
    # Three adjoining large hair volumes wrap the skull; the front edge stays
    # behind the face profile in the SIDE source instead of hiding its eye.
    outline=[(-.50,-.10),(-.63,-.16),(-.72,-.23),(-.74,.34),
      (-.66,.515),(-.47,.585),(.47,.585),(.66,.515),(.74,.34),
      (.72,-.23),(.63,-.16),(.50,-.10),(.47,.08),(.56,.20),
      (.57,.26),(.49,.375),(-.49,.375),(-.57,.26),(-.56,.20),(-.47,.08)]
    # A broad bevel across the hem gives the side and rear locks a layered
    # lower silhouette without per-strand spikes or surface-noise geometry.
    hem=[.025,.0,-.013,-.01,.018,.033,.033,.018,-.01,-.013,0,.025,
         .025,0,-.01,.018,.018,-.01,0,.025] if z < 2 else [0]*20
    return [(x*scale,y*(.90 if y>0 else 1),z+hem[i])
            for i,(x,y) in enumerate(outline)]

def bob_sector(ring, sector):
    if sector == 'back':
        # One watertight rear mesh, shaped as five broad tapered locks. The
        # skull/crown underneath remains continuous; this is no stripe decal.
        outer_a,outer_b=ring[5],ring[6]
        inner_b,inner_a=ring[15],ring[16]
        ts=(0,.025,.175,.2,.225,.375,.4,.425,.575,.6,
            .625,.775,.8,.825,.975,1)
        seam={.2,.4,.6,.8}
        bottom=ring[5][2] < 2
        def across(a,b,t,outer):
            cut=(.065 if t in seam else 0) if bottom else 0
            panel=min(4,int(t*5))
            lower_shift=(-.014,.018,-.020,.014,-.006)[panel] if bottom else 0
            # Five broad rear planes turn from the upper bob toward the hem.
            # Relief is shallow so the crown remains one connected mass.
            phase=(t*5)%1
            ridge=math.sin(math.pi*phase)
            depth_weight=max(.25,min(1,(2.68-ring[5][2])/.55))
            plane=-.034*ridge*depth_weight if outer else 0
            return (a[0]*(1-t)+b[0]*t,
                    a[1]*(1-t)+b[1]*t+plane,
                    a[2]*(1-t)+b[2]*t+cut+lower_shift)
        return [across(outer_a,outer_b,t,True) for t in ts] + [
            across(inner_b,inner_a,t,False) for t in ts]
    picks={
      'L':[0,1,2,3,4,5,16,17,18,19],
      'R':[6,7,8,9,10,11,12,13,14,15],
    }[sector]
    return [ring[i] for i in picks]

def sleeve(name, shoulder, elbow, wrist, group):
    # One closed mesh with an elbow ring supports later arm swing/bending.
    rings=[]
    cuff_top=tuple(wrist[i]*.77+elbow[i]*.23 for i in range(3))
    for pt,hw,hd in [(shoulder,.14,.175),
                     (elbow,.16,.16),(cuff_top,.16,.14),(wrist,.16,.13)]:
        x,y,z=pt
        rings.append([(x-hw,y-hd,z),(x+hw,y-hd,z),
                      (x+hw,y+hd,z),(x-hw,y+hd,z)])
    return loft(name,rings,group,'jacket_red')

def segment(name, a, b, width, depth, bevel, group, mat_name):
    mid = (Vector(a)+Vector(b))/2
    length = (Vector(b)-Vector(a)).length
    ob = rounded_box(name, mid, (width,depth,length), bevel, group, mat_name)
    ob.rotation_euler = (Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler()
    return ob

def sneaker(name, x, group):
    # Extra toe bevel and raised instep are visible in both front and side.
    bottom=[(-.16,-.50),(.16,-.50),(.215,-.46),(.23,-.40),(.23,.045),
            (.18,.10),(-.18,.10),(-.23,.045),(-.23,-.40),(-.215,-.46)]
    mid=[(-.16,-.50),(.16,-.50),(.205,-.46),(.22,-.40),(.22,.04),
         (.17,.09),(-.17,.09),(-.22,.04),(-.22,-.40),(-.205,-.46)]
    upper=[(-.145,-.435),(.145,-.435),(.185,-.41),(.20,-.36),(.20,.035),
           (.16,.08),(-.16,.08),(-.20,.035),(-.20,-.36),(-.185,-.41)]
    top=[(-.11,-.36),(.11,-.36),(.15,-.345),(.17,-.31),(.17,.025),
         (.135,.065),(-.135,.065),(-.17,.025),(-.17,-.31),(-.15,-.345)]
    rings=[[(x+dx,y,z) for dx,y in outline] for outline,z in
           [(bottom,.06),(mid,.14),(upper,.235),(top,.32)]]
    return loft(name,rings,group,'shoes_blue')

# High-resolution original landmarks: character H ~722 px -> 3.10 units.
# Hair ~339 px wide, ~294 px deep; fringe at y~234; chin y~345.
face_shell=rounded_box('Head_skin_broad_short_chin', (0,-.17,2.385),
                       (.86,.83,.81), .255, 'head', 'face_skin',6)
# Keep the broad, short SD chin while the cheeks curve enough for one eye to
# remain readable at 90 degrees. The lower jaw is flatter than a sphere.
for vertex in face_shell.data.vertices:
    lower=max(0,min(1,(-vertex.co.z-.14)/.26))
    vertex.co.x *= 1+.34*lower
    if vertex.co.y < 0:
        vertex.co.y -= .10*lower
face_shell.data.update()
for polygon in face_shell.data.polygons:
    polygon.use_smooth=True
# Crown follows skull volume; broad fringe panels lie in front of its surface.
loft('Hair_crown_flat_round_skull',[crown_ring(3.105,.325,.395),
     crown_ring(3.07,.44,.47),crown_ring(2.96,.56,.55),
     crown_ring(2.68,.65,.605),crown_ring(2.54,.65,.605)],'head','pink_hair')
for sector,name in [('L','Hair_bob_side_L'),('back','Hair_bob_back'),('R','Hair_bob_side_R')]:
    loft(name,[bob_sector(bob_u_ring(2.68,.87),sector),
         bob_sector(bob_u_ring(2.35,.96),sector),
         bob_sector(bob_u_ring(2.02,.90),sector),
         bob_sector(bob_u_ring(1.91,.86),sector)],'head','pink_hair')
# Three broad locks grow from the skull; each has an individual taper, bend,
# and near-horizontal beveled end like the front turnaround.
fringe_profiles=[
    [(-.40,-.15,3.035,-.55),(-.46,-.155,2.78,-.63),
     (-.455,-.165,2.49,-.675),(-.445,-.17,2.47,-.66)],
    [(-.15,.15,3.045,-.555),(-.17,.17,2.79,-.64),
     (-.175,.17,2.485,-.685),(-.165,.165,2.445,-.67)],
    [(.15,.40,3.03,-.55),(.155,.46,2.765,-.63),
     (.165,.455,2.485,-.675),(.17,.445,2.465,-.66)],
]
for idx,profile in enumerate(fringe_profiles):
    rings=[]
    for row,(left,right,z,front) in enumerate(profile):
        left_z=z+(.014 if row==3 and idx==0 else 0)
        right_z=z+(.012 if row==3 and idx==2 else 0)
        rings.append([(left,front+.05,left_z),
                      (left+.023,front+.025,left_z),
                      (right-.023,front+.025,right_z),
                      (right,front+.05,right_z),
                      (right,front+.18,right_z),
                      (left,front+.18,left_z)])
    loft('Fringe_0'+str(idx+1),rings,'head','pink_hair')
for ob in parts:
    if ob['part_group']=='head':
        ob.location.y -= .08

# Torso and limbs deliberately remain separate closed volumes for later pivots.
rounded_box('Torso_short_school_jacket',(0,-.19,1.575),(.89,.70,.75),.085,'torso','jacket_red')
rounded_box('Neck_short',(0,-.045,1.91),(.25,.26,.12),.04,'torso','face_skin')
for sign,label in [(-1,'L'),(1,'R')]:
    shoulder=(sign*.34,-.18,1.885)
    elbow=(sign*.48,-.18,1.50)
    wrist=(sign*.66,-.20,1.22)
    sleeve('Arm_'+label+'_continuous_sleeve',shoulder,elbow,wrist,'arm_'+label)
    segment('Hand_'+label,(sign*.66,-.20,1.235),(sign*.72,-.20,1.09),.18,.22,.025,'arm_'+label,'hand_skin')

# Straight A-line blue school skirt. Eight broad planes; no star-shaped hem.
top=[(-.34,-.48),(.34,-.48),(.40,-.38),(.40,.22),(.34,.28),(-.34,.28),(-.40,.22),(-.40,-.38)]
bot=[(-.46,-.59),(.46,-.59),(.54,-.48),(.54,.25),(.46,.31),(-.46,.31),(-.54,.25),(-.54,-.48)]
prism('Skirt_simple_closed_A_line',top,bot,1.345,.855,'hips','skirt_blue')
parts[-1].location.y -= .085
for sign,label in [(-1,'L'),(1,'R')]:
    x=sign*.275
    rounded_box('Leg_'+label+'_thigh',(x,-.085,.725),(.27,.26,.31),.045,'leg_'+label,'face_skin')
    rounded_box('Leg_'+label+'_sock',(x,-.092,.405),(.265,.265,.34),.025,'leg_'+label,'socks_white')
    # Long from front-to-back in side projection, wide and flat in front.
    sneaker('Shoe_'+label,x,'leg_'+label)

# Square school backpack, set behind torso and below hair. V9 makes it
# deliberately readable from the back/side as a real boxy school bag, not an
# oval lump: tall main block, raised lid band, lower pocket, and side rails.
rounded_box('Backpack_main_rectangular',(0,.245,1.54),(.76,.40,.82),.075,'pack','pack_blue')
rounded_box('Backpack_top_lid_band',(0,.475,1.80),(.68,.055,.18),.025,'pack','pack_blue')
rounded_box('Backpack_front_pocket',(0,.487,1.36),(.58,.060,.285),.026,'pack','pack_blue')
for sign,label in [(-1,'L'),(1,'R')]:
    rounded_box('Backpack_side_rail_'+label,(sign*.415,.445,1.54),(.055,.070,.64),.020,'pack','pack_blue')

# Source image is available directly in Blender orthographic viewports.
# Image empties are viewport-only and excluded from GLB export.
for key,loc,rotation,width in [
    ('FRONT',(0,.99,1.55),(math.pi/2,0,0),1.78),
    ('SIDE',(-.99,0,1.55),(math.pi/2,0,math.pi/2),1.40),
    ('BACK',(0,-.99,1.55),(math.pi/2,0,math.pi),1.66),
]:
    img_path=HERE / f'PLAYER_reference_{key.lower()}.png'
    if img_path.exists():
        image=bpy.data.images.load(str(img_path),check_existing=True)
        empty=bpy.data.objects.new('REF_'+key+'_ORTHO_original_sheet_crop',None)
        bpy.context.collection.objects.link(empty)
        empty.empty_display_type='IMAGE'
        empty.data=image
        empty.empty_display_size=width
        empty.location=loc
        empty.rotation_euler=rotation
        empty.hide_render=True
        empty['pixel_reference']='original user image crop; 722 px = 3.10 scene units'

# Correct Blender Z-up cameras. No image rotation in post-processing.
def camera(name, position, target=(0,0,1.56)):
    datablock=bpy.data.cameras.new(name)
    ob=bpy.data.objects.new(name,datablock)
    bpy.context.collection.objects.link(ob)
    ob.location=position
    direction=Vector(target)-ob.location
    ob.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    ob.data.type='ORTHO'
    ob.data.ortho_scale=3.6
    return ob

cameras={
 'front':camera('QA_Front_Orthographic',(0,-7,1.56)),
 'side':camera('QA_Side_Orthographic',(-7,0,1.56)),
 'back':camera('QA_Back_Orthographic',(0,7,1.56)),
 'threequarter':camera('QA_ThreeQuarter_Orthographic',(5,-6,3.4)),
}
if MODE == 'final':
    # Texture and additional surface work are layered after accepted gray form.
    exec((HERE / 'finish_player_v9.py').read_text(encoding='utf-8'))

# The SIDE turnaround places clothing and feet slightly ahead of the hair's
# depth center. Keep every clothing decal attached to its corresponding mass.
for ob in parts:
    if ob['part_group'] != 'head':
        ob.location.y -= .04
for ob in bpy.data.objects:
    if ob.name.startswith('Decal_') and not ob.name.startswith(
            ('Decal_source_eye','Decal_source_smile')):
        ob.location.y -= .04

# Real shoulder/hip pivots. Their parent-child hierarchy survives GLB export,
# allowing arm swings and walking without squeezing disconnected body blocks.
def pivot(name,position,parent=None):
    ob=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(ob)
    ob.location=position
    ob.empty_display_type='SPHERE'
    ob.empty_display_size=.035
    ob['animation_axis_blender']='X for front/back swing'
    if parent:
        bpy.context.view_layer.update()
        world=ob.matrix_world.copy()
        ob.parent=parent
        ob.matrix_world=world
    return ob

groups={}
groups['body']=pivot('grp_body',(0,0,0))
groups['head']=pivot('grp_head',(0,-.045,1.91),groups['body'])
groups['pack']=pivot('grp_pack',(0,.13,1.875),groups['body'])
groups['hips']=pivot('grp_hips',(0,-.12,1.345),groups['body'])
groups['skirt']=pivot('grp_skirt',(0,-.12,1.345),groups['hips'])
for sign,label in [(-1,'L'),(1,'R')]:
    groups['arm'+label]=pivot('grp_arm'+label,
        (sign*.34,-.22,1.885),groups['body'])
    groups['leg'+label]=pivot('grp_leg'+label,
        (sign*.275,-.125,.86),groups['hips'])

def group_for(name):
    if name.startswith(('Hair_','Head_','Fringe_','Decal_source_eye',
                        'Decal_source_smile','Decal_source_profile_eye')):
        return groups['head']
    for label in ('L','R'):
        if name.startswith(('Arm_'+label,'Hand_'+label)):
            return groups['arm'+label]
        if name.startswith(('Leg_'+label,'Shoe_'+label,
                            'Shoe_sole_'+label,'Shoe_tongue_'+label)):
            return groups['leg'+label]
    if name.startswith(('Backpack_','Decal_backpack_')):
        return groups['pack']
    if name.startswith(('Skirt_','Decal_skirt_')):
        return groups['skirt']
    return groups['body']

bpy.context.view_layer.update()
for ob in parts + [item for item in bpy.data.objects if item.name.startswith('Decal_')]:
    world=ob.matrix_world.copy()
    ob.parent=group_for(ob.name)
    ob.matrix_world=world
bpy.context.view_layer.update()

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE' if MODE == 'final' else 'BLENDER_WORKBENCH'
if MODE == 'final':
    scene.eevee.taa_render_samples=16
    scene.render.film_transparent=True
    bpy.ops.object.light_add(type='AREA',location=(0,-4,6))
    bpy.context.object.data.energy=100
    bpy.context.object.data.shape='DISK'
    bpy.context.object.data.size=5
    bpy.ops.object.light_add(type='AREA',location=(0,4,5))
    bpy.context.object.data.energy=120
    bpy.context.object.data.size=6
    bpy.ops.object.light_add(type='AREA',location=(-4,0,4))
    bpy.context.object.data.energy=70
    bpy.context.object.data.size=5
    scene.world.use_nodes=True
    background=scene.world.node_tree.nodes.get('Background')
    background.inputs['Color'].default_value=(.65,.65,.65,1)
    background.inputs['Strength'].default_value=1.0
else:
    scene.display.shading.color_type='MATERIAL'
    scene.display.shading.light='STUDIO'
    scene.display.shading.show_cavity=False
    scene.display.shading.show_shadows=False
    scene.render.film_transparent=True
scene.render.resolution_x=800
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'

renders={}
if '--no-render' not in sys.argv:
    for key,cam in cameras.items():
        scene.camera=cam
        file=OUT/f'PLAYER_v9_{MODE}_{key}.png'
        scene.render.filepath=str(file)
        bpy.ops.render.render(write_still=True)
        renders[key]=str(file)
else:
    renders['skipped']='--no-render requested for export-only build'

if '--quick' in sys.argv:
    print('PLAYER_V9_QUICK_4_VIEW_PREVIEW_ONLY')
    sys.exit(0)

if MODE == 'final' and '--no-render' not in sys.argv:
    scene.render.resolution_x=512
    scene.render.resolution_y=512
    for degrees in range(0,360,45):
        theta=math.radians(degrees)
        cam=camera(f'QA_Turn_{degrees:03d}',
                   (7*math.sin(theta),-7*math.cos(theta),1.75))
        scene.camera=cam
        file=OUT/f'PLAYER_v9_turn_{degrees:03d}.png'
        scene.render.filepath=str(file)
        bpy.ops.render.render(write_still=True)
        renders[f'turn_{degrees:03d}']=str(file)
    # Demonstrate actual shoulder/hip pivots, then restore the authored rest pose.
    scene.camera=cameras['threequarter']
    pose_specs={
        'walk':{'armL':.35,'armR':-.35,'legL':-.4,'legR':.4},
        'right_arm_swing':{'armR':-1.55,'legL':.2,'legR':-.2},
    }
    for pose_name,angles in pose_specs.items():
        for group_name,angle in angles.items():
            groups[group_name].rotation_euler.x=angle
        bpy.context.view_layer.update()
        file=OUT/f'PLAYER_v9_pose_{pose_name}.png'
        scene.render.filepath=str(file)
        bpy.ops.render.render(write_still=True)
        renders[f'pose_{pose_name}']=str(file)
        for group_name in angles:
            groups[group_name].rotation_euler.x=0
    bpy.context.view_layer.update()

if MODE == 'blockout':
    assert all(len(p.data.materials)==1 and p.data.materials[0]==gray for p in parts)

triangles=sum(sum(len(poly.vertices)-2 for poly in ob.data.polygons) for ob in parts)
nonmanifold={}
negative_volume={}
for ob in parts:
    bm=bmesh.new()
    bm.from_mesh(ob.data)
    broken=[e for e in bm.edges if not e.is_manifold]
    if broken:
        nonmanifold[ob.name]=len(broken)
    volume=bm.calc_volume(signed=True)
    if volume < -1e-8:
        negative_volume[ob.name]=volume
    bm.free()
assert triangles <= 3000 if MODE == 'blockout' else True
assert not nonmanifold, nonmanifold
assert not negative_volume, negative_volume

# Save source with camera and viewport references; export selected production meshes only.
scene.camera=cameras['front']
blend=OUT/f'PLAYER_v9_{MODE}.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:
    ob.select_set(True)
for ob in groups.values():
    ob.select_set(True)
if MODE == 'final':
    for ob in bpy.data.objects:
        if ob.name.startswith('Decal_'):
            ob.select_set(True)
glb=OUT/f'PLAYER_v9_{MODE}.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True)
qa={
    'mode':MODE,'source':str(REF),'reference_landmarks_px':{
        'height':722,'hair_width':339,'hair_depth_side':294,'hair_bottom_y':365,
        'fringe_bottom_y':234,'face_chin_y':345,'skirt_width':247,'skirt_bottom_y':606},
    'triangle_count_structural':triangles,'mesh_parts':len(parts),
    'triangle_count_export_total':triangles+sum(
        sum(len(p.vertices)-2 for p in ob.data.polygons)
        for ob in bpy.data.objects if ob.name.startswith('Decal_')),
    'nonmanifold_edges_by_object':nonmanifold,
    'negative_signed_volume_by_object':negative_volume,
    'reference_images_inside_blend':['FRONT','SIDE','BACK'],
    'view_up_axis':'Blender +Z; renders not rotated in post-processing',
    'renders':renders,'blend':str(blend),'glb':str(glb),
    'blend_size_bytes':blend.stat().st_size,'glb_size_bytes':glb.stat().st_size,
    'runtime_integration':'not connected; PlayerMesh.jsx untouched',
}
(OUT/f'PLAYER_v9_{MODE}_qa.json').write_text(json.dumps(qa,indent=2,ensure_ascii=False),encoding='utf-8')
print('PLAYER_V9_QA='+json.dumps(qa,ensure_ascii=False))


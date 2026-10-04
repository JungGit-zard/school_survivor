"""Gate 4: original-face details and restrained clothing decals after gray form."""
from mathutils import Vector

SURFACE=HERE/'surface'

def texture_mat(name,filename):
    image=bpy.data.images.load(str(SURFACE/filename),check_existing=True)
    image.pack()
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value=1
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=image
    tex.interpolation='Linear'
    mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    mat.node_tree.links.new(tex.outputs['Alpha'],bsdf.inputs['Alpha'])
    try:
        mat.surface_render_method='DITHERED'
    except AttributeError:
        pass
    return mat

def decal(name, coords, texname):
    mesh=bpy.data.meshes.new(name+'_mesh')
    mesh.from_pydata(coords,[],[(0,1,2,3)])
    mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for loop_index,coord in zip(poly.loop_indices,[(0,0),(1,0),(1,1),(0,1)]):
            uv.data[loop_index].uv=coord
    ob=bpy.data.objects.new('Decal_'+name,mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(texture_mat('Surface_'+name,texname))
    ob['texture_role']='interior_surface_only_no_silhouette_outline'
    return ob

def front_quad(name,center_x,center_z,width,height,front_y,texname):
    x0=center_x-width/2; x1=center_x+width/2
    z0=center_z-height/2; z1=center_z+height/2
    return decal(name,[(x0,front_y,z0),(x1,front_y,z0),
                       (x1,front_y,z1),(x0,front_y,z1)],texname)

# Facial marks are drawn on the face mesh itself. The face's bevel carries
# each outer eye toward the profile with no separate card to protrude.
face=next(ob for ob in parts if ob.name=='Head_skin_broad_short_chin')
face.data.materials.clear()
face.data.materials.append(texture_mat('Face_source_surface_uv',
                                        'PLAYER_v8_face_surface_uv.png'))
face.data.materials.append(material('Face_skin_plain','#fce5d5'))
while face.data.uv_layers:
    face.data.uv_layers.remove(face.data.uv_layers[0])
uv=face.data.uv_layers.new(name='UVMap')
for polygon in face.data.polygons:
    polygon.material_index=0 if polygon.normal.y < -.15 else 1
    for loop_index in polygon.loop_indices:
        vertex=face.data.vertices[face.data.loops[loop_index].vertex_index].co
        uv.data[loop_index].uv=((vertex.x+.43)/.86,(vertex.z+.405)/.81)
face['texture_role']='face_mesh_uv_no_separate_eye_geometry'

# The jacket, collar, tie and buttons all share one transparent front surface.
front_quad('source_uniform_front',0,1.575,.84,.72,-.552,'PLAYER_v8_torso_front.png')

# Pleats are color bands, not silhouette teeth; front and rear panels follow skirt slope.
decal('skirt_front_pleats',[(-.46,-.683,.858),(.46,-.683,.858),
     (.34,-.571,1.343),(-.34,-.571,1.343)],'PLAYER_v8_skirt_pleats.png')
decal('skirt_back_pleats',[(.46,.265,.858),(-.46,.265,.858),
     (-.34,.236,1.343),(.34,.236,1.343)],'PLAYER_v8_skirt_pleats.png')
decal('backpack_flap',[(-.335,.397,1.215),(.335,.397,1.215),
     (.335,.397,1.915),(-.335,.397,1.915)],'PLAYER_v8_pack_back.png')

# Large physical backpack straps wrap over shoulders; these affect 3/4 reading.
for sign,label in [(-1,'L'),(1,'R')]:
    strap_x=sign*.32
    rounded_box('Backpack_strap_front_'+label,(strap_x,-.555,1.69),
                (.115,.055,.43),.024,'pack','pack_blue')
    segment('Backpack_strap_shoulder_'+label,
            (strap_x,.18,1.88),(strap_x,-.53,1.855),
            .115,.08,.023,'pack','pack_blue')
    shoe_x=sign*.275
    rounded_box('Shoe_tongue_'+label,(shoe_x,-.20,.335),
                (.23,.18,.085),.025,'leg_'+label,'shoes_blue')
    sole_outline=[(-.16,-.505),(.16,-.505),(.215,-.465),(.235,-.405),
                  (.235,.045),(.18,.105),(-.18,.105),(-.235,.045),
                  (-.235,-.405),(-.215,-.465)]
    loft('Shoe_sole_'+label,[[(shoe_x+dx,y,.015) for dx,y in sole_outline],
         [(shoe_x+dx,y,.065) for dx,y in sole_outline]],
         'leg_'+label,'shoe_sole_blue')

# A white cuff is a single flat surface band at each sleeve tip.
for ob in parts:
    if '_continuous_sleeve' in ob.name:
        ob.data.materials.append(palette['shirt_white'])
        # Loft with four rings: cap, 4+4+4 side quads, cap.
        for polygon in ob.data.polygons[9:13]:
            polygon.material_index=1


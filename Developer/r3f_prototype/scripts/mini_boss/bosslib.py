# Boss remodel preview library (Blender 5.2 headless). 2026-11-21, threemini. PREVIEW ONLY - not game code.
# Reads our baked Kenney Mini GLB (staging copy) as data, rebuilds rigid 6-part bodies in three.js space
# (Y up, +Z front) under a root rotated +90deg X, so all coordinates below are the same numbers the game uses.
import bpy, json, struct, math, os
import numpy as np
from mathutils import Vector, Matrix, Euler

# Uncompressed (no meshopt) copy of the 2026-11-15 Mini bake: this parser reads plain float buffers only.
# Re-create it with scripts/build_kenney_mini_zombies.mjs --raw <path>. Override with env MINI_BOSS_GLB / MINI_BOSS_OUT.
GLB = os.environ.get('MINI_BOSS_GLB', r'F:\ezs-work\backup\mini_zombies_stage_20261115\build\mini_zombies_uncompressed.glb')
OUT = os.environ.get('MINI_BOSS_OUT', r'F:\ezs-work\backup\boss_remodel_20261121')
WORK = os.path.join(OUT, 'work')

# --- palette (port of lib/miniZombieRoster.js; new boss slots appended at the end like the real bake would) ---
SLOTS = [
    ('eye', 0x44444d), ('mouth', 0x44444d),
    ('zGreen', 0x8ab060), ('zOlive', 0x7e9a5c), ('zPale', 0x9bb26a), ('zMoss', 0x85a85a), ('zShadow', 0x5a4a7a), ('mochiWhite', 0xf6f0e8),
    ('eyeRed', 0xff2020), ('eyeViolet', 0xb98cff), ('eyeOrange', 0xff6a2a), ('eyeCream', 0xffe3a0), ('eyeDark', 0x2a2418), ('eyeAmber', 0xffb02a), ('eyeGreen', 0x7cf27c),
    ('shirtGreen', 0x2f7d3a), ('armRed', 0xd62828), ('shadowCloth', 0x2a1f3d), ('shadowBlack', 0x1a1a1f), ('workBlue', 0x3d6fa8),
    ('capYellow', 0xe8c34a), ('jerseyOrange', 0xe07a1f), ('gymBlue', 0x2d5fd0), ('chefWhite', 0xf0eee6), ('lidGrey', 0x8a8a92),
    ('lidDark', 0x4a4a52), ('apronBrown', 0x6b4226), ('coffeeDark', 0x3b2314), ('teamBlue', 0x1f5fbf), ('teamRed', 0xc8102e),
    ('bagMustard', 0xd9a03a), ('bagBrown', 0x6a4a2a), ('bookBlue', 0x2c6fb7), ('pagesWhite', 0xf2efe2), ('conductorNavy', 0x23315e),
    ('conductorGold', 0xf2c94c), ('bibWhite', 0xf4f1e8), ('silver', 0xc8ccd4), ('mochiPink', 0xf7d6e2), ('mochiRose', 0xe8a0b4),
    ('suitCharcoal', 0x3a3f4a), ('copierGrey', 0xd8d8d8), ('officeGrey', 0x6d6d78), ('chairBlack', 0x1e1e24), ('white', 0xf2f2f2),
    ('mopHead', 0xdcdcd2), ('woodBrown', 0x9a6a3a), ('ballOrange', 0xc8641e), ('ballLine', 0x3a2010), ('teeth', 0xfffef5),
    ('giantBallRed', 0xd83a3a), ('giantBallWhite', 0xf6f6f0),
    # --- proposed boss slots (would be appended in the real bake; 88 capacity) ---
    ('bossSkin', 0x9dbf8a), ('vestNavy', 0x4b5d7a), ('shirtWhite', 0xedebe4), ('slackGrey', 0x3a3f45), ('stampRed', 0xd7263d),
    ('stampWood', 0x7a4e2d), ('ledgerBlue', 0x2f4f7f), ('hairDark', 0x3b3a38), ('glassBlack', 0x101010), ('bellGold', 0xe2b84a),
    ('suitPrincipal', 0x4b4f5a), ('tieRed', 0xb23a3a), ('medalGold', 0xe6ba62), ('micGrey', 0x9aa0a6), ('micBlack', 0x2b2b2b),
    ('hairWhite', 0xe6e6e6), ('podiumWood', 0x8a5a32), ('ribbonRed', 0xd23a3a), ('flagBlue', 0x2f5fa8), ('lanyardBlue', 0x2f4f7f),
    ('eyeWarn', 0xff7a1a), ('shoeBrown', 0x4a2f1e),
]
SLOT_INDEX = {n: i for i, (n, _) in enumerate(SLOTS)}
# Option A ships WITHOUT a GLB rebake: its colours are mapped onto the 52 slots already baked into
# mini_zombies_kenney.glb. Option B (archived) keeps the new slots and would need a rebake.
USE_EXISTING = False
SUBST = {'bossSkin': 'zPale', 'vestNavy': 'conductorNavy', 'shirtWhite': 'white', 'slackGrey': 'suitCharcoal', 'stampRed': 'armRed',
         'stampWood': 'woodBrown', 'ledgerBlue': 'bookBlue', 'hairDark': 'shadowBlack', 'glassBlack': 'shadowBlack', 'bellGold': 'conductorGold',
         'suitPrincipal': 'suitCharcoal', 'tieRed': 'teamRed', 'medalGold': 'conductorGold', 'micGrey': 'silver', 'micBlack': 'chairBlack',
         'hairWhite': 'white', 'ribbonRed': 'armRed', 'lanyardBlue': 'workBlue', 'shoeBrown': 'apronBrown'}


def resolve(name):
    return SUBST.get(name, name) if USE_EXISTING else name
SIZE, CW, CH, SW = 512, 32, 128, 8


def slot_rect(i):
    if i < 64:
        return (i * SW, 0, SW, CH)
    return (320 + (i - 64) * SW, CH, SW, CH)


def rect_of(key):
    key = resolve(key) if key else key
    if key in SLOT_INDEX:
        return slot_rect(SLOT_INDEX[key])
    if key and key.startswith('r') and 'c' in key:
        r, c = key[1:].split('c')
        return (int(c) * CW, int(r) * CH, CW, CH)
    return None


def key_at(u, v):
    px = min(SIZE - 1e-3, max(0, u * SIZE)); py = min(SIZE - 1e-3, max(0, v * SIZE))
    if py < CH:
        i = int(px // SW)
        return SLOTS[i][0] if i < len(SLOTS) else None
    if py < CH * 2 and px >= 320:
        i = 64 + int((px - 320) // SW)
        return SLOTS[i][0] if i < len(SLOTS) else None
    return 'r%dc%d' % (int(py // CH), int(px // CW))


def remap_uv(u, v, to):
    fr = rect_of(key_at(u, v)); tr = rect_of(to)
    if not fr or not tr:
        return None
    fx = (u * SIZE - fr[0]) / fr[2]; fy = (v * SIZE - fr[1]) / fr[3]
    fx = min(.999, max(.001, fx)); fy = min(.999, max(.001, fy))
    return ((tr[0] + fx * tr[2]) / SIZE, (tr[1] + fy * tr[3]) / SIZE)


def slot_uv(name):
    x, y, w, h = slot_rect(SLOT_INDEX[resolve(name)])
    return ((x + w / 2) / SIZE, (y + h * .5) / SIZE)


# --- data load -----------------------------------------------------------------------------------------------
_DATA = {}


def load_baked():
    if _DATA:
        return _DATA
    b = open(GLB, 'rb').read()
    l = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + l])
    off = 20 + l
    blen = struct.unpack('<I', b[off:off + 4])[0]
    binb = b[off + 8:off + 8 + blen]
    bv = j['bufferViews'][1]
    raw = np.frombuffer(binb, dtype=np.uint8, count=bv['byteLength'], offset=bv['byteOffset']).reshape(-1, 24)
    pos = raw[:, 0:12].copy().view(np.float32).reshape(-1, 3)
    uv = raw[:, 12:20].copy().view(np.float32).reshape(-1, 2)
    part = raw[:, 20].copy()
    iv = j['bufferViews'][2]
    idx = np.frombuffer(binb, dtype=np.uint16, count=j['accessors'][3]['count'], offset=iv['byteOffset']).reshape(-1, 3)
    pv = j['bufferViews'][0]
    png = binb[pv['byteOffset']:pv['byteOffset'] + pv['byteLength']]
    parts = j['nodes'][0]['extras']['mini']['parts']
    _DATA.update(pos=pos, uv=uv, part=part, idx=idx, png=png, parts={p['name']: p for p in parts})
    return _DATA


def build_atlas():
    """Write the baked atlas + paint the proposed boss slots (like the bake does with sharp)."""
    d = load_baked()
    os.makedirs(WORK, exist_ok=True)
    src = os.path.join(WORK, 'atlas_src.png')
    open(src, 'wb').write(d['png'])
    img = bpy.data.images.load(src)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)  # bottom-up rows
    for name, col in SLOTS[SLOT_INDEX['bossSkin']:]:
        x, y, sw, sh = slot_rect(SLOT_INDEX[name])
        r, g, bb = ((col >> 16) & 255) / 255, ((col >> 8) & 255) / 255, (col & 255) / 255
        # sRGB image pixels in Blender are stored as-is (display), fine for a colour atlas
        px[h - (y + sh):h - y, x:x + sw, :] = (r, g, bb, 1)
    img.pixels[:] = px.ravel()
    path = os.path.join(WORK, 'atlas_boss.png')
    img.filepath_raw = path; img.file_format = 'PNG'; img.save()
    bpy.data.images.remove(img)
    out = bpy.data.images.load(path)
    out.name = 'atlas_boss'
    return out


# --- materials -------------------------------------------------------------------------------------------------
_MAT = {}


def toon_nodes(mat, color_socket_builder):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    diff = nt.nodes.new('ShaderNodeBsdfDiffuse')
    s2r = nt.nodes.new('ShaderNodeShaderToRGB')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = (0.50, 0.50, 0.56, 1)
    els[1].position = 0.18; els[1].color = (0.74, 0.74, 0.78, 1)
    e = els.new(0.45); e.color = (1, 1, 1, 1)
    e = els.new(0.85); e.color = (1.12, 1.12, 1.1, 1)
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(diff.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs[0], ramp.inputs[0])
    col = color_socket_builder(nt)
    nt.links.new(col, mul.inputs[6])
    nt.links.new(ramp.outputs[0], mul.inputs[7])
    nt.links.new(mul.outputs[2], em.inputs[0])
    nt.links.new(em.outputs[0], out.inputs[0])


def atlas_mat(img):
    if 'atlas' in _MAT:
        return _MAT['atlas']
    m = bpy.data.materials.new('mini_atlas_toon')

    def build(nt):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Closest'
        return t.outputs[0]
    toon_nodes(m, build)
    _MAT['atlas'] = m
    return m


def flat_mat(hexcol, name=None):
    key = 'c%06x' % hexcol
    if key in _MAT:
        return _MAT[key]
    m = bpy.data.materials.new(name or key)
    r, g, b = ((hexcol >> 16) & 255) / 255, ((hexcol >> 8) & 255) / 255, (hexcol & 255) / 255

    def build(nt):
        rgb = nt.nodes.new('ShaderNodeRGB')
        # convert display sRGB to linear for the node
        lin = [c / 12.92 if c <= 0.04045 else ((c + .055) / 1.055) ** 2.4 for c in (r, g, b)]
        rgb.outputs[0].default_value = (*lin, 1)
        return rgb.outputs[0]
    toon_nodes(m, build)
    _MAT[key] = m
    return m


def outline_mat():
    if 'outline' in _MAT:
        return _MAT['outline']
    m = bpy.data.materials.new('outline')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (0.0015, 0.0006, 0.0028, 1)
    nt.links.new(em.outputs[0], out.inputs[0])
    m.use_backface_culling = True
    try:
        m.use_backface_culling_shadow = True
    except Exception:
        pass
    _MAT['outline'] = m
    return m


def add_outline(obj, thickness):
    obj.data.materials.append(outline_mat())
    mod = obj.modifiers.new('outline', 'SOLIDIFY')
    mod.thickness = thickness
    mod.offset = 1.0
    mod.use_flip_normals = True
    mod.use_rim = False
    mod.material_offset = len(obj.data.materials) - 1
    mod.use_even_offset = False


# --- object helpers ----------------------------------------------------------------------------------------------
def three_euler(r):
    e = Euler((r[0], r[1], r[2]), 'XYZ')
    # three.js 'XYZ' == Blender 'ZYX'
    return e


def new_empty(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    o = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    o.rotation_mode = 'ZYX'
    o.location = loc
    o.rotation_euler = (rot[0], rot[1], rot[2])
    o.scale = (scale, scale, scale) if not isinstance(scale, (tuple, list)) else scale
    return o


def mesh_obj(name, verts, faces, uvs=None, mat=None, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), outline=0.0):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    if uvs is not None:
        layer = me.uv_layers.new(name='UV')
        loop_v = np.zeros(len(me.loops), dtype=np.int64)
        me.loops.foreach_get('vertex_index', loop_v)
        uvarr = np.asarray(uvs, dtype=np.float32)[loop_v]
        uvarr[:, 1] = 1.0 - uvarr[:, 1]
        layer.data.foreach_set('uv', uvarr.ravel())
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(me); bm.free()
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    o.rotation_mode = 'ZYX'
    o.location = loc
    o.rotation_euler = rot
    if mat:
        me.materials.append(mat)
    if outline > 0:
        add_outline(o, outline)
    return o


_BOX = None


def box_obj(name, size, pos, rot=(0, 0, 0), color=0xffffff, parent=None, outline=0.03, bevel=0.0, slot=None, img=None):
    sx, sy, sz = [s / 2 for s in size]
    v = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz), (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 5), (0, 4, 7, 3)]
    if slot is not None:
        uv = [slot_uv(slot)] * 8
        o = mesh_obj(name, v, f, uv, atlas_mat(img), parent, pos, rot)
        o['slot'] = resolve(slot)
    else:
        o = mesh_obj(name, v, f, None, flat_mat(color), parent, pos, rot)
    if bevel > 0:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 1; b.limit_method = 'NONE'
    if outline > 0:
        add_outline(o, outline)
    return o


def prim_obj(name, shape, size, pos, rot=(0, 0, 0), color=0xffffff, parent=None, outline=0.03, slot=None, img=None):
    """three-style unit primitives scaled by size: cylinder r.5 h1 (8 seg), orb r.5 (8x6), cone r.5 h1 (4 seg), ring torus .40/.075."""
    import bmesh
    bm = bmesh.new()
    if shape == 'cylinder':
        bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=.5, radius2=.5, depth=1)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(-90), 3, 'X'))
    elif shape == 'cone':
        bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=.5, radius2=0, depth=1)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(-90), 3, 'X'))
    elif shape == 'orb':
        bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=.5)
    elif shape == 'ring':
        # torus R .40 r .075, 12 x 4, in XY plane like three TorusGeometry
        verts = []
        for i in range(12):
            a = i / 12 * 2 * math.pi
            for k in range(4):
                b = k / 4 * 2 * math.pi
                verts.append(bm.verts.new(((.40 + .075 * math.cos(b)) * math.cos(a), (.40 + .075 * math.cos(b)) * math.sin(a), .075 * math.sin(b))))
        for i in range(12):
            for k in range(4):
                a0 = i * 4 + k; a1 = ((i + 1) % 12) * 4 + k; b0 = i * 4 + (k + 1) % 4; b1 = ((i + 1) % 12) * 4 + (k + 1) % 4
                bm.faces.new((verts[a0], verts[a1], verts[b1], verts[b0]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for vv in me.vertices:
        vv.co = Vector((vv.co.x * size[0], vv.co.y * size[1], vv.co.z * size[2]))
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent; o.rotation_mode = 'ZYX'; o.location = pos; o.rotation_euler = rot
    if slot is not None:
        layer = me.uv_layers.new(name='UV')
        u, v = slot_uv(slot)
        layer.data.foreach_set('uv', np.tile([u, 1 - v], len(me.loops)).astype(np.float32))
        me.materials.append(atlas_mat(img))
        o['slot'] = resolve(slot)
    else:
        me.materials.append(flat_mat(color))
    if outline > 0:
        add_outline(o, outline)
    return o


# --- Mini body builder ------------------------------------------------------------------------------------------
ARM_TILT = 1.2
OUTLINE_T = {'legL': .009, 'legR': .009, 'torso': .012, 'armL': .009, 'armR': .009, 'head': .013}


def part_geometry(name, recolor, fn=None):
    d = load_baked()
    p = d['parts'][name]
    pid = p['id']
    vmask = d['part'] == pid
    vids = np.nonzero(vmask)[0]
    remap = -np.ones(len(d['pos']), dtype=np.int64); remap[vids] = np.arange(len(vids))
    tri = d['idx'][np.all(vmask[d['idx']], axis=1)]
    verts = d['pos'][vids].astype(np.float64)
    uvs = d['uv'][vids].astype(np.float64).copy()
    tris_out = remap[tri]
    if fn:
        # per-TRIANGLE decision (split vertices, welded back by position later so loops keep their own UVs)
        T = tris_out
        verts = verts[T].reshape(-1, 3); uvs = uvs[T].reshape(-1, 2).copy()
        tris_out = np.arange(len(verts)).reshape(-1, 3)
        for t in range(len(tris_out)):
            a = t * 3
            k0 = key_at(uvs[a, 0], uvs[a, 1])
            cen = verts[a:a + 3].mean(axis=0)
            to = fn(k0, cen) or (recolor or {}).get(k0)
            if to:
                for i in range(a, a + 3):
                    r = remap_uv(uvs[i, 0], uvs[i, 1], to)
                    if r:
                        uvs[i] = r
        return p, verts, tris_out, uvs
    if recolor:
        for i in range(len(uvs)):
            k0 = key_at(uvs[i, 0], uvs[i, 1])
            to = (recolor or {}).get(k0)
            if to:
                r = remap_uv(uvs[i, 0], uvs[i, 1], to)
                if r:
                    uvs[i] = r
    return p, verts, tris_out, uvs


def mini_body(body, root, img, skin='zGreen', eye='eyeRed', recolor=None, pose=None, prefix='', outline_scale=1.0, hide_parts=()):
    """Builds a rigid Mini body under `root` (three space). pose = {part: (rx, ry, rz)} added on top of the rest pose
    (arms already lowered by ARM_TILT like the game). Returns dict part -> object (origin at joint pivot)."""
    d = load_baked()
    rec = dict(recolor or {})
    p0 = d['parts']['body__%s__torso' % body]
    if p0.get('skinCell'):
        rec.setdefault(p0['skinCell'], skin)
    rec.setdefault('eye', eye)
    pose = pose or {}
    objs = {}
    pivots = {}
    for key in ['torso', 'legL', 'legR', 'head', 'armL', 'armR']:
        p, verts, tris, uvs = part_geometry('body__%s__%s' % (body, key), rec)
        piv = np.array(p['pivot'])
        pivots[key] = piv
        local = verts - piv
        if key in ('armL', 'armR'):
            s = 1 if key == 'armL' else -1
            a = -s * ARM_TILT
            c, si = math.cos(a), math.sin(a)
            x, y = local[:, 0].copy(), local[:, 1].copy()
            local[:, 0] = c * x - si * y; local[:, 1] = si * x + c * y
        parent = objs['torso'] if p['parent'] == 'torso' else root
        ppiv = pivots['torso'] if p['parent'] == 'torso' else np.zeros(3)
        o = mesh_obj(prefix + body + '_' + key, local, tris, uvs, atlas_mat(img), parent, tuple(piv - ppiv), pose.get(key, (0, 0, 0)))
        if key in hide_parts:
            o.hide_render = True
        add_outline(o, OUTLINE_T[key] * outline_scale)
        objs[key] = o
    objs['_pivots'] = pivots
    return objs


def mini_prop(propname, parent, img, pos=(0, 0, 0), rot=(0, 0, 0), scale=1.0, recolor=None, outline=0.01):
    d = load_baked()
    p, verts, tris, uvs = part_geometry('prop__' + propname, recolor or {})
    o = mesh_obj('prop_' + propname, verts * scale, tris, uvs, atlas_mat(img), parent, pos, rot)
    add_outline(o, outline)
    return o


# --- SDF face stand-in: the game draws it with a shader plane; for the still preview we draw the same strokes as thin
# dark boxes / eye discs on a plane in front of the head (feature-only, no skin). -----------------------------------
def face_strokes(parent, center, width, style='tired', warn=False, z_off=0.004):
    cx, cy, cz = center
    eye_col = 0xff7a1a if warn else 0xfff2c6
    out = []
    if style == 'tired':  # B10: half-closed eyes, frown brows, drooping mouth
        for sx in (-1, 1):
            out.append(prim_obj('eye', 'orb', (width * .26, width * .07, .004), (cx + sx * width * .29, cy + width * .05, cz + z_off), color=eye_col, parent=parent, outline=0))
            out.append(prim_obj('pupil', 'orb', (width * .07, width * .05, .004), (cx + sx * width * .29, cy + width * .045, cz + z_off + .002), color=0x111111, parent=parent, outline=0))
            out.append(box_obj('brow', (width * .3, width * .035, .004), (cx + sx * width * .29, cy + width * .2, cz + z_off), (0, 0, -sx * .2), 0x14100d, parent, outline=0))
        for sx in (-1, 1):
            out.append(box_obj('mouth', (width * .22, width * .03, .004), (cx + sx * width * .1, cy - width * .3, cz + z_off), (0, 0, sx * .25), 0x14100d, parent, outline=0))
    elif style == 'stern':  # B05: round eyes behind glasses, flat stern mouth, raised brows (speech)
        for sx in (-1, 1):
            out.append(prim_obj('eye', 'orb', (width * .16, width * .12, .004), (cx + sx * width * .25, cy + width * .05, cz + z_off), color=eye_col, parent=parent, outline=0))
            out.append(prim_obj('pupil', 'orb', (width * .06, width * .06, .004), (cx + sx * width * .25, cy + width * .05, cz + z_off + .002), color=0x111111, parent=parent, outline=0))
            out.append(box_obj('brow', (width * .26, width * .035, .004), (cx + sx * width * .25, cy + width * .21, cz + z_off), (0, 0, sx * .12), 0x14100d, parent, outline=0))
        out.append(prim_obj('mouth', 'orb', (width * .26, width * .12, .004), (cx, cy - width * .28, cz + z_off), color=0x3a1010, parent=parent, outline=0))
    return out


# --- scene / render -------------------------------------------------------------------------------------------------
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MAT.clear()
    sc = bpy.context.scene
    try:
        sc.render.engine = 'BLENDER_EEVEE'
    except Exception:
        sc.render.engine = 'BLENDER_EEVEE_NEXT'
    try:
        sc.eevee.taa_render_samples = 8
    except Exception:
        pass
    sc.view_settings.view_transform = 'Standard'
    sc.render.film_transparent = False
    w = bpy.data.worlds.new('w'); sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = (0.62, 0.66, 0.58, 1)
    bg.inputs[1].default_value = 1.0
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; sun.angle = 0.2
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    return sc


def three_root(name, x=0.0, scale=1.0, yaw=0.0):
    """Root for three-space content. x = world placement (Blender X), yaw = rotation about up."""
    r = new_empty(name)
    r.rotation_mode = 'XYZ'
    r.rotation_euler = (math.radians(90), 0, yaw)
    r.location = (x, 0, 0)
    r.scale = (scale, scale, scale)
    return r


def ground(size=40, color=0xc9b48a):
    o = box_obj('ground', (size, .02, size), (0, -.011, 0), color=color, outline=0)
    r = new_empty('groundroot'); r.rotation_mode = 'XYZ'; r.rotation_euler = (math.radians(90), 0, 0)
    o.parent = r
    return o


def camera(target=(0, 0, 0.9), yaw_deg=-30, pitch_deg=12, ortho=2.6, dist=20, res=(900, 1000)):
    sc = bpy.context.scene
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = ortho
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
    yaw = math.radians(yaw_deg); pitch = math.radians(pitch_deg)
    # Blender front = -Y. Camera sits in front (-Y), rotated by yaw around Z, raised by pitch.
    dirv = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    co.location = Vector(target) + dirv * dist
    look = (Vector(target) - co.location).to_track_quat('-Z', 'Y')
    co.rotation_mode = 'QUATERNION'; co.rotation_quaternion = look
    sc.camera = co
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    return co


def render(path):
    sc = bpy.context.scene
    sc.render.filepath = path
    sc.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)


# ===================================================================================================================
# Extra helpers: per-part recolour, hand anchors, arm aiming, other-pack bodies, grounding.
# ===================================================================================================================
def local_verts(obj):
    n = len(obj.data.vertices)
    a = np.zeros(n * 3); obj.data.vertices.foreach_get('co', a)
    return a.reshape(-1, 3)


def arm_hand(obj):
    """(hand point, unit arm direction, length) in the arm's local frame (rest pose, after tilt)."""
    v = local_verts(obj)
    d = np.linalg.norm(v, axis=1)
    far = v[d >= d.max() * 0.8]
    dirv = far.mean(axis=0); dirv /= np.linalg.norm(dirv)
    proj = v @ dirv
    ln = proj.max()
    hand = v[proj >= ln * 0.7].mean(axis=0)
    return Vector(hand), Vector(dirv), ln


def euler_mat(r):
    return Euler((r[0], r[1], r[2]), 'ZYX').to_matrix()


def aim_arm(obj, target, base=(0, 0, 0), fixed_y=0.0):
    """Grid search (rx, rz) so the hand lands nearest `target` (in the arm's parent frame). Sets rotation, returns it."""
    hand, _, _ = arm_hand(obj)
    piv = Vector(obj.location)
    best = None
    for rx in np.linspace(-math.pi, math.pi, 73):
        for rz in np.linspace(-1.6, 1.6, 33):
            p = piv + euler_mat((rx, fixed_y, rz)) @ hand
            dd = (p - Vector(target)).length
            if best is None or dd < best[0]:
                best = (dd, rx, rz)
    obj.rotation_euler = (best[1], fixed_y, best[2])
    return best


def attach_along_arm(arm, name_builder):
    """Returns an empty at the hand, oriented so its local -Y runs along the arm (away from the shoulder)."""
    hand, dirv, _ = arm_hand(arm)
    e = new_empty(arm.name + '_hand', arm, tuple(hand))
    # rotate (0,-1,0) onto dirv
    q = Vector((0, -1, 0)).rotation_difference(dirv)
    e.rotation_mode = 'QUATERNION'; e.rotation_quaternion = q
    return e


def ground_root(root):
    bpy.context.view_layer.update()
    zmin = 1e9
    for o in [root] + list(root.children_recursive):
        if o.type == 'MESH' and not o.hide_render and not _is_prop(o):
            for c in o.bound_box:
                zmin = min(zmin, (o.matrix_world @ Vector(c)).z)
    root.location.z -= zmin
    bpy.context.view_layer.update()


PROP_WORDS = ('stamp', 'ledger', 'bell', 'mic', 'stand', 'flag', '_hand', 'sash', 'podium')


def _is_prop(o):
    while o is not None and o.parent is not None:
        if any(w in o.name for w in PROP_WORDS):
            return True
        o = o.parent
    return False


def height_of(root, body_only=True):
    bpy.context.view_layer.update()
    zs = []
    for o in [root] + list(root.children_recursive):
        if o.type == 'MESH' and not o.hide_render and not (body_only and _is_prop(o)):
            zs += [(o.matrix_world @ Vector(c)).z for c in o.bound_box]
    return max(zs) - min(zs)


def mini_body2(body, root, img, skin='zGreen', eye='eyeRed', recolor=None, part_recolor=None, pose=None, prefix='', outline_scale=1.0, skin_parts=None, part_scale=None, part_fn=None):
    """Like mini_body but with per-part recolour overrides and optional skin remap only on some parts."""
    d = load_baked()
    p0 = d['parts']['body__%s__torso' % body]
    pose = pose or {}
    objs = {}; pivots = {}
    for key in ['torso', 'legL', 'legR', 'head', 'armL', 'armR']:
        rec = dict(recolor or {})
        if p0.get('skinCell') and (skin_parts is None or key in skin_parts):
            rec.setdefault(p0['skinCell'], skin)
        rec.setdefault('eye', eye)
        rec.update((part_recolor or {}).get(key, {}))
        p, verts, tris, uvs = part_geometry('body__%s__%s' % (body, key), rec, (part_fn or {}).get(key))
        piv = np.array(p['pivot']); pivots[key] = piv
        local = verts - piv
        if key in ('armL', 'armR'):
            s = 1 if key == 'armL' else -1
            a = -s * ARM_TILT; c, si = math.cos(a), math.sin(a)
            x, y = local[:, 0].copy(), local[:, 1].copy()
            local[:, 0] = c * x - si * y; local[:, 1] = si * x + c * y
        ps = np.array((part_scale or {}).get(key, (1, 1, 1)), dtype=np.float64)
        local = local * ps
        parent = objs['torso'] if p['parent'] == 'torso' else root
        ppiv = pivots['torso'] if p['parent'] == 'torso' else np.zeros(3)
        rel = piv - ppiv
        if p['parent'] == 'torso':
            rel = rel * np.array((part_scale or {}).get('torso', (1, 1, 1)))
        o = mesh_obj(prefix + body + '_' + key, local, tris, uvs, atlas_mat(img), parent, tuple(rel), pose.get(key, (0, 0, 0)))
        o['bodypart'] = key
        add_outline(o, OUTLINE_T[key] * outline_scale)
        objs[key] = o
    objs['_pivots'] = pivots
    return objs


def part_bbox(obj):
    v = local_verts(obj)
    return v.min(axis=0), v.max(axis=0)


# --- other Kenney Mini-family pack body (graveyard etc.): node tree + per-face flat colours from its colormap --------
def _acc(j, binb, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dt = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}[a['componentType']]
    st = bv.get('byteStride'); off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    isz = np.dtype(dt).itemsize
    if st and st != n * isz:
        raw = np.frombuffer(binb, dtype=np.uint8, count=st * a['count'], offset=off).reshape(-1, st)[:, :n * isz]
        return raw.copy().view(dt).reshape(-1, n)
    return np.frombuffer(binb, dtype=dt, count=n * a['count'], offset=off).reshape(-1, n)


PACK_JOINT = {'leg-left': 'legL', 'leg-right': 'legR', 'torso': 'torso', 'arm-left': 'armL', 'arm-right': 'armR', 'head': 'head'}


def pack_body(path, root, colour_fn, pose=None, prefix='', outline=0.012, arm_tilt=ARM_TILT, part_scale=None):
    """colour_fn(part, cell, rgb_hex, face_centre) -> hex colour. Builds rigid parts (origin = joint)."""
    b = open(path, 'rb').read(); l = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + l]); off = 20 + l
    binb = b[off + 8:off + 8 + struct.unpack('<I', b[off:off + 4])[0]]
    imgp = os.path.join(os.path.dirname(path), j['images'][0]['uri'])
    im = bpy.data.images.load(imgp); W, H = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)
    pose = pose or {}
    objs = {}

    part_scale = part_scale or {}

    def build(ni, parent, pscale=(1, 1, 1)):
        n = j['nodes'][ni]
        key = PACK_JOINT.get(n.get('name'))
        t = [a * b for a, b in zip(n.get('translation', [0, 0, 0]), pscale)]
        o = None
        if 'mesh' in n and key:
            prim = j['meshes'][n['mesh']]['primitives'][0]
            pos = _acc(j, binb, prim['attributes']['POSITION']).astype(np.float64).copy()
            uv = _acc(j, binb, prim['attributes']['TEXCOORD_0'])
            idx = _acc(j, binb, prim['indices']).reshape(-1, 3)
            if key in ('armL', 'armR'):
                s = 1 if key == 'armL' else -1
                a = -s * arm_tilt; c, si = math.cos(a), math.sin(a)
                x, y = pos[:, 0].copy(), pos[:, 1].copy()
                pos[:, 0] = c * x - si * y; pos[:, 1] = si * x + c * y
            pos = pos * np.array(part_scale.get(key, (1, 1, 1)))
            cols = []
            for f in idx:
                u, v = uv[f].mean(axis=0)
                xx = min(W - 1, int(u * W)); yy = min(H - 1, int(v * H))
                cell = 'r%dc%d' % (yy * 4 // H, xx * 16 // W)
                rgb = px[H - 1 - yy, xx, :3]
                hx = (int(rgb[0] * 255) << 16) | (int(rgb[1] * 255) << 8) | int(rgb[2] * 255)
                cols.append(colour_fn(key, cell, hx, pos[f].mean(axis=0)))
            uniq = sorted(set(cols))
            o = mesh_obj(prefix + key, pos, idx, None, None, parent, tuple(t), pose.get(key, (0, 0, 0)))
            for cc in uniq:
                o.data.materials.append(flat_mat(cc))
            mi = np.array([uniq.index(c) for c in cols], dtype=np.int32)
            o.data.polygons.foreach_set('material_index', mi)
            for _ in uniq:
                o.data.materials.append(outline_mat())
            mod = o.modifiers.new('outline', 'SOLIDIFY'); mod.thickness = outline; mod.offset = 1.0
            mod.use_flip_normals = True; mod.use_rim = False; mod.material_offset = len(uniq)
            objs[key] = o
        else:
            o = new_empty(prefix + n.get('name', 'n'), parent, tuple(t))
        for c in n.get('children', []):
            build(c, o, part_scale.get(key, (1, 1, 1)) if key else (1, 1, 1))
    for ni in j['scenes'][0]['nodes']:
        build(ni, root)
    bpy.data.images.remove(im)
    return objs


def world_point(obj, local):
    bpy.context.view_layer.update()
    return obj.matrix_world @ Vector(local)


def world_rod(name, p0, p1, radius, parent, color=0x2b2b2b, slot=None, img=None, outline=0.012, segments=8):
    """Cylinder between two WORLD points, then parented to `parent` keeping its world transform."""
    import bmesh
    p0, p1 = Vector(p0), Vector(p1)
    ln = (p1 - p0).length
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=ln)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((p1 - p0).normalized())
    o.location = (p0 + p1) / 2
    if slot is not None:
        layer = me.uv_layers.new(name='UV'); u, v = slot_uv(slot)
        layer.data.foreach_set('uv', np.tile([u, 1 - v], len(me.loops)).astype(np.float32))
        me.materials.append(atlas_mat(img))
        o['slot'] = resolve(slot)
    else:
        me.materials.append(flat_mat(color))
    if outline > 0:
        add_outline(o, outline)
    bpy.context.view_layer.update()
    mw = o.matrix_world.copy()
    o.parent = parent
    o.matrix_world = mw
    return o


def world_ball(name, p, size, parent, color=0x9aa0a6, slot=None, img=None, outline=0.012):
    o = prim_obj(name, 'orb', size, (0, 0, 0), color=color, parent=None, outline=outline, slot=slot, img=img)
    o.rotation_mode = 'XYZ'; o.rotation_euler = (math.radians(90), 0, 0)
    o.location = Vector(p)
    bpy.context.view_layer.update()
    mw = o.matrix_world.copy(); o.parent = parent; o.matrix_world = mw
    return o


def world_box(name, p, size, parent, color=0, slot=None, img=None, outline=0.01, rot_z=0.0):
    o = box_obj(name, size, (0, 0, 0), color=color, parent=None, outline=outline, slot=slot, img=img)
    o.rotation_mode = 'XYZ'; o.rotation_euler = (math.radians(90), 0, rot_z)
    o.location = Vector(p)
    bpy.context.view_layer.update()
    mw = o.matrix_world.copy(); o.parent = parent; o.matrix_world = mw
    return o


def aim_arm_world(arm, target_world):
    """aim_arm with a WORLD target (converted into the arm parent's frame)."""
    bpy.context.view_layer.update()
    parent = arm.parent
    t = parent.matrix_world.inverted() @ Vector(target_world)
    return aim_arm(arm, t)


def hand_world(arm):
    hand, _, _ = arm_hand(arm)
    return world_point(arm, hand)


def eye_centres(body):
    """Kenney face eye pieces (palette slot 'eye') per side, relative to the head pivot: {-1: Vector, 1: Vector}, z = front."""
    d = load_baked()
    p = d['parts']['body__%s__head' % body]
    m = d['part'] == p['id']
    v = d['pos'][m]; uv = d['uv'][m]
    sel = np.array([key_at(a, b) == 'eye' for a, b in uv])
    ev = v[sel] - np.array(p['pivot'])
    out = {}
    for sx in (-1, 1):
        s = ev[np.sign(ev[:, 0]) == sx]
        out[sx] = Vector((s[:, 0].mean(), s[:, 1].mean(), s[:, 2].max()))
    return out

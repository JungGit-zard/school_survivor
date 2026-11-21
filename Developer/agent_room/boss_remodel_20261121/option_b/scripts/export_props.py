# Export option-A boss props (part-local triangles + palette slot) and pose angles for the game. Blender 5.2 headless.
#   blender -b --factory-startup --python export_props.py -- <out.json>
import sys, json, math
sys.path.insert(0, __import__('os').path.dirname(__file__))
import bpy
import bosslib as L
L.USE_EXISTING = True
import b10, b05
from mathutils import Vector
out_path = sys.argv[sys.argv.index('--') + 1]


def owner_part(o):
    p = o.parent
    while p is not None:
        if 'bodypart' in p:
            return p
        p = p.parent
    return None


def collect(root, only=None):
    bpy.context.view_layer.update()
    res = []
    for o in root.children_recursive:
        if o.type != 'MESH' or 'slot' not in o or 'bodypart' in o:
            continue
        if only and not only(o):
            continue
        part = owner_part(o)
        M = part.matrix_world.inverted() @ o.matrix_world
        me = o.data
        me.calc_loop_triangles()
        pos = [round(c, 5) for v in me.vertices for c in (M @ v.co)]
        idx = [i for t in me.loop_triangles for i in t.vertices]
        res.append({'part': part['bodypart'], 'name': o.name.split('.')[0], 'slot': o['slot'], 'position': pos, 'index': idx})
    return res


def angles(objs):
    return {k: [round(a, 4) for a in objs[k].rotation_euler] for k in ('armL', 'armR', 'torso')}


def eyes(body):
    ec = L.eye_centres(body)
    return {'L': [round(c, 5) for c in ec[1]], 'R': [round(c, 5) for c in ec[-1]]}


data = {}
img = None
# ---- B10 ----
for boss, mod, phases in (('B10', b10, ('normal', 'warn', 'ledger', 'stun')), ('B05', b05, ('normal', 'p1', 'p2', 'stun'))):
    entry = {'poses': {}}
    for ph in phases:
        L.reset_scene(); img = L.build_atlas()
        r = L.three_root('r')
        o = mod.option_a(r, img, ph)
        entry['poses'][ph] = angles(o)
        if ph == 'normal':
            entry['props'] = collect(r, lambda x: not any(w in x.name for w in ('bell', 'whistle')))
            head = o['head']
            v = L.local_verts(head)
            entry['headFrontZ'] = round(float(v[:, 2].max()), 5)
        if ph == 'stun':
            entry['stunProps'] = collect(r, lambda x: any(w in x.name for w in ('bell', 'whistle')))
    entry['eyes'] = eyes('male-a' if boss == 'B10' else 'male-d')
    data[boss] = entry
json.dump(data, open(out_path, 'w'), separators=(',', ':'))
print('EXPORTED', {k: (len(v['props']), len(v['stunProps'])) for k, v in data.items()})

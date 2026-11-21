# B05 교장 선생님 좀비 (Stage 6) - current expansion rig + two CC0 options. PREVIEW ONLY.
import math
import bosslib as L
from mathutils import Vector

PAL = dict(coat=0x2F5FA8, trim=0xF2C94C, skin=0x9CC79A, dark=0x24324A, light=0xFFF4D6)
BOSS_PROP = {'torso': (1.35, 1.25, 1.3), 'armL': (1.2, 1.2, 1.2), 'armR': (1.2, 1.2, 1.2), 'legL': (1.25, 1.35, 1.25), 'legR': (1.25, 1.35, 1.25)}


def _leaf(shape, name, size, pos, color, parent, rot=(0, 0, 0)):
    if shape == 'box':
        return L.box_obj(name, size, pos, rot, color, parent, outline=0.014, bevel=min(size) * 0.09)
    return L.prim_obj(name, shape, size, pos, rot, color, parent, outline=0.012)


def current(root, phase='normal'):
    """Port of lib/expansionVisuals.js makeRig('B05','stage6') + gear('B05') (origin/zombie_only)."""
    p = PAL; w = .71; arm = .52; leg = .51
    rig = L.new_empty('expansion-B05-rig', root)
    bodyRot = (-.17, 0, 0) if phase == 'charge' else (0, 0, 0)
    h = L.new_empty('head', rig, (0, .83, 0))
    _leaf('box', 'head-shell', (.53, .49, .46), (0, 0, 0), p['skin'], h)
    _leaf('box', 'eyeL', (.11, .095, .045), (-.13, .045, .242), 0xf9d184, h)
    _leaf('box', 'eyeR', (.11, .095, .045), (.13, .045, .242), 0xf9d184, h)
    _leaf('box', 'browL', (.16, .035, .055), (-.13, .12, .25), p['dark'], h, (0, 0, -.17))
    _leaf('box', 'browR', (.16, .035, .055), (.13, .12, .25), p['dark'], h, (0, 0, .16))
    _leaf('box', 'mouth', (.25, .075, .045), (.015, -.14, .247), p['dark'], h)
    _leaf('box', 'tooth', (.055, .065, .05), (-.06, -.14, .275), p['light'], h)
    b = L.new_empty('body', rig, (0, .27, 0), bodyRot)
    _leaf('box', 'coat', (w, .61, .42), (0, 0, 0), p['coat'], b)
    _leaf('box', 'collar', (w * .88, .085, .045), (0, .21, .235), p['trim'], b)
    _leaf('box', 'belt', (w * 1.03, .07, .44), (0, -.18, 0), p['dark'], b)
    _leaf('box', 'badge', (.095, .13, .04), (-w * .25, .05, .24), p['trim'], b)
    aL = L.new_empty('armL', rig, (-w * .5 - .12, .54, 0), (-.80, 0, -.10))
    _leaf('box', 'sleeveL', (.22, arm, .22), (0, -arm * .5, 0), p['coat'], aL)
    _leaf('box', 'handL', (.22, .19, .23), (0, -arm - .07, .01), p['skin'], aL)
    aR = L.new_empty('armR', rig, (w * .5 + .12, .54, 0), (-1.9, 0, .3))
    _leaf('box', 'sleeveR', (.22, .52, .22), (0, -.26, 0), p['coat'], aR)
    _leaf('box', 'handR', (.22, .19, .23), (0, -.59, .01), p['skin'], aR)
    for nm, sx in (('legL', -1), ('legR', 1)):
        lg = L.new_empty(nm, rig, (sx * .16, -.04, 0))
        _leaf('box', 'trouser', (.23, leg, .27), (0, -leg * .5, 0), p['dark'], lg)
        _leaf('box', 'shoe', (.27, .14, .37), (0, -leg - .045, .07), p['dark'], lg)
    g = L.new_empty('gear', rig)
    _leaf('box', 'gear-suit', (.80, .66, .46), (0, .27, 0), 0x4B4F5A, g)
    _leaf('box', 'gear-tie', (.08, .34, .03), (0, .30, .25), 0xB23A3A, g)
    _leaf('orb', 'gear-bald', (.50, .22, .44), (0, 1.06, 0), p['skin'], g)
    _leaf('box', 'gear-sidehairL', (.08, .16, .30), (-.27, .86, 0), 0xE6E6E6, g)
    _leaf('box', 'gear-sidehairR', (.08, .16, .30), (.27, .86, 0), 0xE6E6E6, g)
    _leaf('ring', 'gear-glassL', (.14, .14, .03), (-.13, .88, .25), 0x1C1C1C, g)
    _leaf('ring', 'gear-glassR', (.14, .14, .03), (.13, .88, .25), 0x1C1C1C, g)
    _leaf('cylinder', 'gear-mic', (.06, .30, .06), (.30, .70, .30), 0x2B2B2B, g)
    _leaf('orb', 'gear-mic-head', (.12, .12, .12), (.30, .88, .34), 0x9AA0A6, g)
    _leaf('orb', 'gear-medal', (.10, .10, .03), (-.20, .40, .25), 0xE6BA62, g)


def head_front(head):
    v = L.local_verts(head)
    return v[:, 2].max()


# ------------------------------------------------------------------------------------------------------------------
# Option A: Kenney Mini male-d (suit + red tie, already in our GLB). Hair cell -> skin = bald dome; white side hair,
# round glasses, hand mic, gold medal merged. Procedural SDF face (stern). Pose: mic at the mouth like now.
# ------------------------------------------------------------------------------------------------------------------
def option_a(root, img, phase='normal'):
    o = L.mini_body2('male-d', root, img, skin='bossSkin', eye='bossSkin',
                     recolor={'r3c7': 'suitPrincipal', 'r2c15': 'tieRed', 'mouth': 'bossSkin'},
                     part_recolor={'torso': {'r3c15': 'shirtWhite'}}, prefix='A_', part_scale=BOSS_PROP,
                     # hair cell split by height at bake time: crown -> skin (bald), sides/back -> white (= 대머리 + 옆머리)
                     part_fn={'head': lambda k, v: ('bossSkin' if v[1] > 0.6 or (v[2] > 0.1 and v[1] > 0.5) else 'hairWhite') if k == 'r2c1' else None})
    head, torso = o['head'], o['torso']
    fz = head_front(head)
    ec = L.eye_centres('male-d')
    for sx in (-1, 1):
        e = ec[sx]
        L.prim_obj('glass', 'ring', (.13, .13, .03), (e.x, e.y, fz + .012), color=0, parent=head, outline=0, slot='glassBlack', img=img)
    L.box_obj('glassBridge', (abs(ec[1].x - ec[-1].x) - .1, .012, .012), (0, ec[1].y + .005, fz + .012), color=0, parent=head, outline=0, slot='glassBlack', img=img)
    L.face_strokes(head, (0, ec[1].y - .01, fz + .004), abs(ec[1].x - ec[-1].x) * 1.75, 'stern', warn=phase in ('p1', 'p2'))
    lo, hi = L.part_bbox(torso)
    L.prim_obj('medal', 'orb', (.045, .045, .015), (-.06, lo[1] + (hi[1] - lo[1]) * .6, hi[2] + .006), color=0, parent=torso, outline=.004, slot='medalGold', img=img)
    L.box_obj('medalRibbon', (.02, .04, .006), (-.06, lo[1] + (hi[1] - lo[1]) * .75, hi[2] + .004), color=0, parent=torso, outline=0, slot='ribbonRed', img=img)
    _pose_a(o, img, phase)
    return o


def _mouth_world(head, fz):
    return L.world_point(head, (0, .075, fz + .02))


def _pose_a(o, img, phase):
    head, aR, aL = o['head'], o['armR'], o['armL']
    fz = head_front(head)
    mouth = _mouth_world(head, fz)
    tgt = mouth + Vector((-0.2, -0.06, -0.17))  # hand just under/in front of the mouth (world, Blender: -Y = front)
    if phase == 'p2':  # 교가 제창: mic arm stays, left arm conducts up high
        L.aim_arm_world(aR, tgt)
        aL.rotation_euler = (-2.6, 0, -0.6)
    elif phase == 'stun':  # 격노 전환 / 운동장 10바퀴 호루라기: both arms up
        aR.rotation_euler = (-2.9, 0, 0.5); aL.rotation_euler = (-2.9, 0, -0.5)
    else:
        L.aim_arm_world(aR, tgt)
        aL.rotation_euler = (0.35 if phase == 'normal' else -0.4, 0, 0)
    hw = L.hand_world(aR)
    if phase == 'stun':
        L.world_ball('whistle', hw + Vector((0, -0.02, 0.04)), (.05, .05, .05), aR, slot='micGrey', img=img, outline=.004)
        return
    m = _mouth_world(head, fz)
    tip = m + Vector((-0.06, -0.05, -0.02))
    L.world_rod('micHandle', hw - (m - hw).normalized() * 0.06, tip, 0.022 * _s(o), aR, slot='micBlack', img=img, outline=.006)
    L.world_ball('micHead', tip, (.05, .05, .05), aR, slot='micGrey', img=img, outline=.006)


def _s(o):
    """approx world scale of the body root (for world-space prop sizes)."""
    r = o['torso'].parent
    return r.scale[0]


# ------------------------------------------------------------------------------------------------------------------
# Option B: Kenney Mini male-b (natively bald + beard, used by E98 in Stage 4 with a chef recolour). Beard -> white,
# shirt -> grey suit, tie/shirt V merged, round glasses. Native Kenney face kept (red eyes). Assembly stand-mic held
# like a staff (tall silhouette), red-white assembly sash, gold medal. Kenney-face option.
# ------------------------------------------------------------------------------------------------------------------
def option_b(root, img, phase='normal'):
    o = L.mini_body2('male-b', root, img, skin='bossSkin', eye='eyeRed',
                     recolor={'r2c15': 'suitPrincipal'},
                     part_recolor={'head': {'r2c1': 'silver', 'r2c3': 'silver'}, 'torso': {'r2c1': 'micBlack'},
                                   'legL': {'r1c1': 'slackGrey', 'r2c1': 'shoeBrown', 'r2c5': 'micBlack'},
                                   'legR': {'r1c1': 'slackGrey', 'r2c1': 'shoeBrown', 'r2c5': 'micBlack'}},
                     skin_parts=('head', 'torso', 'armL', 'armR'), prefix='B_', part_scale=BOSS_PROP)
    head, torso = o['head'], o['torso']
    fz = head_front(head)
    ec = L.eye_centres('male-b')
    for sx in (-1, 1):
        e = ec[sx]
        L.prim_obj('glass', 'ring', (.12, .12, .03), (e.x, e.y, e.z + .012), color=0, parent=head, outline=0, slot='glassBlack', img=img)
    L.box_obj('glassBridge', (abs(ec[1].x - ec[-1].x) - .09, .012, .012), (0, ec[1].y + .01, ec[1].z + .012), color=0, parent=head, outline=0, slot='glassBlack', img=img)
    lo, hi = L.part_bbox(torso)
    cx = (lo[0] + hi[0]) / 2; h = hi[1] - lo[1]; w = hi[0] - lo[0]
    L.box_obj('shirtV', (w * .22, h * .5, .01), (cx, hi[1] - h * .25, hi[2] + .003), color=0, parent=torso, outline=0, slot='shirtWhite', img=img)
    L.box_obj('tie', (w * .07, h * .45, .012), (cx, hi[1] - h * .3, hi[2] + .008), color=0, parent=torso, outline=0, slot='tieRed', img=img)
    # assembly sash (diagonal) + medal
    L.box_obj('sash', (w * .16, h * 1.55, .012), (cx, lo[1] + h * .5, hi[2] + .014), (0, 0, .62), color=0, parent=torso, outline=.004, slot='ribbonRed', img=img)
    L.prim_obj('medal', 'orb', (.05, .05, .015), (cx - w * .25, lo[1] + h * .62, hi[2] + .02), color=0, parent=torso, outline=.004, slot='medalGold', img=img)
    _pose_b(o, img, phase)
    return o


def _pose_b(o, img, phase):
    head, aR, aL = o['head'], o['armR'], o['armL']
    fz = head_front(head)
    mouth = _mouth_world(head, fz)
    s = _s(o)
    # right hand grips a stand-mic pole at chest height in front-right; pole stands on the ground
    if phase == 'p1':
        grip = mouth + Vector((-0.2 * s, -0.1 * s, -0.16 * s))
    else:
        grip = mouth + Vector((-0.24 * s, -0.05 * s, -0.22 * s))
    L.aim_arm_world(aR, grip)
    if phase == 'p1':
        L.aim_arm_world(aL, grip + Vector((0.05 * s, 0, -0.04 * s)))
    elif phase == 'p2':
        aL.rotation_euler = (-2.7, 0, -0.5)
    elif phase == 'stun':
        aL.rotation_euler = (-2.9, 0, -0.5)
    else:
        aL.rotation_euler = (0.9, 0, 0.3)  # hand behind the back
    hw = L.hand_world(aR)
    base = Vector((hw.x, hw.y, 0.0))
    top = Vector((hw.x, hw.y, mouth.z + 0.02 * s))
    L.world_rod('standPole', base, top, 0.012 * s, aR, slot='micBlack', img=img, outline=.006 * s)
    L.world_box('standBase', base + Vector((0, 0, 0.01 * s)), (.12 * s, .015 * s, .12 * s), aR, slot='micBlack', img=img, outline=.005 * s)
    mic_tip = mouth + Vector((-0.07 * s, -0.06 * s, -0.03 * s))
    L.world_rod('standBoom', top, mic_tip, 0.012 * s, aR, slot='micBlack', img=img, outline=.005 * s)
    L.world_ball('micHead', mic_tip, (.045 * s, .055 * s, .045 * s), aR, slot='micGrey', img=img, outline=.006 * s)
    if phase == 'stun':
        L.world_ball('whistle', L.hand_world(aL) + Vector((0, -0.02, 0.0)), (.05, .05, .05), aL, slot='micGrey', img=img, outline=.004)

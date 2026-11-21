# B10 교감 좀비 (Stage 5) - current model + two CC0 options. PREVIEW ONLY.
import math
import bosslib as L
from mathutils import Vector

P = dict(skin=0x9dbf8a, skinShadow=0x7a9a68, hair=0x3b3a38, glasses=0x101010, shirt=0xedebe4, vest=0x4b5d7a, vestShadow=0x3a4a63,
         lanyard=0x2f4f7f, idCard=0xf4f1e8, idPhoto=0x8aa3c2, slacks=0x3a3f45, belt=0x2b2422, shoe=0x4a2f1e, sole=0x14100d,
         stampHandle=0x7a4e2d, stampHead=0x5a3820, stampInk=0xd7263d, ledgerCover=0x2f4f7f, ledgerPages=0xf4f1e8, bell=0xe2b84a, bellBase=0x3a3f45)
POSES = dict(normal=(2.55, -0.28, -0.55, 0.12, 0.04), warn=(3.2, -0.12, -0.7, 0.2, -0.12), ledger=(2.55, -0.28, 1.15, 0.5, 0.08), stun=(-1.05, 0.32, -1.35, -0.18, 0.18))


def blk(name, size, pos, color, parent, rot=(0, 0, 0), ol=1.06):
    return L.box_obj(name, size, pos, rot, color, parent, outline=(0.018 if ol > 1.0 else 0.0), bevel=min(size) * 0.12)


def current(root, phase='normal'):
    """Transcription of components/B10ViceBossMesh.jsx (origin/zombie_only) - same sizes/positions/colours."""
    armRX, armRZ, armLX, armLZ, bodyX = POSES[phase]
    head = L.new_empty('b10Head', root, (0, .93, 0))
    blk('head', (.62, .5, .52), (0, 0, 0), P['skin'], head, ol=1.08)
    L.face_strokes(head, (0, -.02, .262), .56, 'tired', warn=phase in ('warn', 'ledger'))
    for sx in (-1, 1):
        blk('ear', (.1, .18, .14), (sx * .36, -.02, 0), P['skinShadow'], head)
        blk('hairSide', (.08, .24, .46), (sx * .33, .02, -.03), P['hair'], head)
    blk('hairBack', (.6, .26, .08), (0, 0, -.28), P['hair'], head)
    for i, (w, z, ry) in enumerate([(.56, -.1, .08), (.5, 0, .05), (.44, .1, .02)]):
        blk('comb%d' % i, (w, .03, .05), (.02 + i * .02, .262, z), P['hair'], head, (0, ry, 0), ol=1.0)
    g = L.new_empty('glasses', head, (0, .03, .285))
    for x in (-.165, .165):
        gg = L.new_empty('lens', g, (x, 0, 0))
        blk('gt', (.22, .05, .05), (0, .07, 0), P['glasses'], gg, ol=1.0)
        blk('gb', (.22, .035, .05), (0, -.065, 0), P['glasses'], gg, ol=1.0)
        blk('gs', (.04, .17, .05), (math.copysign(.1, x), 0, 0), P['glasses'], gg, ol=1.0)
    blk('bridge', (.12, .04, .05), (0, .04, 0), P['glasses'], g, ol=1.0)
    body = L.new_empty('b10Body', root, (0, .37, 0), (bodyX, 0, 0))
    blk('shirt', (.8, .6, .5), (0, .02, 0), P['shirt'], body, ol=1.09)
    blk('vest', (.84, .46, .53), (0, -.06, 0), P['vest'], body, ol=1.0)
    blk('vfl', (.3, .2, .05), (-.21, .2, .25), P['vest'], body, (0, 0, -.35), ol=1.0)
    blk('vfr', (.3, .2, .05), (.21, .2, .25), P['vest'], body, (0, 0, .35), ol=1.0)
    blk('rib', (.84, .06, .54), (0, -.27, 0), P['vestShadow'], body, ol=1.0)
    blk('collar', (.34, .08, .1), (0, .3, .22), P['shirt'], body, ol=1.0)
    blk('lyL', (.04, .3, .03), (-.09, .14, .285), P['lanyard'], body, (0, 0, -.32), ol=1.0)
    blk('lyR', (.04, .3, .03), (.09, .14, .285), P['lanyard'], body, (0, 0, .32), ol=1.0)
    blk('id', (.15, .19, .03), (0, -.06, .3), P['idCard'], body)
    hips = L.new_empty('hips', root, (0, -.08, 0))
    blk('slacks', (.68, .26, .46), (0, 0, 0), P['slacks'], hips, ol=1.07)
    blk('belt', (.7, .06, .48), (0, .12, 0), P['belt'], hips, ol=1.0)
    ar = L.new_empty('armR', root, (.53, .61, 0), (armRX, 0, armRZ))
    blk('sleeveR', (.25, .46, .25), (0, -.23, 0), P['shirt'], ar)
    blk('handR', (.24, .2, .24), (0, -.55, 0), P['skin'], ar)
    st = L.new_empty('stamp', ar, (0, -.72, 0))
    blk('sh', (.16, .34, .16), (0, -.05, 0), P['stampHandle'], st)
    blk('shead', (.46, .2, .46), (0, -.3, 0), P['stampHead'], st, ol=1.07)
    blk('sink', (.44, .06, .44), (0, -.43, 0), P['stampInk'], st)
    al = L.new_empty('armL', root, (-.53, .61, 0), (armLX, 0, armLZ))
    blk('sleeveL', (.25, .46, .25), (0, -.23, 0), P['shirt'], al)
    blk('handL', (.22, .18, .22), (0, -.53, 0), P['skin'], al)
    lg = L.new_empty('ledger', al, (.02, -.72, .04))
    blk('lc', (.08, .5, .38), (0, 0, 0), P['ledgerCover'], lg)
    blk('lp', (.09, .46, .35), (.012, 0, .012), P['ledgerPages'], lg, ol=1.0)
    if phase == 'stun':
        bl = L.new_empty('bell', lg, (.12, -.1, 0))
        blk('bb', (.06, .2, .2), (0, 0, 0), P['bellBase'], bl)
        blk('bt', (.12, .16, .16), (.08, 0, 0), P['bell'], bl)
    for sx in (-1, 1):
        lgx = L.new_empty('leg', root, (sx * .19, -.22, 0))
        blk('ls', (.28, .42, .3), (0, -.21, 0), P['slacks'], lgx)
        blk('shoe', (.33, .14, .48), (0, -.5, .08), P['shoe'], lgx)
        blk('sole', (.35, .05, .5), (0, -.59, .08), P['sole'], lgx)


# ------------------------------------------------------------------------------------------------------------------
# Option A: Kenney Mini male-a (already in our mini_zombies_kenney.glb) + recolour + procedural props merged like the bake
# ------------------------------------------------------------------------------------------------------------------
def stamp(parent, img, scale=1.0, s=None):
    s = s or (lambda v: v * scale)
    L.box_obj('stampHandle', (s(.05), s(.12), s(.05)), (0, -s(.03), 0), color=0, parent=parent, outline=.006, slot='stampWood', img=img)
    L.box_obj('stampHead', (s(.16), s(.07), s(.16)), (0, -s(.12), 0), color=0, parent=parent, outline=.008, slot='stampWood', img=img)
    L.box_obj('stampInk', (s(.155), s(.022), s(.155)), (0, -s(.165), 0), color=0, parent=parent, outline=.004, slot='stampRed', img=img)


def ledger(parent, img, scale=1.0):
    L.box_obj('ledgerCover', (.028 * scale, .17 * scale, .13 * scale), (0, -.05 * scale, 0), color=0, parent=parent, outline=.006, slot='ledgerBlue', img=img)
    L.box_obj('ledgerPages', (.03 * scale, .155 * scale, .118 * scale), (.004, -.05 * scale, .004), color=0, parent=parent, outline=0, slot='shirtWhite', img=img)


def bell(parent, img):
    L.box_obj('bellBase', (.07, .02, .07), (0, -.02, .06), color=0, parent=parent, outline=.004, slot='slackGrey', img=img)
    L.prim_obj('bellDome', 'orb', (.06, .05, .06), (0, .005, .06), color=0, parent=parent, outline=.004, slot='bellGold', img=img)


# boss proportions: bigger body under the same head (per-part scale, done once at bake time)
BOSS_PROP = {'torso': (1.3, 1.25, 1.25), 'armL': (1.2, 1.2, 1.2), 'armR': (1.2, 1.2, 1.2), 'legL': (1.2, 1.35, 1.2), 'legR': (1.2, 1.35, 1.2)}

B10_A_POSE = {  # Mini arms are lowered by 1.2 rad at rest; these are the extra rotations (three XYZ) per phase
    'normal': dict(armR=(-0.8, 0, -0.15), armL=(-0.55, 0, 0.0), torso=(0.04, 0, 0)),
    'warn': dict(armR=(3.25, 0, 0.75), armL=(-0.7, 0, 0.0), torso=(-0.12, 0, 0)),
    'ledger': dict(armR=(-0.8, 0, -0.15), armL=(1.25, 0, -0.35), torso=(0.08, 0, 0)),
    'stun': dict(armR=(-1.05, 0, -0.5), armL=(-1.35, 0, 0.5), torso=(0.18, 0, 0)),
}


def option_a(root, img, phase='normal'):
    pose = B10_A_POSE[phase]
    o = L.mini_body2('male-a', root, img, skin='bossSkin', eye='bossSkin',
                     recolor={'r2c9': 'shirtWhite', 'r3c5': 'glassBlack', 'r3c7': 'bossSkin', 'r1c1': 'slackGrey', 'r3c1': 'shoeBrown', 'mouth': 'bossSkin'},
                     part_recolor={'torso': {'r2c1': 'hairDark', 'r2c9': 'vestNavy'}, 'legL': {'r2c3': 'slackGrey'}, 'legR': {'r2c3': 'slackGrey'}},
                     skin_parts=('head', 'torso', 'armL', 'armR'), pose=pose, prefix='A_', part_scale=BOSS_PROP)
    head, torso = o['head'], o['torso']
    # comb-over (bald crown recoloured from the hair cell) + dark side hair + back hair
    for sx in (-1, 1):
        L.box_obj('sideHair', (.03, .1, .2), (sx * .165, .14, -.02), color=0, parent=head, outline=.006, slot='hairDark', img=img)
    L.box_obj('backHair', (.3, .1, .03), (0, .14, -.155), color=0, parent=head, outline=.006, slot='hairDark', img=img)
    for i, z in enumerate((-.06, 0, .06)):
        L.box_obj('comb%d' % i, (.27 - i * .03, .012, .022), (.01 * i, .322, z), color=0, parent=head, outline=0, slot='hairDark', img=img)
    # thick horn-rim top bar over the recoloured frames
    L.box_obj('hornRim', (.28, .022, .02), (0, .175, .175), color=0, parent=head, outline=0, slot='glassBlack', img=img)
    L.face_strokes(head, (0, .12, .178), .3, 'tired', warn=phase in ('warn', 'ledger'))
    # vest over the white shirt (merged prop): body shell + open V front showing the shirt + tie
    lo, hi = L.part_bbox(torso)
    cx, cy, cz = (lo + hi) / 2; w, h, d = hi - lo
    # torso shirt cell is recoloured navy (= the vest); a white shirt V + collar is merged on the front
    L.box_obj('shirtV_L', (w * .12, h * .42, .01), (cx - w * .07, hi[1] - h * .2, hi[2] + .004), (0, 0, .35), color=0, parent=torso, outline=0, slot='shirtWhite', img=img)
    L.box_obj('shirtV_R', (w * .12, h * .42, .01), (cx + w * .07, hi[1] - h * .2, hi[2] + .004), (0, 0, -.35), color=0, parent=torso, outline=0, slot='shirtWhite', img=img)
    L.box_obj('collar', (w * .5, h * .1, d * .5), (cx, hi[1] - h * .02, cz + d * .2), color=0, parent=torso, outline=.004, slot='shirtWhite', img=img)
    L.box_obj('lanyardL', (.012, h * .5, .008), (cx - .03, lo[1] + h * .62, hi[2] + .03), (0, 0, -.3), color=0, parent=torso, outline=0, slot='lanyardBlue', img=img)
    L.box_obj('lanyardR', (.012, h * .5, .008), (cx + .03, lo[1] + h * .62, hi[2] + .03), (0, 0, .3), color=0, parent=torso, outline=0, slot='lanyardBlue', img=img)
    L.box_obj('idCard', (.05, .065, .01), (cx, lo[1] + h * .36, hi[2] + .035), color=0, parent=torso, outline=.004, slot='shirtWhite', img=img)
    # props in the hands (merged into the arm parts in the real bake -> 0 extra draw calls)
    stamp(L.attach_along_arm(o['armR'], None), img, scale=1.0)
    lh = L.attach_along_arm(o['armL'], None)
    ledger(lh, img)
    if phase == 'stun':
        bell(lh, img)
    return o


# ------------------------------------------------------------------------------------------------------------------
# Option B: Kenney Graveyard Kit "vampire" (same Mini rig, own colormap) - native vest silhouette; cape becomes the
# vice-principal's navy jacket hung over the shoulders. Native Kenney face (red eyes, fangs) kept.
# ------------------------------------------------------------------------------------------------------------------
VAMP = r'F:\ezs-work\assets_cc0\characters\kenney-graveyard-kit\extracted\Models\GLB format\character-vampire.glb'


def vamp_colour(part, cell, hx, c):
    skin, vest, shirt, slack, hair, shoe, cape = 0x9dbf8a, 0x4b5d7a, 0xedebe4, 0x3a3f45, 0x3b3a38, 0x4a2f1e, 0x2f3d58
    if part == 'torso':
        if cell == 'r3c5':
            return cape if c[2] < -0.07 else shirt     # red cape -> navy jacket; red shirt front -> white shirt
        if cell == 'r3c9':
            return vest
        if cell == 'r3c15':
            return slack
        if cell == 'r2c3':
            return 0x2b2422                               # belt
    if part in ('armL', 'armR'):
        return shirt if cell == 'r3c9' else skin
    if part == 'head':
        if cell == 'r3c9':
            return hair
        if cell == 'r2c7':
            return skin
        if cell == 'r3c5':
            return 0xff3020                               # eyes
        return hx
    if part in ('legL', 'legR'):
        return slack if cell == 'r3c15' else shoe
    return hx


B10_B_POSE = {
    'normal': dict(armR=(-0.35, 0, -0.15), armL=(-0.55, 0, 0.0)),
    'warn': dict(armR=(3.25, 0, 0.75), armL=(-0.7, 0, 0.0)),
    'ledger': dict(armR=(-0.35, 0, -0.15), armL=(1.25, 0, -0.35)),
    'stun': dict(armR=(-1.05, 0, -0.5), armL=(-1.35, 0, 0.5)),
}


def option_b(root, img, phase='normal'):
    o = L.pack_body(VAMP, root, vamp_colour, pose=B10_B_POSE[phase], prefix='B_', outline=0.011, part_scale=BOSS_PROP)
    head = o['head']
    # comb-over strips on top + thick black glasses (procedural, merged)
    lo, hi = L.part_bbox(head)
    for i, z in enumerate((-.06, 0, .06)):
        L.box_obj('comb%d' % i, (.3 - i * .03, .014, .024), (.01 * i, hi[1] + .004, z), color=0x3b3a38, parent=head, outline=0)
    for sx in (-1, 1):
        L.box_obj('rimT', (.11, .022, .02), (sx * .085, .175, hi[2] + .012), color=0x101010, parent=head, outline=0)
        L.box_obj('rimB', (.11, .016, .02), (sx * .085, .1, hi[2] + .012), color=0x101010, parent=head, outline=0)
        L.box_obj('rimS', (.018, .09, .02), (sx * .14, .137, hi[2] + .012), color=0x101010, parent=head, outline=0)
    L.box_obj('rimBridge', (.06, .018, .02), (0, .16, hi[2] + .012), color=0x101010, parent=head, outline=0)
    t = o['torso']
    tlo, thi = L.part_bbox(t)
    L.box_obj('lanyardL', (.014, .12, .01), (-.035, .14, thi[2] + .02), (0, 0, -.3), color=0x2f4f7f, parent=t, outline=0)
    L.box_obj('lanyardR', (.014, .12, .01), (.035, .14, thi[2] + .02), (0, 0, .3), color=0x2f4f7f, parent=t, outline=0)
    L.box_obj('idCard', (.055, .07, .01), (0, .07, thi[2] + .03), color=0xf4f1e8, parent=t, outline=.004)
    # bigger "office" props from the Kenney Furniture Kit idea is out of budget; stamp + ledger stay procedural, larger
    stamp(L.attach_along_arm(o['armR'], None), img, scale=1.35)
    lh = L.attach_along_arm(o['armL'], None)
    ledger(lh, img, scale=1.3)
    if phase == 'stun':
        bell(lh, img)
    return o

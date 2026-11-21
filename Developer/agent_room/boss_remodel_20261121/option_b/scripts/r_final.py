# Final preview of the shipped option A (existing palette slots, game pose numbers). Blender 5.2 headless.
import sys
sys.path.insert(0, r'F:\ezs-work\backup\boss_remodel_20261121\scripts')
import bosslib as L
L.USE_EXISTING = True
import b10, b05
mode = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'front'
OUT = r'F:\ezs-work\backup\boss_remodel_20261121'
sc = L.reset_scene(); img = L.build_atlas()
items = [('b10', 'normal', -3.3), ('b10', 'warn', -1.75), ('mini5', None, -0.55), ('b05', 'normal', 0.75), ('b05', 'p2', 2.3), ('mini6', None, 3.45)]
for kind, ph, x in items:
    r = L.three_root('%s_%s' % (kind, ph), x=x)
    if kind == 'b10':
        b10.option_a(r, img, ph); r.scale = (2.3228,) * 3
    elif kind == 'b05':
        b05.option_a(r, img, ph); r.scale = (2.1845,) * 3
    elif kind == 'mini5':
        L.mini_body2('female-e', r, img, skin='zGreen', eye='eyeAmber', recolor={'r3c15': 'apronBrown', 'r1c1': 'coffeeDark'}); r.scale = (1.118,) * 3
    else:
        L.mini_body2('female-c', r, img, skin='zGreen', eye='eyeRed', recolor={'r1c1': 'teamBlue', 'r2c15': 'white'}); r.scale = (1.118,) * 3
    L.ground_root(r)
L.ground(color=0xcdb98f)
if mode == 'front':
    L.camera(target=(0, 0, 0.95), yaw_deg=-20, pitch_deg=11, ortho=8.6, res=(1600, 640))
else:
    L.camera(target=(0, 0, 0.6), yaw_deg=0, pitch_deg=45, ortho=8.6, res=(1600, 620))
L.render(OUT + r'\final_%s_raw.png' % mode)

import sys, math
sys.path.insert(0, r'F:\ezs-work\backup\boss_remodel_20261121\scripts')
import bosslib as L, b05
mode = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'sheet'
OUT = r'F:\ezs-work\backup\boss_remodel_20261121'
sc = L.reset_scene(); img = L.build_atlas()
MINI_H = 0.75
if mode in ('sheet', 'gamecam'):
    rc = L.three_root('cur', x=-2.5, scale=0.977); b05.current(rc); L.ground_root(rc)
    H = L.height_of(rc); print('current height', H)
    ra = L.three_root('A', x=-0.7); b05.option_a(ra, img); L.ground_root(ra)
    s = H / L.height_of(ra); ra.scale = (s, s, s); L.ground_root(ra); print('A scale', s)
    rb = L.three_root('B', x=1.1); b05.option_b(rb, img); L.ground_root(rb)
    s = H / L.height_of(rb); rb.scale = (s, s, s); L.ground_root(rb); print('B scale', s)
    rm = L.three_root('mini', x=2.55); L.mini_body2('female-c', rm, img, skin='zGreen', eye='eyeRed', recolor={'r1c1': 'teamBlue', 'r2c15': 'white'}); L.ground_root(rm)
    s = MINI_H / L.height_of(rm); rm.scale = (s, s, s); L.ground_root(rm)
    L.ground(color=0xd8b57a)
    if mode == 'sheet':
        L.camera(target=(0, 0, 1.0), yaw_deg=-28, pitch_deg=10, ortho=6.6, res=(2200, 1050))
        L.render(OUT + r'\renders\b05_sheet_raw.png')
    else:
        L.camera(target=(0, 0, 0.6), yaw_deg=0, pitch_deg=45, ortho=7.0, res=(1400, 700))
        L.render(OUT + r'\renders\b05_gamecam_raw.png')
else:
    which = mode.split(':')[1]
    phases = ['normal', 'warn', 'stun'] if which == 'cur' else ['normal', 'p1', 'p2', 'stun']
    for i, ph in enumerate(phases):
        r = L.three_root('%s_%s' % (which, ph), x=(i - (len(phases) - 1) / 2) * 1.95)
        if which == 'cur':
            r.scale = (0.977,) * 3; b05.current(r, ph)
        elif which == 'A':
            b05.option_a(r, img, ph); r.scale = (2.18,) * 3
        else:
            b05.option_b(r, img, ph); r.scale = (2.32,) * 3
        L.ground_root(r)
    L.ground(color=0xd8b57a)
    L.camera(target=(0, 0, 0.95), yaw_deg=-8, pitch_deg=12, ortho=8.4, res=(2400, 900))
    L.render(OUT + r'\renders\b05_pose_%s_raw.png' % which)

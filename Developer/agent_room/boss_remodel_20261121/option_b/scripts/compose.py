from PIL import Image, ImageDraw, ImageFont
import os
R = r'F:\ezs-work\backup\boss_remodel_20261121\renders'
O = r'F:\ezs-work\backup\boss_remodel_20261121'
FB = ImageFont.truetype(r'C:\Windows\Fonts\malgunbd.ttf', 34)
F = ImageFont.truetype(r'C:\Windows\Fonts\malgun.ttf', 26)
FS = ImageFont.truetype(r'C:\Windows\Fonts\malgun.ttf', 22)
W = 2200

def fit(path, w=W):
    im = Image.open(os.path.join(R, path)).convert('RGB')
    return im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)

def labels_row(im, items, y=14, font=F):
    d = ImageDraw.Draw(im)
    for x_frac, text in items:
        x = int(x_frac * im.width)
        bb = d.textbbox((0, 0), text, font=font)
        tw = bb[2] - bb[0]
        d.rounded_rectangle((x - tw // 2 - 12, y - 6, x + tw // 2 + 12, y + (bb[3] - bb[1]) + 14), 10, fill=(255, 255, 255))
        d.text((x - tw // 2, y), text, fill=(20, 20, 20), font=font)
    return im

def bar(text, h=60, font=FB, bg=(40, 44, 52), fg=(255, 255, 255)):
    im = Image.new('RGB', (W, h), bg)
    ImageDraw.Draw(im).text((24, (h - 44) // 2), text, fill=fg, font=font)
    return im

def stack(parts):
    h = sum(p.height for p in parts)
    out = Image.new('RGB', (W, h), (255, 255, 255))
    y = 0
    for p in parts:
        out.paste(p, (0, y)); y += p.height
    return out

def boss(key, title, names, sheet_x, pose_labels_cur, pose_labels_opt, mini_name):
    parts = [bar(title)]
    s = labels_row(fit('%s_sheet_raw.png' % key), list(zip(sheet_x, names + [mini_name])))
    parts += [bar('정면 3/4 비교 (같은 키로 맞춤, 오른쪽 끝 = 일반 Mini 좀비 실제 비율)', 48, F, (70, 76, 88)), s]
    g = labels_row(fit('%s_gamecam_raw.png' % key), list(zip(sheet_x, names + [mini_name])), font=FS)
    parts += [bar('게임 카메라 각도(위 45도) - 같은 순서', 48, F, (70, 76, 88)), g]
    for which, lab, nm in (('cur', pose_labels_cur, names[0]), ('A', pose_labels_opt, names[1]), ('B', pose_labels_opt, names[2])):
        p = fit('%s_pose_%s_raw.png' % (key, which))
        n = len(lab)
        xs = [(0.5 + (i - (n - 1) / 2) * 1.95 / 8.4) for i in range(n)]
        p = labels_row(p, list(zip(xs, lab)), font=FS)
        parts += [bar('포즈 - ' + nm, 44, F, (90, 96, 108)), p]
    out = stack(parts)
    out.save(os.path.join(O, '%s_contact.png' % key), optimize=True)
    return out

a = boss('b10', 'Stage 5 보스 B10 「교감 좀비」 - 현재 vs CC0 개조안',
         ['현재 (블록 50개 직접 제작)', '안 A: Kenney Mini male-a 개조', '안 B: Graveyard Kit 뱀파이어 개조'], [0.17, 0.39, 0.63, 0.84],
         ['평상(도장 어깨)', '결재 도장 예고', '출석부 예고', '소집 정지(종)'], ['평상', '결재 도장 예고', '출석부 예고', '소집 정지(종)'], '일반 Mini 좀비(E103)')
b = boss('b05', 'Stage 6 보스 B05 「교장 선생님 좀비」 - 현재 vs CC0 개조안',
         ['현재 (확장 블록 리그)', '안 A: Kenney Mini male-d 개조', '안 B: Kenney Mini male-b 개조'], [0.17, 0.4, 0.64, 0.84],
         ['평상', '공격 예고(공통)', '격노/정지'], ['평상', '훈화 고리 예고', '교가 제창 예고', '격노/호루라기'], '일반 Mini 좀비(E105)')
# overview: the two front sheets only, half size
ov = stack([bar('B10 교감 (Stage 5): 현재 | 안 A | 안 B | 일반 좀비'), labels_row(fit('b10_sheet_raw.png'), list(zip([0.17, 0.39, 0.63, 0.84], ['현재', '안 A (male-a)', '안 B (뱀파이어)', '일반 좀비']))),
            bar('B05 교장 (Stage 6): 현재 | 안 A | 안 B | 일반 좀비'), labels_row(fit('b05_sheet_raw.png'), list(zip([0.17, 0.4, 0.64, 0.84], ['현재', '안 A (male-d)', '안 B (male-b)', '일반 좀비'])))])
ov = ov.resize((1400, int(ov.height * 1400 / W)), Image.LANCZOS)
ov.save(os.path.join(O, 'contact_sheet.png'), optimize=True)
print(a.size, b.size, ov.size)

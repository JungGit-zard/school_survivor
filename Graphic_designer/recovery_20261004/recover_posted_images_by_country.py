import json, hashlib, shutil, re, struct, datetime
from pathlib import Path

root = Path('D:/JungSil/2.Minigame_project/school_survivor-integration')
out_root = root / 'Graphic_designer/recovery_20261004/posted_images_by_country'
langs = ['ko', 'en', 'ja', 'vi']
for lang in langs:
    (out_root / lang).mkdir(parents=True, exist_ok=True)

config_path = root / 'marketing/x_daily_zombie_school_posting/posting_config.json'
config = json.loads(config_path.read_text(encoding='utf-8-sig'))
records_by_source = {}

def norm_path(p):
    return Path(str(p).replace('\\\\', '/').replace('\\', '/'))

def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def png_dim(p):
    with open(p, 'rb') as f:
        sig = f.read(24)
    if sig[:8] == b'\x89PNG\r\n\x1a\n':
        w, h = struct.unpack('>II', sig[16:24])
        return f'{w}x{h}'
    return None

def add_source(lang, source_path, evidence):
    p = norm_path(source_path)
    if not p.is_absolute():
        p = root / p
    key = (lang, str(p))
    rec = records_by_source.setdefault(key, {'language': lang, 'source_local_path': str(p), 'evidence': []})
    rec['evidence'].append(evidence)

for lang, variants in config.get('variants', {}).items():
    if lang not in langs:
        continue
    for v in variants:
        if v.get('enabled') and v.get('imagePath'):
            add_source(lang, v['imagePath'], {
                'platform': 'config',
                'receipt_or_config': str(config_path.relative_to(root)),
                'variantId': v.get('id'),
                'post_url': None,
                'verification_status': 'planned_config_enabled_not_live_verified',
                'notes': 'Enabled in posting_config.json; not proof of publication.',
            })

for lang, pool in config.get('image_pool', {}).items():
    if lang not in langs:
        continue
    for img in pool.get('images', []):
        add_source(lang, img, {
            'platform': 'config',
            'receipt_or_config': str(config_path.relative_to(root)),
            'variantId': 'base_image_pool',
            'post_url': None,
            'verification_status': 'local_image_pool_not_live_verified',
            'notes': 'Listed in posting_config.image_pool; not proof of publication.',
        })

# Preserve every country-folder PNG under the original X/Facebook image pool as local-only evidence.
# These files are not claimed as posted unless a verified receipt below also references them.
country_dirs = {
    'ja': root / 'marketing/x_daily_zombie_school_posting/image_pool/x_jp',
    'en': root / 'marketing/x_daily_zombie_school_posting/image_pool/x_en',
    'vi': root / 'marketing/x_daily_zombie_school_posting/image_pool/x_viet',
    'ko': root / 'marketing/x_daily_zombie_school_posting/image_pool/x_ko',
}
for lang, directory in country_dirs.items():
    if directory.exists():
        for img in sorted(directory.glob('*.png')):
            add_source(lang, str(img), {
                'platform': 'local_image_pool',
                'receipt_or_config': str(directory.relative_to(root)),
                'variantId': 'country_folder_png',
                'post_url': None,
                'verification_status': 'local_country_folder_not_live_verified',
                'notes': 'Existing language image_pool PNG preserved as local original; not proof of publication.',
            })

receipt_paths = [
    root / 'marketing/x_daily_zombie_school_posting/receipts/2026-10-04-2000-live.json',
    root / 'Developer/agent_room/facebook_posting_receipts/2026-10-04-1700-live.json',
    root / 'Developer/agent_room/facebook_posting_receipts/2026-10-04-1700.json',
]
for rp in receipt_paths:
    if not rp.exists():
        continue
    data = json.loads(rp.read_text(encoding='utf-8-sig'))
    platform = data.get('platform') or ('x' if 'x_daily' in str(rp) else 'unknown')
    cycle = data.get('cycleId') or data.get('runId')
    for lang, e in (data.get('entries') or {}).items():
        if lang not in langs or not e:
            continue
        intent = e.get('intent') or {}
        source = intent.get('imagePath')
        if not source:
            continue
        ev = e.get('evidence') or {}
        if platform == 'facebook':
            post_url = ev.get('permalink')
            source_image_url = ev.get('photoUrl')
        else:
            post_url = ev.get('url')
            source_image_url = ev.get('imageUrl') or ev.get('photoUrl')
        status = 'verified_live_posted_receipt' if (e.get('state') == 'verified' and post_url) else f"receipt_{e.get('state', 'unknown')}_not_live_verified"
        add_source(lang, source, {
            'platform': platform,
            'receipt_or_config': str(rp.relative_to(root)),
            'cycle_or_run_id': cycle,
            'variantId': intent.get('variantId'),
            'post_url': post_url,
            'source_image_url': source_image_url,
            'verification_status': status,
            'receipt_state': e.get('state'),
            'notes': 'Receipt evidence marks this live-posted.' if status == 'verified_live_posted_receipt' else 'Receipt has no verified publish evidence; copy preserved as local/unverified only.',
        })

manifest = []
missing = []
copy_count = 0
for (lang, sp), rec in sorted(records_by_source.items()):
    p = Path(sp)
    if not p.exists():
        rec['exists'] = False
        missing.append(sp)
        manifest.append(rec)
        continue
    sha = sha256_file(p)
    dim = png_dim(p)
    statuses = [ev['verification_status'] for ev in rec['evidence']]
    highest = 'verified_live_posted_receipt' if 'verified_live_posted_receipt' in statuses else ('receipt_selected_not_live_verified' if any(s.startswith('receipt_') for s in statuses) else statuses[0])
    variant = next((ev.get('variantId') for ev in rec['evidence'] if ev.get('variantId') and ev.get('variantId') != 'base_image_pool'), None) or 'base'
    platform = 'multi' if len(set(ev.get('platform') for ev in rec['evidence'])) > 1 else rec['evidence'][0].get('platform')
    safe_variant = re.sub(r'[^A-Za-z0-9_.-]+', '-', str(variant))
    safe_status = 'verified' if highest == 'verified_live_posted_receipt' else 'unverified'
    dest = out_root / lang / f"{lang}_{platform}_{safe_status}_{safe_variant}_{sha[:12]}_{p.name}"
    if not dest.exists() or sha256_file(dest) != sha:
        shutil.copy2(p, dest)
        copy_count += 1
    rec.update({
        'exists': True,
        'sha256': sha,
        'dimensions': dim,
        'bytes': p.stat().st_size,
        'copied_to': str(dest),
        'copy_sha256': sha256_file(dest),
        'verification_status': highest,
    })
    manifest.append(rec)

summary = {
    'task_id': 't_b63a3fc1',
    'created_at_utc': datetime.datetime.utcnow().replace(microsecond=0).isoformat() + 'Z',
    'source_config': str(config_path),
    'audited_receipts': [str(p) for p in receipt_paths if p.exists()],
    'output_root': str(out_root),
    'language_folders': langs,
    'unique_local_source_images_found': sum(1 for r in manifest if r.get('exists')),
    'new_or_refreshed_copies_written': copy_count,
    'missing_sources': missing,
    'live_verified_records': sum(1 for r in manifest if r.get('verification_status') == 'verified_live_posted_receipt'),
    'unverified_local_records': sum(1 for r in manifest if r.get('exists') and r.get('verification_status') != 'verified_live_posted_receipt'),
    'live_scrape_attempt': {
        'facebook_permalink_http_fetch': 'HTTP 200 HTML accessible via urllib without login; no direct image binary URL extracted, so receipt photoUrl retained as source_image_url for verified record.',
        'x_receipts': 'No verified X post URL evidence found in audited X receipt.',
    },
    'exclusions': [
        'Disabled boss_series and boss_localized_20261003 images excluded from posted-by-country copies because no X/Facebook receipt proved prior publication.',
        'No new art generated, no posting/scheduler/Firebase/game/title mutation performed.',
    ],
    'records': manifest,
}

json_path = out_root / 'manifest.json'
json_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
lines = [
    '# Posted image recovery manifest — t_b63a3fc1',
    '',
    f'- output_root: `{out_root}`',
    f'- source_config: `{config_path}`',
    f'- unique local source images copied/listed: {summary["unique_local_source_images_found"]}',
    f'- verified live-posted records: {summary["live_verified_records"]}',
    f'- unverified local/planned/selected records: {summary["unverified_local_records"]}',
    f'- missing source references: {len(missing)}',
    '',
    '## Records',
    '',
    '| lang | status | platforms/evidence | post URL | source image URL/local source | sha256 | copied file |',
    '|---|---|---|---|---|---|---|',
]
for r in manifest:
    evs = []
    post_urls = []
    src_urls = []
    for ev in r.get('evidence', []):
        evs.append(f"{ev.get('platform')}:{ev.get('verification_status')}:{ev.get('variantId')}")
        if ev.get('post_url'):
            post_urls.append(ev['post_url'])
        if ev.get('source_image_url'):
            src_urls.append(ev['source_image_url'])
    source_cell = '<br>'.join(src_urls) if src_urls else r.get('source_local_path', '')
    lines.append(f"| {r.get('language')} | {r.get('verification_status', 'missing')} | {'<br>'.join(evs)} | {'<br>'.join(post_urls) if post_urls else ''} | `{source_cell}` | `{r.get('sha256', '')}` | `{r.get('copied_to', '')}` |")
lines += [
    '',
    '## Notes',
    '- `verified_live_posted_receipt` means a local receipt contains verified post evidence and a post permalink; this run did not click Post or mutate external services.',
    '- `receipt_selected_not_live_verified`, `planned_config_enabled_not_live_verified`, and `local_image_pool_not_live_verified` are preserved only as local/unverified images; they are not claimed as published.',
    '- Facebook public GET returned HTML for the permalink/photo page; no direct binary image was extracted, so the verified Facebook `photoUrl` and local source path are retained in the manifest.',
]
(out_root / 'manifest.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(json.dumps({k: summary[k] for k in ['output_root', 'unique_local_source_images_found', 'new_or_refreshed_copies_written', 'live_verified_records', 'unverified_local_records', 'missing_sources']}, ensure_ascii=False, indent=2))

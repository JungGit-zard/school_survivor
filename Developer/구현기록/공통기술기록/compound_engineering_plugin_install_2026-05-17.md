# Compound Engineering Plugin Install - 2026-05-17

## Source

- Repository: `https://github.com/EveryInc/compound-engineering-plugin`
- Checked revision: `82b8af4`
- Plugin version from Codex manifest: `3.8.2`

## Applied To

- Codex home: `C:\Users\admin\.codex`
- Project: `D:\JungSil\2.Minigame_project\school_survivor`

## Commands Run

```powershell
codex plugin marketplace add EveryInc/compound-engineering-plugin
codex plugin marketplace upgrade compound-engineering-plugin
bunx @every-env/compound-plugin install compound-engineering --to codex
```

## Result

- Marketplace `compound-engineering-plugin` is registered in `C:\Users\admin\.codex\config.toml`.
- Marketplace revision is `82b8af415d9ca5577577fa80da0a6119fc8b661e`.
- Plugin enable entry exists:

```toml
[plugins."compound-engineering@compound-engineering-plugin"]
enabled = true
```

- Compound Engineering agent install manifest exists:

```text
C:\Users\admin\.codex\compound-engineering\install-manifest.json
```

- Installed CE agents:

```text
C:\Users\admin\.codex\agents\compound-engineering\
```

- Agent TOML validation:

```text
CHECKED=49
ERRORS=0
```

## Important Note

This current Codex chat session was started before the plugin was enabled, so native CE skills may not appear until Codex is restarted or a new session is opened.

Expected usage after restart:

```text
/ce-setup
/ce-brainstorm
/ce-plan
/ce-code-review
/ce-compound
```

Project rule still applies: do not commit automatically unless the user explicitly asks for a commit.


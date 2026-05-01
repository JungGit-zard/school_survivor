# Git Branch Addresses - 2026-04-27

## Repository

- GitHub repository: https://github.com/JungGit-zard/school_survivor
- HTTPS clone URL: https://github.com/JungGit-zard/school_survivor.git
- Local repository path: `F:/2.The_Weekend_Work/codex_project/BangBang_survivor`

## Current Working Branch

- Branch name: `feature/next-gameplay-iteration`
- Remote branch: `origin/feature/next-gameplay-iteration`
- GitHub branch URL: https://github.com/JungGit-zard/school_survivor/tree/feature/next-gameplay-iteration
- Pull request URL: https://github.com/JungGit-zard/school_survivor/pull/new/feature/next-gameplay-iteration

## Claude 관리 브랜치 (신규)

- Branch name: `claude/fixes-and-review`
- Remote branch: `origin/claude/fixes-and-review`
- GitHub branch URL: https://github.com/JungGit-zard/school_survivor/tree/claude/fixes-and-review
- Pull request URL: https://github.com/JungGit-zard/school_survivor/pull/new/claude/fixes-and-review
- 용도: 버그 수정, 코드 검수, 안정성 개선 — 검증 후 `feature/next-gameplay-iteration`으로 PR

## Previous Feature Branch

- Branch name: `feature/player-ellipse-shadow`
- Remote branch: `origin/feature/player-ellipse-shadow`
- GitHub branch URL: https://github.com/JungGit-zard/school_survivor/tree/feature/player-ellipse-shadow
- Pull request URL: https://github.com/JungGit-zard/school_survivor/pull/new/feature/player-ellipse-shadow

## Stable Branch

- Branch name: `main`
- Remote branch: `origin/main`
- GitHub branch URL: https://github.com/JungGit-zard/school_survivor/tree/main

## First Setup On Another Computer

```powershell
git clone https://github.com/JungGit-zard/school_survivor.git
cd school_survivor
git checkout feature/next-gameplay-iteration
```

## Update Existing Local Copy

```powershell
git fetch origin
git checkout feature/next-gameplay-iteration
git pull origin feature/next-gameplay-iteration
```

## Prototype Setup After Clone

```powershell
cd Developer/r3f_prototype
npm install
npm run dev
```

## 브랜치 구조 요약

```
main
├── feature/player-ellipse-shadow   (이전 피처 브랜치, 보존)
├── feature/next-gameplay-iteration (현재 작업 브랜치)
└── claude/fixes-and-review         (Claude 관리 — 버그픽스/검수)
```

## Notes

- 신규 기능: `feature/next-gameplay-iteration`에서 작업
- 버그 수정/검수: `claude/fixes-and-review`에서 작업 후 PR
- `feature/player-ellipse-shadow`: 이전 피처, 보존
- `main`: 안정 브랜치, 직접 커밋 금지

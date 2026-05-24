# Developer Cleanup Graphics Planning Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 정본 정책을 지키면서 그래픽 구현 기록, 게임기획·밸런스 구현 기록, Developer 기술 기록을 분리하고 죽은 prop 구현 코드를 제거한다.

**Architecture:** 그래픽 정본은 `Graphic_designer/A.그래픽/`, 게임기획·밸런스 정본은 `Planner/B.게임기획,밸런스 구현/`, 실행 코드는 `Developer/r3f_prototype/`에 둔다. Developer 루트 문서는 `Developer/구현기록/`으로 모아 실행 코드와 기록을 분리한다.

**Tech Stack:** React, React Three Fiber, Vite, Vitest, PowerShell file operations, Agent Room routing.

---

### Task 1: Agent Room Routing Record

**Files:**
- Create: `Developer/agent_room/developer_cleanup_graphics_planning_split_2026-05-24.toh`

- [x] **Step 1: Record routing**

Agent Room 라우팅 결과를 기록한다.

- [x] **Step 2: Preserve methodology**

`project_develop_policy.md` 우선, `Graphic_designer/`와 `Planner/` 정본 분리, `Developer/` 실행 코드 유지 원칙을 기록한다.

### Task 2: Folder Structure

**Files:**
- Create: `Graphic_designer/A.그래픽/**/README.md`
- Create: `Planner/B.게임기획,밸런스 구현/**/README.md`
- Create: `Developer/구현기록/**/README.md`

- [x] **Step 1: Create target folders**

요청한 A/B 분류를 정책에 맞는 부서 폴더 아래 생성한다.

- [x] **Step 2: Add README files**

각 폴더의 포함 범위와 실행 코드 위치를 적는다.

### Task 3: Move Existing Records

**Files:**
- Move clear graphic records under `Graphic_designer/A.그래픽/`
- Move clear planning records under `Planner/B.게임기획,밸런스 구현/`
- Move Developer top-level implementation notes under `Developer/구현기록/`

- [x] **Step 1: Move graphics records**

캐릭터, 배경, 효과 폴더를 새 A 구조 아래로 이동한다.

- [x] **Step 2: Move planning records**

무기, 보상/드랍, Stage 1 밸런스 폴더를 새 B 구조 아래로 이동한다.

- [x] **Step 3: Move Developer records**

Developer 루트 문서를 그래픽 구현 연결, 게임기획·밸런스 구현 연결, 공통기술기록으로 분류한다.

### Task 4: Simplify Dead Prop Code

**Files:**
- Delete: `Developer/r3f_prototype/src/components/StageProps.jsx`
- Delete: `Developer/r3f_prototype/src/components/Props/*`
- Delete: `Developer/r3f_prototype/src/components/Atmosphere/*`
- Delete: `Developer/r3f_prototype/src/lib/stagePropsLayout.js`
- Delete: `Developer/r3f_prototype/src/lib/stagePropsLayout.test.js`
- Modify: `Developer/r3f_prototype/src/components/ClassroomFloor.jsx`

- [x] **Step 1: Remove unreachable render path**

`Game.jsx` no longer renders `StageProps`, so the unreachable prop implementation path is deleted.

- [x] **Step 2: Remove stale comment**

`ClassroomFloor.jsx` top comment now says static prop overlays were removed.

### Task 5: Verify

**Commands:**
- `rg -n "StageProps|components/Props|components/Atmosphere|stagePropsLayout|PROP_LAYOUT|PROP_KINDS" Developer/r3f_prototype/src`
- `npm test -- --run`
- `npm run build`

- [x] **Step 1: Search for broken source references**

Expected: no source references to deleted prop implementation.

- [x] **Step 2: Run tests**

Expected: Vitest exits 0.

- [x] **Step 3: Run build**

Expected: Vite exits 0; large chunk warning is acceptable.

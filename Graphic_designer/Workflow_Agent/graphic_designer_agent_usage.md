# Graphic Designer Agent Usage

## Purpose

`graphic_designer` is the project custom agent for Escape! zombie school graphics work.

Use it for:

- game art direction
- asset implementation guidance
- visual QA
- readability review
- HUD and screen clarity
- Phaser/Three.js visual integration
- graphics-related documentation inside `Graphic_designer/`

## Where The Agent Lives

The agent configuration lives here:

`F:\2.The_Weekend_Work\codex_project\Escape_zombie_school\.codex\agents\graphic-designer.toml`

The working documents, review notes, asset specs, and graphics records live here:

`F:\2.The_Weekend_Work\codex_project\Escape_zombie_school\Graphic_designer`

So the agent itself cannot live directly inside `Graphic_designer/` if we follow the current OpenAI Codex custom-agent location rule. `Graphic_designer/` is the role workspace, not the Codex agent configuration folder.

## How To Ask For It

Codex subagents are spawned only when the user explicitly asks for subagents or names the agent.

Good examples:

```text
Use the graphic_designer agent to review the current tileset readability.
```

```text
Use subagents: assign graphics to graphic_designer and gameplay implementation to game-developer.
```

```text
Use subagents so graphic_designer reviews HUD readability and reviewer checks bug risk.
```

## Expected Output

The agent should report:

- inspected files or screens
- visual decision or implementation performed
- evidence from project documents or runtime inspection
- remaining visual risks or playtest checks
- necessary follow-up tasks

## Important Limitation

The project can describe when `graphic_designer` should be used, but Codex does not silently spawn subagents without an explicit user request. For graphics work, say `use the graphic_designer agent` or `use subagents for this task`.

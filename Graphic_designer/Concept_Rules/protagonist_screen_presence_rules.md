# Protagonist Screen Presence Rules

Date: 2026-04-25

## Purpose

This document records how the 3D-modeled protagonist must appear on screen.

## Mandatory Appearance

- The protagonist must be the visible player character, not a marker beside the player.
- The protagonist must be a Three.js 3D toon model.
- The protagonist must clearly read as a student wearing a uniform and carrying a school bag.
- The protagonist must be readable at normal gameplay zoom on a 720 x 1280 screen.
- The protagonist must remain visually attached to the actual gameplay position during movement, rotation, camera follow, and animation.

## Position Rule

- The Three.js group position for the protagonist must be synced directly from the Phaser player screen position.
- A y-offset or x-offset must not be added to the protagonist unless it is documented and visually verified.
- The protagonist shadow must sit under the same character, not between the character and an old debug marker.

## Forbidden Visuals

- Do not show a persistent circle around the protagonist in the normal game view.
- Do not show a debug collision ring in the normal game view.
- Do not show a separate marker that looks like the player while the 3D model is elsewhere.
- Do not leave a temporary cube, marker, or simple shape as the player final visual.

## Review Checklist

- Does the player look like one single controlled 3D character?
- Is there any visible circle around the player that is not an intentional attack warning?
- Does the 3D model stay in the same place as the player shadow?
- Does the 3D model stay aligned while moving up, down, left, and right?
- Does the student uniform remain recognizable?
- Is the school bag recognizable?
- Are toon shading and outlines visible?

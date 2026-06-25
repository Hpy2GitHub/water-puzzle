# Mix Colors Toggle — Bug Investigation Guide

## What it should do

When **Allow mismatched pours** is ON in config, the user should be able to pour
any color onto any other color, as long as the source isn't empty and the
destination isn't full.

The badge on the puzzle page shows `mix:ON` when the setting is active, so the
config IS reaching the page correctly. The pour is still blocked anyway.

---

## The data flow (top to bottom)

### 1. Config toggle — `src/pages/ConfigPage.tsx`

```tsx
onClick={() => updateConfig({ allowMismatch: !config.allowMismatch })}
```

Calls `updateConfig` from context. The toggle visually responds and persists to
localStorage correctly (confirmed by `mix:ON` in the badge).

### 2. Context — `src/context/GameContext.tsx`

```ts
function updateConfig(partial: Partial<GameConfig>) {
  setConfigState((prev) => ({ ...prev, ...partial }))
}
```

Standard spread update. `allowMismatch` is in `DEFAULT_CONFIG` as `false` so
it's always a proper boolean, never `undefined`.

### 3. Game hook — `src/hooks/useGameState.ts`

This is the most likely place the bug lives.

```ts
const allowMismatchRef = useRef(initialConfig.allowMismatch)
allowMismatchRef.current = initialConfig.allowMismatch   // line 41
```

The ref is assigned during render so it should always reflect the latest value.

```ts
// line 68
if (canPour(tubes[selectedIndex], tubes[clickedIdx], allowMismatchRef.current)) {
```

`allowMismatchRef.current` is read at call time (not captured at creation time),
so stale closure is not the issue — OR SO WE THINK. See suspects below.

### 4. Game logic — `src/utils/gameLogic.ts`

```ts
export function canPour(from: Tube, to: Tube, allowMismatch = false): boolean {
  if (from.segments.length === 0) return false
  if (to.segments.length >= to.capacity) return false
  const toTop = getTopColor(to)
  if (toTop === null) return true          // empty destination always ok
  if (allowMismatch) return true           // <-- the gate we're trying to open
  return toTop === getTopColor(from)
}
```

Logic is correct. The only way this returns `false` with `allowMismatch = true`
is if the source is empty or the destination is full.

---

## What we've already tried

- Confirmed `config.allowMismatch` is `true` in PuzzlePage via the badge (`mix:ON`)
- Added `allowMismatchRef` to avoid stale closure in `handleTubeClick`
- TypeScript compiles clean throughout

---

## Likely suspects

### Suspect A — `allowMismatchRef.current` is `false` at call time

Even though line 41 assigns it during render, React Strict Mode double-invokes
renders in development. The second render would re-assign correctly, but if
something in between resets it this could fail.

**Verify:** add a log inside `handleTubeClick` right before the `canPour` call:

```ts
console.log('[click] allowMismatch =', allowMismatchRef.current)
if (canPour(tubes[selectedIndex], tubes[clickedIdx], allowMismatchRef.current)) {
```

### Suspect B — `canPour` receives `false` despite the ref being `true`

The ref reading is fine but something else passes `false` to `canPour`.

**Verify:** add a log inside `canPour` itself in `src/utils/gameLogic.ts`:

```ts
export function canPour(from: Tube, to: Tube, allowMismatch = false): boolean {
  console.log('[canPour] allowMismatch =', allowMismatch)
  ...
}
```

### Suspect C — the destination bottle IS actually full

The most boring explanation. `canPour` returns `false` before ever reaching the
`allowMismatch` check because `to.segments.length >= to.capacity`.

**Verify:** the same log above would show — also just count the segments visually.

### Suspect D — Case 4 intercepts before Case 3

Case 4 switches selection to the clicked bottle when `canPour` is false AND the
clicked bottle has liquid. This looks like a blocked pour but is actually a
re-selection. You'd notice the NEW bottle getting the selection highlight.

```ts
// Case 4 in handleTubeClick:
if (tubes[clickedIdx].segments.length > 0) {
  sounds.playSelect()
  setSelectedIndex(clickedIdx)   // looks like a block, is actually a switch
  return
}
```

**Verify:** after clicking the "destination", does the selection highlight move
to it instead of the pour happening?

---

## Quickest way to isolate

Temporarily hardcode `true` in the `canPour` call (line 68 of `useGameState.ts`)
to rule out everything except the logic gate itself:

```ts
// temporary: bypass the ref entirely
if (canPour(tubes[selectedIndex], tubes[clickedIdx], true)) {
```

If this works, the bug is in how `allowMismatchRef.current` is being read or
assigned. If it still doesn't work, the destination is full (Suspect C) or Case 4
is intercepting (Suspect D).

---

## Files to edit

| File | What to look at |
|---|---|
| `src/hooks/useGameState.ts` | lines 40–41 (ref), line 68 (canPour call), line 85 (Case 4) |
| `src/utils/gameLogic.ts` | lines 20–26 (canPour) |
| `src/pages/ConfigPage.tsx` | toggle onClick |
| `src/context/GameContext.tsx` | updateConfig |

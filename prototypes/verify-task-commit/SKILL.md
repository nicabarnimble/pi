---
name: verify-task-commit
description: Check a pi-durable task commit or abort change against the commit/abort sketch before calling it done. Use when editing TaskState, NextTaskState, runtime.commit, or task abort.
---

# Verify a task commit

This is a sketch, not a harness for the whole CLI. It checks one claim. A task commit cannot record `completed` while an abort mark is set, and an unmarked run cannot record `aborted`.

## When to run it

Run it before saying a change to task status, `runtime.commit`, or abort handling is correct. Also run it when the change only touches prose about those states.

## What to run

From the repo root:

```bash
node prototypes/task-commit/prove.mjs
```

The script typechecks `prototypes/task-commit/legal.ts` and expects success. It typechecks `illegal-generic.ts`, `illegal-overload.ts`, and `illegal-split.ts` and expects `tsc` to fail on each mismatch.

## What this refuses to hand-wave

Do not say the existing `TaskState` union already makes a bad commit impossible. `NextTaskState` in `packages/durable/src/types.ts` accepts `running`, `waiting`, or `terminal` and does not take the abort mark. `commitWide` in the sketch is that shape, and it typechecks a `completed` outcome in abort mode.

A passing `prove.mjs` is evidence about the sketch. It is not evidence about production until the production `commit` signature rejects the same three calls. Do not cite this skill as proof that `packages/durable` enforces the mark.

A wide `Mode` (`"abort" | "run"`) is a separate result printed by the script. Read `wideModeVariable`. If a form still accepts the bad call through a wide mode, say so. Do not call that form closed.

/**
 * Sketch of packages/durable TaskState commit, not the production type.
 *
 * Production `NextTaskState` is running, waiting, or terminal. `abortRequested`
 * sits beside that union, so a commit can store `completed` while an abort mark
 * is set. The compiler accepts it. `commitNarrow` puts the mark in the argument
 * list so the outcome has to match the mark.
 */

export type Checkpoint = { readonly phase: string };

export type Outcome =
	| { readonly status: "completed"; readonly result: string }
	| { readonly status: "failed"; readonly error: string }
	| { readonly status: "aborted"; readonly reason?: string }
	| { readonly status: "orphaned"; readonly reason: string }
	| { readonly status: "faulted"; readonly error: string };

export type LiveNext = {
	readonly status: "running" | "waiting";
	readonly checkpoint: Checkpoint;
};

export type CompletedNext = {
	readonly status: "terminal";
	readonly outcome: Exclude<Outcome, { readonly status: "aborted" }>;
};

export type AbortedNext = {
	readonly status: "terminal";
	readonly outcome: Extract<Outcome, { readonly status: "aborted" }>;
};

/** Mirrors `NextTaskState`: the abort mark is not part of the accepted value. */
export type WideNext = LiveNext | CompletedNext | AbortedNext;

export type Mode = "abort" | "run";

export function commitWide(_mode: Mode, next: WideNext): WideNext {
	return next;
}

export type CommitWhen<M extends Mode> = M extends "abort" ? AbortedNext : LiveNext | CompletedNext;

export function commitGeneric<M extends Mode>(_mode: M, next: CommitWhen<M>): CommitWhen<M> {
	return next;
}

export function commitOverload(mode: "abort", next: AbortedNext): AbortedNext;
export function commitOverload(mode: "run", next: LiveNext | CompletedNext): LiveNext | CompletedNext;
export function commitOverload(_mode: Mode, next: WideNext): WideNext {
	return next;
}

/** No mode argument, so a widened `"abort" | "run"` value cannot select the wrong result. */
export function commitAbort(next: AbortedNext): AbortedNext {
	return next;
}

export function commitRun(next: LiveNext | CompletedNext): LiveNext | CompletedNext {
	return next;
}

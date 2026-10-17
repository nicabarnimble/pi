import type { Context } from "@earendil-works/chord";
import type { TaskRuntime } from "../src/types.ts";

declare const runtime: TaskRuntime<null, { phase: "work" }, string, object>;
declare const context: Context;

runtime.commitRun(() => ({ status: "running", checkpoint: { phase: "work" } }), context);
runtime.commitRun(
	() => ({ status: "waiting", checkpoint: { phase: "work" }, on: [], policy: "allSettled" }),
	context,
);
runtime.commitRun(() => ({ status: "terminal", outcome: { status: "completed", result: "ok" } }), context);
runtime.commitRun(() => ({ status: "terminal", outcome: { status: "failed", error: { message: "no" } } }), context);
runtime.commitAbort(() => ({ status: "terminal", outcome: { status: "aborted", reason: "stop" } }), context);
runtime.commitRun(() => undefined, context);
runtime.commitAbort(() => undefined, context);

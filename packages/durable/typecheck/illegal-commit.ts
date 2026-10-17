import type { Context } from "@earendil-works/chord";
import type { TaskRuntime } from "../src/types.ts";

declare const runtime: TaskRuntime<null, { phase: "work" }, string, object>;
declare const context: Context;

runtime.commitAbort(() => ({ status: "terminal", outcome: { status: "completed", result: "ok" } }), context);
runtime.commitAbort(() => ({ status: "running", checkpoint: { phase: "work" } }), context);
runtime.commitRun(() => ({ status: "terminal", outcome: { status: "aborted", reason: "stop" } }), context);

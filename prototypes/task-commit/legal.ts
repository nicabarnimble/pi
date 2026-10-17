import { commitAbort, commitGeneric, commitOverload, commitRun, commitWide } from "./model.ts";

commitWide("abort", { status: "terminal", outcome: { status: "completed", result: "ok" } });
commitWide("run", { status: "running", checkpoint: { phase: "work" } });

commitGeneric("abort", { status: "terminal", outcome: { status: "aborted", reason: "stop" } });
commitGeneric("run", { status: "running", checkpoint: { phase: "work" } });
commitGeneric("run", { status: "terminal", outcome: { status: "completed", result: "ok" } });
commitGeneric("run", { status: "waiting", checkpoint: { phase: "join" } });

commitOverload("abort", { status: "terminal", outcome: { status: "aborted" } });
commitOverload("run", { status: "terminal", outcome: { status: "failed", error: "no" } });

commitAbort({ status: "terminal", outcome: { status: "aborted", reason: "stop" } });
commitRun({ status: "running", checkpoint: { phase: "work" } });
commitRun({ status: "terminal", outcome: { status: "completed", result: "ok" } });

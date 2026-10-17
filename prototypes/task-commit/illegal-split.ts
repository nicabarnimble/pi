import { commitAbort, commitRun } from "./model.ts";

commitAbort({ status: "terminal", outcome: { status: "completed", result: "ok" } });
commitAbort({ status: "running", checkpoint: { phase: "work" } });
commitRun({ status: "terminal", outcome: { status: "aborted", reason: "stop" } });

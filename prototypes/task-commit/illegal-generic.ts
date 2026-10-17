import { commitGeneric } from "./model.ts";

commitGeneric("abort", { status: "terminal", outcome: { status: "completed", result: "ok" } });
commitGeneric("abort", { status: "running", checkpoint: { phase: "work" } });
commitGeneric("run", { status: "terminal", outcome: { status: "aborted", reason: "stop" } });

const mode = "abort" as "abort" | "run";
commitGeneric(mode, { status: "terminal", outcome: { status: "completed", result: "ok" } });

import { commitOverload } from "./model.ts";

commitOverload("abort", { status: "terminal", outcome: { status: "completed", result: "ok" } });
commitOverload("abort", { status: "running", checkpoint: { phase: "work" } });
commitOverload("run", { status: "terminal", outcome: { status: "aborted", reason: "stop" } });

const mode = "abort" as "abort" | "run";
commitOverload(mode, { status: "terminal", outcome: { status: "completed", result: "ok" } });

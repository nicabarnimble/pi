import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const typecheck = join(dirname(fileURLToPath(import.meta.url)), "../typecheck");
const tsc = join(typecheck, "../../../node_modules/typescript/bin/tsc");

function typecheckProject(project: string): { status: number | null; text: string } {
	const result = spawnSync(process.execPath, [tsc, "-p", join(typecheck, project), "--pretty", "false", "--noEmit"], {
		encoding: "utf8",
	});
	return { status: result.status, text: `${result.stdout}\n${result.stderr}` };
}

function errorsOn(text: string, line: number): string[] {
	return text
		.split("\n")
		.filter((entry) => entry.includes(`illegal-commit.ts(${line},`) && entry.includes("error TS"));
}

describe("commitAbort / commitRun", () => {
	it("accepts run checkpoints and non-abort outcomes, and an aborted outcome from commitAbort", () => {
		const legal = typecheckProject("tsconfig.legal.json");
		expect(legal).toMatchObject({ status: 0 });
	});

	it("rejects complete-while-abort, running-while-abort, and aborted-while-run", () => {
		const illegal = typecheckProject("tsconfig.illegal.json");
		expect(illegal.status).not.toBe(0);
		expect(illegal.text).not.toContain("TS2769");
		const diagnostics = illegal.text.split("\n").filter((entry) => entry.includes("error TS"));
		expect(diagnostics.length).toBeGreaterThan(0);
		for (const entry of diagnostics) expect(entry).toContain("error TS2322");
		expect(errorsOn(illegal.text, 7).length).toBeGreaterThan(0);
		expect(errorsOn(illegal.text, 8).length).toBeGreaterThan(0);
		expect(errorsOn(illegal.text, 9).length).toBeGreaterThan(0);
		expect(illegal.text).toContain(`'"completed"' is not assignable to type '"aborted"'`);
		expect(illegal.text).toContain(`'"running"' is not assignable to type '"terminal"'`);
		expect(illegal.text).toContain(`'"aborted"' is not assignable`);
	});
});

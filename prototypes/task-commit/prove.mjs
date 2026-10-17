import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const tsc = join(dir, "../../node_modules/typescript/bin/tsc");

function run(project) {
	const result = spawnSync(process.execPath, [tsc, "-p", join(dir, project), "--pretty", "false"], {
		encoding: "utf8",
	});
	return { status: result.status, text: `${result.stdout}\n${result.stderr}` };
}

function must(condition, message) {
	if (!condition) {
		console.error(message);
		process.exit(1);
	}
}

const legal = run("tsconfig.json");
must(legal.status === 0, `legal calls failed to typecheck\n${legal.text}`);

const generic = run("tsconfig.illegal-generic.json");
must(generic.status !== 0, "generic commit accepted an abort/outcome mismatch");
must(generic.text.includes("illegal-generic.ts(3,"), `missing error on completed-while-abort\n${generic.text}`);
must(generic.text.includes("illegal-generic.ts(4,"), `missing error on running-while-abort\n${generic.text}`);
must(generic.text.includes("illegal-generic.ts(5,"), `missing error on aborted-while-run\n${generic.text}`);
const genericWide = generic.text.includes("illegal-generic.ts(8,");

const overload = run("tsconfig.illegal-overload.json");
must(overload.status !== 0, "overload commit accepted an abort/outcome mismatch");
must(overload.text.includes("illegal-overload.ts(3,"), `missing error on completed-while-abort\n${overload.text}`);
must(overload.text.includes("illegal-overload.ts(4,"), `missing error on running-while-abort\n${overload.text}`);
must(overload.text.includes("illegal-overload.ts(5,"), `missing error on aborted-while-run\n${overload.text}`);
const overloadWide = overload.text.includes("illegal-overload.ts(8,");

const split = run("tsconfig.illegal-split.json");
must(split.status !== 0, "split commit functions accepted an abort/outcome mismatch");
must(split.text.includes("illegal-split.ts(3,"), `missing error on completed-while-abort\n${split.text}`);
must(split.text.includes("illegal-split.ts(4,"), `missing error on running-while-abort\n${split.text}`);
must(split.text.includes("illegal-split.ts(5,"), `missing error on aborted-while-run\n${split.text}`);

console.log(
	JSON.stringify(
		{
			legal: "pass",
			literalMismatch: "rejected by generic, overload, and split functions",
			wideModeVariable: {
				genericRejects: genericWide,
				overloadRejects: overloadWide,
			},
			splitFunctions: "rejected the three mismatches, and there is no mode argument to widen",
		},
		null,
		2,
	),
);

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

const illegal = run("tsconfig.illegal.json");
must(illegal.status !== 0, "action matcher accepted a raw key chord");
must(illegal.text.includes("illegal.ts(3,"), `missing error on raw chord\n${illegal.text}`);
must(illegal.text.includes("illegal.ts(4,"), `missing error on unknown action\n${illegal.text}`);

console.log(JSON.stringify({ legal: "pass", rawChord: "rejected", unknownAction: "rejected" }, null, 2));

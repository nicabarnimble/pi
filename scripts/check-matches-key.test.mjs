import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findHardcodedMatchesKeyCalls } from "./check-matches-key.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const script = fileURLToPath(new URL("./check-matches-key.mjs", import.meta.url));

test("flags hardcoded matchesKey calls and ignores the parser, computed keys, tests, and examples", async (t) => {
	const root = await mkdtemp(join(tmpdir(), "pi-matches-key-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	const files = {
		"packages/tui/src/keys.ts": `
			export function matchesKey(data, keyId) { return data === keyId; }
			// matchesKey(data, "ctrl+c")
		`,
		"packages/tui/src/app.ts": `
			declare function matchesKey(data: string, key: string): boolean;
			declare const Key: { escape: string; ctrl(key: string): string };
			export function handle(data: string, key: string, shortcutStr: string) {
				if (matchesKey(data, "ctrl+x")) return;
				if (matchesKey(data, Key.escape)) return;
				if (matchesKey(data, Key.ctrl("c"))) return;
				if (matchesKey(data, key)) return;
				if (matchesKey(data, shortcutStr as string)) return;
				if (matchesKey(data, "enter" as string)) return;
			}
		`,
		"packages/tui/test/keys.test.ts": `declare function matchesKey(data: string, key: string): boolean; matchesKey("x", "enter");`,
		"packages/demo/examples/widget.ts": `declare function matchesKey(data: string, key: string): boolean; matchesKey("x", "escape");`,
	};
	for (const [path, contents] of Object.entries(files)) {
		const fullPath = join(root, path);
		await mkdir(join(fullPath, ".."), { recursive: true });
		await writeFile(fullPath, contents);
	}

	assert.deepEqual(findHardcodedMatchesKeyCalls(root), [
		'packages/tui/src/app.ts "ctrl+x"',
		'packages/tui/src/app.ts "enter" as string',
		"packages/tui/src/app.ts Key.ctrl(\"c\")",
		"packages/tui/src/app.ts Key.escape",
	]);

	const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
	assert.equal(result.status, 1);
	assert.match(result.stdout, /matchesKey: 4 hardcoded call\(s\)/);
	assert.match(result.stderr, /packages\/tui\/src\/app\.ts "ctrl\+x"/);
});

test("repo has no hardcoded matchesKey calls", () => {
	const found = findHardcodedMatchesKeyCalls(repoRoot);
	assert.deepEqual(found, []);
	const result = spawnSync(process.execPath, [script], { cwd: repoRoot, encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /matchesKey: 0 hardcoded call\(s\)/);
});

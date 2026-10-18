import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	allowedHardcodedKeys,
	findHardcodedKeyChecks,
	formatHardcodedKeyCheck,
	splitHardcodedKeyChecks,
} from "./check-matches-key.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const script = fileURLToPath(new URL("./check-matches-key.mjs", import.meta.url));

test("fails on a new hardcoded matchesKey or parseKey check", async (t) => {
	const root = await mkdtemp(join(tmpdir(), "pi-matches-key-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	const files = {
		"packages/tui/src/keys.ts": `
			export function matchesKey(data, keyId) { return data === keyId; }
			export function parseKey(data) { return data; }
			// matchesKey(data, "ctrl+c")
		`,
		"packages/tui/src/app.ts": `
			declare function matchesKey(data: string, key: string): boolean;
			declare function parseKey(data: string): string | undefined;
			declare const Key: { escape: string; ctrl(key: string): string; space: string };
			export function handle(data: string, key: string, shortcutStr: string) {
				if (matchesKey(data, "ctrl+x")) return;
				if (matchesKey(data, Key.escape)) return;
				if (matchesKey(data, Key.ctrl("c"))) return;
				if (matchesKey(data, key)) return;
				if (matchesKey(data, shortcutStr as string)) return;
				if (matchesKey(data, "enter" as string)) return;
				if (parseKey(data) === "ctrl+q") return;
				if (parseKey(data) !== "escape") return;
				if (parseKey(data) === key) return;
				switch (parseKey(data)) {
					case "tab":
					case Key.space:
						return;
					default:
						return;
				}
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

	const { checks } = findHardcodedKeyChecks(root);
	assert.deepEqual(checks.map(formatHardcodedKeyCheck), [
		'packages/tui/src/app.ts matchesKey "ctrl+x"',
		'packages/tui/src/app.ts matchesKey "enter" as string',
		'packages/tui/src/app.ts matchesKey Key.ctrl("c")',
		"packages/tui/src/app.ts matchesKey Key.escape",
		'packages/tui/src/app.ts parseKey !== "escape"',
		'packages/tui/src/app.ts parseKey === "ctrl+q"',
		'packages/tui/src/app.ts parseKey case "tab"',
		"packages/tui/src/app.ts parseKey case Key.space",
	]);

	const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
	assert.equal(result.status, 1);
	assert.match(result.stdout, /hardcoded keys: 8 violation\(s\)/);
	assert.match(result.stdout, /allowlisted: 0/);
	assert.match(result.stderr, /matchesKey "ctrl\+x"/);
	assert.match(result.stderr, /parseKey === "ctrl\+q"/);
});

test("allowlist accepts the four fixed keys and nothing else", () => {
	const { files, checks } = findHardcodedKeyChecks(repoRoot);
	const { violations, allowlisted, missing } = splitHardcodedKeyChecks(checks, allowedHardcodedKeys, files);
	assert.deepEqual(violations, []);
	assert.deepEqual(missing, []);
	assert.deepEqual(
		allowlisted.map((check) => `${check.file} ${check.key}`),
		allowedHardcodedKeys.map((entry) => `${entry.file} ${entry.key}`),
	);
	const result = spawnSync(process.execPath, [script], { cwd: repoRoot, encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /hardcoded keys: 0 violation\(s\)/);
	assert.match(result.stdout, /allowlisted: 4/);
});

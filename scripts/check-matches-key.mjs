import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SyntaxKind } from "typescript/unstable/ast";
import {
	isCallExpression,
	isIdentifier,
	isNoSubstitutionTemplateLiteral,
	isPropertyAccessExpression,
	isStringLiteral,
} from "typescript/unstable/ast/is";
import { API } from "typescript/unstable/sync";

// Hardcoded key checks skip TUI_KEYBINDINGS / APP_KEYBINDINGS.
// Not flagged: the key parser (packages/tui/src/keys.ts) and its tests, calls whose
// key id is computed (KeybindingsManager.matches, extension shortcuts), and example
// components. The list below is the fixed keys that are not actions.

const parserImplementation = "packages/tui/src/keys.ts";

export const allowedHardcodedKeys = [
	{
		file: "packages/coding-agent/src/modes/interactive/components/config-selector.ts",
		key: '"ctrl+c"',
		reason: "Ctrl+C still exits when cancel no longer claims it",
	},
	{
		file: "packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts",
		key: 'Key.ctrl("c")',
		reason: "Ctrl+C clears model search, or cancels when the search is empty",
	},
	{
		file: "packages/tui/src/components/editor.ts",
		key: '"enter"',
		reason: "Backslash-submit fallback checks the Enter key, not the submit binding",
	},
	{
		file: "packages/tui/src/tui.ts",
		key: '"shift+ctrl+d"',
		reason: "Debug chord, consumed only when a handler is registered",
	},
];

const equalityOperators = new Map([
	[SyntaxKind.EqualsEqualsEqualsToken, "==="],
	[SyntaxKind.ExclamationEqualsEqualsToken, "!=="],
	[SyntaxKind.EqualsEqualsToken, "=="],
	[SyntaxKind.ExclamationEqualsToken, "!="],
]);

function collectPackageSourceFiles(root) {
	const files = [];
	const packagesDir = join(root, "packages");
	let packages;
	try {
		packages = readdirSync(packagesDir, { withFileTypes: true });
	} catch {
		return files;
	}

	function walk(directory) {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (entry.name !== "node_modules" && entry.name !== "dist") walk(join(directory, entry.name));
				continue;
			}
			if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
				files.push(join(directory, entry.name));
			}
		}
	}

	for (const entry of packages) {
		if (!entry.isDirectory()) continue;
		const sourceDir = join(packagesDir, entry.name, "src");
		try {
			walk(sourceDir);
		} catch {
			// Package has no src directory.
		}
	}
	return files;
}

function unwrap(node) {
	while (
		node.kind === SyntaxKind.ParenthesizedExpression ||
		node.kind === SyntaxKind.AsExpression ||
		node.kind === SyntaxKind.SatisfiesExpression ||
		node.kind === SyntaxKind.TypeAssertionExpression
	) {
		node = node.expression;
	}
	return node;
}

function isHardcodedKey(node) {
	const key = unwrap(node);
	if (isStringLiteral(key) || isNoSubstitutionTemplateLiteral(key)) return true;
	if (isPropertyAccessExpression(key) && isIdentifier(key.expression) && key.expression.text === "Key") return true;
	if (
		isCallExpression(key) &&
		isPropertyAccessExpression(key.expression) &&
		isIdentifier(key.expression.expression) &&
		key.expression.expression.text === "Key"
	) {
		return true;
	}
	return false;
}

function isParseKeyCall(node) {
	const call = unwrap(node);
	return isCallExpression(call) && isIdentifier(call.expression) && call.expression.text === "parseKey";
}

function allowKey(file, key) {
	return `${file} ${key}`;
}

export function findHardcodedKeyChecks(root) {
	const files = collectPackageSourceFiles(root).map((file) => relative(root, file));
	if (files.length === 0) return { files, checks: [] };

	const configPath = resolve(root, "tsconfig.check-matches-key.json");
	const config = JSON.stringify({
		compilerOptions: { noResolve: true, noLib: true, types: [] },
		files: files.map((file) => resolve(root, file)),
	});
	const api = new API({
		cwd: root,
		fs: {
			fileExists: (fileName) => (resolve(fileName) === configPath ? true : undefined),
			readFile: (fileName) => (resolve(fileName) === configPath ? config : undefined),
		},
	});

	const checks = [];
	try {
		const program = api.updateSnapshot({ openProjects: [configPath] }).getProject(configPath).program;
		for (const file of files) {
			if (file === parserImplementation) continue;
			const sourceFile = program.getSourceFile(resolve(root, file));
			if (!sourceFile) continue;

			function visit(node) {
				if (
					isCallExpression(node) &&
					isIdentifier(node.expression) &&
					node.expression.text === "matchesKey" &&
					node.arguments.length >= 2 &&
					isHardcodedKey(node.arguments[1])
				) {
					checks.push({ file, form: "matchesKey", key: node.arguments[1].getText(sourceFile) });
				}

				const operator = equalityOperators.get(node.operatorToken?.kind);
				if (node.kind === SyntaxKind.BinaryExpression && operator) {
					const left = unwrap(node.left);
					const right = unwrap(node.right);
					const keyNode = isParseKeyCall(left) && isHardcodedKey(right) ? right : undefined;
					const other = isParseKeyCall(right) && isHardcodedKey(left) ? left : keyNode;
					if (other) checks.push({ file, form: `parseKey ${operator}`, key: other.getText(sourceFile) });
				}

				if (node.kind === SyntaxKind.SwitchStatement && isParseKeyCall(node.expression)) {
					for (const clause of node.caseBlock.clauses) {
						if (clause.kind === SyntaxKind.CaseClause && isHardcodedKey(clause.expression)) {
							checks.push({ file, form: "parseKey case", key: clause.expression.getText(sourceFile) });
						}
					}
				}

				node.forEachChild(visit);
			}

			visit(sourceFile);
		}
	} finally {
		api.close();
	}

	checks.sort((a, b) => formatHardcodedKeyCheck(a).localeCompare(formatHardcodedKeyCheck(b)));
	return { files, checks };
}

export function formatHardcodedKeyCheck(check) {
	return `${check.file} ${check.form} ${check.key}`;
}

export function splitHardcodedKeyChecks(checks, allowed, files) {
	const allowedKeys = new Set(allowed.map((entry) => allowKey(entry.file, entry.key)));
	const seen = new Set();
	const violations = [];
	const allowlisted = [];
	for (const check of checks) {
		const id = allowKey(check.file, check.key);
		if (allowedKeys.has(id)) {
			allowlisted.push(check);
			seen.add(id);
		} else {
			violations.push(check);
		}
	}
	const scanned = new Set(files);
	const missing = allowed.filter((entry) => scanned.has(entry.file) && !seen.has(allowKey(entry.file, entry.key)));
	return { violations, allowlisted, missing };
}

function main() {
	const { files, checks } = findHardcodedKeyChecks(process.cwd());
	const { violations, allowlisted, missing } = splitHardcodedKeyChecks(checks, allowedHardcodedKeys, files);
	console.log(`hardcoded keys: ${violations.length} violation(s)`);
	console.log(`allowlisted: ${allowlisted.length}`);
	if (violations.length === 0 && missing.length === 0) return;

	console.error("Hardcoded key checks are not allowed. Add the key to TUI_KEYBINDINGS or APP_KEYBINDINGS.");
	for (const check of violations) console.error(`  ${formatHardcodedKeyCheck(check)}`);
	for (const entry of missing) console.error(`  missing allowlist entry: ${entry.file} ${entry.key}`);
	process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}

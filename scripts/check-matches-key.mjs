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

// Hardcoded matchesKey() calls skip TUI_KEYBINDINGS / APP_KEYBINDINGS.
// Not flagged: the key parser (packages/tui/src/keys.ts) and its tests, calls whose
// key id is computed (KeybindingsManager.matches, extension shortcuts), and example
// components, which use matchesKey for widget-local input.
// Any remaining hardcoded call in packages/*/src fails this check.

const parserImplementation = "packages/tui/src/keys.ts";

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

function unwrapKeyArgument(node) {
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
	const key = unwrapKeyArgument(node);
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

export function findHardcodedMatchesKeyCalls(root) {
	const files = collectPackageSourceFiles(root);
	if (files.length === 0) return [];

	const configPath = resolve(root, "tsconfig.check-matches-key.json");
	const config = JSON.stringify({
		compilerOptions: { noResolve: true, noLib: true, types: [] },
		files: files.map((file) => resolve(file)),
	});
	const api = new API({
		cwd: root,
		fs: {
			fileExists: (fileName) => (resolve(fileName) === configPath ? true : undefined),
			readFile: (fileName) => (resolve(fileName) === configPath ? config : undefined),
		},
	});

	const calls = [];
	try {
		const program = api.updateSnapshot({ openProjects: [configPath] }).getProject(configPath).program;
		for (const file of files) {
			const relativePath = relative(root, file);
			if (relativePath === parserImplementation) continue;
			const sourceFile = program.getSourceFile(resolve(file));
			if (!sourceFile) continue;

			function visit(node) {
				if (
					isCallExpression(node) &&
					isIdentifier(node.expression) &&
					node.expression.text === "matchesKey" &&
					node.arguments.length >= 2 &&
					isHardcodedKey(node.arguments[1])
				) {
					calls.push(`${relativePath} ${node.arguments[1].getText(sourceFile)}`);
				}
				node.forEachChild(visit);
			}

			visit(sourceFile);
		}
	} finally {
		api.close();
	}

	calls.sort();
	return calls;
}

function main() {
	const found = findHardcodedMatchesKeyCalls(process.cwd());
	console.log(`matchesKey: ${found.length} hardcoded call(s)`);
	if (found.length === 0) return;

	console.error("Hardcoded matchesKey() calls are not allowed. Add the key to TUI_KEYBINDINGS or APP_KEYBINDINGS.");
	for (const call of found) console.error(`  ${call}`);
	process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}

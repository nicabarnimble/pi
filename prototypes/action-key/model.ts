/**
 * Sketch of the keybinding hole.
 *
 * `KeyId` accepts every real key chord, so `matchesKey(data, "ctrl+x")` typechecks.
 * `ActionId` is only a name from the binding table. A chord is not an action id.
 * The constants `DEFAULT_EDITOR_KEYBINDINGS` and `DEFAULT_APP_KEYBINDINGS` named in
 * AGENTS.md are not in this repo. The live table is `APP_KEYBINDINGS` in
 * packages/coding-agent/src/core/keybindings.ts, and `matches` takes `Keybinding`.
 */

export const APP_KEYBINDINGS = {
	"app.clear": "ctrl+c",
	"app.message.copy": "ctrl+x",
} as const;

export type ActionId = keyof typeof APP_KEYBINDINGS;

type Letter = "c" | "x" | "d";
export type KeyId = Letter | `ctrl+${Letter}` | "escape";

export function matchesKey(_data: string, _key: KeyId): boolean {
	return false;
}

export function matchesAction(_data: string, _action: ActionId): boolean {
	return false;
}

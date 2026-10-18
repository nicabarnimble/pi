import assert from "node:assert";
import { afterEach, describe, it } from "node:test";
import { Editor } from "../src/components/editor.ts";
import { KeybindingsManager, setKeybindings, TUI_KEYBINDINGS } from "../src/keybindings.ts";
import { TuiMainScreen } from "../src/tui-main-screen.ts";
import { defaultEditorTheme } from "./test-themes.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

const SHIFT_BACKSPACE = "\x1b[127;2u";
const SHIFT_DELETE = "\x1b[3$";

afterEach(() => {
	setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS));
});

function createEditor(): Editor {
	return new Editor(new TuiMainScreen(new VirtualTerminal()), defaultEditorTheme);
}

describe("Editor configurable keybindings", () => {
	it("deletes backward on shift+backspace and follows a remap", () => {
		const editor = createEditor();
		editor.setText("ab");
		editor.handleInput(SHIFT_BACKSPACE);
		assert.strictEqual(editor.getText(), "a");

		setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS, { "tui.editor.deleteCharBackward": "ctrl+h" }));
		const remapped = createEditor();
		remapped.setText("ab");
		remapped.handleInput(SHIFT_BACKSPACE);
		assert.strictEqual(remapped.getText(), "ab\x7f");
		remapped.handleInput("\x08");
		assert.strictEqual(remapped.getText(), "ab");
	});

	it("deletes forward on shift+delete and follows a remap", () => {
		const editor = createEditor();
		editor.setText("ab");
		editor.handleInput("\x01");
		editor.handleInput(SHIFT_DELETE);
		assert.strictEqual(editor.getText(), "b");

		setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS, { "tui.editor.deleteCharForward": "ctrl+o" }));
		const remapped = createEditor();
		remapped.setText("ab");
		remapped.handleInput("\x01");
		remapped.handleInput(SHIFT_DELETE);
		assert.strictEqual(remapped.getText(), "ab");
		remapped.handleInput("\x0f");
		assert.strictEqual(remapped.getText(), "b");
	});
});

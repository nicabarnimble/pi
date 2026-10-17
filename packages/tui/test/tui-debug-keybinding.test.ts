import assert from "node:assert";
import { afterEach, describe, it } from "node:test";
import { KeybindingsManager, setKeybindings, TUI_KEYBINDINGS } from "../src/keybindings.ts";
import type { Component } from "../src/tui.ts";
import { TuiMainScreen } from "../src/tui-main-screen.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

const SHIFT_CTRL_D = "\x1b[100;6u";

afterEach(() => {
	setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS));
});

class InputRecorder implements Component {
	readonly inputs: string[] = [];

	render(): string[] {
		return [""];
	}

	handleInput(data: string): void {
		this.inputs.push(data);
	}

	invalidate(): void {}
}

function startTui(): { terminal: VirtualTerminal; tui: TuiMainScreen; recorder: InputRecorder } {
	const terminal = new VirtualTerminal(80, 24);
	const tui = new TuiMainScreen(terminal);
	const recorder = new InputRecorder();
	tui.setFocus(recorder);
	tui.start();
	return { terminal, tui, recorder };
}

describe("TUI debug keybinding", () => {
	it("consumes shift+ctrl+d when a debug handler is registered", () => {
		const { terminal, tui, recorder } = startTui();
		let calls = 0;
		tui.onDebug = () => {
			calls++;
		};

		terminal.sendInput(SHIFT_CTRL_D);

		assert.strictEqual(calls, 1);
		assert.deepStrictEqual(recorder.inputs, []);
		tui.stop();
	});

	it("forwards shift+ctrl+d when no debug handler is registered", () => {
		const { terminal, tui, recorder } = startTui();

		terminal.sendInput(SHIFT_CTRL_D);

		assert.deepStrictEqual(recorder.inputs, [SHIFT_CTRL_D]);
		tui.stop();
	});

	it("follows a remap of the debug key", () => {
		setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS, { "tui.debug": "ctrl+q" }));
		const { terminal, tui, recorder } = startTui();
		let calls = 0;
		tui.onDebug = () => {
			calls++;
		};

		terminal.sendInput(SHIFT_CTRL_D);
		assert.strictEqual(calls, 0);
		assert.deepStrictEqual(recorder.inputs, [SHIFT_CTRL_D]);

		terminal.sendInput("\x11");
		assert.strictEqual(calls, 1);
		assert.deepStrictEqual(recorder.inputs, [SHIFT_CTRL_D]);
		tui.stop();
	});
});

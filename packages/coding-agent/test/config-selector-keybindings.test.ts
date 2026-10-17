import { setKeybindings } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it } from "vitest";
import { KeybindingsManager } from "../src/core/keybindings.ts";
import type { ResolvedPaths } from "../src/core/package-manager.ts";
import { InMemorySettingsStorage, SettingsManager } from "../src/core/settings-manager.ts";
import { ConfigSelectorComponent } from "../src/modes/interactive/components/config-selector.ts";

const emptyPaths: ResolvedPaths = { extensions: [], skills: [], prompts: [], themes: [] };

afterEach(() => {
	setKeybindings(new KeybindingsManager());
});

function createSelector(onClose: () => void, onExit: () => void): ConfigSelectorComponent {
	const settingsManager = SettingsManager.fromStorage(new InMemorySettingsStorage(), { projectTrusted: true });
	return new ConfigSelectorComponent(
		{ global: emptyPaths, project: emptyPaths },
		settingsManager,
		"/tmp",
		"/tmp",
		onClose,
		onExit,
		() => {},
	);
}

describe("config selector keybindings", () => {
	it("cancels on escape and ctrl+c, and exits on ctrl+c only after cancel is moved", () => {
		setKeybindings(new KeybindingsManager());
		let closed = 0;
		let exited = 0;
		const selector = createSelector(
			() => {
				closed++;
			},
			() => {
				exited++;
			},
		);
		const list = selector.getResourceList();

		list.handleInput("\x1b");
		list.handleInput("\x03");
		expect(closed).toBe(2);
		expect(exited).toBe(0);

		setKeybindings(new KeybindingsManager({ "tui.select.cancel": "escape" }));
		list.handleInput("\x03");
		expect(closed).toBe(2);
		expect(exited).toBe(1);

		setKeybindings(new KeybindingsManager({ "app.config.exit": "ctrl+q" }));
		list.handleInput("\x03");
		list.handleInput("\x11");
		expect(closed).toBe(3);
		expect(exited).toBe(2);
	});
});

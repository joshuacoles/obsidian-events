import { Plugin } from "obsidian";
import { CalendarBlockSettings, CalendarViewKind } from "./types";
import { CalendarView } from "./calendarView";
import { PeriodicNotesPlugin } from "./periodicNotes";

interface CalendarPluginSettings {
	calendarFolder: string;
	icsUrls: string[];
}

const DEFAULT_SETTINGS: CalendarPluginSettings = {
	calendarFolder: "Calendar",
	icsUrls: []
};

export default class CalendarPlugin extends Plugin {
	settings: CalendarPluginSettings;

	get periodicNotes(): PeriodicNotesPlugin | undefined {
		return (this.app as any).plugins.plugins["periodic-notes"] as PeriodicNotesPlugin | undefined;
	}

	async onload() {
    console.log("Loading Calendar Plugin");
		await this.loadSettings();

		// Register the calendar code block processor
		this.registerMarkdownCodeBlockProcessor("calendar", async (source, el, ctx) => {
			try {
				const periodic = this.periodicNotes?.findInCache(ctx.sourcePath);
				const sourceOpts = JSON.parse(source || "{}");
				const { views, ...rest } = sourceOpts;

				const blockSettings: CalendarBlockSettings = periodic ? {
					views: (views ?? ["dayGrid"]).map((x: CalendarViewKind) => [periodic.granularity, x]),
					fixed: true,
					date: periodic.date.toDate(),
					showTitle: false,
					...rest
				} : {
					views: [["month", "dayGrid"], ["week", "timeGrid"], ["day", "timeGrid"], ["week", "list"]],
					fixed: false,
					date: new Date(),
					showTitle: true,
					...sourceOpts
				};

				// Render the calendar
				const calendar = new CalendarView(this, el, blockSettings);
				calendar.render();
			} catch (error) {
				console.error("Error rendering calendar:", error);
				el.createEl("p", { text: "Error rendering calendar. Check console for details." });
			}
		});
	}

	async loadSettings() {
		const privateSettingsPath = `${this.app.vault.configDir}/plugins/obsidian-events/private.json`;
		const privateSettings = await this.app.vault.adapter.exists(privateSettingsPath)
			? JSON.parse(await this.app.vault.adapter.read(privateSettingsPath))
			: {};

		this.settings = Object.assign({}, DEFAULT_SETTINGS, privateSettings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

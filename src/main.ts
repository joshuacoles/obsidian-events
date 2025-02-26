import {Notice, Plugin} from "obsidian";
import {CalendarBlockSettings, CalendarViewKind, EventFileFormat} from "./types";
import { CalendarView } from "./calendarView";
import { PeriodicNotesPlugin } from "./periodicNotes";
import {AddEventModal} from "./addEventModal";

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

		// Add command to create new event
		this.addCommand({
			id: 'create-calendar-event',
			name: 'Create New Event',
			callback: () => {
				new AddEventModal(this.app, async (event: EventFileFormat) => {
					await this.createEventFile(event);
				}).open();
			}
		});
	}

	private async createEventFile(event: any) {
		try {
			// Ensure calendar folder exists
			if (!this.app.vault.getAbstractFileByPath(this.settings.calendarFolder)) {
				await this.app.vault.createFolder(this.settings.calendarFolder);
			}

			// Generate filename from date and title
			const safeTitle = event.title.replace(/[^a-zA-Z0-9 ]/g, '-');
			const date = event.allDay ? event.date : event.startTime.split('T')[0];
			const filename = `${date} ${safeTitle}`;

			// Create file content with frontmatter
			const content = [
				'---',
				...Object.entries(event).map(([key, value]) => `${key}: ${value}`),
				'---',
				'',
				event.description || ''
			].join('\n');

			// Create the file
			const filePath = `${this.settings.calendarFolder}/${filename}.md`;
			const file = await this.app.vault.create(filePath, content);

			// Open the newly created file
			await this.app.workspace.getLeaf(false).openFile(file);
		} catch (error) {
			console.error('Error creating event file:', error);
			new Notice('Failed to create event file');
		}
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

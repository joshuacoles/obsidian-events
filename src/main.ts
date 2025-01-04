import {Plugin, Notice} from 'obsidian';
import {CalendarBlockSettings} from './types';
import {EventParser} from './eventParser';
import {CalendarView} from './calendarView';
import {ICSEventSource} from './icsEvents';
import {PeriodicNotesPlugin} from './periodicNotes';

interface CalendarPluginSettings {
	defaultView: 'month' | 'week' | 'day';
	calendarFolder: string;
	icsUrls: string[];
}

const DEFAULT_SETTINGS: CalendarPluginSettings = {
	defaultView: 'month',
	calendarFolder: 'Calendar',
	icsUrls: []
}

export default class CalendarPlugin extends Plugin {
	settings: CalendarPluginSettings;
	periodicNotes?: PeriodicNotesPlugin;
	private icsSources: ICSEventSource[] = [];

	async onload() {
		await this.loadSettings();
		this.periodicNotes = (this.app as any).plugins.plugins['periodic-notes'] as PeriodicNotesPlugin | undefined;

		// Initialize ICS sources with vault and calendar folder
		this.icsSources = this.settings.icsUrls.map(url => 
			new ICSEventSource(url, this.app, this.settings.calendarFolder)
		);

		// Register the calendar code block processor
		this.registerMarkdownCodeBlockProcessor('calendar', async (source, el, ctx) => {
			try {
				// Parse the code block settings
				const blockSettings: CalendarBlockSettings = {
					view: this.settings.defaultView,
					...JSON.parse(source || '{}')
				};

				// Get events from all sources
				const [localEvents, ...icsEventArrays] = await Promise.all([
					EventParser.parseEvents(this.app.vault, this.settings.calendarFolder),
					...this.icsSources.map(source => source.getEvents())
				]);

				// Combine all events
				const allEvents = [
					...localEvents,
					...icsEventArrays.flat()
				];

				// Render the calendar
				const calendar = new CalendarView(this, el, allEvents, blockSettings);
				calendar.render();
			} catch (error) {
				console.error('Error rendering calendar:', error);
				el.createEl('p', {text: 'Error rendering calendar. Check console for details.'});
			}
		});
	}

	async loadSettings() {
		const privateSettingsPath = `${this.app.vault.configDir}/plugins/obsidian-events/private.json`;
		const privateSettings = await app.vault.adapter.exists(privateSettingsPath)
			? JSON.parse(await app.vault.adapter.read(privateSettingsPath))
			: {};

		this.settings = Object.assign({}, DEFAULT_SETTINGS, privateSettings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

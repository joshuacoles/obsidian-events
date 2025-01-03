import { App, Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { CalendarBlockSettings } from './src/types';
import { EventParser } from './src/eventParser';
import { CalendarView } from './src/calendarView';

interface CalendarPluginSettings {
	defaultView: 'month' | 'week' | 'day';
}

const DEFAULT_SETTINGS: CalendarPluginSettings = {
	defaultView: 'month'
}

export default class CalendarPlugin extends Plugin {
	settings: CalendarPluginSettings;

	async onload() {
		await this.loadSettings();

		// Register the calendar code block processor
		this.registerMarkdownCodeBlockProcessor('calendar', async (source, el, ctx) => {
			try {
				// Parse the code block settings
				const blockSettings: CalendarBlockSettings = {
					view: this.settings.defaultView,
					...JSON.parse(source || '{}')
				};

				// Get the full markdown content of the file
				const fileContent = await this.app.vault.read(ctx.sourcePath);
				
				// Parse events from the file content
				const events = EventParser.parseEvents(fileContent);

				// Render the calendar
				const calendar = new CalendarView(el, events, blockSettings);
				calendar.render();
			} catch (error) {
				console.error('Error rendering calendar:', error);
				el.createEl('p', { text: 'Error rendering calendar. Check console for details.' });
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

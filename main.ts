import { App, Plugin, MarkdownPostProcessorContext, TFile, Notice } from 'obsidian';
import { CalendarBlockSettings, EventFileFormat } from './src/types';
import { EventParser } from './src/eventParser';
import { CalendarView } from './src/calendarView';
import {AddEventModal} from './src/addEventModal';

interface CalendarPluginSettings {
	defaultView: 'month' | 'week' | 'day';
	calendarFolder: string;
}

const DEFAULT_SETTINGS: CalendarPluginSettings = {
	defaultView: 'month',
	calendarFolder: 'Calendar'
}

export default class CalendarPlugin extends Plugin {
	private settings: CalendarPluginSettings;

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

				// Parse events from calendar folder
				const events = await EventParser.parseEvents(this.app.vault, this.settings.calendarFolder);

				// Render the calendar
				const calendar = new CalendarView(this.app, el, events, blockSettings);
				calendar.render();
			} catch (error) {
				console.error('Error rendering calendar:', error);
				el.createEl('p', {text: 'Error rendering calendar. Check console for details.'});
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
			const safeTitle = event.title.replace(/[^a-zA-Z0-9]/g, '-');
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

import { App, Plugin, MarkdownPostProcessorContext, TFile } from 'obsidian';
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

	private async createEventFile(event: EventFileFormat) {
		try {
			// Ensure calendar folder exists
			if (!this.app.vault.getAbstractFileByPath(this.settings.calendarFolder)) {
				await this.app.vault.createFolder(this.settings.calendarFolder);
			}

			// Generate filename from title or date
			const date = new Date(event.startTime);
			const filename = event.title ?
				`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${event.title}` :
				`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-event`;

			// Create file content with frontmatter
			const content = [
				'---',
				'startTime: ' + event.startTime,
				event.endTime ? 'endTime: ' + event.endTime : null,
				event.title ? 'title: ' + event.title : null,
				event.description ? 'description: ' + event.description : null,
				'---',
				'',
				event.description || ''
			].filter(line => line !== null).join('\n');

			// Create the file
			const filePath = `${this.settings.calendarFolder}/${filename}.md`;
			const file = await this.app.vault.create(filePath, content);

			// Open the newly created file
			await this.app.workspace.getLeaf(false).openFile(file);
		} catch (error) {
			console.error('Error creating event file:', error);
			// @ts-ignore
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

import {CalendarEvent, CalendarBlockSettings} from './types';
import {Calendar} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import {App, TFile, Notice} from 'obsidian';
import type {Moment} from 'moment';

interface PeriodicNotesPlugin {
	openPeriodicNote(granularity: "day" | "week" | "month" | "quarter" | "year", date: Moment, opts?: any): Promise<void>;
}

export class CalendarView {
	private container: HTMLElement;
	private events: CalendarEvent[];
	private settings: CalendarBlockSettings;
	private calendar: Calendar | null = null;
	private app: App;

	constructor(container: HTMLElement, events: CalendarEvent[], settings: CalendarBlockSettings) {
		this.container = container;
		this.events = events;
		this.settings = settings;
		this.app = (window as any).app;
	}

	private convertToFullCalendarEvents() {
		return this.events.map(event => ({
			title: event.title,
			start: event.startDate,
			end: event.endDate,
			description: event.description,
			allDay: event.allDay,
			extendedProps: {
				sourcePath: event.sourcePath
			}
		}));
	}

	private async openDailyNote(date: Date) {
		const periodicNotes = (this.app as any)?.plugins?.plugins['periodic-notes'] as PeriodicNotesPlugin | undefined;

		if (!periodicNotes) {
			new Notice('Periodic Notes plugin is not installed or enabled');
			return;
		}

		try {
			// Convert the date to a moment object as required by the Periodic Notes API
			const moment = (window as any).moment(date);
			await periodicNotes.openPeriodicNote('day', moment);
		} catch (error) {
			console.error('Error opening daily note:', error);
			new Notice('Failed to open daily note');
		}
	}

	render() {
		// Clear container
		this.container.empty();

		// Create calendar container
		const calendarEl = this.container.createEl('div', {cls: 'calendar-container'});

		// Initialize FullCalendar
		this.calendar = new Calendar(calendarEl, {
			plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
			initialView: this.getInitialView(),
			headerToolbar: {
				left: 'prev,next today',
				center: 'title',
				right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
			},
			events: this.convertToFullCalendarEvents(),
			initialDate: this.settings.defaultDate ? new Date(this.settings.defaultDate) : new Date(),
			height: 'auto',
			locale: 'en-GB',  // Use UK English locale
			firstDay: 1,      // Week starts on Monday
			buttonText: {
				today: 'Today',
				month: 'Month',
				week: 'Week',
				day: 'Day',
				list: 'List'
			},
			eventClick: (info) => {
				const sourcePath = info.event.extendedProps.sourcePath;
				if (sourcePath) {
					// Get the file from the vault
					const file = this.app.vault.getAbstractFileByPath(sourcePath);
					if (file instanceof TFile) {
						// Open the file in a new leaf
						this.app.workspace.getLeaf(false).openFile(file);
					}
				}
			},
			// Add event hover effect to indicate clickability
			eventDidMount: (info) => {
				if (info.event.extendedProps.sourcePath) {
					info.el.style.cursor = 'pointer';
				}
			},
			// Add hover effect for day cells
			dayCellDidMount: (info) => {
				info.el.querySelector('.fc-daygrid-day-number')?.addEventListener('click', () => {
					this.openDailyNote(info.date);
				});

				info.el.style.cursor = 'pointer';
				info.el.setAttribute('title', 'Click to open daily note');
			},
			themeSystem: 'standard'
		});

		this.calendar.render();
	}

	private getInitialView() {
		switch (this.settings.view) {
			case 'month':
				return 'dayGridMonth';
			case 'week':
				return 'timeGridWeek';
			case 'day':
				return 'timeGridDay';
			default:
				return 'dayGridMonth';
		}
	}
} 

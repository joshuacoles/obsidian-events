import {CalendarEvent, CalendarBlockSettings} from './types';
import {Calendar} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import {App, TFile, Notice, moment} from 'obsidian';
import {createElement} from '@fullcalendar/core/preact';
import type {Moment} from 'moment';

type Granularity = "day" | "week" | "month" | "quarter" | "year";

interface PeriodicNotesPlugin {
	openPeriodicNote(granularity: Granularity, date: Moment, opts?: any): Promise<void>;

	getPeriodicNote(granularity: Granularity, date: Moment): TFile | null;
}

export class CalendarView {
	private container: HTMLElement;
	private events: CalendarEvent[];
	private settings: CalendarBlockSettings;
	private calendar: Calendar | null = null;
	private readonly app: App;
	private readonly periodicNotes: PeriodicNotesPlugin | undefined;

	constructor(app: App, container: HTMLElement, events: CalendarEvent[], settings: CalendarBlockSettings) {
		this.app = app;
		this.container = container;
		this.events = events;
		this.settings = settings;
		this.periodicNotes = (this.app as any).plugins.plugins['periodic-notes'] as PeriodicNotesPlugin | undefined;
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

	private async openPeriodicNote(date: Date, granularity: Granularity) {
		if (!this.periodicNotes) {
			new Notice('Periodic Notes plugin is not installed or enabled');
			return;
		}

		try {
			const moment = (window as any).moment(date);
			await this.periodicNotes.openPeriodicNote(granularity, moment);
		} catch (error) {
			console.error(`Error opening ${granularity} note:`, error);
			new Notice(`Failed to open ${granularity} note`);
		}
	}

	private async openDailyNote(date: Date) {
		await this.openPeriodicNote(date, 'day');
	}

	private async openWeeklyNote(date: Date) {
		await this.openPeriodicNote(date, 'week');
	}

	private async openMonthlyNote(date: Date) {
		await this.openPeriodicNote(date, 'month');
	}

	private async openYearlyNote(date: Date) {
		await this.openPeriodicNote(date, 'year');
	}

	private hasPeriodicNote(date: Date, granularity: Granularity): boolean {
		if (!this.periodicNotes) {
			return false;
		}

		return this.periodicNotes.getPeriodicNote(granularity, moment(date)) != null;
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
			locale: 'en-GB',
			firstDay: 1,
			weekNumbers: true,
			weekNumberFormat: {week: 'numeric'},
			titleFormat: (date) => {
				const currentDate = moment(date.date).toDate();
				const type = this.calendar?.view.type || this.getInitialView();

				// Format the date parts
				const month = currentDate.toLocaleString('en-GB', { month: 'long' });
				const shortMonth = currentDate.toLocaleString('en-GB', { month: 'short' });
				const day = currentDate.getDate();
				const year = currentDate.getFullYear();

				// Create clickable elements
				const monthEl = createElement('span', {
					className: `clickable-title month${this.hasPeriodicNote(currentDate, 'month') ? ' has-periodic-note' : ''}`,
					'data-date': currentDate.toISOString(),
					'data-type': 'month',
					title: 'Click to open monthly note'
				}, month);

				const yearEl = createElement('span', {
					className: `clickable-title year${this.hasPeriodicNote(currentDate, 'year') ? ' has-periodic-note' : ''}`,
					'data-date': currentDate.toISOString(),
					'data-type': 'year',
					title: 'Click to open yearly note'
				}, year);

				// Return different formats based on view type
				switch (type) {
					case 'dayGridMonth':
						// Month view: "January 2024"
						return createElement('span', {}, monthEl, ' ', yearEl);
						
					case 'timeGridWeek':
					case 'listWeek': {
						// Week view: "Jan 1 – 7, 2024"
						const endDate = new Date(currentDate);
						endDate.setDate(currentDate.getDate() + 6);
						const endDay = endDate.getDate();
						return createElement('span', {}, 
							shortMonth, ' ', day, ' – ', endDay, ', ', yearEl
						);
					}
						
					case 'timeGridDay':
						// Day view: "January 1, 2024"
						return createElement('span', {}, 
							monthEl, ' ', day, ', ', yearEl
						);
						
					default:
						return createElement('span', {}, monthEl, ' ', yearEl);
				}
			},
			datesSet: () => {
				// Add click handlers to the title elements
				const titleEl = this.container.querySelector('.fc-toolbar-title');
				if (!titleEl) return;

				titleEl.querySelectorAll('.clickable-title').forEach(el => {
					el.addEventListener('click', (e) => {
						const target = e.target as HTMLElement;
						const date = new Date(target.dataset.date || '');
						const type = target.dataset.type as Granularity;
						
						if (type === 'month') {
							this.openMonthlyNote(date);
						} else if (type === 'year') {
							this.openYearlyNote(date);
						}
					});
				});
			},
			weekNumberDidMount: (info) => {
				const weekNumberEl = info.el;
				weekNumberEl.setAttribute('title', 'Click to open weekly note');

				if (this.hasPeriodicNote(info.date, 'week')) {
					weekNumberEl.classList.add('has-periodic-note');
				}

				weekNumberEl.addEventListener('click', () => {
					this.openWeeklyNote(info.date);
				});
			},
			dayHeaderDidMount: (info) => {
				const headerEl = info.el;
				headerEl.style.cursor = 'pointer';
				headerEl.setAttribute('title', 'Click to open daily note');

				if (this.hasPeriodicNote(info.date, 'day')) {
					headerEl.classList.add('has-periodic-note');
				}

				headerEl.addEventListener('click', () => {
					this.openDailyNote(info.date);
				});
			},
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
					const file = this.app.vault.getAbstractFileByPath(sourcePath);
					if (file instanceof TFile) {
						this.app.workspace.getLeaf(false).openFile(file);
					}
				}
			},
			eventDidMount: (info) => {
				if (info.event.extendedProps.sourcePath) {
					info.el.style.cursor = 'pointer';
				}
			},
			dayCellDidMount: (info) => {
				const dayNumberEl = info.el.querySelector('.fc-daygrid-day-number');
				if (dayNumberEl) {
					dayNumberEl.setAttribute('title', 'Click to open daily note');

					if (this.hasPeriodicNote(info.date, 'day')) {
						info.el.classList.add('has-periodic-note');
					}

					dayNumberEl.addEventListener('click', () => {
						this.openDailyNote(info.date);
					});
				}
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

import {CalendarEvent, CalendarBlockSettings} from './types';
import {Calendar} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import {App, TFile, Notice, moment} from 'obsidian';
import type {Moment} from 'moment';
import {createElement} from "@fullcalendar/core/preact";

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

	private titleObserver!: MutationObserver

    private setTitle() {
		const titleEl = this.container.querySelector('.fc-toolbar-title') as HTMLElement;
		titleEl.querySelectorAll('span').forEach(x => x.remove());

        // Get current date from calendar
        const currentDate = this.calendar?.getDate();
        if (!currentDate) return;

        // Store the raw text content
        const titleText = titleEl.textContent || '';

        // Re-process the title with clickable elements
        titleEl.innerHTML = titleText.replace(/January|February|March|April|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/g, (match) => {
            return this.clickableMonth(titleEl, match, currentDate).outerHTML;
        }).replace(/\d{4}/g, (match) => {
            return this.clickableYear(titleEl, match, currentDate).outerHTML;
        });
    }

	private setupTitleClickHandlers() {
		const titleEl = this.container.querySelector('.fc-toolbar-title') as HTMLElement;
		this.titleObserver = new MutationObserver((changes) => {
			// Check if any of the changes contain text nodes
			const hasTextNodes = changes.some(change => 
				Array.from(change.addedNodes).some(node =>
					node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== ''
				)
			);

			if (hasTextNodes) {
                this.setTitle();
			}
		});

        this.setTitle();
		this.titleObserver.observe(titleEl, { childList: true });
	}

	private clickableMonth(container: HTMLElement, monthText: string, date: Date): HTMLElement {
		const monthEl = document.createElement('span');
		monthEl.textContent = monthText;
		monthEl.className = 'clickable-title month';
		monthEl.title = 'Click to open monthly note';
		if (this.hasPeriodicNote(date, 'month')) {
			monthEl.classList.add('has-periodic-note');
		}
		monthEl.addEventListener('click', () => this.openMonthlyNote(date));

		return monthEl;
	}

	private clickableYear(container: HTMLElement, yearText: string, date: Date): HTMLElement {
		const yearEl = document.createElement('span');
		yearEl.textContent = yearText;
		yearEl.className = 'clickable-title year';
		yearEl.title = 'Click to open yearly note';
		if (this.hasPeriodicNote(date, 'year')) {
			yearEl.classList.add('has-periodic-note');
		}
		yearEl.addEventListener('click', () => this.openYearlyNote(date));

		return yearEl;
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
			weekNumbers: true, // Show week numbers
			weekNumberFormat: {week: 'numeric'},
			titleFormat: (x) => {
				const type = this.calendar?.view.type;
				return createElement('span', {}, 'Bob')
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
		// this.setupTitleClickHandlers();
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

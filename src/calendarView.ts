import {CalendarEvent, CalendarBlockSettings} from './types';
import {Calendar} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import {App, TFile, Notice, moment} from 'obsidian';
import {createElement} from '@fullcalendar/core/preact';
import * as dFns from 'date-fns';
import {Granularity, PeriodicNotesPlugin} from './periodicNotes';
import CalendarPlugin from "./main";
import { CreateEventModal } from './CreateEventModal';

export class CalendarView {
	private container: HTMLElement;
	private events: CalendarEvent[];
	private settings: CalendarBlockSettings;
	private calendar: Calendar | null = null;

	private readonly plugin: CalendarPlugin;
	private readonly app: App;
	private readonly periodicNotes: PeriodicNotesPlugin | undefined;

	constructor(plugin: CalendarPlugin, container: HTMLElement, events: CalendarEvent[], settings: CalendarBlockSettings) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.periodicNotes = plugin.periodicNotes;
		this.container = container;
		this.events = events;
		this.settings = settings;
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
			},
			url: event.sourcePath?.startsWith("ics") ? undefined : event.sourcePath,
		}));
	}

	private async openPeriodicNote(granularity: Granularity, date: Date) {
		if (!this.periodicNotes) {
			new Notice('Periodic Notes plugin is not installed or enabled');
			return;
		}

		try {
			await this.periodicNotes.openPeriodicNote(granularity, moment(date));
		} catch (error) {
			console.error(`Error opening ${granularity} note:`, error);
			new Notice(`Failed to open ${granularity} note`);
		}
	}

	private getPeriodicNote(granularity: Granularity, date: Date): TFile | null {
		if (!this.periodicNotes) {
			return null;
		}

		// @ts-ignore Version issues mean this has an error
		return this.periodicNotes.getPeriodicNote(granularity, moment(date));
	}

	private hasPeriodicNote(date: Date, granularity: Granularity): boolean {
		if (!this.periodicNotes) {
			return false;
		}

		return this.periodicNotes.getPeriodicNote(granularity, moment(date)) != null;
	}

	private createHoverableLink(path: string, text: string) {
		return createElement('a', {
			className: 'internal-link data-link-icon data-link-icon-after data-link-text',
			href: path,
			'data-href': path,
			'data-tooltip-position': 'top',
			'aria-label': path,
			'data-link-path': path,
			style: {'--data-link-path': path},
			target: '_blank',
			rel: 'noopener nofollow',
		}, text);
	}

	private createClickableTitle(text: string, date: Date, type: Granularity, hasNote: boolean) {
		if (hasNote) {
			const file = this.getPeriodicNote(type, date)
			if (file) {
				return this.createHoverableLink(file.path, text);
			}
		}

		return createElement('span', {
			className: `clickable-title ${type}${hasNote ? ' has-periodic-note' : ''}`,
			'data-date': date.toISOString(),
			'data-type': type,
			title: `Click to open ${type}ly note`,
			onClick: () => this.openPeriodicNote(type, date)
		}, text);
	}

	render() {
		// Clear container
		this.container.empty();

		// Create calendar container
		const calendarEl = this.container.createEl('div', {cls: 'calendar-container'});

		// Initialize FullCalendar
		this.calendar = new Calendar(calendarEl, {
			plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
			initialView: this.viewType(...this.settings.views[0]),
			headerToolbar: (!this.settings.fixed || this.settings.views.length > 1 || this.settings.showTitle) ? {
				left: this.settings.fixed ? undefined : 'prev,next today',
				center: this.settings.showTitle ? 'title' : undefined,
				right: this.settings.views.length > 1 ? this.settings.views.map(x => this.viewType(...x)).filter(Boolean).join(',') : undefined,
			} : false,
			events: this.convertToFullCalendarEvents(),
			initialDate: this.settings.date,
			height: 'auto',
			locale: 'en-GB',
			firstDay: 1,
			weekNumbers: true,
			weekNumberFormat: {week: 'numeric'},
			views: {
				dayGridMonth: {
					// @ts-ignore
					titleFormat: (date) => {
						const currentDate = moment(date.date).toDate();
						const month = currentDate.toLocaleString('en-GB', {month: 'long'});
						const year = currentDate.getFullYear();

						const hasMonthNote = this.hasPeriodicNote(currentDate, 'month');
						const hasYearNote = this.hasPeriodicNote(currentDate, 'year');

						const monthEl = this.createClickableTitle(month, currentDate, 'month', hasMonthNote);
						const yearEl = this.createClickableTitle(year.toString(), currentDate, 'year', hasYearNote);

						return createElement('span', {}, monthEl, ' ', yearEl);
					}
				},
				timeGridWeek: {
					// @ts-ignore
					titleFormat: (date) => {
						const currentDate = moment(date.date).toDate();
						const shortMonth = currentDate.toLocaleString('en-GB', {month: 'short'});
						const day = currentDate.getDate();
						const year = currentDate.getFullYear();

						const hasMonthNote = this.hasPeriodicNote(currentDate, 'month');
						const hasYearNote = this.hasPeriodicNote(currentDate, 'year');
						const hasWeekNote = this.hasPeriodicNote(currentDate, 'week');

						const shortMonthEl = this.createClickableTitle(shortMonth, currentDate, 'month', hasMonthNote);
						const yearEl = this.createClickableTitle(year.toString(), currentDate, 'year', hasYearNote);

						const endDate = new Date(currentDate);
						endDate.setDate(currentDate.getDate() + 6);
						const endDay = endDate.getDate();
						const weekText = `${day}${date.defaultSeparator}${endDay}`;
						const weekEl = this.createClickableTitle(weekText, currentDate, 'week', hasWeekNote);

						return createElement('span', {},
							shortMonthEl, ' ', weekEl, ', ', yearEl
						);
					}
				},
				timeGridDay: {
					// @ts-ignore
					titleFormat: (date) => {
						const currentDate = moment(date.date).toDate();
						const month = currentDate.toLocaleString('en-GB', {month: 'long'});
						const day = currentDate.getDate();
						const year = currentDate.getFullYear();

						const hasMonthNote = this.hasPeriodicNote(currentDate, 'month');
						const hasYearNote = this.hasPeriodicNote(currentDate, 'year');
						const hasDayNote = this.hasPeriodicNote(currentDate, 'day');

						const monthEl = this.createClickableTitle(month, currentDate, 'month', hasMonthNote);
						const yearEl = this.createClickableTitle(year.toString(), currentDate, 'year', hasYearNote);
						const dayEl = this.createClickableTitle(day.toString(), currentDate, 'day', hasDayNote);

						return createElement('span', {},
							monthEl, ' ', dayEl, ', ', yearEl
						);
					}
				},
				listWeek: {
					// @ts-ignore
					titleFormat: (date) => {
						const currentDate = moment(date.date).toDate();
						const shortMonth = currentDate.toLocaleString('en-GB', {month: 'short'});
						const day = currentDate.getDate();
						const year = currentDate.getFullYear();

						const hasMonthNote = this.hasPeriodicNote(currentDate, 'month');
						const hasYearNote = this.hasPeriodicNote(currentDate, 'year');
						const hasWeekNote = this.hasPeriodicNote(currentDate, 'week');

						const shortMonthEl = this.createClickableTitle(shortMonth, currentDate, 'month', hasMonthNote);
						const yearEl = this.createClickableTitle(year.toString(), currentDate, 'year', hasYearNote);

						const endDate = new Date(currentDate);
						endDate.setDate(currentDate.getDate() + 6);
						const endDay = endDate.getDate();
						const weekText = `${day}${date.defaultSeparator}${endDay}`;
						const weekEl = this.createClickableTitle(weekText, currentDate, 'week', hasWeekNote);

						return createElement('span', {},
							shortMonthEl, ' ', weekEl, ', ', yearEl
						);
					}
				},
			},
			weekNumberDidMount: (info) => {
				const weekNumberEl = info.el;
				const periodicNote = this.getPeriodicNote('week', info.date);

				if (periodicNote && weekNumberEl instanceof HTMLAnchorElement) {
					this.enhanceLink(
						weekNumberEl,
						periodicNote.path,
						periodicNote.basename
					)
				} else {
					weekNumberEl.setAttribute('title', 'Click to open weekly note');
					weekNumberEl.addEventListener('click', () => this.openPeriodicNote('week', info.date));
				}
			},
			dayHeaderDidMount: (info) => {
				const headerEl = info.el;
				const link = headerEl.querySelector('a');

				// When in the month grid full calendar will pass in epoch + n days to render the top row, these should
				// not be linked to notes
				const actualDate = dFns.isWithinInterval(
					info.date,
					{
						start: this.calendar?.view?.activeStart!,
						end: this.calendar?.view?.activeEnd!
					}
				);

				if (!actualDate) {
					return;
				}

				const periodicNote = this.getPeriodicNote('day', info.date);

				if (periodicNote && link) {
					this.enhanceLink(
						link,
						periodicNote.path,
						periodicNote.basename
					)
				} else {
					headerEl.style.cursor = 'pointer';
					headerEl.setAttribute('title', 'Click to open daily note');

					headerEl.addEventListener('click', () => {
						this.openPeriodicNote('day', info.date)
					});
				}
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
				if (!sourcePath) return;

				if (sourcePath.startsWith('ics://')) {
					// For ICS events, show the create file modal
					const event: CalendarEvent = {
						title: info.event.title,
						startDate: info.event.start!,
						endDate: info.event.end || undefined,
						description: info.event.extendedProps.description,
						allDay: info.event.allDay,
						sourcePath: sourcePath
					};

					new CreateEventModal(
						this.app,
						event,
						this.plugin.settings.calendarFolder
					).open();
				} else {
					// For local files, open them directly
					const file = this.app.vault.getAbstractFileByPath(sourcePath);
					if (file instanceof TFile) {
						this.app.workspace.getLeaf(false).openFile(file);
					}
				}
			},
			eventDidMount: (info) => {
				const sourcePath = info.event.extendedProps.sourcePath;
				if (!info.event.extendedProps.sourcePath.startsWith("ics")) {
					this.enhanceLink(info.el as HTMLAnchorElement, sourcePath);
				}
			},
			dayCellDidMount: (info) => {
				const dayNumberEl = info.el.querySelector('.fc-daygrid-day-number') as HTMLAnchorElement;
				if (dayNumberEl) {
					const file = this.getPeriodicNote('day', info.date);

					if (file) {
						// Replace the day number with a hoverable link
						const linkEl = dayNumberEl
						linkEl.href = file.path;
						this.enhanceLink(linkEl, file.path, file.basename);
					} else {
						dayNumberEl.setAttribute('title', 'Click to open daily note');
						dayNumberEl.style.cursor = 'pointer';
						dayNumberEl.addEventListener('click', () => this.openPeriodicNote('day', info.date));
					}
				}
			},
			themeSystem: 'standard'
		});

		this.calendar.render();
	}

	private enhanceLink(anchor: HTMLAnchorElement, path: string, label: string | undefined = undefined) {
		anchor.className += ' internal-link data-link-icon data-link-icon-after data-link-text';
		anchor.setAttribute('data-href', path);
		anchor.setAttribute('data-tooltip-position', 'top');
		anchor.setAttribute('aria-label', label ?? path);
		anchor.setAttribute('data-link-path', path);
		anchor.style.setProperty('--data-link-path', path);
		anchor.target = '_blank';
		anchor.rel = 'noopener nofollow';
	}

	private viewType(period: Granularity, kind: 'list' | 'timeGrid' | 'dayGrid') {
		const options: Record<'list' | 'timeGrid' | 'dayGrid', Partial<Record<Granularity, string>>> = {
			dayGrid: {
				day: 'dayGridDay',
				month: 'dayGridMonth',
				year: 'dayGridYear'
			},
			timeGrid: {
				day: 'timeGridDay',
				week: 'timeGridWeek'
			},
			list: {
				day: 'listDay',
				week: 'listWeek',
				month: 'listMonth',
				year: 'listYear'
			}
		};

		return options[kind]?.[period] ?? undefined;
	}
}

import {CalendarEvent, CalendarBlockSettings} from './types';
import {Calendar} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import {App, TFile, Notice, moment} from 'obsidian';
import {createElement, type VNode} from '@fullcalendar/core/preact';
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

	constructor(plugin: CalendarPlugin, container: HTMLElement, events: CalendarEvent[], settings: CalendarBlockSettings) {
		this.plugin = plugin;
		this.container = container;
		this.events = events;
		this.settings = settings;
	}

	private get periodicNotes(): PeriodicNotesPlugin | undefined {
		return this.plugin.periodicNotes;
	}

	private get app(): App {
		return this.plugin.app;
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

	/**
	 * Creates an obsidian internal link which supports page-preview and hover.
	 * */
	private createObsidianLink(path: string, text: string): VNode<any> {
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

	/**
	 * Enhances an existing link to be an Obsidian internal link with support for page-preview and hover.
	 * */
	private enhanceLink(anchor: HTMLAnchorElement, path: string, label: string | undefined = undefined): void {
		anchor.className += ' internal-link data-link-icon data-link-icon-after data-link-text';
		anchor.setAttribute('data-href', path);
		anchor.setAttribute('data-tooltip-position', 'top');
		anchor.setAttribute('aria-label', label ?? path);
		anchor.setAttribute('data-link-path', path);
		anchor.style.setProperty('--data-link-path', path);
		anchor.target = '_blank';
		anchor.rel = 'noopener nofollow';
	}

	private createClickableTitle(text: string, date: Date, type: Granularity) {
		const file = this.getPeriodicNote(type, date);

		if (file) {
			return this.createObsidianLink(file.path, text);
		}

		return createElement('span', {
			className: `clickable-title ${type}`,
			title: `Click to open ${type}ly note`,
			onClick: () => this.openPeriodicNote(type, date)
		}, text);
	}

	private assembleTitle(currentDate: Date, args: (string | [string, Granularity])[]) {
		return args.map(arg => {
			if (typeof arg === 'string') {
				return arg
			} else {
				const [format, granularity] = arg;
				return this.createClickableTitle(dFns.formatDate(currentDate, format), currentDate, granularity)
			}
		})
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
				right: this.settings.views.length > 1 ? this.settings.views.map(x => this.viewType(...x)).filter(Boolean).join(',') : '',
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
						return createElement('span', {}, ...this.assembleTitle(currentDate, [
							['MMMM', 'month'],
							' ',
							['yyyy', 'year']
						]));
					}
				},
				timeGridWeek: {
					// @ts-ignore
					titleFormat: (date) => {
						const currentDate = moment(date.date).toDate();
						const endDate = new Date(currentDate);
						endDate.setDate(currentDate.getDate() + 6);
						const endDay = endDate.getDate();
						const weekText = `${currentDate.getDate()}${date.defaultSeparator}${endDay}`;

						return createElement('span', {}, ...this.assembleTitle(currentDate, [
							['MMM', 'month'],
							' ',
							[weekText, 'week'],
							', ',
							['yyyy', 'year']
						]));
					}
				},
				timeGridDay: {
					// @ts-ignore
					titleFormat: (date) => {
						const currentDate = moment(date.date).toDate();
						return createElement('span', {}, ...this.assembleTitle(currentDate, [
							['MMMM', 'month'],
							' ',
							['dd', 'day'],
							' ',
							['yyyy', 'year']
						]));
					}
				},
				listWeek: {
					// @ts-ignore
					titleFormat: (date) => {
						const currentDate = moment(date.date).toDate();
						return createElement('span', {}, ...this.assembleTitle(currentDate, [
							['MMMM', 'month'],
							' ',
							['dd', 'day'],
							' ',
							['yyyy', 'year']
						]));
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

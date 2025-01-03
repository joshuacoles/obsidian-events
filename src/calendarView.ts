import { CalendarEvent, CalendarBlockSettings } from './types';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { App, TFile } from 'obsidian';

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

    render() {
        // Clear container
        this.container.empty();
        
        // Create calendar container
        const calendarEl = this.container.createEl('div', { cls: 'calendar-container' });
        
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
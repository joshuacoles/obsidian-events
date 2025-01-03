import { CalendarEvent, CalendarBlockSettings } from './types';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

export class CalendarView {
    private container: HTMLElement;
    private events: CalendarEvent[];
    private settings: CalendarBlockSettings;
    private calendar: Calendar | null = null;

    constructor(container: HTMLElement, events: CalendarEvent[], settings: CalendarBlockSettings) {
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
            allDay: !event.endDate // If no end date, treat as all day event
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
            // Add Obsidian-specific styling
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
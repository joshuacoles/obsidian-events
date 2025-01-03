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
            allDay: event.allDay
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
            slotLabelFormat: {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false  // Use 24-hour format
            },
            eventTimeFormat: {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false  // Use 24-hour format
            },
            dayHeaderFormat: {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            },
            titleFormat: {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            },
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
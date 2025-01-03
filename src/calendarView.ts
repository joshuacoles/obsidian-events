import { CalendarEvent, CalendarBlockSettings } from './types';

export class CalendarView {
    private container: HTMLElement;
    private events: CalendarEvent[];
    private settings: CalendarBlockSettings;

    constructor(container: HTMLElement, events: CalendarEvent[], settings: CalendarBlockSettings) {
        this.container = container;
        this.events = events;
        this.settings = settings;
    }

    render() {
        // Clear container
        this.container.empty();
        
        // Add placeholder content for now
        const calendar = this.container.createEl('div', { cls: 'calendar-container' });
        calendar.createEl('p', { text: `Calendar View: ${this.settings.view}` });
        
        // Render mock events
        const eventsList = calendar.createEl('div', { cls: 'calendar-events' });
        this.events.forEach(event => {
            const eventEl = eventsList.createEl('div', { cls: 'calendar-event' });
            eventEl.createEl('strong', { text: event.title });
            eventEl.createEl('span', { text: event.startDate.toLocaleDateString() });
            if (event.description) {
                eventEl.createEl('p', { text: event.description });
            }
        });
    }
} 
import ICAL from 'ical.js';
import { CalendarEvent } from './types';
import { Notice } from 'obsidian';
import * as dFns from 'date-fns';

export class ICSEventSource {
    private url: string;
    private events: CalendarEvent[] = [];
    private lastFetch: Date | null = null;
    private fetchInterval: number = 5 * 60 * 1000; // 5 minutes
    private readonly expandMonths = 6; // How many months of recurring events to expand

    constructor(url: string) {
        this.url = url;
    }

    async getEvents(): Promise<CalendarEvent[]> {
        // Check if we need to refresh the cache
        if (!this.lastFetch || Date.now() - this.lastFetch.getTime() > this.fetchInterval) {
            try {
                await this.fetchEvents();
            } catch (error) {
                console.error('Error fetching ICS events:', error);
                new Notice('Failed to fetch calendar events');
                return this.events; // Return cached events on error
            }
        }
        return this.events;
    }

    private async fetchEvents(): Promise<void> {
        try {
            const response = await fetch(this.url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const icsData = await response.text();
            
            // Parse the ICS data
            const jcalData = ICAL.parse(icsData);
            const comp = new ICAL.Component(jcalData);
            const vevents = comp.getAllSubcomponents('vevent');

            // Calculate the date range for expanding recurring events
            const now = new Date();
            const expandStart = dFns.startOfMonth(now);
            const expandEnd = dFns.addMonths(expandStart, this.expandMonths);

            // Convert to ICAL.Time for comparison
            const rangeStart = ICAL.Time.fromDateTimeString(expandStart.toISOString());
            const rangeEnd = ICAL.Time.fromDateTimeString(expandEnd.toISOString());

            // Process all events
            this.events = vevents.flatMap(vevent => {
                const event = new ICAL.Event(vevent);
                
                // If it's not a recurring event, just convert it directly
                if (!event.isRecurring()) {
                    return [this.convertICALEventToCalendarEvent(event)];
                }

                // For recurring events, expand them within our date range
                const instances: CalendarEvent[] = [];
                const iterator = event.iterator();
                
                // Get the first occurrence
                let next = iterator.next();
                while (next) {
                    // Stop if we're past our range
                    if (next.compare(rangeEnd) > 0) {
                        break;
                    }

                    // Only include events within our range
                    if (next.compare(rangeStart) >= 0) {
                        const instance = event.getOccurrenceDetails(next);
                        
                        // Skip cancelled occurrences
                        if (!instance.item.recurrenceId || !event.isRecurrenceException(instance.item.recurrenceId)) {
                            instances.push(this.convertICALEventToCalendarEvent(instance));
                        }
                    }

                    next = iterator.next();
                }

                return instances;
            });

            this.lastFetch = new Date();
        } catch (error) {
            console.error('Error parsing ICS data:', error);
            throw error;
        }
    }

    private convertICALEventToCalendarEvent(event: ICAL.Event | ICAL.RecurrenceInfo): CalendarEvent {
        let startDate: Date, endDate: Date | undefined, uid: string;

        if (event instanceof ICAL.Event) {
            startDate = event.startDate.toJSDate();
            endDate = event.endDate?.toJSDate();
            uid = event.uid;
        } else {
            // Handle recurrence instance
            startDate = event.startDate.toJSDate();
            endDate = event.endDate?.toJSDate();
            uid = `${event.item.uid}-${event.recurrenceId.toString()}`;
        }

        // Get the event details
        const item = event instanceof ICAL.Event ? event : event.item;
        const isAllDay = event instanceof ICAL.Event ? 
            event.startDate.isDate : 
            event.startDate.isDate;

        return {
            title: item.summary,
            startDate: startDate,
            endDate: endDate,
            description: item.description,
            allDay: isAllDay,
            sourcePath: `ics://${this.url}#${uid}`
        };
    }
}
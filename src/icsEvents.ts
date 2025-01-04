import ICAL from 'ical.js';
import { CalendarEvent } from './types';
import { Notice } from 'obsidian';

export class ICSEventSource {
    private url: string;
    private events: CalendarEvent[] = [];
    private lastFetch: Date | null = null;
    private fetchInterval: number = 5 * 60 * 1000; // 5 minutes

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

            // Convert ICAL events to our format
            this.events = vevents.map(vevent => {
                const event = new ICAL.Event(vevent);
                
                // Get start and end dates
                const startDate = event.startDate.toJSDate();
                const endDate = event.endDate ? event.endDate.toJSDate() : undefined;
                
                // Determine if it's an all-day event
                const isAllDay = event.startDate.isDate; // ICAL.js way to check for all-day events

                return {
                    title: event.summary,
                    startDate: startDate,
                    endDate: endDate,
                    description: event.description,
                    allDay: isAllDay,
                    // Add a special source identifier
                    sourcePath: `ics://${this.url}#${event.uid}`
                };
            });

            this.lastFetch = new Date();
        } catch (error) {
            console.error('Error parsing ICS data:', error);
            throw error;
        }
    }
} 
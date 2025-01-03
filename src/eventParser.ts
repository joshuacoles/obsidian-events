import { CalendarEvent } from './types';

export class EventParser {
    // Mock implementation for now
    static parseEvents(markdown: string): CalendarEvent[] {
        // TODO: Implement actual parsing logic
        return [
            {
                title: "Sample Event",
                startDate: new Date(),
                description: "This is a mock event"
            }
        ];
    }
} 
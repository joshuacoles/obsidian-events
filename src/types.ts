export interface CalendarEvent {
    title: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
    // Add more fields as needed
}

export interface CalendarBlockSettings {
    view: 'month' | 'week' | 'day';
    defaultDate?: string;
    filter?: string;
} 
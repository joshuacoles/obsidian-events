export interface CalendarEvent {
    title: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
    sourcePath?: string;  // Path to the source file
}

export interface CalendarBlockSettings {
    view: 'month' | 'week' | 'day';
    defaultDate?: string;
    filter?: string;
}

export interface EventFileFormat {
    startTime: string;  // ISO8601 date string
    endTime?: string;   // ISO8601 date string
    title?: string;     // Optional title, falls back to filename
    description?: string;
} 
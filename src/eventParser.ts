import {Vault, TFile, App} from 'obsidian';
import { CalendarEvent, EventFileFormat } from './types';
import { z } from 'zod';

// Modern event schema (ISO8601)
const modernEventSchema = z.object({
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "startTime must be a valid ISO8601 date string"
    }),
    endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "endTime must be a valid ISO8601 date string"
    }).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
});

// Legacy timed event schema
const legacyTimedEventSchema = z.object({
    title: z.string().optional(),
    allDay: z.literal(false),
    startTime: z.string().regex(/^\d{1,2}:\d{2}$/, "startTime must be in HH:mm format"),
    endTime: z.string().regex(/^\d{1,2}:\d{2}$/, "endTime must be in HH:mm format").optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be in YYYY-MM-DD format").optional(),
    description: z.string().optional(),
});

// All-day event schema
const allDayEventSchema = z.object({
    title: z.string().optional(),
    allDay: z.literal(true),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be in YYYY-MM-DD format").optional(),
    description: z.string().optional(),
});

export class EventParser {
    /**
     * Parse events from the calendar folder
     */
    static async parseEvents(vault: Vault, calendarFolder: string): Promise<CalendarEvent[]> {
        const events: CalendarEvent[] = [];
        
        try {
            // Get all markdown files in the calendar folder
            const folder = vault.getAbstractFileByPath(calendarFolder);
            if (!folder) {
                console.warn(`Calendar folder "${calendarFolder}" not found`);
                return events;
            }

            const files = vault.getMarkdownFiles()
                .filter(file => file.path.startsWith(calendarFolder + '/'));

            // Process each file
            for (const file of files) {
                try {
                    const event = await this.parseEventFile(vault, file);
                    if (event) {
                        events.push(event);
                    }
                } catch (error) {
                    console.warn(`Error parsing event file ${file.path}:`, error);
                }
            }
        } catch (error) {
            console.error('Error parsing events:', error);
        }

        return events;
    }

    /**
     * Parse a single event file
     */
    private static async parseEventFile(vault: Vault, file: TFile): Promise<CalendarEvent | null> {
        const metadata = ((window as any).app as App).metadataCache.getFileCache(file)?.frontmatter;

        if (!metadata) {
            return null;
        }

        // Try modern format first
        const modernResult = modernEventSchema.safeParse(metadata);
        if (modernResult.success) {
            const data = modernResult.data;
            return {
                title: data.title || file.basename,
                startDate: new Date(data.startTime),
                endDate: data.endTime ? new Date(data.endTime) : undefined,
                description: data.description,
                sourcePath: file.path,
                allDay: false
            };
        }

        // Try all-day event format
        const allDayResult = allDayEventSchema.safeParse(metadata);
        if (allDayResult.success) {
            const data = allDayResult.data;
            // For all-day events, set time to start of day for start date
            const startDate = new Date(data.date);
            startDate.setHours(0, 0, 0, 0);
            
            // For end date, if provided, set time to end of day
            let endDate: Date | undefined;
            if (data.endDate) {
                endDate = new Date(data.endDate);
                endDate.setHours(23, 59, 59, 999);
            }

            return {
                title: data.title || file.basename,
                startDate,
                endDate,
                description: data.description,
                sourcePath: file.path,
                allDay: true
            };
        }

        // If neither modern nor all-day format, try legacy timed format
        const legacyResult = legacyTimedEventSchema.safeParse(metadata);
        if (legacyResult.success) {
            const data = legacyResult.data;
            
            // Combine date and time for start
            const startDate = this.combineDateAndTime(data.date, data.startTime);
            
            // Handle end date/time
            let endDate: Date | undefined;
            if (data.endTime) {
                // If we have both endDate and endTime, use endDate, otherwise use start date
                const baseEndDate = data.endDate ? new Date(data.endDate) : new Date(data.date);
                const [hours, minutes] = data.endTime.split(':').map(Number);
                baseEndDate.setHours(hours, minutes);
                endDate = baseEndDate;
            } else if (data.endDate) {
                // If we only have endDate but no endTime, use the same time as start
                const [startHours, startMinutes] = data.startTime.split(':').map(Number);
                endDate = new Date(data.endDate);
                endDate.setHours(startHours, startMinutes);
            }

            return {
                title: data.title || file.basename,
                startDate,
                endDate,
                description: data.description,
                sourcePath: file.path,
                allDay: false
            };
        }

        // Log all validation failures if no format matches
        console.warn(`Invalid event file ${file.path}:`);
        console.warn('Modern format errors:', modernResult.error.errors);
        console.warn('All-day format errors:', allDayResult.error.errors);
        console.warn('Legacy timed format errors:', legacyResult.error.errors);
        return null;
    }

    /**
     * Combine a date string (YYYY-MM-DD) and time string (HH:mm) into a Date object
     */
    private static combineDateAndTime(dateStr: string, timeStr: string): Date {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(dateStr);
        date.setHours(hours, minutes);
        return date;
    }
} 

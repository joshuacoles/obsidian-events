import {Vault, TFile, App} from 'obsidian';
import { CalendarEvent, EventFileFormat } from './types';
import { z } from 'zod';

// Modern event schema
const modernEventSchema = z.object({
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "startTime must be a valid ISO8601 date string"
    }),
    endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "endTime must be a valid ISO8601 date string"
    }).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
}).strict();

// Legacy event schema
const legacyEventSchema = z.object({
    title: z.string().optional(),
    allDay: z.boolean().optional().default(false),
    startTime: z.string().regex(/^\d{1,2}:\d{2}$/, "startTime must be in HH:mm format"),
    endTime: z.string().regex(/^\d{1,2}:\d{2}$/, "endTime must be in HH:mm format").optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
    description: z.string().optional(),
}).strict();

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
                sourcePath: file.path
            };
        }

        // If modern format fails, try legacy format
        const legacyResult = legacyEventSchema.safeParse(metadata);
        if (legacyResult.success) {
            const data = legacyResult.data;
            
            // Combine date and time for start
            const startDate = this.combineDateAndTime(data.date, data.startTime);
            
            // Combine date and time for end if endTime exists
            const endDate = data.endTime 
                ? this.combineDateAndTime(data.date, data.endTime)
                : undefined;

            return {
                title: data.title || file.basename,
                startDate,
                endDate,
                description: data.description,
                sourcePath: file.path
            };
        }

        // Log both validation failures if neither format matches
        console.warn(`Invalid event file ${file.path}. Modern format errors:`, modernResult.error.errors);
        console.warn(`Legacy format errors:`, legacyResult.error.errors);
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

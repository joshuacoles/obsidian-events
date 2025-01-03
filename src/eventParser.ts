import {Vault, TFile, App} from 'obsidian';
import { CalendarEvent, EventFileFormat } from './types';
import { z } from 'zod';

// Define the Zod schema for event file validation
const eventFileSchema = z.object({
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "startTime must be a valid ISO8601 date string"
    }),
    endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "endTime must be a valid ISO8601 date string"
    }).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
});

export class EventParser {
    /**
     * Parse events from the calendar folder
     * @param vault Obsidian vault
     * @param calendarFolder Path to the calendar folder
     * @returns Array of calendar events
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
     * @param vault Obsidian vault
     * @param file File to parse
     * @returns Calendar event or null if invalid
     */
    private static async parseEventFile(vault: Vault, file: TFile): Promise<CalendarEvent | null> {
		const metadata = ((window as any).app as App).metadataCache.getFileCache(file)?.frontmatter;

		if (!metadata) {
			return null;
		}

		// Validate the metadata using Zod
		const result = eventFileSchema.safeParse(metadata);
		if (!result.success) {
			console.warn(`Invalid event file ${file.path}:`, result.error.errors);
			return null;
		}

		const validatedData = result.data;
		return {
			title: validatedData.title || file.basename,
			startDate: new Date(validatedData.startTime),
			endDate: validatedData.endTime ? new Date(validatedData.endTime) : undefined,
			description: validatedData.description,
			sourcePath: file.path
		};
    }
} 

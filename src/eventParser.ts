import {Vault, TFile, App} from 'obsidian';
import { CalendarEvent, EventFileFormat } from './types';

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

		if (!this.isValidEventFile(metadata)) {
			return null;
		}

		return {
			title: metadata.title || file.basename,
			startDate: new Date(metadata.startTime),
			endDate: metadata.endTime ? new Date(metadata.endTime) : undefined,
			description: metadata.description,
			sourcePath: file.path
		};
    }

    /**
     * Parse YAML string to object
     * @param yaml YAML string to parse
     * @returns Parsed object
     */
    private static parseYaml(yaml: string): any {
        // Simple YAML parser for frontmatter
        // This is a basic implementation - in a real plugin you might want to use a proper YAML parser
        const result: any = {};
        const lines = yaml.split('\n');
        
        for (const line of lines) {
            const match = line.match(/^([^:]+):\s*(.*)$/);
            if (match) {
                const [_, key, value] = match;
                result[key.trim()] = value.trim();
            }
        }
        
        return result;
    }

    /**
     * Type guard for event file format
     * @param obj Object to check
     * @returns Whether the object is a valid event file
     */
    private static isValidEventFile(obj: any): obj is EventFileFormat {
        return obj 
            && typeof obj.startTime === 'string'
            && (!obj.endTime || typeof obj.endTime === 'string')
            && (!obj.title || typeof obj.title === 'string')
            && (!obj.description || typeof obj.description === 'string');
    }
} 

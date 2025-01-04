import {z} from "zod";
import {Granularity} from "./periodicNotes";

export interface CalendarEvent {
	title: string;
	startDate: Date;
	endDate?: Date;
	description?: string;
	sourcePath?: string;  // Path to the source file
	allDay: boolean;      // Whether this is an all-day event
}

export type CalendarViewKind = 'list' | 'dayGrid' | 'timeGrid';

export const calendarBlockOptions =
	// For a periodic note
	z.object({
		fixed: z.boolean(),
		views: z.array(z.union([z.literal('list'), z.literal('dayGrid'), z.literal('timeGrid')]))
	});

export interface CalendarBlockSettings {
	fixed: boolean;
	date: Date;
	showTitle: boolean;
	views: [Granularity, CalendarViewKind][]
}

export interface EventFileFormat {
	startTime: string;  // ISO8601 date string
	endTime?: string;   // ISO8601 date string
	title?: string;     // Optional title, falls back to filename
	description?: string;
}

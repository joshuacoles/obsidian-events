import type {Moment} from "moment";
import {TFile} from "obsidian";

export type Granularity = "day" | "week" | "month" | "quarter" | "year";
export type MatchType = "filename" | "frontmatter" | "date-prefixed";

export interface PeriodicNoteMatchMatchData {
	/* where was the date found */
	matchType: MatchType;
	/* XXX: keep ZK matches in the cache, should this be separate from formats with HH:mm in them? */
	/* just collect this for now, not 100% sure how it will be used. */
	exact: boolean;
	// other ideas of match data:
	// - filename without date (unparsed tokens)
	// - time?: string
}

export interface PeriodicNoteCachedMetadata {
	calendarSet: string;
	filePath: string;
	date: Moment;
	granularity: Granularity;
	canonicalDateStr: string;

	/* "how" the match was made */
	matchData: PeriodicNoteMatchMatchData;
}

export interface PeriodicNotesPlugin {
	openPeriodicNote(granularity: Granularity, date: Moment, opts?: any): Promise<void>;

	getPeriodicNote(granularity: Granularity, date: Moment): TFile | null;

	findInCache(filePath: string): PeriodicNoteCachedMetadata | null
}

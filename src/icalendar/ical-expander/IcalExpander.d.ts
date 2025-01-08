import ICAL from "ical.js";
import { occurrenceDetails } from "ical.js/dist/types/event";

export interface IcalExpanderResults {
	events: ICAL.Event[];
	occurrences: occurrenceDetails[];
}

export interface IcalExpanderOptions {
	ics: string;
	maxIterations?: number;
	skipInvalidDates?: boolean;
}

export class IcalExpander {
	constructor(opts: IcalExpanderOptions)

	between(after?: Date, before?: Date): IcalExpanderResults

	before(before: Date): IcalExpanderResults

	after(after: Date): IcalExpanderResults

	all(): IcalExpanderResults
}

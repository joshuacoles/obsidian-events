import {EventInput, EventSourceFunc, EventSourceInput} from "@fullcalendar/core"
import {App} from "obsidian";
import {EventParser} from "../eventParser";
import {CalendarEvent} from "../types";

export default class CalendarFolderSource {
	private readonly calendarFolder: string;
	private app: App;

	constructor(folder: string, app: App) {
		this.calendarFolder = folder
		this.app = app
	}

	convertEvent(event: CalendarEvent): EventInput {
		return {
			title: event.title,
			start: event.startDate,
			end: event.endDate,
			description: event.description,
			allDay: event.allDay,
			extendedProps: {
				sourcePath: event.sourcePath
			},
			url: event.sourcePath,
		}
	}

	async fetchEvents() {
		const events = await EventParser.parseEvents(this.app.vault, this.calendarFolder);
		return events.map(event => this.convertEvent(event));
	}

	events: EventSourceFunc = (info, successCallback, failureCallback) => {
		this.fetchEvents().then(successCallback, failureCallback);
	}
}

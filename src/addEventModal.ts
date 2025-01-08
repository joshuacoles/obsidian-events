import { App, Modal, Setting, moment, Notice } from "obsidian";
import { EventFileFormat } from "./types";

export class AddEventModal extends Modal {
	private startDate: moment.Moment;
	private endDate: moment.Moment;
	private title: string = "";
	private description: string = "";
	private isAllDay: boolean = false;
	private onSubmit: (event: EventFileFormat) => void;

	constructor(app: App, onSubmit: (event: EventFileFormat) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.startDate = moment().startOf("day");
		this.endDate = moment().startOf("day");
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Add Calendar Event" });

		// Title input
		new Setting(contentEl)
			.setName("Title")
			.setDesc("Enter the event title")
			.addText(text => text
				.setPlaceholder("Event title")
				.onChange(value => this.title = value));

		// All day toggle
		new Setting(contentEl)
			.setName("All Day Event")
			.setDesc("Toggle for all-day event")
			.addToggle(toggle => toggle
				.setValue(this.isAllDay)
				.onChange(value => {
					this.isAllDay = value;
					// Update visibility of time pickers
					const timeInputs = contentEl.querySelectorAll(".time-input");
					timeInputs.forEach(el => {
						(el as HTMLElement).style.display = value ? "none" : "block";
					});
					if (value) {
						// For all-day events, set times to start and end of day
						this.startDate = this.startDate.clone().startOf("day");
						this.endDate = this.endDate.clone().endOf("day");
					}
				}));

		// Start date container
		const startDateContainer = contentEl.createDiv("date-time-container");
		startDateContainer.createEl("h3", { text: "Start" });

		// Start date picker
		new Setting(startDateContainer)
			.setName("Date")
			.addText(text => {
				text.inputEl.type = "date";
				text.setValue(this.startDate.format("YYYY-MM-DD"));
				text.onChange(value => {
					if (this.isAllDay) {
						this.startDate = moment(value).startOf("day");
					} else {
						const time = this.startDate.format("HH:mm");
						this.startDate = moment(value + " " + time, "YYYY-MM-DD HH:mm");
					}
				});
			});

		// Start time picker
		new Setting(startDateContainer)
			.setClass("time-input")
			.setName("Time")
			.addText(text => {
				text.inputEl.type = "time";
				text.setValue(this.startDate.format("HH:mm"));
				text.onChange(value => {
					const date = this.startDate.format("YYYY-MM-DD");
					this.startDate = moment(date + " " + value, "YYYY-MM-DD HH:mm");
				});
			});

		// End date container
		const endDateContainer = contentEl.createDiv("date-time-container");
		endDateContainer.createEl("h3", { text: "End" });

		// End date picker
		new Setting(endDateContainer)
			.setName("Date")
			.addText(text => {
				text.inputEl.type = "date";
				text.setValue(this.endDate.format("YYYY-MM-DD"));
				text.onChange(value => {
					if (this.isAllDay) {
						this.endDate = moment(value).endOf("day");
					} else {
						const time = this.endDate.format("HH:mm");
						this.endDate = moment(value + " " + time, "YYYY-MM-DD HH:mm");
					}
				});
			});

		// End time picker
		new Setting(endDateContainer)
			.setClass("time-input")
			.setName("Time")
			.addText(text => {
				text.inputEl.type = "time";
				text.setValue(this.endDate.format("HH:mm"));
				text.onChange(value => {
					const date = this.endDate.format("YYYY-MM-DD");
					this.endDate = moment(date + " " + value, "YYYY-MM-DD HH:mm");
				});
			});

		// Description
		new Setting(contentEl)
			.setName("Description")
			.setDesc("Enter event description (optional)")
			.addTextArea(text => {
				text.setPlaceholder("Event description");
				text.inputEl.rows = 4;
				text.onChange(value => this.description = value);
			});

		// Submit button
		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText("Add Event")
				.setCta()
				.onClick(() => {
					if (!this.validateInput()) {
						return;
					}

					// Generate filename based on start date and title
					const fileDate = this.startDate.format("YYYY-MM-DD");
					const safeTitle = this.title.replace(/[^a-zA-Z0-9]/g, "-");
					const filename = `${fileDate}-${safeTitle}`;

					let event: any;
					if (this.isAllDay) {
						event = {
							title: this.title,
							allDay: true,
							date: this.startDate.format("YYYY-MM-DD"),
							endDate: this.endDate.format("YYYY-MM-DD")
						};
					} else {
						event = {
							startTime: this.startDate.toISOString(),
							endTime: this.endDate.toISOString(),
							title: this.title
						};
					}

					if (this.description) {
						event.description = this.description;
					}

					this.onSubmit(event);
					this.close();
				}));

		// Add some CSS for the date-time containers
		contentEl.createEl("style", {
			text: `
                .date-time-container {
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 4px;
                    padding: 10px;
                    margin: 10px 0;
                }
                .date-time-container h3 {
                    margin: 0 0 10px 0;
                    font-size: 1em;
                    color: var(--text-muted);
                }
            `
		});
	}

	private validateInput(): boolean {
		if (!this.title) {
			new Notice("Title is required");
			return false;
		}

		if (this.endDate.isBefore(this.startDate)) {
			new Notice("End time must be after start time");
			return false;
		}

		return true;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
} 

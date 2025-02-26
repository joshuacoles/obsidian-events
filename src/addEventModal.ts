import { App, Modal, Setting, moment, Notice } from "obsidian";
import { EventFileFormat } from "./types";
import * as dFns from 'date-fns';

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
		this.startDate = moment(dFns.addHours(dFns.startOfHour(new Date()), 1));
		this.endDate = moment(dFns.addHours(dFns.startOfHour(new Date()), 2));
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Add Calendar Event" });

		// Title input
		new Setting(contentEl)
			.setName("Title")
			.addText(text => text
				.setPlaceholder("Event title")
				.onChange(value => this.title = value));

		// All day toggle
		new Setting(contentEl)
			.setName("All Day Event")
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
						this.startDate = this.startDate.clone().startOf("day");
						this.endDate = this.endDate.clone().endOf("day");
					}
				}));

		// Date and time container
		const dateTimeContainer = contentEl.createDiv("date-time-container");
		
		// Start date and time
		const startRow = dateTimeContainer.createDiv("date-time-row");
		startRow.createEl("span", { text: "Start:", cls: "date-time-label" });
		
		const startDateEl = startRow.createDiv("date-input");
		new Setting(startDateEl).addText(text => {
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
		
		const startTimeEl = startRow.createDiv("time-input");
		new Setting(startTimeEl).addText(text => {
			text.inputEl.type = "time";
			text.setValue(this.startDate.format("HH:mm"));
			text.onChange(value => {
				const date = this.startDate.format("YYYY-MM-DD");
				this.startDate = moment(date + " " + value, "YYYY-MM-DD HH:mm");
			});
		});

		// End date and time
		const endRow = dateTimeContainer.createDiv("date-time-row");
		endRow.createEl("span", { text: "End:", cls: "date-time-label" });
		
		const endDateEl = endRow.createDiv("date-input");
		new Setting(endDateEl).addText(text => {
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
		
		const endTimeEl = endRow.createDiv("time-input");
		new Setting(endTimeEl).addText(text => {
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
			.addTextArea(text => {
				text.setPlaceholder("Event description (optional)");
				text.inputEl.rows = 3;
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

		// Add CSS for the streamlined layout
		contentEl.createEl("style", {
			text: `
                .date-time-container {
                    margin: 10px 0;
                }
                .date-time-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 8px;
                    justify-content: space-between;
                }
                .date-time-label {
                    width: 45px;
                    font-weight: 500;
                    margin-right: auto;
                }
                .date-input, .time-input {
                    margin-left: 8px;
                }
                .date-input .setting-item, .time-input .setting-item {
                    padding: 0;
                    border: none;
                }
                .date-input .setting-item-control, .time-input .setting-item-control {
                    padding: 0;
                }
                .setting-item {
                    border-top: 1px solid var(--background-modifier-border);
                    padding: 12px 0;
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

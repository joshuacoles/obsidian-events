import { App, Modal, Setting, TFile } from "obsidian";
import { CalendarEvent } from "./types";
import * as dFns from "date-fns";

export class CreateEventModal extends Modal {
	private event: CalendarEvent;
	private folderPath: string;

	constructor(app: App, event: CalendarEvent, folderPath: string) {
		super(app);
		this.event = event;
		this.folderPath = folderPath;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Create Event File" });

		// Show event details
		new Setting(contentEl)
			.setName("Title")
			.addText(text => text
				.setValue(this.event.title)
				.setDisabled(true));

		new Setting(contentEl)
			.setName("Start")
			.addText(text => text
				.setValue(dFns.format(this.event.startDate, "yyyy-MM-dd HH:mm"))
				.setDisabled(true));

		if (this.event.endDate) {
			new Setting(contentEl)
				.setName("End")
				.addText(text => text
					.setValue(dFns.format(this.event.endDate!, "yyyy-MM-dd HH:mm"))
					.setDisabled(true));
		}

		if (this.event.description) {
			new Setting(contentEl)
				.setName("Description")
				.addTextArea(text => text
					.setValue(this.event.description || "")
					.setDisabled(true));
		}

		// Add buttons
		const buttonDiv = contentEl.createDiv("modal-button-container");
		buttonDiv.style.display = "flex";
		buttonDiv.style.justifyContent = "flex-end";
		buttonDiv.style.gap = "10px";
		buttonDiv.style.marginTop = "20px";

		const cancelButton = buttonDiv.createEl("button", { text: "Cancel" });
		cancelButton.addEventListener("click", () => this.close());

		const createButton = buttonDiv.createEl("button", {
			cls: "mod-cta",
			text: "Create File"
		});
		createButton.addEventListener("click", () => this.createEventFile());
	}

	async createEventFile() {
		try {
			// Ensure calendar folder exists
			const folder = this.app.vault.getAbstractFileByPath(this.folderPath);
			if (!folder) {
				await this.app.vault.createFolder(this.folderPath);
			}

			// Generate filename from date and title
			const safeTitle = this.event.title.replace(/[^a-zA-Z0-9]/g, "-");
			const date = dFns.format(this.event.startDate, "yyyy-MM-dd");
			const filename = `${date} ${safeTitle}`;

			// Extract ICS event ID if it exists
			const icsId = this.event.sourcePath?.startsWith("ics://")
				? this.event.sourcePath.split("#")[1]
				: undefined;

			// Create frontmatter
			const frontmatter = {
				title: this.event.title,
				startTime: dFns.format(this.event.startDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
				...(this.event.endDate && {
					endTime: dFns.format(this.event.endDate, "yyyy-MM-dd'T'HH:mm:ssXXX")
				}),
				...(this.event.allDay ? { allDay: this.event.allDay } : {}),
				...(this.event.description && { description: this.event.description }),
				...(icsId && {
					icsId: icsId,
					// If this is a recurring event instance, store both the base event ID and the instance ID
					...(icsId.includes("-") && {
						icsBaseEventId: icsId.split("-")[0],
						icsInstanceId: icsId.split("-")[1]
					})
				})
			};

			// Create file content
			const content = [
				"---",
				...Object.entries(frontmatter).map(([key, value]) => {
					if (typeof value === "string" && value.includes("\n")) {
						// Multi-line strings need to be properly formatted
						return `${key}: |\n  ${value.split("\n").join("\n  ")}`;
					}
					return `${key}: ${JSON.stringify(value)}`;
				}),
				"---",
				"",
				this.event.description || ""
			].join("\n");

			// Create the file
			const filePath = `${this.folderPath}/${filename}.md`;
			const file = await this.app.vault.create(filePath, content);

			// Open the newly created file
			await this.app.workspace.getLeaf(false).openFile(file);

			this.close();
		} catch (error) {
			console.error("Error creating event file:", error);
			// Re-throw to be handled by caller
			throw error;
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
} 

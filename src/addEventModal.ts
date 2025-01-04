import { App, Modal, Setting, moment } from 'obsidian';
import { EventFileFormat } from './types';

export class AddEventModal extends Modal {
    private startDate: moment.Moment;
    private endDate: moment.Moment | null = null;
    private title: string = '';
    private description: string = '';
    private onSubmit: (event: EventFileFormat) => void;

    constructor(app: App, onSubmit: (event: EventFileFormat) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.startDate = moment();
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Add Calendar Event' });

        // Title input
        new Setting(contentEl)
            .setName('Title')
            .setDesc('Enter the event title')
            .addText(text => text
                .setPlaceholder('Event title')
                .onChange(value => this.title = value));

        // Start date container
        const startDateContainer = contentEl.createDiv('date-time-container');
        startDateContainer.createEl('h3', { text: 'Start Time' });

        // Start date picker
        new Setting(startDateContainer)
            .setName('Date')
            .addText(text => {
                text.inputEl.type = 'date';
                text.setValue(this.startDate.format('YYYY-MM-DD'));
                text.onChange(value => {
                    const time = this.startDate.format('HH:mm');
                    this.startDate = moment(value + ' ' + time, 'YYYY-MM-DD HH:mm');
                });
            });

        // Start time picker
        new Setting(startDateContainer)
            .setName('Time')
            .addText(text => {
                text.inputEl.type = 'time';
                text.setValue(this.startDate.format('HH:mm'));
                text.onChange(value => {
                    const date = this.startDate.format('YYYY-MM-DD');
                    this.startDate = moment(date + ' ' + value, 'YYYY-MM-DD HH:mm');
                });
            });

        // End date toggle and container
        const endDateToggle = new Setting(contentEl)
            .setName('Add End Time')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(value => {
                    endDateContainer.style.display = value ? 'block' : 'none';
                    if (value && !this.endDate) {
                        this.endDate = this.startDate.clone().add(1, 'hour');
                    } else if (!value) {
                        this.endDate = null;
                    }
                }));

        // End date container
        const endDateContainer = contentEl.createDiv('date-time-container');
        endDateContainer.style.display = 'none';
        endDateContainer.createEl('h3', { text: 'End Time' });

        // End date picker
        new Setting(endDateContainer)
            .setName('Date')
            .addText(text => {
                text.inputEl.type = 'date';
                text.setValue(this.startDate.format('YYYY-MM-DD'));
                text.onChange(value => {
                    if (this.endDate) {
                        const time = this.endDate.format('HH:mm');
                        this.endDate = moment(value + ' ' + time, 'YYYY-MM-DD HH:mm');
                    }
                });
            });

        // End time picker
        new Setting(endDateContainer)
            .setName('Time')
            .addText(text => {
                text.inputEl.type = 'time';
                text.setValue(this.startDate.clone().add(1, 'hour').format('HH:mm'));
                text.onChange(value => {
                    if (this.endDate) {
                        const date = this.endDate.format('YYYY-MM-DD');
                        this.endDate = moment(date + ' ' + value, 'YYYY-MM-DD HH:mm');
                    }
                });
            });

        // Description
        new Setting(contentEl)
            .setName('Description')
            .setDesc('Enter event description (optional)')
            .addTextArea(text => {
                text.setPlaceholder('Event description');
                text.inputEl.rows = 4;
                text.onChange(value => this.description = value);
            });

        // Submit button
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Add Event')
                .setCta()
                .onClick(() => {
                    if (!this.validateInput()) {
                        return;
                    }

                    const event: EventFileFormat = {
                        startTime: this.startDate.toISOString(),
                        title: this.title,
                    };

                    if (this.endDate) {
                        event.endTime = this.endDate.toISOString();
                    }

                    if (this.description) {
                        event.description = this.description;
                    }

                    this.onSubmit(event);
                    this.close();
                }));

        // Add some CSS for the date-time containers
        contentEl.createEl('style', {
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
            // @ts-ignore
            new Notice('Title is required');
            return false;
        }

        if (this.endDate && this.endDate.isBefore(this.startDate)) {
            // @ts-ignore
            new Notice('End time must be after start time');
            return false;
        }

        return true;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 
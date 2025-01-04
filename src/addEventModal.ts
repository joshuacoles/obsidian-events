import { App, Modal, Setting } from 'obsidian';
import { EventFileFormat } from './types';

export class AddEventModal extends Modal {
    private startTime: string = '';
    private endTime: string = '';
    private title: string = '';
    private description: string = '';
    private onSubmit: (event: EventFileFormat) => void;

    constructor(app: App, onSubmit: (event: EventFileFormat) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Add Calendar Event' });

        new Setting(contentEl)
            .setName('Title')
            .addText(text => text
                .setPlaceholder('Event title')
                .onChange(value => this.title = value));

        new Setting(contentEl)
            .setName('Start Time')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD HH:mm')
                .setValue(this.formatCurrentDateTime())
                .onChange(value => this.startTime = value));

        new Setting(contentEl)
            .setName('End Time')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD HH:mm (optional)')
                .onChange(value => this.endTime = value));

        new Setting(contentEl)
            .setName('Description')
            .addTextArea(text => text
                .setPlaceholder('Event description (optional)')
                .onChange(value => this.description = value));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Add Event')
                .setCta()
                .onClick(() => {
                    if (!this.validateInput()) {
                        return;
                    }

                    const event: EventFileFormat = {
                        startTime: new Date(this.startTime).toISOString(),
                        title: this.title,
                    };

                    if (this.endTime) {
                        event.endTime = new Date(this.endTime).toISOString();
                    }

                    if (this.description) {
                        event.description = this.description;
                    }

                    this.onSubmit(event);
                    this.close();
                }));
    }

    private formatCurrentDateTime(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    private validateInput(): boolean {
        if (!this.title) {
            // @ts-ignore
            new Notice('Title is required');
            return false;
        }

        if (!this.startTime || isNaN(Date.parse(this.startTime))) {
            // @ts-ignore
            new Notice('Valid start time is required');
            return false;
        }

        if (this.endTime && isNaN(Date.parse(this.endTime))) {
            // @ts-ignore
            new Notice('End time must be a valid date/time');
            return false;
        }

        return true;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 
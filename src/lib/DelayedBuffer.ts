class DelayedBuffer {
    private buffer: string[];
    private callback: (data: string) => void;
    private delay: number;
    private timerId: NodeJS.Timeout | null;
    private first: boolean;

    constructor(callback: (data: string) => Promise<void>, delay: number) {
        this.buffer = [];
        this.callback = callback;
        this.delay = delay;
        this.timerId = null;
        this.first = true;
    }

    addData(data: string) {
        this.buffer.push(data);

        // If this is the first piece of data being added
        if (this.first) {
            this.first = false;
            this.startTimer();
        } else if (!this.timerId) {
            // If there is no ongoing delay, execute the callback immediately.
            this.callback(this.buffer.shift()!);
        }
    }

    private startTimer() {
        this.timerId = setTimeout(() => {
            this.emptyBuffer();
        }, this.delay);
    }

    private async emptyBuffer() {
        while (this.buffer.length > 0) {
            const data = this.buffer.shift()!;
            this.callback(data);
            await new Promise(resolve => setTimeout(resolve, 35));
        }

        // Clear the timer.
        this.timerId = null;
    }

    reset() {
        this.buffer = [];
        this.first = true;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }
}

export default DelayedBuffer;

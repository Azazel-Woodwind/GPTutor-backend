class DelayedBuffer {
    private buffer: string[] = [];
    private timerId?: NodeJS.Timeout;
    private first: boolean = true;
    private emptying: boolean = false;

    constructor(
        private callback: (data: string) => Promise<void>,
        private delay: number = 0,
        private speed: number = 0
    ) {}

    async addData(data: string) {
        this.buffer.push(data);

        // If this is the first piece of data being added
        if (this.first) {
            this.first = false;
            this.startTimer();
        } else if (!this.timerId) {
            // If there is no ongoing delay, execute the callback immediately.
            if (!this.emptying) {
                this.emptyBuffer();
            }
            // this.callback(this.buffer.shift()!);
        }
    }

    private startTimer() {
        this.timerId = setTimeout(() => {
            this.emptyBuffer();
        }, this.delay);
    }

    private async emptyBuffer() {
        this.emptying = true;
        while (this.buffer.length > 0) {
            const data = this.buffer[0];
            this.callback(data);
            await new Promise(resolve => setTimeout(resolve, 35));
            this.buffer.shift()!;
        }

        // Clear the timer.
        this.timerId = undefined;

        this.emptying = false;
    }

    reset() {
        this.buffer = [];
        this.first = true;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = undefined;
        }
    }
}

export default DelayedBuffer;

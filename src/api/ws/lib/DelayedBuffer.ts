/**
 * A class that buffers data and executes a callback on the data in the order it was added after a delay.
 */
class DelayedBuffer {
    private buffer: string[] = [];
    private timerId?: NodeJS.Timeout;
    private first: boolean = true;
    private emptying: boolean = false;

    /**
     *
     * @param callback - The callback to execute on the data.
     * @param delay - The delay to wait before beginning to execute the callback on the data in the buffer.
     */
    constructor(
        private callback: (data: any) => any,
        private delay: number = 0
    ) {}

    /**
     * Adds data to the buffer. Starts the timer if this is the first piece of data being added.
     *
     * @param data - The data to add to the buffer.
     */
    async addData(data: any) {
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

    /**
     * Starts the timer to execute the callback on the data in the buffer.
     */
    private startTimer() {
        this.timerId = setTimeout(() => {
            this.emptyBuffer();
        }, this.delay);
    }

    /**
     * Executes the callback on all the data in the buffer.
     */
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

type ConstructorParams = {
    callback: (data: any) => void;
};

/**
 * A class that allows you to execute a callback on data with a predefined order,
 * regardless of the order in which the data is received.
 */
class OrderMaintainer {
    nextSentenceNumber: number;
    buffer: Map<number, any>;
    callback: (data: any) => void;

    /**
     * @constructor
     * @param callback - The callback to execute on the data.
     */
    constructor({ callback }: ConstructorParams) {
        this.nextSentenceNumber = 0;
        this.buffer = new Map();
        this.callback = callback;
    }

    /**
     * Adds data to the buffer. Executes the callback if the data is next in line.
     * Then executes the callback on all the following data in line in the buffer.
     * Otherwise, adds the data to the buffer.
     * @param data - The data to add to the buffer.
     * @param order - The order of the data.
     */
    addData(data: any, order: number) {
        // console.log(order, this.nextSentenceNumber);
        if (order === this.nextSentenceNumber) {
            this.callback(data);
            this.nextSentenceNumber++;
            while (this.buffer.has(this.nextSentenceNumber)) {
                this.callback(this.buffer.get(this.nextSentenceNumber));
                this.nextSentenceNumber++;
            }
        } else {
            this.buffer.set(order, data);
        }
    }

    reset() {
        this.nextSentenceNumber = 0;
        this.buffer = new Map();
    }
}

export default OrderMaintainer;

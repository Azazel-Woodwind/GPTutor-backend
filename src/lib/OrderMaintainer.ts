type ConstructorParams = {
    callback: (data: any) => void;
};
class OrderMaintaier {
    nextSentenceNumber: number;
    buffer: Map<number, any>;
    callback: (data: any) => void;

    constructor({ callback }: ConstructorParams) {
        this.nextSentenceNumber = 0;
        this.buffer = new Map();
        this.callback = callback;
    }

    addData(data: any, order: number) {
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

export default OrderMaintaier;

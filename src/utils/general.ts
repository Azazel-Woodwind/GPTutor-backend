export const commaSeparate = (list: string[]) => {
    if (list.length === 1) return list[0];

    const last = list.pop()!;
    return `${list.join(", ")} and ${last}`;
};

export const getRandomNumberBetween = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

export const containsSentenceEnder = (text: string) =>
    ["\n", ".", "?", "!"].some(char => text.includes(char));

/**
 * Yields the next value in a readable stream.
 *
 * @param stream - The stream to iterate over.
 * @yields - The next value in the stream.
 */
export async function* streamAsyncIterable<T>(stream: ReadableStream<T>) {
    const reader = stream.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                return;
            }
            yield value;
        }
    } finally {
        reader.releaseLock();
    }
}

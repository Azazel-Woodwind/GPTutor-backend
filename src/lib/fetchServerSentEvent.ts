import { createParser } from "eventsource-parser";
import { streamAsyncIterable } from "../utils/general";
/**
 * Fetches a Server-Sent Event stream and parses it. Attempts a maximum of 3 times.
 * @param url The URL to fetch.
 * @param options The options to pass to `fetch`.
 * @returns The response.
 * @throws {Error} If the request fails.
 */
export async function fetchSSE(
    url: string,
    options: Parameters<typeof fetch>[1] & {
        onMessage: (data: string) => void;
        updateAbortController?: (
            fetchOptions: Parameters<typeof fetch>[1]
        ) => void;
        abort?: (reason?: string) => void;
    }
) {
    const { onMessage, updateAbortController, abort, ...fetchOptions } =
        options;

    let res: Response | undefined;
    let count = 0;
    while (1) {
        if (count === 3) {
            throw new Error("Failed to fetch: too many attempts");
        }
        let timeout: NodeJS.Timeout;

        // update abort controller as they can only be used once per request
        if (updateAbortController && abort) {
            updateAbortController(fetchOptions);
            timeout = setTimeout(() => {
                abort("timeout");
            }, 4000);
        } else {
            const abortController = new AbortController();

            fetchOptions.signal = abortController.signal;

            timeout = setTimeout(() => {
                abortController.abort("timeout");
            }, 4000);
        }

        try {
            res = await fetch(url, fetchOptions);
        } catch (error: any) {
            console.log("FETCH ERROR:", error);
            console.log("ERROR NAME:", error.name);
            if (fetchOptions.signal?.aborted) {
                // if the request was aborted
                if (fetchOptions.signal.reason === "timeout") {
                    // due to a timeout
                    console.log("REQUEST TIMEOUT, TRYING AGAIN");
                    count++;
                    continue; // try again
                } else {
                    throw new Error("Failed to fetch: aborted");
                }
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }

        if (res.ok) {
            break;
        }

        if (!res.ok) {
            let reason: string;

            try {
                reason = await res.text();
            } catch (err) {
                reason = res.statusText;
            }

            throw new Error(`Failed to fetch ${res.status}: ${reason}`);
        }
    }

    // creates a parser for server events and calls the onMessage callback with the event data
    const parser = createParser(event => {
        if (event.type === "event") {
            onMessage(event.data);
        }
    });

    // loop thorugh the chunks from the server stream and feed them to the parser
    for await (const chunk of streamAsyncIterable(res!.body!)) {
        const str = new TextDecoder().decode(chunk);
        parser.feed(str);
    }

    // console.log("REAL RESPONSE:", res);

    return res;
}

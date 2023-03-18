const { ChatGPTConversation } = require("./utils/chatgpt.utils.");

async function main() {
    const chatgpt = new ChatGPTConversation({
        chatHistory: [
            { role: "system", content: "You are a helpful assistant" },
        ],
    });
    chatgpt.messageEmitter.on(
        "message",
        (data) => data && process.stdout.write(data)
    );
    chatgpt.generateChatCompletion((res) => "");
}

main();

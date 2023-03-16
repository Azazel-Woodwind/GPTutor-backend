const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
console.log(process.env.OPENAI_API_KEY)

async function getJsonData(chatHistory, systemPrompt) {
    // const newSystemPrompt = `
    // This is a conversation between X and a student, this is who X is:
    // ${systemPrompt};

    // `
    // modifiedChatHistory = 
    // const systemMessage = `
    // Return a valid JSON object which contains the keys "learningObjective", and "finished".
    // The value of "learningObjective" is the number of learning objective of the next message from the assistant. 
    // The value of 'finished' is a boolean which is true if the conversation will end in the next message from the assistant.
    // `
    if(chatHistory.length == 1) return { finished: false, learningObjective: -1}
    const systemMessage = `
    Return ONLY a JSON object which contains a key named 'learningObjective' whose content is the current learning objective number or -1 if no learning objective is being currently discussed and a key named 'finished' whose content is a boolean which is true if your response is the final message of the lesson and false if not.
    `
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo", 
        messages: [...chatHistory, { role: "system", content: systemMessage}],
    });
    
    var dataString = completion.data.choices[0].message.content;
    console.log("Json data:", dataString);


    while (dataString.charAt(0) !== '{') {
        dataString = dataString.slice(1);
    }
    while (dataString.charAt(dataString.length - 1) !== '}') {
        dataString = dataString.slice(0, dataString.length - 1);
    }

    return JSON.parse(dataString.replaceAll("'", '"'));
}

async function getChatCompletion(chatHistory, systemPrompt){
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
    });
    
    return completion.data.choices[0].message;
}

async function generateChatCompletion(chatHistory, systemPrompt) {
    // const data = await Promise.all([getJsonData(chatHistory, systemPrompt), getChatCompletion(chatHistory, systemPrompt)])
    const completion = await getChatCompletion(chatHistory, systemPrompt);
    chatHistory.push(completion);
    const json = await getJsonData(chatHistory, systemPrompt);

    console.log(completion, json);
    // console.log(data);
    return {
        ...json,
        response: completion.content
    };
}

module.exports = {
    generateChatCompletion,
};

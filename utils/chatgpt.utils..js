const { Configuration, OpenAIApi } = require("openai");
const {getJsonDataPrompt} = require("./data/prompts")

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
console.log(process.env.OPENAI_API_KEY)

async function getJsonData(chatHistory, systemPrompt) {
    if(chatHistory.length == 1) return { finished: false, learningObjective: -1}

    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo", 
        messages: [...chatHistory, { role: "system", content: getJsonDataPrompt}],
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

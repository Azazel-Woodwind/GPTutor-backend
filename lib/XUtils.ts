// @ts-nocheck

import supabase from "../config/supa";
import ChatGPTConversation from "./ChatGPTConversation";

export async function exceededTokenQuota(id, limit) {
    const { data: user, error } = await supabase
        .from("users")
        .select("daily_token_usage")
        .eq("id", id)
        .single();
    if (error) throw new Error("Couldn't get student data");
    //This will use the students total quota
    return user.daily_token_usage >= limit;
}

export async function incrementUsage(id, delta) {
    const { error } = await supabase.rpc("increment_usage", {
        user_id: id,
        delta,
    });
    if (error) throw new Error("Couldn't update usage");
}

export function findJsonInString(content) {
    let dataString = content;
    // console.log("Json data:", dataString, "end of json data");

    let startingIndex = 0;
    let endingIndex = dataString.length;
    while (
        startingIndex < endingIndex &&
        dataString.charAt(startingIndex) !== "{"
    ) {
        startingIndex++;
    }

    while (
        startingIndex < endingIndex &&
        dataString.charAt(endingIndex - 1) !== "}"
    ) {
        endingIndex--;
    }

    const jsonString = dataString.substring(startingIndex, endingIndex);

    if (jsonString.length == 0) return null;
    let isValidJson = true,
        json;
    try {
        json = JSON.parse(jsonString);
    } catch (e) {
        isValidJson = false;
    }
    if (!isValidJson) return null;

    return json;
}

export async function getJsonData(dataPrompt, chat, socket) {
    const heavyPrompt = `
    Here is a conversation between a ChatGPT AI and a human:

    ${JSON.stringify(chat.chatHistory.slice(1))}

    Your task is to return JSON data based on these instructions:
    ${dataPrompt}
    `;

    console.log(dataPrompt);

    const tempChat = new ChatGPTConversation({
        socket,
        heavyPrompt,
    });

    const json = await tempChat.getData();

    return json;
}

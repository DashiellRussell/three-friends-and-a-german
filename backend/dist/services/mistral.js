"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeDocument = exports.mistral = void 0;
exports.embedText = embedText;
exports.extractCheckinData = extractCheckinData;
exports.generateConversationContext = generateConversationContext;
exports.generateChatOpener = generateChatOpener;
exports.generateChatReply = generateChatReply;
const mistralai_1 = require("@mistralai/mistralai");
const zod_1 = require("zod");
let _client;
function getMistral() {
    if (!_client) {
        _client = new mistralai_1.Mistral({ apiKey: process.env.MISTRAL_API_KEY });
    }
    return _client;
}
/** Lazy-initialized Mistral client — use for direct API calls */
exports.mistral = new Proxy({}, {
    get: (_, prop) => getMistral()[prop],
});
async function embedText(text) {
    const result = await getMistral().embeddings.create({
        model: "mistral-embed",
        inputs: [text],
    });
    const embedding = result.data[0].embedding;
    if (!embedding)
        throw new Error("Mistral returned no embedding");
    return embedding;
}
const CheckInSchema = zod_1.z.object({
    summary: zod_1.z.string(),
    mood: zod_1.z.string().nullable(),
    energy: zod_1.z.number().int().min(1).max(10).nullable(),
    food: zod_1.z.string().nullable().optional(),
    sleep_hours: zod_1.z.number().nullable(),
    notes: zod_1.z.string().nullable(),
    flagged: zod_1.z.boolean(),
    flag_reason: zod_1.z.string().nullable(),
});
async function extractCheckinData(transcript) {
    const client = getMistral();
    const response = await client.chat.parse({
        model: "mistral-large-latest",
        messages: [
            {
                role: "system",
                content: `You are a health data extraction assistant. Given a voice check-in transcript, extract structured health data.
        
The summary will be sent to a text embedding model to power future health analytics and pattern recognition. Cover the following topics if mentioned: symptoms, mood, energy levels, food intake, sleep, and any other health-related observations. Be concise but informative.

- summary: 4-6 sentence clean summary of the person's health today
- mood: one word or short phrase e.g. "anxious", "good", "tired", null if not mentioned
- energy: integer 1-10, null if not mentioned
- food: brief description of what they ate today, null if not mentioned
- sleep_hours: number, null if not mentioned
- notes: any additional health observations worth noting, null if none
- flagged: true if any concerning symptoms are mentioned, otherwise false
- flag_reason: reason for flagging, null if not flagged`,
            },
            {
                role: "user",
                content: transcript,
            },
        ],
        responseFormat: CheckInSchema,
    });
    const parsed = response.choices?.[0]?.message?.parsed;
    if (!parsed)
        throw new Error("Mistral returned no structured output");
    const validated = CheckInSchema.parse(parsed);
    return validated;
}
async function generateConversationContext(checkIns) {
    const client = getMistral();
    const response = await client.chat.complete({
        model: "mistral-large-latest",
        messages: [
            {
                role: "system",
                content: `You are generating a system prompt for a conversational health AI assistant. 
        
Your output will be injected directly as a system prompt into a voice-based AI that is about to start a daily health check-in conversation with the user.

The system prompt you write should:
- Be written in second person, addressing the conversational AI (e.g. "The user has been..." or "You know that...")
- Give the AI enough context to open the conversation naturally and personally, referencing specific recent events (e.g. "You know the user had a headache 3 days ago and was low energy yesterday")
- Use natural relative time references like "this morning", "yesterday", "3 days ago", "last Friday" — never raw dates
- Highlight any patterns, recurring symptoms, or notable changes across the week
- Flag anything concerning so the AI can gently follow up
- Be concise — this is a system prompt, not an essay. Aim for 150-250 words.
- Do NOT invent information not present in the check-in data`,
            },
            {
                role: "user",
                content: `Today's date and time: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}

Here are the user's check-ins from the past 7 days, from oldest to most recent:

${checkIns
                    .map(({ date, data }) => `[${date}]
- Summary: ${data.summary}
- Mood: ${data.mood ?? "not recorded"}
- Energy: ${data.energy ?? "not recorded"}/10
- Sleep: ${data.sleep_hours ?? "not recorded"} hours
- Notes: ${data.notes ?? "none"}
- Flagged: ${data.flagged ? `Yes — ${data.flag_reason}` : "No"}`)
                    .join("\n\n")}

Write a system prompt for the conversational AI that will speak with this user right now.`,
            },
        ],
    });
    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string")
        throw new Error("Mistral returned no context summary");
    return content;
}
const summarizeDocument = async (text) => {
    const client = getMistral();
    const response = await client.chat.complete({
        model: "mistral-large-latest",
        messages: [
            {
                role: "system",
                content: `You are a medical document summarization assistant.

Given the full text of a medical document, produce a concise summary that captures the key information a patient would want to remember. Focus on symptoms, diagnoses, treatments, and any follow-up instructions. Write in clear, simple language suitable for a general audience. Aim for 3-5 sentences.`,
            },
            {
                role: "user",
                content: text,
            },
        ],
    });
    const summary = response.choices?.[0]?.message?.content;
    if (!summary || typeof summary !== "string")
        throw new Error("Mistral returned no summary");
    return summary;
};
exports.summarizeDocument = summarizeDocument;
async function generateChatOpener(systemPrompt) {
    console.log("Generating chat opener with system prompt:", systemPrompt);
    const client = getMistral();
    const response = await client.chat.complete({
        model: "mistral-large-latest",
        messages: [
            {
                role: "system",
                content: systemPrompt,
            },
            { role: "user", content: "__start__" }, // triggers the AI to speak first
        ],
    });
    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string")
        throw new Error("No opener generated");
    return content;
}
async function generateChatReply(systemPrompt, history) {
    const client = getMistral();
    const response = await client.chat.complete({
        model: "mistral-large-latest",
        messages: [{ role: "system", content: systemPrompt }, ...history],
    });
    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string")
        throw new Error("No reply generated");
    return content;
}

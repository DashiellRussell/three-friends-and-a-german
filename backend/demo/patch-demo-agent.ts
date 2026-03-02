/**
 * Patch an ElevenLabs agent with the demo prompt + matching voice config.
 *
 * Uses the same voice (Sarah), TTS settings, and turn config as the
 * existing Tessera agents defined in agents.json.
 *
 * Usage:
 *   cd backend && npx ts-node demo/patch-demo-agent.ts <agent_id>
 *   cd backend && npx ts-node demo/patch-demo-agent.ts              # uses ELEVENLABS_OUTBOUND_AGENT_ID
 */

import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const API_KEY = process.env.ELEVENLABS_API_KEY!;
const BASE_URL = "https://api.elevenlabs.io";

const agentId =
  process.argv[2] ||
  process.env.ELEVENLABS_OUTBOUND_AGENT_ID ||
  process.env.ELEVENLABS_AGENT_ID;

if (!agentId) {
  console.error("Usage: npx ts-node demo/patch-demo-agent.ts <agent_id>");
  console.error("Or set ELEVENLABS_OUTBOUND_AGENT_ID in .env");
  process.exit(1);
}

if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY in .env");
  process.exit(1);
}

async function main() {
  // Load the demo prompt
  const promptPath = path.resolve(__dirname, "demo-agent-prompt.txt");
  const demoPrompt = fs.readFileSync(promptPath, "utf-8");

  const firstMessage =
    "Hey Dash, sorry to bother you — I just have a couple quick questions. Do you have a sec?";

  const patch = {
    conversation_config: {
      agent: {
        prompt: {
          prompt: demoPrompt,
          llm: "gemini-2.0-flash-lite",
          temperature: 0.7,
          max_tokens: 200,
        },
        first_message: firstMessage,
        language: "en",
      },
      tts: {
        voice_id: "EXAVITQu4vr4xnSDxMaL", // Sarah
        model_id: "eleven_flash_v2",
        stability: 0.3,
        similarity_boost: 0.85,
        optimize_streaming_latency: 4,
      },
      turn: {
        turn_eagerness: "normal",
        turn_timeout: 7,
      },
    },
  };

  console.log(`Patching agent ${agentId}...`);
  console.log(`  Voice: Sarah (EXAVITQu4vr4xnSDxMaL)`);
  console.log(`  Model: eleven_flash_v2`);
  console.log(`  Stability: 0.3, Similarity: 0.85`);
  console.log(`  Turn eagerness: normal, Timeout: 7s`);
  console.log(`  LLM: gemini-2.0-flash-lite, Temp: 0.7`);
  console.log(`  First message: "${firstMessage.slice(0, 60)}..."`);
  console.log(`  Prompt: ${demoPrompt.length} chars from demo-agent-prompt.txt\n`);

  const res = await fetch(`${BASE_URL}/v1/convai/agents/${agentId}`, {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to patch agent: ${res.status}`);
    console.error(err);
    process.exit(1);
  }

  console.log("Agent patched successfully.");

  // Verify by fetching the agent back
  const verifyRes = await fetch(`${BASE_URL}/v1/convai/agents/${agentId}`, {
    headers: { "xi-api-key": API_KEY },
  });

  if (verifyRes.ok) {
    const agent = await verifyRes.json() as any;
    console.log(`\nVerified: ${agent.name || agentId}`);
    console.log(`  Voice: ${agent.conversation_config?.tts?.voice_id || "?"}`);
    console.log(`  First message: "${(agent.conversation_config?.agent?.first_message || "").slice(0, 60)}..."`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});

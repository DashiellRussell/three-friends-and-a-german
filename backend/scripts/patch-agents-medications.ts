/**
 * One-shot script: Patch ElevenLabs agents to include medication awareness.
 *
 * Adds the `medications` dynamic variable and updates prompts for both:
 *   - WebRTC check-in agent (ELEVENLABS_AGENT_ID)
 *   - Outbound phone call agent (ELEVENLABS_OUTBOUND_AGENT_ID)
 *
 * Usage:
 *   cd backend && npx ts-node scripts/patch-agents-medications.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { updateAgent } from "../src/services/elevenlabs";
import agentsConfig from "../agents.json";

async function main() {
  for (const agent of agentsConfig.agents) {
    const agentId = process.env[agent.env_var] || agent.agent_id;
    const config = agent.conversation_config;

    console.log(`\nPatching agent: ${agent.name} (${agentId})`);

    try {
      await updateAgent(agentId, {
        conversation_config: {
          agent: {
            prompt: {
              prompt: config.agent.prompt.prompt,
            },
            dynamic_variables: config.agent.dynamic_variables.map((name: string) => ({
              name,
              dynamic_variable_type: "custom",
              value: `{{${name}}}`,
            })),
          },
        },
      });
      console.log(`  Updated prompt + dynamic_variables for ${agent.name}`);
    } catch (err) {
      console.error(`  Failed to patch ${agent.name}:`, (err as Error).message);
    }
  }

  console.log("\nDone.");
}

main();

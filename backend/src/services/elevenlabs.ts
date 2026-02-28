const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const BASE_URL = "https://api.elevenlabs.io";

export async function getSignedUrl(agentId: string): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } },
  );
  if (!res.ok) throw new Error("Failed to get ElevenLabs signed URL");
  const data = (await res.json()) as { signed_url: string };
  return data.signed_url;
}

export async function initiateOutboundCall(
  toNumber: string,
  dynamicVariables: Record<string, string>,
): Promise<{ conversationId: string; callSid: string }> {
  const res = await fetch(`${BASE_URL}/v1/convai/twilio/outbound-call`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
    }),
  });
  if (!res.ok) throw new Error("Failed to initiate outbound call");
  const data = (await res.json()) as {
    conversation_id: string;
    callSid: string;
  };
  return { conversationId: data.conversation_id, callSid: data.callSid };
}

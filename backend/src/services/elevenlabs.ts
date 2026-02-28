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

function normalizePhoneNumber(phone: string): string {
  // Strip spaces, dashes, parens
  let num = phone.replace(/[\s\-()]/g, "");
  // Australian numbers: convert 04xx to +614xx
  if (num.startsWith("0") && !num.startsWith("00")) {
    num = "+61" + num.slice(1);
  }
  // Ensure it starts with +
  if (!num.startsWith("+")) {
    num = "+" + num;
  }
  return num;
}

export interface ConversationDetails {
  conversation_id: string;
  status: string;
  transcript: string | null;
  metadata: Record<string, unknown>;
  analysis: {
    call_successful?: string;
    transcript_summary?: string;
  } | null;
  conversation_initiation_client_data?: Record<string, unknown>;
  call_duration_secs?: number;
}

export async function getConversationDetails(
  conversationId: string,
): Promise<ConversationDetails> {
  const res = await fetch(
    `${BASE_URL}/v1/convai/conversations/${conversationId}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } },
  );
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Failed to get conversation details (${res.status}): ${errBody}`,
    );
  }
  const data = (await res.json()) as ConversationDetails;
  return data;
}

export async function initiateOutboundCall(
  toNumber: string,
  dynamicVariables: Record<string, string>,
): Promise<{ conversationId: string; callSid: string }> {
  const formattedNumber = normalizePhoneNumber(toNumber);
  const res = await fetch(`${BASE_URL}/v1/convai/twilio/outbound-call`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: process.env.ELEVENLABS_OUTBOUND_AGENT_ID || process.env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: formattedNumber,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Failed to initiate outbound call (${res.status}): ${errBody}`);
  }
  const data = (await res.json()) as {
    conversation_id: string;
    callSid: string;
  };
  return { conversationId: data.conversation_id, callSid: data.callSid };
}

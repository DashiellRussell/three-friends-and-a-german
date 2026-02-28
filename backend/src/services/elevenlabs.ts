import axios from "axios";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const BASE_URL = "https://api.elevenlabs.io";

export async function getSignedUrl(agentId: string): Promise<string> {
  const { data } = await axios.get<{ signed_url: string }>(
    `${BASE_URL}/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } },
  );
  return data.signed_url;
}

export async function initiateOutboundCall(
  toNumber: string,
  dynamicVariables: Record<string, string>,
): Promise<{ conversationId: string; callSid: string }> {
  const { data } = await axios.post<{
    conversation_id: string;
    callSid: string;
  }>(
    `${BASE_URL}/v1/convai/twilio/outbound-call`,
    {
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
    },
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } },
  );
  return { conversationId: data.conversation_id, callSid: data.callSid };
}

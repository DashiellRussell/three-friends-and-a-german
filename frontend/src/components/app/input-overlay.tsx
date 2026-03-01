"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { useUser } from "@/lib/user-context";
import { useToast } from "./shared";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

type Mode = null | "voice" | "chat" | "upload" | "calling";
type TranscriptMsg = { role: "user" | "agent"; text: string };

export function InputOverlay({ onClose, startInVoiceMode, startInCallMode, startInChatMode, startInUploadMode, onNavigate }: { onClose: () => void; startInVoiceMode?: boolean; startInCallMode?: boolean; startInChatMode?: boolean; startInUploadMode?: boolean; onNavigate?: (tab: string, subTab?: string) => void }) {
  const { user } = useUser();
  const userId = user?.id || "";
  const [mode, setMode] = useState<Mode>(null);
  const [transcript, setTranscript] = useState<TranscriptMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoEnding, setAutoEnding] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Calling state
  const [callStatus, setCallStatus] = useState<"idle" | "initiating" | "ringing" | "done" | "error">("idle");
  const [callError, setCallError] = useState<string | null>(null);
  const { show: showToast, ToastEl } = useToast();

  // Text chat state
  const [chatText, setChatText] = useState("");
  const [chatMsgs, setChatMsgs] = useState<{ role: "ai" | "user"; text: string }[]>([
    { role: "ai", text: "Hi! Tell me how you're feeling, any symptoms, or ask me anything about your health." },
  ]);
  const textChatRef = useRef<HTMLDivElement>(null);

  // Upload state
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<{ file_name: string; summary: string | null; document_type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track whether agent triggered auto-end
  const autoEndRef = useRef(false);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onMessage: (props) => {
      console.log("[voice:msg]", props.role, props.message?.substring(0, 50));
      setTranscript((prev) => [
        ...prev,
        { role: props.role === "user" ? "user" : "agent", text: props.message },
      ]);
    },
    onConnect: () => {
      console.log("[voice] CONNECTED - mic should be active");
      setError(null);
    },
    onDisconnect: () => {
      console.log("[voice] DISCONNECTED");
      if (autoEndRef.current) {
        setAutoEnding(true);
      }
    },
    onError: (message) => {
      console.error("[voice] onError:", message);
      setError(typeof message === "string" ? message : "Connection error. Please try again.");
    },
    onStatusChange: (status) => {
      console.log("[voice] Status changed:", status);
    },
    onModeChange: (mode) => {
      console.log("[voice] Mode changed:", mode);
    },
  });

  // Start voice check-in: fetch signed URL from backend, then start ElevenLabs session
  const startVoice = useCallback(async () => {
    if (!userId) {
      setError("Not logged in. Please log in first.");
      return;
    }
    setMode("voice");
    setTranscript([]);
    setError(null);
    setSaved(false);
    setShowTranscript(false);

    try {
      console.log("[voice] 1. Fetching signed URL from backend...");
      const res = await fetch(`${BACKEND_URL}/api/voice/signed-url`, {
        headers: { "x-user-id": userId },
      });
      console.log("[voice] 2. Backend response status:", res.status);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to get signed URL (${res.status})`);
      }
      const data = await res.json();
      console.log("[voice] 3. Got response:", {
        hasSignedUrl: !!data.signed_url,
        signedUrlPreview: data.signed_url?.substring(0, 60) + "...",
        hasAgentId: !!data.agent_id,
        dynamicVars: data.dynamic_variables,
      });

      autoEndRef.current = false;

      // Use signedUrl for private agents (authenticated via backend API key)
      // Only fall back to agentId if signed URL wasn't available
      const sessionConfig = data.signed_url
        ? {
            signedUrl: data.signed_url as string,
            dynamicVariables: data.dynamic_variables,
            clientTools: {
              end_conversation: async () => {
                autoEndRef.current = true;
                await conversation.endSession();
                return "Conversation ended.";
              },
            },
          }
        : {
            agentId: data.agent_id as string,
            connectionType: "webrtc" as const,
            dynamicVariables: data.dynamic_variables,
            clientTools: {
              end_conversation: async () => {
                autoEndRef.current = true;
                await conversation.endSession();
                return "Conversation ended.";
              },
            },
          };

      console.log("[voice] 4. Starting session with:", data.signed_url ? "signedUrl (WebSocket)" : "agentId (WebRTC)");

      // Race against a timeout — the SDK can hang forever if WebSocket silently fails
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timed out after 15s. Check browser console for details.")), 15000)
      );

      await Promise.race([
        conversation.startSession(sessionConfig),
        timeout,
      ]);
      console.log("[voice] 5. Session connected!");
    } catch (err) {
      console.error("[voice] ERROR:", err);
      // Clean up any partially-established connection
      try { await conversation.endSession(); } catch { /* ignore */ }
      setError((err as Error).message || "Failed to start voice session");
    }
  }, [conversation, userId]);

  // End the voice session
  const endVoice = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  // Save check-in to backend
  const saveCheckin = useCallback(async () => {
    if (transcript.length === 0) return;
    setSaving(true);
    try {
      const fullTranscript = transcript
        .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.text}`)
        .join("\n");

      await fetch(`${BACKEND_URL}/api/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          input_mode: "voice",
          transcript: fullTranscript,
          notes: transcript.filter((m) => m.role === "user").map((m) => m.text).join(". "),
        }),
      });
      setSaved(true);
      showToast("Check-in saved", "success", "Your daily check-in has been recorded");
    } catch {
      setError("Failed to save check-in");
      showToast("Failed to save check-in", "error");
    } finally {
      setSaving(false);
    }
  }, [transcript, userId, showToast]);

  // Auto-save when agent triggers end_conversation
  useEffect(() => {
    if (autoEnding && transcript.length > 0 && !saving && !saved) {
      saveCheckin();
    }
  }, [autoEnding, transcript, saving, saved, saveCheckin]);

  // Initiate outbound call (Tessera calls user's phone)
  const startCall = useCallback(async () => {
    setMode("calling");
    setCallStatus("initiating");
    setCallError(null);

    try {
      // Fetch user profile to get phone number
      const profileRes = await fetch(`${BACKEND_URL}/api/profiles`, {
        headers: { "x-user-id": userId },
      });
      if (!profileRes.ok) throw new Error("Failed to fetch profile");
      const profile = await profileRes.json();

      if (!profile.phone_number) {
        throw new Error("No phone number on profile. Add one in Settings first.");
      }

      const res = await fetch(`${BACKEND_URL}/api/voice/outbound-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          phone_number: profile.phone_number,
          dynamic_variables: {
            user_name: profile.display_name || "there",
            conditions: profile.conditions?.join(", ") || "none listed",
            allergies: profile.allergies?.join(", ") || "none listed",
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Call failed (${res.status})`);
      }

      setCallStatus("ringing");
      showToast("Tessera is calling you now", "success", "Pick up your phone to start the check-in");
      // Auto-transition to done after a delay (call is now in ElevenLabs+Twilio hands)
      setTimeout(() => setCallStatus("done"), 3000);
    } catch (err) {
      const msg = (err as Error).message;
      setCallError(msg);
      setCallStatus("error");
      showToast(msg, "error");
    }
  }, [userId, showToast]);

  // Auto-start the requested mode (wait for userId to be available)
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (hasAutoStarted.current) return;
    if (startInVoiceMode && userId) {
      hasAutoStarted.current = true;
      startVoice();
    } else if (startInCallMode && userId) {
      hasAutoStarted.current = true;
      startCall();
    } else if (startInChatMode) {
      hasAutoStarted.current = true;
      setMode("chat");
    } else if (startInUploadMode) {
      hasAutoStarted.current = true;
      setMode("upload");
    }
  }, [startInVoiceMode, startInCallMode, startInChatMode, startInUploadMode, startVoice, startCall, userId]);

  // Auto-scroll transcript
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [transcript]);

  useEffect(() => {
    if (textChatRef.current) textChatRef.current.scrollTop = textChatRef.current.scrollHeight;
  }, [chatMsgs]);

  // Handle file selection and upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!userId) return;
    setUploadStage("uploading");
    setUploadError(null);
    setUploadedDoc(null);

    try {
      // Read file text for AI processing (best-effort for PDFs)
      let documentText = "";
      if (file.type === "text/plain") {
        documentText = await file.text();
      } else {
        // For PDFs and images, send the file name as placeholder text
        // Server-side OCR/extraction would be needed for real text extraction
        documentText = `Uploaded file: ${file.name}`;
      }

      setUploadStage("processing");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_text", documentText);
      formData.append("file_name", file.name);
      formData.append("document_type", "other");

      const res = await fetch(`${BACKEND_URL}/api/documents/upload`, {
        method: "POST",
        headers: { "x-user-id": userId },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      const doc = await res.json();
      setUploadedDoc({ file_name: doc.file_name, summary: doc.summary, document_type: doc.document_type });
      setUploadStage("done");
      showToast("Document uploaded", "success", "Your document has been processed and saved");
    } catch (err) {
      const msg = (err as Error).message;
      setUploadError(msg);
      setUploadStage("error");
      showToast(msg, "error");
    }
  }, [userId, showToast]);

  const sendChat = () => {
    if (!chatText.trim()) return;
    setChatMsgs((p) => [...p, { role: "user", text: chatText }]);
    setChatText("");
    setTimeout(() => {
      setChatMsgs((p) => [
        ...p,
        { role: "ai", text: "Got it — I've noted that. Anything else you'd like to log?" },
      ]);
    }, 1000);
  };

  const isConnected = conversation.status === "connected";
  const isConnecting = conversation.status === "connecting";
  const isDisconnected = conversation.status === "disconnected";
  const isDone = isDisconnected && transcript.length > 0;

  // ── Picker ──
  if (!mode) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        {ToastEl}
        <div onClick={onClose} className="flex-1 bg-black/30 backdrop-blur-sm" />
        <div className="rounded-t-3xl bg-white px-6 pb-10 pt-5" style={{ animation: "slideUp 0.3s ease" }}>
          <div className="mx-auto mb-6 h-1 w-8 rounded-full bg-zinc-200" />
          <div className="mb-1 text-[16px] font-semibold text-zinc-900">New Entry</div>
          <div className="mb-6 text-[13px] text-zinc-400">How would you like to log?</div>

          <div className="flex flex-col gap-2.5">
            {/* Voice - primary */}
            <button onClick={startVoice} className="flex w-full items-center gap-4 rounded-2xl bg-zinc-900 p-4 text-left transition-all hover:bg-zinc-800 active:scale-[0.99]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
              </div>
              <div>
                <div className="text-[15px] font-semibold text-white">Voice check-in</div>
                <div className="mt-0.5 text-xs text-white/50">~2 min conversation · recommended</div>
              </div>
            </button>

            {/* Call me */}
            <button onClick={startCall} className="flex w-full items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </div>
              <div>
                <div className="text-[15px] font-semibold text-zinc-900">Call me</div>
                <div className="mt-0.5 text-xs text-zinc-400">Tessera calls your phone · hands-free</div>
              </div>
            </button>

            <div className="flex gap-2.5">
              <button onClick={() => setMode("chat")} className="flex flex-1 items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-zinc-900">Text</div>
                  <div className="text-[11px] text-zinc-400">Type or chat</div>
                </div>
              </button>

              <button onClick={() => setMode("upload")} className="flex flex-1 items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-zinc-900">Upload</div>
                  <div className="text-[11px] text-zinc-400">PDF, image</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Sphere color config ──
  const sphereTheme = saved
    ? { bg: "radial-gradient(ellipse at 30% 30%, #34d399 0%, #059669 40%, #047857 100%)", glow: "sphereGlowDone", speed: "6s" }
    : isDone
      ? { bg: "radial-gradient(ellipse at 30% 30%, #6ee7b7 0%, #10b981 40%, #059669 100%)", glow: "sphereGlowDone", speed: "6s" }
      : isConnecting
        ? { bg: "radial-gradient(ellipse at 30% 30%, #a1a1aa 0%, #71717a 40%, #52525b 100%)", glow: "sphereGlow", speed: "3s" }
        : conversation.isSpeaking
          ? { bg: "radial-gradient(ellipse at 30% 30%, #c084fc 0%, #a855f7 30%, #7c3aed 60%, #6d28d9 100%)", glow: "sphereGlowSpeaking", speed: "1.5s" }
          : isConnected
            ? { bg: "radial-gradient(ellipse at 30% 30%, #67e8f9 0%, #22d3ee 25%, #3b82f6 55%, #6366f1 100%)", glow: "sphereGlow", speed: "3s" }
            : { bg: "radial-gradient(ellipse at 30% 30%, #d4d4d8 0%, #a1a1aa 40%, #71717a 100%)", glow: "sphereGlow", speed: "5s" };

  const statusLabel = saved
    ? "Saved"
    : autoEnding && saving
      ? "Auto-saving..."
      : isDone
        ? "Complete"
        : isConnecting
          ? "Connecting..."
          : conversation.isSpeaking
            ? "Tessera is speaking..."
            : isConnected
              ? "Listening..."
              : error
                ? ""
                : "Starting...";

  // ── Voice mode (ElevenLabs) ──
  if (mode === "voice") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#fafafa]">
        {ToastEl}

        {/* Subtle grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-5 py-4">
          <span className="text-[13px] font-medium tracking-widest uppercase text-zinc-300">Voice</span>
          <button
            onClick={async () => {
              if (isConnected) await endVoice();
              onClose();
            }}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            {isDone ? "Close" : isConnected ? "End" : "Cancel"}
          </button>
        </div>

        {/* Sphere area */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center" style={{ marginTop: showTranscript ? "-10%" : "0", transition: "margin-top 0.4s ease" }}>
          {/* Outer ambient glow */}
          <div
            className="absolute"
            style={{
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: conversation.isSpeaking
                ? "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)"
                : isConnected
                  ? "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)"
                  : isDone || saved
                    ? "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%)",
              animation: `spherePulse ${sphereTheme.speed} ease-in-out infinite`,
              transition: "background 0.8s ease",
            }}
          />

          {/* Orbital ring */}
          {(isConnected || isConnecting) && (
            <div
              className="absolute"
              style={{
                width: 200,
                height: 200,
                borderRadius: "50%",
                border: `1px solid ${conversation.isSpeaking ? "rgba(168,85,247,0.2)" : "rgba(59,130,246,0.15)"}`,
                animation: `orbitalRing ${conversation.isSpeaking ? "3s" : "8s"} linear infinite`,
                transition: "border-color 0.5s ease",
              }}
            >
              <div
                className="absolute"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: conversation.isSpeaking ? "#a855f7" : "#3b82f6",
                  top: -3,
                  left: "50%",
                  marginLeft: -3,
                  boxShadow: conversation.isSpeaking
                    ? "0 0 8px 2px rgba(168,85,247,0.4)"
                    : "0 0 8px 2px rgba(59,130,246,0.3)",
                }}
              />
            </div>
          )}

          {/* Main sphere */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              overflow: "hidden",
              position: "relative",
              animation: `morphSphere ${conversation.isSpeaking ? "2s" : "5s"} ease-in-out infinite, sphereFloat 4s ease-in-out infinite, ${sphereTheme.glow} ${sphereTheme.speed} ease-in-out infinite`,
              transition: "box-shadow 0.8s ease",
            }}
          >
            {/* Base gradient layer */}
            <div
              className="absolute inset-0"
              style={{
                borderRadius: "inherit",
                background: sphereTheme.bg,
                transition: "background 0.8s ease",
              }}
            />

            {/* Shimmer overlay */}
            <div
              className="absolute inset-0"
              style={{
                borderRadius: "inherit",
                background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 100%)",
              }}
            />

            {/* Rotating highlight */}
            <div
              className="absolute inset-2"
              style={{
                borderRadius: "inherit",
                background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.12), transparent, transparent)",
                animation: `rotateSphereGradient ${conversation.isSpeaking ? "2s" : "6s"} linear infinite`,
              }}
            />

            {/* Inner glow */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                borderRadius: "inherit",
                background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.2) 0%, transparent 50%)",
              }}
            >
              {(isDone || saved) && (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" style={{ animation: "fadeUp 0.4s ease" }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {isConnecting && (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
              )}
            </div>
          </div>

          {/* Status text */}
          <div className="mt-8 text-center">
            <div className="text-[14px] font-medium tracking-wide text-zinc-400" style={{ animation: "fadeUp 0.3s ease" }}>
              {statusLabel}
            </div>
            {isConnected && (
              <div className="mt-2 flex items-center justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 3,
                      height: 14,
                      background: conversation.isSpeaking
                        ? `rgba(168,85,247,${0.4 + i * 0.12})`
                        : `rgba(59,130,246,${0.3 + i * 0.12})`,
                      animation: `waveBar ${0.4 + i * 0.08}s ease-in-out infinite`,
                      animationDelay: `${i * 0.07}s`,
                      transition: "background 0.5s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-[13px] text-red-600" style={{ animation: "fadeUp 0.3s ease" }}>
              {error}
              <button onClick={startVoice} className="ml-2 font-medium text-red-700 underline hover:text-red-900">
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Transcript toggle + panel */}
        <div className="relative z-10">
          {transcript.length > 0 && (
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="mx-auto mb-2 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[12px] font-medium text-zinc-400 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-600"
              style={{ display: "flex", width: "fit-content" }}
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ transform: showTranscript ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
              Transcript ({transcript.length})
            </button>
          )}

          <div
            style={{
              maxHeight: showTranscript ? "40vh" : "0px",
              opacity: showTranscript ? 1 : 0,
              transition: "max-height 0.4s ease, opacity 0.3s ease",
              overflow: "hidden",
            }}
          >
            <div
              ref={chatRef}
              className="flex flex-col gap-2 overflow-y-auto border-t border-zinc-100 bg-white/80 px-5 py-4 backdrop-blur-xl"
              style={{ maxHeight: "38vh" }}
            >
              {transcript.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} style={{ animation: "fadeUp 0.2s ease" }}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-zinc-900 text-white"
                      : "rounded-bl-sm border border-zinc-100 bg-white text-zinc-700"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isConnected && (
                <div className={`flex ${conversation.isSpeaking ? "justify-start" : "justify-end"}`}>
                  <div className={`flex gap-1.5 rounded-2xl px-4 py-3 ${conversation.isSpeaking ? "border border-zinc-100 bg-white" : "bg-zinc-900"}`}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: conversation.isSpeaking ? "#d4d4d8" : "rgba(255,255,255,0.4)",
                          animation: `bounce 1.2s ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="relative z-10">
          {isConnected && (
            <div className="flex justify-center px-5 py-5">
              <button
                onClick={endVoice}
                className="flex items-center gap-2.5 rounded-full bg-red-50 px-7 py-3.5 text-[13px] font-medium text-red-600 transition-all hover:bg-red-100 active:scale-[0.97]"
              >
                <div className="relative flex h-3 w-3 items-center justify-center">
                  <div className="absolute h-3 w-3 rounded-sm bg-red-500" />
                </div>
                End check-in
              </button>
            </div>
          )}

          {isDone && !saved && (
            <div className="flex gap-3 px-5 py-5">
              <button
                onClick={saveCheckin}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-zinc-900 py-3.5 text-[13px] font-medium text-white transition-all hover:bg-zinc-700 active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Save check-in
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="flex flex-1 items-center justify-center rounded-full border border-zinc-200 py-3.5 text-[13px] font-medium text-zinc-500 transition-all hover:bg-zinc-50 hover:text-zinc-700 active:scale-[0.98]"
              >
                Discard
              </button>
            </div>
          )}

          {saved && (
            <div className="flex justify-center px-5 py-5">
              <button
                onClick={onClose}
                className="flex items-center gap-2 rounded-full bg-emerald-50 px-7 py-3.5 text-[13px] font-medium text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.97]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Calling mode (outbound phone call) ──
  if (mode === "calling") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#fafafa]">
        {ToastEl}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[13px] font-medium tracking-wide text-zinc-400">Calling You</span>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            {callStatus === "done" ? "Close" : "Cancel"}
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5">
          {/* Status orb */}
          <div
            className={`mb-6 flex h-[88px] w-[88px] items-center justify-center rounded-full transition-all duration-500 ${
              callStatus === "done"
                ? "bg-emerald-50"
                : callStatus === "error"
                  ? "bg-red-50"
                  : callStatus === "ringing"
                    ? "bg-emerald-50 shadow-[0_0_0_18px_rgba(16,185,129,0.08)]"
                    : "bg-zinc-200 animate-pulse"
            }`}
          >
            {callStatus === "done" ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : callStatus === "error" ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            ) : callStatus === "ringing" ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            ) : (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-700" />
            )}
          </div>

          <div className="text-[17px] font-semibold text-zinc-900">
            {callStatus === "done"
              ? "Call initiated"
              : callStatus === "error"
                ? "Call failed"
                : callStatus === "ringing"
                  ? "Ringing..."
                  : "Setting up call..."}
          </div>
          <div className="mt-2 max-w-[260px] text-center text-[13px] text-zinc-400">
            {callStatus === "done"
              ? "Tessera is calling your phone now. Answer to start your check-in — your transcript will be saved automatically."
              : callStatus === "error"
                ? callError
                : callStatus === "ringing"
                  ? "Tessera is calling your phone. Pick up to start your check-in."
                  : "Connecting to Tessera..."}
          </div>

          {callStatus === "error" && (
            <button
              onClick={startCall}
              className="mt-5 rounded-2xl bg-zinc-900 px-6 py-3 text-[13px] font-medium text-white transition-all hover:bg-zinc-700 active:scale-[0.98]"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Chat mode ──
  if (mode === "chat") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#fafafa]">
        {ToastEl}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setMode(null)} className="text-zinc-400 transition-colors hover:text-zinc-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="text-[13px] font-medium text-zinc-400">Text Check-in</span>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">Done</button>
        </div>

        <div ref={textChatRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-3">
          {chatMsgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} style={{ animation: "fadeUp 0.2s ease" }}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-zinc-900 text-zinc-50"
                  : "rounded-bl-sm border border-zinc-100 bg-white text-zinc-700"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2.5 border-t border-zinc-100 bg-white/90 px-5 py-3 backdrop-blur-lg">
          <input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="Describe how you're feeling…"
            className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
          />
          <button
            onClick={sendChat}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
              chatText.trim() ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-300"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Upload mode ──
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#fafafa]">
      {ToastEl}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.heic"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMode(null)} className="text-zinc-400 transition-colors hover:text-zinc-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span className="text-[13px] font-medium text-zinc-400">Upload Document</span>
        </div>
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">Close</button>
      </div>

      <div className="flex flex-col gap-[5%] px-5">
        {uploadStage === "idle" && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-14 transition-all hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div className="text-sm font-medium text-zinc-900">Tap to upload</div>
            <div className="mt-1 text-xs text-zinc-400">Blood tests, prescriptions, scans</div>
          </button>
        )}

        {uploadStage === "uploading" && (
          <div className="flex flex-col items-center py-14" style={{ animation: "fadeUp 0.2s" }}>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-100 border-t-zinc-900" />
            <div className="mt-4 text-xs text-zinc-400">Uploading…</div>
          </div>
        )}

        {uploadStage === "processing" && (
          <div className="flex flex-col items-center py-14">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-100 border-t-zinc-900" />
            <div className="mt-4 text-xs text-zinc-400">Analysing document…</div>
          </div>
        )}

        {uploadStage === "done" && uploadedDoc && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-100 bg-white px-5 py-8" style={{ animation: "fadeUp 0.3s" }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div className="text-center">
              <div className="text-[15px] font-semibold text-zinc-900">Document uploaded</div>
              <div className="mt-1 text-[13px] text-zinc-500">{uploadedDoc.file_name}</div>
            </div>
            {uploadedDoc.summary && (
              <div className="w-full rounded-xl bg-zinc-50 px-4 py-3 text-[12px] leading-relaxed text-zinc-600">{uploadedDoc.summary}</div>
            )}
            <div className="mt-1 flex w-full flex-col gap-2">
              <button
                onClick={() => { onClose(); onNavigate?.("log", "files"); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-[13px] font-medium text-white transition-all hover:bg-zinc-700 active:scale-[0.98]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                View in Files
              </button>
              <button
                onClick={() => { setUploadStage("idle"); setUploadedDoc(null); }}
                className="flex w-full items-center justify-center rounded-xl border border-zinc-200 py-3 text-[13px] font-medium text-zinc-600 transition-all hover:bg-zinc-50 active:scale-[0.98]"
              >
                Upload another
              </button>
            </div>
          </div>
        )}

        {uploadStage === "error" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-white px-5 py-6" style={{ animation: "fadeUp 0.3s" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </div>
            <div className="text-[13px] font-medium text-zinc-900">Upload failed</div>
            <div className="text-[12px] text-zinc-500 text-center">{uploadError}</div>
            <button
              onClick={() => { setUploadStage("idle"); setUploadError(null); }}
              className="mt-1 rounded-xl bg-zinc-900 px-6 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-zinc-700 active:scale-[0.98]"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

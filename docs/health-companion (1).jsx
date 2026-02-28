import { useState, useEffect, useRef } from "react";

// ─── Demo Data ───────────────────────────────────────────────
const CHECKINS = [
  { id: 1, date: "Feb 28", time: "8:15 AM", mood: "Good", energy: 7, sleep: 6.5, symptoms: ["Mild headache", "Neck stiffness"], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "Headache started after waking, possibly from sleeping position.", flagged: false },
  { id: 2, date: "Feb 27", time: "8:30 AM", mood: "Okay", energy: 5, sleep: 5, symptoms: ["Fatigue", "Increased thirst"], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: false }], note: "Didn't sleep well. Feeling more thirsty than usual.", flagged: true, flag: "Increased thirst + fatigue may correlate with elevated HbA1c" },
  { id: 3, date: "Feb 26", time: "8:00 AM", mood: "Great", energy: 8, sleep: 7.5, symptoms: [], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "Feeling good. 30-min walk yesterday evening.", flagged: false },
  { id: 4, date: "Feb 25", time: "8:20 AM", mood: "Okay", energy: 6, sleep: 6, symptoms: ["Mild fatigue"], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "A bit tired but otherwise fine.", flagged: false },
  { id: 5, date: "Feb 24", time: "8:10 AM", mood: "Good", energy: 7, sleep: 7, symptoms: [], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "Good day overall.", flagged: false },
  { id: 6, date: "Feb 23", time: "8:25 AM", mood: "Okay", energy: 5, sleep: 5.5, symptoms: ["Mild fatigue"], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: false }], note: "Tired, stayed up late.", flagged: false },
  { id: 7, date: "Feb 22", time: "8:05 AM", mood: "Great", energy: 8, sleep: 8, symptoms: [], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "Well rested.", flagged: false },
];

const LAB_RESULTS = [
  { metric: "HbA1c", value: "6.8%", status: "elevated", note: "Above target (< 6.5%)" },
  { metric: "Vitamin D", value: "22 ng/mL", status: "low", note: "Below optimal (30–50)" },
  { metric: "Cholesterol", value: "195 mg/dL", status: "normal", note: "Within range" },
  { metric: "TSH", value: "2.1 mIU/L", status: "normal", note: "Within range" },
];

const CONVERSATION = [
  { role: "ai", text: "Good morning. How are you feeling today?" },
  { role: "user", text: "I'm alright, maybe a 7 out of 10." },
  { role: "ai", text: "Good to hear. How was your sleep?" },
  { role: "user", text: "About six and a half hours. Woke up with a stiff neck." },
  { role: "ai", text: "Any other symptoms today?" },
  { role: "user", text: "A mild headache, probably from the neck." },
  { role: "ai", text: "Have you taken your medications?" },
  { role: "user", text: "Yes, Metformin and Vitamin D with breakfast." },
  { role: "ai", text: "All logged. Monitor the headache — if it persists, mention it at your next visit." },
];

const REPORT_DATA = {
  findings: [
    "HbA1c increased from 6.5% to 6.8% over 3 months",
    "Vitamin D suboptimal at 22 ng/mL despite supplementation",
    "Increased thirst and fatigue reported Feb 27, correlating with HbA1c trend",
    "Sleep inconsistent — 5 to 7.5 hours across reporting period",
    "Medication adherence: Metformin 100%, Vitamin D 75%",
  ],
  actions: [
    "Review Metformin dosage given HbA1c trajectory",
    "Consider Vitamin D dosage adjustment",
    "Discuss sleep hygiene — inconsistent sleep may affect glycaemic control",
    "Follow up on increased thirst symptom",
  ],
};

// ─── Shared Components ───────────────────────────────────────
const Pill = ({ children, variant = "default" }) => {
  const s = { default: { bg: "#f4f4f5", color: "#71717a" }, good: { bg: "#f0fdf4", color: "#16a34a" }, warn: { bg: "#fffbeb", color: "#d97706" }, bad: { bg: "#fef2f2", color: "#dc2626" } }[variant];
  return <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 5, background: s.bg, color: s.color, letterSpacing: 0.2, whiteSpace: "nowrap" }}>{children}</span>;
};
const statusVariant = (s) => s === "normal" ? "good" : s === "elevated" ? "bad" : "warn";
const Chev = ({ open }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>;
const Bar = ({ value, max = 10 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.05)" }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", borderRadius: 2, background: value >= 7 ? "#4ade80" : value >= 5 ? "#fbbf24" : "#f87171", transition: "width 0.5s ease" }} />
    </div>
    <span style={{ fontSize: 11, color: "#a1a1aa", fontVariantNumeric: "tabular-nums", minWidth: 16 }}>{value}</span>
  </div>
);
const Toggle = ({ on, onToggle, label }) => (
  <div onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", cursor: "pointer" }}>
    <span style={{ fontSize: 13, color: "#27272a" }}>{label}</span>
    <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#18181b" : "#e4e4e7", padding: 2, transition: "background 0.2s", display: "flex", justifyContent: on ? "flex-end" : "flex-start" }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
    </div>
  </div>
);
const Seg = ({ options, value, onChange }) => (
  <div style={{ display: "flex", background: "#f4f4f5", borderRadius: 8, padding: 2, gap: 2 }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        flex: 1, padding: "7px 6px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer",
        background: value === o.value ? "#fff" : "transparent", color: value === o.value ? "#18181b" : "#a1a1aa",
        boxShadow: value === o.value ? "0 1px 2px rgba(0,0,0,0.06)" : "none", transition: "all 0.15s"
      }}>{o.label}</button>
    ))}
  </div>
);

// ─── Sparkline SVG ───────────────────────────────────────────
function Sparkline({ data, color = "#18181b", height = 48, fill = false, labels, highlight }) {
  const w = 280, h = height, pad = 4;
  const min = Math.min(...data) - 0.5, max = Math.max(...data) + 0.5;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + (1 - (v - min) / (max - min)) * (h - pad * 2),
    v
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = line + ` L${pts[pts.length-1].x},${h} L${pts[0].x},${h} Z`;

  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
        {fill && <path d={area} fill={color} opacity="0.06" />}
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={highlight === i ? 4 : 2.5}
            fill={highlight === i ? color : "#fff"} stroke={color} strokeWidth={highlight === i ? 2 : 1.5} />
        ))}
      </svg>
      {labels && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 4px 0" }}>
          {labels.map((l, i) => <span key={i} style={{ fontSize: 9, color: "#d4d4d8" }}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────
function BarChart({ data, labels, colors, height = 56 }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 10, color: "#a1a1aa", fontVariantNumeric: "tabular-nums" }}>{v}</span>
            <div style={{ width: "100%", maxWidth: 24, borderRadius: 3, height: `${Math.max((v / max) * (height - 18), 2)}px`, background: colors ? colors[i] : "#18181b", transition: "height 0.4s ease" }} />
          </div>
        ))}
      </div>
      {labels && (
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {labels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#d4d4d8" }}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

// ─── Input Overlay ───────────────────────────────────────────
function InputOverlay({ onClose }) {
  const [mode, setMode] = useState(null); // null = picker, voice, chat, upload
  const [msgs, setMsgs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [done, setDone] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatMsgs, setChatMsgs] = useState([{ role: "ai", text: "Hi! Tell me how you're feeling, any symptoms, or ask me anything about your health." }]);
  const [uploadStage, setUploadStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const chatRef = useRef(null);
  const textChatRef = useRef(null);

  // Voice playback
  useEffect(() => {
    if (mode !== "voice" || !speaking && !listening || idx >= CONVERSATION.length) {
      if (idx >= CONVERSATION.length && mode === "voice") setDone(true);
      return;
    }
    const msg = CONVERSATION[idx];
    const t = setTimeout(() => { setMsgs(p => [...p, msg]); setSpeaking(false); setListening(false); setIdx(i => i + 1); }, msg.role === "ai" ? 900 : 1100);
    return () => clearTimeout(t);
  }, [idx, speaking, listening, mode]);

  useEffect(() => {
    if (idx > 0 && idx < CONVERSATION.length && mode === "voice" && !speaking && !listening) {
      const msg = CONVERSATION[idx];
      if (msg.role === "ai") setSpeaking(true); else setListening(true);
    }
  }, [idx, mode]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [msgs]);
  useEffect(() => { if (textChatRef.current) textChatRef.current.scrollTop = textChatRef.current.scrollHeight; }, [chatMsgs]);

  // Upload
  useEffect(() => {
    if (uploadStage === "uploading") {
      const iv = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(iv); setUploadStage("processing"); return 100; } return p + 10; }), 70);
      return () => clearInterval(iv);
    }
    if (uploadStage === "processing") { const t = setTimeout(() => setUploadStage("done"), 1600); return () => clearTimeout(t); }
  }, [uploadStage]);

  const startVoice = () => {
    setMode("voice");
    const msg = CONVERSATION[0];
    setSpeaking(true);
  };

  const sendChat = () => {
    if (!chatText.trim()) return;
    setChatMsgs(p => [...p, { role: "user", text: chatText }]);
    setChatText("");
    setTimeout(() => {
      setChatMsgs(p => [...p, { role: "ai", text: "Got it — I've noted that. Anything else you'd like to log?" }]);
    }, 1000);
  };

  // ── Picker ──
  if (!mode) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }} />
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px 32px", animation: "slideUp 0.3s ease" }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: "#e4e4e7", margin: "0 auto 20px" }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: "#18181b", marginBottom: 4 }}>New Entry</div>
        <div style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 20 }}>How would you like to log?</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Voice - primary */}
          <button onClick={startVoice} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 12,
            border: "none", background: "#18181b", cursor: "pointer", textAlign: "left", width: "100%"
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Voice check-in</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>~2 min conversation · recommended</div>
            </div>
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setMode("chat")} style={{
              flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "14px", borderRadius: 12,
              border: "1px solid #f4f4f5", background: "#fff", cursor: "pointer", textAlign: "left"
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#18181b" }}>Text</div>
                <div style={{ fontSize: 11, color: "#a1a1aa" }}>Type or chat</div>
              </div>
            </button>

            <button onClick={() => setMode("upload")} style={{
              flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "14px", borderRadius: 12,
              border: "1px solid #f4f4f5", background: "#fff", cursor: "pointer", textAlign: "left"
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#18181b" }}>Upload</div>
                <div style={{ fontSize: 11, color: "#a1a1aa" }}>PDF, image</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Voice mode ──
  if (mode === "voice") return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#fafafa", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#a1a1aa", letterSpacing: 0.3 }}>Voice Check-in</span>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 13, color: "#a1a1aa", cursor: "pointer", fontWeight: 500 }}>{done ? "Done ✓" : "Cancel"}</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0 10px" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: done ? "#f0fdf4" : listening ? "#18181b" : speaking ? "#eef2ff" : "#18181b",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.4s",
          boxShadow: (listening || speaking) ? "0 0 0 18px rgba(0,0,0,0.02)" : "none"
        }}>
          {done ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          : (listening || speaking) ? (
            <div style={{ display: "flex", gap: 3, alignItems: "center", height: 22 }}>
              {[0,1,2,3,4].map(i => <div key={i} style={{ width: 2.5, height: 22, borderRadius: 2, background: listening ? "rgba(255,255,255,0.6)" : "#6366f1", animation: `waveBar ${0.4+i*0.1}s ease-in-out infinite`, animationDelay: `${i*0.08}s` }} />)}
            </div>
          ) : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>}
        </div>
        <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 8, minHeight: 16 }}>
          {listening ? "Listening…" : speaking ? "Speaking…" : done ? "Complete" : "Starting…"}
        </div>
      </div>
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeUp 0.25s ease" }}>
            <div style={{
              maxWidth: "80%", padding: "9px 13px", fontSize: 13.5, lineHeight: 1.55, borderRadius: 14,
              background: m.role === "user" ? "#18181b" : "#fff", color: m.role === "user" ? "#fafafa" : "#27272a",
              border: m.role === "ai" ? "1px solid #f4f4f5" : "none",
              borderBottomRightRadius: m.role === "user" ? 4 : 14, borderBottomLeftRadius: m.role === "ai" ? 4 : 14,
            }}>{m.text}</div>
          </div>
        ))}
        {(speaking || listening) && (
          <div style={{ display: "flex", justifyContent: listening ? "flex-end" : "flex-start" }}>
            <div style={{ padding: "9px 15px", borderRadius: 14, background: listening ? "#18181b" : "#fff", border: listening ? "none" : "1px solid #f4f4f5", display: "flex", gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: listening ? "rgba(255,255,255,0.4)" : "#d4d4d8", animation: `bounce 1.2s ${i*0.15}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Chat mode ──
  if (mode === "chat") return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#fafafa", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setMode(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#a1a1aa", display: "flex" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#a1a1aa" }}>Text Check-in</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 13, color: "#a1a1aa", cursor: "pointer", fontWeight: 500 }}>Done</button>
      </div>
      <div ref={textChatRef} style={{ flex: 1, overflowY: "auto", padding: "0 20px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {chatMsgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeUp 0.2s ease" }}>
            <div style={{
              maxWidth: "80%", padding: "9px 13px", fontSize: 13.5, lineHeight: 1.55, borderRadius: 14,
              background: m.role === "user" ? "#18181b" : "#fff", color: m.role === "user" ? "#fafafa" : "#27272a",
              border: m.role === "ai" ? "1px solid #f4f4f5" : "none",
              borderBottomRightRadius: m.role === "user" ? 4 : 14, borderBottomLeftRadius: m.role === "ai" ? 4 : 14,
            }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 16px 12px", background: "#fff", borderTop: "1px solid #f4f4f5", display: "flex", gap: 8 }}>
        <input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()}
          placeholder="Describe how you're feeling…" style={{
          flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 14, outline: "none",
          fontFamily: "inherit", background: "#fafafa"
        }} />
        <button onClick={sendChat} style={{
          width: 40, height: 40, borderRadius: 10, border: "none", background: chatText.trim() ? "#18181b" : "#f4f4f5",
          color: chatText.trim() ? "#fff" : "#d4d4d8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>
    </div>
  );

  // ── Upload mode ──
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#fafafa", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setMode(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#a1a1aa", display: "flex" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#a1a1aa" }}>Upload Document</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 13, color: "#a1a1aa", cursor: "pointer", fontWeight: 500 }}>Close</button>
      </div>
      <div style={{ flex: 1, padding: "20px 20px" }}>
        {uploadStage === "idle" && (
          <div onClick={() => setUploadStage("uploading")} style={{ border: "1.5px dashed #e4e4e7", borderRadius: 12, padding: "44px 20px", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", background: "#fff" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#18181b", marginBottom: 3 }}>Tap to upload</div>
            <div style={{ fontSize: 12, color: "#a1a1aa" }}>Blood tests, prescriptions, scans</div>
          </div>
        )}
        {uploadStage === "uploading" && (
          <div style={{ background: "#fff", borderRadius: 10, padding: "18px", border: "1px solid #f4f4f5", animation: "fadeUp 0.2s" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#18181b", marginBottom: 10 }}>PathologyReport_Feb2026.pdf</div>
            <div style={{ height: 2, borderRadius: 1, background: "#f4f4f5", overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: "#18181b", transition: "width 0.08s" }} /></div>
            <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 5 }}>{Math.min(progress, 100)}%</div>
          </div>
        )}
        {uploadStage === "processing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0" }}>
            <div style={{ width: 32, height: 32, border: "2px solid #f4f4f5", borderTopColor: "#18181b", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 12 }}>Extracting findings…</div>
          </div>
        )}
        {uploadStage === "done" && (
          <div style={{ animation: "fadeUp 0.3s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#18181b" }}>Processed</span>
            </div>
            {LAB_RESULTS.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", background: "#fff", borderRadius: 8, border: "1px solid #f4f4f5", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: "#27272a" }}><span style={{ fontWeight: 500 }}>{r.metric}</span> <span style={{ color: "#a1a1aa" }}>{r.value}</span></span>
                <Pill variant={statusVariant(r.status)}>{r.status}</Pill>
              </div>
            ))}
            <div style={{ marginTop: 6, padding: "7px 10px", borderRadius: 6, background: "#fffbeb", border: "1px solid #fef3c7", fontSize: 11, color: "#b45309", fontWeight: 500 }}>⚠ HbA1c trending upward</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────
function Dashboard({ goTo }) {
  const last7 = CHECKINS.slice(0, 7).reverse();
  return (
    <div style={{ padding: "28px 20px 100px" }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, color: "#a1a1aa", margin: 0, letterSpacing: 0.4 }}>FEBRUARY 28, 2026</p>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: "#18181b", margin: "4px 0 0", letterSpacing: -0.6 }}>Good morning</h1>
      </div>

      <div onClick={() => goTo("log")} style={{ padding: "13px 15px", borderRadius: 10, marginBottom: 20, cursor: "pointer", background: "#fffbeb", border: "1px solid #fef3c7" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#b45309" }}>Attention</span>
        </div>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0, lineHeight: 1.5 }}>HbA1c trending up (6.5% → 6.8%). Fatigue and thirst reported.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 22 }}>
        {[{ l: "Streak", v: "4", u: "days" }, { l: "Energy", v: "6.5", u: "avg" }, { l: "Adherence", v: "87", u: "%" }].map((s, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "13px 11px", border: "1px solid #f4f4f5" }}>
            <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 5, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.l}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#18181b", letterSpacing: -0.5, lineHeight: 1 }}>{s.v}<span style={{ fontSize: 11, fontWeight: 400, color: "#d4d4d8", marginLeft: 1 }}>{s.u}</span></div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 10, padding: "15px", border: "1px solid #f4f4f5", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#18181b" }}>Energy</span>
          <span onClick={() => goTo("trends")} style={{ fontSize: 11, color: "#a1a1aa", cursor: "pointer" }}>See trends →</span>
        </div>
        <Sparkline data={last7.map(c => c.energy)} labels={last7.map(c => c.date.split(" ")[1])} color="#18181b" fill highlight={last7.length - 1} />
      </div>

      <div onClick={() => goTo("log")} style={{ background: "#fff", borderRadius: 10, padding: "13px 15px", border: "1px solid #f4f4f5", cursor: "pointer" }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>Latest</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#18181b" }}>Morning check-in</div>
            <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2 }}>Today 8:15 AM · Mood: Good</div>
          </div>
          <Pill>2 symptoms</Pill>
        </div>
      </div>
    </div>
  );
}

// ─── Log ─────────────────────────────────────────────────────
function Log() {
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState("entries");
  const [generating, setGenerating] = useState(false);
  const [reportRange, setReportRange] = useState("week");
  const [reportDetail, setReportDetail] = useState("summary");
  const [incCheckins, setIncCheckins] = useState(true);
  const [incDocs, setIncDocs] = useState(true);
  const [incMeds, setIncMeds] = useState(true);
  const [incSymptoms, setIncSymptoms] = useState(true);
  const [incTrends, setIncTrends] = useState(true);
  const toggle = (id) => setExpanded(expanded === id ? null : id);
  const handleGen = () => { setGenerating(true); setTimeout(() => { setGenerating(false); setView("report"); }, 2000); };

  if (view === "report-config") return (
    <div style={{ padding: "28px 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={() => setView("entries")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#a1a1aa", display: "flex" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: "#18181b", margin: 0, letterSpacing: -0.3 }}>Generate Report</h2>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Time Range</div>
        <Seg value={reportRange} onChange={setReportRange} options={[{ value: "3days", label: "3 Days" }, { value: "week", label: "1 Week" }, { value: "2weeks", label: "2 Weeks" }, { value: "month", label: "Month" }]} />
        <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>{reportRange === "3days" ? "Feb 26–28 · 3 check-ins" : reportRange === "week" ? "Feb 22–28 · 7 check-ins, 1 doc" : reportRange === "2weeks" ? "Feb 14–28 · 10 check-ins, 1 doc" : "Jan 28 – Feb 28 · 24 check-ins, 3 docs"}</div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Detail Level</div>
        <Seg value={reportDetail} onChange={setReportDetail} options={[{ value: "brief", label: "Brief" }, { value: "summary", label: "Summary" }, { value: "detailed", label: "Detailed" }]} />
        <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>{reportDetail === "brief" ? "Key findings only" : reportDetail === "summary" ? "Findings + discussion points" : "Full daily breakdown"}</div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Include</div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "2px 14px", border: "1px solid #f4f4f5" }}>
          <Toggle on={incCheckins} onToggle={() => setIncCheckins(!incCheckins)} label="Check-in summaries" />
          <div style={{ height: 1, background: "#f4f4f5" }} /><Toggle on={incDocs} onToggle={() => setIncDocs(!incDocs)} label="Lab results & documents" />
          <div style={{ height: 1, background: "#f4f4f5" }} /><Toggle on={incMeds} onToggle={() => setIncMeds(!incMeds)} label="Medication adherence" />
          <div style={{ height: 1, background: "#f4f4f5" }} /><Toggle on={incSymptoms} onToggle={() => setIncSymptoms(!incSymptoms)} label="Symptom tracking" />
          <div style={{ height: 1, background: "#f4f4f5" }} /><Toggle on={incTrends} onToggle={() => setIncTrends(!incTrends)} label="Trend analysis" />
        </div>
      </div>
      <button onClick={handleGen} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "#18181b", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>Generate Report
      </button>
    </div>
  );

  if (generating) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "75vh", gap: 12 }}>
      <div style={{ width: 32, height: 32, border: "2px solid #f4f4f5", borderTopColor: "#18181b", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#a1a1aa" }}>Generating report…</span>
    </div>
  );

  if (view === "report") return (
    <div style={{ padding: "28px 20px 100px", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button onClick={() => setView("entries")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#a1a1aa", display: "flex" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: "#18181b", margin: 0 }}>Doctor Report</h2>
      </div>
      <p style={{ fontSize: 12, color: "#a1a1aa", margin: "0 0 20px", paddingLeft: 30 }}>{reportRange === "3days" ? "26–28 Feb" : reportRange === "week" ? "22–28 Feb" : reportRange === "2weeks" ? "14–28 Feb" : "28 Jan – 28 Feb"} · {reportDetail}</p>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Key Findings</div>
        {REPORT_DATA.findings.map((f, i) => (
          <div key={i} style={{ padding: "10px 13px", borderRadius: 8, fontSize: 13, lineHeight: 1.5, color: "#27272a", background: i < 2 ? "#fffbeb" : "#fff", border: i < 2 ? "1px solid #fef3c7" : "1px solid #f4f4f5", display: "flex", gap: 10, marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: i < 2 ? "#b45309" : "#d4d4d8", flexShrink: 0, marginTop: 2 }}>{i+1}</span>{f}
          </div>
        ))}
      </div>
      {reportDetail !== "brief" && <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Discussion Points</div>
        {REPORT_DATA.actions.map((a, i) => (
          <div key={i} style={{ padding: "10px 13px", borderRadius: 8, fontSize: 13, lineHeight: 1.5, background: "#f0fdf4", border: "1px solid #dcfce7", color: "#15803d", display: "flex", gap: 10, marginBottom: 5 }}><span style={{ opacity: 0.6 }}>→</span>{a}</div>
        ))}
      </div>}
      {reportDetail === "detailed" && <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Daily Breakdown</div>
        {CHECKINS.slice(0,4).map((c, i) => (
          <div key={i} style={{ padding: "10px 13px", borderRadius: 8, background: "#fff", border: "1px solid #f4f4f5", marginBottom: 5, fontSize: 13, color: "#27272a", lineHeight: 1.5 }}>
            <div style={{ fontWeight: 500, marginBottom: 1 }}>{c.date} · {c.time}</div>
            <div style={{ color: "#71717a" }}>Mood: {c.mood} · Energy: {c.energy}/10 · Sleep: {c.sleep}h{c.symptoms.length > 0 && ` · ${c.symptoms.join(", ")}`}</div>
          </div>
        ))}
      </div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #e4e4e7", background: "#fff", fontSize: 13, fontWeight: 500, color: "#18181b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Export PDF</button>
        <button style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #e4e4e7", background: "#fff", fontSize: 13, fontWeight: 500, color: "#18181b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>Share</button>
      </div>
      <button onClick={() => setView("report-config")} style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: "#f4f4f5", fontSize: 13, fontWeight: 500, color: "#71717a", cursor: "pointer" }}>Regenerate</button>
      <p style={{ fontSize: 10, color: "#d4d4d8", lineHeight: 1.5, marginTop: 12 }}>AI-generated. Does not constitute medical advice.</p>
    </div>
  );

  return (
    <div style={{ padding: "28px 20px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div><h2 style={{ fontSize: 22, fontWeight: 600, color: "#18181b", margin: "0 0 2px" }}>Log</h2><p style={{ fontSize: 12, color: "#a1a1aa", margin: 0 }}>7 check-ins · 1 document</p></div>
        <button onClick={() => setView("report-config")} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e4e4e7", background: "#fff", fontSize: 12, fontWeight: 500, color: "#18181b", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>Report</button>
      </div>
      <div style={{ background: "#fff", borderRadius: 10, padding: "13px 15px", border: "1px solid #f4f4f5", marginBottom: 6, cursor: "pointer" }} onClick={() => toggle("doc")}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: "#18181b" }}>Blood test results</div><div style={{ fontSize: 11, color: "#a1a1aa" }}>Feb 27 · 3:40 PM</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Pill variant="bad">flagged</Pill><Chev open={expanded === "doc"} /></div>
        </div>
        {expanded === "doc" && <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f4f4f5", display: "flex", flexDirection: "column", gap: 4, animation: "fadeUp 0.2s" }}>
          {LAB_RESULTS.map((r, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}><span style={{ fontSize: 13, color: "#27272a" }}><span style={{ fontWeight: 500 }}>{r.metric}</span> <span style={{ color: "#a1a1aa" }}>{r.value}</span></span><Pill variant={statusVariant(r.status)}>{r.status}</Pill></div>)}
        </div>}
      </div>
      {CHECKINS.slice(0,4).map(c => (
        <div key={c.id} style={{ background: "#fff", borderRadius: 10, padding: "13px 15px", border: c.flagged ? "1px solid #fef3c7" : "1px solid #f4f4f5", marginBottom: 6, cursor: "pointer" }} onClick={() => toggle(c.id)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: c.flagged ? "#fffbeb" : "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{c.mood === "Great" ? "😊" : c.mood === "Good" ? "🙂" : "😐"}</div>
              <div><div style={{ fontSize: 13, fontWeight: 500, color: "#18181b" }}>{c.date} · {c.mood}</div><div style={{ fontSize: 11, color: "#a1a1aa" }}>{c.time} · E {c.energy} · {c.sleep}h</div></div>
            </div><Chev open={expanded === c.id} />
          </div>
          {expanded === c.id && <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f4f4f5", animation: "fadeUp 0.2s" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div><div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 3 }}>Energy</div><Bar value={c.energy} /></div>
              <div><div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 3 }}>Symptoms</div><div style={{ fontSize: 12, color: c.symptoms.length ? "#dc2626" : "#16a34a", fontWeight: 500 }}>{c.symptoms.length ? c.symptoms.join(", ") : "None"}</div></div>
            </div>
            <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 3 }}>Medications</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{c.meds.map((m, i) => <Pill key={i} variant={m.taken ? "good" : "bad"}>{m.taken ? "✓" : "✗"} {m.name}</Pill>)}</div></div>
            {c.note && <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 4px", lineHeight: 1.5, fontStyle: "italic" }}>"{c.note}"</p>}
            {c.flagged && <div style={{ marginTop: 6, padding: "7px 10px", borderRadius: 6, background: "#fffbeb", fontSize: 11, color: "#b45309", fontWeight: 500 }}>⚠ {c.flag}</div>}
          </div>}
        </div>
      ))}
    </div>
  );
}

// ─── Trends ──────────────────────────────────────────────────
function Trends() {
  const [range, setRange] = useState("week");
  const data = CHECKINS.slice(0, 7).reverse();
  const labels = data.map(c => c.date.split(" ")[1]);
  const energyD = data.map(c => c.energy);
  const sleepD = data.map(c => c.sleep);
  const moodMap = { "Great": 3, "Good": 2, "Okay": 1 };
  const moodD = data.map(c => moodMap[c.mood] || 1);

  const moodCounts = { Great: 0, Good: 0, Okay: 0 };
  data.forEach(c => { if (moodCounts[c.mood] !== undefined) moodCounts[c.mood]++; });
  const totalMoods = data.length;

  const symptomCounts = {};
  data.forEach(c => c.symptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; }));
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]);

  const medNames = [...new Set(data.flatMap(c => c.meds.map(m => m.name)))];
  const medAdherence = medNames.map(name => {
    const total = data.filter(c => c.meds.find(m => m.name === name)).length;
    const taken = data.filter(c => c.meds.find(m => m.name === name && m.taken)).length;
    return { name: name.split(" ")[0], pct: total > 0 ? Math.round((taken / total) * 100) : 0 };
  });

  const avgEnergy = (energyD.reduce((a, b) => a + b, 0) / energyD.length).toFixed(1);
  const avgSleep = (sleepD.reduce((a, b) => a + b, 0) / sleepD.length).toFixed(1);

  return (
    <div style={{ padding: "28px 20px 100px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: "#18181b", margin: "0 0 4px", letterSpacing: -0.3 }}>Trends</h2>
      <p style={{ fontSize: 12, color: "#a1a1aa", margin: "0 0 16px" }}>Patterns from your check-ins</p>

      <Seg value={range} onChange={setRange} options={[{ value: "week", label: "1 Week" }, { value: "2weeks", label: "2 Weeks" }, { value: "month", label: "Month" }]} />

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 18, marginBottom: 18 }}>
        <div style={{ background: "#fff", borderRadius: 10, padding: "13px", border: "1px solid #f4f4f5" }}>
          <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Avg Energy</div>
          <div style={{ fontSize: 26, fontWeight: 600, color: "#18181b", letterSpacing: -0.5 }}>{avgEnergy}<span style={{ fontSize: 12, color: "#d4d4d8" }}>/10</span></div>
          <div style={{ fontSize: 11, color: parseFloat(avgEnergy) >= 6.5 ? "#16a34a" : "#d97706", marginTop: 2 }}>{parseFloat(avgEnergy) >= 6.5 ? "↑ Stable" : "↓ Below baseline"}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "13px", border: "1px solid #f4f4f5" }}>
          <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Avg Sleep</div>
          <div style={{ fontSize: 26, fontWeight: 600, color: "#18181b", letterSpacing: -0.5 }}>{avgSleep}<span style={{ fontSize: 12, color: "#d4d4d8" }}>hrs</span></div>
          <div style={{ fontSize: 11, color: parseFloat(avgSleep) >= 7 ? "#16a34a" : "#d97706", marginTop: 2 }}>{parseFloat(avgSleep) >= 7 ? "On target" : "Below 7hr target"}</div>
        </div>
      </div>

      {/* Energy line */}
      <div style={{ background: "#fff", borderRadius: 10, padding: "15px", border: "1px solid #f4f4f5", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#18181b", marginBottom: 12 }}>Energy</div>
        <Sparkline data={energyD} labels={labels} color="#18181b" fill height={52} highlight={energyD.length - 1} />
      </div>

      {/* Sleep line */}
      <div style={{ background: "#fff", borderRadius: 10, padding: "15px", border: "1px solid #f4f4f5", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#18181b", marginBottom: 12 }}>Sleep</div>
        <Sparkline data={sleepD} labels={labels} color="#818cf8" fill height={52} highlight={sleepD.length - 1} />
      </div>

      {/* Mood distribution */}
      <div style={{ background: "#fff", borderRadius: 10, padding: "15px", border: "1px solid #f4f4f5", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#18181b", marginBottom: 12 }}>Mood Distribution</div>
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
          {[{ key: "Great", color: "#4ade80" }, { key: "Good", color: "#fbbf24" }, { key: "Okay", color: "#f87171" }].map(m => (
            moodCounts[m.key] > 0 && <div key={m.key} style={{ width: `${(moodCounts[m.key] / totalMoods) * 100}%`, background: m.color, transition: "width 0.4s" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[{ key: "Great", color: "#4ade80", emoji: "😊" }, { key: "Good", color: "#fbbf24", emoji: "🙂" }, { key: "Okay", color: "#f87171", emoji: "😐" }].map(m => (
            <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
              <span style={{ fontSize: 12, color: "#71717a" }}>{m.emoji} {m.key}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#18181b" }}>{moodCounts[m.key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mood trend */}
      <div style={{ background: "#fff", borderRadius: 10, padding: "15px", border: "1px solid #f4f4f5", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#18181b", marginBottom: 12 }}>Mood Trend</div>
        <Sparkline data={moodD} labels={labels} color="#f59e0b" height={40} highlight={moodD.length - 1} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 9, color: "#d4d4d8" }}>Okay</span>
          <span style={{ fontSize: 9, color: "#d4d4d8" }}>Great</span>
        </div>
      </div>

      {/* Symptoms */}
      <div style={{ background: "#fff", borderRadius: 10, padding: "15px", border: "1px solid #f4f4f5", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#18181b", marginBottom: 12 }}>Top Symptoms</div>
        {topSymptoms.length === 0 ? <div style={{ fontSize: 13, color: "#a1a1aa" }}>No symptoms reported</div> :
          topSymptoms.map(([name, count], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, color: "#27272a" }}>{name}</span>
                  <span style={{ fontSize: 12, color: "#a1a1aa" }}>{count}x</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "#f4f4f5" }}>
                  <div style={{ width: `${(count / data.length) * 100}%`, height: "100%", borderRadius: 2, background: "#f87171", transition: "width 0.4s" }} />
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Medication adherence */}
      <div style={{ background: "#fff", borderRadius: 10, padding: "15px", border: "1px solid #f4f4f5" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#18181b", marginBottom: 12 }}>Medication Adherence</div>
        {medAdherence.map((med, i) => (
          <div key={i} style={{ marginBottom: i < medAdherence.length - 1 ? 10 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "#27272a" }}>{med.name}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: med.pct >= 90 ? "#16a34a" : med.pct >= 70 ? "#d97706" : "#dc2626" }}>{med.pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#f4f4f5" }}>
              <div style={{ width: `${med.pct}%`, height: "100%", borderRadius: 3, background: med.pct >= 90 ? "#4ade80" : med.pct >= 70 ? "#fbbf24" : "#f87171", transition: "width 0.4s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div style={{ marginTop: 14, padding: "13px 15px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #e0f2fe" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#0369a1" }}>AI Insight</span>
        </div>
        <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.5 }}>
          Your energy dips correlate with nights under 6 hours sleep. Feb 27 shows the lowest energy (5/10) following 5 hours sleep, combined with missed Vitamin D and new symptoms (thirst, fatigue) that may relate to your elevated HbA1c.
        </p>
      </div>
    </div>
  );
}

// ─── Profile ─────────────────────────────────────────────────
function Profile() {
  const [n1, setN1] = useState(true); const [n2, setN2] = useState(true); const [n3, setN3] = useState(false);
  return (
    <div style={{ padding: "28px 20px 100px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: "#18181b", margin: "0 0 24px" }}>Profile</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#18181b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 600, flexShrink: 0 }}>D</div>
        <div><div style={{ fontSize: 16, fontWeight: 600, color: "#18181b" }}>Dash</div><div style={{ fontSize: 13, color: "#a1a1aa" }}>dash@example.com</div></div>
      </div>
      {[{ title: "Health Profile", items: [{ l: "DOB", v: "15 Mar 1999" }, { l: "Blood type", v: "O+" }, { l: "Conditions", v: "Type 2 Diabetes" }, { l: "Allergies", v: "None" }] },
        { title: "Check-in Preferences", items: [{ l: "Time", v: "8:00 AM" }, { l: "Frequency", v: "Daily" }, { l: "Voice", v: "Sarah (calm)" }, { l: "Language", v: "English" }] }
      ].map((section, si) => (
        <div key={si} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{section.title}</div>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #f4f4f5", overflow: "hidden" }}>
            {section.items.map((item, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: i < section.items.length - 1 ? "1px solid #f4f4f5" : "none" }}><span style={{ fontSize: 13, color: "#71717a" }}>{item.l}</span><span style={{ fontSize: 13, fontWeight: 500, color: "#18181b" }}>{item.v}</span></div>)}
          </div>
        </div>
      ))}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Medications</div>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #f4f4f5", overflow: "hidden" }}>
          {[{ n: "Metformin 500mg", s: "Once daily, with breakfast" }, { n: "Vitamin D 1000 IU", s: "Once daily" }].map((m, i) => (
            <div key={i} style={{ padding: "11px 14px", borderBottom: i < 1 ? "1px solid #f4f4f5" : "none" }}><div style={{ fontSize: 13, fontWeight: 500, color: "#18181b" }}>{m.n}</div><div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 1 }}>{m.s}</div></div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Notifications</div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "2px 14px", border: "1px solid #f4f4f5" }}>
          <Toggle on={n1} onToggle={() => setN1(!n1)} label="Check-in reminders" /><div style={{ height: 1, background: "#f4f4f5" }} />
          <Toggle on={n2} onToggle={() => setN2(!n2)} label="Health alerts" /><div style={{ height: 1, background: "#f4f4f5" }} />
          <Toggle on={n3} onToggle={() => setN3(!n3)} label="Weekly summary" />
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #f4f4f5", overflow: "hidden" }}>
        <button style={{ width: "100%", padding: "11px 14px", border: "none", borderBottom: "1px solid #f4f4f5", background: "none", fontSize: 13, color: "#18181b", textAlign: "left", cursor: "pointer", fontWeight: 500 }}>Export all data</button>
        <button style={{ width: "100%", padding: "11px 14px", border: "none", background: "none", fontSize: 13, color: "#dc2626", textAlign: "left", cursor: "pointer", fontWeight: 500 }}>Delete all data</button>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [inputOpen, setInputOpen] = useState(false);

  const nav = [
    { id: "dashboard", label: "Home", d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
    { id: "log", label: "Log", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { id: "input", label: "" },
    { id: "trends", label: "Trends", d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
    { id: "profile", label: "Profile", d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  ];

  return (
    <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", height: "100vh", minHeight: 680, background: "#fafafa", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Outfit', system-ui, -apple-system, sans-serif", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }
        @keyframes waveBar { 0%,100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "dashboard" && <Dashboard goTo={setTab} />}
        {tab === "log" && <Log />}
        {tab === "trends" && <Trends />}
        {tab === "profile" && <Profile />}
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 64, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 4px", background: "#fff", borderTop: "1px solid #f4f4f5" }}>
        {nav.map(item => item.id === "input" ? (
          <button key="input" onClick={() => setInputOpen(true)} style={{
            width: 48, height: 48, borderRadius: "50%", border: "none",
            background: "#18181b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)", transform: "translateY(-6px)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        ) : (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer", padding: "6px 14px",
            color: tab === item.id ? "#18181b" : "#d4d4d8", transition: "color 0.15s"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={item.d} /></svg>
            <span style={{ fontSize: 10, fontWeight: tab === item.id ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>

      {inputOpen && <InputOverlay onClose={() => setInputOpen(false)} />}
    </div>
  );
}

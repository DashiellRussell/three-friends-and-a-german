import { useState } from "react";

const TABLES = [
  {
    name: "users",
    x: 20, y: 20,
    color: "#18181b",
    desc: "User profiles, health info, and preferences. Auth anchor — all RLS policies reference this.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "email", type: "text" },
      { name: "display_name", type: "text" },
      { name: "date_of_birth", type: "date" },
      { name: "blood_type", type: "text" },
      { name: "conditions", type: "text[]" },
      { name: "allergies", type: "text[]" },
      { name: "checkin_time", type: "time" },
      { name: "voice_pref", type: "text" },
      { name: "language", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "check_ins",
    x: 340, y: 20,
    color: "#16a34a",
    desc: "Daily health entries via voice or text. Transcript stored for re-processing. Embedding enables semantic search across all check-ins.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "user_id", type: "uuid", fk: "users" },
      { name: "input_mode", type: "enum", note: "voice | text" },
      { name: "mood", type: "text" },
      { name: "energy", type: "int2" },
      { name: "sleep_hours", type: "numeric" },
      { name: "notes", type: "text" },
      { name: "transcript", type: "text" },
      { name: "audio_url", type: "text" },
      { name: "embedding", type: "vector(1024)", vec: true },
      { name: "flagged", type: "boolean" },
      { name: "flag_reason", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "symptoms",
    x: 700, y: 20,
    color: "#dc2626",
    desc: "Individual symptoms logged per check-in. Separated from check_ins for querying frequency and trends.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "check_in_id", type: "uuid", fk: "check_ins" },
      { name: "name", type: "text" },
      { name: "severity", type: "int2", note: "1–10" },
      { name: "body_area", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "medications",
    x: 20, y: 340,
    color: "#7c3aed",
    desc: "User's medication list. Active flag allows soft-delete when prescriptions change.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "user_id", type: "uuid", fk: "users" },
      { name: "name", type: "text" },
      { name: "dosage", type: "text" },
      { name: "schedule", type: "text" },
      { name: "active", type: "boolean" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "medication_logs",
    x: 340, y: 370,
    color: "#7c3aed",
    desc: "Per-check-in medication adherence. Join with medications for adherence % calculations.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "check_in_id", type: "uuid", fk: "check_ins" },
      { name: "medication_id", type: "uuid", fk: "medications" },
      { name: "taken", type: "boolean" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "documents",
    x: 700, y: 230,
    color: "#0284c7",
    desc: "Uploaded medical documents. Files in Supabase Storage, metadata here. Summary embedding enables RAG retrieval across all documents.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "user_id", type: "uuid", fk: "users" },
      { name: "file_name", type: "text" },
      { name: "file_url", type: "text" },
      { name: "file_type", type: "text" },
      { name: "summary", type: "text" },
      { name: "embedding", type: "vector(1024)", vec: true },
      { name: "flagged", type: "boolean" },
      { name: "flag_reason", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "document_findings",
    x: 700, y: 480,
    color: "#0284c7",
    desc: "Extracted lab metrics from documents. Status enum enables filtering for alerts. Embedding allows semantic matching of findings to symptoms.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "document_id", type: "uuid", fk: "documents" },
      { name: "metric", type: "text" },
      { name: "value", type: "text" },
      { name: "unit", type: "text" },
      { name: "status", type: "enum", note: "normal | elevated | low" },
      { name: "reference_note", type: "text" },
      { name: "embedding", type: "vector(1024)", vec: true },
    ],
  },
  {
    name: "document_chunks",
    x: 1020, y: 310,
    color: "#06b6d4",
    desc: "Chunked document text for RAG pipeline. Each chunk is independently embedded for fine-grained retrieval. Chunk overlap ensures context continuity.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "document_id", type: "uuid", fk: "documents" },
      { name: "chunk_index", type: "int4" },
      { name: "content", type: "text" },
      { name: "token_count", type: "int4" },
      { name: "embedding", type: "vector(1024)", vec: true },
      { name: "metadata", type: "jsonb" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "reports",
    x: 20, y: 560,
    color: "#d97706",
    desc: "Generated doctor reports. Config stored in content_json. PDF rendered and stored in Supabase Storage.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "user_id", type: "uuid", fk: "users" },
      { name: "date_from", type: "date" },
      { name: "date_to", type: "date" },
      { name: "detail_level", type: "enum", note: "brief | summary | detailed" },
      { name: "content_json", type: "jsonb" },
      { name: "pdf_url", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "alerts",
    x: 340, y: 590,
    color: "#dc2626",
    desc: "AI-generated health alerts from check-ins, documents, or trend analysis. Severity drives UI prominence.",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "user_id", type: "uuid", fk: "users" },
      { name: "source_type", type: "enum", note: "check_in | document | trend" },
      { name: "source_id", type: "uuid" },
      { name: "severity", type: "enum", note: "info | warning | critical" },
      { name: "message", type: "text" },
      { name: "dismissed", type: "boolean" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
];

const RELATIONS = [
  { from: "users", to: "check_ins", label: "1:N" },
  { from: "check_ins", to: "symptoms", label: "1:N" },
  { from: "users", to: "medications", label: "1:N" },
  { from: "check_ins", to: "medication_logs", label: "1:N" },
  { from: "medications", to: "medication_logs", label: "1:N" },
  { from: "users", to: "documents", label: "1:N" },
  { from: "documents", to: "document_findings", label: "1:N" },
  { from: "documents", to: "document_chunks", label: "1:N" },
  { from: "users", to: "reports", label: "1:N" },
  { from: "users", to: "alerts", label: "1:N" },
];

const COL_W = 290;
const ROW_H = 22;
const HEADER_H = 36;

function getTableRect(t) {
  return { x: t.x, y: t.y, w: COL_W, h: HEADER_H + t.columns.length * ROW_H + 8 };
}

function TableCard({ table, selected, onSelect }) {
  const r = getTableRect(table);
  const vecCols = table.columns.filter(c => c.vec);
  return (
    <g onClick={() => onSelect(table.name)} style={{ cursor: "pointer" }}>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="8" fill="#fff"
        stroke={selected ? table.color : "#e4e4e7"} strokeWidth={selected ? 2 : 1}
        filter={selected ? "url(#shadow)" : undefined} />
      <rect x={r.x} y={r.y} width={r.w} height={HEADER_H} rx="8" fill={table.color} />
      <rect x={r.x} y={r.y + HEADER_H - 8} width={r.w} height={8} fill={table.color} />
      <text x={r.x + 12} y={r.y + 23} fill="#fff" fontSize="13" fontWeight="600" fontFamily="'Outfit', system-ui">{table.name}</text>
      {vecCols.length > 0 && (
        <g>
          <rect x={r.x + r.w - 54} y={r.y + 9} width={42} height={18} rx="4" fill="rgba(255,255,255,0.15)" />
          <text x={r.x + r.w - 33} y={r.y + 22} fill="rgba(255,255,255,0.8)" fontSize="9" fontWeight="600" fontFamily="'Outfit', system-ui" textAnchor="middle">
            🔮 vec
          </text>
        </g>
      )}
      {table.columns.map((col, i) => {
        const cy = r.y + HEADER_H + 4 + i * ROW_H;
        return (
          <g key={col.name}>
            {i > 0 && <line x1={r.x + 10} y1={cy} x2={r.x + r.w - 10} y2={cy} stroke="#f4f4f5" strokeWidth="1" />}
            {col.pk && <rect x={r.x + 10} y={cy + 3} width={16} height={14} rx="3" fill="#fef3c7" />}
            {col.pk && <text x={r.x + 13} y={cy + 14} fontSize="8" fontWeight="700" fill="#b45309" fontFamily="'Outfit', system-ui">PK</text>}
            {col.fk && !col.pk && <rect x={r.x + 10} y={cy + 3} width={16} height={14} rx="3" fill="#e0e7ff" />}
            {col.fk && !col.pk && <text x={r.x + 13} y={cy + 14} fontSize="8" fontWeight="700" fill="#4f46e5" fontFamily="'Outfit', system-ui">FK</text>}
            {col.vec && <rect x={r.x + 10} y={cy + 3} width={20} height={14} rx="3" fill="#f0fdfa" stroke="#99f6e4" strokeWidth="0.5" />}
            {col.vec && <text x={r.x + 14} y={cy + 14} fontSize="7" fontWeight="700" fill="#0d9488" fontFamily="'Outfit', system-ui">VEC</text>}
            <text x={r.x + (col.pk || col.fk ? 32 : col.vec ? 36 : 12)} y={cy + 15} fontSize="12" fill={col.vec ? "#0d9488" : "#27272a"} fontFamily="'Outfit', system-ui" fontWeight={col.pk || col.vec ? "600" : "400"}>
              {col.name}
            </text>
            <text x={r.x + r.w - 12} y={cy + 15} fontSize="10" fill={col.vec ? "#0d9488" : "#a1a1aa"} fontFamily="'Outfit', monospace" textAnchor="end">
              {col.type}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function RelationLine({ from, to, label, highlight }) {
  const ft = TABLES.find(t => t.name === from);
  const tt = TABLES.find(t => t.name === to);
  if (!ft || !tt) return null;
  const fr = getTableRect(ft), tr = getTableRect(tt);
  let fp, tp;
  if (fr.x + fr.w + 10 <= tr.x) {
    fp = { x: fr.x + fr.w, y: fr.y + fr.h / 2 };
    tp = { x: tr.x, y: tr.y + tr.h / 2 };
  } else if (tr.x + tr.w + 10 <= fr.x) {
    fp = { x: fr.x, y: fr.y + fr.h / 2 };
    tp = { x: tr.x + tr.w, y: tr.y + tr.h / 2 };
  } else if (fr.y + fr.h <= tr.y) {
    fp = { x: fr.x + fr.w / 2, y: fr.y + fr.h };
    tp = { x: tr.x + tr.w / 2, y: tr.y };
  } else {
    fp = { x: fr.x + fr.w / 2, y: fr.y + fr.h };
    tp = { x: tr.x + tr.w / 2, y: tr.y };
  }
  const mx = (fp.x + tp.x) / 2, my = (fp.y + tp.y) / 2;
  const dx = Math.abs(tp.x - fp.x), dy = Math.abs(tp.y - fp.y);
  const path = dx > dy
    ? `M${fp.x},${fp.y} C${fp.x + dx * 0.4},${fp.y} ${tp.x - dx * 0.4},${tp.y} ${tp.x},${tp.y}`
    : `M${fp.x},${fp.y} C${fp.x},${fp.y + dy * 0.4} ${tp.x},${tp.y - dy * 0.4} ${tp.x},${tp.y}`;
  return (
    <g>
      <path d={path} fill="none" stroke={highlight ? "#18181b" : "#d4d4d8"} strokeWidth={highlight ? 1.5 : 1} strokeDasharray={highlight ? "none" : "4 3"} />
      <circle cx={fp.x} cy={fp.y} r={3} fill={highlight ? "#18181b" : "#d4d4d8"} />
      <circle cx={tp.x} cy={tp.y} r={3} fill={highlight ? "#18181b" : "#d4d4d8"} />
      <rect x={mx - 14} y={my - 9} width={28} height={18} rx={4} fill={highlight ? "#18181b" : "#f4f4f5"} />
      <text x={mx} y={my + 4} fontSize="9" fontWeight="600" fill={highlight ? "#fff" : "#a1a1aa"} fontFamily="'Outfit', system-ui" textAnchor="middle">{label}</text>
    </g>
  );
}

export default function SchemaDiagram() {
  const [selected, setSelected] = useState(null);
  const relatedTables = selected ? RELATIONS.filter(r => r.from === selected || r.to === selected).flatMap(r => [r.from, r.to]) : [];
  const totalW = Math.max(...TABLES.map(t => t.x + COL_W)) + 40;
  const totalH = Math.max(...TABLES.map(t => t.y + getTableRect(t).h)) + 40;
  const vecTables = TABLES.filter(t => t.columns.some(c => c.vec));

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fafafa", fontFamily: "'Outfit', system-ui, -apple-system, sans-serif", padding: "24px 16px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'); * { box-sizing: border-box; }`}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#18181b", margin: "0 0 4px", letterSpacing: -0.5 }}>Database Schema</h1>
          <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0 }}>Health Companion · Supabase + pgvector · {TABLES.length} tables · Click a table to inspect</p>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { color: "#18181b", label: "Auth" },
            { color: "#16a34a", label: "Check-ins" },
            { color: "#dc2626", label: "Symptoms / Alerts" },
            { color: "#7c3aed", label: "Medications" },
            { color: "#0284c7", label: "Documents" },
            { color: "#06b6d4", label: "RAG Chunks" },
            { color: "#d97706", label: "Reports" },
          ].map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
              <span style={{ fontSize: 11, color: "#71717a" }}>{l.label}</span>
            </div>
          ))}
          <div style={{ height: 12, width: 1, background: "#e4e4e7" }} />
          {[
            { bg: "#fef3c7", color: "#b45309", label: "PK", text: "Primary Key" },
            { bg: "#e0e7ff", color: "#4f46e5", label: "FK", text: "Foreign Key" },
            { bg: "#f0fdfa", color: "#0d9488", label: "VEC", text: "Vector Embedding" },
          ].map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 13, borderRadius: 2, background: b.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: b.color }}>{b.label}</span>
              </div>
              <span style={{ fontSize: 11, color: "#71717a" }}>{b.text}</span>
            </div>
          ))}
        </div>

        {selected && (
          <button onClick={() => setSelected(null)} style={{ marginBottom: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid #e4e4e7", background: "#fff", fontSize: 12, color: "#71717a", cursor: "pointer", fontWeight: 500 }}>✕ Clear selection</button>
        )}

        {/* SVG Diagram */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f4f4f5", overflow: "auto" }}>
          <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} style={{ display: "block", minWidth: totalW }}>
            <defs>
              <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.08" />
              </filter>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.5" fill="#e4e4e7" opacity="0.5" />
              </pattern>
            </defs>
            <rect width={totalW} height={totalH} fill="url(#grid)" />
            {RELATIONS.map((rel, i) => <RelationLine key={i} {...rel} highlight={selected && (rel.from === selected || rel.to === selected)} />)}
            {TABLES.map(t => <TableCard key={t.name} table={t} selected={selected === t.name || relatedTables.includes(t.name)} onSelect={setSelected} />)}
          </svg>
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const t = TABLES.find(tb => tb.name === selected);
          const rels = RELATIONS.filter(r => r.from === selected || r.to === selected);
          if (!t) return null;
          return (
            <div style={{ marginTop: 16, background: "#fff", borderRadius: 12, border: "1px solid #f4f4f5", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: t.color }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: "#18181b" }}>{t.name}</span>
                <span style={{ fontSize: 12, color: "#a1a1aa" }}>· {t.columns.length} columns · {rels.length} relationships</span>
              </div>
              {t.desc && <p style={{ fontSize: 13, color: "#71717a", margin: "4px 0 14px", lineHeight: 1.5 }}>{t.desc}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Columns</div>
                  {t.columns.map((col, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 13 }}>
                      {col.pk && <span style={{ fontSize: 8, fontWeight: 700, color: "#b45309", background: "#fef3c7", padding: "1px 4px", borderRadius: 3 }}>PK</span>}
                      {col.fk && <span style={{ fontSize: 8, fontWeight: 700, color: "#4f46e5", background: "#e0e7ff", padding: "1px 4px", borderRadius: 3 }}>FK</span>}
                      {col.vec && <span style={{ fontSize: 8, fontWeight: 700, color: "#0d9488", background: "#f0fdfa", padding: "1px 4px", borderRadius: 3 }}>VEC</span>}
                      <span style={{ color: col.vec ? "#0d9488" : "#18181b", fontWeight: col.pk || col.vec ? 600 : 400 }}>{col.name}</span>
                      <span style={{ color: "#a1a1aa", fontFamily: "monospace", fontSize: 11 }}>{col.type}</span>
                      {col.note && <span style={{ color: "#d4d4d8", fontSize: 11 }}>({col.note})</span>}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Relationships</div>
                  {rels.map((rel, i) => {
                    const other = rel.from === selected ? rel.to : rel.from;
                    const dir = rel.from === selected ? "→" : "←";
                    const ot = TABLES.find(tb => tb.name === other);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 13, cursor: "pointer" }} onClick={() => setSelected(other)}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: ot?.color || "#ccc" }} />
                        <span style={{ color: "#71717a" }}>{dir}</span>
                        <span style={{ color: "#18181b", fontWeight: 500 }}>{other}</span>
                        <span style={{ fontSize: 10, color: "#a1a1aa", background: "#f4f4f5", padding: "1px 5px", borderRadius: 3 }}>{rel.label}</span>
                      </div>
                    );
                  })}
                  {rels.length === 0 && <div style={{ fontSize: 13, color: "#a1a1aa" }}>No relationships</div>}

                  <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, marginTop: 16 }}>RLS Policy</div>
                  <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.5, background: "#f9fafb", padding: "8px 10px", borderRadius: 6, fontFamily: "monospace" }}>
                    {selected === "users" ? "auth.uid() = id"
                      : t.columns.find(c => c.name === "user_id") ? "user_id = auth.uid()"
                      : `${t.columns.find(c => c.fk)?.fk || "parent"}_id → owner chain`}
                  </div>

                  {t.columns.some(c => c.vec) && (
                    <>
                      <div style={{ fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, marginTop: 16 }}>Vector Index</div>
                      <div style={{ fontSize: 12, color: "#0d9488", lineHeight: 1.5, background: "#f0fdfa", padding: "8px 10px", borderRadius: 6, fontFamily: "monospace" }}>
                        CREATE INDEX ON {t.name}<br />
                        USING ivfflat (embedding vector_cosine_ops)<br />
                        WITH (lists = 100);
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Vector / RAG info card */}
        <div style={{ marginTop: 16, background: "#f0fdfa", borderRadius: 12, border: "1px solid #ccfbf1", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🔮</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0d9488" }}>Vector Embeddings & RAG Pipeline</span>
          </div>
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 12 }}>
            Four tables carry <span style={{ fontFamily: "monospace", background: "#ccfbf1", padding: "1px 4px", borderRadius: 3, fontSize: 12, color: "#0d9488" }}>vector(1024)</span> columns 
            for semantic search via <span style={{ fontWeight: 600 }}>pgvector</span> and <span style={{ fontWeight: 600 }}>mistral-embed</span>:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {vecTables.map((t, i) => (
              <div key={i} onClick={() => setSelected(t.name)} style={{
                padding: "10px 12px", borderRadius: 8, background: "#fff", border: "1px solid #e0f2f1",
                cursor: "pointer", transition: "border-color 0.15s"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#18181b" }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.4 }}>
                  {t.name === "check_ins" && "Embed transcript + notes for semantic symptom search across all entries"}
                  {t.name === "documents" && "Embed document summary for whole-document retrieval in report generation"}
                  {t.name === "document_findings" && "Embed individual metrics for matching findings to reported symptoms"}
                  {t.name === "document_chunks" && "Chunked text (512 tokens, 50 overlap) for fine-grained RAG retrieval"}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: "12px 14px", background: "#fff", borderRadius: 8, border: "1px solid #e0f2f1" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#0d9488", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>RAG Query Flow</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
              {[
                { label: "User query", sub: "voice / text" },
                { label: "→ mistral-embed" },
                { label: "→ pgvector search", sub: "cosine similarity" },
                { label: "→ top-K chunks + findings" },
                { label: "→ Mistral Large", sub: "with context" },
                { label: "→ response" },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <div style={{ padding: "4px 8px", borderRadius: 5, background: i === 0 || i === 5 ? "#18181b" : i === 1 || i === 4 ? "#fef3c7" : "#f0fdfa", marginRight: 2 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: i === 0 || i === 5 ? "#fff" : i === 1 || i === 4 ? "#b45309" : "#0d9488", whiteSpace: "nowrap" }}>{step.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#71717a", lineHeight: 1.6 }}>
            <span style={{ fontFamily: "monospace", background: "#ccfbf1", padding: "1px 4px", borderRadius: 3, fontSize: 11, color: "#0d9488" }}>match_documents(query_embedding, match_count, filter)</span> — 
            Supabase RPC function wrapping cosine similarity search with RLS filtering. Returns ranked chunks with similarity scores.
          </div>
        </div>

        {/* General notes */}
        <div style={{ marginTop: 12, padding: "14px 16px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f4f4f5" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#18181b", marginBottom: 6 }}>Implementation Notes</div>
          <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.6 }}>
            UUIDs via <span style={{ fontFamily: "monospace", background: "#f4f4f5", padding: "1px 4px", borderRadius: 3 }}>gen_random_uuid()</span>. 
            RLS on all tables — users access only their data, chain through FKs for child tables. 
            Timestamps default <span style={{ fontFamily: "monospace", background: "#f4f4f5", padding: "1px 4px", borderRadius: 3 }}>now()</span>.
            Files in Supabase Storage, metadata in <span style={{ fontFamily: "monospace", background: "#f4f4f5", padding: "1px 4px", borderRadius: 3 }}>documents</span>.
            Enable pgvector: <span style={{ fontFamily: "monospace", background: "#f4f4f5", padding: "1px 4px", borderRadius: 3 }}>CREATE EXTENSION vector;</span>
            Document chunking: 512 tokens with 50-token overlap, stored in <span style={{ fontFamily: "monospace", background: "#f4f4f5", padding: "1px 4px", borderRadius: 3 }}>document_chunks</span> for granular retrieval.
            IVFFlat index recommended for &gt;1K rows; switch to HNSW for &gt;100K.
          </div>
        </div>
      </div>
    </div>
  );
}

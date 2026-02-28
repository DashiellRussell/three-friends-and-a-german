import { jsPDF } from "jspdf";

const BLOOD_TESTS = [
  { name: "Haemoglobin",       unit: "g/dL",    low: 11.0, high: 17.5 },
  { name: "White Blood Cells", unit: "x10⁹/L",  low: 4.0,  high: 11.0 },
  { name: "Platelets",         unit: "x10⁹/L",  low: 150,  high: 400  },
  { name: "Glucose (fasting)", unit: "mmol/L",  low: 3.9,  high: 5.6  },
  { name: "HbA1c",             unit: "%",        low: 4.0,  high: 5.6  },
  { name: "Total Cholesterol", unit: "mmol/L",  low: 3.0,  high: 5.2  },
  { name: "LDL Cholesterol",   unit: "mmol/L",  low: 1.8,  high: 3.4  },
  { name: "HDL Cholesterol",   unit: "mmol/L",  low: 1.0,  high: 2.2  },
  { name: "Triglycerides",     unit: "mmol/L",  low: 0.5,  high: 1.7  },
  { name: "Creatinine",        unit: "µmol/L",  low: 60,   high: 110  },
  { name: "eGFR",              unit: "mL/min",  low: 60,   high: 120  },
  { name: "Sodium",            unit: "mmol/L",  low: 136,  high: 145  },
  { name: "Potassium",         unit: "mmol/L",  low: 3.5,  high: 5.0  },
  { name: "ALT",               unit: "U/L",     low: 7,    high: 56   },
  { name: "TSH",               unit: "mIU/L",   low: 0.4,  high: 4.0  },
];

const MEDICATIONS = [
  { name: "Metformin",    dose: "500 mg",  frequency: "Twice daily with meals" },
  { name: "Atorvastatin", dose: "20 mg",   frequency: "Once daily at night"     },
  { name: "Lisinopril",   dose: "10 mg",   frequency: "Once daily in the morning" },
  { name: "Aspirin",      dose: "100 mg",  frequency: "Once daily with food"    },
  { name: "Omeprazole",   dose: "20 mg",   frequency: "Once daily before breakfast" },
];

function randBetween(min: number, max: number, dp = 1): number {
  const val = min + Math.random() * (max - min);
  return parseFloat(val.toFixed(dp));
}

function varyValue(low: number, high: number): { value: number; status: "Normal" | "Low" | "High" } {
  // ~70% chance normal, 15% low, 15% high
  const roll = Math.random();
  if (roll < 0.70) {
    return { value: randBetween(low, high), status: "Normal" };
  } else if (roll < 0.85) {
    const margin = (high - low) * 0.3;
    return { value: randBetween(low - margin, low - 0.01), status: "Low" };
  } else {
    const margin = (high - low) * 0.3;
    return { value: randBetween(high + 0.01, high + margin), status: "High" };
  }
}

export function generateTestReport(): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  const date = new Date().toLocaleDateString("en-AU", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const patientId = `P-${Math.floor(10000 + Math.random() * 90000)}`;

  // ── Header bar ──
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("AI Health Companion", margin, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 170);
  doc.text("Pathology Report — Test Data Only", margin, 19);
  doc.text(`Generated: ${date}`, pageW - margin, 12, { align: "right" });
  doc.text(`Patient ID: ${patientId}`, pageW - margin, 19, { align: "right" });
  y = 38;

  // ── Disclaimer banner ──
  doc.setFillColor(255, 247, 237); // amber-50
  doc.setDrawColor(251, 191, 36);  // amber-400
  doc.roundedRect(margin, y, contentW, 10, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 83, 9); // amber-800
  doc.text(
    "NOTICE: This is synthetic test data generated for demonstration purposes only. Not for clinical use.",
    margin + 3, y + 6.5,
  );
  y += 17;

  // ── Blood test results ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text("Blood Test Results", margin, y);
  y += 7;

  // Table header
  doc.setFillColor(244, 244, 245); // zinc-100
  doc.rect(margin, y, contentW, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text("Test", margin + 3, y + 4.8);
  doc.text("Result", margin + contentW * 0.52, y + 4.8);
  doc.text("Unit", margin + contentW * 0.65, y + 4.8);
  doc.text("Ref. Range", margin + contentW * 0.78, y + 4.8);
  doc.text("Status", margin + contentW * 0.93, y + 4.8, { align: "right" });
  y += 7;

  const results = BLOOD_TESTS.map((t) => ({ ...t, ...varyValue(t.low, t.high) }));

  results.forEach((r, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentW, 7, "F");
    }

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 24, 27);
    doc.text(r.name, margin + 3, y + 4.8);
    doc.text(String(r.value), margin + contentW * 0.52, y + 4.8);
    doc.text(r.unit, margin + contentW * 0.65, y + 4.8);
    doc.text(`${r.low} – ${r.high}`, margin + contentW * 0.78, y + 4.8);

    // Status pill colour
    if (r.status === "Normal") {
      doc.setTextColor(22, 163, 74);  // green-600
    } else if (r.status === "Low") {
      doc.setTextColor(59, 130, 246); // blue-500
    } else {
      doc.setTextColor(220, 38, 38);  // red-600
    }
    doc.setFont("helvetica", "bold");
    doc.text(r.status, margin + contentW * 0.93, y + 4.8, { align: "right" });
    doc.setTextColor(24, 24, 27);
    doc.setFont("helvetica", "normal");
    y += 7;
  });

  y += 8;

  // ── Medications ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text("Current Medications", margin, y);
  y += 7;

  doc.setFillColor(244, 244, 245);
  doc.rect(margin, y, contentW, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(113, 113, 122);
  doc.text("Medication", margin + 3, y + 4.8);
  doc.text("Dose", margin + contentW * 0.52, y + 4.8);
  doc.text("Frequency", margin + contentW * 0.65, y + 4.8);
  y += 7;

  MEDICATIONS.forEach((m, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentW, 7, "F");
    }
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 24, 27);
    doc.text(m.name, margin + 3, y + 4.8);
    doc.text(m.dose, margin + contentW * 0.52, y + 4.8);
    doc.text(m.frequency, margin + contentW * 0.65, y + 4.8);
    y += 7;
  });

  y += 10;

  // ── Footer ──
  doc.setDrawColor(228, 228, 231); // zinc-200
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.setFont("helvetica", "normal");
  doc.text(
    "AI Health Companion · Synthetic report for demonstration only · Not a substitute for professional medical advice",
    pageW / 2, y, { align: "center" },
  );

  doc.save(`HealthReport_${patientId}_${date.replace(/ /g, "")}.pdf`);
}

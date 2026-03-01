"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = void 0;
const jspdf_1 = require("jspdf");
const mistral_1 = require("./mistral");
// Toggle this variable to true to use a prewritten response instead of hitting the Mistral API to save tokens.
const USE_MOCK_AI = false;
const generateReport = async (data) => {
    // A4 format like the example
    const doc = new jspdf_1.jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 0;
    const date = new Date().toLocaleDateString("en-AU", {
        day: "numeric", month: "short", year: "numeric",
    });
    // ── Header bar ──
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("HealthBrief Medical Report", margin, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 170); // zinc-400
    doc.text("AI Generated Health Summary", margin, 19);
    doc.text(`Generated: ${date}`, pageW - margin, 12, { align: "right" });
    // Evaluate explicit date string based on `timeRange`
    let rangeString = 'All Time';
    if (data.timeRange) {
        const today = new Date();
        const start = new Date();
        switch (data.timeRange) {
            case "3days":
                start.setDate(today.getDate() - 3);
                break;
            case "week":
                start.setDate(today.getDate() - 7);
                break;
            case "month":
                start.setMonth(today.getMonth() - 1);
                break;
            case "6months":
                start.setMonth(today.getMonth() - 6);
                break;
        }
        const dateOpts = { day: "numeric", month: "short", year: "numeric" };
        const formattedStart = start.toLocaleDateString("en-AU", dateOpts);
        const formattedEnd = today.toLocaleDateString("en-AU", dateOpts);
        rangeString = `${formattedStart} - ${formattedEnd}`;
    }
    doc.text(`Range: ${rangeString}`, pageW - margin, 19, { align: "right" });
    y = 38;
    // ── Patient Info ──
    const patientName = data.profile?.display_name || "John Doe";
    const patientAge = data.profile?.date_of_birth ? `${Math.abs(new Date(Date.now() - new Date(data.profile.date_of_birth).getTime()).getUTCFullYear() - 1970)} Yrs` : "Unknown";
    const patientGender = data.profile?.gender || "Unknown";
    const patientBloodType = data.profile?.blood_type || "Unknown";
    const patientConditions = (data.profile?.conditions || []).length > 0 ? data.profile.conditions.join(", ") : "None";
    const patientAllergies = (data.profile?.allergies || []).length > 0 ? data.profile.allergies.join(", ") : "None";
    y += 4; // Add a little breathing room
    // Large Bold Name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.text(patientName, margin, y);
    // Secondary Info below
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text("Age:", margin, y + 13);
    doc.text("Gender:", margin + 30, y + 13);
    doc.text("Blood Type:", margin + 65, y + 13);
    // Row 2 of Secondary Info
    doc.text("Conditions:", margin, y + 20);
    // Row 3 of Secondary Info
    doc.text("Allergies:", margin, y + 27);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 65); // zinc-700
    doc.text(patientAge, margin + 9, y + 13);
    doc.text(patientGender, margin + 45, y + 13);
    doc.text(patientBloodType, margin + 90, y + 13);
    doc.text(patientConditions, margin + 22, y + 20);
    doc.text(patientAllergies, margin + 22, y + 27);
    y += 37;
    // ── Executive Summary ──
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text("Executive Summary", margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 65);
    const checkIns = data.checkIns || [];
    const symptoms = data.symptoms || [];
    // compute averages
    let avgEnergy = 0;
    let avgSleep = 0;
    if (checkIns.length > 0) {
        const energySum = checkIns.reduce((sum, c) => sum + (c.energy || 0), 0);
        avgEnergy = energySum / checkIns.length;
        const sleepSum = checkIns.reduce((sum, c) => sum + (Number(c.sleep_hours) || 0), 0);
        avgSleep = sleepSum / checkIns.length;
    }
    const energyVal = checkIns.length ? `${avgEnergy.toFixed(1)} / 10` : "N/A";
    const sleepVal = checkIns.length ? `${avgSleep.toFixed(1)} hrs` : "N/A";
    const energyStatus = avgEnergy >= 7 ? "Good" : (avgEnergy >= 4 ? "Fair" : (checkIns.length ? "Poor" : "N/A"));
    const sleepStatus = avgSleep >= 7 ? "Good" : (avgSleep >= 5 ? "Fair" : (checkIns.length ? "Poor" : "N/A"));
    let summaryText = `Based on the provided health logs during this period, the patient completed ${checkIns.length} check-ins and reported ${symptoms.length} symptoms. Their energy levels averaged ${energyVal} and sleep duration averaged ${sleepVal}.`;
    if (checkIns.length > 0 || symptoms.length > 0) {
        if (USE_MOCK_AI) {
            summaryText = `(MOCK AI) ${summaryText} The patient also experienced recurring negative symptoms, including low energy and reported headaches over the tracked period. Please monitor these closely.`;
        }
        else {
            try {
                const rawData = `
Patient Data Summary:
${summaryText}

Check-ins (Summary/Notes):
${checkIns.map((c) => `- Mood: ${c.mood}, Energy: ${c.energy}, Sleep: ${c.sleep_hours}h. Summary: ${c.summary || c.notes || 'None'}`).join('\n')}

Symptoms:
${symptoms.map((s) => `- ${s.name} (Severity: ${s.severity})`).join('\n')}
`;
                // API call that summarises the text highlighting important/recurring negative information
                const llmResponse = await mistral_1.mistral.chat.complete({
                    model: "mistral-large-latest",
                    messages: [
                        {
                            role: "system",
                            content: `You are a medical reporting assistant. Your task is to summarize the provided patient data and explicitly highlight any important or recurring negative information (e.g., specific symptoms, consistently poor sleep, low energy). 
Keep it to a concise, professional 3-4 sentence executive summary. Do not use markdown formatting. Do not overuse em dashes, and do not include numbers.`,
                        },
                        {
                            role: "user",
                            content: rawData,
                        },
                    ],
                });
                if (llmResponse.choices?.[0]?.message?.content) {
                    summaryText = String(llmResponse.choices[0].message.content).trim();
                }
            }
            catch (e) {
                console.error("Mistral Summary Error:", e);
            }
        }
    }
    const splitSummary = doc.splitTextToSize(summaryText, contentW);
    doc.text(splitSummary, margin, y);
    y += (splitSummary.length * 5) + 8; // Adjust based on text length
    // ── Tracked Data Sections ──
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text("Health Metrics Summary", margin, y);
    y += 7;
    // Table header mimicking example-pdf.js
    doc.setFillColor(244, 244, 245); // zinc-100
    doc.rect(margin, y, contentW, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text("Metric", margin + 3, y + 4.8);
    doc.text("Average (Period)", margin + contentW * 0.4, y + 4.8);
    doc.text("Trend", margin + contentW * 0.7, y + 4.8);
    doc.text("Status", margin + contentW * 0.93, y + 4.8, { align: "right" });
    y += 7;
    const metrics = [
        { name: "Energy Average", value: energyVal, trend: "Stable", status: energyStatus },
        { name: "Sleep Duration Average", value: sleepVal, trend: "Stable", status: sleepStatus },
        { name: "Reported Symptoms", value: `${symptoms.length}`, trend: "N/A", status: symptoms.length > 3 ? "Poor" : (symptoms.length > 0 ? "Fair" : "Good") },
        { name: "Check-ins Logged", value: `${checkIns.length}`, trend: "N/A", status: checkIns.length > 0 ? "Good" : "Fair" },
    ];
    // Render table rows
    metrics.forEach((m, i) => {
        if (i % 2 === 0) {
            doc.setFillColor(250, 250, 250); // zinc-50
            doc.rect(margin, y, contentW, 7, "F");
        }
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(24, 24, 27); // zinc-900
        doc.text(m.name, margin + 3, y + 4.8);
        doc.text(m.value, margin + contentW * 0.4, y + 4.8);
        doc.text(m.trend, margin + contentW * 0.7, y + 4.8);
        // Status pill color approach
        if (m.status === "Good") {
            doc.setTextColor(22, 163, 74); // green-600
        }
        else if (m.status === "Fair") {
            doc.setTextColor(245, 158, 11); // amber-500
        }
        else {
            doc.setTextColor(220, 38, 38); // red-600
        }
        doc.setFont("helvetica", "bold");
        doc.text(m.status, margin + contentW * 0.93, y + 4.8, { align: "right" });
        doc.setTextColor(24, 24, 27);
        doc.setFont("helvetica", "normal");
        y += 7;
    });
    y += 15;
    // ── Footer ──
    const docHeight = doc.internal.pageSize.getHeight(); // e.g. 297mm for A4
    const footerY = docHeight - 15;
    doc.setDrawColor(228, 228, 231); // zinc-200
    doc.line(margin, footerY - 5, pageW - margin, footerY - 5);
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.setFont("helvetica", "normal");
    doc.text("HealthBrief · For personal reference only", pageW / 2, footerY, { align: "center" });
    return doc;
};
exports.generateReport = generateReport;

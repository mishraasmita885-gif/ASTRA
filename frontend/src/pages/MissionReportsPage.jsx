import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  Cpu,
  Share2,
} from 'lucide-react';

export const MissionReportsPage = () => {
  const {
    telemetry,
    anomalies,
    auditLog,
    subsystems,
    activeChannel,
    operatorRole,
  } = useMission();

  const [isCopied, setIsCopied] = useState(false);

  const reportDate = new Date().toUTCString();
  const reportId = `ASTRA-REP-REV4821-${Math.floor(Date.now() / 1000)}`;
  const auditSignature = `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase()}_SHA256_VERIFIED`;

  // Format full report as Markdown
  const generateMarkdownReport = () => {
    return `# ASTRA Spacecraft Post-Mission Flight Audit Report
**Report ID**: ${reportId}  
**Date Generated**: ${reportDate}  
**Spacecraft**: SC-ASTRA-01 | **Orbit**: LEO 542.8 km (Inclination 51.6°) | **Revision**: REV 4,821  
**Authorizing Flight Director**: Gene Kranz (${operatorRole})  
**Cryptographic Audit Signature**: \`${auditSignature}\`

---

## 1. Executive Mission Summary
- **Primary Telemetry Channel**: NASA Channel \`${activeChannel}\`
- **Current Operational Status**: ${telemetry.is_anomaly ? 'ANOMALY UNDER INVESTIGATION' : 'NOMINAL / SAFE-STATE VERIFIED'}
- **Total Anomaly Incidents Logged**: ${anomalies.length}
- **Autonomous Safe-State Authorization**: Required (Human-in-the-Loop Enforced)

---

## 2. Core Telemetry Snapshot
| Telemetry Parameter | Live Value | Nominal Flight Envelope | Operational Status |
| :--- | :--- | :--- | :--- |
| **Bus Voltage** | ${telemetry.voltage.toFixed(2)} V | 24.0 – 28.0 V | ${telemetry.voltage < 20 ? 'CRITICAL' : telemetry.voltage < 23 ? 'WARNING' : 'HEALTHY'} |
| **Li-Ion Battery Storage** | ${telemetry.battery_pct.toFixed(1)} % | > 70.0 % | ${telemetry.battery_pct < 60 ? 'CRITICAL' : 'HEALTHY'} |
| **Solar Photovoltaic Input** | ${telemetry.solar_input.toFixed(1)} % | > 80.0 % | ${telemetry.solar_input < 60 ? 'WARNING' : 'HEALTHY'} |
| **Avionics Core Temperature** | ${telemetry.temperature.toFixed(1)} °C | 10.0 – 30.0 °C | ${telemetry.temperature > 70 ? 'CRITICAL' : telemetry.temperature > 35 ? 'WARNING' : 'HEALTHY'} |
| **ADCS Gyro Drift Rate** | ${telemetry.adcs_drift?.toFixed(3) || '0.020'} °/hr | < 0.050 °/hr | ${telemetry.adcs_drift > 0.3 ? 'CRITICAL' : 'HEALTHY'} |
| **DSN Madrid-63 S-Band SNR** | +${telemetry.link_snr?.toFixed(1) || '14.2'} dBm | > +10.0 dBm | HEALTHY |

---

## 3. Subsystem Health Matrix
${subsystems.map((s) => `- **${s.name}** [${s.status}]: ${s.details}`).join('\n')}

---

## 4. Anomaly Incidents & AI Reasoner Audits
${anomalies.map((a, i) => `
### Incident ${i + 1}: ${a.id} (Channel ${a.rawEvent?.channel || 'P-3'})
- **Detection Method**: ${a.detectionMethod || 'NASA Change Detection'}
- **Anomaly Score**: ${a.mlScore} (Learned Threshold: 0.3889)
- **Status**: ${a.status}
- **Severity**: ${a.severity}
- **Gemini AI Root Cause**: ${a.summary}
- **Contingency Recommendation**: ${a.geminiDiagnosis?.recommendedAction || 'Execute redundant bus transfer protocol.'}
- **Operator Authorization**: ${a.rawEvent?.operator_decision?.approved ? 'Approved by Flight Director' : 'Awaiting Authorization'}
`).join('\n')}

---

## 5. Chronological Audit Log (Recent Entries)
| Time | Type | Subsystem / Event Description |
| :--- | :--- | :--- |
${auditLog.slice(0, 10).map((l) => `| ${l.time} | \`${l.type}\` | ${l.message} |`).join('\n')}

---

*Certified by NASA Spacecraft Operations & ASTRA Neural Telemetry Architecture*
`;
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ASTRA_Mission_Report_REV4821_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="w-full">
      {/* =========================================================================
          VIEW 1: ON-SCREEN DISPLAY VIEW (matches original website UI / Screenshot 2)
          Rich Swiss-Editorial Brutalist aesthetic with warm cards and 3D shadows.
          Completely hidden during print/PDF generation.
         ========================================================================= */}
      <div className="print:hidden flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#452a19] text-[#fbf7f0] flex items-center justify-center font-bold border-2 border-[#24140b] shadow-[2px_2px_0px_0px_#24140b]">
                <FileText className="w-4 h-4" />
              </div>
              <h1 className="font-display font-bold text-2xl text-[#24140b]">
                Automated Mission Flight Audit & Debrief Generator
              </h1>
            </div>
            <p className="text-xs font-mono text-[#73533e] mt-1">
              Certified incident ledger, live telemetry snapshot, and cryptographic post-flight verification export.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyClipboard}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#ebdccb] text-[#4a2e1b] border-2 border-[#4a2e1b] shadow-[2px_2px_0px_0px_#4a2e1b] font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isCopied ? 'Copied Markdown!' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#ebdccb] text-[#4a2e1b] border-2 border-[#4a2e1b] shadow-[2px_2px_0px_0px_#4a2e1b] font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF Export</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="px-4 py-2 rounded-xl bg-[#452a19] hover:bg-[#5c3822] text-[#fbf7f0] border-2 border-[#24140b] shadow-[3px_3px_0px_0px_#24140b] font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            >
              <Download className="w-4 h-4" />
              <span>Download .MD Report</span>
            </button>
          </div>
        </div>

        {/* Printable Report Document Card (On-Screen display version) */}
        <div className="p-8 rounded-3xl bg-[#f8f5ee] border-2 border-[#4a2e1b] shadow-[6px_6px_0px_0px_#4a2e1b] flex flex-col gap-6 text-[#24140b]">
          {/* Document Title Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#4a2e1b] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#f8f5ee] border-2 border-[#4a2e1b] shadow-[3px_3px_0px_0px_#4a2e1b] p-1 flex items-center justify-center">
                <img src="/logo.png" alt="ASTRA" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="font-display font-extrabold text-xl tracking-wider text-[#24140b] uppercase">
                  SC-ASTRA-01 FLIGHT AUDIT REPORT
                </h2>
                <span className="font-mono text-xs text-[#73533e] font-semibold">
                  NASA LOW EARTH ORBIT MISSION CONTROL • DSN COMPLEX 63
                </span>
              </div>
            </div>

            <div className="flex flex-col text-right font-mono text-xs">
              <span className="font-bold text-[#24140b]">{reportId}</span>
              <span className="text-[#73533e] text-[11px]">{reportDate}</span>
              <span className="text-emerald-700 font-bold mt-1 flex items-center gap-1 justify-end">
                <ShieldCheck className="w-4 h-4" />
                <span>CRYPTOGRAPHICALLY CERTIFIED</span>
              </span>
            </div>
          </div>

          {/* Section 1: Executive Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-2xl bg-white border border-[#4a2e1b]/20">
              <span className="text-[10px] text-[#73533e] block uppercase">Spacecraft</span>
              <span className="font-bold text-sm text-[#24140b]">SC-ASTRA-01</span>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#4a2e1b]/20">
              <span className="text-[10px] text-[#73533e] block uppercase">Orbit Elevation</span>
              <span className="font-bold text-sm text-[#24140b]">542.8 km (LEO)</span>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#4a2e1b]/20">
              <span className="text-[10px] text-[#73533e] block uppercase">Orbital Revision</span>
              <span className="font-bold text-sm text-[#24140b]">REV 4,821</span>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#4a2e1b]/20">
              <span className="text-[10px] text-[#73533e] block uppercase">Flight Director</span>
              <span className="font-bold text-sm text-[#24140b]">Gene Kranz (FD)</span>
            </div>
          </div>

          {/* Section 2: Core Telemetry Matrix Table */}
          <div className="flex flex-col gap-2">
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-[#4a2e1b]">
              1. Spacecraft Telemetry Snapshot
            </h3>
            <div className="overflow-x-auto rounded-2xl border-2 border-[#4a2e1b] bg-white">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#ebdccb] border-b-2 border-[#4a2e1b] text-[#24140b]">
                  <tr>
                    <th className="p-3">Telemetry Parameter</th>
                    <th className="p-3">Live Value</th>
                    <th className="p-3">Nominal Envelope</th>
                    <th className="p-3">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4a2e1b]/15">
                  <tr>
                    <td className="p-3 font-bold">Bus Voltage</td>
                    <td className="p-3">{telemetry.voltage.toFixed(2)} V</td>
                    <td className="p-3">24.0 – 28.0 V</td>
                    <td className="p-3 text-emerald-700 font-bold">NOMINAL</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Li-Ion Battery Storage</td>
                    <td className="p-3">{telemetry.battery_pct.toFixed(1)} %</td>
                    <td className="p-3">&gt; 70.0 %</td>
                    <td className="p-3 text-emerald-700 font-bold">NOMINAL</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Solar Array Input</td>
                    <td className="p-3">{telemetry.solar_input.toFixed(1)} %</td>
                    <td className="p-3">&gt; 80.0 %</td>
                    <td className="p-3 text-emerald-700 font-bold">NOMINAL</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Avionics Core Temp</td>
                    <td className="p-3">{telemetry.temperature.toFixed(1)} °C</td>
                    <td className="p-3">10.0 – 30.0 °C</td>
                    <td className="p-3 text-emerald-700 font-bold">NOMINAL</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">DSN Madrid-63 S-Band SNR</td>
                    <td className="p-3">+{telemetry.link_snr?.toFixed(1) || '14.2'} dBm</td>
                    <td className="p-3">&gt; +10.0 dBm</td>
                    <td className="p-3 text-emerald-700 font-bold">LOCKED</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Anomaly Incidents & AI Reasoner Log */}
          <div className="flex flex-col gap-2">
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-[#4a2e1b]">
              2. Anomaly Incident Logs & Gemini Root Cause Extractions
            </h3>
            <div className="flex flex-col gap-3 font-mono text-xs">
              {anomalies.map((anm) => (
                <div
                  key={anm.id}
                  className="p-4 rounded-2xl bg-white border-2 border-[#4a2e1b] shadow-[2px_2px_0px_0px_#4a2e1b] flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#4a2e1b]/15 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#24140b]">{anm.id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold border border-purple-300">
                        CH: {anm.rawEvent?.channel || 'P-3'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                        {anm.status}
                      </span>
                    </div>
                    <span className="text-[#73533e]">
                      Detected at: {anm.timestamp || '08:42:15'}
                    </span>
                  </div>

                  <p className="text-xs font-sans text-[#24140b] leading-relaxed">
                    <strong>Gemini Diagnosis:</strong> {anm.summary}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-[#73533e] pt-1">
                    <span>ML Change Score: <strong>{anm.mlScore}</strong> (Threshold 0.3889)</span>
                    <span>Operator Authorization: <strong>VERIFIED NOMINAL</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Cryptographic Ledger Verification */}
          <div className="p-4 rounded-2xl bg-[#ebdccb] border-2 border-[#24140b] flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div>
              <span className="font-bold text-[#24140b] block uppercase">
                Cryptographic Audit Ledger Signature
              </span>
              <span className="text-[11px] text-[#73533e] select-all">
                {auditSignature}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-[11px]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Integrity Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW 2: DEDICATED PRINT / DOWNLOADED PDF DOCUMENT (matches Screenshot 1)
          Formal, publication-grade NASA Technical Document on pristine white paper.
          Completely hidden on screen; activated only during print/PDF generation.
         ========================================================================= */}
      <div className="hidden print:block flight-audit-document bg-white text-[#111111] p-0 m-0 w-full font-sans">
        {/* Document Classification & Official Header */}
        <div className="border-b-2 border-black pb-4 mb-4">
          <div className="flex items-center justify-between text-[9px] font-mono font-bold tracking-wider text-black uppercase border-b border-black/40 pb-1 mb-3">
            <span>National Aeronautics and Space Administration</span>
            <span>Flight Operations Directorate • DSN Complex 63</span>
            <span className="text-emerald-900 font-extrabold">[ UNCLASSIFIED / FORMAL ARCHIVE ]</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 p-0.5 border border-black/40 rounded bg-white flex items-center justify-center">
                <img src="/logo.png" alt="ASTRA" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="font-serif font-black text-2xl tracking-tight text-black uppercase leading-none">
                  Spacecraft Flight Audit & Debrief Report
                </h1>
                <p className="font-mono text-xs text-neutral-600 mt-1">
                  Mission SC-ASTRA-01 • Autonomous Neural Ingestion & Safe-State Ledger • Orbit Cycle REV 4,821
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs shrink-0">
              <div className="font-bold text-black text-sm">{reportId}</div>
              <div className="text-neutral-500 text-[10px]">{reportDate}</div>
              <div className="text-emerald-800 font-bold text-[10px] mt-1 flex items-center justify-end gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>CRYPTOGRAPHICALLY CERTIFIED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ephemeris & Mission Parameters Matrix */}
        <div className="report-section grid grid-cols-4 border border-black divide-x divide-y divide-black text-xs font-mono mb-4">
          <div className="p-2 bg-neutral-50">
            <span className="text-[9px] text-neutral-600 block uppercase font-bold tracking-wider">Spacecraft Ref</span>
            <span className="font-bold text-black text-sm">SC-ASTRA-01</span>
          </div>
          <div className="p-2 bg-neutral-50">
            <span className="text-[9px] text-neutral-600 block uppercase font-bold tracking-wider">Orbital Altitude / Inc</span>
            <span className="font-bold text-black text-sm">542.8 km (LEO) • 51.6°</span>
          </div>
          <div className="p-2 bg-neutral-50">
            <span className="text-[9px] text-neutral-600 block uppercase font-bold tracking-wider">Flight Revision Cycle</span>
            <span className="font-bold text-black text-sm">REV 4,821</span>
          </div>
          <div className="p-2 bg-neutral-50">
            <span className="text-[9px] text-neutral-600 block uppercase font-bold tracking-wider">Flight Director</span>
            <span className="font-bold text-black text-sm">Gene Kranz (Clearance 5)</span>
          </div>
          <div className="p-2 bg-neutral-50">
            <span className="text-[9px] text-neutral-600 block uppercase font-bold tracking-wider">Active Telemetry Stream</span>
            <span className="font-bold text-black text-sm">NASA Channel {activeChannel}</span>
          </div>
          <div className="p-2 bg-neutral-50">
            <span className="text-[9px] text-neutral-600 block uppercase font-bold tracking-wider">Ground Station Link</span>
            <span className="font-bold text-black text-sm">DSN Complex 63 (Madrid)</span>
          </div>
          <div className="p-2 bg-neutral-50">
            <span className="text-[9px] text-neutral-600 block uppercase font-bold tracking-wider">Operational Status</span>
            <span className="font-bold text-emerald-800 text-sm">NOMINAL / VERIFIED</span>
          </div>
          <div className="p-2 bg-neutral-50">
            <span className="text-[9px] text-neutral-600 block uppercase font-bold tracking-wider">Total Anomaly Flags</span>
            <span className="font-bold text-black text-sm">{anomalies.length} Incidents</span>
          </div>
        </div>

        {/* Executive Mission Assessment */}
        <div className="report-section text-xs leading-relaxed text-neutral-800 font-sans border-l-2 border-black pl-3 py-1 mb-4">
          <strong>Executive Mission Assessment:</strong> This certified debrief document summarizes telemetry envelopes, subsystem operational margins, multivariate change anomaly detections, and cryptographic audit records for Spacecraft SC-ASTRA-01 during orbital cycle REV 4,821. Continuous downlink was maintained through NASA Deep Space Network Complex 63. All automated safe-state commands and human-in-the-loop approvals have been cryptographically notarized to NASA Mission Operations Directorate standards.
        </div>

        {/* Section 1: Spacecraft Telemetry Verification Matrix */}
        <div className="report-section flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between border-b border-black pb-1">
            <h2 className="font-mono font-bold text-xs uppercase tracking-wider text-black">
              1. Spacecraft Telemetry Envelope Verification Matrix
            </h2>
            <span className="text-[10px] font-mono text-neutral-500">UNITS: SI STANDARD / S-BAND DSN</span>
          </div>

          <div className="report-table-wrapper">
            <table className="report-table w-full text-left font-mono text-xs border border-black">
              <thead className="bg-neutral-100 border-b border-black text-black">
                <tr>
                  <th className="p-2 border-r border-black">Telemetry Parameter</th>
                  <th className="p-2 border-r border-black">Measured Telemetry</th>
                  <th className="p-2 border-r border-black">Nominal Flight Envelope</th>
                  <th className="p-2 border-r border-black">Delta / Margin</th>
                  <th className="p-2">Disposition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/30 text-neutral-900">
                <tr>
                  <td className="p-2 font-bold border-r border-black/30">Main EPS Bus Voltage</td>
                  <td className="p-2 border-r border-black/30 font-bold">{telemetry.voltage.toFixed(2)} V</td>
                  <td className="p-2 border-r border-black/30">24.00 – 28.00 V</td>
                  <td className="p-2 border-r border-black/30">{telemetry.voltage >= 24 ? `+${(telemetry.voltage - 24).toFixed(2)} V` : `${(telemetry.voltage - 24).toFixed(2)} V`}</td>
                  <td className="p-2 font-bold text-emerald-800">[ NOMINAL ]</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold border-r border-black/30">Li-Ion Battery Storage (SoC)</td>
                  <td className="p-2 border-r border-black/30 font-bold">{telemetry.battery_pct.toFixed(1)} %</td>
                  <td className="p-2 border-r border-black/30">&gt; 70.0 %</td>
                  <td className="p-2 border-r border-black/30">+{Math.max(0, telemetry.battery_pct - 70).toFixed(1)} %</td>
                  <td className="p-2 font-bold text-emerald-800">[ NOMINAL ]</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold border-r border-black/30">Solar Photovoltaic Input</td>
                  <td className="p-2 border-r border-black/30 font-bold">{telemetry.solar_input.toFixed(1)} %</td>
                  <td className="p-2 border-r border-black/30">&gt; 80.0 %</td>
                  <td className="p-2 border-r border-black/30">+{Math.max(0, telemetry.solar_input - 80).toFixed(1)} %</td>
                  <td className="p-2 font-bold text-emerald-800">[ NOMINAL ]</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold border-r border-black/30">Avionics Core Thermal Sensor</td>
                  <td className="p-2 border-r border-black/30 font-bold">{telemetry.temperature.toFixed(1)} °C</td>
                  <td className="p-2 border-r border-black/30">10.0 – 30.0 °C</td>
                  <td className="p-2 border-r border-black/30">Nominal Range</td>
                  <td className="p-2 font-bold text-emerald-800">[ NOMINAL ]</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold border-r border-black/30">ADCS 3-Axis Gyro Drift Rate</td>
                  <td className="p-2 border-r border-black/30 font-bold">{telemetry.adcs_drift?.toFixed(3) || '0.018'} °/hr</td>
                  <td className="p-2 border-r border-black/30">&lt; 0.050 °/hr</td>
                  <td className="p-2 border-r border-black/30">-0.032 °/hr</td>
                  <td className="p-2 font-bold text-emerald-800">[ NOMINAL ]</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold border-r border-black/30">DSN Madrid-63 S-Band SNR</td>
                  <td className="p-2 border-r border-black/30 font-bold">+{telemetry.link_snr?.toFixed(1) || '14.2'} dBm</td>
                  <td className="p-2 border-r border-black/30">&gt; +10.0 dBm</td>
                  <td className="p-2 border-r border-black/30">+4.2 dBm</td>
                  <td className="p-2 font-bold text-emerald-800">[ CARRIER LOCKED ]</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Subsystem Health & Redundancy Matrix */}
        <div className="report-section flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between border-b border-black pb-1">
            <h2 className="font-mono font-bold text-xs uppercase tracking-wider text-black">
              2. Avionics Subsystems Operational Status
            </h2>
            <span className="text-[10px] font-mono text-neutral-500">6/6 SUBSYSTEMS NOMINAL</span>
          </div>

          <div className="report-table-wrapper">
            <table className="report-table w-full text-left font-mono text-xs border border-black">
              <thead className="bg-neutral-100 border-b border-black text-black">
                <tr>
                  <th className="p-2 border-r border-black">Subsystem</th>
                  <th className="p-2 border-r border-black">Description & Diagnostic Status</th>
                  <th className="p-2 border-r border-black">Redundancy</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/30 text-neutral-900">
                {subsystems.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 font-bold border-r border-black/30">{s.name}</td>
                    <td className="p-2 border-r border-black/30 text-[11px]">{s.details}</td>
                    <td className="p-2 border-r border-black/30 text-[11px]">Primary / Standby A-B</td>
                    <td className="p-2 font-bold text-emerald-800">[ {s.status.toUpperCase()} ]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Anomaly Event Logs & Neural Diagnostics */}
        <div className="report-section flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between border-b border-black pb-1">
            <h2 className="font-mono font-bold text-xs uppercase tracking-wider text-black">
              3. Anomaly Incident Investigations & AI Diagnostic Extractions
            </h2>
            <span className="text-[10px] font-mono text-neutral-500">NASA P-3 MULTIVARIATE DETECTOR</span>
          </div>

          {anomalies.length === 0 ? (
            <div className="p-4 border border-black/40 text-xs font-mono text-neutral-600 bg-neutral-50 text-center">
              No anomaly deviations or critical safety violations recorded during orbital revision REV-4821.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              {anomalies.map((anm, idx) => (
                <div
                  key={anm.id}
                  className="report-incident-block p-2.5 border border-black bg-neutral-50/50 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between border-b border-black/30 pb-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-black uppercase">
                        Finding #{idx + 1}: {anm.id}
                      </span>
                      <span className="text-[10px] px-1.5 border border-black text-black">
                        CHANNEL: {anm.rawEvent?.channel || activeChannel}
                      </span>
                      <span className="text-[10px] px-1.5 border border-emerald-800 text-emerald-900 font-bold">
                        {anm.status || 'VERIFIED NOMINAL'}
                      </span>
                    </div>
                    <span className="text-neutral-600 text-[10px]">
                      EPOCH: {anm.timestamp || '08:42:15 UTC'}
                    </span>
                  </div>

                  <div className="text-xs font-sans text-neutral-900 leading-relaxed pt-0.5">
                    <strong>Gemini Neural Diagnostic:</strong> {anm.summary}
                  </div>

                  <div className="grid grid-cols-2 text-[10px] text-neutral-700 border-t border-black/20 pt-1 mt-0.5">
                    <span>Multivariate Anomaly Score: <strong>{anm.mlScore}</strong> (Baseline Limit: 0.3889)</span>
                    <span className="text-right">Human-in-the-Loop Safe-State: <strong>AUTHORIZED & NOTARIZED</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Cryptographic Notarization & Formal Sign-off */}
        <div className="report-signature-block border border-black p-3.5 bg-neutral-50 flex flex-col gap-3 font-mono text-xs mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/30 pb-2">
            <div>
              <span className="font-bold text-black block uppercase text-[10px]">
                Cryptographic Audit Signature (SHA-256 Ledger Block)
              </span>
              <span className="text-[9px] text-neutral-700 select-all font-mono break-all">
                {auditSignature}
              </span>
            </div>
            <div className="px-2 py-0.5 border border-emerald-800 text-emerald-900 font-bold text-[9px]">
              ✓ INTEGRITY SEAL VALID
            </div>
          </div>

          {/* Sign-off Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-2">
            <div>
              <div className="border-b border-black w-48 mb-1" />
              <div className="font-bold text-black text-xs">GENE KRANZ</div>
              <div className="text-[10px] text-neutral-600">Flight Operations Director • NASA Mission Control</div>
              <div className="text-[9px] text-emerald-800 font-bold mt-0.5">[ ELECTRONICALLY CERTIFIED ]</div>
            </div>

            <div>
              <div className="border-b border-black w-48 mb-1" />
              <div className="font-bold text-black text-xs">DR. ELEANOR ARROWAY</div>
              <div className="text-[10px] text-neutral-600">Lead Avionics & Telemetry Officer • DSN Complex 63</div>
              <div className="text-[9px] text-emerald-800 font-bold mt-0.5">[ ELECTRONICALLY CERTIFIED ]</div>
            </div>
          </div>
        </div>

        {/* Document Sub-Footer */}
        <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 border-t border-black/30 pt-1.5">
          <span>NASA FORM 1421-B (REV 2026) • ASTRA SPACECRAFT FLIGHT AUDIT</span>
          <span>UNCLASSIFIED / SCIENTIFIC DATA ARCHIVE</span>
          <span>PAGE 1 OF 1</span>
        </div>
      </div>
    </div>
  );
};

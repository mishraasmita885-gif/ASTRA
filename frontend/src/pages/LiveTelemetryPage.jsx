import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import { TelemetryMetricCard } from '../components/TelemetryMetricCard';
import { SynchronizedWaveformChart } from '../components/SynchronizedWaveformChart';
import {
  Activity,
  Clock,
  Download,
  Thermometer,
  Zap,
  BatteryCharging,
  Sun,
  Radio,
  RotateCcw,
  Gauge,
} from 'lucide-react';

export const LiveTelemetryPage = () => {
  const {
    telemetry,
    telemetryHistory,
    isCrisis,
    triggerCrisis,
    resetToNominal,
    playNasaP3Stream,
    isBackendConnected,
  } = useMission();
  const [selectedChannel, setSelectedChannel] = useState('p3');

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* 1. Header Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#233446] text-white flex items-center justify-center shadow-xs">
              <Activity className="w-4 h-4 text-[#fea619]" />
            </div>
            <h1 className="font-sans font-extrabold text-2xl text-[#161514] tracking-tight">
              Live Telemetry Stream Visualizer
            </h1>
          </div>
          <p className="text-xs font-mono text-[#736f68] mt-1 pl-10.5">
            Real-time WebSocket telemetry stream • Mode: <strong className="text-[#161514]">{telemetry.mode || 'nominal'}</strong> • Step: {telemetry.step || 0}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono font-bold text-emerald-800 shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'
              }`}
            />
            {isBackendConnected ? 'LIVE ● WebSocket Connected' : 'Connecting to :8000...'}
          </div>

          <button
            onClick={() => playNasaP3Stream(5300)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-mono text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <Radio className="w-3.5 h-3.5 text-sky-600" />
            <span>NASA P-3 Replay</span>
          </button>

          {/* Quick crisis toggle for demo */}
          {!isCrisis ? (
            <button
              onClick={() => triggerCrisis('Solar Array Strike & EPS Bus Failure')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fbb973]/20 hover:bg-[#fbb973]/35 text-[#a35e38] border border-[#fbb973]/50 font-mono text-xs font-semibold transition-all cursor-pointer"
              title="Simulate Spacecraft Crisis"
            >
              <Zap className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Simulate Anomaly</span>
            </button>
          ) : (
            <button
              onClick={resetToNominal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Baseline</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top 5 Metric KPI Cards (including P-3 Detector Channel) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: P-3 ML Channel */}
        <TelemetryMetricCard
          title="Channel P-3"
          value={typeof telemetry.p3_value === 'number' ? telemetry.p3_value.toFixed(3) : '0.120'}
          unit="val"
          status={telemetry.anomaly_score > 0.3889 || isCrisis ? 'Change Breach' : 'Nominal'}
          statusType={telemetry.anomaly_score > 0.3889 || isCrisis ? 'critical' : 'nominal'}
          delta={`Score: ${(telemetry.anomaly_score || 0).toFixed(3)}`}
          deltaPositive={telemetry.anomaly_score <= 0.3889}
          minVal="Thresh: 0.389"
          maxVal="MaxGap: 30"
          nominalRange="Δ &lt; 0.389"
          history={telemetryHistory}
          dataKey="score"
          color="#8b5cf6"
          icon={Gauge}
          isSelected={selectedChannel === 'p3'}
          onClick={() => setSelectedChannel('p3')}
        />

        {/* Card 2: Temperature */}
        <TelemetryMetricCard
          title="Temperature"
          value={telemetry.temperature.toFixed(1)}
          unit="°C"
          status={isCrisis || telemetry.temperature > 40 ? 'Critical' : 'Nominal'}
          statusType={isCrisis || telemetry.temperature > 40 ? 'critical' : 'nominal'}
          delta="-2.1%"
          deltaPositive={false}
          minVal="13.8 °C"
          maxVal="86.5 °C"
          nominalRange="10–30 °C"
          history={telemetryHistory}
          dataKey="temp"
          color="#ef4444"
          icon={Thermometer}
          isSelected={selectedChannel === 'temp'}
          onClick={() => setSelectedChannel('temp')}
        />

        {/* Card 3: Regulated Bus */}
        <TelemetryMetricCard
          title="Regulated Bus"
          value={telemetry.voltage.toFixed(1)}
          unit="VDC"
          status={isCrisis || telemetry.voltage < 20 ? 'Critical' : 'Stable'}
          statusType={isCrisis || telemetry.voltage < 20 ? 'critical' : 'stable'}
          delta="+0.3%"
          deltaPositive={true}
          minVal="11.0 V"
          maxVal="24.3 V"
          nominalRange="24–28 V"
          history={telemetryHistory}
          dataKey="voltage"
          color="#3b82f6"
          icon={Zap}
          isSelected={selectedChannel === 'voltage'}
          onClick={() => setSelectedChannel('voltage')}
        />

        {/* Card 4: Li-Ion Battery */}
        <TelemetryMetricCard
          title="Li-Ion Battery"
          value={telemetry.battery_pct.toFixed(1)}
          unit="%"
          status="Healthy"
          statusType="healthy"
          delta="+1.2%"
          deltaPositive={true}
          minVal="82.0 %"
          maxVal="98.6 %"
          nominalRange="&gt; 70 %"
          history={telemetryHistory}
          dataKey="battery"
          color="#10b981"
          icon={BatteryCharging}
          isSelected={selectedChannel === 'battery'}
          onClick={() => setSelectedChannel('battery')}
        />

        {/* Card 5: Photovoltaic (Solar) */}
        <TelemetryMetricCard
          title="Photovoltaic"
          value={telemetry.solar_input.toFixed(1)}
          unit="%"
          status={telemetry.solar_input < 20 ? 'Low Input' : 'Nominal'}
          statusType={telemetry.solar_input < 20 ? 'low' : 'nominal'}
          delta="-12.4%"
          deltaPositive={false}
          minVal="0.0 %"
          maxVal="97.2 %"
          nominalRange="&gt; 80 %"
          history={telemetryHistory}
          dataKey="solar"
          color="#f97316"
          icon={Sun}
          isSelected={selectedChannel === 'solar'}
          onClick={() => setSelectedChannel('solar')}
        />
      </div>

      {/* 3. Hero Visualizer: Synchronized Multi-Channel Waveform */}
      <SynchronizedWaveformChart
        history={telemetryHistory}
        isCrisis={isCrisis}
      />
    </div>
  );
};

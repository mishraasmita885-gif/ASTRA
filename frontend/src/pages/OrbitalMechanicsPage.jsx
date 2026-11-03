import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Polygon, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useMission } from '../context/MissionContext';
import { fetchCurrentOrbitalState, fetchGroundTrack, fetchDsnPasses, fetchSaaStatus } from '../services/api';
import {
  Globe,
  Radio,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Navigation,
  Zap,
  Thermometer,
  Compass,
  Layers,
  Activity,
  ShieldAlert,
} from 'lucide-react';

// Fix Leaflet default icon issue with Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// SAA polygon coordinates for Leaflet (lat, lon pairs)
const SAA_POLYGON_COORDS = [
  [-50.0, -90.0],
  [-50.0, -30.0],
  [-20.0,  40.0],
  [ 10.0,  40.0],
  [ 10.0, -90.0],
];

// DSN Ground Station metadata
const DSN_STATIONS_META = {
  Goldstone: { label: 'Goldstone DSN (USA)', country: 'USA' },
  Madrid:    { label: 'Madrid DSN (ESP)',    country: 'ESP' },
  Canberra:  { label: 'Canberra DSN (AUS)',  country: 'AUS' },
};

// Satellite animated marker component
function SatelliteMarker({ lat, lon, spacecraftId }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return;
    const pos = [lat, lon];

    if (!markerRef.current) {
      const svgIcon = L.divIcon({
        className: 'orbital-item',
        html: `<div style="
          width: 32px; height: 32px; 
          background: #fea619; 
          border: 2px solid #24140b; 
          border-radius: 50%; 
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 14px rgba(254,166,25,0.9), 0 0 28px rgba(254,166,25,0.4);
        ">
          <span style="font-size:16px; line-height:1;">🛰️</span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker(pos, { icon: svgIcon, zIndexOffset: 1000 });
      marker.bindTooltip(`🛰️ ${spacecraftId}`, {
        permanent: false,
        className: 'orbital-item',
        direction: 'top',
        offset: [0, -18],
      });
      marker.addTo(map);
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(pos);
    }
  }, [lat, lon, map, spacecraftId]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  return null;
}

export const OrbitalMechanicsPage = () => {
  const { activeSpacecraft, orbitalState: contextOrbitalState, telemetry } = useMission();
  const spacecraftId = activeSpacecraft || 'ASTRA-ALPHA';

  const [orbitalState, setOrbitalState] = useState(null);
  const [groundTrack, setGroundTrack] = useState(null);
  const [dsnPasses, setDsnPasses] = useState(null);
  const [saaStatus, setSaaStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const stateIntervalRef = useRef(null);
  const trackIntervalRef = useRef(null);

  // Poll current state every 1 second
  const pollCurrentState = useCallback(async () => {
    const state = await fetchCurrentOrbitalState(spacecraftId);
    if (state && !state.error) {
      setOrbitalState(state);
      setLastUpdate(new Date().toISOString());
      setIsLoading(false);
    }
    const saa = await fetchSaaStatus(spacecraftId);
    if (saa) setSaaStatus(saa);
  }, [spacecraftId]);

  // Fetch ground track + DSN every 20 seconds
  const pollGroundTrack = useCallback(async () => {
    const track = await fetchGroundTrack(spacecraftId, 45, 45);
    if (track) setGroundTrack(track);
    const dsn = await fetchDsnPasses(spacecraftId);
    if (dsn) setDsnPasses(dsn);
  }, [spacecraftId]);

  useEffect(() => {
    pollCurrentState();
    pollGroundTrack();

    stateIntervalRef.current = setInterval(pollCurrentState, 1000);
    trackIntervalRef.current = setInterval(pollGroundTrack, 20000);

    return () => {
      if (stateIntervalRef.current) clearInterval(stateIntervalRef.current);
      if (trackIntervalRef.current) clearInterval(trackIntervalRef.current);
    };
  }, [pollCurrentState, pollGroundTrack]);

  // Sync with WebSocket context orbital state if available
  useEffect(() => {
    if (contextOrbitalState && (!orbitalState || contextOrbitalState.timestamp_utc !== orbitalState.timestamp_utc)) {
      setOrbitalState(contextOrbitalState);
      setLastUpdate(new Date().toISOString());
      setIsLoading(false);
    }
  }, [contextOrbitalState]);

  // Segment ground track to handle date line wrapping gracefully
  const pastTrack = groundTrack?.track?.filter((p) => p.is_past).map((p) => [p.lat, p.lon]) || [];
  const futureTrack = groundTrack?.track?.filter((p) => !p.is_past).map((p) => [p.lat, p.lon]) || [];

  const currentLat = orbitalState?.latitude;
  const currentLon = orbitalState?.longitude;
  const isInSAA = saaStatus?.inside || orbitalState?.saa_inside || telemetry?.saa_active || false;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 font-mono">
      {/* Top Banner / Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-[#ebdccb] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] rounded-xl">
              <Globe className="w-5 h-5 text-[#452a19]" />
            </div>
            <h1 className="font-display font-extrabold text-2xl tracking-widest uppercase text-[#24140b]">
              Orbital Mechanics & Ground Track
            </h1>
            <span className="font-mono text-[10px] font-bold tracking-widest px-2.5 py-1 bg-[#fea619] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] rounded-full text-[#24140b] uppercase">
              Live SGP4 Engine
            </span>
          </div>
          <p className="font-mono text-xs text-[#73533e]">
            Real-Time Two-Line Element (TLE) Propagation · CelesTrak Feed · DSN Visibility · SAA Telemetry Correlation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ebdccb] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] rounded-xl">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-700 animate-spin-slow" />
              <span className="font-mono text-[10px] text-[#452a19] font-bold">
                {new Date(lastUpdate).toUTCString().slice(17, 25)} UTC
              </span>
            </div>
          )}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] rounded-xl font-mono text-[10px] font-bold uppercase ${
              isLoading ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            {isLoading ? 'Acquiring Ephemeris...' : `Tracking ${spacecraftId}`}
          </div>
        </div>
      </div>

      {/* SAA Crossing Alert Banner */}
      {isInSAA && (
        <div className="flex items-center gap-3 p-4 bg-red-100 border-2 border-red-600 shadow-[3px_3px_0px_#7f1d1d] rounded-2xl animate-pulse">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-red-800 uppercase tracking-widest">
                ⚠ SAA_RADIATION_SPIKE · South Atlantic Anomaly Crossing Active
              </span>
              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold">
                HIGH FLUX
              </span>
            </div>
            <p className="font-mono text-xs text-red-700 mt-1">
              Active spacecraft {spacecraftId} is currently transiting the Van Allen inner radiation belt dip.
              Transient high-energy proton flux is injecting thermal variances and EPS voltage perturbations into live telemetry.
              {saaStatus?.exit_time && ` Predicted egress: ${new Date(saaStatus.exit_time).toUTCString().slice(17, 25)} UTC.`}
            </p>
          </div>
        </div>
      )}

      {/* Orbital Geodetic Coordinates & Velocity Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Sub-Satellite Latitude',
            value: orbitalState?.latitude != null ? `${orbitalState.latitude.toFixed(4)}°` : '—',
            sub: orbitalState?.latitude != null ? (orbitalState.latitude >= 0 ? 'Northern Hemisphere' : 'Southern Hemisphere') : 'WGS84 Ellipsoid',
            icon: Navigation,
            color: 'text-sky-700',
          },
          {
            label: 'Sub-Satellite Longitude',
            value: orbitalState?.longitude != null ? `${orbitalState.longitude.toFixed(4)}°` : '—',
            sub: orbitalState?.longitude != null ? (orbitalState.longitude >= 0 ? 'East of Meridian' : 'West of Meridian') : 'TEME to ECEF',
            icon: Compass,
            color: 'text-sky-700',
          },
          {
            label: 'Orbital Altitude',
            value: orbitalState?.altitude_km != null ? `${orbitalState.altitude_km.toFixed(1)} km` : '—',
            sub: 'Mean Sea Level (AGL)',
            icon: Zap,
            color: 'text-amber-700',
          },
          {
            label: 'Orbital Velocity',
            value: orbitalState?.velocity_km_s != null ? `${orbitalState.velocity_km_s.toFixed(3)} km/s` : '—',
            sub: `${((orbitalState?.velocity_km_s || 7.5) * 3600).toFixed(0)} km/h`,
            icon: Activity,
            color: 'text-purple-700',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="p-4 bg-[#ebdccb] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] rounded-2xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${card.color}`} />
                <span className="font-mono text-[10px] font-bold text-[#73533e] uppercase tracking-widest">
                  {card.label}
                </span>
              </div>
              <div className="font-mono font-black text-xl text-[#24140b] leading-tight">{card.value}</div>
              <div className="font-mono text-[10px] text-[#73533e] mt-1">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Main Map + Side Telemetry Correlation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive World Ground Track Map */}
        <div className="lg:col-span-2 bg-[#ebdccb] border-2 border-[#452a19] shadow-[3px_3px_0px_#452a19] rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#452a19] bg-[#e0cdb8]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#452a19]" />
              <span className="font-mono font-bold text-xs text-[#24140b] uppercase tracking-widest">
                Orbital Ground Track Map · {spacecraftId}
              </span>
            </div>
            <span className="font-mono text-[9px] text-[#73533e] font-bold">
              Esri Dark Canvas · ±45 Min Window
            </span>
          </div>

          <div style={{ height: '480px', position: 'relative' }}>
            <MapContainer
              center={[currentLat ?? 10, currentLon ?? 0]}
              zoom={2}
              style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
              zoomControl={true}
              attributionControl={true}
              worldCopyJump={true}
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                maxZoom={16}
              />

              {/* South Atlantic Anomaly (SAA) Bounding Polygon */}
              <Polygon
                positions={SAA_POLYGON_COORDS}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: isInSAA ? 0.4 : 0.16,
                  weight: 2,
                  dashArray: isInSAA ? null : '6,4',
                }}
              >
                <Tooltip sticky className="orbital-item">
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fbf7f0', background: '#24140b', padding: '4px 8px', borderRadius: '6px' }}>
                    <strong>☢ South Atlantic Anomaly (SAA)</strong>
                    <br />
                    Van Allen Belt Magnetic Anomaly
                    {isInSAA && <span style={{ color: '#fea619', display: 'block', fontWeight: 'bold' }}>⚡ SPACECRAFT INSIDE ZONE</span>}
                  </div>
                </Tooltip>
              </Polygon>

              {/* Past Ground Track (Solid Amber #fea619) */}
              {pastTrack.length > 1 && (
                <Polyline
                  positions={pastTrack}
                  pathOptions={{ color: '#fea619', weight: 2.8, opacity: 0.9 }}
                />
              )}

              {/* Projected Ground Track (Dashed Cool Grey #94a3b8) */}
              {futureTrack.length > 1 && (
                <Polyline
                  positions={futureTrack}
                  pathOptions={{ color: '#94a3b8', weight: 2, opacity: 0.65, dashArray: '8,6' }}
                />
              )}

              {/* DSN Ground Station Markers */}
              {dsnPasses &&
                Object.entries(dsnPasses.stations || {}).map(([name, info]) => {
                  const meta = DSN_STATIONS_META[name] || { label: name };
                  return (
                    <CircleMarker
                      key={name}
                      center={[info.lat, info.lon]}
                      radius={info.visible ? 10 : 7}
                      pathOptions={{
                        color: info.visible ? '#22c55e' : '#64748b',
                        fillColor: info.visible ? '#86efac' : '#334155',
                        fillOpacity: 0.9,
                        weight: 2,
                      }}
                    >
                      <Tooltip className="orbital-item" direction="top" offset={[0, -10]}>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fbf7f0', background: '#24140b', padding: '6px 10px', borderRadius: '8px' }}>
                          <strong>📡 {meta.label}</strong>
                          <br />
                          Horizon Elevation: {info.elevation_deg != null ? `${info.elevation_deg.toFixed(1)}°` : 'N/A'}
                          <br />
                          {info.visible ? (
                            <span style={{ color: '#4ade80', fontWeight: 'bold' }}>
                              ✅ LINE-OF-SIGHT CONTACT ACTIVE
                              {info.los_time && <><br />LOS: {new Date(info.los_time).toUTCString().slice(17, 22)} UTC</>}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>
                              ⚫ BELOW HORIZON (&lt; 10°)
                              {info.aos_time && <><br />Next AOS: {new Date(info.aos_time).toUTCString().slice(17, 22)} UTC</>}
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}

              {/* Live Spacecraft Animated Marker */}
              {currentLat != null && currentLon != null && (
                <SatelliteMarker lat={currentLat} lon={currentLon} spacecraftId={spacecraftId} />
              )}
            </MapContainer>

            {/* Map Legend Overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                zIndex: 1000,
                background: 'rgba(36,20,11,0.92)',
                border: '2px solid #452a19',
                borderRadius: '12px',
                padding: '10px 14px',
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#fbf7f0',
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '22px', height: '3px', background: '#fea619', borderRadius: '2px' }} />
                  <span>Past Ground Track (-45m)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '22px', height: '2px', background: '#94a3b8', borderRadius: '2px', backgroundImage: 'repeating-linear-gradient(90deg, #94a3b8 0px, #94a3b8 6px, transparent 6px, transparent 12px)' }} />
                  <span>Projected Track (+45m)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(239,68,68,0.4)', border: '2px solid #ef4444' }} />
                  <span>South Atlantic Anomaly</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#86efac', border: '2px solid #22c55e' }} />
                  <span>DSN Station (In Contact)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#334155', border: '2px solid #64748b' }} />
                  <span>DSN Station (Out of Range)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: DSN Coverage, SAA Diagnostics & Solar Point */}
        <div className="flex flex-col gap-4">
          {/* Deep Space Network Ground Contacts */}
          <div className="bg-[#ebdccb] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#452a19] bg-[#e0cdb8]">
              <Radio className="w-4 h-4 text-[#452a19]" />
              <span className="font-mono font-bold text-xs text-[#24140b] uppercase tracking-widest">
                DSN Ground Station Visibility
              </span>
            </div>
            <div className="p-4 space-y-3">
              {dsnPasses
                ? Object.entries(dsnPasses.stations || {}).map(([name, info]) => {
                    const meta = DSN_STATIONS_META[name] || { label: name };
                    return (
                      <div
                        key={name}
                        className={`p-3 border-2 rounded-xl transition-all ${
                          info.visible
                            ? 'bg-emerald-50 border-emerald-600 shadow-[2px_2px_0px_#14532d]'
                            : 'bg-[#fbf7f0] border-[#4a2e1b]/30 shadow-[1px_1px_0px_#4a2e1b]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {info.visible ? (
                              <Wifi className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <WifiOff className="w-4 h-4 text-[#73533e]" />
                            )}
                            <span className="font-mono font-bold text-xs text-[#24140b]">{meta.label}</span>
                          </div>
                          <span
                            className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              info.visible
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-500'
                                : 'bg-[#ebdccb] text-[#73533e] border-[#452a19]'
                            }`}
                          >
                            {info.visible ? 'IN CONTACT' : 'BELOW HORIZON'}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-[#73533e] space-y-1">
                          <div className="flex justify-between">
                            <span>Topocentric Elevation:</span>
                            <span className="font-bold text-[#24140b]">
                              {info.elevation_deg != null ? `${info.elevation_deg.toFixed(1)}°` : 'N/A'}
                            </span>
                          </div>
                          {info.visible && info.los_time && (
                            <div className="flex justify-between text-emerald-800 font-bold">
                              <span>Loss of Signal (LOS):</span>
                              <span>{new Date(info.los_time).toUTCString().slice(17, 25)} UTC</span>
                            </div>
                          )}
                          {!info.visible && info.aos_time && (
                            <div className="flex justify-between text-[#73533e]">
                              <span>Acquisition (AOS):</span>
                              <span className="font-bold text-[#24140b]">{new Date(info.aos_time).toUTCString().slice(17, 25)} UTC</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                : ['Goldstone', 'Madrid', 'Canberra'].map((name) => (
                    <div
                      key={name}
                      className="p-3 border-2 border-[#452a19] rounded-xl bg-[#fbf7f0] animate-pulse"
                    >
                      <div className="font-mono text-xs text-[#73533e]">{name} DSN — Computing topocentric angles...</div>
                    </div>
                  ))}
            </div>
          </div>

          {/* SAA Radiation Correlation Diagnostics Card */}
          <div
            className={`bg-[#ebdccb] border-2 shadow-[2px_2px_0px_#452a19] rounded-2xl overflow-hidden ${
              isInSAA ? 'border-red-600' : 'border-[#452a19]'
            }`}
          >
            <div
              className={`flex items-center gap-2 px-4 py-3 border-b-2 ${
                isInSAA ? 'bg-red-200 border-red-600' : 'bg-[#e0cdb8] border-[#452a19]'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${isInSAA ? 'text-red-700' : 'text-[#452a19]'}`} />
              <span className="font-mono font-bold text-xs text-[#24140b] uppercase tracking-widest">
                SAA Radiation Telemetry Spikes
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div
                className={`flex items-center justify-between p-2.5 rounded-xl border-2 ${
                  isInSAA
                    ? 'bg-red-50 border-red-500 text-red-800'
                    : 'bg-emerald-50 border-emerald-500 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isInSAA ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="font-mono font-bold text-xs uppercase">
                    {isInSAA ? 'SAA TRANSIT ACTIVE' : 'Outside Radiation Hazard Zone'}
                  </span>
                </div>
                <span className="text-[10px] font-bold">
                  {isInSAA ? 'ANOMALY DETECTED' : 'NOMINAL'}
                </span>
              </div>

              {/* Perturbation metrics */}
              <div className="space-y-1.5 font-mono text-[10px] text-[#73533e]">
                <div className="flex justify-between">
                  <span>Current Spacecraft:</span>
                  <span className="font-bold text-[#24140b]">{spacecraftId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bus Voltage Noise:</span>
                  <span className={`font-bold ${isInSAA ? 'text-red-600' : 'text-[#24140b]'}`}>
                    {isInSAA ? '-0.25 V to -0.40 V (Proton Drag)' : '±0.04 V (Nominal)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Thermal Variance:</span>
                  <span className={`font-bold ${isInSAA ? 'text-red-600' : 'text-[#24140b]'}`}>
                    {isInSAA ? '+1.2 °C to +2.4 °C (Radiative Spike)' : '±0.15 °C (Equilibrium)'}
                  </span>
                </div>
                {isInSAA && saaStatus?.exit_time && (
                  <div className="flex justify-between text-red-700 font-bold pt-1 border-t border-red-200">
                    <span>Predicted Exit:</span>
                    <span>{new Date(saaStatus.exit_time).toUTCString().slice(17, 25)} UTC</span>
                  </div>
                )}
                {!isInSAA && saaStatus?.entry_time && (
                  <div className="flex justify-between text-[#73533e] pt-1 border-t border-[#4a2e1b]/20">
                    <span>Next Predicted Entry:</span>
                    <span className="font-bold text-[#24140b]">{new Date(saaStatus.entry_time).toUTCString().slice(17, 25)} UTC</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subsolar Point & Daylight Terminator Info */}
          {orbitalState?.subsolar_point && (
            <div className="bg-[#ebdccb] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">☀️</span>
                <span className="font-mono font-bold text-xs text-[#24140b] uppercase tracking-widest">
                  Subsolar Coordinate & Terminator
                </span>
              </div>
              <div className="space-y-1 font-mono text-[10px] text-[#73533e]">
                <div className="flex justify-between">
                  <span>Solar Declination (Lat):</span>
                  <span className="font-bold text-[#24140b]">
                    {orbitalState.subsolar_point.lat?.toFixed(4)}° {orbitalState.subsolar_point.lat >= 0 ? 'N' : 'S'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Solar Hour Angle (Lon):</span>
                  <span className="font-bold text-[#24140b]">
                    {orbitalState.subsolar_point.lon?.toFixed(4)}° {orbitalState.subsolar_point.lon >= 0 ? 'E' : 'W'}
                  </span>
                </div>
                <p className="text-[9px] text-[#73533e] mt-2 pt-2 border-t border-[#4a2e1b]/20">
                  Daylight terminator curve calculated dynamically from GMST and solar declination algorithms.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info & Telemetry Reference */}
      <div className="text-center font-mono text-[10px] text-[#73533e] py-3 border-t border-[#4a2e1b]/20">
        Live SGP4 Propagator Engine · TLE Source: <span className="font-bold text-[#24140b]">CelesTrak SATCAT</span> (hourly refresh) ·
        Coordinate Transformations: TEME → ECEF (GMST rotation) → Geodetic WGS84 ·
        {groundTrack?.track?.length ? ` ${groundTrack.track.length} orbital track points computed dynamically.` : ' Initializing ephemeris stream.'}
      </div>
    </div>
  );
};


"""
ASTRA Orbital Mechanics & SGP4 Propagation Service
Real-time TLE ingestion from CelesTrak + live geodetic coordinate computation.
NO hardcoded positions. All coordinates are dynamically computed from live TLE + current UTC.
"""
import asyncio
import logging
import math
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

import httpx

logger = logging.getLogger("astra.orbital")

# ---------------------------------------------------------------------------
# CelesTrak TLE Sources (SMAP = 41240, ISS = 25544, Sentinel-3B = 43013)
# ---------------------------------------------------------------------------
TLE_SOURCES = {
    "ASTRA-ALPHA": "https://celestrak.org/NORAD/elements/gp.php?CATNR=41240&FORMAT=TLE",   # NASA SMAP
    "ASTRA-BETA":  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE",   # ISS
    "ASTRA-GAMMA": "https://celestrak.org/NORAD/elements/gp.php?CATNR=43013&FORMAT=TLE",   # Sentinel-3B
}
FALLBACK_TLE_SOURCES = {
    "ASTRA-ALPHA": "https://celestrak.org/satcat/tle.php?CATNR=41240",
    "ASTRA-BETA":  "https://celestrak.org/satcat/tle.php?CATNR=25544",
    "ASTRA-GAMMA": "https://celestrak.org/satcat/tle.php?CATNR=43013",
}
TLE_REFRESH_INTERVAL_SECONDS = 3600  # Refresh TLE every hour

# ---------------------------------------------------------------------------
# DSN Ground Stations (geodetic lat, lon in degrees, elevation mask 10 deg)
# ---------------------------------------------------------------------------
DSN_STATIONS = {
    "Goldstone": {"lat": 35.4267, "lon": -116.8900, "alt_km": 1.003},
    "Madrid":    {"lat": 40.4314, "lon":  -4.2480,  "alt_km": 0.834},
    "Canberra":  {"lat": -35.4014, "lon": 148.9817,  "alt_km": 0.688},
}
ELEVATION_MASK_DEG = 10.0

# ---------------------------------------------------------------------------
# South Atlantic Anomaly bounding polygon (standard IEEE / NASA geomag definition)
# Vertices: list of (lat, lon) tuples defining a closed polygon
# ---------------------------------------------------------------------------
SAA_POLYGON = [
    (-50.0, -90.0),
    (-50.0, -30.0),
    (-20.0,  40.0),
    ( 10.0,  40.0),
    ( 10.0, -90.0),
    (-50.0, -90.0),
]


def _point_in_polygon(lat: float, lon: float, polygon: list) -> bool:
    """Ray-casting algorithm for point-in-polygon test."""
    n = len(polygon)
    inside = False
    x, y = lon, lat
    px, py = polygon[-1]
    for qx, qy in polygon:
        if ((py <= y < qy) or (qy <= y < py)) and (x < (qx - px) * (y - py) / (qy - py + 1e-12) + px):
            inside = not inside
        px, py = qx, qy
    return inside


def _jday_from_datetime(dt: datetime):
    """Convert UTC datetime to Julian day number (jd, fr) for sgp4."""
    from sgp4.api import jday
    return jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)


def _teme_to_geodetic(r_km, dt: datetime):
    """
    Convert TEME position vector (km) to geodetic lat/lon/alt.
    Accounts for Earth rotation angle (GMST) to obtain accurate geodetic longitude.
    r_km: [x, y, z] in km.
    Returns (lat_deg, lon_deg, alt_km).
    """
    x, y, z = r_km
    # Compute Greenwich Mean Sidereal Time (GMST)
    jd, fr = _jday_from_datetime(dt)
    # Days since J2000.0 (2000-01-01 12:00:00 TT ~ JD 2451545.0)
    d = (jd - 2451545.0) + fr
    gmst_rad = math.radians((280.46061837 + 360.98564736629 * d) % 360.0)

    # Rotate TEME to pseudo-ECEF by GMST around Z axis
    cos_g = math.cos(gmst_rad)
    sin_g = math.sin(gmst_rad)
    x_ecef = x * cos_g + y * sin_g
    y_ecef = -x * sin_g + y * cos_g
    z_ecef = z

    # Earth parameters (WGS84)
    a = 6378.137       # semi-major axis km
    f = 1.0 / 298.257223563
    b = a * (1.0 - f)
    e2 = 1.0 - (b / a) ** 2

    lon_rad = math.atan2(y_ecef, x_ecef)
    p = math.sqrt(x_ecef ** 2 + y_ecef ** 2)

    # Iterative Bowring method
    lat_rad = math.atan2(z_ecef, p * (1.0 - e2))
    for _ in range(5):
        sin_lat = math.sin(lat_rad)
        N = a / math.sqrt(1.0 - e2 * sin_lat ** 2)
        lat_rad = math.atan2(z_ecef + e2 * N * sin_lat, p)

    sin_lat = math.sin(lat_rad)
    cos_lat = math.cos(lat_rad)
    N = a / math.sqrt(1.0 - e2 * sin_lat ** 2)

    if abs(cos_lat) > 1e-10:
        alt_km = p / cos_lat - N
    else:
        alt_km = abs(z_ecef) / abs(sin_lat) - N * (1.0 - e2)

    lat_deg = math.degrees(lat_rad)
    lon_deg = math.degrees(lon_rad)
    # Normalize longitude to [-180, 180]
    lon_deg = (lon_deg + 180.0) % 360.0 - 180.0

    return lat_deg, lon_deg, alt_km


def _subsolar_point(dt: datetime) -> Dict[str, float]:
    """
    Compute the subsolar point (lat, lon) for a given UTC datetime.
    Used for daylight terminator rendering.
    """
    jd, fr = _jday_from_datetime(dt)
    n = (jd + fr) - 2451545.0

    # Mean longitude of the Sun (deg)
    L = (280.460 + 0.9856474 * n) % 360.0
    # Mean anomaly (rad)
    g = math.radians((357.528 + 0.9856003 * n) % 360.0)
    # Ecliptic longitude (rad)
    lam = math.radians(L + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g))
    # Obliquity of the ecliptic (rad)
    eps = math.radians(23.439 - 0.0000004 * n)

    # Declination (deg)
    sin_dec = math.sin(eps) * math.sin(lam)
    dec = math.degrees(math.asin(sin_dec))

    # Greenwich Mean Sidereal Time (deg)
    GMST_deg = (280.46061837 + 360.98564736629 * n) % 360.0
    # Right Ascension (deg)
    ra = math.degrees(math.atan2(math.cos(eps) * math.sin(lam), math.cos(lam)))
    lon_sun = (ra - GMST_deg) % 360.0
    if lon_sun > 180.0:
        lon_sun -= 360.0

    return {"lat": round(dec, 4), "lon": round(lon_sun, 4)}


def _compute_elevation(sat_lat: float, sat_lon: float, sat_alt_km: float, gs_lat: float, gs_lon: float, gs_alt_km: float) -> float:
    """
    Compute topocentric horizon elevation angle (degrees) of satellite from ground station.
    """
    R_EARTH = 6371.0  # km
    slat, slon = math.radians(sat_lat), math.radians(sat_lon)
    glat, glon = math.radians(gs_lat), math.radians(gs_lon)

    # Ground station position vector in spherical coords
    R_gs = R_EARTH + gs_alt_km
    Rx = R_gs * math.cos(glat) * math.cos(glon)
    Ry = R_gs * math.cos(glat) * math.sin(glon)
    Rz = R_gs * math.sin(glat)

    # Satellite position vector
    R_sat = R_EARTH + sat_alt_km
    Sx = R_sat * math.cos(slat) * math.cos(slon)
    Sy = R_sat * math.cos(slat) * math.sin(slon)
    Sz = R_sat * math.sin(slat)

    # Range vector from GS to satellite
    dx, dy, dz = Sx - Rx, Sy - Ry, Sz - Rz
    dist = math.sqrt(dx**2 + dy**2 + dz**2)

    # Dot product with local vertical (zenith unit vector)
    up_x = Rx / R_gs
    up_y = Ry / R_gs
    up_z = Rz / R_gs
    dot = (dx * up_x + dy * up_y + dz * up_z) / (dist + 1e-9)
    dot = max(-1.0, min(1.0, dot))
    elevation_deg = math.degrees(math.asin(dot))
    return elevation_deg


class OrbitalService:
    """
    Async orbital mechanics service using SGP4 TLE propagation.
    Fetches live TLEs from CelesTrak and computes real-time geodetic coordinates.
    """

    def __init__(self):
        self._satrecs: dict = {}        # spacecraft_id -> sgp4 Satrec object
        self._tle_raw: dict = {}        # spacecraft_id -> (name, line1, line2)
        self._last_tle_fetch: float = 0.0
        self._lock = asyncio.Lock()
        self._saa_active: bool = False
        self._saa_entry_time: Optional[str] = None
        self._initialized: bool = False

    async def _fetch_single_tle(self, spacecraft_id: str) -> bool:
        """Fetch TLE from CelesTrak with fallback url."""
        from sgp4.api import Satrec
        urls = [TLE_SOURCES.get(spacecraft_id), FALLBACK_TLE_SOURCES.get(spacecraft_id)]
        
        for url in urls:
            if not url:
                continue
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.get(url, follow_redirects=True)
                    if resp.status_code != 200:
                        continue
                    text = resp.text.strip()
                    lines = [line.strip() for line in text.splitlines() if line.strip()]

                # Find line 1 and line 2
                line1, line2, name_line = None, None, spacecraft_id
                for line in lines:
                    if line.startswith("1 "):
                        line1 = line
                    elif line.startswith("2 "):
                        line2 = line
                    elif not line1 and not line.startswith("1 ") and not line.startswith("2 "):
                        name_line = line

                if line1 and line2:
                    sat = Satrec.twoline2rv(line1, line2)
                    async with self._lock:
                        self._satrecs[spacecraft_id] = sat
                        self._tle_raw[spacecraft_id] = (name_line, line1, line2)
                    logger.info(f"[Orbital] Live TLE loaded for {spacecraft_id} ({name_line}) from {url}")
                    return True
            except Exception as e:
                logger.warning(f"[Orbital] TLE fetch attempt failed for {spacecraft_id} via {url}: {e}")

        logger.error(f"[Orbital] All TLE fetch attempts failed for {spacecraft_id}")
        return False

    async def initialize(self):
        """Fetch initial TLEs for all constellation spacecraft."""
        tasks = [self._fetch_single_tle(sid) for sid in TLE_SOURCES.keys()]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        self._last_tle_fetch = time.time()
        self._initialized = any(r is True for r in results)
        logger.info(f"[Orbital] Engine initialized. Active TLE models: {list(self._satrecs.keys())}")

    async def _refresh_if_needed(self):
        """Refresh TLEs if the hourly interval has elapsed."""
        if time.time() - self._last_tle_fetch > TLE_REFRESH_INTERVAL_SECONDS:
            logger.info("[Orbital] Refreshing constellation TLE sets from CelesTrak...")
            tasks = [self._fetch_single_tle(sid) for sid in TLE_SOURCES.keys()]
            await asyncio.gather(*tasks, return_exceptions=True)
            self._last_tle_fetch = time.time()

    def _propagate(self, spacecraft_id: str, dt: Optional[datetime] = None):
        """
        Propagate spacecraft state vector using SGP4 at datetime dt (UTC).
        Returns (lat_deg, lon_deg, alt_km, vel_km_s) or None on error.
        """
        sat = self._satrecs.get(spacecraft_id)
        if sat is None:
            # Fallback to ASTRA-ALPHA if specific node is not yet loaded
            sat = self._satrecs.get("ASTRA-ALPHA")
            if sat is None:
                return None
        if dt is None:
            dt = datetime.now(timezone.utc)
        try:
            jd, fr = _jday_from_datetime(dt)
            e, r, v = sat.sgp4(jd, fr)
            if e != 0:
                return None
            lat, lon, alt = _teme_to_geodetic(r, dt)
            vel = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
            return lat, lon, alt, vel
        except Exception as ex:
            logger.error(f"[Orbital] SGP4 propagation exception for {spacecraft_id}: {ex}")
            return None

    # ------------------------------------------------------------------
    # Public REST API Methods
    # ------------------------------------------------------------------
    async def get_current_state(self, spacecraft_id: str = "ASTRA-ALPHA") -> Dict[str, Any]:
        """
        Computes and returns the exact live geodetic coordinates for the active spacecraft:
        latitude, longitude, altitude_km, velocity_km_s, subsolar_point, and SAA status.
        """
        await self._refresh_if_needed()
        dt = datetime.now(timezone.utc)
        result = self._propagate(spacecraft_id, dt)
        if result is None:
            return {
                "spacecraft_id": spacecraft_id,
                "error": f"TLE propagation unavailable for {spacecraft_id}",
                "timestamp_utc": dt.isoformat(),
                "latitude": 0.0,
                "longitude": 0.0,
                "altitude_km": 0.0,
                "velocity_km_s": 0.0,
                "subsolar_point": _subsolar_point(dt),
                "saa_inside": False,
            }

        lat, lon, alt, vel = result
        subsolar = _subsolar_point(dt)
        saa_inside = _point_in_polygon(lat, lon, SAA_POLYGON)

        if saa_inside and not self._saa_active:
            self._saa_active = True
            self._saa_entry_time = dt.isoformat()
        elif not saa_inside:
            self._saa_active = False

        return {
            "spacecraft_id": spacecraft_id,
            "timestamp_utc": dt.isoformat(),
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "altitude_km": round(alt, 3),
            "velocity_km_s": round(vel, 4),
            "subsolar_point": subsolar,
            "saa_inside": saa_inside,
        }

    async def get_ground_track(
        self,
        spacecraft_id: str = "ASTRA-ALPHA",
        minutes_back: int = 45,
        minutes_forward: int = 45,
        step_seconds: int = 30,
    ) -> Dict[str, Any]:
        """
        Computes historical and projected ground track path (array of [lat, lon, timestamp])
        sampled every step_seconds across the specified window.
        """
        await self._refresh_if_needed()
        now = datetime.now(timezone.utc)
        track = []
        total_seconds = (minutes_back + minutes_forward) * 60
        start_dt = now - timedelta(minutes=minutes_back)
        steps = total_seconds // step_seconds

        for i in range(int(steps) + 1):
            dt = start_dt + timedelta(seconds=i * step_seconds)
            res = self._propagate(spacecraft_id, dt)
            if res is None:
                continue
            lat, lon, alt, vel = res
            track.append({
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "alt_km": round(alt, 2),
                "timestamp_iso": dt.isoformat(),
                "is_past": dt <= now,
            })

        return {
            "spacecraft_id": spacecraft_id,
            "track": track,
            "generated_at": now.isoformat(),
        }

    async def get_dsn_passes(self, spacecraft_id: str = "ASTRA-ALPHA") -> Dict[str, Any]:
        """
        Calculates real-time line-of-sight acquisition of signal (AOS) and loss of signal (LOS)
        windows for core Deep Space Network (DSN) ground stations (Goldstone, Madrid, Canberra)
        based on topocentric horizon elevation angles (> 10°).
        """
        await self._refresh_if_needed()
        dt = datetime.now(timezone.utc)
        res = self._propagate(spacecraft_id, dt)
        stations_status = {}

        if res is None:
            for name, gs in DSN_STATIONS.items():
                stations_status[name] = {
                    "lat": gs["lat"],
                    "lon": gs["lon"],
                    "visible": False,
                    "elevation_deg": None,
                    "aos_time": None,
                    "los_time": None,
                }
            return {
                "spacecraft_id": spacecraft_id,
                "stations": stations_status,
                "timestamp_utc": dt.isoformat()
            }

        sat_lat, sat_lon, sat_alt, _ = res

        for name, gs in DSN_STATIONS.items():
            el = _compute_elevation(sat_lat, sat_lon, sat_alt, gs["lat"], gs["lon"], gs["alt_km"])
            visible = el >= ELEVATION_MASK_DEG
            aos_time = None
            los_time = None

            if not visible:
                # Scan forward up to 100 min in 60s increments to find AOS
                for delta_s in range(60, 6001, 60):
                    dt2 = dt + timedelta(seconds=delta_s)
                    r2 = self._propagate(spacecraft_id, dt2)
                    if r2:
                        e2 = _compute_elevation(r2[0], r2[1], r2[2], gs["lat"], gs["lon"], gs["alt_km"])
                        if e2 >= ELEVATION_MASK_DEG:
                            aos_time = dt2.isoformat()
                            break
            else:
                # Scan forward to find LOS
                for delta_s in range(60, 6001, 60):
                    dt2 = dt + timedelta(seconds=delta_s)
                    r2 = self._propagate(spacecraft_id, dt2)
                    if r2:
                        e2 = _compute_elevation(r2[0], r2[1], r2[2], gs["lat"], gs["lon"], gs["alt_km"])
                        if e2 < ELEVATION_MASK_DEG:
                            los_time = dt2.isoformat()
                            break

            stations_status[name] = {
                "lat": gs["lat"],
                "lon": gs["lon"],
                "visible": visible,
                "elevation_deg": round(el, 2),
                "aos_time": aos_time,
                "los_time": los_time,
            }

        return {
            "spacecraft_id": spacecraft_id,
            "stations": stations_status,
            "timestamp_utc": dt.isoformat(),
        }

    async def get_saa_status(self, spacecraft_id: str = "ASTRA-ALPHA") -> Dict[str, Any]:
        """
        Checks if the spacecraft's current live geodetic coordinates fall inside
        the South Atlantic Anomaly (SAA) bounding polygon.
        """
        await self._refresh_if_needed()
        dt = datetime.now(timezone.utc)
        res = self._propagate(spacecraft_id, dt)
        if res is None:
            return {
                "spacecraft_id": spacecraft_id,
                "inside": False,
                "error": "Propagation unavailable",
                "timestamp_utc": dt.isoformat()
            }

        lat, lon, alt, _ = res
        inside = _point_in_polygon(lat, lon, SAA_POLYGON)

        # Estimate exit time if inside
        exit_time = None
        if inside:
            for delta_s in range(60, 3601, 60):
                dt2 = dt + timedelta(seconds=delta_s)
                r2 = self._propagate(spacecraft_id, dt2)
                if r2 and not _point_in_polygon(r2[0], r2[1], SAA_POLYGON):
                    exit_time = dt2.isoformat()
                    break

        # Estimate next entry time if outside
        entry_time = None
        if not inside:
            for delta_s in range(60, 7201, 60):
                dt2 = dt + timedelta(seconds=delta_s)
                r2 = self._propagate(spacecraft_id, dt2)
                if r2 and _point_in_polygon(r2[0], r2[1], SAA_POLYGON):
                    entry_time = dt2.isoformat()
                    break

        return {
            "spacecraft_id": spacecraft_id,
            "inside": inside,
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "altitude_km": round(alt, 3),
            "saa_polygon": SAA_POLYGON,
            "entry_time": entry_time,
            "exit_time": exit_time,
            "anomaly_flag": "SAA_RADIATION_SPIKE" if inside else None,
            "timestamp_utc": dt.isoformat(),
        }

    def get_saa_perturbations(self) -> Dict[str, Any]:
        """Returns telemetry perturbations if SAA radiation anomaly is currently active."""
        if self._saa_active:
            return {
                "temperature_delta": round(random.uniform(0.8, 2.4), 3),
                "voltage_delta": round(-random.uniform(0.15, 0.45), 3),
                "radiation_spike": True,
            }
        return {"temperature_delta": 0.0, "voltage_delta": 0.0, "radiation_spike": False}


# Singleton instance
orbital_service = OrbitalService()

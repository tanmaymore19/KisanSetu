import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Compass,
  Phone,
  Car,
  ExternalLink,
  LocateFixed,
  RefreshCw,
  X,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import {
  getAccurateCoordinates,
  reverseGeocodeCoordinates,
  calculateAccurateDistanceKm,
  calculateCompassBearing,
  formatAccuracyBadge,
} from '../lib/geo.js';

interface FarmLiveDirectionMapProps {
  farmName: string;
  farmLocation: string;
  farmLat: number;
  farmLng: number;
  farmerName?: string;
  farmerPhone?: string;
  consumerLat?: number;
  consumerLng?: number;
  consumerAddress?: string;
  bookingCode?: string;
  slotDate?: string;
  slotTime?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const FarmLiveDirectionMap: React.FC<FarmLiveDirectionMapProps> = ({
  farmName,
  farmLocation,
  farmLat,
  farmLng,
  farmerName,
  farmerPhone,
  consumerLat: initialLat = 18.5204,
  consumerLng: initialLng = 73.8567,
  consumerAddress: initialAddress,
  bookingCode,
  slotDate,
  slotTime,
  onClose,
  isModal = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const consumerMarkerRef = useRef<L.Marker | null>(null);

  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);
  const [currentLabel, setCurrentLabel] = useState<string>(
    initialAddress || 'Current Browsing Location'
  );
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isUpdatingGps, setIsUpdatingGps] = useState(false);
  const [liveWatchActive, setLiveWatchActive] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Travel estimations
  const distanceKm = calculateAccurateDistanceKm(currentLat, currentLng, farmLat, farmLng);
  const carMins = Math.max(5, Math.round(distanceKm * 2.2 + 8));
  const bikeMins = Math.max(4, Math.round(distanceKm * 1.9 + 5));
  const bearingObj = calculateCompassBearing(currentLat, currentLng, farmLat, farmLng);
  const bearing = `${bearingObj.compassDirection} (${bearingObj.degrees}°)`;

  // Update consumer GPS position
  const refreshLiveLocation = async () => {
    setIsUpdatingGps(true);
    try {
      const accurate = await getAccurateCoordinates({
        targetAccuracy: 15,
        maxWaitMs: 6500,
        fallbackToIp: true,
      });
      setCurrentLat(accurate.lat);
      setCurrentLng(accurate.lng);
      setGpsAccuracy(accurate.accuracy);

      const rev = await reverseGeocodeCoordinates(accurate.lat, accurate.lng, accurate.accuracy);
      setCurrentLabel(rev.label || rev.formattedAddress || 'Your Live GPS Location');
    } catch (err: any) {
      console.warn('GPS detection notice:', err.message);
    } finally {
      setIsUpdatingGps(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [(currentLat + farmLat) / 2, (currentLng + farmLng) / 2],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Custom Consumer Icon (Blue pulsing beacon)
    const consumerIcon = L.divIcon({
      className: 'custom-live-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background-color: rgba(59, 130, 246, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #2563EB; border: 3px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // Custom Farm Icon (Green agricultural badge)
    const farmIcon = L.divIcon({
      className: 'custom-farm-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="padding: 4px 8px; border-radius: 12px; background-color: #5D7A4F; color: white; font-weight: 700; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px; border: 2px solid white; white-space: nowrap;">
            <span>🌱</span> ${farmName.substring(0, 18)}
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #5D7A4F;"></div>
        </div>
      `,
      iconSize: [120, 42],
      iconAnchor: [60, 42],
    });

    // Markers
    const cMarker = L.marker([currentLat, currentLng], { icon: consumerIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: system-ui; font-size: 12px;"><strong>📍 Your Live Location</strong><br/>${currentLabel}</div>`
      );

    const fMarker = L.marker([farmLat, farmLng], { icon: farmIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: system-ui; font-size: 12px;"><strong>🌱 ${farmName}</strong><br/>${farmLocation}</div>`
      )
      .openPopup();

    consumerMarkerRef.current = cMarker;

    // Connecting Route Polyline (Dashed natural green pathway)
    const line = L.polyline(
      [
        [currentLat, currentLng],
        [farmLat, farmLng],
      ],
      {
        color: '#5D7A4F',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
      }
    ).addTo(map);

    polylineRef.current = line;

    // Fit bounds to show both points with comfortable padding
    const group = L.featureGroup([cMarker, fMarker]);
    map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 14 });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [farmLat, farmLng, farmName, farmLocation]);

  // Update live marker & route when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (consumerMarkerRef.current) {
      consumerMarkerRef.current.setLatLng([currentLat, currentLng]);
    }
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([
        [currentLat, currentLng],
        [farmLat, farmLng],
      ]);
    }
    const bounds = L.latLngBounds([
      [currentLat, currentLng],
      [farmLat, farmLng],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [currentLat, currentLng, farmLat, farmLng]);

  // Watch position for real-time turn tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    let watchId: number | null = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLiveWatchActive(true);
          setCurrentLat(pos.coords.latitude);
          setCurrentLng(pos.coords.longitude);
          setGpsAccuracy(Math.round(pos.coords.accuracy || 10));
        },
        (err) => {
          console.warn('Watch position unavailable:', err.message);
          setLiveWatchActive(false);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
      );
    } catch {
      setLiveWatchActive(false);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Google Maps Navigation URL
  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    `${currentLat},${currentLng}`
  )}&destination=${encodeURIComponent(`${farmLat},${farmLng}`)}&travelmode=driving`;

  const handleCopyCoordinates = () => {
    navigator.clipboard.writeText(`${farmLat}, ${farmLng}`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const content = (
    <div className="flex flex-col bg-[#FAF8F5] rounded-3xl overflow-hidden shadow-2xl border border-[#E5E0D5] w-full max-w-2xl text-[#2D3A26]">
      {/* Header */}
      <div className="bg-[#5D7A4F] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-serif flex items-center gap-1.5">
              Live Route to {farmName}
            </h3>
            <p className="text-[11px] text-[#EBF1E8]">
              Direct turn-by-turn guidance from your current location
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Live Distance & ETA Bar */}
      <div className="grid grid-cols-3 divide-x divide-[#E5E0D5] bg-[#F1EDE4] border-b border-[#E5E0D5] p-3 text-center text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#5D6D56] tracking-wider block">
            Direct Distance
          </span>
          <span className="text-base font-extrabold text-[#5D7A4F] font-serif">
            {distanceKm} km
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-[#5D6D56] tracking-wider block flex items-center justify-center gap-1">
            <Car className="w-3 h-3 text-[#5D7A4F]" /> Drive ETA
          </span>
          <span className="text-base font-extrabold text-[#2D3A26]">
            ~{carMins} mins
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-[#5D6D56] tracking-wider block flex items-center justify-center gap-1">
            <Compass className="w-3 h-3 text-[#8A9A5B]" /> Bearing
          </span>
          <span className="text-xs font-bold text-[#2D3A26] mt-0.5 block truncate">
            {bearing}
          </span>
        </div>
      </div>

      {/* Interactive Map Container */}
      <div className="relative w-full h-[280px] sm:h-[340px] bg-[#E5E0D5]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Live Tracking Status Badge Overlay */}
        <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-[#D4CDBC] shadow-xs flex items-center gap-2 text-[11px]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
          <span className="font-semibold text-[#2D3A26]">
            {liveWatchActive ? 'Live GPS Satellite Tracking' : 'Device Location Locked'}
          </span>
          {gpsAccuracy && (
            <span className="text-[10px] text-[#5D6D56]">
              (±{gpsAccuracy}m)
            </span>
          )}
        </div>

        {/* GPS Re-lock button overlay */}
        <button
          type="button"
          onClick={refreshLiveLocation}
          disabled={isUpdatingGps}
          className="absolute bottom-3 right-3 z-20 bg-white/95 hover:bg-white text-[#2D3A26] px-3 py-1.5 rounded-xl border border-[#D4CDBC] shadow-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#5D7A4F] ${isUpdatingGps ? 'animate-spin' : ''}`} />
          {isUpdatingGps ? 'Locating...' : 'Update My GPS'}
        </button>
      </div>

      {/* Origin & Destination Summary */}
      <div className="p-4 space-y-3">
        <div className="p-3 bg-white rounded-2xl border border-[#E5E0D5] space-y-2 text-xs">
          {/* Origin (Consumer) */}
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <LocateFixed className="w-3.5 h-3.5" />
            </div>
            <div className="grow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Start Point (Your Live Location)
              </span>
              <p className="font-semibold text-[#2D3A26] leading-tight">
                {currentLabel}
              </p>
              <span className="text-[10px] text-[#8C9886] font-mono">
                {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="border-l-2 border-dashed border-[#D4CDBC] ml-3 h-4"></div>

          {/* Destination (Farm) */}
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="grow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D7A4F] block">
                Destination (Farm Gate)
              </span>
              <p className="font-bold text-[#2D3A26] font-serif leading-tight">
                {farmName}
              </p>
              <p className="text-[11px] text-[#5D6D56]">
                {farmLocation}
              </p>
              <span className="text-[10px] text-[#8C9886] font-mono">
                {farmLat.toFixed(4)}, {farmLng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Visit Details (if booking context provided) */}
        {(bookingCode || slotDate) && (
          <div className="p-2.5 bg-[#EBF1E8] rounded-xl border border-[#D4CDBC] flex items-center justify-between text-xs text-[#2D3A26]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5D7A4F]" />
              <div>
                <span className="font-bold block">
                  {slotDate && `Visit Date: ${slotDate}`} {slotTime && `• ${slotTime}`}
                </span>
                {bookingCode && (
                  <span className="text-[11px] text-[#5D6D56]">
                    Pass Code: <strong className="font-mono text-[#5D7A4F]">{bookingCode}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <a
            href={googleMapsNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="grow py-3 px-4 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 text-center"
          >
            <Navigation className="w-4 h-4" />
            Start Google Maps Navigation
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>

          {farmerPhone && (
            <a
              href={`tel:${farmerPhone}`}
              className="py-3 px-4 rounded-xl bg-white hover:bg-[#F1EDE4] border border-[#D4CDBC] text-[#2D3A26] font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-3.5 h-3.5 text-[#5D7A4F]" />
              Call Farmer
            </a>
          )}

          <button
            type="button"
            onClick={handleCopyCoordinates}
            className="py-3 px-3 rounded-xl bg-[#F1EDE4] hover:bg-[#E5E0D5] text-[#2D3A26] font-medium text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            {copySuccess ? 'Copied GPS!' : 'Copy GPS'}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-3 rounded-xl bg-white hover:bg-[#F1EDE4] border border-[#E5E0D5] text-[#2D3A26] font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F]" />
              <span>Go Back</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="animate-in fade-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
        {content}
      </div>
    </div>
  );
};

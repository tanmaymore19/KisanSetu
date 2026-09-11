import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';
import {
  getAccurateLocationWithAddress,
  searchAddressOrLandmark,
  reverseGeocodeCoordinates,
  formatAccuracyBadge,
  AccurateLocation,
  GeocodeSearchResult,
} from '../lib/geo.js';
import {
  MapPin,
  Compass,
  Check,
  X,
  Navigation,
  Search,
  AlertCircle,
  CheckCircle2,
  Radio,
  Sliders,
  Sparkles,
  Loader2,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_AGRICULTURAL_REGIONS = [
  { label: 'Baner, Pune', region: 'Pune Urban Hub', lat: 18.559, lng: 73.7868 },
  { label: 'Hinjewadi, Pune', region: 'Agri-Tech Belt', lat: 18.5912, lng: 73.7389 },
  { label: 'Baramati', region: 'KVK & Sugarcane / Dairy Belt', lat: 18.1521, lng: 74.577 },
  { label: 'Narayangaon, Junnar', region: 'Tomato & Vegetable Valley', lat: 19.1177, lng: 73.9785 },
  { label: 'Dindori, Nashik', region: 'Grape & Wine Farms', lat: 20.2, lng: 73.83 },
  { label: 'Mahabaleshwar / Satara', region: 'Strawberry & Hill Farms', lat: 17.6805, lng: 74.0183 },
  { label: 'Kothrud, Pune', region: 'Pune City', lat: 18.5074, lng: 73.8077 },
  { label: 'Kolhapur', region: 'Jaggery & Sugarcane Hub', lat: 16.705, lng: 74.2433 },
];

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'browsing' | 'delivery' | 'custom_coord'>('browsing');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectStatus, setDetectStatus] = useState<string>('');
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDetected, setLastDetected] = useState<AccurateLocation | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeSearchResult[]>([]);

  // Manual Coordinates State
  const [manualLat, setManualLat] = useState(String(user?.currentBrowsingLocation?.lat || 18.559));
  const [manualLng, setManualLng] = useState(String(user?.currentBrowsingLocation?.lng || 73.7868));
  const [isVerifyingCoords, setIsVerifyingCoords] = useState(false);
  const [coordVerifiedAddress, setCoordVerifiedAddress] = useState<string | null>(null);

  // Delivery address form
  const [deliveryStreet, setDeliveryStreet] = useState(user?.deliveryAddresses?.[0]?.street || '');
  const [deliveryCity, setDeliveryCity] = useState(user?.deliveryAddresses?.[0]?.city || 'Pune');
  const [deliveryPincode, setDeliveryPincode] = useState(user?.deliveryAddresses?.[0]?.pincode || '411045');

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAddressOrLandmark(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  // 1. High Accuracy Multi-Sample GPS Lock
  const handleRequestGPS = async () => {
    setIsDetecting(true);
    setError(null);
    setLiveAccuracy(null);
    setDetectStatus('Connecting to device GPS satellites...');

    try {
      const accurateLoc = await getAccurateLocationWithAddress({
        targetAccuracy: 15,
        maxWaitMs: 7500,
        fallbackToIp: true,
        onProgress: (p) => {
          if (p.accuracy) setLiveAccuracy(p.accuracy);
          setDetectStatus(p.stage);
        },
      });

      setLastDetected(accurateLoc);
      setLiveAccuracy(accurateLoc.accuracy);
      setDetectStatus(`GPS Locked (±${accurateLoc.accuracy}m). Saving location...`);

      const newLoc = {
        label: accurateLoc.label,
        lat: accurateLoc.lat,
        lng: accurateLoc.lng,
      };

      if (user) {
        try {
          const updated = await api.updateConsumerLocation(user.id, {
            currentBrowsingLocation: newLoc,
          });
          updateUser(updated);
        } catch {
          updateUser({ ...user, currentBrowsingLocation: newLoc });
        }
      }

      // Auto-suggest into delivery fields if currently empty
      if (!deliveryStreet && accurateLoc.formattedAddress) {
        setDeliveryStreet(accurateLoc.formattedAddress);
      }
      if (accurateLoc.city) setDeliveryCity(accurateLoc.city);
      if (accurateLoc.pincode) setDeliveryPincode(accurateLoc.pincode);

      setTimeout(() => {
        setIsDetecting(false);
        setDetectStatus('');
        onClose();
      }, 750);
    } catch (err: any) {
      setIsDetecting(false);
      setDetectStatus('');
      setError(
        err.message || 'Could not lock GPS satellite position. Try searching your village/city below.'
      );
    }
  };

  // 2. Select Search Result
  const handleSelectSearchResult = async (res: GeocodeSearchResult) => {
    const loc = {
      label: res.label,
      lat: res.lat,
      lng: res.lng,
    };

    if (user) {
      try {
        const updated = await api.updateConsumerLocation(user.id, {
          currentBrowsingLocation: loc,
        });
        updateUser(updated);
      } catch {
        updateUser({ ...user, currentBrowsingLocation: loc });
      }
    }

    if (!deliveryStreet && res.formattedAddress) setDeliveryStreet(res.formattedAddress);
    if (res.city) setDeliveryCity(res.city);
    if (res.pincode) setDeliveryPincode(res.pincode);

    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  // 3. Select Region Preset
  const handleSelectPreset = async (loc: { label: string; lat: number; lng: number }) => {
    if (!user) return;
    try {
      const updated = await api.updateConsumerLocation(user.id, {
        currentBrowsingLocation: loc,
      });
      updateUser(updated);
      onClose();
    } catch {
      updateUser({ ...user, currentBrowsingLocation: loc });
      onClose();
    }
  };

  // 4. Verify & Save Manual Coordinates
  const handleVerifyManualCoords = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Please enter valid latitude (-90 to 90) and longitude (-180 to 180) values.');
      return;
    }

    setIsVerifyingCoords(true);
    setError(null);
    try {
      const rev = await reverseGeocodeCoordinates(lat, lng, 10);
      setCoordVerifiedAddress(rev.formattedAddress);

      const newLoc = {
        label: rev.label,
        lat,
        lng,
      };

      if (user) {
        try {
          const updated = await api.updateConsumerLocation(user.id, {
            currentBrowsingLocation: newLoc,
          });
          updateUser(updated);
        } catch {
          updateUser({ ...user, currentBrowsingLocation: newLoc });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Could not verify coordinates.');
    } finally {
      setIsVerifyingCoords(false);
    }
  };

  // 5. Autofill delivery from GPS
  const handleAutofillDeliveryFromGPS = async () => {
    setIsDetecting(true);
    setError(null);
    setDetectStatus('Sampling satellite GPS for high-accuracy address...');
    try {
      const accurateLoc = await getAccurateLocationWithAddress({
        targetAccuracy: 20,
        maxWaitMs: 6500,
        fallbackToIp: true,
      });
      setDeliveryStreet(accurateLoc.formattedAddress);
      if (accurateLoc.city) setDeliveryCity(accurateLoc.city);
      if (accurateLoc.pincode) setDeliveryPincode(accurateLoc.pincode);
      setLastDetected(accurateLoc);
    } catch (err: any) {
      setError(err.message || 'Could not acquire GPS address.');
    } finally {
      setIsDetecting(false);
      setDetectStatus('');
    }
  };

  // 6. Save delivery address form
  const handleSaveDeliveryAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const newAddress = {
      id: `addr_${Date.now()}`,
      label: 'Home Delivery',
      street: deliveryStreet,
      city: deliveryCity,
      state: 'Maharashtra',
      pincode: deliveryPincode,
      lat: lastDetected?.lat || user.currentBrowsingLocation?.lat || 18.559,
      lng: lastDetected?.lng || user.currentBrowsingLocation?.lng || 73.7868,
      isDefault: true,
    };

    try {
      const updated = await api.updateConsumerLocation(user.id, {
        deliveryAddresses: [newAddress, ...(user.deliveryAddresses || [])],
      });
      updateUser(updated);
      onClose();
    } catch {
      updateUser({
        ...user,
        deliveryAddresses: [newAddress, ...(user.deliveryAddresses || [])],
      });
      onClose();
    }
  };

  const accuracyBadge = lastDetected ? formatAccuracyBadge(lastDetected.accuracy) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#5D7A4F] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-serif">High-Accuracy GPS & Location</h3>
              <p className="text-[11px] text-[#EBF1E8]">
                Precise farm distance calculation & harvest delivery routing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-[#E5E0D5] bg-[#F1EDE4] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('browsing')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'browsing'
                ? 'border-[#5D7A4F] text-[#2D3A26] bg-[#FAF8F5]'
                : 'border-transparent text-[#5D6D56] hover:text-[#2D3A26]'
            }`}
          >
            📍 GPS & Search
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'delivery'
                ? 'border-[#5D7A4F] text-[#2D3A26] bg-[#FAF8F5]'
                : 'border-transparent text-[#5D6D56] hover:text-[#2D3A26]'
            }`}
          >
            🏠 Delivery Address
          </button>
          <button
            onClick={() => setActiveTab('custom_coord')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'custom_coord'
                ? 'border-[#5D7A4F] text-[#2D3A26] bg-[#FAF8F5]'
                : 'border-transparent text-[#5D6D56] hover:text-[#2D3A26]'
            }`}
          >
            🧭 Custom Lat/Lng
          </button>
        </div>

        <div className="p-4 max-h-[75vh] overflow-y-auto text-[#2D3A26]">
          {error && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
              </div>
            </div>
          )}

          {activeTab === 'browsing' && (
            <div className="space-y-4">
              {/* High Accuracy Multi-Sample GPS Lock Button */}
              <div className="space-y-2">
                <button
                  id="detect-gps-location-btn"
                  type="button"
                  onClick={handleRequestGPS}
                  disabled={isDetecting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer disabled:opacity-85"
                >
                  <Compass
                    className={`w-4 h-4 text-white ${isDetecting ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {isDetecting
                      ? detectStatus || 'Locking Multi-Sample Satellite GPS...'
                      : 'Lock My Exact GPS Location (High Accuracy)'}
                  </span>
                </button>

                {isDetecting && liveAccuracy && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-pulse">
                    <span className="flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-emerald-600 animate-ping" />
                      Satellite signal converging...
                    </span>
                    <span className="font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                      Current Error: ±{liveAccuracy}m
                    </span>
                  </div>
                )}

                <p className="text-[11px] text-[#5D6D56] text-center">
                  Multi-sample satellite positioning with OpenStreetMap reverse-geocoding for exact road distance.
                </p>
              </div>

              {/* Current Active Location Card */}
              <div className="p-3.5 bg-[#F1EDE4] rounded-2xl border border-[#E5E0D5] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#5D6D56] font-medium">
                    Active Produce & Farm Distance Origin:
                  </span>
                  {user?.currentBrowsingLocation?.lat && (
                    <span className="text-[10px] text-[#5D7A4F] bg-[#EBF1E8] px-2 py-0.5 rounded-md font-mono font-semibold">
                      {user.currentBrowsingLocation.lat.toFixed(4)}, {user.currentBrowsingLocation.lng?.toFixed(4)}
                    </span>
                  )}
                </div>
                <div className="font-bold text-[#2D3A26] flex items-center gap-2 text-sm font-serif">
                  <Navigation className="w-4 h-4 text-[#5D7A4F] shrink-0" />
                  <span>{user?.currentBrowsingLocation?.label || 'Baner, Pune, Maharashtra'}</span>
                </div>

                {lastDetected && accuracyBadge && (
                  <div className="mt-2 pt-2 border-t border-[#E5E0D5] flex items-center justify-between text-[11px]">
                    <span className={`px-2 py-0.5 rounded-md border font-medium ${accuracyBadge.badgeClass}`}>
                      {accuracyBadge.label}
                    </span>
                    <span className="text-[#5D6D56]">Provider: {lastDetected.provider || 'GPS Sensor'}</span>
                  </div>
                )}
              </div>

              {/* Live Place & Village Search Bar */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#2D3A26] block">
                  Search Village, Town, or Market Yard:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8C9886] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Baramati, Narayangaon, Hinjewadi, Dindori..."
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F]/20 focus:border-[#5D7A4F]"
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 text-[#5D7A4F] animate-spin absolute right-3 top-2.5" />
                  )}
                  {searchQuery && !isSearching && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-[#8C9886] hover:text-[#2D3A26]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#E5E0D5] shadow-lg overflow-hidden divide-y divide-[#E5E0D5]/50 max-h-48 overflow-y-auto">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSearchResult(r)}
                        className="w-full p-2.5 text-left hover:bg-[#FAF8F5] transition-colors flex items-start gap-2 text-xs cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#2D3A26]">{r.label}</p>
                          <p className="text-[11px] text-[#5D6D56] line-clamp-1">{r.formattedAddress}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Agricultural & Regional Hubs */}
              <div className="pt-1">
                <span className="text-xs font-semibold text-[#2D3A26] block mb-2">
                  Or select popular agricultural farming belts:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {POPULAR_AGRICULTURAL_REGIONS.map((loc) => {
                    const isCurrent =
                      Math.abs((user?.currentBrowsingLocation?.lat || 0) - loc.lat) < 0.01 &&
                      Math.abs((user?.currentBrowsingLocation?.lng || 0) - loc.lng) < 0.01;
                    return (
                      <button
                        key={loc.label}
                        type="button"
                        onClick={() => handleSelectPreset(loc)}
                        className={`p-2 rounded-xl border text-xs text-left flex items-center justify-between transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#EBF1E8] border-[#5D7A4F] text-[#2D3A26] font-bold shadow-xs'
                            : 'bg-white border-[#E5E0D5] text-[#2D3A26] hover:border-[#8A9A5B] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-[#5D7A4F]" />
                            <span>{loc.label}</span>
                          </div>
                          <span className="text-[10px] text-[#5D6D56] block ml-5">{loc.region}</span>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-[#5D7A4F] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            /* Delivery Address form */
            <form onSubmit={handleSaveDeliveryAddress} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#5D6D56]">
                  Where should the farmers dispatch your freshly harvested boxes?
                </p>
                <button
                  type="button"
                  onClick={handleAutofillDeliveryFromGPS}
                  disabled={isDetecting}
                  className="text-[11px] text-[#5D7A4F] hover:underline font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Compass className={`w-3 h-3 ${isDetecting ? 'animate-spin' : ''}`} />
                  Autofill from GPS
                </button>
              </div>

              {detectStatus && (
                <div className="p-2.5 rounded-xl bg-[#EBF1E8] text-[#5D7A4F] text-xs flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>{detectStatus}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                  House / Flat / Building / Street Address
                </label>
                <input
                  type="text"
                  required
                  value={deliveryStreet}
                  onChange={(e) => setDeliveryStreet(e.target.value)}
                  placeholder="e.g. Flat 402, Sunrise Meadows, Baner-Pashan Rd"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F]/20 focus:border-[#5D7A4F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">City / Taluka</label>
                  <input
                    type="text"
                    required
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    placeholder="e.g. Pune"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F]/20 focus:border-[#5D7A4F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">Postal Pincode</label>
                  <input
                    type="text"
                    required
                    value={deliveryPincode}
                    onChange={(e) => setDeliveryPincode(e.target.value)}
                    placeholder="e.g. 411045"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F]/20 focus:border-[#5D7A4F]"
                  />
                </div>
              </div>

              <button
                id="save-delivery-address-btn"
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
              >
                Save Delivery Address
              </button>
            </form>
          )}

          {activeTab === 'custom_coord' && (
            /* Custom Coordinates Entry */
            <div className="space-y-3 text-xs">
              <p className="text-[#5D6D56]">
                Enter exact GPS decimal coordinates (e.g. from handheld GPS or Google Maps pin) to set your location down to the meter.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#2D3A26] mb-1">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="18.5590"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F]/20 focus:border-[#5D7A4F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2D3A26] mb-1">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="73.7868"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F]/20 focus:border-[#5D7A4F]"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleVerifyManualCoords}
                  disabled={isVerifyingCoords}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-75"
                >
                  {isVerifyingCoords ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Verify & Apply Coordinates
                </button>
              </div>

              {coordVerifiedAddress && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Verified Location:</span>
                    <span className="text-[11px] text-emerald-800">{coordVerifiedAddress}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Go Back */}
        <div className="p-3 bg-[#F1EDE4] border-t border-[#E5E0D5] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#EAE4D7] text-[#2D3A26] border border-[#E5E0D5] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F]" />
            <span>Go Back</span>
          </button>
          <span className="text-[11px] text-[#5D6D56]">
            Active: {user?.currentBrowsingLocation?.label || 'Pune Hub'}
          </span>
        </div>
      </div>
    </div>
  );
};

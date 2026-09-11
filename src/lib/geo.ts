export interface AccurateLocation {
  lat: number;
  lng: number;
  accuracy: number; // in meters (smaller is more accurate)
  label: string;
  formattedAddress: string;
  city: string;
  state: string;
  pincode: string;
  provider?: string;
  timestamp?: number;
  isIpFallback?: boolean;
}

export interface GeocodeSearchResult {
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  pincode: string;
}

export interface GpsAcquisitionProgress {
  accuracy?: number;
  stage: string;
  fixCount: number;
}

export interface GpsOptions {
  targetAccuracy?: number; // Desired accuracy in meters to terminate early (default 15m)
  maxWaitMs?: number; // Max time to wait for best satellite lock (default 7000ms)
  fallbackToIp?: boolean; // If device GPS fails or blocked, fallback to IP location
  onProgress?: (progress: GpsAcquisitionProgress) => void;
}

/**
 * High-accuracy multi-sample progressive GPS acquisition.
 * Instead of taking the first coarse cell-tower fix, this listens to GPS updates
 * for up to a few seconds, converging to the lowest error margin (highest satellite precision).
 */
export async function getAccurateCoordinates(options: GpsOptions = {}): Promise<{
  lat: number;
  lng: number;
  accuracy: number;
  isIpFallback?: boolean;
}> {
  const {
    targetAccuracy = 15, // <= 15m is considered pinpoint satellite lock
    maxWaitMs = 7000,
    fallbackToIp = true,
    onProgress,
  } = options;

  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    if (fallbackToIp) {
      return getFallbackIpCoordinates();
    }
    throw new Error('Geolocation is not supported by your browser or device.');
  }

  onProgress?.({ stage: 'Requesting device GPS permission...', fixCount: 0 });

  return new Promise((resolve, reject) => {
    let watchId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;
    let bestPosition: GeolocationPosition | null = null;
    let fixCount = 0;
    let hasResolved = false;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const finishWithBestOrFallback = async (reason = 'Timeout reached') => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();

      if (bestPosition) {
        onProgress?.({
          accuracy: Math.round(bestPosition.coords.accuracy),
          stage: `GPS locked (±${Math.round(bestPosition.coords.accuracy)}m)`,
          fixCount,
        });
        resolve({
          lat: bestPosition.coords.latitude,
          lng: bestPosition.coords.longitude,
          accuracy: Math.round(bestPosition.coords.accuracy || 10),
        });
        return;
      }

      // No fixes acquired during watch window, attempt single getCurrentPosition
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 25),
            });
          },
          async (err) => {
            if (fallbackToIp) {
              try {
                const ipCoords = await getFallbackIpCoordinates();
                resolve(ipCoords);
              } catch {
                reject(new Error(getDescriptiveGpsError(err)));
              }
            } else {
              reject(new Error(getDescriptiveGpsError(err)));
            }
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } catch (err: any) {
        if (fallbackToIp) {
          getFallbackIpCoordinates().then(resolve).catch(reject);
        } else {
          reject(new Error(err.message || 'GPS acquisition failed'));
        }
      }
    };

    // Watch position to receive progressive satellite convergence
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          fixCount++;
          const currentAccuracy = pos.coords.accuracy || 100;

          if (!bestPosition || currentAccuracy < (bestPosition.coords.accuracy || Infinity)) {
            bestPosition = pos;
          }

          onProgress?.({
            accuracy: Math.round(currentAccuracy),
            stage:
              currentAccuracy <= targetAccuracy
                ? `High precision lock achieved (±${Math.round(currentAccuracy)}m)!`
                : `Acquiring satellites... (Accuracy: ±${Math.round(currentAccuracy)}m)`,
            fixCount,
          });

          // If we achieved pinpoint satellite lock (<= targetAccuracy meters), resolve immediately!
          if (currentAccuracy <= targetAccuracy) {
            if (hasResolved) return;
            hasResolved = true;
            cleanup();
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(currentAccuracy),
            });
          }
        },
        async (error) => {
          // If explicitly denied by user
          if (error.code === error.PERMISSION_DENIED) {
            if (hasResolved) return;
            hasResolved = true;
            cleanup();

            if (fallbackToIp) {
              try {
                const ipCoords = await getFallbackIpCoordinates();
                resolve(ipCoords);
                return;
              } catch {
                // fall through to reject
              }
            }

            reject(
              new Error(
                'Location access was blocked. Please tap the lock/tune icon in your browser URL bar to allow location permissions, or choose an agricultural region preset.'
              )
            );
            return;
          }

          // If position unavailable or timeout, let timer finish with best candidate or single shot
          console.warn('GPS watch warning:', error.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: maxWaitMs + 2000,
        }
      );

      // Set timeout to return best fix acquired
      timerId = setTimeout(() => {
        finishWithBestOrFallback('Sampling window finished');
      }, maxWaitMs);
    } catch (e: any) {
      finishWithBestOrFallback(e.message);
    }
  });
}

function getDescriptiveGpsError(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) {
    return 'Location permission was denied. Please allow location permissions in your browser or select your region below.';
  }
  if (err.code === err.POSITION_UNAVAILABLE) {
    return 'GPS satellite signal is currently unavailable. Please verify device GPS is toggled ON.';
  }
  if (err.code === err.TIMEOUT) {
    return 'GPS satellite lock timed out. Try again or search your farm/city address.';
  }
  return 'Could not acquire precise location.';
}

/**
 * Fallback to IP-based approximate location when hardware GPS is disabled or permission denied.
 */
export async function getFallbackIpCoordinates(): Promise<{
  lat: number;
  lng: number;
  accuracy: number;
  isIpFallback: boolean;
}> {
  try {
    const res = await fetch('/api/ip-location');
    if (res.ok) {
      const data = await res.json();
      return {
        lat: Number(data.lat || 18.5204),
        lng: Number(data.lng || 73.8567),
        accuracy: 2500, // IP accuracy is regional
        isIpFallback: true,
      };
    }
  } catch (err) {
    console.warn('IP fallback failed:', err);
  }

  // Default Pune regional coordinates
  return {
    lat: 18.5204,
    lng: 73.8567,
    accuracy: 3000,
    isIpFallback: true,
  };
}

/**
 * Reverse geocodes coordinates into an accurate human-readable label and street address.
 * Uses multi-provider (Nominatim + Photon) server-side caching.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
  accuracy = 15,
  isIpFallback = false
): Promise<AccurateLocation> {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    if (res.ok) {
      const data = await res.json();
      return {
        lat: Number(data.lat || lat),
        lng: Number(data.lng || lng),
        accuracy,
        label: data.label || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        formattedAddress: data.formattedAddress || `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city: data.city || 'Local Region',
        state: data.state || 'Maharashtra',
        pincode: data.pincode || '',
        provider: data.provider || 'OSM',
        isIpFallback,
        timestamp: Date.now(),
      };
    }
  } catch (err) {
    console.warn('Reverse geocoding network error:', err);
  }

  return {
    lat,
    lng,
    accuracy,
    label: `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    formattedAddress: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    isIpFallback,
    timestamp: Date.now(),
  };
}

/**
 * Forward geocode / search any village, town, market yard, or address.
 */
export async function searchAddressOrLandmark(query: string): Promise<GeocodeSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
    if (res.ok) {
      const data = await res.json();
      return data.results || [];
    }
  } catch (err) {
    console.warn('Search geocode error:', err);
  }
  return [];
}

/**
 * Convenience helper to request permission, get high-accuracy coordinates, and reverse-geocode.
 */
export async function getAccurateLocationWithAddress(
  options: GpsOptions = {}
): Promise<AccurateLocation> {
  const coords = await getAccurateCoordinates(options);
  return reverseGeocodeCoordinates(coords.lat, coords.lng, coords.accuracy, coords.isIpFallback);
}

/**
 * Formats an accuracy number into a readable status badge.
 */
export function formatAccuracyBadge(accuracyMeters: number): {
  label: string;
  badgeClass: string;
  iconType: 'pinpoint' | 'good' | 'approx';
} {
  if (accuracyMeters <= 20) {
    return {
      label: `±${accuracyMeters}m (High Precision Satellite Lock)`,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconType: 'pinpoint',
    };
  }
  if (accuracyMeters <= 80) {
    return {
      label: `±${accuracyMeters}m (Good GPS Accuracy)`,
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      iconType: 'good',
    };
  }
  return {
    label: `±${accuracyMeters}m (Cellular / Approximate)`,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconType: 'approx',
  };
}

/**
 * Accurately calculates distance between two points using the Haversine formula.
 */
export function calculateAccurateDistanceKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number {
  if (
    lat1 === undefined ||
    lat1 === null ||
    lon1 === undefined ||
    lon1 === null ||
    lat2 === undefined ||
    lat2 === null ||
    lon2 === undefined ||
    lon2 === null ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 5.0; // safe default distance
  }

  // Exact point equality
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  // Format: 2 decimal places if under 1 km, 1 decimal place otherwise
  if (d < 1) {
    return Math.round(d * 100) / 100;
  }
  return Math.round(d * 10) / 10;
}

/**
 * Calculates compass bearing from point A to point B in degrees & 8-point compass.
 */
export function calculateCompassBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { degrees: number; compassDirection: string } {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;

  const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  const index = Math.round(brng / 45) % 8;
  return {
    degrees: Math.round(brng),
    compassDirection: directions[index],
  };
}

import { useState, useEffect } from 'react';

const POPULAR_DESTINATIONS = [
  { name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Goa, India', lat: 15.2993, lng: 74.1240 },
  { name: 'Delhi, India', lat: 28.6139, lng: 77.2090 },
  { name: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Jaipur, Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Manali, Himachal Pradesh', lat: 32.2432, lng: 77.1892 },
  { name: 'Shimla, Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
  { name: 'Rishikesh, Uttarakhand', lat: 30.0869, lng: 78.2676 },
  { name: 'Kerala, India', lat: 10.8505, lng: 76.2711 },
];

const GoogleMapPickerModal = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialLocation = '',
  initialLatitude = null,
  initialLongitude = null,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [mapZoom, setMapZoom] = useState(14);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (isOpen) {
      setSelectedLocation(initialLocation || '');
      setSearchQuery(initialLocation || '');
      setLatitude(initialLatitude != null ? String(initialLatitude) : '');
      setLongitude(initialLongitude != null ? String(initialLongitude) : '');
      setGeoError('');
    }
  }, [isOpen, initialLocation, initialLatitude, initialLongitude]);

  if (!isOpen) return null;

  const [searching, setSearching] = useState(false);

  const isGenericCentroid = (lat, lng, accuracy) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return false;
    // Check if coordinates point to India's geographic centroid (Hirdi, Maharashtra ~20.5937, ~78.9629)
    // which desktop browsers return as country-level dummy fallback
    const isNearHirdi =
      Math.abs(latNum - 20.5938) < 0.35 &&
      Math.abs(lngNum - 78.9629) < 0.35;
    const isLowAccuracy = accuracy && accuracy > 10000;
    return isNearHirdi || isLowAccuracy;
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    setGeoError('');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = Number(first.lat).toFixed(6);
          const lng = Number(first.lon).toFixed(6);
          setLatitude(lat);
          setLongitude(lng);
          setSelectedLocation(first.display_name || q);
          setSearchQuery(first.display_name || q);
          setSearching(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Geocode search error:', err);
    }

    // Fallback: set location by text query and clear lat/lng so Google Map uses text search directly
    setSelectedLocation(q);
    setLatitude('');
    setLongitude('');
    setSearching(false);
  };

  const handleSelectPopular = (dest) => {
    setSelectedLocation(dest.name);
    setSearchQuery(dest.name);
    setLatitude(String(dest.lat));
    setLongitude(String(dest.lng));
    setGeoError('');
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.suburb ||
          data.address?.county ||
          '';
        const state = data.address?.state || '';
        const country = data.address?.country || '';
        const parts = [city, state, country].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
        if (data.display_name) {
          return data.display_name.split(',').slice(0, 3).join(', ');
        }
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    }
    return `Location (${lat}, ${lng})`;
  };

  const fetchIpLocation = async () => {
    try {
      // 1. Primary: ipwho.is
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.latitude && data.longitude) {
          const lat = Number(data.latitude).toFixed(6);
          const lng = Number(data.longitude).toFixed(6);
          if (!isGenericCentroid(lat, lng, 0)) {
            const placeName =
              [data.city, data.region, data.country].filter(Boolean).join(', ') ||
              `Location (${lat}, ${lng})`;
            setLatitude(lat);
            setLongitude(lng);
            setSelectedLocation(placeName);
            setSearchQuery(placeName);
            setGeoError('');
            setLocating(false);
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('ipwho.is error:', e);
    }

    try {
      // 2. Secondary: ipinfo.io
      const res2 = await fetch('https://ipinfo.io/json');
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.loc) {
          const [ipLat, ipLng] = data2.loc.split(',');
          if (ipLat && ipLng && !isGenericCentroid(ipLat, ipLng, 0)) {
            const lat = Number(ipLat).toFixed(6);
            const lng = Number(ipLng).toFixed(6);
            const placeName =
              [data2.city, data2.region, data2.country].filter(Boolean).join(', ') ||
              `Location (${lat}, ${lng})`;
            setLatitude(lat);
            setLongitude(lng);
            setSelectedLocation(placeName);
            setSearchQuery(placeName);
            setGeoError('');
            setLocating(false);
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('ipinfo fallback error:', e);
    }

    try {
      // 3. Tertiary: ipapi.co
      const res3 = await fetch('https://ipapi.co/json/');
      if (res3.ok) {
        const data3 = await res3.json();
        if (data3.latitude && data3.longitude && !isGenericCentroid(data3.latitude, data3.longitude, 0)) {
          const lat = Number(data3.latitude).toFixed(6);
          const lng = Number(data3.longitude).toFixed(6);
          const placeName =
            [data3.city, data3.region, data3.country_name].filter(Boolean).join(', ') ||
            `Location (${lat}, ${lng})`;
          setLatitude(lat);
          setLongitude(lng);
          setSelectedLocation(placeName);
          setSearchQuery(placeName);
          setGeoError('');
          setLocating(false);
          return true;
        }
      }
    } catch (e) {
      console.warn('ipapi fallback error:', e);
    }

    setGeoError('Unable to detect location. Please type your city/address above.');
    setLocating(false);
    return false;
  };

  const handleUseCurrentLocation = () => {
    setLocating(true);
    setGeoError('');

    if (!navigator.geolocation) {
      fetchIpLocation();
      return;
    }

    let resolved = false;

    // Safety fallback timer if device GPS driver hangs without responding
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        fetchIpLocation();
      }
    }, 4000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;

        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        // If browser returns country center centroid (e.g. Hirdi) or low accuracy (>10km), use IP location
        if (isGenericCentroid(rawLat, rawLng, accuracy)) {
          console.warn('Browser returned country centroid or low accuracy, using IP fallback');
          clearTimeout(fallbackTimer);
          resolved = true;
          await fetchIpLocation();
          return;
        }

        resolved = true;
        clearTimeout(fallbackTimer);

        const lat = rawLat.toFixed(6);
        const lng = rawLng.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);

        const placeName = await reverseGeocode(lat, lng);
        setSelectedLocation(placeName);
        setSearchQuery(placeName);
        setLocating(false);
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        console.warn('Device GPS unavailable, falling back to IP geolocation:', err?.message);
        fetchIpLocation();
      },
      { timeout: 3500, enableHighAccuracy: false, maximumAge: 300000 }
    );
  };

  const handleConfirm = () => {
    const latNum = latitude ? parseFloat(latitude) : null;
    const lngNum = longitude ? parseFloat(longitude) : null;
    onSelectLocation({
      location: selectedLocation || searchQuery || 'India',
      latitude: latNum,
      longitude: lngNum,
    });
    onClose();
  };

  // Build target query for map view
  const mapQuery =
    latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))
      ? `${latitude},${longitude}`
      : selectedLocation || 'India';

  const embedUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(mapQuery)}&zoom=${mapZoom}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=${mapZoom}&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#A67C52] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <h2 className="text-lg font-bold">Choose Home Location on Google Maps</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Search bar & GPS button */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, address, or landmark (e.g. Bandra, Mumbai)"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A67C52] focus:border-[#A67C52]"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2.5 bg-[#A67C52] hover:bg-[#8B6F47] disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0"
              title="Search and pinpoint address"
            >
              {searching ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Searching...</span>
                </>
              ) : (
                'Search'
              )}
            </button>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition flex items-center gap-1 shrink-0"
              title="Auto-detect current location"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span>{locating ? 'Locating...' : 'GPS'}</span>
            </button>
          </form>

          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <span>📍</span>
            <span>You can search your exact colony, landmark, or street name above to pin your exact house.</span>
          </p>

          {geoError && (
            <p className="text-xs text-rose-600 font-medium">{geoError}</p>
          )}

          {/* Quick Popular Suggestions */}
          <div>
            <span className="text-xs text-gray-500 font-medium block mb-1.5">Quick Suggestions:</span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_DESTINATIONS.map((dest) => (
                <button
                  key={dest.name}
                  type="button"
                  onClick={() => handleSelectPopular(dest)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-medium ${
                    selectedLocation === dest.name
                      ? 'bg-[#A67C52] text-white border-[#A67C52]'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {dest.name}
                </button>
              ))}
            </div>
          </div>

          {/* Google Map View */}
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-inner h-64 bg-slate-100 relative">
            <iframe
              title="Google Map Location Preview"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={embedUrl}
              className="w-full h-full"
            ></iframe>
          </div>

          {/* Coordinates Details Row */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-gray-500 block">Selected Destination:</span>
              <span className="font-bold text-gray-800 text-sm">{selectedLocation || searchQuery || 'Not selected'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <label className="text-[10px] text-gray-500 block">Latitude</label>
                <input
                  type="text"
                  placeholder="e.g. 19.0760"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-24 px-2 py-1 text-xs border rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block">Longitude</label>
                <input
                  type="text"
                  placeholder="e.g. 72.8777"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-24 px-2 py-1 text-xs border rounded bg-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 bg-[#A67C52] hover:bg-[#8B6F47] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
            <span>Confirm Location</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapPickerModal;

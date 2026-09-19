import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const POPULAR_DESTINATIONS = [
  { name: 'Bijnor, Uttar Pradesh', lat: 29.3695, lng: 78.1371 },
  { name: 'Meerut, Uttar Pradesh', lat: 28.9845, lng: 77.7064 },
  { name: 'Delhi, India', lat: 28.6139, lng: 77.2090 },
  { name: 'Agra, Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
  { name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Goa, India', lat: 15.2993, lng: 74.1240 },
  { name: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Jaipur, Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Manali, Himachal Pradesh', lat: 32.2432, lng: 77.1892 },
  { name: 'Rishikesh, Uttarakhand', lat: 30.0869, lng: 78.2676 },
];

// Multi-attempt Nominatim search with India country bias
const searchNominatim = async (query) => {
  const attempts = [
    `${query}, India`,
    query,
    `${query}, Uttar Pradesh, India`,
  ];
  for (const q of attempts) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=in`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'HavenTo/1.0' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) return results[0];
      }
    } catch (e) {
      console.warn('Nominatim search error:', e);
    }
  }
  return null;
};

const TILE_LAYERS = {
  googleRoad: {
    name: 'Google Map',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  googleSat: {
    name: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Satellite',
    maxZoom: 20,
  },
  osm: {
    name: 'Street Map',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

const GoogleMapPickerModal = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialLocation = '',
  initialLatitude = null,
  initialLongitude = null,
}) => {
  // All hooks MUST be declared unconditionally at the top
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [mapLayerType, setMapLayerType] = useState('googleRoad');
  const [statusMsg, setStatusMsg] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Reverse geocoding: zoom=18 gives building-level precision from Nominatim.
  // Builds label from most granular field available (road → hamlet → village → town → city).
  const reverseGeocode = async (lat, lng) => {
    try {
      // zoom=18 = building level, zoom=16 = street, zoom=10 = city
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'HavenTo/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};

        // Build from most specific → least specific
        const street     = addr.road || addr.pedestrian || addr.footway || '';
        const micro      = addr.neighbourhood || addr.hamlet || addr.isolated_dwelling || '';
        const village    = addr.village || addr.suburb || addr.quarter || '';
        const town       = addr.town || addr.city_district || '';
        const city       = addr.city || addr.municipality || '';
        const district   = addr.state_district || addr.county || '';
        const state      = addr.state || '';

        // Prefer: "hamlet, village/town, district, state"
        // If no village-level data, fall back gracefully
        const localPart  = micro || village || street || '';
        const cityPart   = town || city || '';
        const parts      = [localPart, cityPart || district, state].filter(Boolean);

        if (parts.length > 0) return parts.join(', ');
        if (data.display_name) return data.display_name.split(',').slice(0, 4).join(', ').trim();
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    }
    // Always fall back to showing coordinates so user knows location was captured
    return `Near ${Number(lat).toFixed(4)}°N, ${Number(lng).toFixed(4)}°E`;
  };

  // Helper to move marker and fly to coordinates
  const updateMapPosition = (lat, lng, zoomLevel = 15) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!isNaN(latNum) && !isNaN(lngNum) && mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latNum, lngNum]);
      mapInstanceRef.current.flyTo([latNum, lngNum], zoomLevel, { duration: 1.2 });
    }
  };

  // Only reject the exact India geographic centroid OR truly terrible accuracy (>50 km).
  // Do NOT block valid UP / North India coordinates which are far from the centroid.
  const isGenericCentroid = (lat, lng, accuracy) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return false;
    const isExactIndiaCentroid =
      Math.abs(latNum - 20.5938) < 0.10 &&
      Math.abs(lngNum - 78.9629) < 0.10;
    // Only reject if it's the exact centroid OR accuracy is worse than 50 km
    return isExactIndiaCentroid || (accuracy && accuracy > 50000);
  };
  // Multi-tier IP location fallback with reverse-geocoded label
  const fetchIpLocation = async (reason = '') => {
    if (reason) setStatusMsg(`📡 ${reason}…`);

    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.latitude && data.longitude) {
          const lat = Number(data.latitude).toFixed(6);
          const lng = Number(data.longitude).toFixed(6);
          if (!isGenericCentroid(lat, lng, 0)) {
            const betterName = await reverseGeocode(lat, lng);
            const placeName =
              betterName ||
              [data.city, data.region, data.country].filter(Boolean).join(', ') ||
              `Location (${lat}, ${lng})`;
            setLatitude(lat);
            setLongitude(lng);
            setSelectedLocation(placeName);
            setSearchQuery(placeName);
            setGeoError('');
            setLocating(false);
            setStatusMsg('');
            updateMapPosition(lat, lng, 13);
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('ipwho.is error:', e);
    }

    try {
      const res2 = await fetch('https://ipinfo.io/json');
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.loc) {
          const [ipLat, ipLng] = data2.loc.split(',');
          if (ipLat && ipLng && !isGenericCentroid(ipLat, ipLng, 0)) {
            const lat = Number(ipLat).toFixed(6);
            const lng = Number(ipLng).toFixed(6);
            const betterName = await reverseGeocode(lat, lng);
            const placeName =
              betterName ||
              [data2.city, data2.region, data2.country].filter(Boolean).join(', ') ||
              `Location (${lat}, ${lng})`;
            setLatitude(lat);
            setLongitude(lng);
            setSelectedLocation(placeName);
            setSearchQuery(placeName);
            setGeoError('');
            setLocating(false);
            setStatusMsg('');
            updateMapPosition(lat, lng, 13);
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('ipinfo fallback error:', e);
    }

    setGeoError('Could not detect your location. Type your address in the search box or click on the map.');
    setLocating(false);
    setStatusMsg('');
    return false;
  };

  // GPS button: try hardware GPS first, fall back to IP after 12s
  const handleUseCurrentLocation = () => {
    setLocating(true);
    setGeoError('');
    setStatusMsg('🛰 Getting your GPS location…');

    if (!navigator.geolocation) {
      fetchIpLocation('GPS not available, using network location');
      return;
    }

    let resolved = false;
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('GPS timed out → IP fallback');
        fetchIpLocation('GPS timed out, using network location');
      }
    }, 12000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy; // metres

        console.log(`GPS: lat=${rawLat}, lng=${rawLng}, accuracy=${accuracy}m`);

        if (isGenericCentroid(rawLat, rawLng, accuracy)) {
          clearTimeout(fallbackTimer);
          resolved = true;
          await fetchIpLocation('GPS gave inaccurate result, using network location');
          return;
        }

        resolved = true;
        clearTimeout(fallbackTimer);

        const lat = rawLat.toFixed(6);
        const lng = rawLng.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setStatusMsg('📍 Pinpointing your area…');

        const placeName = await reverseGeocode(lat, lng);
        setSelectedLocation(placeName);
        setSearchQuery(placeName);
        setLocating(false);
        setStatusMsg('');
        // Zoom: <200m accuracy → zoom 17, <5km → zoom 15, else zoom 13
        const zoom = accuracy < 200 ? 17 : accuracy < 5000 ? 15 : 13;
        updateMapPosition(lat, lng, zoom);
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        console.warn('GPS error:', err.message);
        fetchIpLocation('GPS denied, using network location');
      },
      { timeout: 11000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // Address search with multi-attempt and India bias
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    setGeoError('');

    const result = await searchNominatim(q);

    if (result) {
      const lat = Number(result.lat).toFixed(6);
      const lng = Number(result.lon).toFixed(6);
      const betterName = await reverseGeocode(lat, lng);
      setLatitude(lat);
      setLongitude(lng);
      setSelectedLocation(betterName || result.display_name || q);
      setSearchQuery(betterName || result.display_name || q);
      setSearching(false);
      updateMapPosition(lat, lng, 15);
    } else {
      setGeoError(`"${q}" was not found. Try a nearby city (e.g. "Bijnor") or click on the map to pin manually.`);
      setSelectedLocation(q);
      setSearching(false);
    }
  };

  // Handle popular destination chip click
  const handleSelectPopular = (dest) => {
    const lat = String(dest.lat);
    const lng = String(dest.lng);
    setSelectedLocation(dest.name);
    setSearchQuery(dest.name);
    setLatitude(lat);
    setLongitude(lng);
    setGeoError('');
    updateMapPosition(lat, lng, 14);
  };

  // Switch map layer (Google Road, Satellite, OpenStreetMap)
  const handleSwitchLayer = (type) => {
    setMapLayerType(type);
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newLayer = TILE_LAYERS[type] || TILE_LAYERS.googleRoad;
      tileLayerRef.current = L.tileLayer(newLayer.url, {
        attribution: newLayer.attribution,
        maxZoom: newLayer.maxZoom,
      }).addTo(mapInstanceRef.current);
    }
  };

  // Handle coordinates manual input change
  const handleManualCoordChange = (newLat, newLng) => {
    setLatitude(newLat);
    setLongitude(newLng);
    const latNum = parseFloat(newLat);
    const lngNum = parseFloat(newLng);
    if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
      updateMapPosition(latNum, lngNum, 15);
    }
  };

  // Map Initialization Effect
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
      return;
    }

    setSelectedLocation(initialLocation || '');
    setSearchQuery(initialLocation || '');

    const initLat = initialLatitude && !isNaN(Number(initialLatitude)) ? Number(initialLatitude) : 27.1833;
    const initLng = initialLongitude && !isNaN(Number(initialLongitude)) ? Number(initialLongitude) : 78.0167;

    setLatitude(initialLatitude != null ? String(initialLatitude) : String(initLat));
    setLongitude(initialLongitude != null ? String(initialLongitude) : String(initLng));
    setGeoError('');

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initLat, initLng],
          zoom: 14,
          zoomControl: true,
        });

        const activeLayer = TILE_LAYERS[mapLayerType] || TILE_LAYERS.googleRoad;
        tileLayerRef.current = L.tileLayer(activeLayer.url, {
          attribution: activeLayer.attribution,
          maxZoom: activeLayer.maxZoom,
        }).addTo(map);

        const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
        marker.bindPopup('<b>📍 Home Location</b><br/>Drag or click map to move pin').openPopup();

        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          const lat = pos.lat.toFixed(6);
          const lng = pos.lng.toFixed(6);
          setLatitude(lat);
          setLongitude(lng);
          const name = await reverseGeocode(lat, lng);
          setSelectedLocation(name);
          setSearchQuery(name);
        });

        map.on('click', async (e) => {
          const lat = e.latlng.lat.toFixed(6);
          const lng = e.latlng.lng.toFixed(6);
          marker.setLatLng([lat, lng]);
          setLatitude(lat);
          setLongitude(lng);
          const name = await reverseGeocode(lat, lng);
          setSelectedLocation(name);
          setSearchQuery(name);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
      }
    }, 180);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

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

  // Safe early return AFTER all hooks
  if (!isOpen) return null;

  const externalGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    latitude && longitude ? `${latitude},${longitude}` : selectedLocation || 'India'
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#A67C52] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <h2 className="text-base sm:text-lg font-bold">Choose Home Location on Map</h2>
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
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
                placeholder="Search colony, street, landmark, or city (e.g. Civil Lines, Agra)"
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A67C52] focus:border-[#A67C52]"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-3.5 py-2.5 bg-[#A67C52] hover:bg-[#8B6F47] disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
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
              className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition flex items-center gap-1 shrink-0 cursor-pointer"
              title="Auto-detect current location (GPS / Network)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span>{locating ? 'Locating...' : 'GPS'}</span>
            </button>
          </form>

          {statusMsg && (
            <p className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5">
              <span>{statusMsg}</span>
            </p>
          )}

          {geoError && (
            <p className="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
              ⚠️ {geoError}
            </p>
          )}

          <p className="text-[10px] text-gray-400 leading-relaxed">
            💡 <strong>Tip:</strong> On desktop/laptop, GPS uses your internet connection and may show a nearby city instead of your exact house.
            For precise location, <strong>type your village/colony name</strong> in the search box, then <strong>drag the 📍 pin</strong> to your exact house.
          </p>

          {/* Quick Suggestions & Layer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-gray-500 font-medium">Quick:</span>
              {POPULAR_DESTINATIONS.slice(0, 6).map((dest) => (
                <button
                  key={dest.name}
                  type="button"
                  onClick={() => handleSelectPopular(dest)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition font-medium cursor-pointer ${
                    selectedLocation === dest.name
                      ? 'bg-[#A67C52] text-white border-[#A67C52]'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {dest.name.split(',')[0]}
                </button>
              ))}
            </div>

            {/* Map Style Switcher */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => handleSwitchLayer('googleRoad')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  mapLayerType === 'googleRoad' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLayer('googleSat')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  mapLayerType === 'googleSat' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLayer('osm')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  mapLayerType === 'osm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                OSM
              </button>
            </div>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-inner h-64 sm:h-72 bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Hint overlay on top-left of map */}
            <div className="absolute top-2.5 left-12 z-20 pointer-events-none bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs border border-gray-200 text-[11px] text-gray-700 flex items-center gap-1.5 font-medium">
              <span>📍</span>
              <span>Click or drag pin to your exact house</span>
            </div>

            {/* Direct Open in Google Maps Link */}
            <a
              href={externalGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2.5 right-2.5 z-20 bg-white/90 hover:bg-white text-gray-800 text-[10px] font-bold px-2 py-1 rounded shadow-xs border border-gray-200 transition flex items-center gap-1"
              title="Open coordinates directly in Google Maps"
            >
              <span>Open in Google Maps</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>

          {/* Coordinates Details Row */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-[280px]">
              <span className="text-[11px] text-gray-500 block">Selected Destination:</span>
              <span className="font-bold text-gray-800 text-xs sm:text-sm line-clamp-1">
                {selectedLocation || searchQuery || 'Not selected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <label className="text-[10px] text-gray-500 block">Latitude</label>
                <input
                  type="text"
                  placeholder="e.g. 27.1833"
                  value={latitude}
                  onChange={(e) => handleManualCoordChange(e.target.value, longitude)}
                  className="w-24 px-2 py-1 text-xs border rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block">Longitude</label>
                <input
                  type="text"
                  placeholder="e.g. 78.0167"
                  value={longitude}
                  onChange={(e) => handleManualCoordChange(latitude, e.target.value)}
                  className="w-24 px-2 py-1 text-xs border rounded bg-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 bg-[#A67C52] hover:bg-[#8B6F47] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
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

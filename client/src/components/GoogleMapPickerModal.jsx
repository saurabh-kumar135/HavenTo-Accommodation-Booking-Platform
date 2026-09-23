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
  { name: 'Taharpur, Bijnor', lat: 29.4140, lng: 78.1630 },
  { name: 'Kiratpur, Bijnor', lat: 29.5080, lng: 78.2040 },
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

const TILE_LAYERS = {
  googleSat: {
    name: 'Satellite',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Satellite',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
  },
  googleRoad: {
    name: 'Map',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
  },
  osm: {
    name: 'Street Map',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  },
};

// Search Nominatim with multiple queries
const searchNominatim = async (query) => {
  const attempts = [
    query + ', India',
    query,
    query + ', Uttar Pradesh, India',
  ];
  for (let i = 0; i < attempts.length; i++) {
    const q = attempts[i];
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/search?format=json&q=' +
          encodeURIComponent(q) +
          '&limit=5&countrycodes=in',
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
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [mapLayerType, setMapLayerType] = useState(() => {
    try {
      return localStorage.getItem('havento_map_layer') || 'googleSat';
    } catch {
      return 'googleSat';
    }
  });
  const [statusMsg, setStatusMsg] = useState('');
  // Option toggle: 'places' (human readable place view) or 'coords' (lat/lng view)
  const [locationViewMode, setLocationViewMode] = useState('places');
  const [placeDetails, setPlaceDetails] = useState({
    placeName: '',
    locality: '',
    city: '',
    state: '',
    postcode: '',
    country: 'India',
    formattedAddress: '',
  });

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const watchIdRef = useRef(null);

  // Clean up any active geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Multi-tier reverse geocoding to resolve exact places
  const resolvePlaceDetails = async (lat, lng) => {
    let resolved = {
      placeName: '',
      locality: '',
      city: '',
      state: '',
      postcode: '',
      country: 'India',
      formattedAddress: '',
    };

    // 1. Try Nominatim zoom 18 for building/street-level place details
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=' +
          lat +
          '&lon=' +
          lng +
          '&zoom=18&addressdetails=1',
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'HavenTo/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};

        const street = addr.road || addr.pedestrian || addr.footway || '';
        const landmark = addr.amenity || addr.building || addr.house_name || addr.shop || '';
        const micro = addr.neighbourhood || addr.hamlet || addr.isolated_dwelling || '';
        const village = addr.village || addr.suburb || addr.quarter || '';
        const town = addr.town || addr.city_district || '';
        const city = addr.city || addr.municipality || '';
        const district = addr.state_district || addr.county || '';
        const state = addr.state || '';
        const postcode = addr.postcode || '';

        const localPart = landmark || street || micro || village;
        const areaPart = village || town || city || district;
        const parts = [localPart, areaPart, state].filter(Boolean);

        resolved = {
          placeName: landmark || street || micro || village || 'Local Area',
          locality: micro || village || street || '',
          city: town || city || district || '',
          state: state || '',
          postcode: postcode || '',
          country: addr.country || 'India',
          formattedAddress:
            parts.length > 0
              ? parts.join(', ')
              : data.display_name
              ? data.display_name.split(',').slice(0, 4).join(', ').trim()
              : '',
        };
      }
    } catch (e) {
      console.warn('Nominatim reverse error:', e);
    }

    // 2. Fallback or enrich with BigDataCloud reverse geocode API if missing city/locality
    if (!resolved.locality || !resolved.city || !resolved.formattedAddress) {
      try {
        const res2 = await fetch(
          'https://api-bdc.io/data/reverse-geocode-client?latitude=' +
            lat +
            '&longitude=' +
            lng +
            '&localityLanguage=en'
        );
        if (res2.ok) {
          const bdc = await res2.json();
          const bdcLocality = bdc.locality || '';
          const bdcCity = bdc.city || '';
          const bdcState = bdc.principalSubdivision || '';
          const bdcCountry = bdc.countryName || 'India';
          const bdcPostcode = bdc.postcode || '';

          const bdcParts = [bdcLocality, bdcCity, bdcState].filter(Boolean);
          const bdcFormatted = bdcParts.join(', ');

          resolved = {
            placeName: resolved.placeName || bdcLocality || bdcCity || 'Nearby Place',
            locality: resolved.locality || bdcLocality,
            city: resolved.city || bdcCity,
            state: resolved.state || bdcState,
            postcode: resolved.postcode || bdcPostcode,
            country: resolved.country || bdcCountry,
            formattedAddress: resolved.formattedAddress || bdcFormatted || 'Location (' + lat + ', ' + lng + ')',
          };
        }
      } catch (e2) {
        console.warn('BigDataCloud reverse error:', e2);
      }
    }

    if (!resolved.formattedAddress) {
      resolved.formattedAddress = 'Location near ' + Number(lat).toFixed(4) + 'N, ' + Number(lng).toFixed(4) + 'E';
    }

    setPlaceDetails(resolved);
    return resolved;
  };

  // Helper to move marker and fly to coordinates
  const updateMapPosition = (lat, lng, zoomLevel = 18) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!isNaN(latNum) && !isNaN(lngNum) && mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latNum, lngNum]);
      mapInstanceRef.current.flyTo([latNum, lngNum], zoomLevel, { duration: 1.0 });
    }
  };

  // Detect generic country centroid (Hirdi/Maharashtra fallback) or coarse accuracy
  const isGenericCentroid = (lat, lng, accuracy) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return false;
    const isNearHirdi =
      Math.abs(latNum - 20.5938) < 0.35 &&
      Math.abs(lngNum - 78.9629) < 0.35;
    const isLowAccuracy = accuracy && accuracy > 10000;
    return isNearHirdi || isLowAccuracy;
  };

  // IP location fallback
  const fetchIpLocation = async (reason = '') => {
    if (reason) setStatusMsg('Connecting: ' + reason + '...');

    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.latitude && data.longitude) {
          const lat = Number(data.latitude).toFixed(6);
          const lng = Number(data.longitude).toFixed(6);
          if (!isGenericCentroid(lat, lng, 0)) {
            const placeInfo = await resolvePlaceDetails(lat, lng);
            const placeName =
              placeInfo.formattedAddress ||
              [data.city, data.region, data.country].filter(Boolean).join(', ') ||
              'Location (' + lat + ', ' + lng + ')';
            setLatitude(lat);
            setLongitude(lng);
            setSelectedLocation(placeName);
            setSearchQuery(placeName);
            setGeoError('');
            setLocating(false);
            setStatusMsg('Estimated network area detected. Tap anywhere on map to pin exact house.');
            updateMapPosition(lat, lng, 14);
            setTimeout(() => setStatusMsg(''), 5000);
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('ipwho.is error:', e);
    }

    setGeoError('Could not detect your location. Type your address in the search box or click on the map.');
    setLocating(false);
    setStatusMsg('');
    return false;
  };

  // Bulletproof First-Tap Real-Time GPS Acquisition (Zero 3-Chances Requirement)
  const handleUseCurrentLocation = () => {
    setLocating(true);
    setGeoError('');
    setStatusMsg('Locking onto GPS satellites...');

    if (!navigator.geolocation) {
      fetchIpLocation('GPS not supported, using network location');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    let bestReading = null;
    let finalized = false;
    let initialPinPlaced = false;

    // Helper to apply location and move map
    const applyCoordsToMap = async (coords, isFinal = false) => {
      const rawLat = coords.latitude;
      const rawLng = coords.longitude;
      const accuracy = coords.accuracy || 15;

      if (isGenericCentroid(rawLat, rawLng, accuracy)) {
        if (isFinal) {
          await fetchIpLocation('GPS gave generic result, using network location');
        }
        return;
      }

      const lat = rawLat.toFixed(6);
      const lng = rawLng.toFixed(6);
      setLatitude(lat);
      setLongitude(lng);

      const zoom = accuracy <= 25 ? 19 : accuracy <= 60 ? 18 : accuracy <= 200 ? 17 : 15;
      updateMapPosition(lat, lng, zoom);

      if (isFinal || !initialPinPlaced) {
        initialPinPlaced = true;
        const placeInfo = await resolvePlaceDetails(lat, lng);
        setSelectedLocation(placeInfo.formattedAddress);
        setSearchQuery(placeInfo.formattedAddress);
      }

      if (isFinal) {
        setLocating(false);
        if (accuracy <= 30) {
          setStatusMsg('Exact rooftop GPS locked (~' + Math.round(accuracy) + 'm accuracy)');
        } else {
          setStatusMsg('GPS location locked (~' + Math.round(accuracy) + 'm accuracy)');
        }
        setTimeout(() => setStatusMsg(''), 5000);
      }
    };

    const finalize = async (coords) => {
      if (finalized) return;
      finalized = true;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearTimeout(settleTimer);

      await applyCoordsToMap(coords, true);
    };

    // Settle timer: gives hardware GPS up to 10 seconds to lock sub-30m satellites.
    // If it doesn't reach <= 30m, use best reading seen (e.g. 45m indoor WiFi fix) rather than failing!
    const settleTimer = setTimeout(() => {
      if (!finalized) {
        if (bestReading) {
          finalize(bestReading);
        } else {
          finalized = true;
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          fetchIpLocation('GPS timeout, using network location');
        }
      }
    }, 10000);

    // Step 1: Fast Cache Check (< 200ms)
    // If device has a recent GPS fix within 2 minutes, apply it IMMEDIATELY on the very 1st tap!
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (finalized) return;
          const coords = pos.coords;
          if (!bestReading || coords.accuracy < bestReading.accuracy) {
            bestReading = coords;
          }
          // If cached fix is already high-precision (<= 35m), pin it immediately!
          if (coords.accuracy <= 35) {
            applyCoordsToMap(coords, false);
            setStatusMsg('Instant GPS lock (~' + Math.round(coords.accuracy) + 'm). Refining satellites...');
          }
        },
        (err) => {
          if (err && err.code === 1) {
            // Permission denied
            finalized = true;
            clearTimeout(settleTimer);
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            setLocating(false);
            setStatusMsg('');
            setGeoError('Location permission denied. Please allow location access in your browser settings.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 3000,
          maximumAge: 120000, // 2-minute cache acceptable for instant initial pin
        }
      );
    } catch (e) {
      console.warn('Fast geolocation error:', e);
    }

    // Step 2: Live Progressive Satellite Fix
    // Listens to hardware GPS updates, smoothly refining down to exact rooftop level
    const onWatchPos = (pos) => {
      if (finalized) return;
      const coords = pos.coords;
      const acc = coords.accuracy;

      if (!bestReading || acc <= bestReading.accuracy) {
        bestReading = coords;
        // Move pin to current best coordinates immediately
        applyCoordsToMap(coords, false);
      }

      // If accuracy <= 30m, we have locked high-precision satellites!
      if (acc <= 30) {
        finalize(coords);
      } else {
        setStatusMsg('Refining satellite lock... accuracy ~' + Math.round(acc) + 'm');
      }
    };

    const onWatchError = (err) => {
      if (finalized) return;
      if (err && err.code === 1) {
        // Permission denied
        finalized = true;
        clearTimeout(settleTimer);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setLocating(false);
        setStatusMsg('');
        setGeoError('Location permission denied. Please allow location access in your browser settings.');
        return;
      }

      if (bestReading) {
        finalize(bestReading);
      } else {
        finalized = true;
        clearTimeout(settleTimer);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        fetchIpLocation('GPS unavailable, using network location');
      }
    };

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        onWatchPos,
        onWatchError,
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    } catch (e) {
      if (bestReading) {
        finalize(bestReading);
      } else {
        fetchIpLocation('GPS error, using network location');
      }
    }
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
      const placeInfo = await resolvePlaceDetails(lat, lng);
      setLatitude(lat);
      setLongitude(lng);
      const placeName = placeInfo.formattedAddress || result.display_name || q;
      setSelectedLocation(placeName);
      setSearchQuery(placeName);
      setSearching(false);
      updateMapPosition(lat, lng, 18);
    } else {
      setGeoError('"' + q + '" was not found. Try a nearby city or click on the map to pin manually.');
      setSelectedLocation(q);
      setSearching(false);
    }
  };

  // Handle popular destination chip click
  const handleSelectPopular = async (dest) => {
    const lat = String(dest.lat);
    const lng = String(dest.lng);
    setLatitude(lat);
    setLongitude(lng);
    setSelectedLocation(dest.name);
    setSearchQuery(dest.name);
    setGeoError('');
    updateMapPosition(lat, lng, 16);
    await resolvePlaceDetails(lat, lng);
  };

  // Switch map layer
  const handleSwitchLayer = (type) => {
    setMapLayerType(type);
    try {
      localStorage.setItem('havento_map_layer', type);
    } catch {}
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newLayer = TILE_LAYERS[type] || TILE_LAYERS.googleSat;
      tileLayerRef.current = L.tileLayer(newLayer.url, {
        attribution: newLayer.attribution,
        maxZoom: newLayer.maxZoom,
        subdomains: newLayer.subdomains || ['0', '1', '2', '3'],
      }).addTo(mapInstanceRef.current);
    }
  };

  // Handle coordinates manual input change
  const handleManualCoordChange = async (newLat, newLng) => {
    setLatitude(newLat);
    setLongitude(newLng);
    const latNum = parseFloat(newLat);
    const lngNum = parseFloat(newLng);
    if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
      updateMapPosition(latNum, lngNum, 18);
      await resolvePlaceDetails(String(latNum), String(lngNum));
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

    // Pre-resolve initial location places details
    resolvePlaceDetails(String(initLat), String(initLng));

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initLat, initLng],
          zoom: 16,
          zoomControl: true,
        });

        const activeLayer = TILE_LAYERS[mapLayerType] || TILE_LAYERS.googleSat;
        tileLayerRef.current = L.tileLayer(activeLayer.url, {
          attribution: activeLayer.attribution,
          maxZoom: activeLayer.maxZoom,
          subdomains: activeLayer.subdomains || ['0', '1', '2', '3'],
        }).addTo(map);

        const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
        marker.bindPopup('<b>Home Location</b><br/>Drag or click map to move pin').openPopup();

        // Pin Drag Handling: Update exact place details
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          const lat = pos.lat.toFixed(6);
          const lng = pos.lng.toFixed(6);
          setLatitude(lat);
          setLongitude(lng);
          setStatusMsg('Identifying place details...');
          const placeInfo = await resolvePlaceDetails(lat, lng);
          setSelectedLocation(placeInfo.formattedAddress);
          setSearchQuery(placeInfo.formattedAddress);
          setStatusMsg('Pinned at: ' + placeInfo.formattedAddress);
          setTimeout(() => setStatusMsg(''), 4000);
        });

        // Map Click Handling: Move pin to exact clicked point & show exact place
        map.on('click', async (e) => {
          const lat = e.latlng.lat.toFixed(6);
          const lng = e.latlng.lng.toFixed(6);
          marker.setLatLng([lat, lng]);
          setLatitude(lat);
          setLongitude(lng);
          setStatusMsg('Identifying exact place on map...');
          const placeInfo = await resolvePlaceDetails(lat, lng);
          setSelectedLocation(placeInfo.formattedAddress);
          setSearchQuery(placeInfo.formattedAddress);
          setStatusMsg('Pinned at: ' + placeInfo.formattedAddress);
          setTimeout(() => setStatusMsg(''), 4000);
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

  if (!isOpen) return null;

  // Exact Google Maps location query URL (drops pin at exact coordinate location)
  const externalGoogleMapsUrl =
    latitude && longitude
      ? 'https://www.google.com/maps?q=' + latitude + ',' + longitude + '&z=19'
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selectedLocation || 'India');

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
              title="Search address"
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
              className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              title="Auto-detect exact GPS location on the first tap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={'w-4 h-4 ' + (locating ? 'animate-spin' : '')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span>{locating ? 'Locking GPS...' : 'GPS'}</span>
            </button>
          </form>

          {statusMsg && (
            <p className="text-xs text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5 animate-fadeIn">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
              <span>{statusMsg}</span>
            </p>
          )}

          {geoError && (
            <p className="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
              {geoError}
            </p>
          )}

          {/* Quick Suggestions & Layer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-gray-500 font-medium">Quick:</span>
              {POPULAR_DESTINATIONS.slice(0, 5).map((dest) => (
                <button
                  key={dest.name}
                  type="button"
                  onClick={() => handleSelectPopular(dest)}
                  className={
                    'text-[10px] px-2 py-0.5 rounded-md border transition font-medium cursor-pointer ' +
                    (selectedLocation === dest.name
                      ? 'bg-[#A67C52] text-white border-[#A67C52]'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200')
                  }
                >
                  {dest.name.split(',')[0]}
                </button>
              ))}
            </div>

            {/* Map Style Switcher */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => handleSwitchLayer('googleSat')}
                className={
                  'px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ' +
                  (mapLayerType === 'googleSat' ? 'bg-[#A67C52] text-white shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900')
                }
                title="Google Satellite imagery with street labels"
              >
                <span>Satellite</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLayer('googleRoad')}
                className={
                  'px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ' +
                  (mapLayerType === 'googleRoad' ? 'bg-[#A67C52] text-white shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900')
                }
                title="Google standard map"
              >
                <span>Map</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLayer('osm')}
                className={
                  'px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ' +
                  (mapLayerType === 'osm' ? 'bg-[#A67C52] text-white shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900')
                }
                title="OpenStreetMap view"
              >
                <span>OSM</span>
              </button>
            </div>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-inner h-64 sm:h-72 bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Hint overlay on top-left of map */}
            <div className="absolute top-2.5 left-12 z-20 pointer-events-none bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs border border-gray-200 text-[11px] text-gray-700 flex items-center gap-1.5 font-medium">
              <span>{mapLayerType === 'googleSat' ? 'Satellite View: Click or drag pin to exact rooftop' : 'Click or drag pin to exact house'}</span>
            </div>

            {/* Direct Open in Google Maps Link */}
            <a
              href={externalGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2.5 right-2.5 z-20 bg-white/95 hover:bg-white text-gray-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md border border-gray-200 transition flex items-center gap-1.5"
              title="Open this exact location in Google Maps"
            >
              <svg className="w-3.5 h-3.5 fill-current text-rose-600" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span>Open in Google Maps</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>

          {/* Location Mode Switcher Option: Places View vs Coordinates View */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <span>Location Display:</span>
              </span>
              <div className="flex items-center bg-gray-200 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setLocationViewMode('places')}
                  className={
                    'px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ' +
                    (locationViewMode === 'places' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900')
                  }
                >
                  <span>Show as Places</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationViewMode('coords')}
                  className={
                    'px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ' +
                    (locationViewMode === 'coords' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900')
                  }
                >
                  <span>Coordinates</span>
                </button>
              </div>
            </div>

            {/* Option 1: Places Mode View */}
            {locationViewMode === 'places' ? (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                      Resolved Place Name:
                    </span>
                    <p className="font-bold text-gray-800 text-xs sm:text-sm leading-snug">
                      {selectedLocation || searchQuery || 'Click on the map to detect place'}
                    </p>
                  </div>
                  <a
                    href={externalGoogleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline flex items-center gap-1 pt-1"
                  >
                    <span>View in Google Maps</span>
                  </a>
                </div>

                {/* Detected Place Breakdown Chips */}
                {(placeDetails.locality || placeDetails.city || placeDetails.state) && (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 font-medium">Place details:</span>
                    {placeDetails.locality && (
                      <button
                        type="button"
                        onClick={() => {
                          const val = [placeDetails.locality, placeDetails.city, placeDetails.state].filter(Boolean).join(', ');
                          setSelectedLocation(val);
                          setSearchQuery(val);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium hover:bg-emerald-100 transition"
                        title="Click to set this locality"
                      >
                        Area: {placeDetails.locality}
                      </button>
                    )}
                    {placeDetails.city && (
                      <button
                        type="button"
                        onClick={() => {
                          const val = [placeDetails.city, placeDetails.state].filter(Boolean).join(', ');
                          setSelectedLocation(val);
                          setSearchQuery(val);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium hover:bg-blue-100 transition"
                        title="Click to set this city"
                      >
                        City: {placeDetails.city}
                      </button>
                    )}
                    {placeDetails.state && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                        State: {placeDetails.state}
                      </span>
                    )}
                    {placeDetails.postcode && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium font-mono">
                        PIN: {placeDetails.postcode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Option 2: Coordinates View */
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase">Exact Destination:</span>
                  <span className="font-semibold text-gray-700 text-xs line-clamp-1">
                    {selectedLocation || 'Not selected'}
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
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            <span className="line-clamp-1">{selectedLocation ? 'Selected: ' + selectedLocation : 'Ready to confirm'}</span>
          </div>

          <div className="flex items-center gap-2">
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
    </div>
  );
};

export default GoogleMapPickerModal;

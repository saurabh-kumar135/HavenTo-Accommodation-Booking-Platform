import { useState } from 'react';

const GoogleMapViewer = ({
  location = '',
  latitude = null,
  longitude = null,
  houseName = '',
  height = '380px',
  zoom = 15,
}) => {
  const [mapType, setMapType] = useState('m'); // 'm' for roadmap, 'k' for satellite
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Formulate target location query: coordinates if available, else location string
  const hasCoords =
    latitude !== null &&
    longitude !== null &&
    !isNaN(Number(latitude)) &&
    !isNaN(Number(longitude)) &&
    Number(latitude) !== 0 &&
    Number(longitude) !== 0;

  const query = hasCoords ? `${latitude},${longitude}` : location || 'India';
  const encodedQuery = encodeURIComponent(query);

  // Use official Google Maps embed URL
  const embedUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedQuery}&zoom=${zoom}`
    : `https://maps.google.com/maps?q=${encodedQuery}&t=${mapType}&z=${zoom}&ie=UTF8&iwloc=&output=embed`;

  // External Google Maps directions / view link
  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  return (
    <div className="w-full bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm transition-all duration-300">
      {/* Map Header Bar */}
      <div className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
          <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <span className="font-semibold text-gray-900">{location || 'Location Map'}</span>
          {hasCoords && (
            <span className="text-[11px] font-mono text-gray-500 bg-gray-200/70 px-2 py-0.5 rounded">
              {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Map / Satellite toggle */}
          <div className="flex items-center bg-gray-200/70 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMapType('m')}
              className={`px-2.5 py-1 rounded-md transition ${
                mapType === 'm' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setMapType('k')}
              className={`px-2.5 py-1 rounded-md transition ${
                mapType === 'k' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Open in Google Maps Button */}
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#A67C52] hover:bg-[#8B6F47] text-white text-xs font-semibold rounded-lg transition shadow-xs"
            title="Open in Google Maps for directions and street view"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>Open in Google Maps</span>
          </a>
        </div>
      </div>

      {/* Google Map Embed Iframe */}
      <div className="relative w-full overflow-hidden bg-slate-100" style={{ height }}>
        <iframe
          title={`Google Map - ${houseName || location}`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl}
          className="w-full h-full"
        ></iframe>
      </div>
    </div>
  );
};

export default GoogleMapViewer;

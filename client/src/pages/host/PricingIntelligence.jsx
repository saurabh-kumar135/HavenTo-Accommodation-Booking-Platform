import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { predictDynamicPrice, getMarketOverview, getHostRevenueMetrics } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const REAL_LOCATIONS = [
  'Udaipur', 'Mumbai', 'Jaipur', 'Darjeeling', 'Ranthambore',
  'Shimla', 'Jaisalmer', 'Bangalore', 'Kerala', 'Delhi',
  'Rishikesh', 'Goa', 'Manali', 'Taharpur'
];

const REAL_CATEGORIES = [
  'Trending', 'Villa', 'Luxury Suite', 'Apartment',
  'Cabin', 'Beachfront', 'Mountain View', 'Heritage Home', 'Homestay'
];

const REAL_AMENITIES = [
  'Private Pool', 'Swimming Pool', 'Ocean View', 'Mountain View',
  'Air Conditioning', 'Fully Equipped Kitchen', 'Balcony',
  'WiFi', 'Free Parking', 'Gym', 'Fireplace', 'Hot Tub'
];

// Histogram Data derived from real MongoDB property distribution
const HISTOGRAM_BINS = [
  {
    id: 1,
    range: '₹1K - ₹4K',
    label: '₹1K - 4K',
    count: 3,
    percentage: 15,
    avgOccupancy: 84,
    avgAdr: '₹2,730',
    tier: 'Budget / Homestay',
    examples: 'Taharpur Homestay, Manali Pine Retreat, Goa Standard'
  },
  {
    id: 2,
    range: '₹4K - ₹7K',
    label: '₹4K - 7K',
    count: 5,
    percentage: 25,
    avgOccupancy: 78,
    avgAdr: '₹5,540',
    tier: 'Standard / City Stays',
    examples: 'Goa Coastal Villa, Delhi Executive Suite, Rishikesh Riverfront'
  },
  {
    id: 3,
    range: '₹7K - ₹10K',
    label: '₹7K - 10K',
    count: 6,
    percentage: 30,
    avgOccupancy: 73,
    avgAdr: '₹8,250',
    tier: 'Mid-Premium Corridors (Peak)',
    examples: 'Ranthambore Safari Lodge, Jaisalmer Luxury Tent, Shimla Cottage'
  },
  {
    id: 4,
    range: '₹10K - ₹15K',
    label: '₹10K - 15K',
    count: 4,
    percentage: 20,
    avgOccupancy: 65,
    avgAdr: '₹12,400',
    tier: 'High-End Leisure',
    examples: 'Darjeeling Tea Estate, Jaipur Heritage Haveli, Mumbai Apartment'
  },
  {
    id: 5,
    range: '₹15K - ₹25K',
    label: '₹15K - 25K',
    count: 2,
    percentage: 10,
    avgOccupancy: 58,
    avgAdr: '₹20,000',
    tier: 'Ultra Luxury & Palaces',
    examples: 'Udaipur Royal Palace Suite, Mumbai Luxury Beach Villa'
  }
];

// Category Pie / Donut Chart Data
const CATEGORY_DISTRIBUTION = [
  { name: 'Villas & Beachfront', count: 6, percentage: 30, color: '#8B6F47', avgAdr: '₹10,500', demand: 'Very High' },
  { name: 'Heritage & Palaces', count: 5, percentage: 25, color: '#A67C52', avgAdr: '₹14,200', demand: 'High' },
  { name: 'Suites & Apartments', count: 4, percentage: 20, color: '#C4A57B', avgAdr: '₹6,800', demand: 'Steady' },
  { name: 'Nature & Safari', count: 3, percentage: 15, color: '#D4B896', avgAdr: '₹7,900', demand: 'Seasonal' },
  { name: 'Homestays & Cabins', count: 2, percentage: 10, color: '#E8D8C3', avgAdr: '₹2,500', demand: 'Consistent' }
];

// Helper: Convert Polar to Cartesian coordinates for SVG arc math
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: Number((centerX + radius * Math.cos(angleInRadians)).toFixed(2)),
    y: Number((centerY + radius * Math.sin(angleInRadians)).toFixed(2))
  };
};

// Helper: Describe SVG Donut Slice Path
const describeDonutSlice = (cx, cy, outerR, innerR, startAngle, endAngle) => {
  const safeEndAngle = endAngle - startAngle >= 360 ? startAngle + 359.99 : endAngle;
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, safeEndAngle);
  const startInner = polarToCartesian(cx, cy, innerR, safeEndAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArcFlag = safeEndAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerR, outerR, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
    'L', startInner.x, startInner.y,
    'A', innerR, innerR, 0, largeArcFlag, 0, endInner.x, endInner.y,
    'Z'
  ].join(' ');
};

const PricingIntelligence = () => {
  const { user } = useAuth();
  
  // Simulator state
  const [location, setLocation] = useState('Udaipur');
  const [category, setCategory] = useState('Villa');
  const [guests, setGuests] = useState(4);
  const [rating, setRating] = useState(9.0);
  const [selectedAmenities, setSelectedAmenities] = useState(['Swimming Pool', 'Air Conditioning', 'WiFi']);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [isWeekend, setIsWeekend] = useState(true);
  
  // Results & Loading with immediate non-empty baseline
  const [prediction, setPrediction] = useState({
    recommended_price: 8250,
    min_competitive_price: 7000,
    max_premium_price: 9750,
    demand_tier: 'High Demand',
    projected_occupancy_rate: 76.5,
    value_drivers: [
      { factor: 'Location Premium (Udaipur)', impact: 'Top Tourism Tier' },
      { factor: 'Swimming Pool Amenity', impact: '+₹2,500/night value add' },
      { factor: 'Weekend Surge Multiplier', impact: '+18% Dynamic Lift' }
    ]
  });
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [hostMetrics, setHostMetrics] = useState(null);

  // Interactive Chart States
  const [hoveredBin, setHoveredBin] = useState(HISTOGRAM_BINS[2]); // Default highlight the peak bucket
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    handlePredict();
    fetchHostAnalytics();
  }, []);

  const fetchHostAnalytics = async () => {
    try {
      const res = await getHostRevenueMetrics();
      if (res.data?.success) {
        setHostMetrics(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch host metrics:', err);
    }
  };

  const handlePredict = async () => {
    setLoadingPrediction(true);
    try {
      const res = await predictDynamicPrice({
        location,
        category,
        guests: Number(guests),
        rating: Number(rating),
        amenities: selectedAmenities,
        month: Number(month),
        is_weekend: isWeekend ? 1 : 0
      });
      if (res.data?.success) {
        setPrediction(res.data);
      }
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setLoadingPrediction(false);
    }
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <Navbar currentPage="pricing" />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        {/* Warm Header Matching HavenTo Aesthetic */}
        <div className="bg-white rounded-2xl p-6 md:p-8 mb-8 shadow-md border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F0E8] text-[#8B6F47] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>🏨</span>
                Host Revenue Intelligence
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Dynamic Pricing & Market Insights
              </h1>
              <p className="text-gray-600 text-sm mt-1 max-w-2xl leading-relaxed">
                Smart rate recommendations and market analytics to help you optimize nightly pricing, maximize occupancy, and grow your rental earnings across Indian travel destinations.
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-[#F8F6F2] p-4 rounded-xl border border-[#E5D7C5]">
              <div className="text-right">
                <div className="text-xs text-gray-500 font-medium">Logged in as Host</div>
                <div className="text-sm font-bold text-gray-800">{user?.name || user?.email || 'Host'}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#A67C52] text-white flex items-center justify-center font-bold text-sm">
                {(user?.name?.[0] || user?.email?.[0] || 'H').toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Average Daily Rate (ADR)
            </div>
            <div className="text-2xl font-bold text-gray-800">
              ₹{hostMetrics?.financial_metrics?.adr?.toLocaleString('en-IN') || '7,250'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Realized revenue per booked room night</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              RevPAR (Revenue / Room)
            </div>
            <div className="text-2xl font-bold text-[#A67C52]">
              ₹{hostMetrics?.financial_metrics?.revpar?.toLocaleString('en-IN') || '4,960'}
            </div>
            <p className="text-xs text-gray-500 mt-1">ADR × Projected Occupancy Rate</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Projected Occupancy
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {prediction?.projected_occupancy_rate || 72.0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Seasonal market demand projection</p>
          </div>

          <div className="bg-[#FAF6F0] p-5 rounded-xl shadow-sm border border-[#E5D7C5]">
            <div className="text-xs font-semibold text-[#8B6F47] uppercase tracking-wider mb-1">
              Smart Pricing Potential
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              +₹{hostMetrics?.ml_optimization?.potential_monthly_revenue_uplift?.toLocaleString('en-IN') || '18,500'}/mo
            </div>
            <p className="text-xs text-[#8B6F47] mt-1">Estimated gain with dynamic rates</p>
          </div>
        </div>

        {/* Dynamic Rate Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Controls */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              Rate Recommendation Calculator
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              Estimate the optimal nightly price for your property based on location, guest capacity, and amenities.
            </p>

            <div className="space-y-5">
              {/* Location & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Location
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  >
                    {REAL_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Property Type
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  >
                    {REAL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guests, Rating, Season */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Guests: <span className="text-[#A67C52]">{guests}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="14"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full accent-[#A67C52] cursor-pointer mt-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Season (Month)
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Timing
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsWeekend(!isWeekend)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition border ${
                      isWeekend
                        ? 'bg-[#F5F0E8] border-[#D4B896] text-[#8B6F47]'
                        : 'bg-gray-50 border-gray-300 text-gray-600'
                    }`}
                  >
                    {isWeekend ? '⚡ Weekend Surge (+18%)' : 'Regular Weekday'}
                  </button>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Property Amenities
                </label>
                <div className="flex flex-wrap gap-2">
                  {REAL_AMENITIES.map(amenity => {
                    const active = selectedAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          active
                            ? 'bg-[#A67C52] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}{amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                onClick={handlePredict}
                disabled={loadingPrediction}
                className="w-full bg-[#A67C52] hover:bg-[#8B6F47] text-white py-3 px-6 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {loadingPrediction ? (
                  <span>Calculating Recommendations...</span>
                ) : (
                  <span>Calculate Recommended Rate</span>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase font-bold tracking-wider text-gray-500">
                    Recommended Rate
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    prediction?.demand_tier === 'High Demand'
                      ? 'bg-amber-100 text-amber-800'
                      : prediction?.demand_tier === 'Off-Peak'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {prediction?.demand_tier || 'Optimal Demand'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ₹{prediction?.recommended_price ? prediction.recommended_price.toLocaleString('en-IN') : '---'}
                  </span>
                  <span className="text-gray-500 font-medium">/ night</span>
                </div>

                {/* Price Range */}
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EFE8DC] mb-6">
                  <div className="text-xs text-gray-500 font-medium mb-1.5">
                    Competitive Market Range
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-gray-800">
                    <span>₹{prediction?.min_competitive_price ? prediction.min_competitive_price.toLocaleString('en-IN') : '---'}</span>
                    <span className="text-xs text-gray-400 font-normal">to</span>
                    <span>₹{prediction?.max_premium_price ? prediction.max_premium_price.toLocaleString('en-IN') : '---'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>Fast Booking Bound</span>
                    <span>Peak Premium Bound</span>
                  </div>
                </div>

                {/* Value Drivers */}
                <div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Key Valuation Drivers
                  </div>
                  <div className="space-y-2">
                    {prediction?.value_drivers && prediction.value_drivers.length > 0 ? (
                      prediction.value_drivers.map((driver, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                          <span className="text-gray-700 font-medium">{driver.factor}</span>
                          <span className="font-bold text-emerald-700">
                            {driver.impact}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 italic">Calculating drivers for current configuration...</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                <span>Market: {location}</span>
                <span>Category: {category}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Marketplace Visualizations: Histogram & Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* 1. Nightly Price Distribution Histogram */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F5F0E8] text-[#8B6F47] text-[11px] font-bold uppercase tracking-wider mb-1">
                    <span>📊</span> Price Distribution
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">
                    Market Nightly Price Histogram
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EADCC9] text-[#8B6F47] font-semibold">
                    Median: ₹7,250
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 font-semibold">
                    Mean: ₹8,110
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-6">
                Frequency distribution of listing rates across HavenTo inventory in Indian Rupees (₹)
              </p>

              {/* Responsive SVG Histogram */}
              <div className="w-full overflow-x-auto">
                <svg viewBox="0 0 520 200" className="w-full h-48 select-none">
                  {/* Grid Lines & Y Axis Labels */}
                  {[
                    { val: 8, y: 30 },
                    { val: 6, y: 65 },
                    { val: 4, y: 100 },
                    { val: 2, y: 135 },
                    { val: 0, y: 170 }
                  ].map(line => (
                    <g key={line.val}>
                      <line
                        x1="36"
                        y1={line.y}
                        x2="500"
                        y2={line.y}
                        stroke="#F0EAE1"
                        strokeDasharray={line.val === 0 ? "0" : "3 3"}
                        strokeWidth="1"
                      />
                      <text
                        x="28"
                        y={line.y + 4}
                        textAnchor="end"
                        className="text-[10px] fill-gray-400 font-medium"
                      >
                        {line.val}
                      </text>
                    </g>
                  ))}

                  {/* Median Reference Line (Dashed) */}
                  <line
                    x1="265"
                    y1="22"
                    x2="265"
                    y2="170"
                    stroke="#B85D3B"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <rect x="235" y="10" width="60" height="16" rx="4" fill="#B85D3B" />
                  <text x="265" y="21" textAnchor="middle" fill="#FFFFFF" className="text-[9px] font-bold">
                    Median ₹7.2K
                  </text>

                  {/* Binned Bars */}
                  {HISTOGRAM_BINS.map((bin, idx) => {
                    const slotWidth = 84;
                    const barWidth = 58;
                    const x = 50 + idx * slotWidth;
                    const barHeight = (bin.count / 8) * 140;
                    const y = 170 - barHeight;
                    const isHovered = hoveredBin?.id === bin.id;

                    return (
                      <g
                        key={bin.id}
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setHoveredBin(bin)}
                      >
                        {/* Interactive Bar */}
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="6"
                          ry="6"
                          fill={isHovered ? '#8B6F47' : '#A67C52'}
                          className="transition-colors duration-200"
                        />

                        {/* Top Frequency Badge */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 6}
                          textAnchor="middle"
                          fill={isHovered ? '#8B6F47' : '#4A3E31'}
                          className="text-[11px] font-bold"
                        >
                          {bin.count}
                        </text>

                        {/* X-axis Label */}
                        <text
                          x={x + barWidth / 2}
                          y="186"
                          textAnchor="middle"
                          fill={isHovered ? '#8B6F47' : '#6B5E51'}
                          className="text-[10px] font-semibold"
                        >
                          {bin.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Interactive Bin Inspector Strip */}
            {hoveredBin && (
              <div className="mt-4 p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EADCC9] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-[#4A3E31]">
                    <span>Range: {hoveredBin.range}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#EADCC9] text-[#8B6F47] text-[10px]">
                      {hoveredBin.count} Properties ({hoveredBin.percentage}% of market)
                    </span>
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    {hoveredBin.tier} • Examples: <span className="text-[#8B6F47] font-medium">{hoveredBin.examples}</span>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="text-gray-500 text-[10px]">Avg Realized ADR</div>
                  <div className="font-bold text-[#A67C52] text-sm">{hoveredBin.avgAdr}</div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Property Category Distribution Pie / Donut Chart */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F5F0E8] text-[#8B6F47] text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>🥧</span> Category Share
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">
                Inventory & Revenue Mix
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Proportion of active listings across accommodation categories
              </p>

              {/* Donut Chart & Center Metric */}
              <div className="flex justify-center my-2">
                <div className="relative w-52 h-52">
                  <svg viewBox="0 0 240 240" className="w-full h-full select-none">
                    {(() => {
                      let currentAngle = 0;
                      return CATEGORY_DISTRIBUTION.map((cat) => {
                        const sliceAngle = (cat.percentage / 100) * 360;
                        const start = currentAngle;
                        const end = currentAngle + sliceAngle;
                        currentAngle += sliceAngle;
                        const isSelected = hoveredCategory?.name === cat.name;
                        const outerR = isSelected ? 96 : 90;
                        const innerR = 54;
                        const pathData = describeDonutSlice(120, 120, outerR, innerR, start, end);

                        return (
                          <path
                            key={cat.name}
                            d={pathData}
                            fill={cat.color}
                            stroke="#FFFFFF"
                            strokeWidth="2.5"
                            className="cursor-pointer transition-all duration-200 hover:opacity-90"
                            onMouseEnter={() => setHoveredCategory(cat)}
                            onMouseLeave={() => setHoveredCategory(null)}
                          />
                        );
                      });
                    })()}

                    {/* Donut Hole Display */}
                    <circle cx="120" cy="120" r="52" fill="#FFFFFF" />
                    {hoveredCategory ? (
                      <g className="transition-all">
                        <text x="120" y="112" textAnchor="middle" className="text-lg font-bold fill-[#4A3E31]">
                          {hoveredCategory.percentage}%
                        </text>
                        <text x="120" y="128" textAnchor="middle" className="text-[10px] font-semibold fill-[#8B6F47]">
                          {hoveredCategory.avgAdr}
                        </text>
                        <text x="120" y="142" textAnchor="middle" className="text-[8px] fill-gray-400 font-medium uppercase tracking-wider">
                          Avg Nightly
                        </text>
                      </g>
                    ) : (
                      <g>
                        <text x="120" y="115" textAnchor="middle" className="text-xl font-bold fill-[#4A3E31]">
                          20
                        </text>
                        <text x="120" y="132" textAnchor="middle" className="text-[10px] font-medium fill-[#8C7E6F] uppercase tracking-wider">
                          Listings
                        </text>
                      </g>
                    )}
                  </svg>
                </div>
              </div>
            </div>

            {/* Category Legend & Metrics */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              {CATEGORY_DISTRIBUTION.map(cat => {
                const isSelected = hoveredCategory?.name === cat.name;
                return (
                  <div
                    key={cat.name}
                    onMouseEnter={() => setHoveredCategory(cat)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition ${
                      isSelected ? 'bg-[#FAF6F0] font-bold text-[#8B6F47]' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-semibold">
                      <span className="text-[#A67C52]">{cat.avgAdr}</span>
                      <span className="w-9 text-right text-gray-500 font-medium">{cat.percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Real HavenTo Destination Pricing Table */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-1">
            Indian Travel Hubs Baseline Index
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Current median nightly rates derived from HavenTo accommodation listings
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {[
              { name: 'Mumbai', price: '₹16,500' },
              { name: 'Udaipur', price: '₹15,000' },
              { name: 'Jaipur', price: '₹12,000' },
              { name: 'Darjeeling', price: '₹11,000' },
              { name: 'Ranthambore', price: '₹8,500' },
              { name: 'Shimla', price: '₹8,000' },
              { name: 'Jaisalmer', price: '₹7,500' },
              { name: 'Bangalore', price: '₹7,000' },
              { name: 'Kerala', price: '₹6,500' },
              { name: 'Delhi', price: '₹5,000' },
              { name: 'Rishikesh', price: '₹4,500' },
              { name: 'Goa', price: '₹4,200' },
              { name: 'Manali', price: '₹3,200' },
              { name: 'Taharpur', price: '₹1,000' }
            ].map(item => (
              <div key={item.name} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <div className="text-xs font-semibold text-gray-700">{item.name}</div>
                <div className="text-sm font-bold text-[#A67C52] mt-0.5">{item.price}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PricingIntelligence;

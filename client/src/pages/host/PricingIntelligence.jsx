import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { predictDynamicPrice, getMarketOverview, getHostRevenueMetrics } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LOCATIONS = [
  'Goa', 'Taharpur', 'Mumbai', 'Delhi', 'Bangalore',
  'Jaipur', 'Udaipur', 'Manali', 'Shimla', 'Rishikesh'
];

const CATEGORIES = [
  'Villa', 'Trending', 'Beachfront', 'Luxury Suite',
  'Apartment', 'Mountain View', 'Cabin', 'Studio', 'Heritage Home'
];

const AVAILABLE_AMENITIES = [
  'WiFi', 'Swimming Pool', 'Air Conditioning', 'Fully Equipped Kitchen',
  'Free Parking', 'Gym', 'Hot Tub', 'Ocean View',
  'Dedicated Workspace', 'Pet Friendly', 'Balcony', 'BBQ Grill'
];

const PricingIntelligence = () => {
  const { isLoggedIn, user } = useAuth();
  
  // Simulator state
  const [location, setLocation] = useState('Goa');
  const [category, setCategory] = useState('Villa');
  const [guests, setGuests] = useState(4);
  const [rating, setRating] = useState(4.8);
  const [selectedAmenities, setSelectedAmenities] = useState(['WiFi', 'Swimming Pool', 'Air Conditioning']);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [isWeekend, setIsWeekend] = useState(true);
  
  // Results & Loading
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [hostMetrics, setHostMetrics] = useState(null);
  const [marketOverview, setMarketOverview] = useState(null);

  // Initial load
  useEffect(() => {
    handlePredict();
    fetchMarketData();
    if (isLoggedIn && user?.userType === 'host') {
      fetchHostAnalytics();
    }
  }, []);

  const fetchMarketData = async () => {
    try {
      const res = await getMarketOverview();
      if (res.data?.success) {
        setMarketOverview(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch market overview:', err);
    }
  };

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentPage="pricing" />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-7xl">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-700 text-white rounded-3xl p-8 mb-10 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="max-w-3xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-600/50 border border-amber-400/30 text-xs font-semibold tracking-wide uppercase mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Machine Learning Powered Engine
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Revenue Intelligence & Dynamic Pricing
            </h1>
            <p className="text-amber-100 text-base md:text-lg leading-relaxed mb-6">
              Empowering property hosts with real-time algorithmic rate recommendations. 
              Our Random Forest model analyzes seasonal demand patterns, geospatial premiums, and amenity valuations to maximize occupancy and RevPAR.
            </p>

            <div className="flex flex-wrap gap-4 text-xs font-medium">
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10">
                🎯 Model Accuracy: <span className="text-emerald-300 font-bold">85.0% R² Score</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10">
                ⚡ Algorithm: <span className="text-amber-200 font-bold">Random Forest Regressor</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10">
                📊 Macro Markets: <span className="text-amber-200 font-bold">10 Active Hubs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial KPIs Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-sm font-semibold mb-2">
              <span>ADR (Average Daily Rate)</span>
              <span className="text-amber-600 bg-amber-50 p-2 rounded-lg">🏨</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">
              ${hostMetrics?.financial_metrics?.adr || '118.50'}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Average realized rate per booked room night
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-sm font-semibold mb-2">
              <span>RevPAR</span>
              <span className="text-emerald-600 bg-emerald-50 p-2 rounded-lg">📈</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">
              ${hostMetrics?.financial_metrics?.revpar || '94.20'}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Revenue per available room (ADR × Occupancy)
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-sm font-semibold mb-2">
              <span>Projected Occupancy</span>
              <span className="text-blue-600 bg-blue-50 p-2 rounded-lg">📅</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {prediction?.projected_occupancy_rate || 78.5}%
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Demand forecast for current season & day
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-2xl shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-emerald-100 text-sm font-semibold mb-2">
              <span>Potential ML Revenue Uplift</span>
              <span className="bg-white/20 p-2 rounded-lg">✨</span>
            </div>
            <div className="text-3xl font-bold">
              +${hostMetrics?.ml_optimization?.potential_monthly_revenue_uplift || '480'}/mo
            </div>
            <p className="text-xs text-emerald-100 mt-2">
              Gain unlocked by adopting dynamic price recommendations
            </p>
          </div>
        </div>

        {/* Dynamic Simulator & Result Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Controls Panel */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Dynamic Price Simulator
                </h2>
                <p className="text-xs text-slate-500">
                  Configure stay attributes to trigger real-time ML rate calculation
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                Interactive Model
              </span>
            </div>

            <div className="space-y-6">
              {/* Destination & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Market Destination
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Property Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guest Capacity & Seasonality */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Guests ({guests})
                    </label>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="14"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Month ({month})
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {[
                      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Timing Factor
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsWeekend(!isWeekend)}
                    className={`w-full py-2 px-3 rounded-xl text-sm font-semibold transition border ${
                      isWeekend
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {isWeekend ? '⚡ Weekend Surge (+18%)' : 'Weekday Baseline'}
                  </button>
                </div>
              </div>

              {/* Amenities Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Installed Amenities & Offerings
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_AMENITIES.map(amenity => {
                    const active = selectedAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                          active
                            ? 'bg-amber-800 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                className="w-full bg-amber-800 hover:bg-amber-900 text-white py-3.5 px-6 rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-900/10 active:scale-[0.99]"
              >
                {loadingPrediction ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Evaluating Real-Time Model...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    Calculate Fair-Market Dynamic Rate
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Output Panel */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                    Optimal Dynamic Price
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    prediction?.demand_tier === 'High Demand'
                      ? 'bg-red-100 text-red-700'
                      : prediction?.demand_tier === 'Off-Peak'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {prediction?.demand_tier || 'Optimal Demand'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-black text-slate-900">
                    ${prediction?.recommended_price || '---'}
                  </span>
                  <span className="text-slate-500 font-semibold">/ night</span>
                </div>

                {/* Competitive Price Corridor */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                  <div className="text-xs text-slate-500 font-semibold mb-2">
                    Competitive Market Corridor
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                    <span>${prediction?.min_competitive_price || '---'}</span>
                    <div className="flex-1 mx-3 h-2 bg-slate-200 rounded-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-emerald-500 w-full rounded-full" />
                    </div>
                    <span>${prediction?.max_premium_price || '---'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>Fast Booking Bound</span>
                    <span>Peak Premium Bound</span>
                  </div>
                </div>

                {/* Value Drivers */}
                <div className="mb-6">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Top Valuation Drivers
                  </div>
                  <div className="space-y-2">
                    {prediction?.value_drivers && prediction.value_drivers.length > 0 ? (
                      prediction.value_drivers.map((driver, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                          <span className="font-semibold text-slate-700">{driver.factor}</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {driver.impact}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic">No significant drivers detected</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Model Confidence Specs */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Model Confidence:</span>
                <span className="font-semibold text-slate-800">
                  {prediction?.model_confidence?.algorithm || 'Random Forest Regressor'} (±${prediction?.model_confidence?.mae_variance || '27.58'})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Macro Travel Market Benchmarks */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Macro Regional Demand Benchmarks
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Aggregated pricing baselines across high-traffic tourist destinations
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { name: 'Mumbai', base: '$130/night', tier: 'Tier 1 Metro' },
              { name: 'Udaipur', base: '$115/night', tier: 'Heritage Hub' },
              { name: 'Goa', base: '$110/night', tier: 'Coastal Leisure' },
              { name: 'Delhi', base: '$95/night', tier: 'Capital Hub' },
              { name: 'Manali', base: '$80/night', tier: 'Mountain Retreat' },
              { name: 'Bangalore', base: '$90/night', tier: 'Tech Corridor' },
              { name: 'Jaipur', base: '$85/night', tier: 'Cultural Hub' },
              { name: 'Shimla', base: '$78/night', tier: 'Hill Station' },
              { name: 'Rishikesh', base: '$70/night', tier: 'Spiritual Center' },
              { name: 'Taharpur', base: '$55/night', tier: 'Emerging Market' },
            ].map(item => (
              <div key={item.name} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-300 transition">
                <div className="text-sm font-bold text-slate-900">{item.name}</div>
                <div className="text-xs font-semibold text-amber-700">{item.base}</div>
                <div className="text-[10px] text-slate-500">{item.tier}</div>
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

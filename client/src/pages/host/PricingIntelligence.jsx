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
  
  // Results & Loading
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [hostMetrics, setHostMetrics] = useState(null);

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

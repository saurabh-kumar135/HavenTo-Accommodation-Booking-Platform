import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getHostWealthAnalytics } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const HostWealthDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'homes' | 'stays'

  // Simple 3-step Calculator
  const [guestsCount, setGuestsCount] = useState(10);
  const [nightsCount, setNightsCount] = useState(2);
  const [pricePerNight, setPricePerNight] = useState(15000);
  const [selectedHomeName, setSelectedHomeName] = useState('Luxury Beach Villa');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getHostWealthAnalytics();
      if (res.data && res.data.success) {
        setAnalytics(res.data);
        if (res.data.homesBreakdown && res.data.homesBreakdown.length > 0) {
          const first = res.data.homesBreakdown[0];
          setPricePerNight(first.nightlyPrice || 15000);
          setSelectedHomeName(first.houseName || 'Your Property');
        }
      }
    } catch (err) {
      console.error('Failed to load host earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHome = (home) => {
    setSelectedHomeName(home.houseName);
    setPricePerNight(home.nightlyPrice);
  };

  // Simple Formula: Guests x Nights x Price
  const totalEarned = guestsCount * nightsCount * pricePerNight;
  const inBank = Math.round(totalEarned * 0.97); // 97% to host after 3% fee
  const perYear = totalEarned * 12;

  const summary = analytics?.summary || {
    totalBookings: 0,
    totalGrossRevenue: 0,
    netPayout: 0,
    totalNightsBooked: 0,
    avgStayDuration: 2,
  };

  const homes = analytics?.homesBreakdown || [];
  const bookings = analytics?.recentBookings || [];
  const hostName = user?.firstName
    ? user.firstName + ' ' + (user.lastName || '')
    : user?.name || analytics?.hostName || 'Host';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <Navbar currentPage="host-wealth" />

      <main className="container mx-auto px-4 py-8 max-w-5xl flex-1">
        {/* Simple Page Header Matching HavenTo Pages */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Host Earnings</h1>
            <p className="text-gray-500 text-sm mt-1">
              Simple overview of your earnings and income from guest bookings
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-xs self-start md:self-auto">
            <div className="w-8 h-8 rounded-full bg-[#A67C52] text-white flex items-center justify-center font-bold text-sm">
              {(hostName[0] || 'H').toUpperCase()}
            </div>
            <div>
              <div className="text-[11px] text-gray-400">Host Account</div>
              <div className="text-xs font-bold text-gray-800">{hostName}</div>
            </div>
          </div>
        </div>

        {/* 3 Simple Tabs Matching Bookings.jsx Style */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={(activeTab === 'overview' ? 'bg-[#A67C52] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/60') + ' px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer'}
          >
            <span>Overview & Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('homes')}
            className={(activeTab === 'homes' ? 'bg-[#A67C52] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/60') + ' px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer'}
          >
            <span>Earnings by Home</span>
            <span className={(activeTab === 'homes' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700') + ' text-xs px-2 py-0.5 rounded-full'}>
              {homes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stays')}
            className={(activeTab === 'stays' ? 'bg-[#A67C52] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/60') + ' px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer'}
          >
            <span>Completed Stays</span>
            <span className={(activeTab === 'stays' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700') + ' text-xs px-2 py-0.5 rounded-full'}>
              {bookings.length}
            </span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & CALCULATOR */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 3 Big Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase">Total Money Earned</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                  ₹{summary.totalGrossRevenue.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-emerald-700 font-semibold mt-2 pt-2 border-t border-gray-100">
                  Take-home in bank: ₹{summary.netPayout.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase">Completed Stays</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                  {summary.totalBookings} Bookings
                </div>
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                  Total guests hosted across your homes
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase">Total Nights Hosted</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                  {summary.totalNightsBooked} Nights
                </div>
                <div className="text-xs text-[#8B6F47] font-semibold mt-2 pt-2 border-t border-gray-100">
                  Average: {summary.avgStayDuration} nights per guest
                </div>
              </div>
            </div>

            {/* Simple Earnings Calculator */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xs border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    How Much Money Will You Make?
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Formula: Guests × Nights × Price = Money Earned
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setGuestsCount(10);
                    setNightsCount(2);
                    setPricePerNight(15000);
                    setSelectedHomeName('Luxury Beach Villa');
                  }}
                  className="px-3.5 py-1.5 bg-[#FAF7F2] hover:bg-[#F0EAE1] text-[#8B6F47] border border-[#E5D7C5] rounded-lg text-xs font-bold transition cursor-pointer self-start sm:self-auto"
                >
                  Quick Scenario: 10 Guests • 2 Nights
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* 3 Steps */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Step 1: Pick Home */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      1. Pick Your Home
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {homes.map((h) => {
                        const isSelected = selectedHomeName === h.houseName;
                        return (
                          <button
                            key={h.homeId}
                            type="button"
                            onClick={() => handleSelectHome(h)}
                            className={(isSelected ? 'bg-[#A67C52] text-white border-[#A67C52] shadow-xs' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200') + ' px-3.5 py-2 rounded-xl text-xs font-semibold border transition text-left cursor-pointer'}
                          >
                            <div className="font-bold">{h.houseName}</div>
                            <div className={(isSelected ? 'text-white/90' : 'text-gray-500') + ' text-[11px]'}>
                              ₹{h.nightlyPrice.toLocaleString('en-IN')}/night
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Number of Guests */}
                  <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E5D7C5]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        2. How Many Guests Book?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGuestsCount(Math.max(1, guestsCount - 1))}
                          className="w-7 h-7 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-lg border border-gray-200 text-sm flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-sm font-extrabold text-[#A67C52] min-w-[70px] text-center">
                          {guestsCount} Guests
                        </span>
                        <button
                          type="button"
                          onClick={() => setGuestsCount(guestsCount + 1)}
                          className="w-7 h-7 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-lg border border-gray-200 text-sm flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setGuestsCount(num)}
                          className={(guestsCount === num ? 'bg-[#A67C52] text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200') + ' flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-center'}
                        >
                          {num} Guests
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Nights per Stay */}
                  <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E5D7C5]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        3. How Many Nights Do They Stay?
                      </span>
                      <span className="text-sm font-extrabold text-[#A67C52]">
                        {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNightsCount(num)}
                          className={(nightsCount === num ? 'bg-[#A67C52] text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200') + ' flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-center'}
                        >
                          {num} {num === 1 ? 'Night' : 'Nights'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Big Result Box */}
                <div className="lg:col-span-5 bg-[#FAF7F2] p-6 rounded-2xl border border-[#E5D7C5] text-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#8B6F47]">
                    Total Money You Earn
                  </div>

                  <div className="text-xs text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-[#E5D7C5] my-3">
                    {guestsCount} guests × {nightsCount} nights × ₹{pricePerNight.toLocaleString('en-IN')}
                  </div>

                  <div className="text-4xl font-black text-gray-900 my-2">
                    ₹{totalEarned.toLocaleString('en-IN')}
                  </div>

                  <div className="text-xs text-emerald-800 font-semibold bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200 inline-block my-2">
                    In Your Bank: ₹{inBank.toLocaleString('en-IN')}
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    (After 3% platform fee)
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5D7C5]">
                    <div className="text-xs text-gray-500">Every year (12 months):</div>
                    <div className="text-lg font-bold text-[#A67C52]">
                      ₹{perYear.toLocaleString('en-IN')} / year
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EARNINGS BY HOME */}
        {activeTab === 'homes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Your Properties</h2>
                <p className="text-xs text-gray-500">How much money each home earned from guests</p>
              </div>
              <Link
                to="/host/add-home"
                className="bg-[#A67C52] hover:bg-[#8B6F47] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs"
              >
                + Add Another Home
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500 text-sm">Loading properties...</div>
            ) : homes.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border border-gray-200">
                No properties registered yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {homes.map((h) => (
                  <div
                    key={h.homeId}
                    className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
                      <img
                        src={h.photoUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600'}
                        alt={h.houseName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600';
                        }}
                      />
                      <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-full text-xs font-bold text-gray-800 shadow-xs">
                        ₹{h.nightlyPrice.toLocaleString('en-IN')} / night
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{h.houseName}</h3>
                        <p className="text-xs text-gray-500">{h.location}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Stays:</span>
                          <span className="font-bold text-gray-800">{h.bookingsCount} ({h.nightsBooked} nights)</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-extrabold">
                          <span className="text-gray-700">Money Made:</span>
                          <span className="text-[#A67C52]">₹{h.grossRevenue.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMPLETED STAYS */}
        {activeTab === 'stays' && (
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Guest Stays & Payouts</h2>
                <p className="text-xs text-gray-500">Every guest stay that generated income for you</p>
              </div>
              <span className="text-xs font-semibold text-[#8B6F47] bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E5D7C5]">
                {bookings.length} Stays
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No completed bookings yet.
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 hover:bg-[#FAF7F2] rounded-xl transition border border-gray-200 gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#8B6F47] shadow-2xs shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
                          <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">
                            {b.houseName || 'Haven Property'}
                          </span>
                          <span className="text-[11px] bg-amber-100 text-[#8B6F47] px-2 py-0.5 rounded-full font-semibold">
                            {b.location}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Booked by <strong className="text-gray-700">{b.guestName || 'Guest'}</strong> • {b.nights} {b.nights === 1 ? 'Night' : 'Nights'} ({b.guests || 1} {b.guests === 1 ? 'guest' : 'guests'})
                        </div>
                        {b.checkIn && b.checkOut && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Stay Dates: {b.checkIn} → {b.checkOut}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200">
                      <div className="text-sm font-extrabold text-gray-900">
                        ₹{Number(b.totalPrice).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-bold">
                        ✓ ₹{Number(b.netPayout || Math.round(b.totalPrice * 0.97)).toLocaleString('en-IN')} to Host
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default HostWealthDashboard;

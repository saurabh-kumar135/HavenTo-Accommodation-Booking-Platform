import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHostHomes, deleteHome, getHostWealthAnalytics, createBooking } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Navbar from '../../components/Navbar';
import HomeCard from '../../components/HomeCard';
import BookingModal from '../../components/BookingModal';

const HostHomeList = () => {
  const { showToast } = useToast();
  const [homes, setHomes] = useState([]);
  const [wealthSummary, setWealthSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedHomeForBooking, setSelectedHomeForBooking] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [homesRes, wealthRes] = await Promise.allSettled([
        getHostHomes(),
        getHostWealthAnalytics(),
      ]);

      if (homesRes.status === 'fulfilled' && homesRes.value?.data?.success) {
        setHomes(homesRes.value.data.registeredHomes);
      }
      if (wealthRes.status === 'fulfilled' && wealthRes.value?.data?.success) {
        setWealthSummary(wealthRes.value.data.summary);
      }
    } catch (error) {
      console.error('Error fetching host data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (homeId) => {
    if (confirm('Are you sure you want to delete this home?')) {
      try {
        await deleteHome(homeId);
        setHomes(prev => prev.filter(home => home._id !== homeId));
      } catch (error) {
        console.error('Error deleting home:', error);
      }
    }
  };

  const handleOpenBookingModal = (homeId) => {
    const target = homes.find(h => (h._id || h.id) === homeId);
    if (target) {
      setSelectedHomeForBooking(target);
    }
  };

  const handleConfirmBooking = async (bookingData) => {
    try {
      const res = await createBooking(bookingData);
      if (res.data?.success) {
        setSelectedHomeForBooking(null);
        showToast('Stay booked successfully! Revenue credited to your host earnings.', 'success');
        fetchData();
      }
    } catch (error) {
      console.error('Error booking home:', error);
      const msg = error.response?.data?.detail || error.response?.data?.message || 'Failed to book home.';
      showToast(msg, 'error');
    }
  };

  return (
    <>
      <Navbar currentPage="host-homes" />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Host Revenue & Wealth Quick Summary Banner */}
        {wealthSummary && (
          <div className="bg-gradient-to-r from-[#FAF7F2] to-white border border-[#EADBCC] rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F0E8] text-[#8B6F47] text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Host Financial Snapshot</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Your Host Portfolio & Revenue
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Track actual income across all your properties and simulate future wealth growth.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-[11px] font-bold text-gray-400 uppercase">Gross Revenue</div>
                  <div className="text-lg font-extrabold text-gray-900">
                    ₹{wealthSummary.totalGrossRevenue.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-[11px] font-bold text-gray-400 uppercase">Net Take-Home</div>
                  <div className="text-lg font-extrabold text-emerald-700">
                    ₹{wealthSummary.netPayout.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-[11px] font-bold text-gray-400 uppercase">Total Stays</div>
                  <div className="text-lg font-extrabold text-amber-700">
                    {wealthSummary.totalBookings} Bookings
                  </div>
                </div>

                <Link
                  to="/host/wealth"
                  className="bg-[#A67C52] hover:bg-[#8B6F47] text-white px-5 py-3 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M12 7.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
                    <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.625v-9.75ZM8.25 9.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM18.75 9a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008ZM4.5 9.75A.75.75 0 0 1 5.25 9h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75V9.75Z" clipRule="evenodd" />
                    <path d="M2.25 18a.75.75 0 0 0 0 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 0 0-.75-.75H2.25Z" />
                  </svg>
                  <span>View Host Earnings</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Your Registered Homes
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Manage your deployed rental properties and monitor their availability.
              </p>
            </div>

            <Link
              to="/host/add-home"
              className="bg-[#A67C52] hover:bg-[#8B6F47] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 self-start sm:self-auto"
            >
              <span>+</span>
              <span>Deploy New Home</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading your properties...</div>
          ) : homes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-600 font-medium">No homes registered yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Deploy your first property to start generating host wealth!
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-6">
              {homes.map(home => (
                <HomeCard 
                  key={home._id} 
                  home={home}
                  showDetails={true}
                  showBook={true}
                  onBook={handleOpenBookingModal}
                  showEdit={true}
                  showDelete={true}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BookingModal 
        isOpen={Boolean(selectedHomeForBooking)}
        home={selectedHomeForBooking}
        onClose={() => setSelectedHomeForBooking(null)}
        onConfirm={handleConfirmBooking}
      />
    </>
  );
};

export default HostHomeList;

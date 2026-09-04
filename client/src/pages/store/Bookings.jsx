import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBookings, cancelBooking } from '../../services/api';
import Navbar from '../../components/Navbar';
import CancelBookingModal from '../../components/CancelBookingModal';
import { getImageUrl } from '../../config/api';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await getBookings();
      if (response.data.success) {
        setBookings(response.data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async ({ bookingId, reason, reasonDetails }) => {
    setIsCancelling(true);
    try {
      const res = await cancelBooking(bookingId, { reason, reasonDetails });
      if (res.data.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId
              ? {
                  ...b,
                  status: 'cancelled',
                  cancellationReason: reason,
                  cancellationDetails: reasonDetails,
                  cancelledAt: new Date(),
                }
              : b
          )
        );
        setSelectedBookingForCancel(null);
        setToastMessage({
          type: 'success',
          text: res.data.message || 'Booking cancelled successfully. Dates are now released for other guests.',
        });
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(error.response?.data?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getHomeImage = (home) => {
    if (home?.photos && home.photos.length > 0) {
      return getImageUrl(home.photos[0]);
    }
    if (home?.photo) {
      return getImageUrl(home.photo);
    }
    return 'https://via.placeholder.com/400x300?text=No+Image';
  };

  return (
    <>
      <Navbar currentPage="bookings" />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Toast notification */}
        {toastMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-900">
              ✕
            </button>
          </div>
        )}

        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Bookings</h1>
            <p className="text-gray-500 mt-1">Manage and view all your confirmed trips and reservations</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#A67C52]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span>Cancellation allowed up to 24h before check-in with a solid reason.</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#A67C52] border-t-transparent"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="w-16 h-16 bg-orange-50 text-[#A67C52] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.253 3.75m3 0h-16.5m16.5 0v11.25A2.25 2.25 0 0118 20.25H6a2.25 2.25 0 01-2.25-2.25V7.5m16.5 0v-1.5a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v1.5m16.5 0h-16.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No bookings yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">You haven't reserved any accommodations yet. Explore our homes and book your next trip!</p>
            <Link 
              to="/homes" 
              className="inline-block bg-[#A67C52] hover:bg-[#8B6F47] text-white px-6 py-3 rounded-xl font-semibold shadow-md transition"
            >
              Explore Stays
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookings.map((booking) => {
              const home = booking.home;
              if (!home) return null;

              const isCancelled = booking.status === 'cancelled';
              const checkInDate = booking.checkIn ? new Date(booking.checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
              const checkOutDate = booking.checkOut ? new Date(booking.checkOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

              // Calculate 24-hour cancellation policy eligibility
              const now = new Date();
              let isCancellable = false;
              let policyLabel = '';
              let policySubtext = '';

              if (!isCancelled) {
                if (booking.checkIn) {
                  const checkInTime = new Date(booking.checkIn).getTime();
                  const cutoff = checkInTime - 24 * 60 * 60 * 1000;
                  if (now.getTime() <= cutoff) {
                    isCancellable = true;
                    const cutoffStr = new Date(cutoff).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    policyLabel = `Free cancellation until ${cutoffStr}`;
                    policySubtext = 'Solid reason required (24h before check-in)';
                  } else {
                    isCancellable = false;
                    policyLabel = 'Cancellation window closed';
                    policySubtext = 'Within 24h of check-in • Non-refundable';
                  }
                } else if (booking.createdAt) {
                  const createdTime = new Date(booking.createdAt).getTime();
                  const cutoff = createdTime + 24 * 60 * 60 * 1000;
                  if (now.getTime() <= cutoff) {
                    isCancellable = true;
                    policyLabel = 'Eligible for cancellation';
                    policySubtext = 'Within 24h of booking creation';
                  } else {
                    isCancellable = false;
                    policyLabel = 'Cancellation window closed';
                    policySubtext = 'More than 24h since booking';
                  }
                }
              }

              return (
                <div 
                  key={booking._id} 
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition duration-200 flex flex-col justify-between ${
                    isCancelled ? 'border-red-200 opacity-90' : 'border-gray-200'
                  }`}
                >
                  <div className="relative">
                    <img 
                      src={getHomeImage(home)} 
                      alt={home.houseName} 
                      className={`w-full h-48 object-cover ${isCancelled ? 'grayscale-40' : ''}`}
                    />
                    <span 
                      className={`absolute top-3 right-3 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow ${
                        isCancelled ? 'bg-red-600' : 'bg-green-600'
                      }`}
                    >
                      {isCancelled ? 'Cancelled' : (booking.status || 'Confirmed')}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className={`text-xl font-bold mb-1 ${isCancelled ? 'text-gray-600 line-through' : 'text-gray-800'}`}>
                        {home.houseName}
                      </h3>
                      <p className="text-gray-500 text-sm flex items-center gap-1 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {home.location}
                      </p>

                      {/* Cancelled Summary Banner */}
                      {isCancelled && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-900 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-red-700">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reservation Cancelled
                          </div>
                          {booking.cancellationReason && (
                            <p className="text-gray-700">
                              <span className="font-semibold text-red-800">Reason:</span> {booking.cancellationReason}
                            </p>
                          )}
                          {booking.cancellationDetails && (
                            <p className="text-gray-500 italic text-[11px] line-clamp-2">
                              "{booking.cancellationDetails}"
                            </p>
                          )}
                          <p className="text-emerald-700 font-semibold text-[11px] pt-1 flex items-center gap-1">
                            ✓ Dates released — Home is now available for other guests.
                          </p>
                        </div>
                      )}

                      {/* Policy Banner for Active Bookings */}
                      {!isCancelled && (
                        <div className={`rounded-xl p-2.5 mb-4 text-xs flex items-center justify-between border ${
                          isCancellable 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}>
                          <div>
                            <p className="font-semibold">{policyLabel}</p>
                            <p className="text-[11px] opacity-80">{policySubtext}</p>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${isCancellable ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        </div>
                      )}

                      {/* Dates & Guests section */}
                      <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1 text-sm border border-gray-100">
                        {checkInDate && checkOutDate ? (
                          <div className="flex justify-between text-gray-700">
                            <span className="text-gray-500">Dates:</span>
                            <span className={`font-semibold ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                              {checkInDate} – {checkOutDate}
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-gray-700">
                            <span className="text-gray-500">Booked On:</span>
                            <span className="font-semibold">{new Date(booking.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}

                        {booking.guests && (
                          <div className="flex justify-between text-gray-700">
                            <span className="text-gray-500">Guests:</span>
                            <span className="font-semibold">{booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-gray-700 border-t border-gray-200 pt-1 mt-1">
                          <span className="text-gray-500">Total Price:</span>
                          <span className={`font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-[#A67C52]'}`}>
                            ₹{booking.totalPrice || home.price}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link 
                        to={`/homes/${home._id}`}
                        className="flex-1 text-center py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-xl transition"
                      >
                        View Property
                      </Link>

                      {!isCancelled && (
                        isCancellable ? (
                          <button
                            onClick={() => setSelectedBookingForCancel(booking)}
                            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-semibold rounded-xl transition flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel Stay
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Cannot cancel within 24 hours of check-in under policy"
                            className="px-4 py-2.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-xl cursor-not-allowed border border-gray-200"
                          >
                            Window Closed
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancellation Modal */}
      <CancelBookingModal
        isOpen={Boolean(selectedBookingForCancel)}
        booking={selectedBookingForCancel}
        onClose={() => setSelectedBookingForCancel(null)}
        onConfirmCancel={handleConfirmCancel}
        isSubmitting={isCancelling}
      />
    </>
  );
};

export default Bookings;

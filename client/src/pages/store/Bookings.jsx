import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBookings } from '../../services/api';
import Navbar from '../../components/Navbar';
import { getImageUrl } from '../../config/api';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Bookings</h1>
          <p className="text-gray-500 mt-1">Manage and view all your confirmed trips and reservations</p>
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

              const checkInDate = booking.checkIn ? new Date(booking.checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
              const checkOutDate = booking.checkOut ? new Date(booking.checkOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

              return (
                <div 
                  key={booking._id} 
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition duration-200 flex flex-col justify-between"
                >
                  <div className="relative">
                    <img 
                      src={getHomeImage(home)} 
                      alt={home.houseName} 
                      className="w-full h-48 object-cover"
                    />
                    <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                      {booking.status || 'Confirmed'}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{home.houseName}</h3>
                      <p className="text-gray-500 text-sm flex items-center gap-1 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {home.location}
                      </p>

                      {/* Dates & Guests section */}
                      <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1 text-sm border border-gray-100">
                        {checkInDate && checkOutDate ? (
                          <div className="flex justify-between text-gray-700">
                            <span className="text-gray-500">Dates:</span>
                            <span className="font-semibold">{checkInDate} – {checkOutDate}</span>
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
                          <span className="text-gray-500">Total Paid:</span>
                          <span className="font-bold text-[#A67C52]">
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
};

export default Bookings;

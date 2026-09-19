import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavourites, removeFromFavourite, createBooking } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Navbar from '../../components/Navbar';
import HomeCard from '../../components/HomeCard';
import BookingModal from '../../components/BookingModal';

const FavouriteList = () => {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHomeForBooking, setSelectedHomeForBooking] = useState(null);
  const { user, updateFavourites } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFavourites();
  }, []);

  const fetchFavourites = async () => {
    try {
      const response = await getFavourites();
      if (response.data.success) {
        setFavourites(response.data.favouriteHomes || []);
      }
    } catch (error) {
      console.error('Error fetching favourites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavourite = async (homeId) => {
    try {
      const res = await removeFromFavourite(homeId);
      if (res.data?.favourites) {
        updateFavourites(res.data.favourites);
      } else if (user?.favourites) {
        updateFavourites(user.favourites.filter((f) => String(f) !== String(homeId)));
      }
      setFavourites((prev) => prev.filter((home) => (home._id || home.id) !== homeId));
      showToast('Removed from favourites', 'info');
    } catch (error) {
      console.error('Error removing from favourites:', error);
      showToast(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to remove favourite',
        'error'
      );
    }
  };

  const handleOpenBookingModal = (homeId) => {
    const home = favourites.find((h) => (h._id || h.id) === homeId);
    if (home) {
      setSelectedHomeForBooking(home);
    }
  };

  const handleConfirmBooking = async (bookingData) => {
    try {
      const res = await createBooking(bookingData);
      if (res.data.success) {
        setSelectedHomeForBooking(null);
        showToast('Booking confirmed successfully! 🎉', 'success');
        navigate('/bookings');
      }
    } catch (error) {
      console.error('Error booking home:', error);
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to book home. Please try again.';
      showToast(msg, 'error');
    }
  };

  return (
    <>
      <Navbar currentPage="favourites" />
      <main className="container mx-auto bg-white shadow-lg rounded-2xl p-8 mt-10 max-w-6xl">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Your Favourites</h2>
            <p className="text-sm text-gray-500 mt-1">Homes and places you have saved</p>
          </div>
          <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold border border-rose-200">
            {favourites.length} {favourites.length === 1 ? 'saved home' : 'saved homes'}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#A67C52] border-t-transparent"></div>
            <p className="mt-3 text-gray-500 text-sm">Loading your favourites...</p>
          </div>
        ) : favourites.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">❤️</div>
            <p className="text-xl font-bold text-gray-800 mb-2">No favourites yet</p>
            <p className="text-gray-500 mb-6 text-sm">Browse our registered homes and tap the heart icon to save places here.</p>
            <button
              onClick={() => navigate('/homes')}
              className="bg-[#A67C52] hover:bg-[#8B6F47] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition"
            >
              Explore Homes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {favourites.map((home) => (
              <HomeCard 
                key={home._id || home.id} 
                home={home}
                isFavourite={true}
                showDetails={true}
                showBook={true}
                showRemoveFavourite={true}
                onBook={handleOpenBookingModal}
                onRemoveFavourite={handleRemoveFavourite}
              />
            ))}
          </div>
        )}
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

export default FavouriteList;

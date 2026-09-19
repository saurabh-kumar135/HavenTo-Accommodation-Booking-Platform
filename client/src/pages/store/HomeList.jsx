import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHomes, addToFavourite, removeFromFavourite, createBooking } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Navbar from '../../components/Navbar';
import HomeCard from '../../components/HomeCard';
import BookingModal from '../../components/BookingModal';

const HomeList = () => {
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHomeForBooking, setSelectedHomeForBooking] = useState(null);
  const { isLoggedIn, user, updateFavourites } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHomes();
  }, []);

  const fetchHomes = async () => {
    try {
      const response = await getHomes();
      if (response.data.success) {
        setHomes(response.data.registeredHomes);
      }
    } catch (error) {
      console.error('Error fetching homes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavourite = async (homeId) => {
    if (!isLoggedIn) {
      showToast('Please login to save favourites', 'info');
      navigate('/login');
      return;
    }
    try {
      const response = await addToFavourite(homeId);
      if (response.data.success) {
        if (response.data.favourites) {
          updateFavourites(response.data.favourites);
        } else if (user?.favourites) {
          updateFavourites([...user.favourites, String(homeId)]);
        }
        showToast('Saved to your favourites! ❤️', 'success');
      }
    } catch (error) {
      console.error('Error adding to favourites:', error);
      if (error.response?.status === 401) {
        showToast('Please login to save favourites', 'info');
        navigate('/login');
      } else {
        showToast(
          error.response?.data?.detail ||
          error.response?.data?.message ||
          'Failed to add to favourites',
          'error'
        );
      }
    }
  };

  const handleRemoveFavourite = async (homeId) => {
    try {
      const response = await removeFromFavourite(homeId);
      if (response.data.success) {
        if (response.data.favourites) {
          updateFavourites(response.data.favourites);
        } else if (user?.favourites) {
          updateFavourites(user.favourites.filter((f) => String(f) !== String(homeId)));
        }
        showToast('Removed from favourites', 'info');
      }
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
    if (!isLoggedIn) {
      showToast('Please login to book a home', 'info');
      navigate('/login');
      return;
    }
    const home = homes.find((h) => (h._id || h.id) === homeId);
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
      <Navbar currentPage="Home" />
      <main className="container mx-auto bg-white shadow-lg rounded-lg p-8 mt-10 max-w-6xl">
        <h2 className="text-3xl text-red-500 font-bold text-center mb-6">
          Here are our registered homes:
        </h2>
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {homes.map((home) => (
              <HomeCard 
                key={home._id || home.id} 
                home={home}
                showDetails={true}
                showBook={true}
                showFavourite={true}
                onBook={handleOpenBookingModal}
                onAddFavourite={handleAddFavourite}
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

export default HomeList;

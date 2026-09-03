import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHomes, addToFavourite, createBooking } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import HomeCard from '../../components/HomeCard';
import BookingModal from '../../components/BookingModal';

const HomeList = () => {
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHomeForBooking, setSelectedHomeForBooking] = useState(null);
  const { isLoggedIn } = useAuth();
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
    try {
      await addToFavourite(homeId);
      navigate('/favourites'); 
    } catch (error) {
      console.error('Error adding to favourites:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleOpenBookingModal = (homeId) => {
    if (!isLoggedIn) {
      alert('Please login to book a home');
      navigate('/login');
      return;
    }
    const home = homes.find(h => h._id === homeId);
    if (home) {
      setSelectedHomeForBooking(home);
    }
  };

  const handleConfirmBooking = async (bookingData) => {
    try {
      const res = await createBooking(bookingData);
      if (res.data.success) {
        setSelectedHomeForBooking(null);
        alert('Booking confirmed successfully!');
        navigate('/bookings');
      }
    } catch (error) {
      console.error('Error booking home:', error);
      alert(error.response?.data?.message || 'Failed to book home. Please try again.');
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
            {homes.map(home => (
              <HomeCard 
                key={home._id} 
                home={home}
                showDetails={true}
                showBook={isLoggedIn}
                showFavourite={isLoggedIn}
                onBook={handleOpenBookingModal}
                onAddFavourite={handleAddFavourite}
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

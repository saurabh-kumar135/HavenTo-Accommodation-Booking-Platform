import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHomeDetails, addToFavourite, createBooking } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { getImageUrl } from '../../config/api';
import BookingModal from '../../components/BookingModal';

const HomeDetail = () => {
  const { homeId } = useParams();
  const [home, setHome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); 
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHomeDetails();
  }, [homeId]);

  const fetchHomeDetails = async () => {
    try {
      const response = await getHomeDetails(homeId);
      if (response.data.success) {
        setHome(response.data.home);
      }
    } catch (error) {
      console.error('Error fetching home details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavourite = async () => {
    try {
      await addToFavourite(homeId);
      navigate('/favourites');
    } catch (error) {
      console.error('Error adding to favourites:', error);
    }
  };

  const handleOpenBookingModal = () => {
    if (!isLoggedIn) {
      alert('Please login to book a home');
      navigate('/login');
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = async (bookingData) => {
    try {
      const res = await createBooking(bookingData);
      if (res.data.success) {
        setIsBookingModalOpen(false);
        alert('Booking confirmed successfully!');
        navigate('/bookings');
      }
    } catch (error) {
      console.error('Error booking home:', error);
      alert(error.response?.data?.message || 'Failed to book home. Please try again.');
    }
  };

  const getImages = () => {
    if (home.photos && home.photos.length > 0) {
      return home.photos.map(photo => getImageUrl(photo));
    }
    if (home.photo) {
      return [getImageUrl(home.photo)];
    }
    return ['https://via.placeholder.com/800x600?text=No+Image'];
  };

  if (loading) {
    return (
      <>
        <Navbar currentPage="Home" />
        <main className="container mx-auto bg-white shadow-lg rounded-lg p-8 mt-10 max-w-6xl">
          <div className="text-center">Loading...</div>
        </main>
      </>
    );
  }

  if (!home) {
    return (
      <>
        <Navbar currentPage="Home" />
        <main className="container mx-auto bg-white shadow-lg rounded-lg p-8 mt-10 max-w-6xl">
          <div className="text-center text-red-500">Home not found</div>
        </main>
      </>
    );
  }

  const images = getImages();

  if (showAllPhotos) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {}
        <div className="flex justify-between items-center p-4">
          <h2 className="text-white text-xl font-semibold">
            {selectedImageIndex + 1} / {images.length}
          </h2>
          <button 
            onClick={() => setShowAllPhotos(false)}
            className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition font-semibold"
          >
            ✕ Close
          </button>
        </div>

        {}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative max-w-6xl w-full h-full flex items-center justify-center">
            <img 
              src={images[selectedImageIndex]} 
              alt={`${home.houseName} - Photo ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />

            {}
            {images.length > 1 && selectedImageIndex > 0 && (
              <button
                onClick={() => setSelectedImageIndex(selectedImageIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black p-4 rounded-full transition shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            {}
            {images.length > 1 && selectedImageIndex < images.length - 1 && (
              <button
                onClick={() => setSelectedImageIndex(selectedImageIndex + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black p-4 rounded-full transition shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {}
        <div className="bg-black/50 p-4 overflow-x-auto">
          <div className="flex gap-2 justify-center">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`flex-shrink-0 ${
                  index === selectedImageIndex 
                    ? 'ring-4 ring-white' 
                    : 'opacity-60 hover:opacity-100'
                } transition rounded-lg overflow-hidden`}
              >
                <img 
                  src={img} 
                  alt={`Thumbnail ${index + 1}`}
                  className="w-20 h-20 object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar currentPage="Home" />
      <main className="container mx-auto px-4 mt-8 mb-16 max-w-7xl">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          {home.houseName}
        </h2>
        
        {}
        <div className="relative mb-8">
          {images.length === 1 ? (
            
            <div className="rounded-2xl overflow-hidden">
              <img 
                src={images[0]} 
                alt={home.houseName}
                className="w-full h-96 object-cover cursor-pointer hover:opacity-95 transition"
                onClick={() => {
                  setSelectedImageIndex(0);
                  setShowAllPhotos(true);
                }}
              />
            </div>
          ) : images.length === 2 ? (
            
            <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
              {images.map((img, index) => (
                <img 
                  key={index}
                  src={img} 
                  alt={`${home.houseName} ${index + 1}`}
                  className="w-full h-96 object-cover cursor-pointer hover:opacity-90 transition"
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setShowAllPhotos(true);
                  }}
                />
              ))}
            </div>
          ) : (
            
            <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden h-96">
              {}
              <div 
                className="col-span-2 row-span-2 cursor-pointer hover:opacity-90 transition"
                onClick={() => {
                  setSelectedImageIndex(0);
                  setShowAllPhotos(true);
                }}
              >
                <img 
                  src={images[0]} 
                  alt={`${home.houseName} 1`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {}
              <div 
                className="col-span-1 row-span-1 cursor-pointer hover:opacity-90 transition"
                onClick={() => {
                  setSelectedImageIndex(1);
                  setShowAllPhotos(true);
                }}
              >
                <img 
                  src={images[1] || images[0]} 
                  alt={`${home.houseName} 2`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div 
                className="col-span-1 row-span-1 cursor-pointer hover:opacity-90 transition"
                onClick={() => {
                  setSelectedImageIndex(2);
                  setShowAllPhotos(true);
                }}
              >
                <img 
                  src={images[2] || images[0]} 
                  alt={`${home.houseName} 3`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {}
              <div 
                className="col-span-1 row-span-1 cursor-pointer hover:opacity-90 transition"
                onClick={() => {
                  setSelectedImageIndex(3);
                  setShowAllPhotos(true);
                }}
              >
                <img 
                  src={images[3] || images[0]} 
                  alt={`${home.houseName} 4`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div 
                className="col-span-1 row-span-1 relative cursor-pointer hover:opacity-90 transition"
                onClick={() => {
                  setSelectedImageIndex(4);
                  setShowAllPhotos(true);
                }}
              >
                <img 
                  src={images[4] || images[0]} 
                  alt={`${home.houseName} 5`}
                  className="w-full h-full object-cover"
                />
                {}
                {images.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold">+{images.length - 5} more</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {}
          <div className="md:col-span-2 space-y-6">
            <div className="border-b pb-6">
              <h3 className="text-2xl font-semibold mb-2">{home.houseName}</h3>
              <div className="flex items-center gap-4 text-gray-600">
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {home.location}
                </span>
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                  {home.rating} / 10
                </span>
              </div>
            </div>

            <div className="border-b pb-6">
              <h3 className="text-xl font-semibold mb-3">Description</h3>
              <p className="text-gray-600 leading-relaxed">{home.description}</p>
            </div>
          </div>
          
          {}
          <div className="md:col-span-1">
            <div className="border rounded-2xl p-6 shadow-lg sticky top-8">
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">₹{home.price}</span>
                  <span className="text-gray-600">/ night</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {isLoggedIn ? (
                  <>
                    <button 
                      onClick={handleOpenBookingModal}
                      className="w-full bg-[#A67C52] text-white px-6 py-3.5 rounded-xl hover:bg-[#8B6F47] transition font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.253 3.75m3 0h-16.5m16.5 0v11.25A2.25 2.25 0 0118 20.25H6a2.25 2.25 0 01-2.25-2.25V7.5m16.5 0v-1.5a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v1.5m16.5 0h-16.5" />
                      </svg>
                      Book Home Now
                    </button>

                    <button 
                      onClick={handleAddFavourite}
                      className="w-full bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition font-semibold flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                      Add to Favourite
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => navigate('/login')}
                    className="w-full bg-[#A67C52] text-white px-6 py-3.5 rounded-xl hover:bg-[#8B6F47] transition font-semibold flex items-center justify-center gap-2"
                  >
                    Login to Book
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <BookingModal 
        isOpen={isBookingModalOpen}
        home={home}
        onClose={() => setIsBookingModalOpen(false)}
        onConfirm={handleConfirmBooking}
      />
    </>
  );
};

export default HomeDetail;

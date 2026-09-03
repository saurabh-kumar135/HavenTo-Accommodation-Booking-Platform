import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIndex, addToFavourite, createBooking } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import HomeCard from '../../components/HomeCard';
import Footer from '../../components/Footer';

const Index = () => {
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [searchCity, setSearchCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [guests, setGuests] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All', icon: '🏠' },
    { id: 'beachfront', name: 'Beachfront', icon: '🏖️' },
    { id: 'trending', name: 'Trending', icon: '🔥' },
    { id: 'cabins', name: 'Cabins', icon: '🏕️' },
    { id: 'luxury', name: 'Luxury', icon: '💎' },
    { id: 'countryside', name: 'Countryside', icon: '🌾' },
    { id: 'lakefront', name: 'Lakefront', icon: '🏞️' },
    { id: 'amazing-views', name: 'Amazing views', icon: '🌄' },
    { id: 'tiny-homes', name: 'Tiny homes', icon: '🏡' },
    { id: 'treehouses', name: 'Treehouses', icon: '🌳' },
  ];

  const filteredHomes = homes.filter(home => {
    
    const matchesCity = searchCity === '' || 
      home.location.toLowerCase().includes(searchCity.toLowerCase());

    const homePrice = Number(home.price);
    const matchesMinPrice = minPrice === '' || homePrice >= Number(minPrice);
    const matchesMaxPrice = maxPrice === '' || homePrice <= Number(maxPrice);

    const matchesCategory = selectedCategory === 'all';
    
    return matchesCity && matchesMinPrice && matchesMaxPrice && matchesCategory;
  });

  useEffect(() => {
    fetchHomes();
  }, []);

  const fetchHomes = async () => {
    try {
      const response = await getIndex();
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
      const response = await addToFavourite(homeId);
      if (response.data.success) {
        alert('Added to favourites!');
        // Optionally refresh the homes list or update UI
      }
    } catch (error) {
      console.error('Error adding to favourites:', error);
      if (error.response?.status === 401) {
        alert('Please login to add favorites');
        navigate('/login');
      } else {
        alert('Failed to add to favourites');
      }
    }
  };

  const handleBookHome = async (homeId) => {
    if (!isLoggedIn) {
      alert('Please login to book a home');
      navigate('/login');
      return;
    }
    try {
      const res = await createBooking(homeId);
      if (res.data.success) {
        alert('Booking confirmed!');
        navigate('/bookings');
      }
    } catch (error) {
      console.error('Error booking home:', error);
      alert(error.response?.data?.message || 'Failed to book home. Please try again.');
    }
  };

  const handleSearch = () => {
    
  };

  return (
    <>
      <Navbar currentPage="index" />
      
      {}
      <div className="relative bg-gradient-to-r from-red-50 to-orange-50 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-12">
          {}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
              Find your next <span className="text-[#A67C52]">adventure</span>
            </h1>
            <p className="text-gray-600 text-lg">
              Discover amazing places to stay around the world
            </p>
          </div>

          {}
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3">
              <div className="flex flex-col lg:flex-row items-center gap-3">
                
                {}
                <div className="flex-1 w-full px-4 py-3 hover:bg-gray-50 rounded-xl transition cursor-pointer border border-transparent hover:border-gray-200">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Where
                  </label>
                  <input
                    type="text"
                    placeholder="Search destinations"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="w-full text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none font-medium"
                  />
                </div>

                {}
                <div className="flex-1 w-full px-4 py-3 hover:bg-gray-50 rounded-xl transition cursor-pointer border border-transparent hover:border-gray-200">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Price From
                  </label>
                  <input
                    type="number"
                    placeholder="Min price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none font-medium"
                  />
                </div>

                {}
                <div className="hidden lg:block w-px h-12 bg-gray-200"></div>

                {}
                <div className="flex-1 w-full px-4 py-3 hover:bg-gray-50 rounded-xl transition cursor-pointer border border-transparent hover:border-gray-200">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Price To
                  </label>
                  <input
                    type="number"
                    placeholder="Max price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none font-medium"
                  />
                </div>

                {}
                <button
                  onClick={handleSearch}
                  className="bg-[#A67C52] hover:bg-[#8B6F47] text-white px-8 py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 font-semibold"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2.5} 
                    stroke="currentColor" 
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <span className="hidden md:inline">Search</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {}
      <main className="container mx-auto px-4 mt-8 mb-16">

        {}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {searchCity ? `Stays in ${searchCity}` : 'Available Homes'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing <span className="font-semibold text-[#A67C52]">{filteredHomes.length}</span> of {homes.length} properties
            </p>
          </div>
          
          {}
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition flex items-center gap-2 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Filters
            </button>
          </div>
        </div>

        {}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#A67C52] border-t-transparent"></div>
            <p className="mt-4 text-gray-500 font-medium">Finding amazing places for you...</p>
          </div>
        ) : filteredHomes.length === 0 ? (
          <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
            <div className="text-8xl mb-6">🏠</div>
            <p className="text-2xl text-gray-700 font-bold mb-2">No homes found</p>
            <p className="text-gray-500 mb-6">Try adjusting your search criteria or explore different categories</p>
            <button 
              onClick={() => {
                setSearchCity('');
                setMinPrice('');
                setMaxPrice('');
                setGuests('');
                setSelectedCategory('all');
              }}
              className="bg-[#A67C52] hover:bg-[#8B6F47] text-white px-6 py-3 rounded-lg font-medium transition"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredHomes.map(home => (
              <HomeCard 
                key={home._id} 
                home={home}
                showDetails={true}
                showBook={isLoggedIn}
                showFavourite={isLoggedIn}
                onBook={handleBookHome}
                onAddFavourite={handleAddFavourite}
              />
            ))}
          </div>
        )}
      </main>

      {}
      <Footer />
    </>
  );
};

export default Index;

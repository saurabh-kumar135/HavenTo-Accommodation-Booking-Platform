import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addHome, editHome, getEditHome, predictDynamicPrice } from '../../services/api';
import Navbar from '../../components/Navbar';
import ErrorAlert from '../../components/ErrorAlert';

const AddEditHome = () => {
  const { homeId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!homeId;
  
  const [formData, setFormData] = useState({
    houseName: '',
    price: '',
    location: '',
    rating: '',
    description: '',
  });
  const [photos, setPhotos] = useState([]); 
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mlRecommendation, setMlRecommendation] = useState(null);
  const [loadingMl, setLoadingMl] = useState(false);

  const handleSuggestMLPrice = async () => {
    setLoadingMl(true);
    try {
      const res = await predictDynamicPrice({
        location: formData.location.trim() || 'Taharpur',
        category: 'Trending',
        guests: 4,
        rating: parseFloat(formData.rating) || 4.8
      });
      if (res.data?.success) {
        setMlRecommendation(res.data);
      }
    } catch (err) {
      console.error('Failed to get ML price recommendation:', err);
    } finally {
      setLoadingMl(false);
    }
  };

  const handleApplyMLPrice = () => {
    if (mlRecommendation?.recommended_price) {
      setFormData(prev => ({
        ...prev,
        price: mlRecommendation.recommended_price
      }));
    }
  };

  useEffect(() => {
    if (isEditing) {
      fetchHomeData();
    }
  }, [homeId]);

  const fetchHomeData = async () => {
    try {
      const response = await getEditHome(homeId);
      if (response.data.success) {
        const home = response.data.home;
        setFormData({
          houseName: home.houseName || '',
          price: home.price || '',
          location: home.location || '',
          rating: home.rating || '',
          description: home.description || '',
        });
      }
    } catch (error) {
      console.error('Error fetching home:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    
    setPhotos(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    const data = new FormData();
    data.append('houseName', formData.houseName);
    data.append('price', formData.price);
    data.append('location', formData.location);
    data.append('rating', formData.rating);
    data.append('description', formData.description);

    if (photos.length > 0) {
      photos.forEach(photo => {
        data.append('photos', photo); 
      });
    }
    
    if (isEditing) {
      data.append('id', homeId);
    }

    try {
      let response;
      if (isEditing) {
        response = await editHome(data);
      } else {
        response = await addHome(data);
      }
      
      if (response.data.success) {
        navigate('/host/host-home-list');
      } else {
        setErrors([response.data.message || 'Operation failed']);
      }
    } catch (error) {
      setErrors([error.response?.data?.message || 'An error occurred']);
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar currentPage={isEditing ? 'host-homes' : 'addHome'} />
      <main className="container mx-auto mt-8 p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          {isEditing ? 'Edit' : 'Register'} Your Home on HavenTo
        </h1>
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <ErrorAlert errors={errors} />
          
          <input
            type="text"
            name="houseName"
            value={formData.houseName}
            onChange={handleChange}
            placeholder="Enter your House Name"
            className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Price Per Night (₹ or $)"
                className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <button
                type="button"
                onClick={handleSuggestMLPrice}
                disabled={loadingMl}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3 py-2 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title="Get algorithmic price suggestion based on location & market demand"
              >
                {loadingMl ? 'Evaluating...' : '✨ Suggest ML Price'}
              </button>
            </div>

            {mlRecommendation && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-emerald-800">
                    ML Benchmark: ₹{mlRecommendation.recommended_price}/night
                  </span>
                  <span className="ml-2 text-emerald-600 font-medium">
                    ({mlRecommendation.demand_tier})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyMLPrice}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[11px] transition cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Location"
            className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
          <input
            type="text"
            name="rating"
            value={formData.rating}
            onChange={handleChange}
            placeholder="Rating"
            className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
          <input
            type="file"
            name="photos"
            accept="image/jpg, image/jpeg, image/png"
            onChange={handleFileChange}
            multiple
            className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <p className="text-sm text-gray-500 mb-4">You can select up to 5 images</p>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your home"
            className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition duration-300"
          >
            {loading ? 'Processing...' : (isEditing ? 'Update Home' : 'Add Home')}
          </button>
        </form>
      </main>
    </>
  );
};

export default AddEditHome;

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addHome, editHome, getEditHome, predictDynamicPrice } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import ErrorAlert from '../../components/ErrorAlert';
import GoogleMapPickerModal from '../../components/GoogleMapPickerModal';
import HostKycModal from '../../components/HostKycModal';

const AddEditHome = () => {
  const { user } = useAuth();
  const { homeId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!homeId;
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    houseName: '',
    price: '',
    location: '',
    latitude: '',
    longitude: '',
    rating: '',
    description: '',
  });
  const [photos, setPhotos] = useState([]); 
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
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
          latitude: home.latitude != null ? String(home.latitude) : '',
          longitude: home.longitude != null ? String(home.longitude) : '',
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

    if (!user?.hostKyc?.isVerified) {
      setIsKycModalOpen(true);
      setErrors(['Host identity verification required before adding or editing a property. Please complete Aadhaar or PAN KYC.']);
      setLoading(false);
      return;
    }

    const data = new FormData();
    data.append('houseName', formData.houseName);
    data.append('price', formData.price);
    data.append('location', formData.location);
    if (formData.latitude) data.append('latitude', formData.latitude);
    if (formData.longitude) data.append('longitude', formData.longitude);
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
      const errData = error.response?.data;
      const errMsg = errData?.detail 
        ? (typeof errData.detail === 'string' ? errData.detail : (Array.isArray(errData.detail) ? errData.detail.map(d => d.msg || d.message).join(', ') : JSON.stringify(errData.detail)))
        : (errData?.message || error.message || 'An error occurred');
      setErrors([errMsg]);
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

        {/* KYC Verification Banner */}
        <div className="max-w-md mx-auto mb-6">
          {user?.hostKyc?.isVerified ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM13.707 8.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-emerald-900">Verified Host Account</div>
                  <div className="text-[11px] text-emerald-700">
                    Authenticated with <span className="uppercase font-bold">{user.hostKyc.documentType}</span> ({user.hostKyc.maskedNumber})
                  </div>
                </div>
              </div>
              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl shadow-sm flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Identity Verification Required</h3>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    HavenTo prevents fake listings. You must verify your government ID (Aadhaar or PAN) to publish properties.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKycModalOpen(true)}
                className="w-full py-2 px-3 bg-[#A67C52] hover:bg-[#8B6F47] text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow"
              >
                <span>🇮🇳 Verify with Aadhaar or PAN</span>
              </button>
            </div>
          )}
        </div>

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
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Property Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter city or address (e.g. Mumbai, Goa)"
                className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                required
              />
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-md transition flex items-center gap-1.5 shrink-0"
                title="Choose exact spot on Google Maps"
              >
                <svg className="w-4 h-4 fill-current text-rose-500" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span>Google Maps</span>
              </button>
            </div>
            {formData.latitude && formData.longitude && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                <span className="font-mono">
                  📍 Coordinates: {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="text-rose-600 hover:underline font-semibold"
                >
                  Adjust Pin
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            name="rating"
            value={formData.rating}
            onChange={handleChange}
            placeholder="Rating (e.g. 4.8)"
            className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
            required
          />
          <input
            type="file"
            name="photos"
            accept="image/jpg, image/jpeg, image/png"
            onChange={handleFileChange}
            multiple
            className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
          />
          <p className="text-sm text-gray-500 mb-4">You can select up to 5 images</p>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your home"
            className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#A67C52] text-white py-3 rounded-xl hover:bg-[#8B6F47] font-semibold transition duration-300 shadow-md"
          >
            {loading ? 'Processing...' : (isEditing ? 'Update Home' : 'Add Home')}
          </button>
        </form>

        <GoogleMapPickerModal
          isOpen={isMapPickerOpen}
          onClose={() => setIsMapPickerOpen(false)}
          initialLocation={formData.location}
          initialLatitude={formData.latitude}
          initialLongitude={formData.longitude}
          onSelectLocation={({ location, latitude, longitude }) => {
            setFormData(prev => ({
              ...prev,
              location,
              latitude: latitude != null ? String(latitude) : '',
              longitude: longitude != null ? String(longitude) : '',
            }));
          }}
        />

        <HostKycModal
          isOpen={isKycModalOpen}
          onClose={() => setIsKycModalOpen(false)}
          onSuccess={() => {
            setIsKycModalOpen(false);
            setErrors([]);
          }}
        />
      </main>
    </>
  );
};

export default AddEditHome;

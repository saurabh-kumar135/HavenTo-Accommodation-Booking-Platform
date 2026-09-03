import { Link } from 'react-router-dom';
import { getImageUrl } from '../config/api';

const HomeCard = ({ home, showDetails, showFavourite, showBook, showRemoveFavourite, showEdit, showDelete, onAddFavourite, onBook, onRemoveFavourite, onDelete }) => {
  
  const getHomeImageUrl = () => {
    if (home.photos && home.photos.length > 0) {
      return getImageUrl(home.photos[0]);
    }
    
    if (home.photo) {
      return getImageUrl(home.photo);
    }
    return 'https://via.placeholder.com/400x300?text=No+Image';
  };

  const imageUrl = getHomeImageUrl();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300 w-full max-w-sm">
      <img src={imageUrl} alt={home.houseName} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{home.houseName}</h3>
        <p className="text-gray-600 mb-2">
          <i className="fas fa-map-marker-alt mr-2"></i>{home.location}
        </p>
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold text-red-500">Rs{home.price} / night</span>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400 mr-1">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">{home.rating}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {showDetails && (
            <Link to={`/homes/${home._id}`} className="bg-blue-300 p-2 hover:bg-blue-400">Details</Link>
          )}

          {showBook && onBook && (
            <button onClick={() => onBook(home._id)} className="bg-[#A67C52] hover:bg-[#8B6F47] text-white p-2 font-medium">
              Book Home
            </button>
          )}
          
          {showFavourite && onAddFavourite && (
            <button onClick={() => onAddFavourite(home._id)} className="bg-green-300 p-2 hover:bg-green-500">
              Add to Favourite
            </button>
          )}
          
          {showRemoveFavourite && onRemoveFavourite && (
            <button onClick={() => onRemoveFavourite(home._id)} className="bg-red-300 p-2 hover:bg-red-400">
              Remove from favourite
            </button>
          )}
          
          {showEdit && (
            <Link to={`/host/edit-home/${home._id}`} className="bg-blue-500 p-2 text-white">Edit</Link>
          )}
          
          {showDelete && onDelete && (
            <button onClick={() => onDelete(home._id)} className="bg-red-500 p-2 text-white">Delete</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeCard;

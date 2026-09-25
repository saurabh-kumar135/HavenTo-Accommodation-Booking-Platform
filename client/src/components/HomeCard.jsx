import { Link } from 'react-router-dom';
import { getImageUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';

const HomeCard = ({
  home,
  showDetails,
  showFavourite,
  showBook,
  showRemoveFavourite,
  showEdit,
  showDelete,
  showTour,
  onAddFavourite,
  onBook,
  onRemoveFavourite,
  onDelete,
  isFavourite: isFavouriteProp,
}) => {
  const { user } = useAuth();
  const homeId = home._id || home.id;

  const isFav =
    typeof isFavouriteProp === 'boolean'
      ? isFavouriteProp
      : Boolean(
          user?.favourites?.some((fav) => String(fav?._id || fav) === String(homeId))
        );

  const getHomeImageUrl = () => {
    if (home.photos && home.photos.length > 0) {
      return getImageUrl(home.photos[0]);
    }
    if (home.photo) {
      return getImageUrl(home.photo);
    }
    return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80';
  };

  const imageUrl = getHomeImageUrl();

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFav) {
      if (onRemoveFavourite) {
        onRemoveFavourite(homeId);
      } else if (onAddFavourite) {
        onAddFavourite(homeId);
      }
    } else {
      if (onAddFavourite) {
        onAddFavourite(homeId);
      }
    }
  };

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col justify-between w-full max-w-sm">
      {/* Top Image Container with Floating Heart */}
      <div className="relative w-full h-52 overflow-hidden bg-gray-100">
        <Link to={`/homes/${homeId}`} className="block w-full h-full">
          <img
            src={imageUrl}
            alt={home.houseName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80';
            }}
          />
        </Link>

        {/* Floating Heart Button */}
        {(onAddFavourite || onRemoveFavourite || showFavourite || showRemoveFavourite) && (
          <button
            type="button"
            onClick={handleHeartClick}
            aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
            className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white transition-all transform active:scale-75 shadow-md flex items-center justify-center focus:outline-none"
          >
            {isFav ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 text-rose-500 animate-heartPop"
              >
                <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-white hover:text-rose-300 transition-colors"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Card Details */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-[#A67C52] transition-colors">
              <Link to={`/homes/${homeId}`}>{home.houseName}</Link>
            </h3>
            <div className="flex items-center gap-1 shrink-0 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-amber-400"
              >
                <path
                  fillRule="evenodd"
                  d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs font-bold text-gray-700">
                {home.rating || '4.8'}
              </span>
            </div>
          </div>

          <p className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
            <span className="truncate">{home.location}</span>
          </p>

          <div className="mb-4">
            <span className="text-lg font-extrabold text-gray-900">
              ₹{home.price}
            </span>
            <span className="text-xs text-gray-500 font-normal"> / night</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          {showDetails && (
            <Link
              to={`/homes/${homeId}`}
              className="flex-1 text-center py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 transition"
            >
              Details
            </Link>
          )}

          {showBook && onBook && (
            <button
              type="button"
              onClick={() => onBook(homeId)}
              className="flex-1 py-2 px-3 bg-[#A67C52] hover:bg-[#8B6F47] text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.253 3.75m3 0h-16.5m16.5 0v11.25A2.25 2.25 0 0 1 18 20.25H6a2.25 2.25 0 0 1-2.25-2.25V7.5m16.5 0v-1.5a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v1.5m16.5 0h-16.5"
                />
              </svg>
              Book
            </button>
          )}

          {showFavourite && onAddFavourite && !isFav && (
            <button
              type="button"
              onClick={() => onAddFavourite(homeId)}
              className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-1"
              title="Save to Favourites"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
              Save
            </button>
          )}

          {showFavourite && isFav && !showRemoveFavourite && (
            <button
              type="button"
              onClick={() => (onRemoveFavourite ? onRemoveFavourite(homeId) : onAddFavourite(homeId))}
              className="py-2 px-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl border border-rose-500 transition flex items-center justify-center gap-1 shadow-sm"
              title="Saved to Favourites (Click to remove)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3.5 h-3.5 text-white"
              >
                <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
              </svg>
              Saved
            </button>
          )}

          {showRemoveFavourite && onRemoveFavourite && (
            <button
              type="button"
              onClick={() => onRemoveFavourite(homeId)}
              className="py-2 px-3 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 font-semibold text-xs rounded-xl border border-gray-200 hover:border-red-200 transition flex items-center justify-center gap-1"
              title="Remove from Favourites"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
              Remove
            </button>
          )}

          {showTour && (
            <Link
              to={`/tour/property_${homeId}?homeId=${homeId}`}
              className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl border border-red-200 transition flex items-center justify-center gap-1"
              title="Enter Virtual Tour Room"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Tour
            </Link>
          )}

          {showEdit && (
            <Link
              to={`/host/edit-home/${homeId}`}
              className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs rounded-xl border border-blue-200 transition"
            >
              Edit
            </Link>
          )}

          {showDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(homeId)}
              className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl border border-red-200 transition"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeCard;


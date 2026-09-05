import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ currentPage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-[#D4B896] text-white p-4 shadow-md sticky top-0 z-10">
      <nav className="container mx-auto">
        {}
        <div className="hidden md:flex md:justify-between md:items-center">
          <ul className="flex items-center flex-wrap gap-1">
            <li>
              <Link
                to="/"
                className={`${currentPage === 'index' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-4 rounded-lg transition duration-300 flex items-center gap-2`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
                <span className="font-semibold">HavenTo</span>
              </Link>
            </li>

            {isLoggedIn && (
              <>
                {user && user.userType === 'guest' ? (
                  <>
                    <li>
                      <Link
                        to="/homes"
                        className={`${currentPage === 'Home' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-4 rounded-lg transition duration-300 flex items-center`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                          <path d="M19.006 3.705a.75.75 0 00-.512-1.41L6 6.838V3a.75.75 0 00-.75-.75h-1.5A.75.75 0 003 3v4.93l-1.006.365a.75.75 0 00.512 1.41l16.5-6z" />
                          <path fillRule="evenodd" d="M3.019 11.115L18 5.667V9.09l4.006 1.456a.75.75 0 11-.512 1.41l-.494-.18v8.475h.75a.75.75 0 010 1.5H2.25a.75.75 0 010-1.5H3v-9.129l.019-.006zM18 20.25v-9.565l1.5.545v9.02H18zm-9-6a.75.75 0 00-.75.75v4.5c0 .414.336.75.75.75h3a.75.75 0 00.75-.75V15a.75.75 0 00-.75-.75H9z" clipRule="evenodd" />
                        </svg>
                        Homes
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/favourites"
                        className={`${currentPage === 'favourites' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-4 rounded-lg transition duration-300 flex items-center`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                        Favourites
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/bookings"
                        className={`${currentPage === 'bookings' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-4 rounded-lg transition duration-300 flex items-center`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                          <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.25 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.75 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM10.5 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM12.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM14.25 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 13.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                          <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                        </svg>
                        Bookings
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link
                        to="/host/host-home-list"
                        className={`${currentPage === 'host-homes' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-4 rounded-lg transition duration-300 flex items-center`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                          <path d="M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 007.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 004.902-5.652l-1.3-1.299a1.875 1.875 0 00-1.325-.549H5.223z" />
                          <path fillRule="evenodd" d="M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 009.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 002.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 010 1.5H2.25a.75.75 0 010-1.5H3zm3-6a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-3zm8.25-.75a.75.75 0 00-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 00.75-.75v-5.25a.75.75 0 00-.75-.75h-3z" clipRule="evenodd" />
                        </svg>
                        Host Homes
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/host/pricing-intelligence"
                        className={`${currentPage === 'pricing' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-4 rounded-lg transition duration-300 flex items-center`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                          <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                        </svg>
                        Revenue Insights
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/host/add-home"
                        className={`${currentPage === 'addHome' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-4 rounded-lg transition duration-300 flex items-center`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                          <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                        </svg>
                        Add Home
                      </Link>
                    </li>
                  </>
                )}
              </>
            )}
          </ul>

          <ul className="flex items-center gap-2">
            {!isLoggedIn ? (
              <>
                <li>
                  <Link
                    to="/signup"
                    className={`${currentPage === 'signup' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-4 rounded-lg transition duration-300 border border-white`}
                  >
                    SignUp
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className={`${currentPage === 'login' ? 'bg-white text-[#8B6F47] font-medium' : 'bg-white text-[#8B6F47] hover:bg-[#F5F0E8]'} py-2 px-4 rounded-lg transition duration-300`}
                  >
                    Login
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <button
                  onClick={handleLogout}
                  className="hover:bg-[#C4A57B] py-2 px-4 rounded-lg transition duration-300 border border-white flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                    <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm5.03 4.72a.75.75 0 010 1.06l-1.72 1.72h10.94a.75.75 0 010 1.5H10.81l1.72 1.72a.75.75 0 11-1.06 1.06l-3-3a.75.75 0 010-1.06l3-3a.75.75 0 011.06 0z" clipRule="evenodd" />
                  </svg>
                  Logout
                </button>
              </li>
            )}
          </ul>
        </div>

        {}
        <div className="md:hidden">
          <div className="flex justify-between items-center">
            <Link
              to="/"
              className={`flex items-center gap-2 py-2 px-3 rounded-lg transition duration-300 ${currentPage === 'index' ? 'bg-[#A67C52] font-medium' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
              <span className="font-semibold">HavenTo</span>
            </Link>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-[#C4A57B]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="mt-2">
              <ul className="flex flex-col space-y-1 border-t border-[#C4A57B] pt-2 mt-2">
                {isLoggedIn ? (
                  <>
                    {user && user.userType === 'guest' ? (
                      <>
                        <li>
                          <Link to="/homes" className={`${currentPage === 'Home' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-3 rounded-lg flex items-center`}>
                            Homes-List
                          </Link>
                        </li>
                        <li>
                          <Link to="/favourites" className={`${currentPage === 'favourites' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-3 rounded-lg flex items-center`}>
                            Favourites
                          </Link>
                        </li>
                        <li>
                          <Link to="/bookings" className={`${currentPage === 'bookings' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-3 rounded-lg flex items-center`}>
                            Bookings
                          </Link>
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          <Link to="/host/host-home-list" className={`${currentPage === 'host-homes' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-3 rounded-lg flex items-center`}>
                            Host Homes
                          </Link>
                        </li>
                        <li>
                          <Link to="/host/pricing-intelligence" className={`${currentPage === 'pricing' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-3 rounded-lg flex items-center`}>
                            Revenue Insights
                          </Link>
                        </li>
                        <li>
                          <Link to="/host/add-home" className={`${currentPage === 'addHome' ? 'bg-[#A67C52] font-medium' : 'hover:bg-[#C4A57B]'} py-2 px-3 rounded-lg flex items-center`}>
                            Add Home
                          </Link>
                        </li>
                      </>
                    )}
                    <li className="pt-2 border-t border-[#C4A57B] mt-2">
                      <button onClick={handleLogout} className="hover:bg-[#C4A57B] py-2 px-3 rounded-lg w-full text-left flex items-center">
                        Logout
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link to="/signup" className="hover:bg-[#C4A57B] py-2 px-3 rounded-lg block">SignUp</Link>
                    </li>
                    <li>
                      <Link to="/login" className="bg-white text-[#8B6F47] hover:bg-[#F5F0E8] py-2 px-3 rounded-lg block mt-2">Login</Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;

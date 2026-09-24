import React, { useState } from 'react';
import { verifyHostKyc } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Client-side Verhoeff validation helper for instant UI feedback
const dTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const pTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];
function checkVerhoeff(str) {
  let c = 0;
  const digits = str.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) {
    c = dTable[c][pTable[i % 8][digits[i]]];
  }
  return c === 0;
}

const HostKycModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, isLoggedIn, setUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('aadhaar'); // 'aadhaar' | 'pan'
  const [aadhaarRaw, setAadhaarRaw] = useState('');
  const [aadhaarName, setAadhaarName] = useState(
    user ? ((user.firstName || '') + ' ' + (user.lastName || '')).trim() : ''
  );
  const [panNumber, setPanNumber] = useState('');
  const [panName, setPanName] = useState(
    user ? ((user.firstName || '') + ' ' + (user.lastName || '')).trim() : ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifiedData, setVerifiedData] = useState(null);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showPan, setShowPan] = useState(false);

  if (!isOpen) return null;

  // Format Aadhaar with spaces: 1234 5678 9012
  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarRaw(raw);
    setError(null);
  };

  const getFormattedAadhaar = () => {
    return (aadhaarRaw.match(/.{1,4}/g) || []).join(' ');
  };

  const handlePanChange = (e) => {
    const raw = e.target.value.toUpperCase().slice(0, 10);
    setPanNumber(raw);
    setError(null);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isLoggedIn && !user) {
      setError('You must be logged in to verify your identity. Please log in to your account first.');
      return;
    }

    setLoading(true);

    try {
      let payload = {};
      if (activeTab === 'aadhaar') {
        if (aadhaarRaw.length !== 12 || !/^\d{12}$/.test(aadhaarRaw)) {
          setError('Aadhaar number must be exactly 12 numeric digits.');
          setLoading(false);
          return;
        }
        if (!aadhaarName.trim()) {
          setError('Please enter your full name as printed on your Aadhaar card.');
          setLoading(false);
          return;
        }
        payload = {
          documentType: 'aadhaar',
          documentNumber: aadhaarRaw,
          fullName: aadhaarName.trim()
        };
      } else {
        const isPanValid = panNumber.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]/.test(panNumber);
        if (!isPanValid) {
          setError('PAN must be 10 characters in standard format (e.g. ABCPK1234F).');
          setLoading(false);
          return;
        }
        if (!panName.trim()) {
          setError('Please enter your full legal name as printed on your PAN card.');
          setLoading(false);
          return;
        }
        payload = {
          documentType: 'pan',
          documentNumber: panNumber,
          fullName: panName.trim()
        };
      }

      const res = await verifyHostKyc(payload);
      if (res.data && res.data.success) {
        setVerifiedData(res.data.hostKyc);
        if (setUser) {
          setUser((prev) => ({
            ...prev,
            userType: 'host',
            hostKyc: res.data.hostKyc
          }));
        }
        showToast('Host identity verified successfully!', 'success');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(res.data.hostKyc);
          }, 1500);
        }
      } else {
        setError((res.data && res.data.message) || 'Verification failed. Please check your details.');
      }
    } catch (err) {
      console.error('KYC verification error:', err);
      if (err.response && err.response.status === 401) {
        setError('Authentication required. Please log in to your HavenTo account first.');
        return;
      }
      const detailMsg =
        typeof err.response?.data?.detail === 'string'
          ? err.response?.data?.detail
          : Array.isArray(err.response?.data?.detail)
          ? err.response?.data?.detail[0]?.msg
          : null;
      const serverMsg =
        err.response?.data?.message ||
        detailMsg ||
        err.response?.data?.errors?.[0];
      const msg =
        serverMsg ||
        (err.code === 'ERR_NETWORK' || !err.response
          ? 'Cannot connect to backend server. Please ensure the backend is running on port 3009.'
          : 'Identity verification failed. Please check your document information.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#D4B896]/40 transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#A67C52] to-[#8B6F47] px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Host Identity Verification</h2>
              <p className="text-xs text-amber-100">Verify your identity to list properties on HavenTo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-semibold leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {verifiedData ? (
            /* Success State View */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Verification Complete</h3>
              <p className="text-sm text-gray-600 mt-2">
                Your <span className="font-semibold uppercase">{verifiedData.documentType}</span> has been verified.
              </p>

              <div className="bg-amber-50 border border-[#D4B896] rounded-xl p-4 mt-5 text-left text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Document:</span>
                  <span className="font-medium text-gray-800 uppercase">{verifiedData.documentType} Card</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID Reference:</span>
                  <span className="font-mono text-gray-800">{verifiedData.maskedNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Verified Name:</span>
                  <span className="font-medium text-gray-800">{verifiedData.fullNameAsOnDoc}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-6 w-full py-3 bg-[#A67C52] hover:bg-[#8B6F47] text-white font-semibold rounded-xl transition duration-200"
              >
                Done
              </button>
            </div>
          ) : (
            /* Form View */
            <div>
              {/* Trust Banner */}
              <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-xl p-3.5 mb-5 flex items-start gap-3">
                <div className="text-[#8B6F47] mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Identity verification helps maintain trust and safety across HavenTo. Your document details are encrypted and kept confidential.
                </p>
              </div>

              {/* Login Required Notice */}
              {!isLoggedIn && !user && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <span>Please sign in to link your verified ID with your host account.</span>
                  </div>
                  <a
                    href="/login"
                    className="px-3 py-1 bg-[#A67C52] hover:bg-[#8B6F47] text-white rounded-lg font-medium transition shrink-0 ml-2"
                  >
                    Log In
                  </a>
                </div>
              )}

              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => { setActiveTab('aadhaar'); setError(null); }}
                  className={
                    'py-2 px-3 text-sm font-semibold rounded-lg transition-all ' +
                    (activeTab === 'aadhaar' ? 'bg-white text-[#8B6F47] shadow-sm' : 'text-gray-500 hover:text-gray-800')
                  }
                >
                  Aadhaar Card
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('pan'); setError(null); }}
                  className={
                    'py-2 px-3 text-sm font-semibold rounded-lg transition-all ' +
                    (activeTab === 'pan' ? 'bg-white text-[#8B6F47] shadow-sm' : 'text-gray-500 hover:text-gray-800')
                  }
                >
                  PAN Card
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                {activeTab === 'aadhaar' ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          12-Digit Aadhaar Number
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAadhaar(!showAadhaar)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B6F47] hover:text-[#A67C52] transition focus:outline-none"
                          title={showAadhaar ? "Hide Aadhaar digits for demonstration privacy" : "Show Aadhaar digits"}
                        >
                          {showAadhaar ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                              </svg>
                              <span>Hide (Unseen)</span>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              </svg>
                              <span>Show (Seen)</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showAadhaar ? "text" : "password"}
                          value={getFormattedAadhaar()}
                          onChange={handleAadhaarChange}
                          placeholder={showAadhaar ? "2345 6789 0124" : "•••• •••• ••••"}
                          maxLength={14}
                          autoComplete="off"
                          className="w-full pl-4 pr-16 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-base tracking-widest text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A67C52] focus:border-transparent transition"
                        />
                        <div className="absolute right-3 top-2.5 text-xs font-bold text-gray-400 font-mono">
                          {aadhaarRaw.length}/12
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Must not start with 0 or 1. Validated using the UIDAI Verhoeff algorithm.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Full Legal Name (as on Aadhaar)
                      </label>
                      <input
                        type="text"
                        value={aadhaarName}
                        onChange={(e) => setAadhaarName(e.target.value)}
                        placeholder="e.g. Saurabh Kumar"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A67C52] focus:border-transparent transition"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          10-Character PAN Number
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPan(!showPan)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B6F47] hover:text-[#A67C52] transition focus:outline-none"
                          title={showPan ? "Hide PAN digits for demonstration privacy" : "Show PAN digits"}
                        >
                          {showPan ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                              </svg>
                              <span>Hide (Unseen)</span>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              </svg>
                              <span>Show (Seen)</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPan ? "text" : "password"}
                          value={panNumber}
                          onChange={handlePanChange}
                          placeholder={showPan ? "ABCPK1234F" : "••••••••••"}
                          maxLength={10}
                          autoComplete="off"
                          className="w-full pl-4 pr-16 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-base uppercase tracking-widest text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A67C52] focus:border-transparent transition"
                        />
                        <div className="absolute right-3 top-2.5 text-xs font-bold text-gray-400 font-mono">
                          {panNumber.length}/10
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        4th char indicates Individual ('P'); 5th char must match your surname.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Full Name (as on PAN card)
                      </label>
                      <input
                        type="text"
                        value={panName}
                        onChange={(e) => setPanName(e.target.value)}
                        placeholder="e.g. Saurabh Kumar"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A67C52] focus:border-transparent transition"
                      />
                    </div>
                  </>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#A67C52] hover:bg-[#8B6F47] text-white font-semibold rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Verifying with Government Registry...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Verify & Activate Host Status</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostKycModal;

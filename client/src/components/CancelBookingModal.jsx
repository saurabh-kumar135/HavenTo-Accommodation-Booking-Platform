import { useState } from 'react';

const REASON_OPTIONS = [
  'Change of travel plans',
  'Found alternative accommodation',
  'Medical or personal emergency',
  'Accidental / duplicate booking',
  'Host requested cancellation',
  'Other solid reason',
];

const CancelBookingModal = ({ isOpen, onClose, booking, onConfirmCancel, isSubmitting }) => {
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [reasonDetails, setReasonDetails] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !booking) return null;

  const home = booking.home;
  const checkInDate = booking.checkIn
    ? new Date(booking.checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const checkOutDate = booking.checkOut
    ? new Date(booking.checkOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!reason) {
      setErrorMsg('Please select a cancellation reason.');
      return;
    }

    const trimmed = reasonDetails.trim();
    if (trimmed.length < 15) {
      setErrorMsg('HavenTo policy requires a solid explanation (minimum 15 characters).');
      return;
    }

    onConfirmCancel({
      bookingId: booking._id,
      reason,
      reasonDetails: trimmed,
    });
  };

  const charCount = reasonDetails.trim().length;
  const isCharValid = charCount >= 15;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
        style={{ animation: 'modalFadeIn 0.2s ease-out' }}
      >
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div className="bg-red-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold">Cancel Reservation</h3>
              <p className="text-xs text-white/80">Policy enforcement & property release</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Reservation Details Summary */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5 text-amber-600 shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <span className="font-bold">Cancellation Policy:</span> Cancellations must be made at least 24 hours prior to check-in. Upon cancellation, your reservation is immediately released so another traveler can book these dates. A solid reason is required.
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Property:</span>
              <span className="font-semibold text-gray-800">{home?.houseName || 'Accommodation'}</span>
            </div>
            {checkInDate && checkOutDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Dates:</span>
                <span className="font-semibold text-gray-800">{checkInDate} – {checkOutDate}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Total Price:</span>
              <span className="font-bold text-[#A67C52]">₹{booking.totalPrice || home?.price}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Reason Category <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none"
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  Solid Reason & Detailed Explanation <span className="text-red-500">*</span>
                </label>
                <span className={`text-[11px] font-medium ${isCharValid ? 'text-green-600' : 'text-gray-400'}`}>
                  {charCount}/15 min chars
                </span>
              </div>
              <textarea
                rows={3}
                value={reasonDetails}
                onChange={(e) => {
                  setReasonDetails(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                disabled={isSubmitting}
                placeholder="Explain the solid reason for your cancellation (e.g. sudden medical emergency, flight schedule changes, urgent personal event)..."
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                A genuine solid reason helps hosts improve and ensures fair access for other guests looking to rent.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Keep Reservation
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isCharValid}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition flex items-center gap-2 ${
                  isSubmitting || !isCharValid
                    ? 'bg-red-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Confirm Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;

import { useState, useEffect } from 'react';

const BookingModal = ({ isOpen, onClose, home, onConfirm }) => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [totalNights, setTotalNights] = useState(1);
  const [totalPrice, setTotalPrice] = useState(home?.price || 0);

  // Set initial default dates (tomorrow and 3 days later)
  useEffect(() => {
    if (isOpen && home) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 2);

      const toDateInputString = (date) => date.toISOString().split('T')[0];

      setCheckIn(toDateInputString(tomorrow));
      setCheckOut(toDateInputString(dayAfter));
      setGuests(1);
    }
  }, [isOpen, home]);

  // Recalculate nights and total price when dates change
  useEffect(() => {
    if (checkIn && checkOut && home?.price) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = end - start;
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (nights > 0) {
        setTotalNights(nights);
        setTotalPrice(nights * home.price);
      } else {
        setTotalNights(0);
        setTotalPrice(0);
      }
    }
  }, [checkIn, checkOut, home]);

  if (!isOpen || !home) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (totalNights <= 0) {
      alert('Please select a check-out date that comes after the check-in date.');
      return;
    }
    onConfirm({
      homeId: home._id,
      checkIn,
      checkOut,
      guests: Number(guests),
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
        style={{ animation: 'modalFadeIn 0.2s ease-out' }}
      >
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div className="bg-[#A67C52] text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Book Your Stay</h3>
            <p className="text-xs text-white/80">{home.houseName} • {home.location}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Check-in Date</label>
              <input
                type="date"
                min={todayStr}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#A67C52]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Check-out Date</label>
              <input
                type="date"
                min={checkIn || todayStr}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#A67C52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Number of Guests</label>
            <input
              type="number"
              min="1"
              max="20"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#A67C52]"
            />
          </div>

          {/* Pricing Calculation Summary */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>₹{home.price} × {totalNights} {totalNights === 1 ? 'night' : 'nights'}</span>
              <span>₹{totalPrice}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Service Fee</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-gray-900 text-base">
              <span>Total Amount</span>
              <span className="text-[#A67C52]">₹{totalPrice}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={totalNights <= 0}
              className="flex-1 py-3 px-4 bg-[#A67C52] hover:bg-[#8B6F47] disabled:opacity-50 text-white rounded-xl font-semibold shadow-md transition"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;

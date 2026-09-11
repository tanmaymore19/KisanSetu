import React, { useState } from 'react';
import { FarmVisitSlot, FarmVisitBooking } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  X,
  CheckCircle2,
  AlertCircle,
  Ticket,
  Sparkles,
  QrCode,
  Navigation,
  Camera,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { FarmLiveDirectionMap } from './FarmLiveDirectionMap.js';

interface SlotBookingModalProps {
  slot: FarmVisitSlot | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete: (booking: FarmVisitBooking) => void;
}

export const SlotBookingModal: React.FC<SlotBookingModalProps> = ({
  slot,
  isOpen,
  onClose,
  onBookingComplete,
}) => {
  const { user } = useAuth();
  const [visitorCount, setVisitorCount] = useState<number>(1);
  const [selectedVisitDate, setSelectedVisitDate] = useState<string>(slot?.date || '2026-09-19');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<FarmVisitBooking | null>(null);
  const [previewRouteOpen, setPreviewRouteOpen] = useState(false);

  // Sync selectedVisitDate when slot changes
  React.useEffect(() => {
    if (slot) {
      setSelectedVisitDate(slot.date);
    }
  }, [slot]);

  if (!isOpen || !slot) return null;

  const isVisitsPaused = slot.visitorsEnabled === false || slot.status === 'closed' || slot.status === 'cancelled';
  const isWeeklyActive = slot.isWeeklyActive || (slot.endDate && slot.endDate !== slot.date);
  const remainingSpots = Math.max(0, slot.maxVisitors - slot.bookedCount);
  const totalAmount = visitorCount * slot.pricePerPerson;

  const handleConfirmBooking = async () => {
    if (!user) return;
    if (isVisitsPaused) {
      setError(slot.disableReason || 'Visits to this farm are currently stopped by the farmer.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.createBooking({
        slotId: slot.id,
        consumerId: user.id,
        visitorCount,
        visitDate: selectedVisitDate || slot.date,
        specialNotes,
      });
      setConfirmedBooking(res.booking);
      onBookingComplete(res.booking);
    } catch (err: any) {
      setError(err.message || 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`bg-[#FAF8F5] rounded-3xl w-full ${
          confirmedBooking ? 'max-w-2xl' : 'max-w-md'
        } max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95 my-auto`}
      >
        {/* Header */}
        <div className="bg-[#5D7A4F] p-4 text-white flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#EBF1E8]" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-serif">
                {confirmedBooking ? 'Farm Visit Pass Confirmed' : 'Book Farm Visit Slot'}
              </h3>
              <p className="text-[11px] text-[#EBF1E8]">{slot.farmName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 text-[#2D3A26]">
          {confirmedBooking ? (
            /* ================= BOOKING CONFIRMATION & LIVE ROUTE ================= */
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg font-bold font-serif text-[#2D3A26]">
                  Visit Slot Confirmed! 🎉
                </h4>
                <p className="text-xs text-[#5D6D56] mt-0.5">
                  Your entry pass is generated and the grower has been notified. Below is your live map and directions to find the farm easily!
                </p>
              </div>

              {/* Ticket Card */}
              <div className="p-4 bg-[#EBF1E8] border-2 border-dashed border-[#8A9A5B] rounded-2xl text-left space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#D4CDBC] pb-2">
                  <span className="text-[11px] font-bold text-[#5D7A4F] uppercase tracking-wider">
                    FARM ENTRY PASS
                  </span>
                  <span className="text-xs font-mono font-bold bg-white px-2.5 py-0.5 rounded-md border border-[#D4CDBC] text-[#5D7A4F] shadow-2xs">
                    {confirmedBooking.bookingCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#5D6D56] block">Farm Destination</span>
                    <span className="font-bold text-[#2D3A26] truncate block font-serif">
                      {confirmedBooking.farmName}
                    </span>
                    <span className="text-[11px] text-[#5D6D56] block truncate">
                      {slot.farmLocation}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5D6D56] block">Date & Time</span>
                    <span className="font-bold text-[#2D3A26] block">
                      {confirmedBooking.date}
                    </span>
                    <span className="text-[11px] text-[#5D6D56] block">
                      {confirmedBooking.startTime} - {confirmedBooking.endTime}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#D4CDBC] pt-2">
                  <div>
                    <span className="text-[10px] text-[#5D6D56] block">Visitors Booked</span>
                    <span className="font-bold text-[#2D3A26]">
                      {confirmedBooking.visitorCount} Person(s)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5D6D56] block">Total Amount</span>
                    <span className="font-bold text-[#5D7A4F] font-serif">
                      {confirmedBooking.totalAmount > 0
                        ? `₹${confirmedBooking.totalAmount}`
                        : 'Free Entry'}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-[#5D7A4F] font-medium">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" /> Present this pass upon arrival at the farm entry gate.
                </div>
              </div>

              {/* Requirement: Live consumer location to farm direction map */}
              <div className="pt-2 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-4 h-4 text-[#5D7A4F] animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5D7A4F]">
                    Live Directions & Map to Farm
                  </h4>
                </div>
                <FarmLiveDirectionMap
                  isModal={false}
                  farmName={slot.farmName}
                  farmLocation={slot.farmLocation}
                  farmLat={slot.farmLat}
                  farmLng={slot.farmLng}
                  farmerName={slot.farmerName}
                  farmerPhone={confirmedBooking.farmerPhone}
                  bookingCode={confirmedBooking.bookingCode}
                  slotDate={confirmedBooking.date}
                  slotTime={`${confirmedBooking.startTime} - ${confirmedBooking.endTime}`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Done / Return to Marketplace
                </button>
              </div>
            </div>
          ) : (
            /* ================= PRE-BOOKING FORM ================= */
            <>
              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Farm Experience Photos (if uploaded by farmer for slot) */}
              {slot.images && slot.images.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-[#5D6D56] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-[#5D7A4F]" /> Farm Photos for this Tour ({slot.images.length})
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
                    {slot.images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="w-28 h-20 shrink-0 rounded-xl overflow-hidden border border-[#D4CDBC] bg-[#FAF8F5] shadow-2xs snap-start relative group"
                      >
                        <img
                          src={imgUrl}
                          alt={`${slot.farmName} photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded-sm">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paused / Disabled Visitors Alert */}
              {isVisitsPaused && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <div className="font-bold">Farm Visits Temporarily Stopped</div>
                    <div className="text-[11px] mt-0.5">
                      {slot.disableReason || 'The farmer has temporarily paused new visitor bookings for this slot. Please check back later.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Slot Summary */}
              <div className="p-3 bg-[#F1EDE4] rounded-2xl border border-[#E5E0D5] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2D3A26] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#5D7A4F]" />
                    {isWeeklyActive ? `${slot.date} to ${slot.endDate || slot.date}` : slot.date}
                  </span>
                  <span className="font-medium text-[#5D6D56] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#8C9886]" />
                    {slot.startTime} - {slot.endTime}
                  </span>
                </div>

                {isWeeklyActive && (
                  <div className="bg-[#FAF4EB] border border-[#E8DFC8] rounded-xl p-2 text-[11px] text-[#92400E] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
                    <span>Open all week • Select your preferred visit day below</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[#5D6D56] pt-1">
                  <span>Capacity:</span>
                  <span className="font-bold text-[#5D7A4F] bg-[#EBF1E8] border border-[#D4CDBC] px-2 py-0.5 rounded-full text-[11px]">
                    {remainingSpots} spot(s) remaining
                  </span>
                </div>

                <div className="text-[11px] text-[#5D6D56] pt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0 mt-0.5" />
                  <span>{slot.farmLocation}</span>
                </div>

                <div className="text-[11px] text-[#5D6D56] pt-1">
                  <strong>Activities Included:</strong> {slot.activities.join(', ')}
                </div>

                {slot.notes && (
                  <div className="text-[11px] text-[#8C9886] pt-1 border-t border-[#D4CDBC]/60 italic">
                    Note: {slot.notes}
                  </div>
                )}
              </div>

              {/* Weekly Date Selection (If active across multiple days) */}
              {isWeeklyActive && (
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Select Your Preferred Visit Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={slot.date}
                    max={slot.endDate || slot.date}
                    value={selectedVisitDate}
                    onChange={(e) => setSelectedVisitDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  />
                  <span className="text-[10px] text-[#5D6D56] mt-0.5 block">
                    Available window: {slot.date} through {slot.endDate || slot.date}
                  </span>
                </div>
              )}

              {/* Number of Visitors */}
              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                  Select Number of Visitors
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-[#E5E0D5] rounded-xl bg-[#F1EDE4] p-1">
                    <button
                      type="button"
                      onClick={() => setVisitorCount(Math.max(1, visitorCount - 1))}
                      className="w-8 h-8 rounded-lg bg-white shadow-2xs font-bold text-[#2D3A26] hover:bg-[#FAF8F5] flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-sm text-[#2D3A26]">
                      {visitorCount}
                    </span>
                    <button
                      type="button"
                      disabled={visitorCount >= remainingSpots}
                      onClick={() =>
                        setVisitorCount(Math.min(remainingSpots, visitorCount + 1))
                      }
                      className="w-8 h-8 rounded-lg bg-white shadow-2xs font-bold text-[#2D3A26] hover:bg-[#FAF8F5] disabled:opacity-40 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-[#8C9886]">
                    Max allowed for this slot: {remainingSpots}
                  </span>
                </div>
              </div>

              {/* Visitor Details Pre-filled */}
              <div className="p-3 bg-[#EBF1E8]/60 rounded-2xl border border-[#D4CDBC] text-xs space-y-1">
                <span className="font-semibold text-[#2D3A26] block text-[11px]">
                  Booking For:
                </span>
                <div className="font-medium text-[#2D3A26]">
                  {user?.fullName} ({user?.phone || 'No phone'})
                </div>
                <div className="text-[11px] text-[#5D6D56]">{user?.email}</div>
              </div>

              {/* Price Calculation */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F1EDE4] border border-[#E5E0D5] text-xs">
                <div>
                  <span className="text-[#5D6D56] block text-[11px]">
                    Entry Fee ({visitorCount} × ₹{slot.pricePerPerson})
                  </span>
                  <span className="text-base font-extrabold text-[#5D7A4F] font-serif">
                    {totalAmount > 0 ? `₹${totalAmount}` : 'Free Entry'}
                  </span>
                </div>
                <span className="text-[10px] text-[#5D7A4F] font-semibold bg-[#EBF1E8] border border-[#D4CDBC] px-2 py-0.5 rounded-md">
                  Pay At Farm or Online
                </span>
              </div>

              {/* Toggle Live Direction Preview */}
              <div>
                <button
                  type="button"
                  onClick={() => setPreviewRouteOpen(!previewRouteOpen)}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#F1EDE4] border border-[#D4CDBC] text-xs font-semibold text-[#5D7A4F] flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" />
                    {previewRouteOpen ? 'Hide Route Preview' : 'Preview Live Route from My Location'}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${previewRouteOpen ? 'rotate-90' : ''}`} />
                </button>

                {previewRouteOpen && (
                  <div className="mt-2">
                    <FarmLiveDirectionMap
                      isModal={false}
                      farmName={slot.farmName}
                      farmLocation={slot.farmLocation}
                      farmLat={slot.farmLat}
                      farmLng={slot.farmLng}
                      farmerName={slot.farmerName}
                    />
                  </div>
                )}
              </div>

              {/* Confirm Booking Button */}
              <button
                type="button"
                disabled={loading || remainingSpots <= 0 || isVisitsPaused}
                onClick={handleConfirmBooking}
                className="w-full py-3 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] disabled:bg-[#E5E0D5] disabled:text-[#8C9886] text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading
                  ? 'Confirming Visit...'
                  : isVisitsPaused
                  ? 'Visits Stopped by Farmer'
                  : remainingSpots <= 0
                  ? 'Slot Fully Booked'
                  : 'Confirm Farm Visit Booking'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F]" />
                <span>Go Back to Farm Visits</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

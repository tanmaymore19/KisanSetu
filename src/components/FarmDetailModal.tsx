import React, { useState, useEffect } from 'react';
import { Product, FarmVisitSlot, User } from '../types.js';
import { api, calculateDistanceKm } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  MapPin,
  X,
  Sprout,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Trees,
  Award,
  Plus,
  ShoppingBag,
  Star,
  Phone,
  CheckCircle2,
  Camera,
  ArrowLeft,
} from 'lucide-react';

interface FarmDetailModalProps {
  farmerId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onBookSlot: (slot: FarmVisitSlot) => void;
}

export const FarmDetailModal: React.FC<FarmDetailModalProps> = ({
  farmerId,
  isOpen,
  onClose,
  onAddToCart,
  onBookSlot,
}) => {
  const { user } = useAuth();
  const [farmer, setFarmer] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [slots, setSlots] = useState<FarmVisitSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && farmerId) {
      setLoading(true);
      Promise.all([
        api.getMe(farmerId),
        api.getProducts({ farmerId }),
        api.getSlots({ farmerId }),
      ])
        .then(([farmerRes, prodRes, slotRes]) => {
          setFarmer(farmerRes.user);
          setProducts(prodRes);
          setSlots(slotRes);
        })
        .catch((err) => console.error('Error fetching farm details:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, farmerId]);

  if (!isOpen) return null;

  const farmDetails = farmer?.farmDetails;
  const userLat = user?.currentBrowsingLocation?.lat || 18.5590;
  const userLng = user?.currentBrowsingLocation?.lng || 73.7868;
  const distanceKm = farmDetails
    ? calculateDistanceKm(userLat, userLng, farmDetails.lat, farmDetails.lng)
    : 12.5;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#FAF8F5] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-[#E5E0D5] flex flex-col animate-in fade-in zoom-in-95">
        {/* Banner with Farm image */}
        <div className="relative h-44 sm:h-52 shrink-0 bg-[#2D3A26]">
          <img
            src={
              farmDetails?.bannerImage ||
              'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1000&q=80'
            }
            alt="Farm Banner"
            className="w-full h-full object-cover brightness-90"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center gap-1.5 backdrop-blur-md text-xs font-bold transition-all shadow-md cursor-pointer group"
            title="Go back to Market"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#5D7A4F]/90 text-xs font-semibold backdrop-blur-xs">
                {farmDetails?.farmingStyle || 'Organic'} Farming
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-serif mt-1 drop-shadow-sm">
                {farmDetails?.farmName || 'Participating Agro Farm'}
              </h2>
              <p className="text-xs text-[#EBF1E8] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#A8C398]" />
                {farmDetails?.locationAddress} ({distanceKm} km away)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-[#2D3A26]">
          {loading ? (
            <div className="py-12 text-center text-[#8C9886] text-sm">
              Loading farm information...
            </div>
          ) : (
            <>
              {/* Farmer Bio & Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#EBF1E8] p-3 rounded-2xl border border-[#D4CDBC] text-center text-xs">
                <div>
                  <span className="text-[#5D6D56] block text-[11px]">Grower</span>
                  <span className="font-bold text-[#2D3A26] truncate block">
                    {farmer?.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-[#5D6D56] block text-[11px]">Farm Size</span>
                  <span className="font-bold text-[#2D3A26]">
                    {farmDetails?.farmSize} {farmDetails?.farmSizeUnit}s
                  </span>
                </div>
                <div>
                  <span className="text-[#5D6D56] block text-[11px]">Experience</span>
                  <span className="font-bold text-[#2D3A26]">
                    {farmDetails?.experienceYears}+ Years
                  </span>
                </div>
                <div>
                  <span className="text-[#5D6D56] block text-[11px]">Farm Type</span>
                  <span className="font-bold text-[#2D3A26] truncate block">
                    {farmDetails?.farmType || 'Orchard'}
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56] mb-1">
                  About the Farm
                </h3>
                <p className="text-xs sm:text-sm text-[#5D6D56] leading-relaxed">
                  {farmDetails?.bio ||
                    'Dedicated to sustainable agro-practices, natural soil replenishment, and supplying fresh, chemical-free harvests to families.'}
                </p>
              </div>

              {/* Authentic Farm Photos Gallery */}
              {farmDetails?.farmPhotos && farmDetails.farmPhotos.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56] mb-2 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#5D7A4F]" />
                    Authentic Farm Pictures ({farmDetails.farmPhotos.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {farmDetails.farmPhotos.map((photo, pIdx) => (
                      <div
                        key={pIdx}
                        className="rounded-xl overflow-hidden border border-[#D4CDBC] bg-[#FAF8F5] shadow-2xs aspect-4/3 relative group"
                      >
                        <img
                          src={photo}
                          alt={`Farm photo ${pIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {pIdx === 0 && (
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white font-medium">
                            Main Cover
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Crops Grown */}
              {farmDetails?.cropsGrown && farmDetails.cropsGrown.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56] mb-1.5">
                    Crops Grown On This Farm
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {farmDetails.cropsGrown.map((crop) => (
                      <span
                        key={crop}
                        className="text-xs bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC] px-2.5 py-0.5 rounded-full font-medium"
                      >
                        🌱 {crop}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Harvest Products Available from this Farm */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-[#2D3A26] font-serif flex items-center gap-1.5">
                    <Sprout className="w-4 h-4 text-[#5D7A4F]" />
                    Available Produce From This Farm ({products.length})
                  </h3>
                </div>

                {products.length === 0 ? (
                  <p className="text-xs text-[#8C9886] italic">
                    No produce listed for sale currently.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.map((p) => {
                      const isOutOfStock = p.quantity <= 0 || p.status === 'out_of_stock';
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 p-2.5 rounded-2xl border border-[#E5E0D5] bg-white hover:border-[#8A9A5B] transition-all"
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-16 h-16 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[#2D3A26] font-serif truncate">
                              {p.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-xs">
                              <span className="font-extrabold text-[#5D7A4F] font-serif">
                                ₹{p.pricePerUnit}
                              </span>
                              <span className="text-[#5D6D56]">/{p.unit}</span>
                              <span className="text-[10px] text-[#8C9886]">
                                ({p.quantity} {p.unit} left)
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                                  isOutOfStock
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC]'
                                }`}
                              >
                                {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                              </span>
                              <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={() => onAddToCart(p)}
                                className="px-2.5 py-1 rounded-lg bg-[#5D7A4F] hover:bg-[#4B633F] disabled:bg-[#E5E0D5] disabled:text-[#8C9886] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Add
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Farm Visit Slots */}
              <div className="pt-2 border-t border-[#E5E0D5]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-[#2D3A26] font-serif flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#5D7A4F]" />
                    Farm Visit Slots ({slots.length})
                  </h3>
                </div>

                {slots.length === 0 ? (
                  <p className="text-xs text-[#8C9886] italic">
                    No visit slots published yet for this farm.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot) => {
                      const isVisitsPaused =
                        slot.visitorsEnabled === false || slot.status === 'closed' || slot.status === 'cancelled';
                      const isWeeklyActive =
                        slot.isWeeklyActive || (slot.endDate && slot.endDate !== slot.date);
                      const isFull =
                        slot.bookedCount >= slot.maxVisitors || slot.status === 'full';
                      const remaining = Math.max(0, slot.maxVisitors - slot.bookedCount);
                      return (
                        <div
                          key={slot.id}
                          className="p-3 rounded-2xl border border-[#D4CDBC] bg-[#EBF1E8]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[#2D3A26]">
                                📅 {isWeeklyActive ? `${slot.date} to ${slot.endDate || slot.date}` : slot.date}
                              </span>
                              <span className="text-xs font-medium text-[#5D6D56] flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {slot.startTime} - {slot.endTime}
                              </span>
                              {isWeeklyActive && (
                                <span className="text-[10px] text-[#92400E] bg-[#FAF4EB] border border-[#E8DFC8] px-2 py-0.5 rounded-md font-medium">
                                  All Week Active
                                </span>
                              )}
                              {isVisitsPaused && (
                                <span className="text-[10px] text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md font-medium">
                                  Visits Paused
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#5D6D56] mt-0.5">
                              Activities: {slot.activities.join(' • ')}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <span className="font-bold text-[#5D7A4F] font-serif">
                                {slot.pricePerPerson > 0
                                  ? `₹${slot.pricePerPerson} / visitor`
                                  : 'Free Entry'}
                              </span>
                              <span className="text-[11px] text-[#5D6D56]">
                                ({remaining} spots open of {slot.maxVisitors})
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isFull || isVisitsPaused}
                            onClick={() => {
                              onBookSlot(slot);
                              onClose();
                            }}
                            className="px-4 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] disabled:bg-[#E5E0D5] disabled:text-[#8C9886] text-white text-xs font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                          >
                            {isVisitsPaused ? 'Visits Paused' : isFull ? 'Slot Full' : 'Book Visit Slot →'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer with Go Back */}
        <div className="p-3.5 bg-[#F1EDE4] border-t border-[#E5E0D5] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] text-[#2D3A26] border border-[#D4CDBC] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F] group-hover:-translate-x-0.5 transition-transform" />
            <span>Go Back</span>
          </button>
          <span className="text-[11px] text-[#5D6D56] font-medium">
            {farmDetails?.farmName || 'KisanSetu Farm Network'}
          </span>
        </div>
      </div>
    </div>
  );
};

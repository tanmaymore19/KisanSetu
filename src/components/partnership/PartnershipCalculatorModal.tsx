import React, { useState, useMemo } from 'react';
import { FarmPlotListing, FarmPartnershipCostBreakdown, PartnershipBillingPlanType } from '../../types.js';
import {
  PARTNERSHIP_CROP_TEMPLATES,
  calculatePartnershipCosts,
  PartnershipCropProfile,
} from '../../data/partnershipCropData.js';
import {
  X,
  ShieldCheck,
  Sprout,
  Droplets,
  Zap,
  Package,
  CheckCircle2,
  Calendar,
  Lock,
  Layers,
  Sparkles,
  Info,
  QrCode,
  CreditCard,
  Building,
  Check,
  ArrowLeft,
  Tag,
  Percent,
  TrendingDown,
  Clock,
  Receipt,
  HelpCircle,
} from 'lucide-react';

interface PartnershipCalculatorModalProps {
  plot: FarmPlotListing;
  consumerId: string;
  consumerName: string;
  consumerPhone: string;
  consumerEmail?: string;
  onClose: () => void;
  onSuccess: (partnershipData: any) => void;
}

export const PartnershipCalculatorModal: React.FC<PartnershipCalculatorModalProps> = ({
  plot,
  consumerId,
  consumerName,
  consumerPhone,
  consumerEmail,
  onClose,
  onSuccess,
}) => {
  // Available crops
  const availableCrops = useMemo(() => {
    return PARTNERSHIP_CROP_TEMPLATES;
  }, []);

  const [selectedCropName, setSelectedCropName] = useState<string>(
    plot.supportedCrops && plot.supportedCrops.length > 0
      ? plot.supportedCrops[0]
      : PARTNERSHIP_CROP_TEMPLATES[0].cropName
  );

  // Area allocated
  const [areaSize, setAreaSize] = useState<number>(
    plot.areaSize <= 1 ? plot.areaSize : Math.min(plot.areaSize, 0.5)
  );
  const areaUnit = plot.areaUnit || 'acre';

  // Area conversions for easy consumer understanding
  const areaInGunthas = (areaSize * 40).toFixed(1);
  const areaInSqFt = Math.round(areaSize * 43560).toLocaleString('en-IN');

  // Selected crop profile
  const selectedCropProfile: PartnershipCropProfile = useMemo(() => {
    const found = PARTNERSHIP_CROP_TEMPLATES.find((c) => c.cropName === selectedCropName);
    if (found) return found;
    return (
      PARTNERSHIP_CROP_TEMPLATES[0] || {
        cropName: selectedCropName,
        category: 'Vegetables',
        farmingDurationDays: 105,
        estimatedYieldKgPerAcre: 14000,
        seedsCostPerAcre: 12000,
        fertilizersCostPerAcre: 16500,
        waterIrrigationCostPerAcre: 8000,
        electricityCostPerAcre: 5500,
        otherExpensesPerAcre: 4000,
        farmerServiceChargePerAcre: 18000,
        description: 'Cultivation managed by experienced farmer.',
        keyMilestones: ['Plot Preparation', 'Sowing', 'Irrigation & Care', 'Flowering & Fruiting', 'Harvesting'],
        recommendedSeasons: ['All Season'],
      }
    );
  }, [selectedCropName]);

  // Dynamic base cost calculation
  const costBreakdown: FarmPartnershipCostBreakdown = useMemo(() => {
    return calculatePartnershipCosts(selectedCropProfile, areaSize, areaUnit);
  }, [selectedCropProfile, areaSize, areaUnit]);

  // Billing Plan Selection (Full vs Milestone vs Monthly)
  const [billingPlan, setBillingPlan] = useState<PartnershipBillingPlanType>('milestone');

  // Coupon / Promo Code
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = () => {
    setCouponError(null);
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    if (code === 'KISANFIRST') {
      setAppliedCoupon({ code: 'KISANFIRST', discount: 1500, label: '₹1,500 New Sponsor Welcome Credit' });
    } else if (code === 'ORGANIC2026') {
      const disc = Math.round(costBreakdown.totalEstimatedCost * 0.05);
      setAppliedCoupon({ code: 'ORGANIC2026', discount: disc, label: '5% Organic Agriculture Promotion' });
    } else if (code === 'FARMFRESH') {
      setAppliedCoupon({ code: 'FARMFRESH', discount: 1000, label: '₹1,000 Harvest Voucher' });
    } else {
      setCouponError('Invalid coupon code. Try KISANFIRST or ORGANIC2026');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError(null);
  };

  // Plan discounts & net calculation
  const upfrontPlanDiscount = billingPlan === 'full' ? Math.round(costBreakdown.totalEstimatedCost * 0.05) : 0;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const totalDiscount = upfrontPlanDiscount + couponDiscount;
  const netTotalCost = Math.max(100, costBreakdown.totalEstimatedCost - totalDiscount);

  // Milestone amounts
  const milestoneDeposit = Math.round(netTotalCost * 0.30);
  const milestoneStage2 = Math.round(netTotalCost * 0.30);
  const milestoneStage3 = Math.round(netTotalCost * 0.30);
  const milestoneStage4 = Math.max(0, netTotalCost - (milestoneDeposit + milestoneStage2 + milestoneStage3));

  // Monthly amounts (duration in months)
  const durationMonths = Math.max(2, Math.round(selectedCropProfile.farmingDurationDays / 30));
  const monthlyAmount = Math.round(netTotalCost / durationMonths);

  // Payable Today based on selected billing plan
  const payableToday =
    billingPlan === 'milestone'
      ? milestoneDeposit
      : billingPlan === 'monthly'
      ? monthlyAmount
      : netTotalCost;

  const remainingBalance = Math.max(0, netTotalCost - payableToday);

  // Estimated produce economics
  const estimatedYieldKg = costBreakdown.estimatedYieldKg || Math.round(areaSize * 3000);
  const effectiveCostPerKg = (netTotalCost / Math.max(1, estimatedYieldKg)).toFixed(1);
  const estimatedMarketValue = costBreakdown.estimatedMarketValue || estimatedYieldKg * 65;

  // Payment & Terms agreement state
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'other'>('gpay');
  const [selectedBank, setSelectedBank] = useState<string>('HDFC Bank');
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [acknowledgedLandTitle, setAcknowledgedLandTitle] = useState(true);
  const [acknowledgedCropRights, setAcknowledgedCropRights] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmFunding = async () => {
    if (!acknowledgedLandTitle || !acknowledgedCropRights) {
      setError('Please acknowledge the legal ownership and produce entitlement clauses to proceed.');
      return;
    }

    if (areaSize <= 0 || areaSize > plot.areaSize) {
      setError(`Area size must be between 0.1 and ${plot.areaSize} ${areaUnit}.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];
      const txnId = `TXN_FP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const rcptNum = `RCPT-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const invoiceNumber = `INV-RENT-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Generate structured installments list
      let installments: any[] = [];
      if (billingPlan === 'milestone') {
        const due2 = new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0];
        const due3 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
        const due4 = new Date(Date.now() + selectedCropProfile.farmingDurationDays * 86400000)
          .toISOString()
          .split('T')[0];

        installments = [
          {
            id: `inst_${Date.now()}_1`,
            installmentNumber: 1,
            title: 'Stage 1: Plot Booking & Land Preparation Deposit',
            stageName: 'Plot Preparation',
            percentage: 30,
            amount: milestoneDeposit,
            dueDate: startDate,
            status: 'Paid',
            paidAt: now.toISOString(),
            transactionId: txnId,
            paymentMethod: paymentMethod === 'upi' ? `UPI (${upiApp.toUpperCase()})` : paymentMethod,
            receiptNumber: rcptNum,
          },
          {
            id: `inst_${Date.now()}_2`,
            installmentNumber: 2,
            title: 'Stage 2: Sowing & Certified Organic Seeds',
            stageName: 'Sowing & Planting',
            percentage: 30,
            amount: milestoneStage2,
            dueDate: due2,
            status: 'Scheduled',
          },
          {
            id: `inst_${Date.now()}_3`,
            installmentNumber: 3,
            title: 'Stage 3: Drip Irrigation, Solar Power & Farmer Labor',
            stageName: 'Irrigation & Care',
            percentage: 30,
            amount: milestoneStage3,
            dueDate: due3,
            status: 'Scheduled',
          },
          {
            id: `inst_${Date.now()}_4`,
            installmentNumber: 4,
            title: 'Stage 4: Harvest, Quality Inspection & Produce Dispatch',
            stageName: 'Ready for Harvest',
            percentage: 10,
            amount: milestoneStage4,
            dueDate: due4,
            status: 'Scheduled',
          },
        ];
      } else if (billingPlan === 'monthly') {
        installments = [];
        for (let i = 1; i <= durationMonths; i++) {
          const isFirst = i === 1;
          const amt = i === durationMonths ? Math.max(0, netTotalCost - monthlyAmount * (durationMonths - 1)) : monthlyAmount;
          const due = new Date(Date.now() + (i - 1) * 30 * 86400000).toISOString().split('T')[0];
          installments.push({
            id: `inst_${Date.now()}_${i}`,
            installmentNumber: i,
            title: `Month ${i} Land Rental & Care Installment`,
            stageName: i === 1 ? 'Plot Preparation' : i === 2 ? 'Active Cultivation' : 'Harvest Readiness',
            percentage: Math.round((amt / netTotalCost) * 100),
            amount: amt,
            dueDate: due,
            status: isFirst ? 'Paid' : 'Scheduled',
            paidAt: isFirst ? now.toISOString() : undefined,
            transactionId: isFirst ? txnId : undefined,
            paymentMethod: isFirst ? (paymentMethod === 'upi' ? `UPI (${upiApp.toUpperCase()})` : paymentMethod) : undefined,
            receiptNumber: isFirst ? rcptNum : undefined,
          });
        }
      } else {
        installments = [
          {
            id: `inst_${Date.now()}_1`,
            installmentNumber: 1,
            title: '100% Full Cultivation Sponsorship (One-Time)',
            stageName: 'Complete Crop Cycle',
            percentage: 100,
            amount: netTotalCost,
            dueDate: startDate,
            status: 'Paid',
            paidAt: now.toISOString(),
            transactionId: txnId,
            paymentMethod: paymentMethod === 'upi' ? `UPI (${upiApp.toUpperCase()})` : paymentMethod,
            receiptNumber: rcptNum,
          },
        ];
      }

      const methodDescription =
        paymentMethod === 'upi'
          ? `UPI (${upiApp.toUpperCase()}) Escrow Lock`
          : paymentMethod === 'card'
          ? 'Debit / Credit Card Escrow'
          : `NetBanking (${selectedBank}) Escrow`;

      const billingDetails = {
        invoiceNumber,
        invoiceDate: startDate,
        planType: billingPlan,
        baseCost: costBreakdown.totalEstimatedCost,
        discountAmount: totalDiscount,
        discountCode: appliedCoupon?.code || (upfrontPlanDiscount > 0 ? 'EARLYBIRD' : undefined),
        netPayableAmount: netTotalCost,
        amountPaidToday: payableToday,
        remainingBalance,
        installments,
        taxBreakdown: {
          landRentPortion: Math.round(netTotalCost * 0.20),
          seedsInputsPortion: Math.round(netTotalCost * 0.35),
          irrigationPowerPortion: Math.round(netTotalCost * 0.20),
          farmerServicePortion: Math.round(netTotalCost * 0.25),
          gstRate: 0,
          gstAmount: 0,
          escrowFee: 0,
        },
        paymentReceipt: {
          receiptNumber: rcptNum,
          paidBy: consumerName,
          paymentMethod: methodDescription,
          transactionRef: txnId,
          paidAmount: payableToday,
          paymentDate: now.toISOString(),
          escrowLockStatus: 'Secured in Escrow' as const,
        },
      };

      const payload = {
        plotId: plot.id,
        farmerId: plot.farmerId,
        consumerId,
        cropName: selectedCropProfile.cropName,
        areaSize: Number(areaSize),
        areaUnit,
        costBreakdown,
        totalFundingAmount: netTotalCost,
        billingPlan,
        billingDetails,
        discountCode: appliedCoupon?.code,
        discountAmount: totalDiscount,
        farmingDurationDays: selectedCropProfile.farmingDurationDays,
        paymentMethod: methodDescription,
      };

      await onSuccess(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to establish farming partnership.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-emerald-100 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1A331E] via-[#234A29] to-[#2D5A34] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <Sprout className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Rent Farm Land & Choose Crop Plan</h2>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-400 text-[#1A331E] font-black uppercase tracking-wider">
                  Easy Milestone Billing
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                Plot: <strong>{plot.plotName}</strong> ({plot.plotIdentifier}) • Farmer: {plot.farmerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-800">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Plot Snapshot Card */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                  Verified Farm Plot Available for Lease
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">{plot.plotName}</h3>
                <p className="text-xs text-gray-600">
                  {plot.farmName} • Managing Farmer: <span className="font-semibold text-gray-900">{plot.farmerName}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  Total Land: {plot.areaSize} {plot.areaUnit} ({plot.areaSize * 40} Gunthas)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-[11px] text-gray-600">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Soil Profile:</span>
                <span className="font-semibold text-gray-800">{plot.soilType}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Irrigation:</span>
                <span className="font-semibold text-gray-800">{plot.waterSource}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Farming Style:</span>
                <span className="font-semibold text-emerald-800">{plot.farmingStyle || 'Organic'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Location:</span>
                <span className="font-medium text-gray-800 truncate block">{plot.farmLocation}</span>
              </div>
            </div>
          </div>

          {/* 1. Crop Selection & Plot Area Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Choose Crop */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                1. Select Organic Crop to Grow
              </label>
              <select
                value={selectedCropName}
                onChange={(e) => setSelectedCropName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium bg-white shadow-2xs"
              >
                {availableCrops.map((c) => (
                  <option key={c.cropName} value={c.cropName}>
                    {c.cropName} ({c.farmingDurationDays} Days cycle)
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
                {selectedCropProfile.description}
              </p>
            </div>

            {/* Land Area Selection with Quick Presets */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  2. Area of Land to Rent
                </label>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    {areaSize} {areaUnit} ({areaInGunthas} Gunthas)
                  </span>
                </div>
              </div>

              {/* Quick Area Preset Buttons */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[0.1, 0.25, 0.5, 1.0].map((preset) => {
                  if (preset > plot.areaSize) return null;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAreaSize(preset)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all ${
                        areaSize === preset
                          ? 'bg-[#1A331E] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      {preset} Acre
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.1"
                  max={plot.areaSize}
                  step={plot.areaSize <= 1 ? '0.05' : '0.25'}
                  value={areaSize}
                  onChange={(e) => setAreaSize(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min="0.1"
                  max={plot.areaSize}
                  step="0.05"
                  value={areaSize}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0.1;
                    setAreaSize(Math.min(plot.areaSize, Math.max(0.1, val)));
                  }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-xs text-center font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-between text-[10px] text-gray-500 mt-1.5">
                <span>Equivalent Area: <strong>{areaInSqFt} sq. ft</strong></span>
                <span>Max: {plot.areaSize} {areaUnit}</span>
              </div>
            </div>
          </div>

          {/* Economics Snapshot Badge */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <div>
                <span className="font-bold text-gray-900 block">
                  Projected Harvest: ~{estimatedYieldKg.toLocaleString('en-IN')} kg of {selectedCropProfile.cropName}
                </span>
                <span className="text-[11px] text-gray-600">
                  Your direct farm-production cost is approx. <strong className="text-emerald-800">₹{effectiveCostPerKg} / kg</strong>
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Estimated Retail Market Value</span>
              <span className="text-sm font-black text-emerald-800">
                ₹{estimatedMarketValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 2. CORE ENHANCEMENT: SELECT BILLING PLAN (PAYMENT STRUCTURE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>3. Choose Your Land Rent Billing Plan</span>
              </label>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                Flexible Escrow Protection
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Milestone Installments (Recommended & Most Accessible!) */}
              <div
                onClick={() => setBillingPlan('milestone')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                  billingPlan === 'milestone'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="absolute -top-2.5 right-3 bg-emerald-700 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs">
                  Most Popular
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  {billingPlan === 'milestone' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-bold text-gray-900">Milestone Pay-as-it-Grows</h4>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  Pay only <strong>30% deposit today</strong> to lock the land. Remaining installments billed only after farmer posts photographic stage proof.
                </p>
                <div className="mt-3 pt-2 border-t border-emerald-200/50">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Pay Today:</span>
                  <span className="text-base font-black text-emerald-800">
                    ₹{milestoneDeposit.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-gray-500 block">
                    + 3 future stage releases
                  </span>
                </div>
              </div>

              {/* Option 2: Monthly Subscriptions */}
              <div
                onClick={() => setBillingPlan('monthly')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  billingPlan === 'monthly'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  {billingPlan === 'monthly' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-bold text-gray-900">Monthly Flexible Plan</h4>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  Spread cost evenly across {durationMonths} equal monthly installments. Automated schedule with zero interest.
                </p>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Pay Today (Month 1):</span>
                  <span className="text-base font-black text-blue-800">
                    ₹{monthlyAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-gray-500 block">
                    for {durationMonths} months
                  </span>
                </div>
              </div>

              {/* Option 3: Full Upfront Payment */}
              <div
                onClick={() => setBillingPlan('full')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                  billingPlan === 'full'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="absolute -top-2.5 right-3 bg-amber-500 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs">
                  5% Green Discount
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  {billingPlan === 'full' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-bold text-gray-900">100% Upfront Sponsoring</h4>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  Fund entire crop cycle upfront. Receive an immediate 5% early-sowing incentive deduction.
                </p>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Pay Today (All-in):</span>
                  <span className="text-base font-black text-gray-900">
                    ₹{(costBreakdown.totalEstimatedCost - upfrontPlanDiscount).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-semibold">
                    Saved ₹{upfrontPlanDiscount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* If Milestone Plan is selected: show clear installment breakdown cards */}
            {billingPlan === 'milestone' && (
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-gray-700 font-bold">
                  <span>Milestone Stage Payment Timeline:</span>
                  <span className="text-emerald-700 font-mono text-[11px]">4 Planned Releases</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-emerald-100/70 border border-emerald-300 text-emerald-950">
                    <span className="font-bold block">1. Today (30%)</span>
                    <span className="text-base font-black block">₹{milestoneDeposit.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-emerald-800">Booking & Prep Deposit</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-gray-200 text-gray-800">
                    <span className="font-bold block text-gray-600">2. Sowing (30%)</span>
                    <span className="text-sm font-bold block">₹{milestoneStage2.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-gray-500">Upon Seeds & Sowing Photo</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-gray-200 text-gray-800">
                    <span className="font-bold block text-gray-600">3. Care (30%)</span>
                    <span className="text-sm font-bold block">₹{milestoneStage3.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-gray-500">Irrigation & Flowering</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-gray-200 text-gray-800">
                    <span className="font-bold block text-gray-600">4. Harvest (10%)</span>
                    <span className="text-sm font-bold block">₹{milestoneStage4.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-gray-500">Final Inspection & Weighing</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Promo Code & Coupon Box */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-gray-800">Have a Promotional Code or Voucher?</span>
              </div>
              <span className="text-[10px] text-gray-400">Try coupon: <strong>KISANFIRST</strong></span>
            </div>

            {appliedCoupon ? (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-100/70 border border-emerald-300 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="font-extrabold">{appliedCoupon.code}</span>
                    <span className="text-emerald-800 ml-1.5 font-medium">({appliedCoupon.label})</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-emerald-900">-₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-gray-500 hover:text-red-700 font-bold text-xs cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon code (e.g. KISANFIRST)"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}
            {couponError && <p className="text-[11px] text-red-600 mt-1">{couponError}</p>}
          </div>

          {/* 4. Itemized Cost Breakdown (100% Transparent Pro-Forma Bill) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>4. Complete Farming Cost Breakdown (100% Transparent)</span>
              </h4>
              <span className="text-[11px] text-gray-500 font-medium">
                Duration: {selectedCropProfile.farmingDurationDays} days
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 divide-y divide-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3">
                <div className="flex items-center justify-between pr-2">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-semibold text-gray-800">Seeds & Planting Materials</span>
                      <span className="text-[10px] text-gray-500 block">Certified saplings & seed treatment</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    ₹{costBreakdown.seedsPlantingCost.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between pl-0 sm:pl-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="text-xs font-semibold text-gray-800">Fertilizers & Organic Nutrients</span>
                      <span className="text-[10px] text-gray-500 block">Vermicompost, neem cake & Jeevamrut</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    ₹{costBreakdown.fertilizersChemicalsCost.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between pr-2">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs font-semibold text-gray-800">Water & Irrigation Expenses</span>
                      <span className="text-[10px] text-gray-500 block">Drip operation & canal/bore charges</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    ₹{costBreakdown.waterIrrigationCost.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between pl-0 sm:pl-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-xs font-semibold text-gray-800">Electricity & Farm Utilities</span>
                      <span className="text-[10px] text-gray-500 block">Agricultural pump power & solar upkeep</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    ₹{costBreakdown.electricityUtilitiesCost.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between pr-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="text-xs font-semibold text-gray-800">Other Operational Expenses</span>
                      <span className="text-[10px] text-gray-500 block">Mulch film, staking & crates</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    ₹{costBreakdown.otherExpensesCost.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between pl-0 sm:pl-2 bg-emerald-50/70 p-1.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <div>
                      <span className="text-xs font-bold text-emerald-950">Farmer Cultivation & Labor Fee</span>
                      <span className="text-[10px] text-emerald-700 block">Daily tilling, weeding, care & harvest</span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-900">
                    ₹{costBreakdown.farmerCultivationServiceFee.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Bill Summary Table */}
              <div className="pt-3 space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Gross Cultivation Baseline:</span>
                  <span className="font-semibold">₹{costBreakdown.totalEstimatedCost.toLocaleString('en-IN')}</span>
                </div>

                {upfrontPlanDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>5% Upfront Early Sowing Incentive:</span>
                    <span>-₹{upfrontPlanDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Promo Code ({appliedCoupon?.code}):</span>
                    <span>-₹{couponDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-500">
                  <span>GST (Agricultural Produce & Cultivation):</span>
                  <span className="font-bold text-emerald-800">0.0% Exempt (Govt. of India)</span>
                </div>

                <div className="flex justify-between text-gray-500">
                  <span>KisanSetu Escrow Trust Fee:</span>
                  <span className="font-bold text-emerald-800">₹0 (Free / Zero Fees)</span>
                </div>

                <div className="pt-2 border-t border-gray-300 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-gray-500 block font-medium">Total Project Capital:</span>
                    <span className="text-base font-bold text-gray-900">₹{netTotalCost.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="text-right bg-emerald-100/70 px-3.5 py-1.5 rounded-xl border border-emerald-300">
                    <span className="text-[10px] uppercase font-bold text-emerald-900 block">
                      Payable Today To Book & Rent Land:
                    </span>
                    <span className="text-xl font-black text-[#1A331E]">
                      ₹{payableToday.toLocaleString('en-IN')}
                    </span>
                    {remainingBalance > 0 && (
                      <span className="text-[10px] text-gray-600 block">
                        (Remaining ₹{remainingBalance.toLocaleString('en-IN')} scheduled over stages)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Legal Protection & Structure Terms */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>5. Legal Protection Framework & Ownership Clarity</span>
            </div>

            <div className="space-y-2 text-xs text-amber-950 leading-relaxed">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgedLandTitle}
                  onChange={(e) => setAcknowledgedLandTitle(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>
                  <strong>Farmer Land Title Preservation:</strong> The farmer (<strong>{plot.farmerName}</strong>) retains
                  sole, unconditional legal ownership of the land. No title, encumbrance, or tenant rights are transferred to the consumer.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgedCropRights}
                  onChange={(e) => setAcknowledgedCropRights(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>
                  <strong>Consumer Harvest Entitlement:</strong> As the funding partner, you (<strong>{consumerName}</strong>)
                  hold 100% exclusive ownership rights to the harvested crop produce. Upon harvest, you can either take doorstep delivery or sell it on the KisanSetu marketplace for profit.
                </span>
              </label>
            </div>
          </div>

          {/* 6. Payment Method & Escrow Gateway */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
              6. Select Payment Gateway & Secure Escrow
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  {paymentMethod === 'upi' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <span className="text-xs font-bold text-gray-900 block">UPI Instant</span>
                <span className="text-[10px] text-gray-500">GPay, PhonePe, QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  paymentMethod === 'card'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <CreditCard className="w-4 h-4 text-blue-700" />
                  {paymentMethod === 'card' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <span className="text-xs font-bold text-gray-900 block">Cards / EMI</span>
                <span className="text-[10px] text-gray-500">Visa, RuPay, Zero-EMI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  paymentMethod === 'netbanking'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Building className="w-4 h-4 text-purple-700" />
                  {paymentMethod === 'netbanking' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <span className="text-xs font-bold text-gray-900 block">Net Banking</span>
                <span className="text-[10px] text-gray-500">All Indian Banks</span>
              </button>
            </div>

            {/* Sub-options for UPI */}
            {paymentMethod === 'upi' && (
              <div className="mt-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-gray-700 font-semibold">Choose UPI Application:</span>
                  <div className="flex gap-1.5">
                    {(['gpay', 'phonepe', 'paytm'] as const).map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setUpiApp(app)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                          upiApp === app
                            ? 'bg-[#1A331E] text-white'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{showQrCode ? 'Hide Dynamic QR Code' : 'Scan Dynamic Escrow QR Code'}</span>
                  </button>
                  <span className="text-[10px] text-gray-400 font-mono">VPA: kisansetu.escrow@icici</span>
                </div>

                {showQrCode && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-center max-w-xs mx-auto">
                    <div className="w-36 h-36 bg-gray-100 rounded-lg mx-auto flex items-center justify-center border border-gray-300 p-2">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=kisansetu.escrow@icici%26pn=KisanSetu%26am=${payableToday}%26cu=INR`}
                        alt="Escrow QR"
                        className="w-full h-full"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium">
                      Scan with any UPI app to deposit ₹{payableToday.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sub-options for NetBanking */}
            {paymentMethod === 'netbanking' && (
              <div className="mt-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-gray-700 font-semibold">Select Bank:</span>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold bg-white"
                >
                  <option value="State Bank of India">State Bank of India (SBI)</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                </select>
              </div>
            )}

            {/* Sub-options for Cards */}
            {paymentMethod === 'card' && (
              <div className="mt-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-1">
                <div className="font-semibold text-gray-800">Zero-Cost EMI Available:</div>
                <p className="text-[11px] text-gray-500">
                  Pay ₹{Math.round(payableToday / 3).toLocaleString('en-IN')} / month for 3 months with major bank credit cards. Zero processing fee.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold">
              {billingPlan === 'milestone' ? 'First Milestone Escrow Deposit:' : 'Total Escrow Commit:'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1A331E]">
                ₹{payableToday.toLocaleString('en-IN')}
              </span>
              {remainingBalance > 0 && (
                <span className="text-xs text-gray-500">
                  (Total Project: ₹{netTotalCost.toLocaleString('en-IN')})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmFunding}
              disabled={isSubmitting || !acknowledgedLandTitle || !acknowledgedCropRights}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Securing Escrow & Booking Land...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-emerald-200" />
                  <span>Rent Land & Pay ₹{payableToday.toLocaleString('en-IN')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

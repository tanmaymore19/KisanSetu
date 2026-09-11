import React, { useState } from 'react';
import { FarmPartnership, PartnershipInstallment } from '../../types.js';
import { api } from '../../lib/api.js';
import {
  X,
  Lock,
  QrCode,
  Building,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Check,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface PayInstallmentModalProps {
  partnership: FarmPartnership;
  installment: PartnershipInstallment;
  onClose: () => void;
  onSuccess: (updatedPartnership: FarmPartnership) => void;
}

export const PayInstallmentModal: React.FC<PayInstallmentModalProps> = ({
  partnership,
  installment,
  onClose,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'other'>('gpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

  const handlePay = async () => {
    setIsProcessing(true);
    setError(null);

    const methodStr =
      paymentMethod === 'upi'
        ? `UPI (${upiApp.toUpperCase()}) Instant`
        : paymentMethod === 'card'
        ? 'Debit / Credit Card Direct'
        : 'NetBanking Secured Escrow';

    try {
      const res = await api.payPartnershipInstallment(partnership.id, installment.id, {
        paymentMethod: methodStr,
      });
      setPaymentSuccess(res.receipt || { amountPaid: installment.amount });
      onSuccess(res.partnership);
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-emerald-100 space-y-5 my-auto text-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              Milestone Payment
            </span>
            <h3 className="text-base font-bold text-gray-900 mt-1">Pay Stage Installment</h3>
            <p className="text-xs text-gray-500">
              Project #{partnership.partnershipCode} • {partnership.cropName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">Payment Secured in Escrow!</h4>
              <p className="text-xs text-gray-600 mt-1">
                Receipt #{paymentSuccess.receiptNumber || 'RCPT-SUCCESS'}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Installment:</span>
                <span className="font-bold text-gray-900">{installment.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-extrabold text-emerald-800">₹{installment.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Mode:</span>
                <span className="font-medium text-gray-800">{paymentSuccess.paymentMethod || 'UPI Instant'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Escrow Security:</span>
                <span className="font-bold text-emerald-700">100% Protected</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              Done & Return to Projects
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Installment Summary */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Installment #{installment.installmentNumber}
                  </span>
                  <h4 className="text-xs font-bold text-gray-900">{installment.title}</h4>
                  <span className="text-[11px] text-gray-500">Stage: {installment.stageName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Payable Today</span>
                  <span className="text-xl font-black text-[#1A331E]">
                    ₹{installment.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between text-[11px] text-gray-500">
                <span>Managing Farmer: <strong>{partnership.farmerName}</strong></span>
                <span>Plot: <strong className="font-mono">{partnership.plotIdentifier}</strong></span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Payment Mode
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    {paymentMethod === 'upi' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className="text-xs font-bold text-gray-900 block">UPI</span>
                  <span className="text-[10px] text-gray-500">GPay, PhonePe</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    paymentMethod === 'card'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <CreditCard className="w-4 h-4 text-blue-700" />
                    {paymentMethod === 'card' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className="text-xs font-bold text-gray-900 block">Card</span>
                  <span className="text-[10px] text-gray-500">Debit / Credit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('netbanking')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    paymentMethod === 'netbanking'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Building className="w-4 h-4 text-purple-700" />
                    {paymentMethod === 'netbanking' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className="text-xs font-bold text-gray-900 block">NetBanking</span>
                  <span className="text-[10px] text-gray-500">All Banks</span>
                </button>
              </div>

              {paymentMethod === 'upi' && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600 font-medium">App:</span>
                  <div className="flex gap-1.5">
                    {(['gpay', 'phonepe', 'paytm'] as const).map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setUpiApp(app)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
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
              )}
            </div>

            {/* Escrow Guarantee */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-950">
              <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
              <span>
                Funds are secured in KisanSetu Escrow and released only as the farmer achieves certified progress for this stage.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pay ₹{installment.amount.toLocaleString('en-IN')} Now</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { FarmPartnership } from '../../types.js';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Calendar,
  Layers,
  Sprout,
  Building2,
  User,
  Clock,
} from 'lucide-react';

interface PartnershipInvoiceModalProps {
  partnership: FarmPartnership;
  onClose: () => void;
}

export const PartnershipInvoiceModal: React.FC<PartnershipInvoiceModalProps> = ({
  partnership,
  onClose,
}) => {
  const billing = partnership.billingDetails;
  const areaInGunthas = (partnership.areaSize * 40).toFixed(1);
  const areaInSqFt = Math.round(partnership.areaSize * 43560).toLocaleString('en-IN');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-gray-200 overflow-hidden my-auto print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="px-6 py-4 bg-[#1A331E] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Land Rental Tax Invoice & Agreement</h2>
              <p className="text-xs text-emerald-200">
                Official Bill #{billing?.invoiceNumber || `INV-${partnership.partnershipCode}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-gray-800 text-xs print:p-6 print:overflow-visible">
          {/* Header & Logo */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-[#1A331E] tracking-tight">KisanSetu</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase">
                  Agri-Escrow Verified
                </span>
              </div>
              <p className="text-gray-500 text-[11px] mt-0.5">
                Direct Consumer-to-Farmer Land Lease & Produce Sponsorship Network
              </p>
              <p className="text-gray-400 text-[10px] mt-1 font-mono">
                CIN: U01100MH2026PTC39281 • GSTIN: 27AABCK1293Q1Z2 (Agricultural Exemption)
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Invoice & Deed Identifier
              </span>
              <div className="font-mono text-base font-extrabold text-gray-900">
                {billing?.invoiceNumber || `INV-RENT-${partnership.partnershipCode}`}
              </div>
              <div className="text-gray-500 text-[11px] mt-0.5">
                Date: {billing?.invoiceDate || partnership.startDate}
              </div>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Escrow Trust Protected</span>
              </div>
            </div>
          </div>

          {/* Parties: Consumer (Lessee/Sponsor) & Farmer (Lessor/Cultivator) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
            {/* Consumer */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>Funding Consumer (Produce Owner)</span>
              </span>
              <div className="text-sm font-bold text-gray-900">{partnership.consumerName}</div>
              <div className="text-gray-600 text-[11px]">Phone: {partnership.consumerPhone || 'Verified Account'}</div>
              {partnership.consumerEmail && (
                <div className="text-gray-600 text-[11px]">Email: {partnership.consumerEmail}</div>
              )}
              <div className="text-gray-500 text-[10px] pt-1">
                Member Ref: <span className="font-mono">{partnership.consumerId}</span>
              </div>
            </div>

            {/* Farmer */}
            <div className="space-y-1 sm:border-l sm:border-gray-200 sm:pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Host Farm & Cultivating Farmer</span>
              </span>
              <div className="text-sm font-bold text-gray-900">{partnership.farmerName}</div>
              <div className="text-gray-600 text-[11px] font-medium">{partnership.farmName}</div>
              <div className="text-gray-600 text-[11px]">{partnership.farmerLocation}</div>
              <div className="text-gray-500 text-[10px] pt-1">
                Plot Identifier: <span className="font-mono font-bold text-gray-800">{partnership.plotIdentifier}</span>
              </div>
            </div>
          </div>

          {/* Land Specification & Crop Details */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-100/80 px-4 py-2 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-emerald-600" />
              <span>Land Rental & Crop Cultivation Details</span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Rented Land Size</span>
                <span className="text-xs font-black text-gray-900">
                  {partnership.areaSize} {partnership.areaUnit}
                </span>
                <span className="text-[10px] text-gray-500 block">
                  ({areaInGunthas} Gunthas / {areaInSqFt} sq.ft)
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Selected Crop</span>
                <span className="text-xs font-bold text-emerald-800">{partnership.cropName}</span>
                <span className="text-[10px] text-gray-500 block">100% Organic Protocol</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Farming Duration</span>
                <span className="text-xs font-bold text-gray-900">{partnership.farmingDurationDays} Days</span>
                <span className="text-[10px] text-gray-500 block">Exp: {partnership.expectedHarvestDate}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Billing Structure</span>
                <span className="text-xs font-bold text-gray-900 capitalize">
                  {billing?.planType === 'milestone'
                    ? 'Milestone (Staged Escrow)'
                    : billing?.planType === 'monthly'
                    ? 'Monthly Subscription'
                    : '100% Upfront (Discounted)'}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Cost Breakdown Table */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
              Itemized Agricultural Cost Breakdown
            </span>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-[10px] uppercase font-bold border-b border-gray-200">
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Allocation</th>
                    <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  <tr>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-gray-900 block">Certified Organic Seeds & Plant Materials</span>
                      <span className="text-[10px] text-gray-500">Non-GMO certified saplings, rootstock & bio-inoculants</span>
                    </td>
                    <td className="py-2 px-3 text-gray-500">Input Materials</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      ₹{partnership.costBreakdown.seedsPlantingCost.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-gray-900 block">Organic Fertilizers & Bio-Nutrients</span>
                      <span className="text-[10px] text-gray-500">Vermicompost, neem cake, cow dung manure & Jeevamrut</span>
                    </td>
                    <td className="py-2 px-3 text-gray-500">Soil Health</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      ₹{partnership.costBreakdown.fertilizersChemicalsCost.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-gray-900 block">Drip Irrigation & Canal/Bore Utilities</span>
                      <span className="text-[10px] text-gray-500">Water pressure maintenance, filter flushing & scheduled drip</span>
                    </td>
                    <td className="py-2 px-3 text-gray-500">Water Utility</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      ₹{partnership.costBreakdown.waterIrrigationCost.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-gray-900 block">Agricultural Electricity & Solar Maintenance</span>
                      <span className="text-[10px] text-gray-500">Submersible pump power and solar inverter upkeep</span>
                    </td>
                    <td className="py-2 px-3 text-gray-500">Power Utility</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      ₹{partnership.costBreakdown.electricityUtilitiesCost.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-gray-900 block">Operational Farm Accessories</span>
                      <span className="text-[10px] text-gray-500">Mulching film, bamboo stakes, trellising twine & harvesting crates</span>
                    </td>
                    <td className="py-2 px-3 text-gray-500">Operations</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      ₹{partnership.costBreakdown.otherExpensesCost.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/40">
                    <td className="py-2 px-3">
                      <span className="font-bold text-emerald-950 block">Farmer Cultivation & Daily Labor Fee</span>
                      <span className="text-[10px] text-emerald-700">Skilled tilling, weeding, pest monitoring, pruning & harvest</span>
                    </td>
                    <td className="py-2 px-3 text-emerald-800 font-medium">Labor & Management</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-900">
                      ₹{partnership.costBreakdown.farmerCultivationServiceFee.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Subtotals & Taxes */}
              <div className="bg-gray-50 p-4 border-t border-gray-200 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Gross Cultivation Cost:</span>
                  <span className="font-semibold">
                    ₹{(billing?.baseCost || partnership.costBreakdown.totalEstimatedCost).toLocaleString('en-IN')}
                  </span>
                </div>

                {billing?.discountAmount ? (
                  <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                    <span>
                      Promotional Sponsoring Discount {billing.discountCode ? `(${billing.discountCode})` : ''}:
                    </span>
                    <span>-₹{billing.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                ) : null}

                <div className="flex justify-between text-xs text-gray-500">
                  <span>GST (Goods & Services Tax on Agricultural Farming):</span>
                  <span className="font-bold text-emerald-800">
                    0.0% (Exempt under Notification 12/2017 Central Tax)
                  </span>
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>KisanSetu Escrow Trust & Platform Fee:</span>
                  <span className="font-bold text-emerald-800">₹0 (Free / Waived)</span>
                </div>

                <div className="pt-2 border-t border-gray-300 flex justify-between items-center text-sm font-black text-gray-900">
                  <span>Total Net Funding Commitment:</span>
                  <span className="text-base text-[#1A331E]">
                    ₹{partnership.totalFundingAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Installment Schedule */}
          {billing?.installments && billing.installments.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Installment Schedule & Escrow Releases
                </span>
                <span className="text-[11px] font-bold text-emerald-700">
                  Paid to Date: ₹{billing.amountPaidToday.toLocaleString('en-IN')} • Remaining: ₹
                  {billing.remainingBalance.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-[10px] uppercase font-bold border-b border-gray-200">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Milestone Stage</th>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3 text-right">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {billing.installments.map((inst, idx) => (
                      <tr key={inst.id || idx} className={inst.status === 'Paid' ? 'bg-emerald-50/30' : ''}>
                        <td className="py-2 px-3 font-bold text-gray-500">{inst.installmentNumber}</td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-gray-900 block">{inst.title}</span>
                          <span className="text-[10px] text-gray-500">Trigger: {inst.stageName}</span>
                        </td>
                        <td className="py-2 px-3 text-gray-600 font-mono text-[11px]">{inst.dueDate}</td>
                        <td className="py-2 px-3 font-bold text-gray-900">₹{inst.amount.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right">
                          {inst.status === 'Paid' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Paid & Escrow Locked</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Scheduled at Stage</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Legal Warranty Box */}
          <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-950 space-y-1.5">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Legal Title & Harvest Rights Warranty Clause</span>
            </div>
            <p className="leading-relaxed">
              <strong>1. Land Title Preservation:</strong> The land is owned unconditionally by the farmer (
              {partnership.farmerName}). This invoice represents a contract for agricultural cultivation and usufruct
              rights, not a sale or perpetual encumbrance of land real estate.
            </p>
            <p className="leading-relaxed">
              <strong>2. Harvest Rights:</strong> The consumer ({partnership.consumerName}) holds 100% legal entitlement
              to all crops, vegetables, and fruits harvested from the designated plot during this cycle.
            </p>
          </div>

          {/* Digital Signatures */}
          <div className="pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center text-[10px] text-gray-500">
            <div>
              <div className="h-9 flex items-end justify-center font-serif italic text-gray-800 text-xs font-bold">
                {partnership.farmerName}
              </div>
              <div className="border-t border-gray-300 pt-1">Managing Farmer</div>
            </div>
            <div>
              <div className="h-9 flex items-end justify-center font-serif italic text-emerald-800 text-xs font-bold">
                KisanSetu Escrow Officer
              </div>
              <div className="border-t border-gray-300 pt-1">Digital Authentication Seal</div>
            </div>
            <div>
              <div className="h-9 flex items-end justify-center font-serif italic text-gray-800 text-xs font-bold">
                {partnership.consumerName}
              </div>
              <div className="border-t border-gray-300 pt-1">Funding Consumer Partner</div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (Hidden in print) */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between print:hidden">
          <span className="text-[11px] text-gray-500">
            Transaction Ref: <span className="font-mono">{partnership.transactionId}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs cursor-pointer transition-colors"
          >
            Close Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

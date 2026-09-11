import React, { useState, useMemo } from 'react';
import {
  Search,
  Landmark,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Filter,
  Sparkles,
  Info,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Check,
  X,
} from 'lucide-react';
import { GovernmentScheme, SchemeCategory, User } from '../../types';
import { GOVT_SCHEMES } from '../../data/govtSchemesData';

interface GovtSchemesHubProps {
  currentUser?: User | null;
  onSelectMachineryScheme?: (schemeName: string) => void;
  onNavigateToInstruments?: () => void;
}

export const GovtSchemesHub: React.FC<GovtSchemesHubProps> = ({
  currentUser,
  onNavigateToInstruments,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedScheme, setSelectedScheme] = useState<GovernmentScheme | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kisansetu_bookmarked_schemes');
      return saved ? JSON.parse(saved) : ['smam-machinery', 'pm-kusum-solar'];
    } catch {
      return ['smam-machinery', 'pm-kusum-solar'];
    }
  });

  // Eligibility Checker State
  const [showEligibilityChecker, setShowEligibilityChecker] = useState(false);
  const [checkedAcreage, setCheckedAcreage] = useState(
    currentUser?.farmDetails?.farmSize?.toString() || '4'
  );
  const [checkedStyle, setCheckedStyle] = useState(
    currentUser?.farmDetails?.farmingStyle || 'Organic'
  );
  const [hasAadhaarLinked, setHasAadhaarLinked] = useState(true);
  const [hasLandRecords, setHasLandRecords] = useState(true);

  const categories: { label: string; value: string }[] = [
    { label: 'All Schemes', value: 'All' },
    { label: 'Machinery & Tools', value: 'Machinery & Equipment' },
    { label: 'Irrigation & Solar', value: 'Irrigation & Solar' },
    { label: 'Direct Cash & Income', value: 'Financial Aid & Income' },
    { label: 'Organic Farming', value: 'Organic & Natural Farming' },
    { label: 'Crop Insurance & Credit', value: 'Crop Insurance & Credit' },
    { label: 'Storage & Infra', value: 'Horticulture & Storage' },
  ];

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = bookmarkedIds.includes(id)
      ? bookmarkedIds.filter((bId) => bId !== id)
      : [...bookmarkedIds, id];
    setBookmarkedIds(updated);
    try {
      localStorage.setItem('kisansetu_bookmarked_schemes', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSchemes = useMemo(() => {
    return GOVT_SCHEMES.filter((scheme) => {
      const matchesCat =
        selectedCategory === 'All' || scheme.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        scheme.name.toLowerCase().includes(q) ||
        scheme.shortName.toLowerCase().includes(q) ||
        scheme.summary.toLowerCase().includes(q) ||
        scheme.ministry.toLowerCase().includes(q) ||
        scheme.keyBenefits.some((b) => b.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#2D3A26] to-[#455A38] text-white p-5 sm:p-7 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[#EBF1E8] border border-white/20 text-xs font-semibold mb-3">
            <Landmark className="w-3.5 h-3.5 text-[#A2BA95]" />
            Official Central & State Government Agricultural Programs
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight leading-tight">
            Government Farming Schemes & Subsidies
          </h2>
          <p className="text-xs sm:text-sm text-[#D5DFD1] mt-2 leading-relaxed">
            Discover and apply for financial assistance, solar agri-pump subsidies up to 60%,
            equipment support under SMAM, low-interest crop credit, and organic transition grants.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setShowEligibilityChecker(!showEligibilityChecker)}
              className="px-4 py-2 rounded-xl bg-white text-[#2D3A26] text-xs font-bold hover:bg-[#FAF8F5] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#5D7A4F]" />
              {showEligibilityChecker ? 'Hide Eligibility Calculator' : 'Check My Farm Eligibility'}
            </button>

            {onNavigateToInstruments && (
              <button
                type="button"
                onClick={onNavigateToInstruments}
                className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                🚜 Buy Farming Instruments with Subsidy
              </button>
            )}
          </div>
        </div>

        {/* Decorative Badge */}
        <div className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 opacity-15">
          <Landmark className="w-48 h-48 text-white" />
        </div>
      </div>

      {/* Interactive Eligibility Checker Modal / Section */}
      {showEligibilityChecker && (
        <div className="bg-[#FAF8F5] p-5 rounded-3xl border-2 border-[#5D7A4F] shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#5D7A4F] text-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2D3A26] font-serif">
                  Quick Farm Subsidy & Eligibility Calculator
                </h3>
                <p className="text-[11px] text-[#5D6D56]">
                  Calibrated for: {currentUser?.fullName || 'Active Farmer'} (
                  {currentUser?.farmDetails?.farmName || 'Your Farm'})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEligibilityChecker(false)}
              className="p-1.5 rounded-lg text-[#8C9886] hover:text-[#2D3A26] hover:bg-[#E5E0D5]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
            <div>
              <label className="font-bold text-[#2D3A26] block mb-1">
                Farm Acreage ({currentUser?.farmDetails?.farmSizeUnit || 'Acres'}):
              </label>
              <input
                type="number"
                value={checkedAcreage}
                onChange={(e) => setCheckedAcreage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D4CDBC] text-[#2D3A26] font-semibold focus:outline-none focus:border-[#5D7A4F]"
                min="0.5"
                step="0.5"
              />
              <span className="text-[10px] text-[#8C9886] mt-0.5 block">
                {parseFloat(checkedAcreage || '0') <= 5
                  ? 'Qualifies as Small & Marginal Farmer (Top 50-60% subsidy bracket)'
                  : 'Qualifies as Medium / Large Farmer (40-45% standard subsidy bracket)'}
              </span>
            </div>

            <div>
              <label className="font-bold text-[#2D3A26] block mb-1">Farming Practice:</label>
              <select
                value={checkedStyle}
                onChange={(e) => setCheckedStyle(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D4CDBC] text-[#2D3A26] font-semibold focus:outline-none focus:border-[#5D7A4F]"
              >
                <option value="Organic">Organic / Natural (Unlocks PKVY Grant)</option>
                <option value="Conventional">Conventional / Chemical</option>
                <option value="Mixed Farming">Mixed Farming (Crops + Livestock)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-[#2D3A26] block mb-1">Essential Records:</label>
              <div className="space-y-1.5 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-[#2D3A26]">
                  <input
                    type="checkbox"
                    checked={hasAadhaarLinked}
                    onChange={(e) => setHasAadhaarLinked(e.target.checked)}
                    className="rounded text-[#5D7A4F] focus:ring-[#5D7A4F]"
                  />
                  Aadhaar Linked to Bank (DBT Active)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[#2D3A26]">
                  <input
                    type="checkbox"
                    checked={hasLandRecords}
                    onChange={(e) => setHasLandRecords(e.target.checked)}
                    className="rounded text-[#5D7A4F] focus:ring-[#5D7A4F]"
                  />
                  7/12 Land Title / Patta available
                </label>
              </div>
            </div>
          </div>

          {/* Quick Eligibility Recommendations */}
          <div className="mt-4 p-3 rounded-2xl bg-[#EBF1E8] border border-[#D4CDBC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#5D7A4F] shrink-0" />
              <div>
                <span className="font-bold text-[#2D3A26]">
                  High Eligibility Detected:{' '}
                </span>
                <span className="text-[#455A38]">
                  Your profile qualifies for <strong>SMAM 50% Machinery Subsidy</strong>,{' '}
                  <strong>PM-KUSUM 60% Solar Pump</strong>
                  {checkedStyle === 'Organic' ? ', and ₹50,000/ha PKVY Organic Grant' : ''}!
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#5D7A4F] text-white text-[10px] font-bold shrink-0">
              Verified Criteria Met
            </span>
          </div>
        </div>
      )}

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8C9886] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="scheme-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemes by name, equipment, crop, or benefit (e.g. solar, tractor, drip, organic)..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-xs text-[#2D3A26] placeholder-[#8C9886] focus:outline-none focus:border-[#5D7A4F] shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C9886] hover:text-[#2D3A26]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Bookmarked Counter */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5D6D56] shrink-0">
          <span className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] flex items-center gap-1.5">
            <BookmarkCheck className="w-3.5 h-3.5 text-[#5D7A4F]" />
            Saved: <strong className="text-[#2D3A26]">{bookmarkedIds.length}</strong>
          </span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              selectedCategory === cat.value
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#5D6D56] border border-[#E5E0D5] hover:border-[#5D7A4F] hover:text-[#2D3A26]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Scheme Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSchemes.map((scheme) => {
          const isSaved = bookmarkedIds.includes(scheme.id);
          return (
            <div
              key={scheme.id}
              className="bg-[#FAF8F5] rounded-3xl border border-[#E5E0D5] p-5 shadow-2xs hover:shadow-md hover:border-[#5D7A4F] transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header row with badge & bookmark */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC] text-[10px] font-bold uppercase tracking-wider">
                    {scheme.badge}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => toggleBookmark(scheme.id, e)}
                    title={isSaved ? 'Remove from saved' : 'Save scheme'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isSaved
                        ? 'text-[#5D7A4F] bg-[#EBF1E8]'
                        : 'text-[#8C9886] hover:text-[#2D3A26] hover:bg-[#E5E0D5]'
                    }`}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-4 h-4 fill-[#5D7A4F]" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Scheme Title */}
                <h3 className="text-base font-bold text-[#2D3A26] font-serif group-hover:text-[#5D7A4F] transition-colors leading-snug">
                  {scheme.name}
                </h3>
                <p className="text-[11px] text-[#8C9886] flex items-center gap-1 mt-0.5">
                  <Building className="w-3 h-3 text-[#5D7A4F] shrink-0" />
                  <span className="truncate">{scheme.ministry}</span>
                </p>

                {/* Subsidy Highlight Pill */}
                <div className="mt-3 p-2.5 rounded-2xl bg-white border border-[#E5E0D5] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#8C9886] block">
                      Subsidy / Benefit
                    </span>
                    <span className="font-extrabold text-[#2D3A26] text-sm">
                      {scheme.subsidyPercentage}
                    </span>
                  </div>
                  {scheme.maxSubsidyAmount && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#8C9886] block">
                        Limit
                      </span>
                      <span className="font-semibold text-[#5D7A4F] text-xs">
                        {scheme.maxSubsidyAmount}
                      </span>
                    </div>
                  )}
                  {scheme.directFinancialSupport && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#8C9886] block">
                        Grant
                      </span>
                      <span className="font-semibold text-[#5D7A4F] text-xs">
                        {scheme.directFinancialSupport}
                      </span>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <p className="text-xs text-[#5D6D56] mt-3 line-clamp-2 leading-relaxed">
                  {scheme.summary}
                </p>

                {/* Key Benefits Preview */}
                <div className="mt-3 space-y-1.5">
                  {scheme.keyBenefits.slice(0, 2).map((benefit, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 text-[11px] text-[#2D3A26]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-[#E5E0D5] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedScheme(scheme)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> View Eligibility & How to Apply
                </button>

                <a
                  href={scheme.officialPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-[#E5E0D5] hover:border-[#5D7A4F] text-[#5D6D56] hover:text-[#2D3A26] transition-colors shadow-2xs"
                  title="Open official government portal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSchemes.length === 0 && (
        <div className="p-8 text-center bg-[#FAF8F5] rounded-3xl border border-[#E5E0D5]">
          <AlertCircle className="w-8 h-8 text-[#8C9886] mx-auto mb-2" />
          <h4 className="text-sm font-bold text-[#2D3A26]">No matching schemes found</h4>
          <p className="text-xs text-[#5D6D56] mt-1">
            Try adjusting your search query or selecting a different category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Farmer Guidance & Helpline Card */}
      <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E0D5] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#2D3A26] uppercase tracking-wider">
              Need Help with Application or Documents?
            </h4>
            <p className="text-xs text-[#5D6D56] mt-0.5">
              Call the national Kisan Call Centre toll-free at{' '}
              <strong className="text-[#2D3A26]">1800-180-1551</strong> (6 AM to 10 PM daily in 22 languages).
            </p>
          </div>
        </div>

        <a
          href="tel:18001801551"
          className="px-4 py-2 rounded-xl bg-[#2D3A26] text-white text-xs font-bold hover:bg-[#455A38] transition-colors shrink-0 flex items-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5" /> Call Toll-Free
        </a>
      </div>

      {/* Scheme Detail & Application Steps Modal */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E5E0D5] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-[#FAF8F5] border-b border-[#E5E0D5] flex items-start justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC] text-[10px] font-bold uppercase">
                  {selectedScheme.category}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[#2D3A26] font-serif mt-1">
                  {selectedScheme.name}
                </h3>
                <p className="text-xs text-[#8C9886] mt-0.5">
                  {selectedScheme.ministry} • Applicable: {selectedScheme.applicableStates}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScheme(null)}
                className="p-2 rounded-xl text-[#8C9886] hover:text-[#2D3A26] hover:bg-[#E5E0D5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto text-xs flex-1">
              {/* Subsidy Highlight Banner */}
              <div className="p-4 rounded-2xl bg-[#EBF1E8] border border-[#D4CDBC] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#5D7A4F] uppercase block">
                    Government Financial Support
                  </span>
                  <span className="text-lg font-extrabold text-[#2D3A26] font-serif">
                    {selectedScheme.subsidyPercentage}
                  </span>
                </div>
                {selectedScheme.maxSubsidyAmount && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#5D7A4F] uppercase block">
                      Ceiling Limit
                    </span>
                    <span className="text-sm font-bold text-[#2D3A26]">
                      {selectedScheme.maxSubsidyAmount}
                    </span>
                  </div>
                )}
                {selectedScheme.directFinancialSupport && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#5D7A4F] uppercase block">
                      Disbursement
                    </span>
                    <span className="text-sm font-bold text-[#2D3A26]">
                      {selectedScheme.directFinancialSupport}
                    </span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div>
                <h4 className="font-bold text-[#2D3A26] text-xs uppercase tracking-wider mb-1">
                  Scheme Overview
                </h4>
                <p className="text-[#5D6D56] leading-relaxed">
                  {selectedScheme.summary}
                </p>
              </div>

              {/* Key Benefits */}
              <div>
                <h4 className="font-bold text-[#2D3A26] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#5D7A4F]" /> Key Farmer Benefits
                </h4>
                <div className="space-y-1.5">
                  {selectedScheme.keyBenefits.map((benefit, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] flex items-start gap-2 text-[#2D3A26]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligibility Criteria */}
              <div>
                <h4 className="font-bold text-[#2D3A26] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5D7A4F]" /> Eligibility Checklist
                </h4>
                <div className="space-y-1.5">
                  {selectedScheme.eligibility.map((el, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-[#2D3A26]"
                    >
                      <Check className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0 mt-0.5" />
                      <span>{el}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents Required */}
              <div>
                <h4 className="font-bold text-[#2D3A26] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#5D7A4F]" /> Required Documents for Application
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedScheme.documentsRequired.map((doc, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] text-[#2D3A26] flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5D7A4F] shrink-0"></span>
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step by Step How to Apply */}
              <div>
                <h4 className="font-bold text-[#2D3A26] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-[#5D7A4F]" /> Step-by-Step Application Process
                </h4>
                <ol className="space-y-2">
                  {selectedScheme.howToApply.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-[#2D3A26]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#2D3A26] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Official Helpline */}
              <div className="p-3 rounded-2xl bg-[#F1EDE4] border border-[#E5E0D5] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8C9886] block">
                    Direct Helpline / Support
                  </span>
                  <span className="font-bold text-[#2D3A26]">
                    {selectedScheme.helpline}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[#5D7A4F]">
                  Govt Monitored
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FAF8F5] border-t border-[#E5E0D5] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => toggleBookmark(selectedScheme.id)}
                className="px-4 py-2 rounded-xl bg-white border border-[#E5E0D5] hover:border-[#5D7A4F] text-[#2D3A26] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {bookmarkedIds.includes(selectedScheme.id) ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-[#5D7A4F] fill-[#5D7A4F]" /> Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" /> Save Scheme
                  </>
                )}
              </button>

              <a
                href={selectedScheme.officialPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                Apply on Official Portal ({selectedScheme.portalName}){' '}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

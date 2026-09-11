import { FarmPartnershipCostBreakdown, PlotAreaUnit } from '../types.js';

export interface CropProfile {
  name: string;
  category: 'Vegetables' | 'Fruits' | 'Grains & Pulses' | 'Spices & Cash Crops';
  durationDays: number;
  season: string;
  iconName: string;
  description: string;
  expectedYieldPerAcreKg: number;
  expectedPricePerKg: number;
  baseCostPerAcre: FarmPartnershipCostBreakdown;
  recommendedSoil: string;
  waterNeed: 'Low' | 'Medium' | 'High';
}

// Convert any area unit to fraction of an acre
export function convertToAcre(size: number, unit: PlotAreaUnit): number {
  switch (unit) {
    case 'acre':
      return size;
    case 'hectare':
      return size * 2.47105;
    case 'guntha':
      return size / 40; // 1 Acre = 40 Gunthas
    case 'sq_ft':
      return size / 43560; // 1 Acre = 43,560 sq ft
    default:
      return size;
  }
}

export const CROP_PROFILES: CropProfile[] = [
  {
    name: 'Organic Tomatoes (Arka Rakshak)',
    category: 'Vegetables',
    durationDays: 105,
    season: 'Kharif / Rabi / Round-the-year',
    iconName: 'Cherry',
    description: 'High-yielding hybrid organic tomato variety rich in lycopene. Excellent for fresh culinary use and puree.',
    expectedYieldPerAcreKg: 14000,
    expectedPricePerKg: 35,
    recommendedSoil: 'Well-drained Black / Loamy Soil',
    waterNeed: 'Medium',
    baseCostPerAcre: {
      seedsPlantingCost: 12000,
      fertilizersChemicalsCost: 16500,
      waterIrrigationCost: 8000,
      electricityUtilitiesCost: 5500,
      otherExpensesCost: 4000,
      farmerCultivationServiceFee: 18000,
      totalEstimatedCost: 64000,
    },
  },
  {
    name: 'Premium Strawberries (Winter Dawn)',
    category: 'Fruits',
    durationDays: 120,
    season: 'Winter / Spring',
    iconName: 'Apple',
    description: 'Sweet, fragrant premium table strawberries grown with drip and plastic mulch beds.',
    expectedYieldPerAcreKg: 8500,
    expectedPricePerKg: 140,
    recommendedSoil: 'Slightly acidic sandy loam rich in organic matter',
    waterNeed: 'Medium',
    baseCostPerAcre: {
      seedsPlantingCost: 28000,
      fertilizersChemicalsCost: 22000,
      waterIrrigationCost: 10000,
      electricityUtilitiesCost: 7000,
      otherExpensesCost: 6000,
      farmerCultivationServiceFee: 26000,
      totalEstimatedCost: 99000,
    },
  },
  {
    name: 'Exotic Colored Bell Peppers (Capsicum)',
    category: 'Vegetables',
    durationDays: 130,
    season: 'Winter / Controlled polyhouse',
    iconName: 'Sprout',
    description: 'Red and Yellow export-grade bell peppers with thick walls and high market value.',
    expectedYieldPerAcreKg: 11000,
    expectedPricePerKg: 75,
    recommendedSoil: 'Porous Sandy Loam with drip line fertigation',
    waterNeed: 'Medium',
    baseCostPerAcre: {
      seedsPlantingCost: 19000,
      fertilizersChemicalsCost: 18500,
      waterIrrigationCost: 9500,
      electricityUtilitiesCost: 6500,
      otherExpensesCost: 5500,
      farmerCultivationServiceFee: 22000,
      totalEstimatedCost: 81000,
    },
  },
  {
    name: 'Desi Sharbati Organic Wheat',
    category: 'Grains & Pulses',
    durationDays: 135,
    season: 'Rabi (Nov - Mar)',
    iconName: 'Wheat',
    description: 'Premium organic gold-grain Sharbati wheat prized for sweet, soft rotis and zero synthetic inputs.',
    expectedYieldPerAcreKg: 2400,
    expectedPricePerKg: 48,
    recommendedSoil: 'Clay loam / Deep fertile black cotton soil',
    waterNeed: 'Low',
    baseCostPerAcre: {
      seedsPlantingCost: 6500,
      fertilizersChemicalsCost: 9000,
      waterIrrigationCost: 6000,
      electricityUtilitiesCost: 4000,
      otherExpensesCost: 3500,
      farmerCultivationServiceFee: 14000,
      totalEstimatedCost: 43000,
    },
  },
  {
    name: 'Salem Organic Turmeric (Haldi)',
    category: 'Spices & Cash Crops',
    durationDays: 240,
    season: 'Kharif (June - Feb)',
    iconName: 'Flame',
    description: 'Curcumin-rich (5%+) pure medicinal turmeric with heavy root rhizomes and natural processing.',
    expectedYieldPerAcreKg: 5000,
    expectedPricePerKg: 110,
    recommendedSoil: 'Deep friable loamy soil with natural compost',
    waterNeed: 'High',
    baseCostPerAcre: {
      seedsPlantingCost: 16000,
      fertilizersChemicalsCost: 14000,
      waterIrrigationCost: 11000,
      electricityUtilitiesCost: 7000,
      otherExpensesCost: 5000,
      farmerCultivationServiceFee: 24000,
      totalEstimatedCost: 77000,
    },
  },
  {
    name: 'Baby Potatoes & Seed Tubers (Kufri Pukhraj)',
    category: 'Vegetables',
    durationDays: 90,
    season: 'Winter',
    iconName: 'Layers',
    description: 'Quick harvest tender new potatoes grown with vermicompost and certified disease-free seed tubers.',
    expectedYieldPerAcreKg: 9500,
    expectedPricePerKg: 28,
    recommendedSoil: 'Sandy loam rich in humus',
    waterNeed: 'Medium',
    baseCostPerAcre: {
      seedsPlantingCost: 14000,
      fertilizersChemicalsCost: 12500,
      waterIrrigationCost: 7500,
      electricityUtilitiesCost: 5000,
      otherExpensesCost: 4000,
      farmerCultivationServiceFee: 16000,
      totalEstimatedCost: 59000,
    },
  },
  {
    name: 'Golden Sweet Corn (Sugar-75)',
    category: 'Vegetables',
    durationDays: 85,
    season: 'All season',
    iconName: 'Sun',
    description: 'Tender juicy sweet corn cobs popular for fresh consumption, roasting, and frozen processing.',
    expectedYieldPerAcreKg: 7000,
    expectedPricePerKg: 32,
    recommendedSoil: 'Well-drained fertile loam',
    waterNeed: 'Medium',
    baseCostPerAcre: {
      seedsPlantingCost: 8500,
      fertilizersChemicalsCost: 11000,
      waterIrrigationCost: 6500,
      electricityUtilitiesCost: 4500,
      otherExpensesCost: 3500,
      farmerCultivationServiceFee: 15000,
      totalEstimatedCost: 49000,
    },
  },
];

export interface PartnershipCropProfile {
  cropName: string;
  category: string;
  farmingDurationDays: number;
  estimatedYieldKgPerAcre: number;
  seedsCostPerAcre: number;
  fertilizersCostPerAcre: number;
  waterIrrigationCostPerAcre: number;
  electricityCostPerAcre: number;
  otherExpensesPerAcre: number;
  farmerServiceChargePerAcre: number;
  description: string;
  keyMilestones: string[];
  recommendedSeasons: string[];
}

export const PARTNERSHIP_CROP_TEMPLATES: PartnershipCropProfile[] = CROP_PROFILES.map((p) => ({
  cropName: p.name,
  category: p.category,
  farmingDurationDays: p.durationDays,
  estimatedYieldKgPerAcre: p.expectedYieldPerAcreKg,
  seedsCostPerAcre: p.baseCostPerAcre.seedsPlantingCost,
  fertilizersCostPerAcre: p.baseCostPerAcre.fertilizersChemicalsCost,
  waterIrrigationCostPerAcre: p.baseCostPerAcre.waterIrrigationCost,
  electricityCostPerAcre: p.baseCostPerAcre.electricityUtilitiesCost,
  otherExpensesPerAcre: p.baseCostPerAcre.otherExpensesCost,
  farmerServiceChargePerAcre: p.baseCostPerAcre.farmerCultivationServiceFee,
  description: p.description,
  keyMilestones: [
    'Plot Preparation & Soil Enrichment',
    'Sowing & Seedling Establishment',
    'Nutrient Management & Irrigation',
    'Flowering, Fruiting & Pest Surveillance',
    'Selective Harvesting & Grading',
  ],
  recommendedSeasons: [p.season],
}));

export function calculatePartnershipCosts(
  cropInput: PartnershipCropProfile | CropProfile | string,
  areaSize: number,
  areaUnit: PlotAreaUnit
): FarmPartnershipCostBreakdown {
  const cropName =
    typeof cropInput === 'string'
      ? cropInput
      : 'cropName' in cropInput
      ? cropInput.cropName
      : cropInput.name;

  const crop =
    CROP_PROFILES.find((c) => c.name.toLowerCase().includes(cropName.toLowerCase())) ||
    CROP_PROFILES[0];

  const acreFraction = Math.max(0.02, convertToAcre(areaSize, areaUnit));

  // Round to nearest 10 rupees for clean UI numbers
  const round10 = (n: number) => Math.round((n * acreFraction) / 10) * 10;

  const seedsPlantingCost = Math.max(500, round10(crop.baseCostPerAcre.seedsPlantingCost));
  const fertilizersChemicalsCost = Math.max(600, round10(crop.baseCostPerAcre.fertilizersChemicalsCost));
  const waterIrrigationCost = Math.max(400, round10(crop.baseCostPerAcre.waterIrrigationCost));
  const electricityUtilitiesCost = Math.max(300, round10(crop.baseCostPerAcre.electricityUtilitiesCost));
  const otherExpensesCost = Math.max(250, round10(crop.baseCostPerAcre.otherExpensesCost));
  const farmerCultivationServiceFee = Math.max(1000, round10(crop.baseCostPerAcre.farmerCultivationServiceFee));

  const totalEstimatedCost =
    seedsPlantingCost +
    fertilizersChemicalsCost +
    waterIrrigationCost +
    electricityUtilitiesCost +
    otherExpensesCost +
    farmerCultivationServiceFee;

  const estimatedYieldKg = Math.round(crop.expectedYieldPerAcreKg * acreFraction);
  const estimatedMarketValue = Math.round(estimatedYieldKg * crop.expectedPricePerKg);

  return {
    seedsPlantingCost,
    fertilizersChemicalsCost,
    waterIrrigationCost,
    electricityUtilitiesCost,
    otherExpensesCost,
    farmerCultivationServiceFee,
    totalEstimatedCost,
    estimatedYieldKg,
    estimatedMarketValue,
  };
}

export const calculatePartnershipCost = calculatePartnershipCosts;


export type UserRole = 'farmer' | 'consumer' | 'admin';

export type FarmingStyle = 'Organic' | 'Conventional' | 'Mixed Farming';

export interface FarmDetails {
  farmName: string;
  locationAddress: string;
  lat: number;
  lng: number;
  farmSize: number;
  farmSizeUnit: 'acre' | 'hectare' | 'bigha';
  farmType: string;
  experienceYears: number;
  farmingStyle: FarmingStyle;
  cropsGrown: string[];
  bio: string;
  bannerImage?: string;
  farmPhotos?: string[];
}

export interface DeliveryAddress {
  id: string;
  label: string; // Home, Work, Farmhouse
  street: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
}

export interface User {
  id: string;
  role: UserRole;
  username: string; // Case-insensitive unique
  email: string;
  fullName: string;
  phone: string;
  createdAt: string;
  plainPassword?: string;
  farmDetails?: FarmDetails;
  deliveryAddresses?: DeliveryAddress[];
  currentBrowsingLocation?: {
    label: string;
    lat: number;
    lng: number;
  };
}

export interface Product {
  id: string;
  farmerId: string;
  farmName: string;
  farmerName: string;
  farmerLocation: string;
  farmLat: number;
  farmLng: number;
  name: string;
  category: 'Fruit' | 'Vegetable';
  quantity: number;
  unit: 'kg' | 'dozen' | 'bunch' | 'box' | 'piece';
  pricePerUnit: number;
  status: 'available' | 'low_stock' | 'out_of_stock';
  organic: boolean;
  image: string;
  description: string;
  rating: number;
  reviewsCount: number;
  harvestDate: string;
}

export interface FarmVisitSlot {
  id: string;
  farmerId: string;
  farmName: string;
  farmerName: string;
  farmLocation: string;
  farmLat: number;
  farmLng: number;
  date: string; // YYYY-MM-DD (start date)
  endDate?: string; // YYYY-MM-DD (active until date for weekly or multi-day slot)
  isWeeklyActive?: boolean; // true if active for week / multi-day without needing daily updates
  activeDuration?: '1_day' | '1_week' | '2_weeks' | '1_month' | 'custom';
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "11:30 AM"
  maxVisitors: number;
  bookedCount: number;
  pricePerPerson: number; // 0 for free entry
  activities: string[];
  status: 'open' | 'full' | 'closed' | 'completed' | 'cancelled';
  visitorsEnabled?: boolean; // easy toggle to stop/disable or allow visitors
  disableReason?: string; // e.g. "Crop maintenance / spraying in progress"
  notes?: string;
  images?: string[];
}

export interface FarmVisitBooking {
  id: string;
  bookingCode: string;
  slotId: string;
  farmerId: string;
  farmName: string;
  farmerName?: string;
  farmLocation?: string;
  farmLat?: number;
  farmLng?: number;
  farmerPhone?: string;
  images?: string[];
  consumerId: string;
  consumerName: string;
  consumerPhone: string;
  date: string; // exact visit date booked by consumer
  startTime: string;
  endTime: string;
  visitorCount: number;
  pricePerPerson: number;
  totalAmount: number;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  bookedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  category: 'Fruit' | 'Vegetable';
  unit: string;
  quantity: number;
  pricePerUnit: number;
  image: string;
}

export type OrderStatus = 'Placed' | 'Accepted' | 'Packing' | 'Out for Delivery' | 'Delivered';

export interface Order {
  id: string;
  orderCode: string;
  consumerId: string;
  consumerName: string;
  consumerPhone: string;
  farmerId: string;
  farmName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: {
    label?: string;
    street: string;
    city: string;
    pincode: string;
  };
  status: OrderStatus;
  createdAt: string;
  estimatedDelivery?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export type SchemeCategory =
  | 'Machinery & Equipment'
  | 'Irrigation & Solar'
  | 'Financial Aid & Income'
  | 'Organic & Natural Farming'
  | 'Crop Insurance & Credit'
  | 'Horticulture & Storage';

export interface GovernmentScheme {
  id: string;
  name: string;
  shortName: string;
  ministry: string;
  category: SchemeCategory;
  subsidyPercentage: string; // e.g. "40% - 50%" or "Up to 80%"
  maxSubsidyAmount?: string; // e.g. "Up to ₹1.5 Lakhs"
  directFinancialSupport?: string; // e.g. "₹6,000 / year"
  summary: string;
  eligibility: string[];
  documentsRequired: string[];
  keyBenefits: string[];
  howToApply: string[];
  officialPortalUrl: string;
  portalName: string;
  helpline: string;
  applicableStates: string; // e.g. "All India (Central Sector)"
  targetFarmers: 'All Farmers' | 'Small & Marginal Farmers' | 'Organic Growers' | 'SC/ST/Women Special';
  badge: string;
}

export type InstrumentCategory =
  | 'Powered Machinery'
  | 'Sprayers & Protection'
  | 'Irrigation & Pumps'
  | 'Hand & Harvesting Tools'
  | 'Soil Testing & Monitoring';

export interface FarmingInstrument {
  id: string;
  name: string;
  brand: string;
  category: InstrumentCategory;
  price: number;
  originalPrice: number;
  subsidyEligible: boolean;
  subsidyScheme?: string;
  estimatedSubsidy?: string;
  powerSource: 'Petrol / Diesel' | 'Electric / Battery' | 'Solar' | 'Manual';
  warrantyYears: number;
  rating: number;
  reviewsCount: number;
  inStock: boolean;
  stockCount: number;
  image: string;
  features: string[];
  specifications: Record<string, string>;
  description: string;
}

export interface InstrumentOrderItem {
  instrument: FarmingInstrument;
  quantity: number;
}

export interface InstrumentOrder {
  id: string;
  orderCode: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmAddress: string;
  items: InstrumentOrderItem[];
  subtotal: number;
  subsidyDiscount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: 'Cash on Delivery' | 'UPI / Online' | 'Government Subsidy Direct Claim';
  status: 'Confirmed' | 'Dispatched' | 'In Transit' | 'Delivered';
  orderDate: string;
  estimatedDelivery: string;
  trackingId: string;
}

// Farm Worker & Labor Request System
export type WorkerJobCategory =
  | 'Harvesting & Picking'
  | 'Sowing & Transplantation'
  | 'Weeding & De-stoning'
  | 'Pesticide & Fertilizer Spraying'
  | 'Irrigation & Canal Trenching'
  | 'Tractor & Power Tiller Operation'
  | 'Post-Harvest Sorting & Packing'
  | 'General Farm Maintenance & Fencing';

export type WorkerWageType = 'Daily' | 'Piece Rate' | 'Hourly';
export type WorkerRequestUrgency = 'Immediate (Within 24 Hours)' | 'Next 2-3 Days' | 'Planned / Upcoming Week';
export type WorkerRequestStatus =
  | 'Open / Seeking Workers'
  | 'Partially Matched'
  | 'Workers Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export interface FarmWorkerRequest {
  id: string;
  requestCode: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmName: string;
  farmLocation: string;
  jobCategory: WorkerJobCategory;
  cropName: string;
  workersNeeded: number;
  assignedWorkersCount: number;
  startDate: string;
  endDate?: string;
  durationDays: number;
  workingHours: string;
  wagePerWorker: number;
  wageType: WorkerWageType;
  urgency: WorkerRequestUrgency;
  mealsProvided: boolean;
  transportProvided: boolean;
  accommodationProvided: boolean;
  specialInstructions?: string;
  status: WorkerRequestStatus;
  createdAt: string;
  assignedContractor?: {
    groupName: string;
    contactPerson: string;
    phone: string;
    workersConfirmed: number;
    rating: number;
  };
}

export interface LocalLaborGroup {
  id: string;
  groupName: string;
  leaderName: string;
  phone: string;
  availableWorkers: number;
  location: string;
  specialties: string[];
  dailyRateEstimate: string;
  rating: number;
  verified: boolean;
  distanceKm: number;
}

export interface AdminUserData extends User {
  plainPassword?: string;
  productsCount?: number;
  ordersCount?: number;
  slotsCount?: number;
  bookingsCount?: number;
  workerRequestsCount?: number;
  totalRevenue?: number;
  totalSpent?: number;
  products?: Product[];
  orders?: Order[];
  bookings?: FarmVisitBooking[];
  slots?: FarmVisitSlot[];
  workerRequests?: FarmWorkerRequest[];
}

export type AdminActivityType =
  | 'user_registered'
  | 'user_login'
  | 'order_placed'
  | 'order_status_updated'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'slot_created'
  | 'booking_created'
  | 'booking_status_updated'
  | 'worker_request_created'
  | 'worker_request_status_updated'
  | 'plot_listed'
  | 'plot_updated'
  | 'partnership_created'
  | 'partnership_milestone_updated'
  | 'partnership_harvested'
  | 'partnership_settled'
  | 'password_updated'
  | 'profile_updated';

export interface AdminActivity {
  id: string;
  type: AdminActivityType;
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  userRole?: 'farmer' | 'consumer' | 'admin';
  metadata?: Record<string, any>;
}

// --- Consumer-Funded Farming / Farm Partnership Types ---

export type PlotAreaUnit = 'acre' | 'guntha' | 'sq_ft' | 'hectare';

export interface FarmPlotListing {
  id: string;
  farmerId: string;
  farmName: string;
  farmerName: string;
  farmerPhone: string;
  farmLocation: string;
  farmLat: number;
  farmLng: number;
  plotName: string;
  plotIdentifier: string; // e.g. "PLOT-NORTH-4B"
  areaSize: number;
  areaUnit: PlotAreaUnit;
  soilType: string;
  waterSource: string;
  availableFrom: string; // YYYY-MM-DD
  status: 'available' | 'partnered' | 'inactive';
  supportedCrops: string[];
  farmingStyle: FarmingStyle;
  description: string;
  images: string[];
  estimatedBaseCostPerUnit?: number;
  standardFarmerServiceFee?: number;
  termsNote?: string;
  createdAt: string;
}

export interface FarmPartnershipCostBreakdown {
  seedsPlantingCost: number;
  fertilizersChemicalsCost: number;
  waterIrrigationCost: number;
  electricityUtilitiesCost: number;
  otherExpensesCost: number;
  farmerCultivationServiceFee: number;
  totalEstimatedCost: number;
  estimatedYieldKg?: number;
  estimatedMarketValue?: number;
}

export type PartnershipBillingPlanType = 'full' | 'milestone' | 'monthly';

export interface PartnershipInstallment {
  id: string;
  installmentNumber: number;
  title: string;
  stageName: string;
  percentage: number;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Scheduled' | 'Pending';
  paidAt?: string;
  transactionId?: string;
  paymentMethod?: string;
  receiptNumber?: string;
}

export interface PartnershipBillingDetails {
  invoiceNumber: string;
  invoiceDate: string;
  planType: PartnershipBillingPlanType;
  baseCost: number;
  discountAmount: number;
  discountCode?: string;
  netPayableAmount: number;
  amountPaidToday: number;
  remainingBalance: number;
  installments: PartnershipInstallment[];
  taxBreakdown: {
    landRentPortion: number;
    seedsInputsPortion: number;
    irrigationPowerPortion: number;
    farmerServicePortion: number;
    gstRate: number; // 0% - Agri exempt
    gstAmount: number;
    escrowFee: number; // ₹0 Free
  };
  paymentReceipt: {
    receiptNumber: string;
    paidBy: string;
    paymentMethod: string;
    transactionRef: string;
    paidAmount: number;
    paymentDate: string;
    escrowLockStatus: 'Secured in Escrow' | 'Disbursed';
  };
}

export type PartnershipStage =
  | 'Plot Preparation'
  | 'Sowing & Planting'
  | 'Irrigation & Care'
  | 'Flowering & Fruiting'
  | 'Ready for Harvest'
  | 'Harvested'
  | 'Settled';

export interface CropMilestone {
  id: string;
  stage: PartnershipStage;
  title: string;
  description: string;
  date: string;
  photoUrl?: string;
  recordedBy: 'farmer' | 'consumer' | 'system';
}

export interface FarmPartnership {
  id: string;
  partnershipCode: string; // e.g. "FP-2026-089"
  plotId: string;
  plotName: string;
  plotIdentifier: string;
  areaSize: number;
  areaUnit: PlotAreaUnit;

  // Farmer & Farm Details
  farmerId: string;
  farmName: string;
  farmerName: string;
  farmerPhone: string;
  farmerLocation: string;
  farmLat: number;
  farmLng: number;

  // Consumer Details
  consumerId: string;
  consumerName: string;
  consumerPhone: string;
  consumerEmail?: string;

  // Crop & Project Details
  cropName: string;
  farmingDurationDays: number;
  startDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;

  // Cost & Funding
  costBreakdown: FarmPartnershipCostBreakdown;
  totalFundingAmount: number;
  billingPlan?: PartnershipBillingPlanType;
  billingDetails?: PartnershipBillingDetails;
  paymentStatus: 'Escrow Secured' | 'Disbursed to Farmer' | 'Refunded';
  paymentMethod: string;
  paymentDate: string;
  transactionId: string;

  // Lifecycle & Progress
  status: 'active' | 'harvested' | 'settled' | 'cancelled';
  currentStage: PartnershipStage;
  progressPercentage: number; // 0 to 100
  milestones: CropMilestone[];

  // Legal & Ownership Clarity
  legalTerms: {
    farmerLandOwnershipConfirmed: boolean;
    consumerProduceRightsConfirmed: boolean;
    agreementSummary: string;
  };

  // Harvest Record
  harvestRecord?: {
    harvestedQuantity: number;
    harvestUnit: 'kg' | 'quintal' | 'box' | 'piece';
    harvestDate: string;
    qualityGrade: 'A+' | 'A' | 'B';
    farmerNotes?: string;
    harvestPhoto?: string;
  };

  // Settlement & Produce Rights
  settlement?: {
    choice: 'take_produce' | 'sell_in_marketplace';
    deliveryAddress?: string;
    dispatchStatus?: 'Pending Delivery' | 'Dispatched' | 'Delivered' | 'Picked Up';
    sellingPricePerUnit?: number;
    estimatedMarketValue?: number;
    totalGrossRevenue?: number;
    farmerLaborPaid?: number;
    consumerNetPayout?: number;
    settledAt?: string;
    payoutRef?: string;
    notes?: string;
  };

  createdAt: string;
  updatedAt: string;
}

export interface AdminOverviewData {
  version: number;
  metrics: {
    totalFarmers: number;
    totalConsumers: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalBookings: number;
    totalWorkerRequests: number;
    activeLaborers: number;
    totalPartnerships?: number;
    totalPartnershipFunding?: number;
    availablePlotsCount?: number;
  };
  users: AdminUserData[];
  allOrders: Order[];
  allBookings: FarmVisitBooking[];
  allProducts: Product[];
  allSlots: FarmVisitSlot[];
  allWorkerRequests: FarmWorkerRequest[];
  allPlots?: FarmPlotListing[];
  allPartnerships?: FarmPartnership[];
  recentActivities: AdminActivity[];
}



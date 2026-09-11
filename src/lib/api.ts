import {
  User,
  Product,
  FarmVisitSlot,
  FarmVisitBooking,
  Order,
  UserRole,
  FarmWorkerRequest,
  LocalLaborGroup,
  AdminOverviewData,
  AdminActivity,
  FarmPlotListing,
  FarmPartnership,
  CropMilestone,
} from '../types.js';

import { calculateAccurateDistanceKm } from './geo.js';

// Haversine formula to compute actual distance in km between two lat/lng coordinates
export function calculateDistanceKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number {
  return calculateAccurateDistanceKm(lat1, lon1, lat2, lon2);
}

export const api = {
  // Auth
  async register(data: any): Promise<{ token: string; user: User; message: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
  },

  async login(
    identifier: string,
    password: string,
    expectedRole?: UserRole
  ): Promise<{ token: string; user: User; message: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, expectedRole }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    return json;
  },

  async requestPasswordReset(identifier: string): Promise<{ success: boolean; message: string; demoOtp: string; identifier: string }> {
    const res = await fetch('/api/auth/forgot-password/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Password reset request failed');
    return json;
  },

  async confirmPasswordReset(data: {
    identifier: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Password reset failed');
    return json;
  },

  async getMe(userId: string): Promise<{ user: User }> {
    const res = await fetch(`/api/auth/me?userId=${encodeURIComponent(userId)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch user');
    return json;
  },

  // Products
  async getProducts(filter?: { category?: string; farmerId?: string; search?: string }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filter?.category) params.append('category', filter.category);
    if (filter?.farmerId) params.append('farmerId', filter.farmerId);
    if (filter?.search) params.append('search', filter.search);

    const res = await fetch(`/api/products?${params.toString()}`);
    const json = await res.json();
    return json.products || [];
  },

  async createProduct(data: Partial<Product>): Promise<{ product: Product; message: string }> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create product');
    return json;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<{ product: Product; message: string }> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update product');
    return json;
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete product');
    return json;
  },

  // Slots
  async getSlots(filter?: { farmerId?: string; date?: string }): Promise<FarmVisitSlot[]> {
    const params = new URLSearchParams();
    if (filter?.farmerId) params.append('farmerId', filter.farmerId);
    if (filter?.date) params.append('date', filter.date);

    const res = await fetch(`/api/slots?${params.toString()}`);
    const json = await res.json();
    return json.slots || [];
  },

  async createSlot(data: Partial<FarmVisitSlot>): Promise<{ slot: FarmVisitSlot; message: string }> {
    const res = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create slot');
    return json;
  },

  async updateSlot(id: string, data: Partial<FarmVisitSlot>): Promise<{ slot: FarmVisitSlot; message: string }> {
    const res = await fetch(`/api/slots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update slot');
    return json;
  },

  async deleteSlot(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/slots/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete slot');
    return json;
  },

  // Bookings
  async getBookings(filter?: { farmerId?: string; consumerId?: string }): Promise<FarmVisitBooking[]> {
    const params = new URLSearchParams();
    if (filter?.farmerId) params.append('farmerId', filter.farmerId);
    if (filter?.consumerId) params.append('consumerId', filter.consumerId);

    const res = await fetch(`/api/bookings?${params.toString()}`);
    const json = await res.json();
    return json.bookings || [];
  },

  async createBooking(data: {
    slotId: string;
    consumerId: string;
    visitorCount: number;
    visitDate?: string;
    specialNotes?: string;
  }): Promise<{ booking: FarmVisitBooking; message: string }> {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to book slot');
    return json;
  },

  async updateBookingStatus(id: string, status: FarmVisitBooking['status']): Promise<{ booking: FarmVisitBooking; message: string }> {
    const res = await fetch(`/api/bookings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update booking');
    return json;
  },

  // Orders
  async createOrder(data: {
    consumerId: string;
    farmerId: string;
    items: any[];
    deliveryAddress: any;
  }): Promise<{ order: Order; message: string }> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to place order');
    return json;
  },

  async getOrders(filter?: { farmerId?: string; consumerId?: string }): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filter?.farmerId) params.append('farmerId', filter.farmerId);
    if (filter?.consumerId) params.append('consumerId', filter.consumerId);

    const res = await fetch(`/api/orders?${params.toString()}`);
    const json = await res.json();
    return json.orders || [];
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<{ order: Order; message: string }> {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update order status');
    return json;
  },

  // Farms
  async getFarmers(): Promise<any[]> {
    const res = await fetch('/api/farmers');
    const json = await res.json();
    return json.farmers || [];
  },

  async updateFarmerProfile(farmerId: string, data: any): Promise<User> {
    const res = await fetch(`/api/farmers/${farmerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update farm profile');
    return json.user;
  },

  async updateConsumerLocation(consumerId: string, data: any): Promise<User> {
    const res = await fetch(`/api/consumers/${consumerId}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update consumer location');
    return json.user;
  },

  // App Banner Configuration
  async getAppBanner(): Promise<string | null> {
    try {
      const res = await fetch('/api/app-banner');
      const json = await res.json();
      return json.bannerUrl || null;
    } catch {
      return null;
    }
  },

  async updateAppBanner(bannerUrl: string): Promise<string> {
    const res = await fetch('/api/app-banner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerUrl }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update app banner');
    return json.bannerUrl;
  },

  // Farm Worker Requests & Labor Assistance
  async getWorkerRequests(farmerId?: string): Promise<FarmWorkerRequest[]> {
    const url = farmerId ? `/api/worker-requests?farmerId=${encodeURIComponent(farmerId)}` : '/api/worker-requests';
    const res = await fetch(url);
    const json = await res.json();
    return json.requests || [];
  },

  async createWorkerRequest(data: Partial<FarmWorkerRequest>): Promise<{ request: FarmWorkerRequest; message: string }> {
    const res = await fetch('/api/worker-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to submit worker request');
    return json;
  },

  async updateWorkerRequest(id: string, data: Partial<FarmWorkerRequest>): Promise<{ request: FarmWorkerRequest; message: string }> {
    const res = await fetch(`/api/worker-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update worker request');
    return json;
  },

  async assignWorkerContractor(id: string, data: { contractor: any; assignedCount?: number }): Promise<{ request: FarmWorkerRequest; message: string }> {
    const res = await fetch(`/api/worker-requests/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to assign labor team');
    return json;
  },

  async deleteWorkerRequest(id: string): Promise<boolean> {
    const res = await fetch(`/api/worker-requests/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete worker request');
    return true;
  },

  async getLocalLaborGroups(): Promise<LocalLaborGroup[]> {
    const res = await fetch('/api/local-labor-groups');
    const json = await res.json();
    return json.groups || [];
  },

  // Admin Master Control APIs
  async getAdminOverview(): Promise<AdminOverviewData> {
    const res = await fetch('/api/admin/overview');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch admin overview data');
    return json;
  },

  async getAdminSync(sinceVersion?: number): Promise<{
    success: boolean;
    version: number;
    hasUpdates: boolean;
    latestActivity: AdminActivity | null;
    recentActivities: AdminActivity[];
  }> {
    const url = sinceVersion !== undefined ? `/api/admin/sync?since=${sinceVersion}` : '/api/admin/sync';
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to sync admin status');
    return json;
  },

  async getAdminActivities(limit = 60): Promise<{ success: boolean; version: number; activities: AdminActivity[] }> {
    const res = await fetch(`/api/admin/activities?limit=${limit}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch activities');
    return json;
  },

  async updateUserPasswordAsAdmin(userId: string, newPassword: string): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch(`/api/admin/users/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update user password');
    return json;
  },

  async updateOrderStatusAsAdmin(orderId: string, status: Order['status']): Promise<{ success: boolean; order: Order }> {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update order status');
    return json;
  },

  async updateWorkerRequestStatusAsAdmin(requestId: string, status: string, assignedWorkersCount?: number): Promise<{ success: boolean; workerRequest: FarmWorkerRequest }> {
    const res = await fetch(`/api/admin/worker-requests/${requestId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, assignedWorkersCount }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update worker request status');
    return json;
  },

  // Farm Plots (Consumer-Funded Farming / Land Listings)
  async getPlots(filter?: { farmerId?: string; status?: string }): Promise<FarmPlotListing[]> {
    const params = new URLSearchParams();
    if (filter?.farmerId) params.append('farmerId', filter.farmerId);
    if (filter?.status) params.append('status', filter.status);

    const res = await fetch(`/api/plots?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch plots');
    return json.plots || [];
  },

  async getPlotById(id: string): Promise<FarmPlotListing> {
    const res = await fetch(`/api/plots/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch plot details');
    return json.plot;
  },

  async createPlot(data: Partial<FarmPlotListing>): Promise<{ plot: FarmPlotListing; message: string }> {
    const res = await fetch('/api/plots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to list farm plot');
    return json;
  },

  async updatePlot(id: string, data: Partial<FarmPlotListing>): Promise<{ plot: FarmPlotListing; message: string }> {
    const res = await fetch(`/api/plots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update plot');
    return json;
  },

  async deletePlot(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/plots/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete plot');
    return json;
  },

  // Farm Partnerships (Consumer-Funded Farming Execution)
  async getPartnerships(filter?: { farmerId?: string; consumerId?: string; status?: string }): Promise<FarmPartnership[]> {
    const params = new URLSearchParams();
    if (filter?.farmerId) params.append('farmerId', filter.farmerId);
    if (filter?.consumerId) params.append('consumerId', filter.consumerId);
    if (filter?.status) params.append('status', filter.status);

    const res = await fetch(`/api/partnerships?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch partnerships');
    return json.partnerships || [];
  },

  async getPartnershipById(id: string): Promise<FarmPartnership> {
    const res = await fetch(`/api/partnerships/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch partnership');
    return json.partnership;
  },

  async createPartnership(data: any): Promise<{ partnership: FarmPartnership; message: string }> {
    const res = await fetch('/api/partnerships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create partnership');
    return json;
  },

  async addPartnershipMilestone(
    id: string,
    data: {
      stage: string;
      title: string;
      description: string;
      date?: string;
      photoUrl?: string;
      progressPercentage?: number;
    }
  ): Promise<{ partnership: FarmPartnership; message: string }> {
    const res = await fetch(`/api/partnerships/${id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to post milestone update');
    return json;
  },

  async recordPartnershipHarvest(
    id: string,
    data: {
      harvestedQuantity: number;
      harvestUnit: string;
      harvestDate?: string;
      qualityGrade?: string;
      farmerNotes?: string;
      harvestPhoto?: string;
    }
  ): Promise<{ partnership: FarmPartnership; message: string }> {
    const res = await fetch(`/api/partnerships/${id}/harvest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to record harvest');
    return json;
  },

  async settlePartnership(
    id: string,
    data: {
      choice: 'take_produce' | 'sell_in_marketplace';
      deliveryAddress?: string;
      sellingPricePerUnit?: number;
      notes?: string;
    }
  ): Promise<{ partnership: FarmPartnership; message: string }> {
    const res = await fetch(`/api/partnerships/${id}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to settle partnership');
    return json;
  },

  async payPartnershipInstallment(
    id: string,
    installmentId: string,
    data: {
      paymentMethod: string;
      notes?: string;
    }
  ): Promise<{ partnership: FarmPartnership; message: string; receipt: any }> {
    const res = await fetch(`/api/partnerships/${id}/pay-installment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installmentId, ...data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to pay installment');
    return json;
  },
};

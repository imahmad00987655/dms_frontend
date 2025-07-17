const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async signup(userData) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async verifyOTP(email, otp) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async resetPassword(email, otp, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword })
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Journal Entry methods
  async getJournalEntries() {
    return this.request('/journal-entries');
  }

  async getJournalEntry(id) {
    return this.request(`/journal-entries/${id}`);
  }

  async createJournalEntry(entryData) {
    return this.request('/journal-entries', {
      method: 'POST',
      body: JSON.stringify(entryData)
    });
  }

  async updateJournalEntry(id, entryData) {
    return this.request(`/journal-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entryData)
    });
  }

  async postJournalEntry(id) {
    return this.request(`/journal-entries/${id}/post`, {
      method: 'POST'
    });
  }

  async getChartOfAccounts() {
    return this.request('/journal-entries/accounts/list');
  }

  // Inventory Items
  async getInventoryItems() {
    return this.request('/inventory-items');
  }

  async getInventoryItem(id) {
    return this.request(`/inventory-items/${id}`);
  }

  async createInventoryItem(data) {
    return this.request('/inventory-items', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Bin Cards
  async getBinCards() {
    return this.request('/bin-cards');
  }

  async getBinCard(id) {
    return this.request(`/bin-cards/${id}`);
  }

  async createBinCard(data) {
    return this.request('/bin-cards', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Assets
  async getAssets() {
    return this.request('/assets');
  }

  async getAsset(id) {
    return this.request(`/assets/${id}`);
  }

  async createAsset(data) {
    return this.request('/assets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateAsset(id, data) {
    return this.request(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteAsset(id) {
    return this.request(`/assets/${id}`, {
      method: 'DELETE'
    });
  }

  async getAssetsByCategory(category) {
    return this.request(`/assets/category/${category}`);
  }

  async getAssetsByDepartment(department) {
    return this.request(`/assets/department/${department}`);
  }

  async getAssetsByCondition(condition) {
    return this.request(`/assets/condition/${condition}`);
  }

  async getAssetStats() {
    return this.request('/assets/stats/summary');
  }

  // Invoices
  async getInvoices() {
    return this.request('/invoices');
  }

  async createInvoice(data) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createVendorInvoice(data) {
    return this.request('/vendor-invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getVendorInvoices() {
    return this.request('/vendor-invoices');
  }

  async getVendorInvoice(id) {
    return this.request(`/vendor-invoices/${id}`);
  }

  async updateVendorInvoice(id, data) {
    return this.request(`/vendor-invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteVendorInvoice(id) {
    return this.request(`/vendor-invoices/${id}`, {
      method: 'DELETE'
    });
  }

  // Payments
  async getPayments() {
    return this.request('/payments');
  }

  async getPayment(id) {
    return this.request(`/payments/${id}`);
  }

  async createPayment(data) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePayment(id, data) {
    return this.request(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePayment(id) {
    return this.request(`/payments/${id}`, {
      method: 'DELETE'
    });
  }

  async getInvoice(id) {
    return this.request(`/invoices/${id}`);
  }

  // Customers
  async getCustomers() {
    return this.request('/customers');
  }

  // Receipts
  async getReceipts() {
    return this.request('/receipts');
  }

  async getReceipt(id) {
    return this.request(`/receipts/${id}`);
  }

  async createReceipt(data) {
    return this.request('/receipts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService; 
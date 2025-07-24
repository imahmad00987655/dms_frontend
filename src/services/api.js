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

  // Update invoice status
  async updateInvoiceStatus(id, status) {
    return this.request(`/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // ============================================================================
  // NORMALIZED PAYABLES SYSTEM (Oracle E-Business Suite R12 Model)
  // ============================================================================

  // AP Suppliers
  async getAPSuppliers() {
    return this.request('/ap/suppliers');
  }

  async getAPSupplier(id) {
    return this.request(`/ap/suppliers/${id}`);
  }

  async createAPSupplier(data) {
    return this.request('/ap/suppliers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateAPSupplier(id, data) {
    return this.request(`/ap/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteAPSupplier(id) {
    return this.request(`/ap/suppliers/${id}`, {
      method: 'DELETE'
    });
  }

  async getAPSupplierSites(supplierId) {
    return this.request(`/ap/suppliers/${supplierId}/sites`);
  }

  async createAPSupplierSite(supplierId, data) {
    return this.request(`/ap/suppliers/${supplierId}/sites`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // AP Invoices
  async getAPInvoices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/ap/invoices${queryString ? `?${queryString}` : ''}`);
  }

  async getAPInvoice(id) {
    return this.request(`/ap/invoices/${id}`);
  }

  async createAPInvoice(data) {
    return this.request('/ap/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateAPInvoice(id, data) {
    return this.request(`/ap/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateAPInvoiceStatus(id, status, approval_status) {
    return this.request(`/ap/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, approval_status })
    });
  }

  async deleteAPInvoice(id) {
    return this.request(`/ap/invoices/${id}`, {
      method: 'DELETE'
    });
  }

  async getAPInvoiceLines(invoiceId) {
    return this.request(`/ap/invoices/${invoiceId}/lines`);
  }

  async getAPInvoicePayments(invoiceId) {
    return this.request(`/ap/invoices/${invoiceId}/payments`);
  }

  // AP Payments
  async getAPPayments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/ap/payments${queryString ? `?${queryString}` : ''}`);
  }

  async getAPPayment(id) {
    return this.request(`/ap/payments/${id}`);
  }

  async createAPPayment(data) {
    return this.request('/ap/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateAPPayment(id, data) {
    return this.request(`/ap/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateAPPaymentStatus(id, status) {
    return this.request(`/ap/payments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async deleteAPPayment(id) {
    return this.request(`/ap/payments/${id}`, {
      method: 'DELETE'
    });
  }

  async getAPPaymentApplications(paymentId) {
    return this.request(`/ap/payments/${paymentId}/applications`);
  }

  async createAPPaymentApplication(paymentId, data) {
    return this.request(`/ap/payments/${paymentId}/applications`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ============================================================================
  // CUSTOMER/SUPPLIER MANAGEMENT SYSTEM (Oracle Apps R12 Structure)
  // ============================================================================

  // Party Management
  async getParties() {
    return this.request('/customer-supplier/parties');
  }

  async getParty(id) {
    return this.request(`/customer-supplier/parties/${id}`);
  }

  async createParty(partyData) {
    return this.request('/customer-supplier/parties', {
      method: 'POST',
      body: JSON.stringify(partyData)
    });
  }

  async updateParty(id, partyData) {
    return this.request(`/customer-supplier/parties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partyData)
    });
  }

  async deleteParty(id) {
    return this.request(`/customer-supplier/parties/${id}`, {
      method: 'DELETE'
    });
  }

  // Party Sites Management
  async getPartySites(partyId) {
    return this.request(`/customer-supplier/parties/${partyId}/sites`);
  }

  async createPartySite(partyId, siteData) {
    return this.request(`/customer-supplier/parties/${partyId}/sites`, {
      method: 'POST',
      body: JSON.stringify(siteData)
    });
  }

  async updatePartySite(siteId, siteData) {
    return this.request(`/customer-supplier/sites/${siteId}`, {
      method: 'PUT',
      body: JSON.stringify(siteData)
    });
  }

  async deletePartySite(siteId) {
    return this.request(`/customer-supplier/sites/${siteId}`, {
      method: 'DELETE'
    });
  }

  // Customer Profiles Management
  async getCustomers() {
    return this.request('/customer-supplier/customers');
  }

  async getCustomer(id) {
    return this.request(`/customer-supplier/customers/${id}`);
  }

  async createCustomer(customerData) {
    return this.request('/customer-supplier/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  }

  async updateCustomer(id, customerData) {
    return this.request(`/customer-supplier/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData)
    });
  }

  async deleteCustomer(id) {
    return this.request(`/customer-supplier/customers/${id}`, {
      method: 'DELETE'
    });
  }

  // Supplier Profiles Management
  async getSuppliers() {
    return this.request('/customer-supplier/suppliers');
  }

  async getSupplier(id) {
    return this.request(`/customer-supplier/suppliers/${id}`);
  }

  async createSupplier(supplierData) {
    return this.request('/customer-supplier/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData)
    });
  }

  async updateSupplier(id, supplierData) {
    return this.request(`/customer-supplier/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplierData)
    });
  }

  async deleteSupplier(id) {
    return this.request(`/customer-supplier/suppliers/${id}`, {
      method: 'DELETE'
    });
  }

  // Contact Points Management
  async getPartyContacts(partyId) {
    return this.request(`/customer-supplier/parties/${partyId}/contacts`);
  }

  async createContactPoint(partyId, contactData) {
    return this.request(`/customer-supplier/parties/${partyId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(contactData)
    });
  }

  async updateContactPoint(contactPointId, contactData) {
    return this.request(`/customer-supplier/contacts/${contactPointId}`, {
      method: 'PUT',
      body: JSON.stringify(contactData)
    });
  }

  async deleteContactPoint(contactPointId) {
    return this.request(`/customer-supplier/contacts/${contactPointId}`, {
      method: 'DELETE'
    });
  }

  // Search and Filter
  async searchParties(params = {}) {
    const queryParams = new URLSearchParams(params);
    return this.request(`/customer-supplier/search/parties?${queryParams}`);
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService; 
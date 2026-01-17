/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TINY SEED OS - UNIFIED API CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Include this file in all HTML apps to share API configuration and helpers
 *
 * Usage in HTML files:
 * <script src="api-config.js"></script>
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const TINY_SEED_API = {
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SOURCE OF TRUTH FOR API URL
    // ═══════════════════════════════════════════════════════════════════════════
    // !!! ALL HTML FILES SHOULD IMPORT THIS FILE - DO NOT HARDCODE API URLS !!!
    //
    // Main OS Sheet ID: 128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc
    //
    // LAST UPDATED: 2026-01-15
    // UPDATED BY: Architecture Claude
    // ═══════════════════════════════════════════════════════════════════════════

    MAIN_API: 'https://script.google.com/macros/s/AKfycbyjK7Zr9DAXefhgLzLb7YYRwS7daEcuWVcNMsg1m-jAcmpKZBrHHOgMOtpb2D7udQU/exec',

    // Farm location for geofencing (update with your actual farm coordinates)
    FARM_LOCATION: {
        lat: 40.7956,
        lng: -80.1384,
        radius: 500 // meters
    },

    // App URLs for redirects
    APP_URLS: {
        wholesale: 'wholesale.html',
        csa: 'csa.html',
        driver: 'driver.html',
        employee: 'employee.html',
        sales: 'sales.html'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// API HELPER CLASS
// ═══════════════════════════════════════════════════════════════════════════

class TinySeedAPI {
    constructor(baseUrl = TINY_SEED_API.MAIN_API) {
        this.baseUrl = baseUrl;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * Make a GET request to the API
     * @param {string} action - The API action to call
     * @param {object} params - Additional parameters
     * @returns {Promise<object>} - API response
     */
    async get(action, params = {}) {
        const queryParams = new URLSearchParams({ action, ...params });
        const url = `${this.baseUrl}?${queryParams.toString()}`;

        return this.fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
    }

    /**
     * Make a POST request to the API
     * @param {string} action - The API action to call
     * @param {object} data - Request body data
     * @returns {Promise<object>} - API response
     */
    async post(action, data = {}) {
        return this.fetchWithRetry(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ action, ...data })
        });
    }

    /**
     * Fetch with automatic retry on failure
     */
    async fetchWithRetry(url, options, attempt = 1) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            if (attempt < this.retryAttempts) {
                console.log(`API attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
                await this.sleep(this.retryDelay);
                return this.fetchWithRetry(url, options, attempt + 1);
            }
            throw error;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test the API connection
     * @returns {Promise<object>} - Connection test result
     */
    async testConnection() {
        return this.get('testConnection');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES API METHODS
// ═══════════════════════════════════════════════════════════════════════════

class SalesAPI extends TinySeedAPI {
    // ═══════════════════════════════════════════════════════════════════════════
    // ORDERS
    // ═══════════════════════════════════════════════════════════════════════════
    async getOrders(filters = {}) {
        return this.get('getSalesOrders', filters);
    }

    async getOrderById(orderId) {
        return this.get('getOrderById', { orderId });
    }

    async createOrder(orderData) {
        return this.post('createSalesOrder', orderData);
    }

    async updateOrder(orderId, updates) {
        return this.post('updateSalesOrder', { orderId, ...updates });
    }

    async cancelOrder(orderId) {
        return this.post('cancelSalesOrder', { orderId });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOMERS
    // ═══════════════════════════════════════════════════════════════════════════
    async getCustomers(filters = {}) {
        return this.get('getSalesCustomers', filters);
    }

    async getCustomerById(customerId) {
        return this.get('getCustomerById', { customerId });
    }

    async createCustomer(customerData) {
        return this.post('createSalesCustomer', customerData);
    }

    async updateCustomer(customerId, updates) {
        return this.post('updateSalesCustomer', { customerId, ...updates });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CSA MEMBERS
    // ═══════════════════════════════════════════════════════════════════════════
    async getCSAMembers(filters = {}) {
        return this.get('getSalesCSAMembers', filters);
    }

    async createCSAMember(memberData) {
        return this.post('createCSAMember', memberData);
    }

    async updateCSAMember(memberId, updates) {
        return this.post('updateCSAMember', { memberId, ...updates });
    }

    async getCSABoxContents(weekDate, shareType = '') {
        return this.get('getCSABoxContents', { weekDate, shareType });
    }

    async customizeCSABox(memberId, weekDate, swaps) {
        return this.post('customizeCSABox', { memberId, weekDate, swaps });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRODUCTS (from REF_Crops)
    // ═══════════════════════════════════════════════════════════════════════════
    async getWholesaleProducts(filters = {}) {
        return this.get('getWholesaleProducts', filters);
    }

    async getCSAProducts(filters = {}) {
        return this.get('getCSAProducts', filters);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PICK & PACK
    // ═══════════════════════════════════════════════════════════════════════════
    async getPickPackList(date, status = '', customerType = '') {
        return this.get('getPickPackList', { date, status, customerType });
    }

    async completePickItem(pickId, pickedBy, notes = '') {
        return this.post('completePickPackItem', { pickId, pickedBy, notes });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELIVERY & ROUTES
    // ═══════════════════════════════════════════════════════════════════════════
    async getDeliveryRoutes(date, driverId = '') {
        return this.get('getDeliveryRoutes', { date, driverId });
    }

    async createDeliveryRoute(routeData) {
        return this.post('createDeliveryRoute', routeData);
    }

    async assignRoute(routeId, driverId, driverName) {
        return this.post('assignDeliveryRoute', { routeId, driverId, driverName });
    }

    async getDrivers(activeOnly = true) {
        return this.get('getDeliveryDrivers', { activeOnly });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INVENTORY
    // ═══════════════════════════════════════════════════════════════════════════
    async getInventory(filters = {}) {
        return this.get('getInventoryProducts', filters);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DASHBOARD & REPORTS
    // ═══════════════════════════════════════════════════════════════════════════
    async getDashboardStats() {
        return this.get('getDashboardStats');
    }

    async getDashboard() {
        return this.get('getSalesDashboard');
    }

    async getReports(startDate, endDate) {
        return this.get('getSalesReports', { startDate, endDate });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SMS CAMPAIGNS
    // ═══════════════════════════════════════════════════════════════════════════
    async getCampaigns(filters = {}) {
        return this.get('getSMSCampaigns', filters);
    }

    async createCampaign(campaignData) {
        return this.post('createSMSCampaign', campaignData);
    }

    async sendCampaign(campaignId) {
        return this.post('sendSMSCampaign', { campaignId });
    }

    // Alias for compatibility
    async sendSMSCampaign(campaignId) {
        return this.sendCampaign(campaignId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FLEET MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    async getFleetAssets(filters = {}) {
        return this.get('getFleetAssets', filters);
    }

    async getFleetAssetById(assetId) {
        return this.get('getFleetAssetById', { assetId });
    }

    async createFleetAsset(assetData) {
        return this.post('createFleetAsset', assetData);
    }

    async updateFleetAsset(assetId, updates) {
        return this.post('updateFleetAsset', { assetId, ...updates });
    }

    async logFleetUsage(usageData) {
        return this.post('logFleetUsage', usageData);
    }

    async getFleetUsageLog(filters = {}) {
        return this.get('getFleetUsageLog', filters);
    }

    async logFleetFuel(fuelData) {
        return this.post('logFleetFuel', fuelData);
    }

    async logFleetMaintenance(maintData) {
        return this.post('logFleetMaintenance', maintData);
    }

    async getMaintenanceDue(threshold = 25) {
        return this.get('getMaintenanceDue', { threshold });
    }

    async getFleetDashboard() {
        return this.get('getFleetDashboard');
    }

    async getFleetCostReport(filters = {}) {
        return this.get('getFleetCostReport', filters);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER PORTAL API METHODS
// ═══════════════════════════════════════════════════════════════════════════

class CustomerPortalAPI extends TinySeedAPI {
    constructor(customerType = 'Wholesale') {
        super();
        this.customerType = customerType; // 'Wholesale' or 'CSA'
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTHENTICATION (Magic Link)
    // ═══════════════════════════════════════════════════════════════════════════
    async sendMagicLink(email, baseUrl = window.location.origin) {
        return this.post('sendCustomerMagicLink', { email, baseUrl });
    }

    async verifyMagicLink(token, email) {
        return this.get('verifyCustomerToken', { token, email });
    }

    async authenticateCustomer(token, email) {
        return this.get('authenticateCustomer', { token, email });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ORDERS
    // ═══════════════════════════════════════════════════════════════════════════
    async submitOrder(orderData) {
        const action = this.customerType === 'CSA' ? 'submitCSAOrder' : 'submitWholesaleOrder';
        return this.post(action, orderData);
    }

    async getOrderHistory(customerId, limit = 50) {
        return this.get('getCustomerOrders', { customerId, limit });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRODUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    async getProducts(category = '') {
        const action = this.customerType === 'CSA' ? 'getCSAProducts' : 'getWholesaleProducts';
        return this.get(action, { category });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CSA SPECIFIC
    // ═══════════════════════════════════════════════════════════════════════════
    async getCSAMembership(customerId) {
        return this.get('getSalesCSAMembers', { customerId });
    }

    async getBoxContents(weekDate, shareType = '') {
        return this.get('getCSABoxContents', { weekDate, shareType });
    }

    async customizeBox(memberId, weekDate, swaps) {
        return this.post('customizeCSABox', { memberId, weekDate, swaps });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════════════════════════════════════
    async getProfile(customerId) {
        return this.get('getCustomerProfile', { customerId });
    }

    async updateProfile(customerId, updates) {
        return this.post('updateCustomerProfile', { customerId, ...updates });
    }
}

// Convenience classes for specific portals
class WholesalePortalAPI extends CustomerPortalAPI {
    constructor() {
        super('Wholesale');
    }
}

class CSAPortalAPI extends CustomerPortalAPI {
    constructor() {
        super('CSA');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER APP API METHODS
// ═══════════════════════════════════════════════════════════════════════════

class DriverAPI extends TinySeedAPI {
    // ═══════════════════════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════════════════
    async authenticate(pin) {
        return this.get('authenticateDriver', { pin });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ROUTE
    // ═══════════════════════════════════════════════════════════════════════════
    async getRoute(pin) {
        return this.get('getDriverRoute', { pin });
    }

    async getRouteById(routeId) {
        return this.get('getDeliveryRoutes', { routeId });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELIVERY ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    async recordDeliveryProof(proofData) {
        // proofData: { stopId, orderId, driverId, routeId, photo, signature, gpsLat, gpsLng, notes }
        return this.post('recordDeliveryProof', proofData);
    }

    async reportIssue(issueData) {
        // issueData: { stopId, orderId, routeId, issueType, notes, photo }
        return this.post('reportDeliveryIssue', issueData);
    }

    async updateETA(stopId, eta) {
        return this.post('updateDeliveryETA', { stopId, eta });
    }

    async updateStopStatus(stopId, status, timestamp) {
        return this.post('updateDeliveryStopStatus', { stopId, status, timestamp });
    }

    async getDeliveryHistory(driverId, days = 7) {
        return this.get('getDeliveryHistory', { driverId, days });
    }

    async getDriverRoute(driverId, date) {
        return this.get('getDriverRoute', { driverId, date });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE APP API METHODS (for reference)
// ═══════════════════════════════════════════════════════════════════════════

class EmployeeAPI extends TinySeedAPI {
    // Authentication
    async authenticate(pin) {
        return this.get('authenticateEmployee', { pin });
    }

    async getProfile(employeeId) {
        return this.get('getEmployeeProfile', { employeeId });
    }

    // Time Clock
    async clockIn(employeeId, gps) {
        return this.get('clockIn', { employeeId, ...gps });
    }

    async clockOut(employeeId, gps) {
        return this.get('clockOut', { employeeId, ...gps });
    }

    async getTimeClockStatus(employeeId) {
        return this.get('getTimeClockStatus', { employeeId });
    }

    // Tasks
    async getTasks(employeeId) {
        return this.get('getEmployeeTasks', { employeeId });
    }

    async completeTask(taskId, gps, notes = '') {
        return this.get('completeTaskWithGPS', { taskId, ...gps, notes });
    }

    // Harvest
    async logHarvest(harvestData) {
        return this.get('logHarvestWithDetails', harvestData);
    }

    // Scouting
    async saveScoutingReport(reportData) {
        return this.get('saveScoutingReport', reportData);
    }

    async analyzeImage(imageData) {
        return this.get('analyzeImage', { image: imageData });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const TinySeedUtils = {
    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    },

    /**
     * Format date
     */
    formatDate(date, options = {}) {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            ...options
        });
    },

    /**
     * Format time
     */
    formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
    },

    /**
     * Get current GPS location
     */
    async getLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                }),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    },

    /**
     * Calculate distance between two points (Haversine)
     */
    calculateDistance(point1, point2) {
        const R = 6371e3; // Earth's radius in meters
        const lat1 = point1.lat * Math.PI / 180;
        const lat2 = point2.lat * Math.PI / 180;
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    },

    /**
     * Check if within geofence
     */
    isWithinGeofence(location) {
        const distance = this.calculateDistance(location, TINY_SEED_API.FARM_LOCATION);
        return distance <= TINY_SEED_API.FARM_LOCATION.radius;
    },

    /**
     * Compress image for upload
     */
    async compressImage(dataUrl, maxWidth = 1200, quality = 0.7) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ratio = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = dataUrl;
        });
    },

    /**
     * Generate a unique ID
     */
    generateId(prefix = 'ID') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    },

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Parse URL parameters
     */
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        document.querySelectorAll('.ts-toast').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `ts-toast ts-toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            animation: slideUp 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// OFFLINE SUPPORT (IndexedDB)
// ═══════════════════════════════════════════════════════════════════════════

class OfflineStorage {
    constructor(dbName = 'TinySeedOS', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Sync queue for offline actions
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }

                // Cached data stores
                const stores = ['orders', 'customers', 'products', 'tasks', 'harvests'];
                stores.forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: 'id' });
                    }
                });

                // Session data
                if (!db.objectStoreNames.contains('session')) {
                    db.createObjectStore('session', { keyPath: 'key' });
                }
            };
        });
    }

    async addToQueue(action, data) {
        const store = this.db.transaction('syncQueue', 'readwrite').objectStore('syncQueue');
        return new Promise((resolve, reject) => {
            const request = store.add({
                action,
                data,
                timestamp: new Date().toISOString(),
                synced: false
            });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getQueuedItems() {
        const store = this.db.transaction('syncQueue', 'readonly').objectStore('syncQueue');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result.filter(item => !item.synced));
            request.onerror = () => reject(request.error);
        });
    }

    async markSynced(id) {
        const store = this.db.transaction('syncQueue', 'readwrite').objectStore('syncQueue');
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    item.synced = true;
                    item.syncedAt = new Date().toISOString();
                    const putRequest = store.put(item);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async cacheData(storeName, data) {
        const store = this.db.transaction(storeName, 'readwrite').objectStore(storeName);
        return new Promise((resolve, reject) => {
            // Clear existing and add new
            store.clear().onsuccess = () => {
                data.forEach(item => {
                    if (!item.id) item.id = TinySeedUtils.generateId();
                    store.add(item);
                });
                resolve();
            };
        });
    }

    async getCachedData(storeName) {
        const store = this.db.transaction(storeName, 'readonly').objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveSession(key, value) {
        const store = this.db.transaction('session', 'readwrite').objectStore('session');
        return new Promise((resolve, reject) => {
            const request = store.put({ key, value, timestamp: new Date().toISOString() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSession(key) {
        const store = this.db.transaction('session', 'readonly').objectStore('session');
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    }

    async clearSession() {
        const store = this.db.transaction('session', 'readwrite').objectStore('session');
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC MANAGER
// ═══════════════════════════════════════════════════════════════════════════

class SyncManager {
    constructor(api, storage) {
        this.api = api;
        this.storage = storage;
        this.isSyncing = false;
    }

    async sync() {
        if (this.isSyncing || !navigator.onLine) return;

        this.isSyncing = true;

        try {
            const queuedItems = await this.storage.getQueuedItems();

            for (const item of queuedItems) {
                try {
                    await this.api.post(item.action, item.data);
                    await this.storage.markSynced(item.id);
                    console.log(`Synced: ${item.action}`);
                } catch (error) {
                    console.error(`Failed to sync ${item.action}:`, error);
                }
            }
        } finally {
            this.isSyncing = false;
        }
    }

    startAutoSync(intervalMs = 30000) {
        // Sync when coming online
        window.addEventListener('online', () => this.sync());

        // Periodic sync
        setInterval(() => this.sync(), intervalMs);

        // Initial sync
        this.sync();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FOR USE IN HTML FILES
// ═══════════════════════════════════════════════════════════════════════════

// Make available globally
window.TINY_SEED_API = TINY_SEED_API;
window.TinySeedAPI = TinySeedAPI;
window.SalesAPI = SalesAPI;
window.CustomerPortalAPI = CustomerPortalAPI;
window.DriverAPI = DriverAPI;
window.EmployeeAPI = EmployeeAPI;
window.TinySeedUtils = TinySeedUtils;
window.OfflineStorage = OfflineStorage;
window.SyncManager = SyncManager;

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translate(-50%, 100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideDown {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, 100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('Tiny Seed OS API Config loaded successfully');

// API Configuration
export const API_BASE_URL = 'http://localhost:4001/api';

// Helper function to get auth headers
export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Generic API call function
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData: any) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getProfile: async () => {
    return apiCall('/auth/profile');
  },

  updateProfile: async (userData: any) => {
    return apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
};

// Users API
export const usersApi = {
  getAll: async () => {
    return apiCall('/users');
  },

  getById: async (id: string) => {
    return apiCall(`/users/${id}`);
  },
};

// Items API
export const itemsApi = {
  create: async (itemData: any) => {
    return apiCall('/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  getUserItems: async (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiCall(`/items/user${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiCall(`/items/${id}`);
  },
};

// Pickups API
export const pickupsApi = {
  schedule: async (pickupData: any) => {
    return apiCall('/pickups/schedule', {
      method: 'POST',
      body: JSON.stringify(pickupData),
    });
  },

  getUserPickups: async (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiCall(`/pickups/user${query ? `?${query}` : ''}`);
  },

  getAvailableDates: async () => {
    return apiCall('/pickups/available-dates');
  },

  getById: async (id: string) => {
    return apiCall(`/pickups/${id}`);
  },

  updateStatus: async (id: string, status: string) => {
    return apiCall(`/pickups/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

// Notifications API
export const notificationsApi = {
  getAll: async (params?: { page?: number; limit?: number; is_read?: boolean }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiCall(`/notifications${query ? `?${query}` : ''}`);
  },

  getUnreadCount: async () => {
    return apiCall('/notifications/unread-count');
  },

  markAsRead: async (id: string) => {
    return apiCall(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },
};

// Educational API
export const educationalApi = {
  getAll: async (params?: { page?: number; limit?: number; category?: string; material_type?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiCall(`/educational${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiCall(`/educational/${id}`);
  },
};

// Reports API
export const reportsApi = {
  getUserStats: async () => {
    return apiCall('/reports/user-stats');
  },

  getDashboard: async () => {
    return apiCall('/reports/dashboard');
  },
};

// Drivers API
export const driversApi = {
  getAll: async () => {
    return apiCall('/drivers');
  },

  getById: async (id: string) => {
    return apiCall(`/drivers/${id}`);
  },
};

// Health check
export const healthCheck = async () => {
  return apiCall('/health');
};


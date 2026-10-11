/**
 * Backend API Client for Salah Companion React Frontend
 * Connects to http://localhost:4000/api with JWT Authentication support
 */

/**
 * Normalizes backend API base URL ensuring /api is properly appended
 * In production builds, defaults directly to https://salah-companion-z3i4.onrender.com/api
 */
export function resolveApiBaseUrl(): string {
  const envUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    ''
  ).trim();

  // Strip deprecated backend URLs (like ja12)
  if (envUrl && !envUrl.includes('salah-companion-ja12.onrender.com')) {
    const clean = envUrl.replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // Development profile: default to local backend on port 8080
  if (import.meta.env.DEV) {
    return 'http://localhost:8080/api';
  }

  // Production profile: default to live Render backend
  return 'https://salah-companion-z3i4.onrender.com/api';
}

export const PRIMARY_BASE_URL = resolveApiBaseUrl();
const FALLBACK_BASE_URL = 'https://salah-companion-z3i4.onrender.com/api';
const TOKEN_KEY = 'salah_auth_token';

// Token persistence helpers
export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
};

/**
 * Common fetch helper that automatically attaches Bearer token if logged in
 * With AbortController timeout protection and detailed error reporting
 */
async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  let response: Response;
  try {
    response = await fetch(`${PRIMARY_BASE_URL}${endpoint}`, {
      ...options,
      signal: options.signal || controller.signal,
      credentials: 'include',
      headers,
    });
  } catch (err: any) {
    console.error(`[API Network Error] ${endpoint}:`, err);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. The server is taking longer than expected to respond.');
    }
    if (import.meta.env.DEV && PRIMARY_BASE_URL.includes('localhost')) {
      try {
        response = await fetch(`${FALLBACK_BASE_URL}${endpoint}`, {
          ...options,
          credentials: 'include',
          headers,
        });
      } catch (fallbackErr: any) {
        console.error(`[API Fallback Error] ${endpoint}:`, fallbackErr);
        throw new Error('Unable to connect to Salah Companion backend server. Please check your connection.');
      }
    } else {
      throw new Error('Unable to connect to Salah Companion backend server. Please check your connection.');
    }
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(data.error || response.statusText || 'Request failed');
    error.status = response.status;
    error.code = data.code;
    error.details = data.details;
    error.retryAfter = data.retryAfter;
    error.email = data.email;
    throw error;
  }

  return data;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  prayerCalculationMethod: string;
  latitude: number | null;
  longitude: number | null;
  isEmailVerified?: boolean;
  googleId?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: UserProfile;
  requiresEmailVerification?: boolean;
  email?: string;
  previewUrl?: string;
}

export interface BackendPrayerTimes {
  date: string;
  calculationMethod: string;
  madhab: string;
  coordinates: { latitude: number; longitude: number };
  times: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  currentPrayer: {
    name: string;
    startTime: string | null;
    endTime: string | null;
  };
  nextPrayer: {
    name: string;
    time: string;
    timeRemainingSeconds: number;
    timeRemainingFormatted: string;
  };
}

export interface BackendLogResponse {
  record: {
    id: number;
    user_id: string;
    prayer_name: string;
    date: string;
    status: 'on_time' | 'late' | 'missed';
    logged_at: string;
  };
  evaluation: {
    status: 'on_time' | 'late' | 'missed';
    message: string;
    minutesSinceStart: number;
    minutesUntilEnd: number;
  };
  relevantHadith?: {
    id: string;
    title: string;
    arabic: string;
    english: string;
    urdu: string;
    romanHindi: string;
    reference: string;
    wisdom: string;
  };
}

export interface BackendUserStats {
  user: { id: string; name: string };
  streak: { currentStreakDays: number; description: string };
  weeklySummary: {
    totalLogged: number;
    completedTotal: number;
    onTimeCount: number;
    lateCount: number;
    missedCount: number;
    onTimePercentage: number;
    weeklyCompletionRate: number;
  };
  last7Days: Array<{
    date: string;
    dayCompletedCount: number;
    completionRate: number;
    prayers: Array<{
      prayer: string;
      status: string;
      loggedAt: string | null;
    }>;
  }>;
}

export const salahApi = {
  // ==========================================================================
  // Authentication & Profile Endpoints
  // ==========================================================================

  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(payload: {
    name: string;
    email: string;
    password: string;
    prayerCalculationMethod?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<AuthResponse> {
    const data: AuthResponse = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  /**
   * Log in user
   * POST /api/auth/login
   */
  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const data: AuthResponse = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  /**
   * Verify email token
   * GET /api/auth/verify-email?token=...
   */
  async verifyEmail(token: string): Promise<AuthResponse> {
    const data: AuthResponse = await fetchWithAuth(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  /**
   * Resend email verification link
   * POST /api/auth/resend-verification
   */
  async resendVerification(email: string): Promise<{ success: boolean; message: string; previewUrl?: string }> {
    return await fetchWithAuth('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Sign in / sign up with Google OAuth 2.0
   * POST /api/auth/google
   */
  async googleLogin(payload: {
    credential: string;
    prayerCalculationMethod?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<AuthResponse> {
    const data: AuthResponse = await fetchWithAuth('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  /**
   * Log out user (clears server HttpOnly cookie and local storage)
   */
  async logout(): Promise<void> {
    try {
      await fetchWithAuth('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      authStorage.clearToken();
    }
  },

  /**
   * Get direct URL to initiate Google OAuth 2.0 flow
   */
  getGoogleOAuthUrl(): string {
    return `${PRIMARY_BASE_URL}/auth/google`;
  },

  /**
   * Fetch currently authenticated user profile
   * GET /api/auth/me (Protected)
   */
  async getMe(): Promise<{ success: boolean; user: UserProfile }> {
    return await fetchWithAuth('/auth/me', { method: 'GET' });
  },

  /**
   * Update authenticated user profile / coordinates
   * PATCH /api/auth/profile (Protected)
   */
  async updateProfile(payload: {
    name?: string;
    prayerCalculationMethod?: string;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<{ success: boolean; user: UserProfile }> {
    return await fetchWithAuth('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // ==========================================================================
  // Prayer Times & Tracking Endpoints
  // ==========================================================================

  /**
   * Fetch astronomical prayer times for given GPS coordinates
   */
  async getPrayerTimes(
    lat: number,
    lng: number,
    method = 'Karachi',
    madhab = 'Hanafi'
  ): Promise<BackendPrayerTimes> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      method,
      madhab,
    });
    const res = await fetchWithAuth(`/prayers?${params.toString()}`);
    return res.data;
  },

  /**
   * Log prayer completion and receive automatic status evaluation
   */
  async logPrayer(payload: {
    userId: string;
    prayerName: string;
    prayerStartTime: string;
    prayerEndTime: string;
    logTimestamp?: string;
    status?: 'on_time' | 'late' | 'missed';
    notes?: string;
  }): Promise<BackendLogResponse> {
    const res = await fetchWithAuth('/prayer/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /**
   * Get tailored Hadith based on prayer status
   */
  async getHadithByStatus(status: 'on_time' | 'late' | 'missed') {
    const res = await fetchWithAuth(`/hadith?status=${status}`);
    return res.data.hadith;
  },

  /**
   * Fetch single Hadith by edition and number (Fawaz Ahmed CDN)
   * GET /api/hadith/single?edition=...&hadithNumber=...
   */
  async getSingleHadith(hadithNumber: number, edition = 'eng-bukhari') {
    return await fetchWithAuth(`/hadith/single?hadithNumber=${hadithNumber}&edition=${encodeURIComponent(edition)}`);
  },

  /**
   * Fetch bilingual Hadith (Arabic + English)
   * GET /api/hadith/bilingual?book=...&hadithNumber=...
   */
  async getBilingualHadith(hadithNumber: number, book = 'bukhari') {
    return await fetchWithAuth(`/hadith/bilingual?hadithNumber=${hadithNumber}&book=${encodeURIComponent(book)}`);
  },

  /**
   * Fetch deterministic Hadith of the Day
   * GET /api/hadith/daily?date=...
   */
  async getDailyHadith(date?: string, edition = 'eng-bukhari') {
    const query = date ? `?date=${encodeURIComponent(date)}&edition=${encodeURIComponent(edition)}` : `?edition=${encodeURIComponent(edition)}`;
    return await fetchWithAuth(`/hadith/daily${query}`);
  },

  /**
   * Upsert a prayer log (Protected via JWT)
   * POST /api/prayers/log
   */
  async upsertPrayerLog(payload: {
    prayerName: string;
    date?: string;
    status: 'on_time' | 'late' | 'missed';
    notes?: string;
  }) {
    return await fetchWithAuth('/prayers/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get today's prayer log status out of 5 (Protected via JWT)
   * GET /api/prayers/today
   */
  async getTodayPrayers(date?: string) {
    const url = date ? `/prayers/today?date=${encodeURIComponent(date)}` : '/prayers/today';
    return await fetchWithAuth(url, { method: 'GET' });
  },

  /**
   * Fetch prayer completion history grouped by date (Protected via JWT)
   * GET /api/prayers/history?days=7
   */
  async getPrayerHistory(days = 7) {
    return await fetchWithAuth(`/prayers/history?days=${days}`, { method: 'GET' });
  },

  /**
   * Fetch user prayer analytics (streak, today completed, weekly breakdown %)
   * GET /api/prayers/analytics
   */
  async getPrayerAnalytics() {
    return await fetchWithAuth('/prayers/analytics', { method: 'GET' });
  },

  /**
   * Delete / reset prayer log
   * DELETE /api/prayers/log/:id
   */
  async deletePrayerLog(logId: string) {
    return await fetchWithAuth(`/prayers/log/${encodeURIComponent(logId)}`, {
      method: 'DELETE',
    });
  },

  // ==========================================================================
  // Production Salah Notification APIs
  // ==========================================================================

  /**
   * Fetch VAPID Public Key for Web Push browser registration
   * GET /api/notifications/vapid-public-key
   */
  async getVapidPublicKey(): Promise<{ success: boolean; publicKey: string }> {
    return await fetchWithAuth('/notifications/vapid-public-key', { method: 'GET' });
  },

  /**
   * Fetch user notification preferences
   * GET /api/notifications/preferences
   */
  async getNotificationPreferences(userId?: string): Promise<{
    success: boolean;
    preferences: NotificationPreferences;
  }> {
    const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return await fetchWithAuth(`/notifications/preferences${q}`, { method: 'GET' });
  },

  /**
   * Update notification preferences
   * PUT /api/notifications/preferences
   */
  async updateNotificationPreferences(
    payload: Partial<NotificationPreferences> & { userId?: string }
  ): Promise<{
    success: boolean;
    preferences: NotificationPreferences;
  }> {
    return await fetchWithAuth('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Register Web Push subscription with backend
   * POST /api/notifications/subscribe
   */
  async subscribePush(payload: {
    subscription: any;
    userAgent?: string;
    userId?: string;
  }): Promise<{ success: boolean; message: string }> {
    return await fetchWithAuth('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Remove Web Push subscription
   * POST /api/notifications/unsubscribe
   */
  async unsubscribePush(endpoint: string): Promise<{ success: boolean }> {
    return await fetchWithAuth('/notifications/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
  },

  /**
   * Retrieve notification history log
   * GET /api/notifications/history
   */
  async getNotificationHistory(
    limit = 25,
    userId?: string
  ): Promise<{
    success: boolean;
    count: number;
    unreadCount: number;
    history: NotificationHistoryItem[];
  }> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (userId) params.set('userId', userId);
    return await fetchWithAuth(`/notifications/history?${params.toString()}`, { method: 'GET' });
  },

  /**
   * Mark single notification as read
   * PATCH /api/notifications/:id/read
   */
  async markNotificationRead(id: number): Promise<{ success: boolean }> {
    return await fetchWithAuth(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  /**
   * Mark all notifications as read
   * POST /api/notifications/mark-all-read
   */
  async markAllNotificationsRead(userId?: string): Promise<{ success: boolean }> {
    return await fetchWithAuth('/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  /**
   * Send test notification
   * POST /api/notifications/test
   */
  async sendTestNotification(
    prayerName = 'Asr',
    userId?: string
  ): Promise<{ success: boolean; message: string }> {
    return await fetchWithAuth('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ prayerName, userId }),
    });
  },

  /**
   * Health check and cold-start warmup probe
   */
  async getHealth(): Promise<{ success: boolean; status: string; service?: string; database?: any }> {
    return await fetchWithAuth('/health', { method: 'GET' });
  },
};

export interface NotificationPreferences {
  userId?: string;
  prayerStartEnabled: boolean;
  reminder30MinEnabled: boolean;
  browserPushEnabled: boolean;
  fajrEnabled: boolean;
  dhuhrEnabled: boolean;
  asrEnabled: boolean;
  maghribEnabled: boolean;
  ishaEnabled: boolean;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  calculationMethod?: string;
  madhab?: string;
  updatedAt?: string;
}

export interface NotificationHistoryItem {
  id: number;
  userId: string;
  prayerName: string;
  date: string;
  reminderType: 'start' | 'reminder_30min' | 'test';
  title: string;
  body: string;
  prayerTime?: string | null;
  isRead: boolean;
  pushSent: boolean;
  deliveredAt: string;
}


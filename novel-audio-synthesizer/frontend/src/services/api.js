/**
 * SyncTone — Reusable Cookie-Authenticated API Client
 *
 * Adheres to The Cookie Rule: Auth tokens are managed strictly via
 * httpOnly, Secure, SameSite=Lax cookies. Never touches localStorage/sessionStorage.
 * All requests explicitly supply `credentials: 'include'`.
 */

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const API_BASE = '/api';

function getFriendlyError(status, data) {
  const serverMsg = data && typeof data === 'object' && (data.error || data.detail || data.message);
  if (status === 401) return 'Please sign in to continue.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 429) return 'Too many requests — please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again shortly.';
  // Use server message only if it doesn't contain technical terms
  if (serverMsg && !/(status|error|exception|stack|sql|db|mongo|postgres|prisma)/i.test(serverMsg)) {
    return serverMsg;
  }
  return 'Something went wrong. Please try again.';
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData) {
    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    } else if (typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const config = {
    method: 'GET',
    credentials: 'include', // Non-negotiable Cookie Rule
    ...options,
    headers,
  };

  const isGet = !options.method || options.method === 'GET';
  const maxRetries = isGet ? 2 : 0;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, attempt * 1000));
    }

    try {
      const response = await fetch(url, config);

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (_) {
          data = null;
        }
      } else {
        try {
          data = await response.text();
        } catch (_) {
          data = null;
        }
      }

      // If 503 and retries remain, keep trying
      if (response.status === 503 && attempt < maxRetries) {
        lastError = new ApiError(getFriendlyError(503, null), 503, null);
        continue;
      }

      if (!response.ok) {
        const errorMsg = getFriendlyError(response.status, data);
        throw new ApiError(errorMsg, response.status, data);
      }

      return data;
    } catch (networkError) {
      if (networkError instanceof ApiError) throw networkError;
      lastError = new ApiError('Check your connection and try again.', 0, null);
      if (attempt < maxRetries) continue;
    }
  }

  throw lastError;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),

  // Auth Endpoints
  auth: {
    register: (username, email, password, role = 'reader') =>
      api.post('/auth/register', { username, email, password, role }),
    login: (email, password) =>
      api.post('/auth/login', { email, password }),
    logout: () =>
      api.post('/auth/logout'),
    me: () =>
      api.get('/auth/me'),
  },

  // Novels Endpoints
  novels: {
    list: (channel, opts = {}) => api.get(`/novels${channel ? `?channel=${encodeURIComponent(channel)}` : ''}`, opts),
    get: (id) => api.get(`/novels/${id}`),
    create: (novelData) => api.post('/novels', novelData),
    delete: (id) => api.delete(`/novels/${id}`),
    uploadChapter: (novelId, chapterData) => api.post(`/novels/${novelId}/chapters`, chapterData),
    parseFile: (payload) => {
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        return request('/novels/parse-file', { method: 'POST', body: payload });
      }
      return api.post('/novels/parse-file', payload);
    },
    uploadAsset: (payload) => {
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        return request('/novels/upload-asset', { method: 'POST', body: payload });
      }
      return api.post('/novels/upload-asset', payload);
    },
  },

  // Chapters & Synthesis Endpoints
  chapters: {
    list: () => api.get('/chapters'),
    get: (id) => api.get(`/chapters/${id}`),
    getSegments: (id) => api.get(`/chapters/${id}/segments`),
    getManifest: (id) => api.get(`/manifest/${id}`),
    uploadDirect: (text, title) => api.post('/upload', { text, title }),
    parse: (chapterId) => api.post(`/parse/${chapterId}`),
    synthesize: (chapterId) => api.post(`/synthesize/${chapterId}`),
  },

  // Voices Endpoints
  voices: {
    list: () => api.get('/voices'),
    assign: ({ character_id, new_voice_id, chapter_id }) =>
      api.post('/voices/assign', { character_id, new_voice_id, chapter_id }),
  },

  // Playback Endpoints
  playback: {
    getProgress: (novelId, userId) => {
      const params = new URLSearchParams({ novel_id: novelId });
      if (userId) params.append('user_id', userId);
      return api.get(`/playback/progress?${params.toString()}`);
    },
    saveProgress: ({ novel_id, chapter_id, segment_order = 0, position_ms = 0, user_id }) =>
      api.post('/playback/progress', { novel_id, chapter_id, segment_order, position_ms, user_id }),
  },

  // Status & Health
  status: {
    models: () => api.get('/status/models'),
    health: () => request('/health'),
  },
};

export default api;

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4002/api";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Inject token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// ── Role normalization: Backend uses UPPERCASE, Frontend uses lowercase ─────
const ROLE_MAP: Record<string, string> = {
  superadmin: "SUPERADMIN",
  campaign_admin: "CAMPAIGN_ADMIN",
  SUPERADMIN: "superadmin",
  CAMPAIGN_ADMIN: "campaign_admin",
};

export const toBackendRole = (role: string): string => {
  return ROLE_MAP[role] || role.toUpperCase();
};

export const toFrontendRole = (role: string): string => {
  return ROLE_MAP[role] || role.toLowerCase();
};

// ── Utility: Normalize roles in data structure ─────────────
const normalizeRoles = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(normalizeRoles);
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    // Normalize direct role property
    if (data.role && typeof data.role === "string") {
      data.role = toFrontendRole(data.role);
    }
    // Normalize nested user.role (for auth responses)
    if (data.user && data.user.role && typeof data.user.role === "string") {
      data.user.role = toFrontendRole(data.user.role);
    }
    // Process array properties (like campaigns, participants, etc.)
    Object.values(data).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item && typeof item === "object") {
            normalizeRoles(item);
          }
        });
      }
    });
  }
  return data;
};

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api
      .post("/auth/login", { email, password })
      .then((r) => normalizeRoles(r.data)),
  me: () => api.get("/auth/me").then((r) => normalizeRoles(r.data)),
};

// ── Campaigns ─────────────────────────────────────────────────────
export const campaignsApi = {
  list: () => api.get("/campaigns").then((r) => r.data),
  get: (id: number) => api.get(`/campaigns/${id}`).then((r) => r.data),
  create: (data: any) => api.post("/campaigns", data).then((r) => r.data),
  update: (id: number, data: any) =>
    api.put(`/campaigns/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/campaigns/${id}`).then((r) => r.data),
};

// ── Users ─────────────────────────────────────────────────────────
export const usersApi = {
  list: (campaign_id?: number) => {
    const params: Record<string, any> = {};
    if (campaign_id !== undefined && campaign_id !== null) {
      params.campaign_id = campaign_id;
    }
    return api.get("/users", { params }).then((r) => normalizeRoles(r.data));
  },
  create: (data: any) => {
    const payload = { ...data };
    if (payload.role) payload.role = toBackendRole(payload.role);
    return api.post("/users", payload).then((r) => normalizeRoles(r.data));
  },
  update: (id: number, data: any) => {
    const payload = { ...data };
    if (payload.role) payload.role = toBackendRole(payload.role);
    return api.put(`/users/${id}`, payload).then((r) => normalizeRoles(r.data));
  },
};

// ── Totems ────────────────────────────────────────────────────────
export const totemsApi = {
  list: (campaign_id?: number) => {
    const params: Record<string, any> = {};
    if (campaign_id !== undefined && campaign_id !== null) {
      params.campaign_id = campaign_id;
    }
    return api.get("/totems", { params }).then((r) => r.data);
  },
  dashboard: (campaign_id?: number) => {
    const params: Record<string, any> = {};
    if (campaign_id !== undefined && campaign_id !== null) {
      params.campaign_id = campaign_id;
    }
    return api.get("/totems/dashboard", { params }).then((r) => r.data);
  },
  create: (data: any) => api.post("/totems", data).then((r) => r.data),
  update: (id: number, data: any) =>
    api.put(`/totems/${id}`, data).then((r) => r.data),
};

// ── Phases ────────────────────────────────────────────────────────
export const phasesApi = {
  list: (campaign_id?: number) => {
    const params: Record<string, any> = {};
    if (campaign_id !== undefined && campaign_id !== null) {
      params.campaign_id = campaign_id;
    }
    return api.get("/phases", { params }).then((r) => r.data);
  },
  create: (data: any) => api.post("/phases", data).then((r) => r.data),
  publish: (id: number) =>
    api.post(`/phases/${id}/publish`).then((r) => r.data),
  unpublish: (id: number) =>
    api.post(`/phases/${id}/unpublish`).then((r) => r.data),
  rules: () => api.get("/phases/rules").then((r) => r.data),
  getStandings: (phaseId: number) =>
    api.get(`/phases/${phaseId}/standings`).then((r) => r.data),
  generateNext: (data: any) =>
    api.post("/phases/generate-next", data).then((r) => r.data),
};

// ── Matches ───────────────────────────────────────────────────────
export const matchesApi = {
  list: (phase_id: number) =>
    api.get("/matches", { params: { phase_id } }).then((r) => r.data),
  bulk: (matches: any[]) =>
    api.post("/matches/bulk", { matches }).then((r) => r.data),
  updateTeams: (id: number, data: any) =>
    api.put(`/matches/${id}/teams`, data).then((r) => r.data),
  setResult: (id: number, goals_local: number, goals_visitor: number) =>
    api
      .put(`/matches/${id}/result`, { goals_local, goals_visitor })
      .then((r) => r.data),
};

// ── Registrations ─────────────────────────────────────────────────
export const registrationsApi = {
  list: (params: {
    campaign_id?: number;
    phase_id?: number;
    totem_id?: number;
  }) => {
    const queryParams: Record<string, any> = {};
    if (params.campaign_id !== undefined && params.campaign_id !== null)
      queryParams.campaign_id = params.campaign_id;
    if (params.phase_id) queryParams.phase_id = params.phase_id;
    if (params.totem_id) queryParams.totem_id = params.totem_id;
    return api
      .get("/registrations", { params: queryParams })
      .then((r) => r.data);
  },
  winners: (params: { campaign_id?: number; phase_id?: number }) => {
    const queryParams: Record<string, any> = {};
    if (params.campaign_id !== undefined && params.campaign_id !== null)
      queryParams.campaign_id = params.campaign_id;
    if (params.phase_id) queryParams.phase_id = params.phase_id;
    return api
      .get("/registrations/winners", { params: queryParams })
      .then((r) => r.data);
  },
  stats: (campaign_id?: number) => {
    const params: Record<string, any> = {};
    if (campaign_id !== undefined && campaign_id !== null) {
      params.campaign_id = campaign_id;
    }
    return api.get("/registrations/stats", { params }).then((r) => r.data);
  },
  export: async (params: {
    campaign_id?: number;
    phase_id?: number;
    totem_id?: number;
  }) => {
    const token = localStorage.getItem("auth_token");
    const qs = new URLSearchParams();
    if (params.campaign_id) qs.set("campaign_id", String(params.campaign_id));
    if (params.phase_id) qs.set("phase_id", String(params.phase_id));
    if (params.totem_id) qs.set("totem_id", String(params.totem_id));
    const url = `${BASE_URL}/registrations/export?${qs}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Error al exportar");
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `registros_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },
};

// ── Employees ──────────────────────────────────────────────────────
export const employeesApi = {
  list: (campaign_id?: number) => {
    const params: Record<string, any> = {};
    if (campaign_id !== undefined && campaign_id !== null) {
      params.campaign_id = campaign_id;
    }
    return api.get("/employees", { params }).then((r) => r.data);
  },
  create: (data: any) => api.post("/employees", data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/employees/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/employees/${id}`).then((r) => r.data),
  bulkCreate: (data: { codes: string[]; campaign_id: number }) =>
    api.post("/employees/bulk", data, { timeout: 180000 }).then((r) => r.data),
  resetPassword: (id: string) =>
    api.post(`/employees/${id}/reset-password`).then((r) => r.data),
  cleanupDuplicates: (campaign_id: number) =>
    api.post("/employees/cleanup-duplicates", { campaign_id }, { timeout: 60000 }).then((r) => r.data),
  exportPasswords: (campaign_id: number) =>
    api.post("/employees/export-passwords", { campaign_id }, { timeout: 60000 }).then((r) => r.data),
};

// ── Participants ──────────────────────────────────────────────────
export const participantsApi = {
  list: (params: { campaign_id?: number; search?: string }) => {
    const queryParams: Record<string, any> = {};
    if (params.campaign_id !== undefined && params.campaign_id !== null)
      queryParams.campaign_id = params.campaign_id;
    if (params.search) queryParams.search = params.search;
    return api
      .get("/participants", { params: queryParams })
      .then((r) => r.data);
  },
};

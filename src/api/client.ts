import type {
  Organization,
  OrganizationalUnit,
  Location,
  Device,
  PrintDestination,
  PublicKeyCertificate,
  ProductionProfile,
  ProductionProfileConfigResponse,
  ProductionProfileConfigRequest,
  ProductionRequestTemplate,
  Job,
  JobImageResource,
  AuthUser,
  LoginResponse,
  PortalUser,
  Role,
  FlowDefinition,
  PublicFlow,
  PreloadedDataInfo,
  PendingJobItem,
  PublicPreloadedData,
} from "./types";

// In production the frontend and backend are separate Render services, so API
// calls must go to an absolute URL (see VITE_API_BASE_URL) rather than a
// relative path — a same-origin rewrite proxy was tried first, but Render's
// static site rewrites were unreliable for POST response bodies.
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const BASE = "/fargo-sdk-example";
const TOKEN_STORAGE_KEY = "fargo_portal_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Called by AuthProvider so 401s anywhere can trigger a clean logout+redirect. */
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, init?: RequestInit, base = BASE): Promise<T> {
  const token = getStoredToken();
  // FormData bodies (file uploads) need the browser to set its own
  // multipart boundary in Content-Type — forcing application/json breaks that.
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_ORIGIN}${base}${path}`, {
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    ...init,
  });

  if (res.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.message ?? message;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(res.status, message);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // endpoints like createUniqueId / submitProductionRequest return a bare string
    return text as unknown as T;
  }
}

export const organizationApi = {
  list: () => request<Organization[]>("/organization"),
  get: (organizationId: string) => request<Organization>(`/organization/${organizationId}`),
  units: (organizationId: string) => request<OrganizationalUnit[]>(`/organization/unit/${organizationId}`),
  unit: (organizationalUnitId: string) => request<OrganizationalUnit>(`/organization/unit/id/${organizationalUnitId}`),
  locations: (organizationId: string) => request<Location[]>(`/organization/location/${organizationId}`),
  unitLocations: (organizationalUnitId: string) =>
    request<Location[]>(`/organization/unit/location/${organizationalUnitId}`),
  location: (locationId: string) => request<Location>(`/organization/location/id/${locationId}`),
};

export const deviceApi = {
  list: () => request<Device[]>("/device"),
  listByOrganization: (organizationId: string) => request<Device[]>(`/device/${organizationId}`),
  get: (deviceId: string) => request<Device>(`/device/id/${deviceId}`),
  printDestinations: () => request<PrintDestination[]>("/device/print-destination"),
  printDestinationsByOrganization: (organizationId: string) =>
    request<PrintDestination[]>(`/device/print-destination/${organizationId}`),
  destinationPublicKey: (destinationId: string) =>
    request<PublicKeyCertificate>(`/device/print-destination/id/${destinationId}`),
};

export const productionProfileApi = {
  list: () => request<ProductionProfile[]>("/production-profile"),
  listByOrganization: (organizationId: string) =>
    request<ProductionProfile[]>(`/production-profile/${organizationId}`),
  get: (profileId: string) => request<ProductionProfile>(`/production-profile/id/${profileId}`),
  parameters: (profileId: string) =>
    request<ProductionProfileConfigResponse>(`/production-profile/parameters/${profileId}`),
  configure: (body: ProductionProfileConfigRequest) =>
    request<ProductionRequestTemplate>("/production-profile", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const authApi = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/login", { method: "POST", body: JSON.stringify({ username, password }) }, "/auth"),
  me: () => request<AuthUser>("/me", undefined, "/auth"),
};

export const userApi = {
  list: () => request<PortalUser[]>("", undefined, "/users"),
  create: (input: {
    username: string;
    password: string;
    role: Role;
    organizationId?: string;
    flowIds?: number[];
  }) => request<PortalUser>("", { method: "POST", body: JSON.stringify(input) }, "/users"),
  disable: (id: number) => request<void>(`/${id}`, { method: "DELETE" }, "/users"),
  setFlowGrants: (id: number, flowIds: number[]) =>
    request<PortalUser>(`/${id}/flows`, { method: "PUT", body: JSON.stringify({ flowIds }) }, "/users"),
};

export const flowApi = {
  list: () => request<FlowDefinition[]>("", undefined, "/flows"),
  // OPERATIONAL's whole flow list — flows explicitly granted to them, unlike list()/listByProfile() which they can't call.
  granted: () => request<FlowDefinition[]>("/granted", undefined, "/flows"),
  listPublic: () => request<FlowDefinition[]>("/public", undefined, "/flows"),
  listByProfile: (profileId: string) =>
    request<FlowDefinition[]>(`/profile/${encodeURIComponent(profileId)}`, undefined, "/flows"),
  get: (id: number) => request<FlowDefinition>(`/${id}`, undefined, "/flows"),
  getTemplate: (id: number) => request<ProductionRequestTemplate>(`/${id}/template`, undefined, "/flows"),
  getDestinations: (id: number) => request<PrintDestination[]>(`/${id}/destinations`, undefined, "/flows"),
  save: (flow: FlowDefinition) => request<FlowDefinition>("", { method: "POST", body: JSON.stringify(flow) }, "/flows"),
  remove: (id: number) => request<void>(`/${id}`, { method: "DELETE" }, "/flows"),
  uploadPreloadedData: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<PreloadedDataInfo>(`/${id}/preloaded-data`, { method: "POST", body: form }, "/flows");
  },
  getPreloadedDataInfo: (id: number) => request<PreloadedDataInfo>(`/${id}/preloaded-data`, undefined, "/flows"),
  clearPreloadedData: (id: number) => request<void>(`/${id}/preloaded-data`, { method: "DELETE" }, "/flows"),
  uploadPending: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<PendingJobItem[]>(`/${id}/pending`, { method: "POST", body: form }, "/flows");
  },
  listPending: (id: number) => request<PendingJobItem[]>(`/${id}/pending`, undefined, "/flows"),
  deletePending: (id: number, itemId: number) =>
    request<void>(`/${id}/pending/${itemId}`, { method: "DELETE" }, "/flows"),
};

// Unauthenticated kiosk endpoints — reused `request()` works fine here since
// it only attaches a token when one happens to exist; the backend doesn't
// require one for /public/**.
export const publicFlowApi = {
  getFlow: (slug: string) => request<PublicFlow>(`/${encodeURIComponent(slug)}`, undefined, "/public/flows"),
  getTemplate: (slug: string) =>
    request<ProductionRequestTemplate>(`/${encodeURIComponent(slug)}/template`, undefined, "/public/flows"),
  getDestinations: (slug: string) =>
    request<PrintDestination[]>(`/${encodeURIComponent(slug)}/destinations`, undefined, "/public/flows"),
  submitJob: (slug: string, template: ProductionRequestTemplate, pendingItemId?: number) =>
    request<string>(
      `/${encodeURIComponent(slug)}/jobs${pendingItemId != null ? `?pendingItemId=${pendingItemId}` : ""}`,
      { method: "POST", body: JSON.stringify(template) },
      "/public/flows",
    ),
  getPreloadedData: (slug: string, personId: string) =>
    request<PublicPreloadedData>(
      `/${encodeURIComponent(slug)}/preloaded/${encodeURIComponent(personId)}`,
      undefined,
      "/public/flows",
    ),
};

export const jobApi = {
  forTimePeriod: (maxResults: number, duration: string) =>
    request<Job[]>(`/job/time-period?max-results=${maxResults}&duration=${encodeURIComponent(duration)}`),
  forDateRange: (maxResults: number, startDate: string, endDate: string) =>
    request<Job[]>(
      `/job/date-range?max-results=${maxResults}&start-date=${encodeURIComponent(startDate)}&end-date=${encodeURIComponent(endDate)}`,
    ),
  get: (jobUniqueId: string) => request<Job>(`/job/${jobUniqueId}`),
  imageResource: (jobUniqueId: string, resourceKey: string) =>
    request<JobImageResource>(`/job/${jobUniqueId}/${resourceKey}`),
  createUniqueId: () => request<string>("/job/createUniqueId"),
  // flowId (when the job came from a FlowDefinition) gets recorded server-side
  // so OPERATIONAL users can later see jobs from flows they're granted.
  submit: (template: ProductionRequestTemplate, flowId?: number) =>
    request<string>(`/job${flowId != null ? `?flowId=${flowId}` : ""}`, {
      method: "POST",
      body: JSON.stringify(template),
    }),
};

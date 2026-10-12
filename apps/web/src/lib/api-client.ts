import { useAuthStore } from "../store/auth.store";

const API_BASE_URL = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:4000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  code: string;
  field?: string;
  status: number;

  constructor(message: string, code: string = "INTERNAL_ERROR", status: number = 500, field?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const token = typeof window !== "undefined" ? useAuthStore.getState().accessToken : null;

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  if (!(customConfig.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...(headers as Record<string, string>),
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401 && typeof window !== "undefined") {
        useAuthStore.getState().logout();
      }
      const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
      const errorCode = data?.error?.code || "HTTP_ERROR";
      const errorField = data?.error?.field;
      throw new ApiError(errorMsg, errorCode, res.status, errorField);
    }

    return data?.data ?? data;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || "Network request failed", "NETWORK_ERROR", 0);
  }
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole, Language } from "@ricetrace/types";

export interface AuthUserState {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  language: Language;
}

interface AuthState {
  user: AuthUserState | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUserState, accessToken: string, refreshToken?: string) => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  loginAsDemoRole: (role: UserRole) => Promise<void> | void;
}

export const DEMO_CREDENTIALS: Record<UserRole, { email: string; password: string }> = {
  MILL_ADMIN: {
    email: "admin@al-raheem-rice.pk",
    password: "Secret123!",
  },
  PROCUREMENT_OFFICER: {
    email: "procurement@al-raheem-rice.pk",
    password: "Secret123!",
  },
  MILL_MANAGER: {
    email: "mill@al-raheem-rice.pk",
    password: "Secret123!",
  },
  QUALITY_MANAGER: {
    email: "quality@al-raheem-rice.pk",
    password: "Secret123!",
  },
  EXPORT_MANAGER: {
    email: "export@al-raheem-rice.pk",
    password: "Secret123!",
  },
};

export const DEMO_USERS: Record<UserRole, AuthUserState> = {
  MILL_ADMIN: {
    id: "usr_admin_001",
    email: "admin@al-raheem-rice.pk",
    name: "Chaudhry Tariq (GM / Mill Owner)",
    role: "MILL_ADMIN",
    organizationId: "org_al_raheem",
    organizationName: "Al-Raheem Rice Mills Ltd.",
    language: "EN",
  },
  PROCUREMENT_OFFICER: {
    id: "usr_proc_002",
    email: "procurement@al-raheem-rice.pk",
    name: "Muhammad Rizwan (Field Officer)",
    role: "PROCUREMENT_OFFICER",
    organizationId: "org_al_raheem",
    organizationName: "Al-Raheem Rice Mills Ltd.",
    language: "UR",
  },
  MILL_MANAGER: {
    id: "usr_mill_003",
    email: "mill@al-raheem-rice.pk",
    name: "Haji Aslam (Factory Floor Manager)",
    role: "MILL_MANAGER",
    organizationId: "org_al_raheem",
    organizationName: "Al-Raheem Rice Mills Ltd.",
    language: "EN",
  },
  QUALITY_MANAGER: {
    id: "usr_qc_004",
    email: "quality@al-raheem-rice.pk",
    name: "Dr. Ayesha Malik (QC & Lab Head)",
    role: "QUALITY_MANAGER",
    organizationId: "org_al_raheem",
    organizationName: "Al-Raheem Rice Mills Ltd.",
    language: "EN",
  },
  EXPORT_MANAGER: {
    id: "usr_export_005",
    email: "export@al-raheem-rice.pk",
    name: "Hamza Farooq (Export Director)",
    role: "EXPORT_MANAGER",
    organizationId: "org_al_raheem",
    organizationName: "Al-Raheem Rice Mills Ltd.",
    language: "EN",
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: DEMO_USERS.MILL_ADMIN, // Default to Mill Admin for immediate rich view
      accessToken: "demo_mock_token_jwt",
      refreshToken: "demo_mock_refresh_token",
      isAuthenticated: true,

      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      setLanguage: (language) =>
        set((state) => ({
          user: state.user ? { ...state.user, language } : null,
        })),

      loginAsDemoRole: async (role) => {
        const demoUser = DEMO_USERS[role];
        const creds = DEMO_CREDENTIALS[role];
        const apiUrl =
          (typeof process !== "undefined" && process.env?.["NEXT_PUBLIC_API_URL"]) ||
          "http://localhost:4000/api/v1";

        try {
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(creds),
          });
          if (res.ok) {
            const json = await res.json();
            const resData = json?.data || json;
            const accessToken =
              resData?.tokens?.accessToken || resData?.accessToken;
            const refreshToken =
              resData?.tokens?.refreshToken || resData?.refreshToken;
            const user = resData?.user;
            if (accessToken) {
              set({
                user: {
                  id: user?.id || demoUser.id,
                  email: user?.email || demoUser.email,
                  name: user?.name || demoUser.name,
                  role: user?.role || role,
                  organizationId: user?.organizationId || demoUser.organizationId,
                  organizationName: demoUser.organizationName,
                  language: (user?.language as Language) || demoUser.language,
                },
                accessToken,
                refreshToken: refreshToken || null,
                isAuthenticated: true,
              });
              return;
            }
          }
        } catch {
          // Fallback if offline/API down
        }

        set({
          user: demoUser,
          accessToken: `demo_token_${role.toLowerCase()}`,
          refreshToken: `demo_refresh_${role.toLowerCase()}`,
          isAuthenticated: true,
        });
      },
    }),
    {
      name: "ricetrace-auth-session",
    }
  )
);

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  Video,
  Backup,
  Schedule,
  AuditEntry,
  Broadcast,
  AdminUser,
  Site,
  DashboardData,
} from "./types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/dashboard"),
  });
}

export function useVideos(params: {
  q?: string;
  from?: string;
  to?: string;
  view?: string;
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.view) search.set("view", params.view);
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return useQuery({
    queryKey: ["videos", params],
    queryFn: () =>
      api.get<{ rows: Video[]; total: number }>(
        `/videos${qs ? `?${qs}` : ""}`,
      ),
  });
}

export function useDeleteVideos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post("/videos/delete", { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useRestoreVideos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post("/videos/restore", { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function usePatchVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Video>) =>
      api.patch(`/videos/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useBackups() {
  return useQuery({
    queryKey: ["backups"],
    queryFn: () => api.get<Backup[]>("/backups"),
    refetchInterval: 5000,
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/backups"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backups"] }),
  });
}

export function useBackupSchedule() {
  return useQuery({
    queryKey: ["backup-schedule"],
    queryFn: () => api.get<Schedule>("/backup-schedule"),
  });
}

export function useUpdateBackupSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (schedule: Partial<Schedule>) =>
      api.put("/backup-schedule", schedule),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["backup-schedule"] }),
  });
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { downloadLink } = await api.get<{ downloadLink: string }>(`/backups/${id}/download`);
      window.open(downloadLink, "_blank");
    },
  });
}

export function useUsers(q?: string) {
  return useQuery({
    queryKey: ["users", q],
    queryFn: () =>
      api.get<AdminUser[]>(`/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; siteId: string }) =>
      api.post("/users/invite", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function usePatchUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; suspended?: boolean }) =>
      api.patch(`/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useAudit(params: { q?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.page !== undefined) search.set("page", String(params.page));
  const qs = search.toString();
  return useQuery({
    queryKey: ["audit", params],
    queryFn: () =>
      api.get<{ rows: AuditEntry[]; total: number }>(
        `/audit${qs ? `?${qs}` : ""}`,
      ),
  });
}

export function useBroadcasts() {
  return useQuery({
    queryKey: ["broadcasts"],
    queryFn: () => api.get<Broadcast[]>("/broadcasts"),
  });
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subject: string; body: string; siteId?: string }) =>
      api.post("/broadcasts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["broadcasts"] }),
  });
}

export function useUploadVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      orderId: string;
      sku: string;
      customerPhone: string;
      title: string;
      tags: string[];
      siteId: string;
      sizeBytes: number;
      file?: File;
    }) => {
      const formData = new FormData();
      if (body.file) formData.append("file", body.file);
      formData.append("orderId", body.orderId);
      formData.append("sku", body.sku);
      formData.append("customerPhone", body.customerPhone);
      formData.append("title", body.title);
      formData.append("tags", JSON.stringify(body.tags));
      formData.append("siteId", body.siteId);
      formData.append("sizeBytes", String(body.sizeBytes));

      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () =>
      api.get<{
        user: {
          id: string;
          email: string;
          fullName: string;
          role: string;
          siteId: string | null;
          phone: string | null;
          avatarUrl: string | null;
        };
      }>("/profile"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { fullName?: string; phone?: string }) =>
      api.patch("/profile", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api.post("/profile/change-password", body),
  });
}

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: () => api.get<Site[]>("/sites"),
  });
}

export function useDriveStatus() {
  return useQuery({
    queryKey: ["drive-status"],
    queryFn: () => api.get<{ connected: boolean }>("/drive/status"),
  });
}

export function useConnectDrive() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await api.get<{ url: string }>("/auth/google");
      return url;
    },
  });
}

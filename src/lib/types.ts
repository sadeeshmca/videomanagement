export type Role = "super_admin" | "admin" | "user";

export interface Site {
  id: string;
  name: string;
  slug: string;
  quotaBytes: number;
  status: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  siteId: string | null;
  role: Role;
  suspended: boolean;
  quotaBytes: number;
}

export interface Video {
  id: string;
  siteId: string;
  ownerId: string;
  orderId: string;
  sku: string | null;
  customerPhone: string | null;
  title: string;
  tags: string[];
  driveFileId: string | null;
  driveWebViewLink: string | null;
  sizeBytes: number;
  isPublic: boolean;
  orderDate: string;
  createdAt: string;
  deletedAt: string | null;
  thumbnailUrl: string | null;
}

export interface Backup {
  id: string;
  userId: string;
  userName?: string;
  trigger: string;
  status: string;
  progress: number;
  videoCount: number;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string | null;
}

export interface Schedule {
  intervalMonths: number;
  startDate: string;
  retentionDays: number;
  enabled: boolean;
}

export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface Broadcast {
  id: string;
  subject: string;
  siteId: string | null;
  recipientCount: number;
  createdAt: string;
}

export interface DashboardData {
  videoCount: number;
  userCount: number;
  backupsRunning: number;
  myUsedBytes: number;
  myQuotaBytes: number;
  siteUsedBytes: number;
  siteQuotaBytes: number;
  siteName: string;
  todayUploadBytes: number;
  dailyUploadCap: number;
  recentUploads: { orderId: string; sku: string | null }[];
}

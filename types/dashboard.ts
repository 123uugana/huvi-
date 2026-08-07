export interface DashboardLivestockRef {
  id: string;
  earNumber: string;
  name?: string;
}

export interface DashboardRecentScan {
  id: string;
  scannedAt: string;
  livestock: DashboardLivestockRef;
}

export interface DashboardSummary {
  totalLivestock: number;
  scannedToday: number;
  missingCount: number;
  unknownTagCount: number;
  recentScans: DashboardRecentScan[];
}

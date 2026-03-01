export interface CriticalAlert {
  id: string;
  name: string;
  severity: number;
  created_at: string;
  check_in_id: string | null;
}

export interface CheckInDay {
  date: string;
  energy: number;
}

export interface LatestEntry {
  summary: string;
  symptom_count: number;
  timeLabel: string;
  mood?: string;
}

export interface DashboardData {
  last7: CheckInDay[];
  streak: number;
  energy_avg: number;
  adherence: number;
  latest_entry: LatestEntry | null;
}

export interface Symptom {
    id: string;
    name: string;
    severity: number;
    body_area: string | null;
    is_critical: boolean;
    alert_level: 'info' | 'warning' | 'critical' | null;
    alert_message: string | null;
    dismissed: boolean;
    created_at: string;
}

export interface CheckIn {
    id: string;
    created_at: string;
    input_mode: 'voice' | 'text' | null;
    mood: string;
    energy: number;
    sleep_hours: number;
    notes: string;
    transcript: string | null;
    audio_url: string | null;
    summary: string;
    symptoms?: Symptom[];
    flagged: boolean;
    flag_reason: string;
}

export interface Report {
    id: string;
    created_at: string;
    date_from: string;
    date_to: string;
    detail_level: string;
    status: string;
    content_path: string;
}

export interface Document {
    id: string;
    file_name: string;
    document_type: string;
    summary: string | null;
    flagged: boolean;
    created_at: string;
}

export interface CheckIn {
    id: string;
    created_at: string;
    mood: string;
    energy: number;
    sleep_hours: number;
    symptoms?: any[];
    notes: string;
    summary: string;
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
    created_at: string;
}

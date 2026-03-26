// Seed data for the /ui playground — no backend needed

export interface SeedProfile {
  id: string;
  email: string;
  display_name: string;
  date_of_birth: string | null;
  blood_type: string | null;
  conditions: string[];
  allergies: string[];
  phone_number: string | null;
  timezone: string;
  emergency_contact: { name: string; phone: string; relationship: string } | null;
  checkin_time: string | null;
  voice_pref: string | null;
  language: string;
  onboarding_completed: boolean;
  account_claimed: boolean;
}

export interface SeedRelationship {
  id: string;
  caretaker_id: string;
  patient_id: string;
  level: "primary" | "secondary";
  status: "pending" | "active" | "revoked";
  permissions: Record<string, boolean>;
  managed_by: "caretaker" | "patient";
  linked_via: "invite_code" | "direct_setup";
  created_at: string;
}

export interface SeedInvite {
  id: string;
  code: string;
  type: "caretaker";
  created_by_profile_id: string;
  target_email: string | null;
  relationship_data: Record<string, any>;
  expires_at: string;
  max_uses: number;
  use_count: number;
  redeemed_at: string | null;
  created_at: string;
}

export interface SeedCheckIn {
  id: string;
  user_id: string;
  input_mode: "voice" | "text";
  mood: string;
  energy: number;
  sleep_hours: number;
  notes: string;
  summary: string;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  symptoms: SeedSymptom[];
}

export interface SeedSymptom {
  id: string;
  name: string;
  severity: number;
  body_area: string;
  is_critical: boolean;
  alert_level: "info" | "warning" | "critical";
  alert_message: string | null;
  dismissed: boolean;
}

export interface SeedAuditEntry {
  id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  created_at: string;
}

export interface SeedData {
  currentUser: SeedProfile;
  profiles: SeedProfile[];
  relationships: SeedRelationship[];
  invites: SeedInvite[];
  checkIns: SeedCheckIn[];
  auditLog: SeedAuditEntry[];
}

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

// Profiles
const margaret: SeedProfile = {
  id: "p-margaret",
  email: "margaret@example.com",
  display_name: "Margaret Chen",
  date_of_birth: "1948-03-15",
  blood_type: "A+",
  conditions: ["Type 2 Diabetes", "Hypertension", "Mild Arthritis"],
  allergies: ["Penicillin", "Shellfish"],
  phone_number: "+61 412 345 678",
  timezone: "Australia/Sydney",
  emergency_contact: { name: "Sarah Chen", phone: "+61 423 456 789", relationship: "Daughter" },
  checkin_time: "08:00",
  voice_pref: "Sarah (calm)",
  language: "en",
  onboarding_completed: true,
  account_claimed: false,
};

const sarah: SeedProfile = {
  id: "p-sarah",
  email: "sarah@example.com",
  display_name: "Sarah Chen",
  date_of_birth: "1982-07-22",
  blood_type: "O+",
  conditions: [],
  allergies: ["Pollen"],
  phone_number: "+61 423 456 789",
  timezone: "Australia/Sydney",
  emergency_contact: null,
  checkin_time: "07:30",
  voice_pref: "Sarah (calm)",
  language: "en",
  onboarding_completed: true,
  account_claimed: true,
};

const david: SeedProfile = {
  id: "p-david",
  email: "david@example.com",
  display_name: "David Chen",
  date_of_birth: "1979-11-08",
  blood_type: "A+",
  conditions: [],
  allergies: [],
  phone_number: "+61 434 567 890",
  timezone: "Australia/Sydney",
  emergency_contact: null,
  checkin_time: null,
  voice_pref: null,
  language: "en",
  onboarding_completed: true,
  account_claimed: true,
};

const james: SeedProfile = {
  id: "p-james",
  email: "james@example.com",
  display_name: "James Park",
  date_of_birth: "1952-01-30",
  blood_type: "B+",
  conditions: ["COPD", "Heart Failure"],
  allergies: ["Aspirin"],
  phone_number: "+61 445 678 901",
  timezone: "Australia/Sydney",
  emergency_contact: { name: "Lisa Park", phone: "+61 456 789 012", relationship: "Wife" },
  checkin_time: "09:00",
  voice_pref: "Sarah (calm)",
  language: "en",
  onboarding_completed: true,
  account_claimed: true,
};

// Current user is Sarah (caretaker for Margaret and James)
export const SEED: SeedData = {
  currentUser: sarah,
  profiles: [margaret, sarah, david, james],

  relationships: [
    {
      id: "r-1",
      caretaker_id: "p-sarah",
      patient_id: "p-margaret",
      level: "primary",
      status: "active",
      permissions: {
        view_alerts: true,
        view_checkins: true,
        view_symptoms: true,
        view_medications: true,
        view_documents: true,
        view_reports: true,
        view_trends: true,
        initiate_calls: true,
      },
      managed_by: "caretaker",
      linked_via: "direct_setup",
      created_at: daysAgo(45),
    },
    {
      id: "r-2",
      caretaker_id: "p-sarah",
      patient_id: "p-james",
      level: "secondary",
      status: "active",
      permissions: {
        view_alerts: true,
        view_checkins: true,
        view_symptoms: true,
        view_medications: false,
        view_documents: false,
        view_reports: false,
        view_trends: true,
        initiate_calls: false,
      },
      managed_by: "patient",
      linked_via: "invite_code",
      created_at: daysAgo(12),
    },
    {
      id: "r-3",
      caretaker_id: "p-david",
      patient_id: "p-margaret",
      level: "secondary",
      status: "pending",
      permissions: {
        view_alerts: true,
        view_checkins: false,
        view_symptoms: false,
        view_medications: false,
        view_documents: false,
        view_reports: false,
        view_trends: false,
        initiate_calls: false,
      },
      managed_by: "caretaker",
      linked_via: "invite_code",
      created_at: daysAgo(1),
    },
  ],

  invites: [
    {
      id: "inv-1",
      code: "A3X9K2",
      type: "caretaker",
      created_by_profile_id: "p-sarah",
      target_email: "david@example.com",
      relationship_data: { level: "secondary", role: "caretaker" },
      expires_at: hoursFromNow(18),
      max_uses: 1,
      use_count: 0,
      redeemed_at: null,
      created_at: hoursAgo(6),
    },
    {
      id: "inv-2",
      code: "B7M4P1",
      type: "caretaker",
      created_by_profile_id: "p-sarah",
      target_email: null,
      relationship_data: { level: "secondary", role: "caretaker" },
      expires_at: daysAgo(1),
      max_uses: 1,
      use_count: 1,
      redeemed_at: daysAgo(1),
      created_at: daysAgo(2),
    },
  ],

  checkIns: [
    {
      id: "ci-1",
      user_id: "p-margaret",
      input_mode: "voice",
      mood: "okay",
      energy: 5,
      sleep_hours: 6.5,
      notes: "Knee pain was a bit worse today. Took morning medications on time.",
      summary: "Moderate day with increased knee pain. Medications taken.",
      flagged: false,
      flag_reason: null,
      created_at: hoursAgo(3),
      symptoms: [
        { id: "s-1", name: "Knee pain", severity: 6, body_area: "Lower body", is_critical: false, alert_level: "info", alert_message: null, dismissed: false },
        { id: "s-2", name: "Mild fatigue", severity: 3, body_area: "General", is_critical: false, alert_level: "info", alert_message: null, dismissed: false },
      ],
    },
    {
      id: "ci-2",
      user_id: "p-margaret",
      input_mode: "voice",
      mood: "good",
      energy: 7,
      sleep_hours: 7.5,
      notes: "Feeling much better. Went for a short walk in the garden.",
      summary: "Good day with improved energy. Light exercise completed.",
      flagged: false,
      flag_reason: null,
      created_at: daysAgo(1),
      symptoms: [],
    },
    {
      id: "ci-3",
      user_id: "p-margaret",
      input_mode: "text",
      mood: "bad",
      energy: 3,
      sleep_hours: 4,
      notes: "Dizzy spells throughout the morning. Blood sugar was 11.2 before lunch.",
      summary: "Concerning day with dizziness and elevated blood sugar.",
      flagged: true,
      flag_reason: "Elevated blood sugar + dizziness may indicate hypoglycemic episode risk",
      created_at: daysAgo(2),
      symptoms: [
        { id: "s-3", name: "Dizziness", severity: 7, body_area: "Head", is_critical: true, alert_level: "critical", alert_message: "Recurring dizziness with diabetes — monitor closely", dismissed: false },
        { id: "s-4", name: "Elevated blood sugar", severity: 6, body_area: "Metabolic", is_critical: true, alert_level: "warning", alert_message: "Blood sugar 11.2 mmol/L — above target range", dismissed: true },
      ],
    },
    {
      id: "ci-4",
      user_id: "p-margaret",
      input_mode: "voice",
      mood: "okay",
      energy: 6,
      sleep_hours: 7,
      notes: "Normal day. Had a visit from Sarah. Ate well.",
      summary: "Stable day with good appetite and social interaction.",
      flagged: false,
      flag_reason: null,
      created_at: daysAgo(3),
      symptoms: [],
    },
    {
      id: "ci-5",
      user_id: "p-margaret",
      input_mode: "voice",
      mood: "good",
      energy: 7,
      sleep_hours: 8,
      notes: "Best sleep in weeks. Morning walk with the neighbour.",
      summary: "Excellent day with restful sleep and social activity.",
      flagged: false,
      flag_reason: null,
      created_at: daysAgo(4),
      symptoms: [],
    },
    {
      id: "ci-6",
      user_id: "p-margaret",
      input_mode: "text",
      mood: "okay",
      energy: 5,
      sleep_hours: 6,
      notes: "Some joint stiffness in the morning but improved after lunch.",
      summary: "Average day with morning stiffness that resolved.",
      flagged: false,
      flag_reason: null,
      created_at: daysAgo(5),
      symptoms: [
        { id: "s-5", name: "Joint stiffness", severity: 4, body_area: "Upper body", is_critical: false, alert_level: "info", alert_message: null, dismissed: false },
      ],
    },
    {
      id: "ci-7",
      user_id: "p-margaret",
      input_mode: "voice",
      mood: "bad",
      energy: 4,
      sleep_hours: 5,
      notes: "Chest tightness after climbing stairs. Rested for the afternoon.",
      summary: "Below average day with exertional chest tightness.",
      flagged: true,
      flag_reason: "Chest tightness with hypertension history requires monitoring",
      created_at: daysAgo(6),
      symptoms: [
        { id: "s-6", name: "Chest tightness", severity: 7, body_area: "Chest", is_critical: true, alert_level: "critical", alert_message: "Chest tightness with hypertension — seek medical attention if persists", dismissed: false },
      ],
    },
    // James check-ins
    {
      id: "ci-8",
      user_id: "p-james",
      input_mode: "voice",
      mood: "okay",
      energy: 4,
      sleep_hours: 6,
      notes: "Breathing a bit harder today. Used inhaler twice.",
      summary: "Respiratory symptoms requiring extra inhaler use.",
      flagged: false,
      flag_reason: null,
      created_at: hoursAgo(5),
      symptoms: [
        { id: "s-7", name: "Shortness of breath", severity: 5, body_area: "Chest", is_critical: false, alert_level: "warning", alert_message: "Increased inhaler use — monitor for COPD exacerbation", dismissed: false },
      ],
    },
    {
      id: "ci-9",
      user_id: "p-james",
      input_mode: "text",
      mood: "good",
      energy: 6,
      sleep_hours: 7,
      notes: "Better day. Walked to the shops. No breathing issues.",
      summary: "Good day with improved respiratory function.",
      flagged: false,
      flag_reason: null,
      created_at: daysAgo(1),
      symptoms: [],
    },
  ],

  auditLog: [
    {
      id: "al-1",
      actor_type: "caretaker",
      actor_id: "p-sarah",
      action: "relationship_created",
      target_type: "caretaker_relationship",
      target_id: "r-1",
      details: { level: "primary", linked_via: "direct_setup" },
      created_at: daysAgo(45),
    },
    {
      id: "al-2",
      actor_type: "caretaker",
      actor_id: "p-sarah",
      action: "permissions_changed",
      target_type: "caretaker_relationship",
      target_id: "r-1",
      details: {
        old: { view_alerts: true, view_checkins: false },
        new: { view_alerts: true, view_checkins: true },
      },
      created_at: daysAgo(40),
    },
    {
      id: "al-3",
      actor_type: "caretaker",
      actor_id: "p-sarah",
      action: "relationship_created",
      target_type: "caretaker_relationship",
      target_id: "r-2",
      details: { linked_via: "invite_code", invite_code: "B7M4P1" },
      created_at: daysAgo(12),
    },
    {
      id: "al-4",
      actor_type: "patient",
      actor_id: "p-james",
      action: "permissions_changed",
      target_type: "caretaker_relationship",
      target_id: "r-2",
      details: {
        old: { view_medications: true },
        new: { view_medications: false },
      },
      created_at: daysAgo(10),
    },
  ],
};

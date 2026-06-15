/**
 * TypeScript Type Definitions
 * Reference: SPEC Section - Data Models
 */

// User Types
export interface Partner {
  id: number;
  email: string;
  full_name: string;
  name: string; // Normalized from full_name
  type: "partner";
  credit_balance: number;
  phone: string;
  company_name: string;
  business_address: string;
  serviceable_pincodes?: string[];
  gst_number: string | null;
  pan_number: string;
  is_verified: boolean;
  verification_status:
    | "pending"
    | "under_review"
    | "clarification_needed"
    | "approved"
    | "rejected"
    | "suspended";
  rejection_reason?: string;
  is_on_hold: boolean;
  hold_reason?: string;
  hold_lift_date?: string;
  created_at: string;
}

export interface Agent {
  id: number;
  email: string;
  full_name: string;
  name: string; // Normalized from full_name
  type: "agent";
  phone: string;
  employee_id: string | null;
  partner_id: number;
  is_active: boolean;
  is_on_hold?: boolean; // Agent's partner may be on hold
  hold_reason?: string; // Reason partner is on hold
  hold_lift_date?: string; // Date when partner hold will be lifted
  is_self_assigned?: boolean; // True if this agent is the partner who self-assigned
  created_at: string;
  credit_balance?: number; // Agents don't have credits, but optional for User type compatibility
}

export type User = Partner | Agent;

// Order/Lead Types
export interface Order {
  id: number;
  order_id?: number; // For marketplace leads
  customer_id: number;
  partner_id: number | null;
  agent_id: number | null;
  specs: string;
  estimated_value: number;
  pickup_schedule_time: string;
  pickup_schedule_date: string;
  pickup_address: string;
  payment_mode: string;
  ai_estimated_price: number;
  // quoted_price: number;

  // Phone details - backend uses these names
  phone_name: string;
  brand?: string;
  model?: string;
  ram_gb: number;
  storage_gb: number;
  variant?: string;
  condition?: string;
  color?: string; // Device color

  // Pricing
  final_quoted_price?: number;
  quoted_price: number;
  lead_cost: number;
  final_price?: number; // Final agreed price

  // AI details
  ai_reasoning: string;
  customer_condition_answers: {
    screen_condition?: string;
    device_turns_on?: string;
    has_original_box?: string;
    has_original_bill?: string;
    device_age?: string;
  } | null;

  // Customer info
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;

  // Legacy customer fields (from backend)
  phone_number?: string;
  email?: string;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Pickup details
  pickup_address_line?: string;
  pickup_city?: string;
  pickup_state?: string;
  pickup_pincode?: string;
  pickup_date?: string | null;
  pickup_time?: string | null;
  scheduled_pickup_time?: string | null;

  // Agent info
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;

  // Status and timestamps
  status: string;
  lead_locked_at: string | null;
  lead_lock_expires_at: string | null;
  locked_at?: string | null; // Alias for lead_locked_at
  purchased_at: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;

  // Pickup completion details
  actual_condition: string | null;
  final_offered_price: number | null;
  customer_accepted_offer: boolean | null;
  pickup_notes: string | null;
  payment_method: string | null;
  payment_amount?: number | null;
  payment_transaction_id?: string | null;
  payment_notes?: string | null;
  payment_processed_at?: string | null;
  completion_notes?: string | null;

  // Device condition assessment
  physical_condition?: string | null;
  screen_condition?: string | null;
  battery_health?: string | null;
  functional_issues?: string | null;
  accessories?: string | null;
  original_box?: boolean;
  charger_included?: boolean;
  warranty_valid?: boolean;
  purchase_invoice?: boolean;
  imei_verified?: boolean;
  icloud_locked?: boolean;

  // Lock info
  time_remaining: number | null; // in seconds
  is_locked?: boolean;
  locked_by_me?: boolean;
}

// Credit Plan
export interface CreditPlan {
  id: number;
  plan_name: string;
  credit_amount: number;
  price: number;
  bonus_percentage: number;
  description: string;
  is_active: boolean;
}

// Auth Response Types
export interface PartnerAuthResponse {
  access_token: string;
  token_type: string;
  partner: Partner;
}

export interface AgentAuthResponse {
  access_token: string;
  agent: Agent;
}

// Form Types
export interface PartnerSignupForm {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  company_name: string;
  business_address: string;
  gst_number: string;
  pan_number: string;
  serviceable_pincodes: string;
}

export interface PartnerLoginForm {
  email: string;
  password: string;
}

export interface AgentLoginForm {
  email: string;
  password: string;
}

export interface AgentCreateForm {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  employee_id: string;
}

export interface SchedulePickupForm {
  scheduled_date: string;
  scheduled_time: string;
  notes: string;
}

export interface CompletePickupForm {
  actual_condition: string;
  final_offered_price: number;
  customer_accepted: boolean;
  pickup_notes: string;
  payment_method: string;
}

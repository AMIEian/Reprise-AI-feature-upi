// User types
export interface User {
  id: number;
  email: string;
  full_name?: string;
  name?: string;
  phone?: string;
  address?: string;
  pincode?: string;
  role: "customer";
  latitude?: number | null;
  longitude?: number | null;
}

// Phone types
export interface Phone {
  id: number;
  Brand: string;
  Model: string;
  Selling_Price: number;
  image_url?: string;
  image_blob?: string;
}

export interface PhoneVariants {
  rams: number[];
  storages: number[];
}

export interface PhonePrice {
  base_price: number;
}

// Order types
export interface Order {
  id: number;
  customer_id?: number;
  partner_id?: number;
  agent_id?: number;
  phone_name: string;
  brand?: string;
  model?: string;
  ram_gb?: number;
  storage_gb?: number;
  variant?: string;
  ai_estimated_price?: number;
  ai_reasoning?: string;
  final_quoted_price: number;
  final_offered_price?: number;
  payment_amount?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  pickup_address_line?: string;
  pickup_city?: string;
  pickup_state?: string;
  pickup_pincode?: string;
  pickup_date?: string;
  pickup_time?: string;
  payment_method?: string;
  status: string;
  lead_locked_at?: string;
  lead_lock_expires_at?: string;
  purchased_at?: string;
  assigned_at?: string;
  accepted_at?: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  created_at: string;
  updated_at?: string;
}

// Auth types
export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  role: "customer";
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string;
  referral_code?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

// Price prediction types
export interface PricePredictionPayload {
  phone_details: {
    brand: string;
    model: string;
    ram_gb?: number | null;
    storage_gb?: number | null;
    screen_condition: string;
    device_turns_on: boolean;
    has_original_box: boolean;
    has_original_bill: boolean;
  };
}

export interface PricePredictionResponse {
  predicted_price: number;
  reasoning?: string;
}

// Order creation types
export interface CreateOrderPayload {
  phone_name: string;
  brand?: string | null;
  model?: string | null;
  ram_gb?: number | null;
  storage_gb?: number | null;
  variant?: string | null;
  customer_condition_answers?: Record<string, any> | null;
  customer_name?: string | null;
  phone_number?: string | null;
  email?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  payment_method?: string | null;
  quoted_price: number;
}

// Pincode check types
export interface PincodeCheckResponse {
  serviceable: boolean;
  message?: string;
  city?: string;
  state?: string;
}

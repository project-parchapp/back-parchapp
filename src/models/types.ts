export type UserRole = 'tourist' | 'establishment_admin' | 'platform_admin';
export type EstablishmentStatus = 'pending_review' | 'active' | 'suspended' | 'closed';
export type RouteStatus = 'draft' | 'saved' | 'completed' | 'archived';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InterestRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: Date;
}

export interface EstablishmentRow {
  id: string;
  owner_user_id: string;
  legal_name: string;
  trade_name: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  address_line: string | null;
  city: string;
  country_code: string;
  latitude: string;
  longitude: string;
  status: EstablishmentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface RouteRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: RouteStatus;
  total_estimated_minutes: number | null;
  origin_latitude: string | null;
  origin_longitude: string | null;
  generation_context: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface RouteStopRow {
  id: string;
  route_id: string;
  establishment_id: string;
  service_id: string | null;
  sort_order: number;
  estimated_travel_minutes_from_prev: number;
  estimated_stay_minutes: number | null;
  latitude: string;
  longitude: string;
  note: string | null;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';

export interface ReservationRow {
  id: string;
  establishment_id: string;
  tourist_user_id: string;
  reservation_date: Date;
  party_size: number;
  status: ReservationStatus;
  note: string | null;
  created_at: Date;
  updated_at: Date;
}

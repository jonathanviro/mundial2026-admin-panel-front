export type UserRole = 'superadmin' | 'campaign_admin'

export interface User {
  id: number
  email: string
  nombres: string
  role: UserRole
  campaign_id: number | null
  active: boolean
  created_at: string
  campaign?: Campaign
}

export interface Campaign {
  id: number
  name: string
  slug: string
  logo_url?: string
  bg_screen1_url?: string
  bg_screen2_url?: string
  web_bg_url?: string
  control_employees: boolean
  active: boolean
  created_at: string
}

export interface Totem {
  id: number
  code: string
  name: string
  location?: string
  campaign_id: number
  version_data: number
  last_sync?: string
  last_heartbeat?: string
  active: boolean
  created_at: string
  campaign?: Campaign
}

export interface TotemStatus extends Totem {
  online: boolean
  registrations_count?: number
}

export interface TotemSyncLog {
  id: number
  totem_id: number
  event: string
  details?: string | null
  registros: number
  created_at: string
}

export interface Phase {
  id: number
  campaign_id: number
  number: number
  name: string
  date_from?: string
  date_to?: string
  daily_predictions?: boolean
  active: boolean
  published: boolean
  version: number
  predictions_required: number
  min_correct_to_win: number
  created_at: string
  matches?: Match[]
}

export interface Match {
  id: number
  phase_id: number
  match_number: number
  group_name?: string
  team_local?: string
  team_visitor?: string
  flag_local?: string
  flag_visitor?: string
  date?: string
  time?: string
  stadium?: string
  city?: string
  goals_local?: number
  goals_visitor?: number
  finished: boolean
}

export interface Participant {
  id: number
  campaign_id: number
  cedula: string
  nombres: string
  apellidos: string
  telefono?: string
  email?: string
  created_at: string
  registrations?: Registration[]
}

export interface Prediction {
  id: number
  match_id: number
  goals_local: number
  goals_visitor: number
  is_correct: boolean
  match?: Match
}

export interface Registration {
  id: number
  factura: string
  participant_id?: number | null
  totem_id?: number | null
  employee_id?: string | null
  phase_id: number
  source: string
  registered_at?: string
  synced_at?: string
  is_winner: boolean
  correct_predictions: number
  total_points?: number
  prediction_date?: string | null
  participant?: Participant
  totem?: Totem
  phase?: Phase
  employee?: Employee
  predictions?: Prediction[]
  _count?: { predictions: number }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pages: number
  limit: number
}

export interface Employee {
  id: string
  code: string
  nombres: string
  apellidos?: string
  email?: string
  telefono?: string
  factura?: string
  password?: string | null
  password_generated?: string
  campaign_id: number
  active: boolean
  created_at: string
  campaign?: Campaign
  registrations?: Registration[]
}

export interface Stats {
  total_registrations: number
  total_winners: number
}

export interface DashboardData {
  totems: TotemStatus[]
  stats: Stats
}

export interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
}

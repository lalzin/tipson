export type SessionStatus = 'active' | 'paused' | 'ended'
export type SessionType = 'dj' | 'karaoke'
export type RequestType = 'normal' | 'priority' | 'karaoke' | 'blacklist'
export type RequestStatus = 'pending_payment' | 'paid' | 'approved' | 'rejected' | 'played'

export interface Profile {
  id: string
  dj_name: string
  avatar_url: string | null
  paypal_me_url: string | null
  is_dj: boolean
  is_admin: boolean
  stripe_account_id: string | null
  charges_enabled: boolean
  payouts_enabled: boolean
  created_at: string
}

export interface Session {
  id: string
  dj_id: string
  name: string
  code: string
  status: SessionStatus
  session_type: SessionType
  price_normal: number
  price_priority: number
  price_karaoke: number
  price_karaoke_priority: number
  express_enabled: boolean
  display_enabled: boolean
  messages_enabled: boolean
  super_messages_enabled: boolean
  price_super_message: number
  display_bg: string
  toxicity_threshold: number
  display_show_dj: boolean
  display_show_venue: boolean
  price_blacklist: number
  venue: string | null
  created_at: string
  ended_at: string | null
}

export interface Message {
  id: string
  session_id: string
  text: string
  author_name: string | null
  is_super: boolean
  amount: number
  created_at: string
}

export interface Request {
  id: string
  session_id: string
  customer_name: string
  song_name: string
  artist: string
  spotify_uri: string | null
  album_image: string | null
  request_type: RequestType
  status: RequestStatus
  amount: number
  message: string | null
  queue_position: number | null
  stripe_payment_intent_id: string | null
  paypal_order_id: string | null
  paypal_capture_id: string | null
  refunded: boolean
  customer_email: string | null
  customer_user_id: string | null
  itunes_url: string | null
  music_links: MusicLinks | null
  created_at: string
}

export interface MusicLinks {
  spotify?: string
  deezer?: string
  appleMusic?: string
  youtube?: string
}

export interface BlacklistTrack {
  id: string
  itunes_id: string
  name: string
  artist: string
  image: string | null
}

export interface SearchTrack {
  id: string
  name: string
  artist: string
  album: string
  image: string
  imageSm: string
  previewUrl: string | null
  durationMs: number
  url: string | null
}

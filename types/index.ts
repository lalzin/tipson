export type SessionStatus = 'active' | 'paused' | 'ended'
export type SessionType = 'dj' | 'karaoke'
export type RequestType = 'normal' | 'priority' | 'karaoke'
export type RequestStatus = 'pending_payment' | 'paid' | 'approved' | 'rejected' | 'played'

export interface Profile {
  id: string
  dj_name: string
  avatar_url: string | null
  paypal_me_url: string | null
  is_dj: boolean
  is_admin: boolean
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
  venue: string | null
  created_at: string
  ended_at: string | null
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
  paypal_order_id: string | null
  paypal_capture_id: string | null
  refunded: boolean
  customer_email: string | null
  customer_user_id: string | null
  created_at: string
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
}

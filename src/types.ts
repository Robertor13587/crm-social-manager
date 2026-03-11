export interface Message {
  id: string
  content: string
  time: string // ISO date string
  direction: 'incoming' | 'outgoing'
  status?: 'sent' | 'delivered' | 'read' | 'failed' | 'sending'
  type?: string
  media_url?: string
  created_at?: string
}

export interface Conversation {
  id: string
  contact_id?: string
  contact_name?: string
  platform: 'whatsapp' | 'facebook' | 'instagram'
  last_message?: string
  last_message_at?: string
  unread_count?: number
  // Specific properties that might appear depending on the platform
  psid?: string
  phone_number?: string
  contact?: string // sometimes used as display name
}

export interface FacebookPage {
  id: string
  name: string
  fanCount: number
  followersCount: number
  pictureUrl: string | null
}

export interface InstagramProfile {
  id: string
  username: string
  name: string
  biography: string
  profilePictureUrl: string | null
  followersCount: number
  followsCount: number
  mediaCount: number
}

export interface InstagramConversation {
  id: string
  user_id: string
  username: string
  fullName: string
  lastMessage: string
  lastAt: string
  time: string
  unread: number
  canMessage: boolean
  messages: Message[]
}

export interface InstagramFollower {
  id: number | string
  username: string
  fullName: string
  bio: string
  followerSince: string
  canMessage: boolean
}

export interface WhatsAppContact {
  id: string
  name: string
  phone: string
  tags?: string[]
  notes?: string
  lastMessage?: string
  tag?: string // used in UI for single tag display
}

export interface WhatsAppConversation {
  id: string
  contact: string
  phone: string
  lastMessage: string
  time: string
  unread: number
  messages: Message[]
}

export interface FacebookConversation {
  id: string
  contact?: string
  last_message?: string
  last_message_at?: string
  psid?: string
  contact_id?: string
}

export interface WhatsAppTemplate {
  id: string
  name: string
  category: string
  content: string
  variables: number
  language: string
  components: any[]
}

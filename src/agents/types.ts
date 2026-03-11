export type Channel = 'whatsapp' | 'instagram' | 'facebook'

export type Action =
  | 'send_message'
  | 'create_contact'
  | 'update_contact'
  | 'list_contacts'
  | 'list_messages'
  | 'import_contacts'

export interface RequestEnvelope<P = any> {
  source: string
  channel: Channel
  action: Action
  payload: P
}

export interface ResponseEnvelope<D = any> {
  status: 'ok' | 'error'
  channel?: Channel
  action?: Action
  data?: D
  meta?: {
    timestamp: string
    count?: number
    pagination?: {
      page: number
      pageSize: number
      total?: number
    }
  }
  message?: string
  code?: string
}

export interface BackendRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: any
}

export interface BackendRawResponse<R = any> {
  status: 'backend_raw'
  response: R
}

export interface ValidationResult<T = any> {
  valid: boolean
  data?: T
  error?: string
}

export interface ContactPayload {
  name?: string
  phone?: string
  tags?: string[]
}

export interface MessagePayload {
  phone: string
  text?: string
  templateId?: string
  variables?: Record<string, string>
}


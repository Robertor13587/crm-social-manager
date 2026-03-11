import type { Message } from '@/types'

export const normalizeMessage = (raw: any): Message => {
  let direction: 'incoming' | 'outgoing' = 'incoming'
  const rawDir = String(raw?.direction ?? raw?.type ?? '').toLowerCase().trim()
  
  if (rawDir.includes('out')) direction = 'outgoing'
  else if (rawDir.includes('in')) direction = 'incoming'
  else if (
    raw?.outgoing === true ||
    raw?.is_outgoing === true ||
    raw?.from_self === true ||
    raw?.fromSelf === true ||
    raw?.from_me === true ||
    raw?.fromMe === true
  ) {
    direction = 'outgoing'
  }

  return {
    id: raw.id || `msg-${Math.random()}`,
    content: raw.content || raw.text || raw.body || '',
    time: raw.created_at || raw.time || raw.timestamp || new Date().toISOString(),
    direction,
    media_url: raw.media_url || raw.mediaUrl || raw.image || raw.attachment
  }
}

export const deduplicatePendingMessages = (serverMessages: Message[], pendingMessages: Message[]): Message[] => {
  return pendingMessages.filter(p => {
    if (p.status === 'failed') return true
    
    // Check if message with same content and recent time exists in server messages
    const exists = serverMessages.some(s => 
      s.direction === 'outgoing' &&
      s.content === p.content &&
      Math.abs(new Date(s.time).getTime() - new Date(p.time).getTime()) < 120000 // 2 minutes tolerance
    )
    return !exists
  })
}

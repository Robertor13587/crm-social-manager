import { describe, it, expect } from 'vitest'
import { normalizeMessage, deduplicatePendingMessages } from './threadUtils'
import type { Message } from '@/types'

describe('Thread Utils', () => {
  describe('normalizeMessage', () => {
    it('should normalize incoming message correctly', () => {
      const raw = {
        id: '123',
        text: 'Hello',
        timestamp: '2024-01-01T10:00:00Z',
        direction: 'incoming'
      }
      const normalized = normalizeMessage(raw)
      expect(normalized).toEqual({
        id: '123',
        content: 'Hello',
        time: '2024-01-01T10:00:00Z',
        direction: 'incoming',
        media_url: undefined
      })
    })

    it('should normalize outgoing message correctly', () => {
      const raw = {
        id: '456',
        body: 'Hi there',
        created_at: '2024-01-01T10:05:00Z',
        from_me: true
      }
      const normalized = normalizeMessage(raw)
      expect(normalized.direction).toBe('outgoing')
      expect(normalized.content).toBe('Hi there')
    })
  })

  describe('deduplicatePendingMessages', () => {
    it('should remove pending message if it exists in server messages', () => {
      const now = new Date().toISOString()
      const serverMsg: Message = {
        id: 'srv-1',
        content: 'Hello World',
        time: now,
        direction: 'outgoing'
      }
      const pendingMsg: Message = {
        id: 'tmp-1',
        content: 'Hello World',
        time: now,
        direction: 'outgoing',
        status: 'sending'
      }

      const result = deduplicatePendingMessages([serverMsg], [pendingMsg])
      expect(result).toHaveLength(0)
    })

    it('should keep pending message if content differs', () => {
      const now = new Date().toISOString()
      const serverMsg: Message = {
        id: 'srv-1',
        content: 'Hello World',
        time: now,
        direction: 'outgoing'
      }
      const pendingMsg: Message = {
        id: 'tmp-1',
        content: 'Different Content',
        time: now,
        direction: 'outgoing',
        status: 'sending'
      }

      const result = deduplicatePendingMessages([serverMsg], [pendingMsg])
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('tmp-1')
    })

    it('should keep pending message if time difference is too large', () => {
      const time1 = new Date('2024-01-01T10:00:00Z').toISOString()
      const time2 = new Date('2024-01-01T10:05:00Z').toISOString() // 5 minutes later

      const serverMsg: Message = {
        id: 'srv-1',
        content: 'Hello World',
        time: time1,
        direction: 'outgoing'
      }
      const pendingMsg: Message = {
        id: 'tmp-1',
        content: 'Hello World',
        time: time2,
        direction: 'outgoing',
        status: 'sending'
      }

      const result = deduplicatePendingMessages([serverMsg], [pendingMsg])
      expect(result).toHaveLength(1)
    })
  })
})

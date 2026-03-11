import { routeRequest } from '../services/projectManager'
import type { RequestEnvelope, ResponseEnvelope, Channel, Action } from '../agents/types'

export async function irkRequest(channel: Channel, action: Action, payload: any): Promise<ResponseEnvelope> {
  const req: RequestEnvelope = {
    source: 'irk.frontend',
    channel,
    action,
    payload,
  }
  return routeRequest(req)
}

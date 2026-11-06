export type User = {
  id: number
  name: string
  cpf: number
}

export type Card = {
  id: number
  card_uid: string
  user_id: number
  active: boolean
}

export type AccessLog = {
  id: number
  card_id: number | null
  card_uid?: string
  authorized: boolean
  accessed_at: string
}

export type View = 'overview' | 'users' | 'cards' | 'accesses'

export type ConnectionState = 'checking' | 'online' | 'partial' | 'offline'

export type DashboardData = {
  users: User[]
  cards: Card[]
  logs: AccessLog[]
}

export type EnrollmentStatus = {
  active: boolean
  user_id: number
  card?: Card
  conflict_card?: Card
  error?: string
}

export type PageNotice = {
  id: number
  type: 'success' | 'error'
  title: string
  message: string
}

export type PendingTransfer = {
  card: Card
  targetUserId: number
}

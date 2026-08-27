/**
 * Database Entity Schema: customers
 */

export interface CustomerEntity {
  id: string
  name: string
  phone?: string
  email?: string
  tier: 'STANDARD' | 'GOLD' | 'PLATINUM'
  preferredLanguage: string
  disputeRate: number
  createdAt: string
}

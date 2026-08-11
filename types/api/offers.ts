export interface CreateBusinessOfferRequest {
  venueScope: 'single' | 'selected' | 'all'
  venueId?: string
  venueIds?: string[]
  title: string
  description?: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  terms?: string
  redemptionLimitTotal?: number | null
  redemptionLimitPerUser?: number
}

export interface RedeemOfferRequest {
  code: string
  venueId: string
  idempotencyKey: string
}

export interface OfferRedemptionResponse {
  redemption: {
    id: string
    redeemedAt: string
    offerTitle: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    terms: string | null
    businessName: string
    venueName: string
    idempotentReplay: boolean
  }
}

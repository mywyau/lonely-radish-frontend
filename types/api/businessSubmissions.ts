export type BusinessOfferApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'
export type BusinessVenueStatus = 'draft' | 'pending' | 'active' | 'paused' | 'rejected' | 'archived'
export type BusinessSubmissionAction = 'resubmit' | 'archive'

export interface BusinessVenueSubmissionRequest {
  name: string
  category: string
  addressLine: string
  city: string
  postcode: string
}

export interface BusinessOfferSubmissionRequest {
  venueScope: 'single' | 'selected' | 'all'
  venueId?: string
  venueIds?: string[]
  title: string
  description?: string | null
  discountType: 'percentage' | 'fixed'
  discountValue: number
  terms?: string | null
  redemptionLimitTotal?: number | null
  redemptionLimitPerUser?: number
}

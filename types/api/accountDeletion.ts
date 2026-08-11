export type AccountDeletionJobStatus = 'pending' | 'processing' | 'failed' | 'completed'

export interface AccountDeletionRequest {
  confirm?: string
}

export interface AccountDeletionResponse {
  success: true
  queued: boolean
  alreadyInProgress: boolean
  createdNewJob: boolean
  jobId: number | null
  status: AccountDeletionJobStatus
}

export interface AccountDeletionWorkerRequest {
  jobId: number
  userId: string
}

export type AccountDeletionWorkerResponse =
  | { success: true; completed: true; skipped?: boolean }
  | { success: true; skipped: true }

export type NextActionKey =
  | 'prepare_lead'
  | 'send_first_message'
  | 'wait_for_reply'
  | 'prepare_proposal'
  | 'request_review'
  | 'follow_up'
  | 'archive'

export type NextActionColor = 'red' | 'yellow' | 'green' | 'blue' | 'muted'

export type LeadDetailFocus = 'overview' | 'message' | 'history' | 'proposal' | 'review'

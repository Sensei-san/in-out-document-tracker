
export enum DocumentStatus {
  Received = 'Received',
  SentForSigning = 'Sent for Signing',
  ReturnedFromSigning = 'Returned from Signing',
  Dispatched = 'Dispatched',
  Archived = 'Archived',
}

export interface StatusHistoryEntry {
  status: DocumentStatus;
  timestamp: Date;
  notes?: string;
}

export interface DispatchedDetails {
  recipientName: string;
  dispatchedBy: string;
  dispatchedDate: Date;
  recipientSignature: string; // base64 data URL
  recipientPhoto: string; // base64 data URL
}

export interface Document {
  id: string;
  subject: string;
  senderName: string;
  referenceNumber: string;
  originatingDivision: string;
  letterDate: Date | null;
  receivedDate: Date;
  status: DocumentStatus;
  statusHistory: StatusHistoryEntry[];
  scannedDocument: string; // base64 data URL of the original scan
  dispatchedDetails: DispatchedDetails | null;
  signingOffice?: string;
  deliveredBy?: string; // For manually entered incoming docs
}

export type ViewState = 
  | { name: 'dashboard' }
  | { name: 'add' }
  | { name: 'dispatch', docId: string }
  | { name: 'add-method' }
  | { name: 'manual-entry' }
  | { name: 'select-incoming' }
  | { name: 'add-incoming-method' }
  | { name: 'upload-batch' }
  | { name: 'manual-entry-incoming', startMode?: 'manual' | 'scan' };

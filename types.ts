
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
  location?: string;
  locationUpdatedAt?: Date;
  deliveredBy?: string; 
  customFields?: Record<string, string>;
}

export interface CustomAIField {
    id: string;
    label: string;
    description: string;
}

export interface BoundingBox {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
}

export interface TrainingRegion {
    label: string;
    box: BoundingBox;
}

export interface SpatialExample {
    id: string;
    imageData: string;
    regions: TrainingRegion[];
}

export interface AIConfig {
    systemInstructions: string;
    customFields: CustomAIField[];
    spatialExamples: SpatialExample[];
}

export interface AppSettings {
    darkMode: boolean;
    officeName: string;
    userName: string;
    userRole: string;
    autoExtract: boolean;
    defaultView: 'dashboard' | 'tracking';
    accentColor: string;
    notificationsEnabled: boolean;
}

export type ViewState = 
  | { name: 'dashboard' }
  | { name: 'add' }
  | { name: 'dispatch', docId: string }
  | { name: 'add-method' }
  | { name: 'manual-entry' }
  | { name: 'select-incoming' }
  | { name: 'add-incoming-method' }
  | { name: 'upload-batch', docType: 'incoming' | 'outgoing' }
  | { name: 'batch-signing', batch: Partial<Document>[] }
  | { name: 'batch-entry', docType: 'incoming' | 'outgoing', startMode?: 'manual' | 'scan' | 'select' }
  | { name: 'tracking' }
  | { name: 'train-ai' }
  | { name: 'settings' }
  | { name: 'print' };

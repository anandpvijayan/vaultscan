export type PIIType = 'Name' | 'Address' | 'Email' | 'Phone Numbers' | 'Financial Details' | 'Network IDs' | 'Manual' | 'Sensitive Data';

export const PIIType = {
  Name: 'Name' as PIIType,
  Address: 'Address' as PIIType,
  Email: 'Email' as PIIType,
  Phone: 'Phone Numbers' as PIIType,
  Financial: 'Financial Details' as PIIType,
  Network: 'Network IDs' as PIIType,
  Manual: 'Manual' as PIIType,
  Sensitive: 'Sensitive Data' as PIIType
};

export interface RedactionRegion {
  id: string;
  type: PIIType;
  x: number;      // 0 to 1000 scale to guarantee spatial responsiveness
  y: number;      // 0 to 1000 scale
  width: number;
  height: number;
  active: boolean;
  label?: string; // OCR text value
}

export interface QueueItem {
  id: string;
  name: string;
  size: number;
  type: string;
  originalImage: string; // Base64 data URL
  sanitizedImage?: string; // Base64 data URL
  regions: RedactionRegion[];
  rotation: number; // 0 | 90 | 180 | 270 degrees
  cropPoints?: { x: number; y: number }[]; // 4 corners, normalized 0-1000
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
}

export interface RedactedDocument {
  id: string;
  name: string;
  timestamp: number;
  originalImage: string; // Stored locally
  sanitizedImage: string; // Permanently burned data URL
  regions: RedactionRegion[];
  tags: string[];
}

export type LivestockGender = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type LivestockStatus = 'ACTIVE' | 'MISSING' | 'INACTIVE';
export type RfidDirection = 'ENTER' | 'EXIT' | 'UNKNOWN';

export interface RfidTag {
  id: string;
  epc: string;
}

export interface LivestockLastScan {
  scannedAt: string;
}

export interface Livestock {
  id: string;
  earNumber: string;
  name?: string;
  gender: LivestockGender;
  birthYear?: number;
  color?: string;
  markDescription?: string;
  imageUrl?: string | null;
  status: LivestockStatus;
  rfidTag?: RfidTag | null;
  lastScan?: LivestockLastScan | null;
}

export interface LivestockInput {
  earNumber: string;
  name?: string;
  gender: LivestockGender;
  birthYear?: number;
  color?: string;
  markDescription?: string;
  rfidEpc?: string;
  imageUrl?: string | null;
}

export interface RfidReader {
  id: string;
  name: string;
}

export interface RfidScan {
  id: string;
  epc: string;
  direction?: RfidDirection;
  scannedAt: string;
  reader: RfidReader;
}

export interface MissingLivestock {
  id: string;
  earNumber: string;
  name?: string;
  lastSeenAt?: string;
}

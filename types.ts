export enum Sender {
  User = 'user',
  Bot = 'bot'
}

export enum Subject {
  General = 'General Helper',
  Math = 'Mathematics',
  Science = 'Science & Nature',
  History = 'History & Social Studies',
  Literature = 'Literature & Writing'
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  groundingUrls?: string[];
  attachments?: Attachment[];
}

export interface Attachment {
  type: 'image';
  data: string; // base64
  mimeType: string;
}

export interface ConceptNode {
  id: string;
  group: number;
  val: number; // radius
}

export interface ConceptLink {
  source: string;
  target: string;
  value: number;
}

export interface ConceptGraphData {
  nodes: ConceptNode[];
  links: ConceptLink[];
}

export interface ProgressData {
  subject: string;
  score: number;
  sessions: number;
}

export interface UserProfile {
  name: string;
  avatar: string; // base64 data URI
}
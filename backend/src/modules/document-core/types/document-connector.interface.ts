import type { DocumentEnvelopePayload } from './document-envelope.types';

export type ClassifyResult = {
  docType: string;
  confidence: number;
};

export type ParseContext = {
  filename: string;
  mime: string;
  contentHash: string;
  ingestedAt: string;
};

export interface DocumentConnector {
  readonly docTypes: string[];
  classify(filename: string, bytes: Buffer): ClassifyResult | null;
  parse(bytes: Buffer, ctx: ParseContext): Promise<DocumentEnvelopePayload>;
}

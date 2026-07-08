import type { DocumentConnector } from '../../types/document-connector.interface';
import type { DocumentEnvelopePayload } from '../../types/document-envelope.types';
import { classifyXmlContent } from '../../classification/xml-classifier';
import { parseCteXml } from './cte.parser';
import { validateCteEnvelope } from './cte.validator';
import { correctXmlBytes } from '../../utils/xml-corrector.util';

export class CteConnector implements DocumentConnector {
  readonly docTypes = ['cte'];

  classify(filename: string, bytes: Buffer) {
    const kind = classifyXmlContent(bytes, filename);
    if (kind !== 'cte') return null;
    return { docType: 'cte', confidence: 0.95 };
  }

  async parse(bytes: Buffer, ctx: Parameters<DocumentConnector['parse']>[1]): Promise<DocumentEnvelopePayload> {
    const corrected = correctXmlBytes(bytes);
    let envelope = parseCteXml(corrected.bytes, ctx);
    if (corrected.corrections.length) {
      envelope = {
        ...envelope,
        validation: {
          ...envelope.validation,
          warnings: [
            ...envelope.validation.warnings,
            {
              code: 'CTE_AUTO_CORRECTED',
              message: `XML corrigido automaticamente: ${corrected.corrections.join(', ')}`,
            },
          ],
        },
      };
    }
    return validateCteEnvelope(envelope);
  }
}

export const cteConnector = new CteConnector();

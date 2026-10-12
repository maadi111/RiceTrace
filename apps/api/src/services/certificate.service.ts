/**
 * @file apps/api/src/services/certificate.service.ts
 * @description Backward compatibility adapter for certificate generation.
 * Delegates directly to Session 4 generateCertificate in pdf-generator.service.
 */

import { generateCertificate } from "./pdf-generator.service.js";

export async function generateShipmentCertificate(
  shipmentId: string,
  organizationId: string
): Promise<{ certificateUrl: string; certificateNumber: string }> {
  const result = await generateCertificate(shipmentId, organizationId);
  return {
    certificateUrl: result.pdfUrl,
    certificateNumber: result.certNumber,
  };
}

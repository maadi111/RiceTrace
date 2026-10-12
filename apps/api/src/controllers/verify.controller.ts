import type { Request, Response } from 'express';
import { prisma } from '@ricetrace/db';

export async function verifyCertificate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { certNumber } = req.params;

    // Sanitize cert number — only allow alphanumeric and hyphens
    if (!certNumber || !/^CERT-\d{4}-\d{5}$/.test(certNumber)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CERT', message: 'Invalid certificate number format' }
      });
      return;
    }

    const shipment = await prisma.shipment.findFirst({
      where: { certNumber },
      include: {
        organization: {
          select: { name: true, slug: true }
        },
        buyer: {
          select: { companyName: true, country: true }
        },
        items: {
          include: {
            millingBatch: {
              include: {
                lotLinks: {
                  include: {
                    procurementLot: {
                      include: {
                        farm: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!shipment) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CERTIFICATE_NOT_FOUND',
          message: `No certificate found with number ${certNumber}`
        }
      });
      return;
    }

    // Count farms
    const farmSet = new Set<string>();
    shipment.items.forEach((item) => {
      item.millingBatch.lotLinks.forEach((link) => {
        farmSet.add(link.procurementLot.farm.id);
      });
    });

    // Collect districts (not GPS — public safety)
    const districts = new Set<string>();
    shipment.items.forEach((item) => {
      item.millingBatch.lotLinks.forEach((link) => {
        districts.add(link.procurementLot.farm.district);
      });
    });

    // All farm EUDR risk levels
    const eudrRisks = Array.from(
      new Set(
        shipment.items.flatMap((item) =>
          item.millingBatch.lotLinks.map(
            (link) => link.procurementLot.farm.eudrRiskLevel
          )
        )
      )
    );

    const hasHighRisk = eudrRisks.includes('HIGH');
    const hasPending = eudrRisks.includes('PENDING');

    res.status(200).json({
      success: true,
      data: {
        // Certificate meta
        certNumber,
        isValid: true,
        issuedAt: shipment.certificateGeneratedAt,
        status: shipment.certificateStatus,

        // Exporter (public info)
        exporterName: shipment.organization.name,
        exporterCountry: 'Pakistan',

        // Buyer (public info)
        buyerCompany: shipment.buyer.companyName,
        buyerCountry: shipment.buyer.country,

        // Shipment (public info)
        shipmentNumber: shipment.shipmentNumber,
        riceVariety: shipment.items[0]?.millingBatch?.variety || 'N/A',

        // Compliance (public summary — no raw data)
        complianceScore: shipment.complianceScore,
        complianceStatus: shipment.complianceStatus,
        eudrCompliant: !hasHighRisk && !hasPending,

        // Traceability summary (counts only — no farmer names/CNICs)
        farmCount: farmSet.size,
        districts: Array.from(districts),
        batchCount: shipment.items.length,
        totalWeightKg: shipment.items.reduce(
          (sum, item) => sum + item.weightKg,
          0
        ),

        // Platform attribution
        verifiedBy: 'RiceTrace Traceability Platform',
        verificationTimestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Verify] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Verification service unavailable' }
    });
  }
}

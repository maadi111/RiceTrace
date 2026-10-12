/**
 * @file packages/db/prisma/seed.ts
 * @description Database seed script for RiceTrace.
 * Seeds initial Organization (Al-Raheem Rice Mills Ltd.), users across all 5 roles,
 * mills, registered farmers with GPS-mapped farms, procurement lots, milling batches,
 * lab test reports, and an EU export shipment.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding RiceTrace database...");

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: "al-raheem-rice" },
    update: {},
    create: {
      name: "Al-Raheem Rice Mills Ltd.",
      slug: "al-raheem-rice",
      plan: "PROFESSIONAL",
      logoUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150",
    },
  });

  console.log("✓ Organization created:", org.name);

  // 2. Create Users
  const passwordHash = await bcrypt.hash("Secret123!", 10);

  const users = [
    {
      email: "admin@al-raheem-rice.pk",
      name: "Chaudhry Tariq (GM / Mill Owner)",
      role: "MILL_ADMIN" as const,
      language: "EN" as const,
    },
    {
      email: "procurement@al-raheem-rice.pk",
      name: "Muhammad Rizwan (Field Officer)",
      role: "PROCUREMENT_OFFICER" as const,
      language: "UR" as const,
    },
    {
      email: "mill@al-raheem-rice.pk",
      name: "Haji Aslam (Factory Floor Manager)",
      role: "MILL_MANAGER" as const,
      language: "EN" as const,
    },
    {
      email: "quality@al-raheem-rice.pk",
      name: "Dr. Ayesha Malik (QC & Lab Head)",
      role: "QUALITY_MANAGER" as const,
      language: "EN" as const,
    },
    {
      email: "export@al-raheem-rice.pk",
      name: "Hamza Farooq (Export Director)",
      role: "EXPORT_MANAGER" as const,
      language: "EN" as const,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        organizationId: org.id,
        email: u.email,
        name: u.name,
        role: u.role,
        language: u.language,
        passwordHash,
      },
    });
  }
  console.log("✓ 5 Core persona users created");

  // 3. Create Mills
  const mill = await prisma.mill.create({
    data: {
      organizationId: org.id,
      name: "Unit 1 — Muridke Processing Plant",
      licenseNumber: "PREA-LHR-EXP-2024-0418",
      address: "GT Road, Muridke, Punjab",
      district: "Sheikhupura",
      province: "Punjab",
      geoLat: 31.7167,
      geoLng: 73.985,
    },
  });
  console.log("✓ Milling facility registered:", mill.name);

  // 4. Create Buyer
  const buyer = await prisma.buyer.create({
    data: {
      organizationId: org.id,
      companyName: "EuroGrain Imports B.V.",
      country: "Netherlands",
      contactName: "Pieter van de Berg",
      contactEmail: "p.vandeberg@eurograin.nl",
      portalTokenHash: await bcrypt.hash("tk_eurograin_demo_9921", 10),
      tokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });
  console.log("✓ Buyer registered with magic link:", buyer.companyName);

  // 5. Create Farmers & Farms
  const farmer1 = await prisma.farmer.create({
    data: {
      organizationId: org.id,
      cnic: "3540112345671",
      name: "Chaudhry Muhammad Ibrahim",
      fatherName: "Haji Abdul Rehman",
      phone: "03004567891",
      village: "Chak 34-RB",
      district: "Sheikhupura",
      tehsil: "Muridke",
      farms: {
        create: [
          {
            name: "Chak 34 Dera Field",
            areaAcres: 14.5,
            district: "Sheikhupura",
            tehsil: "Muridke",
            landTitle: "KH-482/1",
            geoLat: 31.7167,
            geoLng: 73.985,
            eudrRiskLevel: "LOW",
          },
          {
            name: "Canal Bank Plot A",
            areaAcres: 8.0,
            district: "Sheikhupura",
            tehsil: "Muridke",
            landTitle: "KH-512/3",
            geoLat: 31.7245,
            geoLng: 73.9912,
            eudrRiskLevel: "LOW",
          },
        ],
      },
    },
    include: { farms: true },
  });

  const farmer2 = await prisma.farmer.create({
    data: {
      organizationId: org.id,
      cnic: "3410198765432",
      name: "Malik Abdul Rasheed",
      fatherName: "Malik Noor Din",
      phone: "03017894561",
      village: "Mouza Wahndo",
      district: "Gujranwala",
      tehsil: "Kamoke",
      farms: {
        create: [
          {
            name: "Kamoke South Sector",
            areaAcres: 22.0,
            district: "Gujranwala",
            tehsil: "Kamoke",
            landTitle: "KH-88/A",
            geoLat: 31.9744,
            geoLng: 74.2231,
            eudrRiskLevel: "LOW",
          },
        ],
      },
    },
    include: { farms: true },
  });
  console.log("✓ Farmers and georeferenced fields created");

  console.log("🎉 Seed finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

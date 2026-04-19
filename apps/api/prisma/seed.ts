import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { ReportCategory, ReportStatus, VoteType } from '../../../packages/shared/src/enums';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main() {
  const lines = await prisma.line.findMany({ take: 5 });
  if (lines.length === 0) {
    console.error('No lines found — load GTFS data first before seeding.');
    process.exit(1);
  }

  // Clear in FK-safe order
  await prisma.vote.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.user.deleteMany({});

  // Users
  const [ivan, maria, georgi, elena, petko] = await Promise.all([
    prisma.user.create({ data: { email: 'ivan@transitwatch.bg', credibilityScore: 15 } }),
    prisma.user.create({ data: { email: 'maria@transitwatch.bg', credibilityScore: 8 } }),
    prisma.user.create({ data: { email: 'georgi@transitwatch.bg', credibilityScore: 3 } }),
    prisma.user.create({ data: { email: 'elena@transitwatch.bg', credibilityScore: 0 } }),
    prisma.user.create({ data: { email: 'petko@transitwatch.bg', credibilityScore: 20 } }),
  ]);

  const now = new Date();
  const line = (i: number) => lines[i % lines.length].id;

  // Reports
  const [vehicleActive, trafficActive, inspectorActive, safetyActive, otherActive, , , inspectorVerified] =
    await Promise.all([
      prisma.report.create({
        data: {
          userId: ivan.id,
          lineId: line(0),
          category: ReportCategory.VEHICLE_ISSUE,
          description: 'Счупена климатизация в автобуса, непоносима жега',
          credibilityScore: 20,
          status: ReportStatus.ACTIVE,
          expiresAt: addMinutes(now, 60),
        },
      }),
      prisma.report.create({
        data: {
          userId: maria.id,
          lineId: line(1),
          category: ReportCategory.TRAFFIC,
          description: 'Закъснение над 15 мин, голямо задръстване на кръстовището',
          credibilityScore: 13,
          status: ReportStatus.ACTIVE,
          expiresAt: addMinutes(now, 30),
        },
      }),
      prisma.report.create({
        data: {
          userId: petko.id,
          lineId: line(2),
          category: ReportCategory.INSPECTORS,
          description: 'Контрольори проверяват на спирката, имайте билети',
          credibilityScore: 22,
          status: ReportStatus.ACTIVE,
          expiresAt: addMinutes(now, 20),
        },
      }),
      prisma.report.create({
        data: {
          userId: georgi.id,
          lineId: line(3),
          category: ReportCategory.SAFETY,
          description: 'Агресивен пасажер в трамвая, избягвайте последния вагон',
          credibilityScore: 8,
          status: ReportStatus.ACTIVE,
          expiresAt: addMinutes(now, 45),
        },
      }),
      prisma.report.create({
        data: {
          userId: elena.id,
          lineId: line(4),
          category: ReportCategory.OTHER,
          description: 'Свободни места в следващия автобус',
          credibilityScore: 5,
          status: ReportStatus.ACTIVE,
          expiresAt: addMinutes(now, 30),
        },
      }),
      // Expired reports
      prisma.report.create({
        data: {
          userId: ivan.id,
          lineId: line(0),
          category: ReportCategory.VEHICLE_ISSUE,
          description: 'Счупена врата, не се затваря',
          credibilityScore: 5,
          status: ReportStatus.EXPIRED,
          expiresAt: addMinutes(now, -120),
        },
      }),
      prisma.report.create({
        data: {
          userId: maria.id,
          lineId: line(1),
          category: ReportCategory.TRAFFIC,
          description: 'Беше затворена улицата заради авария',
          credibilityScore: 5,
          status: ReportStatus.EXPIRED,
          expiresAt: addMinutes(now, -60),
        },
      }),
      // Verified report
      prisma.report.create({
        data: {
          userId: petko.id,
          lineId: line(2),
          category: ReportCategory.INSPECTORS,
          description: 'Контрольори на Орлов мост, много са',
          credibilityScore: 25,
          status: ReportStatus.VERIFIED,
          expiresAt: addMinutes(now, 10),
        },
      }),
    ]);

  // Votes
  await Promise.all([
    // Inspector (verified): 3 confirms
    prisma.vote.create({ data: { reportId: inspectorVerified.id, userId: maria.id, type: VoteType.CONFIRM } }),
    prisma.vote.create({ data: { reportId: inspectorVerified.id, userId: georgi.id, type: VoteType.CONFIRM } }),
    prisma.vote.create({ data: { reportId: inspectorVerified.id, userId: elena.id, type: VoteType.CONFIRM } }),
    // Traffic (active): 2 confirms + 1 dispute
    prisma.vote.create({ data: { reportId: trafficActive.id, userId: petko.id, type: VoteType.CONFIRM } }),
    prisma.vote.create({ data: { reportId: trafficActive.id, userId: elena.id, type: VoteType.CONFIRM } }),
    prisma.vote.create({ data: { reportId: trafficActive.id, userId: georgi.id, type: VoteType.DISPUTE } }),
    // Safety: 1 dispute
    prisma.vote.create({ data: { reportId: safetyActive.id, userId: ivan.id, type: VoteType.DISPUTE } }),
    // Vehicle issue (active): 1 confirm
    prisma.vote.create({ data: { reportId: vehicleActive.id, userId: petko.id, type: VoteType.CONFIRM } }),
    // Inspector (active): 1 confirm
    prisma.vote.create({ data: { reportId: inspectorActive.id, userId: maria.id, type: VoteType.CONFIRM } }),
    // Other: 1 confirm
    prisma.vote.create({ data: { reportId: otherActive.id, userId: georgi.id, type: VoteType.CONFIRM } }),
  ]);

  console.log('Seeded: 5 users, 8 reports (6 active/verified + 2 expired), 10 votes');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

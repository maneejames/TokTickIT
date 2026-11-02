import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

export async function seed() {
  const prisma = getPrisma();
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 1. Categories
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  // 2. Related Systems
  const relatedSystems = [
    { name: "Email", description: "University mail service" },
    { name: "Campus Wi-Fi", description: "KMUTT Secure Wireless" },
    { name: "VPN", description: "Off-campus network access" },
    { name: "LEB2 App", description: "Learning environment platform" },
    { name: "Grade Submission App", description: "Faculty grading system" },
    { name: "Printer", description: "Central and departmental printers" },
    { name: "Corporate Laptop", description: "Assigned university laptop" },
  ];

  for (const sys of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: {
        description: sys.description,
        isActive: true,
      },
      create: {
        name: sys.name,
        description: sys.description,
        isActive: true,
      },
    });
  }


  // 4. Seed Users for Lab 3 (Admin, IT Staff, Requesters)
  const usersToSeed = [
    // Administrators
    {
      name: "Central Administrator",
      email: "admin@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "ADMINISTRATOR" as const,
      isActive: true,
      mustChangePassword: false,
    },
    // IT Staff
    {
      name: "Witchai Tech",
      email: "staff.witchai@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "IT_STAFF" as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Kamon Support",
      email: "staff.kamon@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "IT_STAFF" as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Naree Network",
      email: "staff.naree@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "IT_STAFF" as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Former Staff",
      email: "staff.inactive@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "IT_STAFF" as const,
      isActive: false,
      mustChangePassword: false,
    },
    // Requesters
    {
      name: "Somchai Jaidee",
      email: "somchai.jai@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Suda Rakdee",
      email: "suda.rak@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Wichai Meesook",
      email: "wichai.mee@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Anong Chalong",
      email: "anong.cha@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Inactive Requester",
      email: "inactive.req@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "REQUESTER" as const,
      isActive: false,
      mustChangePassword: false,
    },
    {
      name: "Temporary Requester",
      email: "temp.req@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: true,
    },
    // Also include legacy requester accounts if not already covered
    {
      name: "John Doe",
      email: "john.doe@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Jane Smith",
      email: "jane.smith@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Anon Olduser",
      email: "anon.old@kmutt.ac.th",
      passwordHash: defaultPasswordHash,
      role: "REQUESTER" as const,
      isActive: false,
      mustChangePassword: false,
    },
  ];

  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        passwordHash: u.passwordHash,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
      },
      create: u,
    });
  }

  // Reference lookups
  const somchai = await prisma.user.findUnique({ where: { email: "somchai.jai@kmutt.ac.th" } });
  const suda = await prisma.user.findUnique({ where: { email: "suda.rak@kmutt.ac.th" } });
  const witchai = await prisma.user.findUnique({ where: { email: "staff.witchai@kmutt.ac.th" } });
  const kamon = await prisma.user.findUnique({ where: { email: "staff.kamon@kmutt.ac.th" } });

  const hardwareCat = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });
  const softwareCat = await prisma.category.findUnique({ where: { name: "Software" } });
  const accessCat = await prisma.category.findUnique({ where: { name: "Account and Access" } });

  const laptopSys = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });
  const wifiSys = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });
  const vpnSys = await prisma.relatedSystem.findUnique({ where: { name: "VPN" } });
  const emailSys = await prisma.relatedSystem.findUnique({ where: { name: "Email" } });
  const printerSys = await prisma.relatedSystem.findUnique({ where: { name: "Printer" } });

  if (somchai && suda && witchai && kamon && hardwareCat && networkCat && softwareCat && accessCat && laptopSys && wifiSys && vpnSys && emailSys && printerSys) {
    const realisticTickets = [
      {
        ticketNumber: "TICK-20260906-0001",
        requesterId: somchai.id,
        ownerId: witchai.id,
        categoryId: hardwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Laptop battery drains in less than 30 minutes",
        description: "After the recent operating system update, the corporate laptop shuts down unexpectedly when unplugged.",
        requestedPriority: "HIGH" as const,
        itPriority: "HIGH" as const,
        currentStatus: "IN_PROGRESS" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T08:30:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0002",
        requesterId: somchai.id,
        ownerId: kamon.id,
        categoryId: networkCat.id,
        relatedSystemId: wifiSys.id,
        summary: "Wi-Fi disconnecting repeatedly in Building CB2 3rd floor",
        description: "Unable to maintain stable Wi-Fi connection during lectures in CB2-301 classroom.",
        requestedPriority: "MEDIUM" as const,
        itPriority: "MEDIUM" as const,
        currentStatus: "OPEN" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T09:15:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0003",
        requesterId: somchai.id,
        ownerId: null,
        categoryId: accessCat.id,
        relatedSystemId: emailSys.id,
        summary: "Cannot access department shared mailbox",
        description: "Getting permission denied error when opening shared mailbox dept-cpe@kmutt.ac.th in Outlook web app.",
        requestedPriority: "HIGH" as const,
        itPriority: "HIGH" as const,
        currentStatus: "NEW" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T10:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0004",
        requesterId: somchai.id,
        ownerId: witchai.id,
        categoryId: softwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Request installation of Docker Desktop for coursework",
        description: "Need Docker Desktop installed and configured with student license for distributed systems assignment.",
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "WAITING_FOR_REQUESTER" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T11:20:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0005",
        requesterId: somchai.id,
        ownerId: witchai.id,
        categoryId: hardwareCat.id,
        relatedSystemId: printerSys.id,
        summary: "Engineering lab printer paper jam in tray 2",
        description: "Central printer in CB2 building floor 4 is showing error 13.20 paper jam error.",
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "RESOLVED" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T13:45:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0006",
        requesterId: somchai.id,
        ownerId: kamon.id,
        categoryId: softwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Software license expired for CAD modeling tool",
        description: "The workstation AutoCAD license shows expired as of this morning. Need license server renewal.",
        requestedPriority: "MEDIUM" as const,
        itPriority: "MEDIUM" as const,
        currentStatus: "CLOSED" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T14:10:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0007",
        requesterId: somchai.id,
        ownerId: null,
        categoryId: networkCat.id,
        relatedSystemId: wifiSys.id,
        summary: "Slow network throughput during video conferencing",
        description: "Video calls over Wi-Fi suffer severe packet loss and audio stuttering during peak lecture hours.",
        requestedPriority: "MEDIUM" as const,
        itPriority: "MEDIUM" as const,
        currentStatus: "NEW" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T15:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0008",
        requesterId: somchai.id,
        ownerId: null,
        categoryId: hardwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "External monitor HDMI port not detected",
        description: "Connecting secondary display to laptop HDMI port results in no signal detected message.",
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T15:30:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0009",
        requesterId: somchai.id,
        ownerId: null,
        categoryId: accessCat.id,
        relatedSystemId: emailSys.id,
        summary: "Requesting departmental mailing list access",
        description: "Need to be added to the cpe-faculty announcement mailing list as a new semester coordinator.",
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T16:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0010",
        requesterId: somchai.id,
        ownerId: null,
        categoryId: softwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Matlab license configuration error on startup",
        description: "Matlab fails to launch with error -96: Connection to license server failed.",
        requestedPriority: "MEDIUM" as const,
        itPriority: "MEDIUM" as const,
        currentStatus: "NEW" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T16:30:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0011",
        requesterId: somchai.id,
        ownerId: null,
        categoryId: hardwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Laptop keyboard spacebar key is sticking",
        description: "Physical spacebar key frequently registers duplicate spaces or does not register press.",
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T17:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0012",
        requesterId: somchai.id,
        ownerId: null,
        categoryId: networkCat.id,
        relatedSystemId: vpnSys.id,
        summary: "VPN certificate expired on university laptop",
        description: "Security alert indicates client certificate has expired and VPN connection is refused.",
        requestedPriority: "HIGH" as const,
        itPriority: "HIGH" as const,
        currentStatus: "NEW" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-06T17:45:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0013",
        requesterId: suda.id,
        ownerId: witchai.id,
        categoryId: softwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Statistical software package installation",
        description: "Requesting installation of SPSS on faculty laptop for biological data analysis.",
        requestedPriority: "MEDIUM" as const,
        itPriority: "MEDIUM" as const,
        currentStatus: "OPEN" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-07T09:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0014",
        requesterId: somchai.id,
        ownerId: witchai.id,
        categoryId: hardwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Display flickering reappeared after sleep mode",
        description: "Laptop screen started flickering again when resuming from sleep mode.",
        requestedPriority: "HIGH" as const,
        itPriority: "URGENT" as const,
        currentStatus: "REOPENED" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-07T10:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0015",
        requesterId: somchai.id,
        ownerId: null,
        categoryId: softwareCat.id,
        relatedSystemId: emailSys.id,
        summary: "Duplicate ticket for email sync issue",
        description: "Created in error, duplicate of previous request.",
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "CANCELLED" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-07T11:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0016",
        requesterId: suda.id,
        ownerId: kamon.id,
        categoryId: networkCat.id,
        relatedSystemId: vpnSys.id,
        summary: "Faculty VPN disconnection during off-campus grading",
        description: "VPN session drops every 5 minutes during remote grade portal access.",
        requestedPriority: "HIGH" as const,
        itPriority: "URGENT" as const,
        currentStatus: "IN_PROGRESS" as const,
        isRequesterResolved: false,
        createdAt: new Date("2026-09-07T13:00:00.000Z"),
      },
    ];

    for (const t of realisticTickets) {
      const ticket = await prisma.ticket.upsert({
        where: { ticketNumber: t.ticketNumber },
        update: {
          requesterId: t.requesterId,
          ownerId: t.ownerId,
          categoryId: t.categoryId,
          relatedSystemId: t.relatedSystemId,
          summary: t.summary,
          description: t.description,
          requestedPriority: t.requestedPriority,
          itPriority: t.itPriority,
          currentStatus: t.currentStatus,
          isRequesterResolved: t.isRequesterResolved,
        },
        create: t,
      });

      // Seed sample attachments for first 2 tickets if not already present
      if (t.ticketNumber === "TICK-20260906-0001") {
        const att1Name = `battery_diagnostic_${ticket.id}.png`;
        const existingAtt1 = await prisma.attachment.findUnique({ where: { storedFilename: att1Name } });
        if (!existingAtt1) {
          await prisma.attachment.create({
            data: {
              ticketId: ticket.id,
              storedFilename: att1Name,
              originalFilename: "battery_diagnostic.png",
              mimeType: "image/png",
              sizeBytes: 245000,
              isRemoved: false,
            },
          });
        }

        const att2Name = `power_report_${ticket.id}.pdf`;
        const existingAtt2 = await prisma.attachment.findUnique({ where: { storedFilename: att2Name } });
        if (!existingAtt2) {
          await prisma.attachment.create({
            data: {
              ticketId: ticket.id,
              storedFilename: att2Name,
              originalFilename: "power_report.pdf",
              mimeType: "application/pdf",
              sizeBytes: 154000,
              isRemoved: false,
            },
          });
        }

        // Seed sample Public Comment and Internal Note
        const existingComments = await prisma.publicComment.findMany({ where: { ticketId: ticket.id } });
        if (existingComments.length === 0) {
          await prisma.publicComment.create({
            data: {
              ticketId: ticket.id,
              authorId: witchai.id,
              content: "Diagnostic received. Replacement battery has been requested from vendor.",
            },
          });
        }

        const existingNotes = await prisma.internalNote.findMany({ where: { ticketId: ticket.id } });
        if (existingNotes.length === 0) {
          await prisma.internalNote.create({
            data: {
              ticketId: ticket.id,
              authorId: witchai.id,
              content: "Battery part number SKU-BAT-882 ordered under hardware warranty.",
            },
          });
        }
      } else if (t.ticketNumber === "TICK-20260906-0002") {
        const attName = `wifi_signal_log_${ticket.id}.png`;
        const existingAtt = await prisma.attachment.findUnique({ where: { storedFilename: attName } });
        if (!existingAtt) {
          await prisma.attachment.create({
            data: {
              ticketId: ticket.id,
              storedFilename: attName,
              originalFilename: "wifi_signal_log.png",
              mimeType: "image/png",
              sizeBytes: 180000,
              isRemoved: false,
            },
          });
        }
      }
    }

    // 5. Seed Actions Taken (idempotent upsert via ticketId_clientRequestId)
    const t1 = await prisma.ticket.findUnique({ where: { ticketNumber: "TICK-20260906-0001" } });
    if (t1) {
      await prisma.actionTaken.upsert({
        where: { ticketId_clientRequestId: { ticketId: t1.id, clientRequestId: "seed-act-0001-1" } },
        update: {
          description: "Diagnosed hardware malfunction and replaced faulty battery",
          result: "Verified battery holds charge and charges normally",
          status: "COMPLETED",
        },
        create: {
          ticketId: t1.id,
          performedById: witchai.id,
          assigneeId: witchai.id,
          status: "COMPLETED",
          actionDateTime: new Date("2026-09-06T09:30:00.000Z"),
          completedAt: new Date("2026-09-06T10:00:00.000Z"),
          description: "Diagnosed hardware malfunction and replaced faulty battery",
          result: "Verified battery holds charge and charges normally",
          followUpRequired: true,
          followUpNote: "Check battery health cycle in one week",
          attachmentNotes: "Battery diagnostic screenshot attached",
          version: 1,
          clientRequestId: "seed-act-0001-1",
        },
      });

      await prisma.actionTaken.upsert({
        where: { ticketId_clientRequestId: { ticketId: t1.id, clientRequestId: "seed-act-0001-2" } },
        update: {
          description: "Schedule system stress test under battery load",
          result: "Awaiting user laptop availability for 2-hour cycle test",
          status: "PLANNED",
        },
        create: {
          ticketId: t1.id,
          performedById: kamon.id,
          assigneeId: witchai.id,
          status: "PLANNED",
          actionDateTime: new Date("2026-09-06T11:00:00.000Z"),
          completedAt: null,
          description: "Schedule system stress test under battery load",
          result: "Awaiting user laptop availability for 2-hour cycle test",
          followUpRequired: false,
          attachmentNotes: null,
          version: 0,
          clientRequestId: "seed-act-0001-2",
        },
      });

      await prisma.actionTaken.upsert({
        where: { ticketId_clientRequestId: { ticketId: t1.id, clientRequestId: "seed-act-0001-3" } },
        update: {
          description: "Attempt software firmware recalibration",
          result: "Cancelled because hardware cell damage was detected directly",
          status: "CANCELLED",
        },
        create: {
          ticketId: t1.id,
          performedById: witchai.id,
          assigneeId: null,
          status: "CANCELLED",
          actionDateTime: new Date("2026-09-06T09:00:00.000Z"),
          completedAt: null,
          description: "Attempt software firmware recalibration",
          result: "Cancelled because hardware cell damage was detected directly",
          followUpRequired: false,
          attachmentNotes: null,
          version: 1,
          clientRequestId: "seed-act-0001-3",
        },
      });
    }

    const t2 = await prisma.ticket.findUnique({ where: { ticketNumber: "TICK-20260906-0002" } });
    if (t2) {
      await prisma.actionTaken.upsert({
        where: { ticketId_clientRequestId: { ticketId: t2.id, clientRequestId: "seed-act-0002-1" } },
        update: {
          description: "Inspect AP-CB2-301 access point channel interference",
          result: "Radio logs collected, investigating channel congestion",
          status: "PLANNED",
        },
        create: {
          ticketId: t2.id,
          performedById: kamon.id,
          assigneeId: kamon.id,
          status: "PLANNED",
          actionDateTime: new Date("2026-09-06T10:30:00.000Z"),
          completedAt: null,
          description: "Inspect AP-CB2-301 access point channel interference",
          result: "Radio logs collected, investigating channel congestion",
          followUpRequired: true,
          followUpNote: "Coordinate with network admin to adjust transmit power",
          attachmentNotes: null,
          version: 0,
          clientRequestId: "seed-act-0002-1",
        },
      });
    }

    const t4 = await prisma.ticket.findUnique({ where: { ticketNumber: "TICK-20260906-0004" } });
    if (t4) {
      await prisma.actionTaken.upsert({
        where: { ticketId_clientRequestId: { ticketId: t4.id, clientRequestId: "seed-act-0004-1" } },
        update: {
          description: "Installed Docker Desktop client v4.30",
          result: "Docker service installed, awaiting requester confirmation",
          status: "COMPLETED",
        },
        create: {
          ticketId: t4.id,
          performedById: witchai.id,
          assigneeId: witchai.id,
          status: "COMPLETED",
          actionDateTime: new Date("2026-09-06T11:45:00.000Z"),
          completedAt: new Date("2026-09-06T12:00:00.000Z"),
          description: "Installed Docker Desktop client v4.30",
          result: "Docker service installed, awaiting requester confirmation",
          followUpRequired: false,
          attachmentNotes: null,
          version: 0,
          clientRequestId: "seed-act-0004-1",
        },
      });
    }

    const t5 = await prisma.ticket.findUnique({ where: { ticketNumber: "TICK-20260906-0005" } });
    if (t5) {
      await prisma.actionTaken.upsert({
        where: { ticketId_clientRequestId: { ticketId: t5.id, clientRequestId: "seed-act-0005-1" } },
        update: {
          description: "Cleared paper obstruction in roller pickup mechanism",
          result: "Printer test page printed successfully",
          status: "COMPLETED",
        },
        create: {
          ticketId: t5.id,
          performedById: witchai.id,
          assigneeId: witchai.id,
          status: "COMPLETED",
          actionDateTime: new Date("2026-09-06T13:50:00.000Z"),
          completedAt: new Date("2026-09-06T14:00:00.000Z"),
          description: "Cleared paper obstruction in roller pickup mechanism",
          result: "Printer test page printed successfully",
          followUpRequired: false,
          attachmentNotes: null,
          version: 0,
          clientRequestId: "seed-act-0005-1",
        },
      });
    }
  }

  console.log("Database seeded successfully.");
}

async function main() {
  await seed();
}

// Only execute immediately if run directly
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}

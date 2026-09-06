import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();
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

  const requesters = [
    {
      name: "Somchai Jaidee",
      email: "somchai.jai@kmutt.ac.th",
      department: "Engineering",
      isActive: true,
    },
    {
      name: "Suda Rakdee",
      email: "suda.rak@kmutt.ac.th",
      department: "Science",
      isActive: true,
    },
    {
      name: "John Doe",
      email: "john.doe@kmutt.ac.th",
      department: "Information Technology",
      isActive: true,
    },
    {
      name: "Jane Smith",
      email: "jane.smith@kmutt.ac.th",
      department: "Digital Arts",
      isActive: true,
    },
    {
      name: "Anon Olduser",
      email: "anon.old@kmutt.ac.th",
      department: "Former Staff",
      isActive: false,
    },
  ];

  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: {
        name: req.name,
        department: req.department,
        isActive: req.isActive,
      },
      create: req,
    });
  }

  console.log(`Successfully seeded ${categories.length} categories, ${relatedSystems.length} related systems, and ${requesters.length} requesters.`);

  // Seed realistic tickets for Somchai Jaidee (Requester A, id 1) for realistic My Tickets demo
  const somchai = await prisma.requesterUser.findUnique({ where: { email: "somchai.jai@kmutt.ac.th" } });
  const hardwareCat = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });
  const softwareCat = await prisma.category.findUnique({ where: { name: "Software" } });
  const accessCat = await prisma.category.findUnique({ where: { name: "Account and Access" } });
  const laptopSys = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });
  const wifiSys = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });
  const vpnSys = await prisma.relatedSystem.findUnique({ where: { name: "VPN" } });
  const emailSys = await prisma.relatedSystem.findUnique({ where: { name: "Email" } });
  const printerSys = await prisma.relatedSystem.findUnique({ where: { name: "Printer" } });

  if (somchai && hardwareCat && networkCat && softwareCat && accessCat && laptopSys && wifiSys && vpnSys && emailSys && printerSys) {
    // Delete any old tickets for clean realistic state
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});

    const realisticTickets = [
      {
        ticketNumber: "TICK-20260906-0001",
        requesterId: somchai.id,
        categoryId: hardwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Laptop battery drains in less than 30 minutes",
        description: "After the recent operating system update, the corporate laptop shuts down unexpectedly when unplugged.",
        requestedPriority: "HIGH" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T08:30:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0002",
        requesterId: somchai.id,
        categoryId: networkCat.id,
        relatedSystemId: wifiSys.id,
        summary: "Wi-Fi connection drops intermittently on 3rd floor",
        description: "Experiencing frequent Wi-Fi disconnects while working in the Engineering building room 302.",
        requestedPriority: "MEDIUM" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T09:15:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0003",
        requesterId: somchai.id,
        categoryId: networkCat.id,
        relatedSystemId: vpnSys.id,
        summary: "Cannot connect to campus VPN from home network",
        description: "Authentication succeeds but the VPN client fails at establishing the tunnel with timeout error.",
        requestedPriority: "HIGH" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T10:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0004",
        requesterId: somchai.id,
        categoryId: accessCat.id,
        relatedSystemId: emailSys.id,
        summary: "Password reset request for university webmail",
        description: "Unable to log in to university email after changing password yesterday. Need an account reset.",
        requestedPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T11:20:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0005",
        requesterId: somchai.id,
        categoryId: hardwareCat.id,
        relatedSystemId: printerSys.id,
        summary: "Engineering lab printer paper jam in tray 2",
        description: "Central printer in CB2 building floor 4 is showing error 13.20 paper jam error.",
        requestedPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T13:45:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0006",
        requesterId: somchai.id,
        categoryId: softwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Software license expired for CAD modeling tool",
        description: "The workstation AutoCAD license shows expired as of this morning. Need license server renewal.",
        requestedPriority: "MEDIUM" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T14:10:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0007",
        requesterId: somchai.id,
        categoryId: networkCat.id,
        relatedSystemId: wifiSys.id,
        summary: "Slow network throughput during video conferencing",
        description: "Video calls over Wi-Fi suffer severe packet loss and audio stuttering during peak lecture hours.",
        requestedPriority: "MEDIUM" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T15:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0008",
        requesterId: somchai.id,
        categoryId: hardwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "External monitor HDMI port not detected",
        description: "Connecting secondary display to laptop HDMI port results in no signal detected message.",
        requestedPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T15:30:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0009",
        requesterId: somchai.id,
        categoryId: accessCat.id,
        relatedSystemId: emailSys.id,
        summary: "Requesting departmental mailing list access",
        description: "Need to be added to the cpe-faculty announcement mailing list as a new semester coordinator.",
        requestedPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T16:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0010",
        requesterId: somchai.id,
        categoryId: softwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Matlab license configuration error on startup",
        description: "Matlab fails to launch with error -96: Connection to license server failed.",
        requestedPriority: "MEDIUM" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T16:30:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0011",
        requesterId: somchai.id,
        categoryId: hardwareCat.id,
        relatedSystemId: laptopSys.id,
        summary: "Laptop keyboard spacebar key is sticking",
        description: "Physical spacebar key frequently registers duplicate spaces or does not register press.",
        requestedPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T17:00:00.000Z"),
      },
      {
        ticketNumber: "TICK-20260906-0012",
        requesterId: somchai.id,
        categoryId: networkCat.id,
        relatedSystemId: vpnSys.id,
        summary: "VPN certificate expired on university laptop",
        description: "Security alert indicates client certificate has expired and VPN connection is refused.",
        requestedPriority: "HIGH" as const,
        currentStatus: "NEW" as const,
        createdAt: new Date("2026-09-06T17:45:00.000Z"),
      },
    ];

    for (const t of realisticTickets) {
      const created = await prisma.ticket.create({ data: t });
      // Add active attachment to first 2 tickets
      if (t.ticketNumber === "TICK-20260906-0001") {
        await prisma.attachment.create({
          data: {
            ticketId: created.id,
            storedFilename: `battery_diagnostic_${created.id}.png`,
            originalFilename: "battery_diagnostic.png",
            mimeType: "image/png",
            sizeBytes: 245000,
            isRemoved: false,
          },
        });
        await prisma.attachment.create({
          data: {
            ticketId: created.id,
            storedFilename: `power_report_${created.id}.pdf`,
            originalFilename: "power_report.pdf",
            mimeType: "application/pdf",
            sizeBytes: 154000,
            isRemoved: false,
          },
        });
      } else if (t.ticketNumber === "TICK-20260906-0002") {
        await prisma.attachment.create({
          data: {
            ticketId: created.id,
            storedFilename: `wifi_signal_log_${created.id}.png`,
            originalFilename: "wifi_signal_log.png",
            mimeType: "image/png",
            sizeBytes: 180000,
            isRemoved: false,
          },
        });
      }
    }
    console.log(`Seeded ${realisticTickets.length} realistic tickets for Somchai Jaidee with pagination.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

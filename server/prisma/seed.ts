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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

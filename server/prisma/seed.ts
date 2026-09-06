import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// The four names are: Account and Access, Hardware, Software, Network.
// Requirement: running the seed twice must NOT create duplicates.
// Hint: prisma.category.upsert({ where:{name}, update:{}, create:{name} }).
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
      update: {},
      create: { name },
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

  console.log(`Successfully seeded ${categories.length} categories and ${requesters.length} requesters.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

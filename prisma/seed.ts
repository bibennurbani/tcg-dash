// prisma/seed.ts
import { PrismaClient, Status } from '@prisma/client';
import { customers, invoices, users, revenue } from '../app/lib/placeholder-data';

const prisma = new PrismaClient();

async function main() {
  // Seed users
  await prisma.user.createMany({
    data: users,
  });

  // Seed customers
  await prisma.customer.createMany({
    data: customers,
  });

  // Map invoice data to match Prisma schema, including status transformation
  const formattedInvoices = invoices.map((invoice) => ({
    customerId: invoice.customer_id,
    amount: invoice.amount,
    status: invoice.status as Status, // Map status to the enum value
    date: new Date(invoice.date),
  }));

  // Seed invoices
  await prisma.invoice.createMany({
    data: formattedInvoices,
  });

  // Seed revenue
  await prisma.revenue.createMany({
    data: revenue,
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, Status } from '@prisma/client';
import { formatCurrency } from './utils';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoice,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';

const prisma = new PrismaClient();

// Fetch Revenue
export async function fetchRevenue(): Promise<Revenue[]> {
  try {
    const data = await prisma.revenue.findMany();
    return data as Revenue[];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

// Fetch Latest Invoices
export async function fetchLatestInvoices(): Promise<LatestInvoice[]> {
  try {
    const data = await prisma.invoice.findMany({
      select: {
        amount: true,
        id: true,
        customer: {
          select: {
            name: true,
            image_url: true,
            email: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 5,
    });
    console.log('🚀 ~ fetchLatestInvoices ~ data:', data);

    const latestInvoices: LatestInvoice[] = data.map((invoice) => ({
      id: invoice.id,
      name: invoice.customer.name,
      image_url: invoice.customer.image_url,
      email: invoice.customer.email,
      amount: formatCurrency(invoice.amount),
    }));

    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

// Fetch Card Data
export async function fetchCardData(): Promise<any> {
  try {
    const [invoiceCount, customerCount, invoiceStatus] = await prisma.$transaction([
      prisma.invoice.count(),
      prisma.customer.count(),
      prisma.invoice.groupBy({
        by: ['status'],
        _sum: { amount: true },
        orderBy: { status: 'asc' },
      }),
    ]);

    const totalPaidInvoices = formatCurrency(
      invoiceStatus?.find((item) => item.status === 'paid')?._sum?.amount ?? 0
    );
    const totalPendingInvoices = formatCurrency(
      invoiceStatus?.find((item) => item.status === 'pending')?._sum?.amount ?? 0
    );

    return {
      numberOfCustomers: customerCount,
      numberOfInvoices: invoiceCount,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;

// Fetch Filtered Invoices
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
): Promise<InvoicesTable[]> {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await prisma.$queryRaw<InvoicesTable[]>`
      SELECT
        "Invoice"."id",
        "Invoice"."amount",
        "Invoice"."date",
        "Invoice"."status",
        "Customer"."name",
        "Customer"."email",
        "Customer"."image_url"
      FROM "Invoice"
      JOIN "Customer" ON "Invoice"."customerId" = "Customer".id
      WHERE
        "Customer"."name" ILIKE ${`%${query}%`} OR
        "Customer"."email" ILIKE ${`%${query}%`} OR
        "Invoice"."amount"::text ILIKE ${`${query}%`} OR
        "Invoice"."date"::text ILIKE ${`%${query}%`} OR
        "Invoice"."status"::text ILIKE ${`%${query}%`}
      ORDER BY "Invoice"."date" DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    console.log('🚀 ~ invoices:', invoices);

    // Ensure invoices are returned
    if (!invoices) {
      console.log('No invoices found for the given query');
      return [];
    }

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

// Fetch Invoices Pages
export async function fetchInvoicesPages(query: string) {
  try {
    const count = await prisma.invoice.count({
      where: {
        OR: [
          { customer: { name: { contains: query, mode: 'insensitive' } } },
          { customer: { email: { contains: query, mode: 'insensitive' } } },
          { amount: { equals: parseFloat(query) || undefined } },
          { date: { contains: query } },
          { status: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

// Fetch Invoice By ID
export async function fetchInvoiceById(id: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        customer_id: true,
        amount: true,
        status: true,
      },
    });

    if (invoice) {
      invoice.amount = invoice.amount / 100; // Convert from cents to dollars
    }

    return invoice;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

// Fetch Customers
export async function fetchCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return customers;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch all customers.');
  }
}

// Fetch Filtered Customers
export async function fetchFilteredCustomers(query: string) {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        invoices: true,
      },
      orderBy: { name: 'asc' },
    });

    return customers.map((customer) => ({
      ...customer,
      total_invoices: customer.invoices.length,
      total_pending: formatCurrency(
        customer.invoices.reduce(
          (acc, invoice) => acc + (invoice.status === 'pending' ? invoice.amount : 0),
          0
        )
      ),
      total_paid: formatCurrency(
        customer.invoices.reduce(
          (acc, invoice) => acc + (invoice.status === 'paid' ? invoice.amount : 0),
          0
        )
      ),
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch customer table.');
  }
}

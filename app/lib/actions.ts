'use server';

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const prisma = new PrismaClient();
export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;
  const date = new Date();
  try {
    await prisma.invoice.create({
      data: {
        amount: amountInCents,
        date: date,
        status: status,
        customerId: customerId,
      },
    });
  } catch (error) {
    console.log(`Error creating invoice : ${error}`);
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  try {
    await prisma.invoice.update({
      data: {
        amount: amountInCents,
        status: status,
        customerId: customerId,
      },
      where: { id: id },
    });
  } catch (error) {
    console.log(`Error updating invoice with id ${id}: ${error}`);
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');
  try {
    throw new Error('Failed to Delete Invoice');
    await prisma.invoice.delete({
      where: {
        id: id,
      },
    });
  } catch (error) {
    console.log(`Error deleting invoice with id ${id}: ${error}`);
  }
  revalidatePath('/dashboard/invoices');
}

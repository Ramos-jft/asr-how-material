"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

type CustomerRegistrationField =
  | "name"
  | "csaName"
  | "charge"
  | "phone"
  | "email"
  | "groupCode"
  | "zipCode"
  | "state"
  | "city"
  | "district"
  | "street"
  | "number"
  | "complement"
  | "reference";

export type CustomerRegistrationState = {
  success?: string;
  error?: string;
  fieldErrors?: Partial<Record<CustomerRegistrationField, string[]>>;
};

const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const customerRegistrationSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo."),
  csaName: z.string().trim().min(2, "Informe o nome do CSA."),
  charge: z.string().trim().min(2, "Informe o encargo."),
  phone: z
    .string()
    .trim()
    .min(10, "Informe um WhatsApp válido.")
    .max(20, "WhatsApp muito longo."),
  email: z
    .email("Informe um e-mail válido.")
    .trim()
    .transform((value) => value.toLowerCase()),
  groupCode: z
    .string()
    .trim()
    .min(2, "Informe o grupo, unidade ou identificador interno."),
  zipCode: z.string().trim().min(8, "Informe o CEP."),
  state: z
    .string()
    .trim()
    .min(2, "Informe o estado.")
    .max(2, "Use a sigla do estado com 2 letras.")
    .transform((value) => value.toUpperCase()),
  city: z.string().trim().min(2, "Informe a cidade."),
  district: z.string().trim().min(2, "Informe o bairro."),
  street: z.string().trim().min(2, "Informe o endereço."),
  number: z.string().trim().min(1, "Informe o número."),
  complement: optionalTextSchema,
  reference: optionalTextSchema,
});

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function registerCustomerAction(
  _previousState: CustomerRegistrationState,
  formData: FormData,
): Promise<CustomerRegistrationState> {
  const parsed = customerRegistrationSchema.safeParse({
    name: getString(formData, "name"),
    csaName: getString(formData, "csaName"),
    charge: getString(formData, "charge"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    groupCode: getString(formData, "groupCode"),
    zipCode: getString(formData, "zipCode"),
    state: getString(formData, "state"),
    city: getString(formData, "city"),
    district: getString(formData, "district"),
    street: getString(formData, "street"),
    number: getString(formData, "number"),
    complement: getString(formData, "complement"),
    reference: getString(formData, "reference"),
  });

  if (!parsed.success) {
    const flattenedError = z.flattenError(parsed.error);

    return {
      error: "Revise os campos destacados.",
      fieldErrors:
        flattenedError.fieldErrors as CustomerRegistrationState["fieldErrors"],
    };
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: {
      email: parsed.data.email,
    },
    select: {
      id: true,
    },
  });

  if (existingCustomer) {
    return {
      error: "Já existe um cadastro de cliente com este e-mail.",
      fieldErrors: {
        email: ["Este e-mail já está cadastrado."],
      },
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      error: "Este e-mail já está em uso por um usuário do sistema.",
      fieldErrors: {
        email: ["Use outro e-mail para o cadastro de cliente."],
      },
    };
  }

  await prisma.customer.create({
    data: {
      name: parsed.data.name,
      csaName: parsed.data.csaName,
      charge: parsed.data.charge,
      phone: parsed.data.phone,
      email: parsed.data.email,
      groupCode: parsed.data.groupCode,
      status: "PENDING",
      temporaryPurchaseRemaining: 0,
      address: {
        create: {
          zipCode: parsed.data.zipCode,
          state: parsed.data.state,
          city: parsed.data.city,
          district: parsed.data.district,
          street: parsed.data.street,
          number: parsed.data.number,
          complement: parsed.data.complement,
          reference: parsed.data.reference,
        },
      },
    },
  });

  return {
    success:
      "Cadastro enviado com sucesso. Aguarde a aprovação manual da administração.",
  };
}

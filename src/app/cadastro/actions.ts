"use server";

import { CustomerStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type CadastroFormState = {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function trimStringValue(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

const cadastroSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo."),
  csaName: z.string().trim().optional(),
  charge: z.string().trim().optional(),
  phone: z.string().trim().min(10, "Informe um telefone válido."),
  email: z.preprocess(trimStringValue, z.email("Informe um e-mail válido.")),
  groupCode: z
    .string()
    .trim()
    .min(1, "Informe o grupo, unidade ou identificador."),

  zipCode: z.string().trim().min(8, "Informe o CEP."),
  state: z
    .string()
    .trim()
    .min(2, "Informe a UF.")
    .max(2, "Use apenas a sigla da UF.")
    .transform((value) => value.toUpperCase()),
  city: z.string().trim().min(2, "Informe a cidade."),
  district: z.string().trim().min(2, "Informe o bairro."),
  street: z.string().trim().min(2, "Informe o endereço."),
  number: z.string().trim().min(1, "Informe o número."),
  complement: z.string().trim().optional(),
  reference: z.string().trim().optional(),
});

type CadastroInput = z.infer<typeof cadastroSchema>;

function getString(formData: FormData, field: keyof CadastroInput): string {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}

function onlyDigits(value: string): string {
  return value.replaceAll(/\D/g, "");
}

function normalizeOptional(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized || null;
}

function getFieldErrors(
  error: z.ZodError<CadastroInput>,
): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const field = issue.path[0];

    if (typeof field === "string" && !acc[field]) {
      acc[field] = issue.message;
    }

    return acc;
  }, {});
}

export async function createCustomerRegistrationAction(
  _previousState: CadastroFormState,
  formData: FormData,
): Promise<CadastroFormState> {
  const parsed = cadastroSchema.safeParse({
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
    return {
      success: false,
      message: "Revise os campos destacados.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  try {
    await prisma.customer.create({
      data: {
        name: data.name,
        csaName: normalizeOptional(data.csaName),
        charge: normalizeOptional(data.charge),
        phone: onlyDigits(data.phone),
        email: data.email.toLowerCase(),
        groupCode: data.groupCode,
        status: CustomerStatus.PENDING,
        temporaryPurchaseRemaining: 0,
        address: {
          create: {
            zipCode: onlyDigits(data.zipCode),
            state: data.state,
            city: data.city,
            district: data.district,
            street: data.street,
            number: data.number,
            complement: normalizeOptional(data.complement),
            reference: normalizeOptional(data.reference),
          },
        },
      },
    });

    return {
      success: true,
      message:
        "Cadastro enviado com sucesso. Aguarde a aprovação do administrador para comprar.",
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Já existe um cadastro com este e-mail.",
        fieldErrors: {
          email: "Este e-mail já está cadastrado.",
        },
      };
    }

    console.error("Erro ao criar cadastro de cliente:", error);

    return {
      success: false,
      message: "Não foi possível enviar o cadastro. Tente novamente.",
    };
  }
}

import "server-only";

import { StoreWindowStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ActiveStoreWindow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  message: string | null;
};

export async function getActiveStoreWindow(
  now = new Date(),
): Promise<ActiveStoreWindow | null> {
  return prisma.storeWindow.findFirst({
    where: {
      status: StoreWindowStatus.OPEN,
      startsAt: {
        lte: now,
      },
      endsAt: {
        gte: now,
      },
    },
    orderBy: {
      startsAt: "desc",
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      message: true,
    },
  });
}

export async function isStoreOpen(now = new Date()): Promise<boolean> {
  const activeWindow = await getActiveStoreWindow(now);

  return activeWindow !== null;
}

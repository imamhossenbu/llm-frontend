import { prisma } from "@/lib/prisma";

export async function getUserMemories(userId: string) {
  return prisma.memory.findMany({
    where: {
      userId,
    },
  });
}

export async function saveMemory(userId: string, key: string, value: string) {
  return prisma.memory.create({
    data: {
      userId,
      key,
      value,
    },
  });
}

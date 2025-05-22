import prisma from "@/src/lib/prisma";
import { classifyComment } from "./src/lib/ai.utils";
import { subDays, subMinutes } from "date-fns";

const main = async () => {
  // Delete notifications older than 10 minutes
  const cutoffDate = subMinutes(new Date(), 10);

  const deleted = await prisma.notification.deleteMany({
    where: {
      createdAt: {
        gt: cutoffDate,
      },
    },
  });

  console.log(`${deleted.count} old notifications deleted.`);
};

main();

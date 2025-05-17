import prisma from "@/src/lib/prisma";
import { classifyComment } from "./src/lib/ai.utils";
import { subDays } from "date-fns";

const main = async () => {
  const cutoffDate = subDays(new Date(), 14);

  const deleted = await prisma.notification.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`${deleted.count} old notifications deleted.`);
};

main();

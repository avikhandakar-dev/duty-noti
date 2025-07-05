import prisma from "@/src/lib/prisma";
import { subDays, subMinutes } from "date-fns";

const main = async () => {
  const today = new Date();
  const threeDaysAgo = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 3
  );
  console.log(threeDaysAgo);
  const plans = await prisma.activePlan.findMany({
    where: {
      plan: {
        isTrial: false,
      },
      expiresOn: {
        gte: threeDaysAgo,
        lte: today,
      },
      alertCount: 0,
    },
    select: {
      userId: true,
      id: true,
    },
  });
  const userIds = plans.map((plan) => plan.userId);
  console.log(userIds);
};

main();

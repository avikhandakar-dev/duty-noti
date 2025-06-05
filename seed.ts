import prisma from "@/src/lib/prisma";
import { classifyComment } from "./src/lib/ai.utils";
import { subDays, subMinutes } from "date-fns";

const main = async () => {
  const notFreeUsers = await prisma.activePlan.findMany({
    where: {
      expiresOn: { gt: new Date() },
    },
    select: {
      user: {
        select: {
          clerkId: true,
        },
      },
    },
  });
  console.log(notFreeUsers.length);
  const userIds = notFreeUsers.map((user) => user.user.clerkId);
  const pushTokens = await prisma.pushNotificationToken.findMany({
    where: {
      userId: {
        notIn: userIds,
      },
    },
  });
  const freeIds = pushTokens.map((token) => token.userId);
  const uniqueIds = [...new Set([...freeIds])];
  console.log(uniqueIds.length, "uniqueIds");

  const trialUsers = await prisma.activePlan.findMany({
    where: {
      expiresOn: { gt: new Date() },
      plan: {
        isTrial: true,
      },
      // user: {
      //   notificationPreference: {
      //     enableShortNotifications: true,
      //   },
      // },
    },
    select: {
      user: {
        select: {
          clerkId: true,
        },
      },
    },
  });
  console.log(trialUsers.length, "trialUsers");
};

main();

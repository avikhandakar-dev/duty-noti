import prisma from "@/src/lib/prisma";

const main = async () => {
  const nowPlus7Days = new Date();
  nowPlus7Days.setDate(nowPlus7Days.getDate() - 7);

  const notFreeUsers = await prisma.activePlan.findMany({
    where: {
      expiresOn: { gt: nowPlus7Days },
    },
    select: {
      user: {
        select: {
          clerkId: true,
        },
      },
    },
  });
  console.log("notFreeUsers", notFreeUsers.length);

  const userIds = notFreeUsers.map((user) => user.user.clerkId);
  const pushTokens = await prisma.pushNotificationToken.findMany({
    where: {
      userId: {
        notIn: userIds,
      },
      // user: {
      //   notificationPreference: {
      //     enableShortNotifications: true,
      //   },
      // },
    },
  });
  console.log("pushTokens", pushTokens.length);
};

main();

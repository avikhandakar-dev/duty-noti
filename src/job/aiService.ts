import axios from "axios";
import prisma from "../lib/prisma";

const addToAIQueue = (operationType: string) => {
  switch (operationType) {
    case "SEND-PUSH-NOTIFICATION":
      return sendPushNoti;
    case "SEND-PUSH-NOTIFICATION-ANALYSIS":
      return sendPushNotiAnalysis;
    case "SEND-PUSH-NOTIFICATION-TO-TRIAL-USER":
      return sendPushNotiToTrialUser;
    case "SEND-PUSH-NOTIFICATION-TO-FREE-USER":
      return sendPushNotiToFreeUser;
    case "SEND-PUSH-NOTIFICATION-COMMENT":
      return sendPushNotiComment;
    case "SEND-PUSH-NOTIFICATION-REACTION":
      return sendPushNotiReaction;
    default:
      throw new Error("Invalid operation type");
  }
};

async function sendPushNotiComment(data: any) {
  try {
    const { userId, analysisId, parentId, logo } = data;
    const author = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });
    const targetComment = await prisma.analysisComment.findUnique({
      where: {
        id: parentId,
      },
    });
    const targetUser = await prisma.user.findUnique({
      where: {
        clerkId: targetComment?.userId,
      },
      include: {
        pushTokens: true,
      },
    });
    if (!targetUser) {
      return;
    }
    if (targetUser.id == author?.id) {
      console.log("Same user");
      return;
    }
    const pushTokens = targetUser?.pushTokens || [];
    const tokens: string[] = pushTokens.map((token) => token.token);

    const title = `${author?.firstName} commented on your post`;
    const body = `${targetComment?.text}`;

    await prisma.notification.create({
      data: {
        userId: targetUser.clerkId,
        companyName: title,
        message: body,
        logo: logo || "",
        type: "analysis",
        entityId: analysisId,
      },
    });
    await sendPushNotificationsInBatches(title, body, tokens);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

async function sendPushNotiReaction(data: any) {
  try {
    const { userId, commentId, reaction, logo } = data;
    const author = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });
    const targetComment = await prisma.analysisComment.findUnique({
      where: {
        id: commentId,
      },
    });
    const targetUser = await prisma.user.findUnique({
      where: {
        clerkId: targetComment?.userId,
      },
      include: {
        pushTokens: true,
      },
    });
    if (!targetUser) {
      return;
    }
    if (targetUser.id == author?.id) {
      console.log("Same user");
      return;
    }
    const pushTokens = targetUser?.pushTokens || [];
    const tokens: string[] = pushTokens.map((token) => token.token);

    const title = `${author?.firstName} ${author?.lastName} আপনার মন্তব্যটি পছন্দ করেছেন`;
    const body = `আপনার মন্তব্যটি প্রশংসিত হয়েছে! 🌟 আরও দারুণ মন্তব্য করুন এবং বিনিয়োগকারীদের সঙ্গে সংযোগ গড়ে তুলুন।`;

    await prisma.notification.create({
      data: {
        userId: targetUser.clerkId,
        companyName: title,
        message: body,
        logo: logo || "",
        type: "analysis",
        entityId: targetComment?.analysisId,
      },
    });
    await sendPushNotificationsInBatches(title, body, tokens);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function sendPushNotificationsInBatches(
  title: string,
  body: string,
  tokens: string[]
) {
  const endpoint = "https://exp.host/--/api/v2/push/send";
  const batchSize = 100;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);

    try {
      const response = await axios.post(endpoint, {
        to: batch,
        title: title,
        body: body,
        sound: "default",
        priority: "high",
      });
      console.log(
        `Batch ${i / batchSize + 1} sent successfully:`,
        response.data
      );
    } catch (error: any) {
      console.error(
        `Error sending batch ${i / batchSize + 1}:`,
        JSON.stringify(error.response.data)
      );
    }

    // Wait for 1 second before sending the next batch
    if (i + batchSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.log("All notifications sent!");
}

async function sendPushNoti(data: any) {
  try {
    const { title, body } = data;
    const pushTokens = await prisma.pushNotificationToken.findMany({
      // where: {
      //   user: {
      //     notificationPreference: {
      //       enableShortNotifications: true,
      //     },
      //   },
      // },
    });
    const ids: string[] = [];
    const tokens: string[] = [];
    const prismaTransaction: any = [];

    for (let token of pushTokens) {
      const userId = token.userId;

      if (!ids.includes(userId)) {
        prismaTransaction.push({
          userId: userId,
          companyName: title,
          message: body,
          logo: "",
          type: "push",
        });
        ids.push(userId);
      }
      tokens.push(token.token);
    }
    await prisma.notification.createMany({
      data: prismaTransaction,
      skipDuplicates: true,
    });
    await sendPushNotificationsInBatches(title, body, tokens);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

async function sendPushNotiToTrialUser(data: any) {
  try {
    const { title, body } = data;
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
    const userIds = trialUsers.map((user) => user.user.clerkId);
    const pushTokens = await prisma.pushNotificationToken.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });
    const ids: string[] = [];
    const tokens: string[] = [];
    const prismaTransaction: any = [];

    for (let token of pushTokens) {
      const userId = token.userId;

      if (!ids.includes(userId)) {
        prismaTransaction.push({
          userId: userId,
          companyName: title,
          message: body,
          logo: "",
          type: "push",
        });
        ids.push(userId);
      }
      tokens.push(token.token);
    }
    // await prisma.notification.createMany({
    //   data: prismaTransaction,
    //   skipDuplicates: true,
    // });
    await sendPushNotificationsInBatches(title, body, tokens);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

async function sendPushNotiToFreeUser(data: any) {
  try {
    const { title, body } = data;
    const notFreeUsers = await prisma.activePlan.findMany({
      where: {
        expiresOn: { lt: new Date() },
      },
      select: {
        user: {
          select: {
            clerkId: true,
          },
        },
      },
    });
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
    const ids: string[] = [];
    const tokens: string[] = [];
    const prismaTransaction: any = [];

    for (let token of pushTokens) {
      const userId = token.userId;

      if (!ids.includes(userId)) {
        prismaTransaction.push({
          userId: userId,
          companyName: title,
          message: body,
          logo: "",
          type: "push",
        });
        ids.push(userId);
      }
      tokens.push(token.token);
    }
    // await prisma.notification.createMany({
    //   data: prismaTransaction,
    //   skipDuplicates: true,
    // });
    await sendPushNotificationsInBatches(title, body, tokens);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

async function sendPushNotiAnalysis(data: any) {
  try {
    const { title, message, companyName, analysisId, requiredPremium } = data;
    const pushTokens = await prisma.pushNotificationToken.findMany({
      where: {
        // user: {
        //   notificationPreference: {
        //     enableFullNotifications: true,
        //   },
        // },
      },
    });
    const ids: string[] = [];
    const tokens: string[] = [];
    const prismaTransaction: any = [];

    for (let token of pushTokens) {
      const userId = token.userId;

      if (!ids.includes(userId)) {
        prismaTransaction.push({
          userId: userId,
          companyName,
          message,
          logo: "",
          type: "analysis",
          entityId: analysisId,
          requiredPremium,
        });
        ids.push(userId);
      }
      tokens.push(token.token);
    }
    await prisma.notification.createMany({
      data: prismaTransaction,
      skipDuplicates: true,
    });
    await sendPushNotificationsInBatches(title, message, tokens);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export { addToAIQueue };

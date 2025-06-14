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
    case "UPDATE-NEWS":
      return updateNews;
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
    });
    if (!targetUser) {
      return;
    }
    if (targetUser.id == author?.id) {
      console.log("Same user");
      return;
    }
    const pushTokens = await prisma.pushNotificationToken.findMany({
      where: {
        userId: targetUser.clerkId,
        OR: [
          {
            user: {
              notificationPreference: {
                enableFullNotifications: true,
              },
            },
          },
          {
            user: {
              notificationPreference: null,
            },
          },
        ],
      },
    });
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
        notificationPreference: true,
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

    const pushTokens = targetUser.pushTokens;

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
    if (targetUser.notificationPreference) {
      if (targetUser.notificationPreference.enableFullNotifications == false) {
        console.log("Notification disabled");
        return;
      }
    }
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
      where: {
        OR: [
          {
            user: {
              notificationPreference: {
                enableShortNotifications: true,
              },
            },
          },
          {
            user: {
              notificationPreference: null,
            },
          },
        ],
      },
    });
    const tokens = pushTokens.map((token) => token.token);
    await prisma.notification.create({
      data: {
        companyName: title,
        message: body,
        logo: "",
        type: "push",
      },
    });
    await sendPushNotificationsInBatches(title, body, tokens);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

async function sendPushNotiToTrialUser(data: any) {
  try {
    const { title, body, saveNotification } = data;
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
    if (saveNotification) {
      await prisma.notification.createMany({
        data: prismaTransaction,
        skipDuplicates: true,
      });
    }
    await sendPushNotificationsInBatches(title, body, tokens);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

async function sendPushNotiToFreeUser(data: any) {
  try {
    const { title, body, saveNotification } = data;
    const nowPlus7Days = new Date();
    nowPlus7Days.setDate(nowPlus7Days.getDate() + 7);

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
    if (saveNotification) {
      await prisma.notification.createMany({
        data: prismaTransaction,
        skipDuplicates: true,
      });
    }
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
        OR: [
          {
            user: {
              notificationPreference: {
                enableFullNotifications: true,
              },
            },
          },
          {
            user: {
              notificationPreference: null,
            },
          },
        ],
      },
    });
    const tokens = pushTokens.map((token) => token.token);
    await prisma.notification.create({
      data: {
        companyName,
        message,
        logo: "",
        type: "analysis",
        entityId: analysisId,
        requiredPremium,
      },
    });
    await sendPushNotificationsInBatches(title, message, tokens);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

async function updateNews(data: any) {
  try {
    const markets = await prisma.marketData.findMany({
      where: {
        country: "BD",
      },
      select: {
        symbol: true,
      },
    });
    console.log(markets.length);

    // Process markets in smaller batches to avoid connection pool exhaustion
    const marketBatchSize = 5; // Process 5 markets at a time

    for (let i = 0; i < markets.length; i += marketBatchSize) {
      const marketBatch = markets.slice(i, i + marketBatchSize);
      const promises: Promise<any>[] = [];

      // Fetch news for current batch of markets
      for (const market of marketBatch) {
        const symbol = market.symbol;
        const newsResponse = await fetch(
          `https://stocknow.com.bd/api/v1/instruments/${symbol}/news`
        );
        const newsData = await newsResponse.json();
        const newsItems = newsData.data;
        console.log(
          `Fetched ${newsItems?.length || 0} news items for ${symbol}`
        );

        if (!newsItems) {
          console.log("No data found for ", symbol);
          continue;
        }

        for (const item of newsItems) {
          promises.push(
            prisma.news.upsert({
              where: {
                id: `${item.id}`,
              },
              update: {
                symbol,
                title: item.title || "",
                details: item.details || "",
                bn: item.bn || "",
                createdAt: new Date(item?.post_date),
              },
              create: {
                id: `${item.id}`,
                symbol,
                title: item.title || "",
                details: item.details || "",
                bn: item.bn || "",
                createdAt: new Date(item?.post_date),
              },
            })
          );
        }
      }

      // Process database operations in smaller batches
      const dbBatchSize = 10; // Reduced from 50 to 10
      for (let j = 0; j < promises.length; j += dbBatchSize) {
        const batch = promises.slice(j, j + dbBatchSize);
        await Promise.all(batch);
        console.log(
          `Processed DB batch ${Math.floor(j / dbBatchSize) + 1}/${Math.ceil(
            promises.length / dbBatchSize
          )} for markets ${i + 1}-${Math.min(
            i + marketBatchSize,
            markets.length
          )}`
        );

        // Small delay to prevent overwhelming the connection pool
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        `Completed market batch ${
          Math.floor(i / marketBatchSize) + 1
        }/${Math.ceil(markets.length / marketBatchSize)}`
      );
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export { addToAIQueue };

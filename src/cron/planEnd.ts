import prisma from "@/src/lib/prisma";
import cron from "node-cron";
import { redis } from "@/src/lib/redis";
import { BadRequestError } from "../errors";
import { sendPushNotificationsInBatches } from "../job/aiService";
import { chatCompletion } from "../lib/ai.utils";

const triggerCron = async () => {
  const lockKey = "PLAN_END_CRON_LOCK";
  const lockAcquired = await redis.set(lockKey, "1", "EX", 300); // 5 minutes TTL
  if (!lockAcquired) {
    console.log("Job is already running! Skipping...");
    return;
  }
  try {
    const today = new Date();
    const threeDaysAgo = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 3
    );
    const plans = await prisma.activePlan.findMany({
      where: {
        expiresOn: {
          gt: threeDaysAgo,
          lt: today,
        },
        alertCount: 0,
      },
      select: {
        userId: true,
        id: true,
      },
    });
    const userIds = plans.map((plan) => plan.userId);
    const pushTokens = await prisma.pushNotificationToken.findMany({
      where: {
        userId: {
          notIn: userIds,
        },
      },
      select: {
        token: true,
      },
    });

    const tokens = pushTokens.map((token) => token.token);

    const titlePrompt = `
    Create a Bangla push notification title for a stock market prediction app that reminds a paid user their plan is about to expire soon. The tone should be greedy and slightly scary, making the user feel like they’ll miss out on powerful AI insights and profitable predictions if they don’t renew. Include FOMO (fear of missing out) and emotional urgency. Add 1-2 relevant emojis to make it more impactful. The title must be within 50 characters.
    `;

    const bodyPrompt = `
    Create a Bangla push notification message for a stock market prediction app that reminds a paid user their plan is about to expire soon. The tone should be greedy and slightly scary, making the user feel like they’ll miss out on powerful AI insights and profitable predictions if they don’t renew. Include FOMO (fear of missing out) and emotional urgency. Add 1-2 relevant emojis to make it more impactful. The message description should be 100-150 characters.
    `;

    const title = await chatCompletion(titlePrompt);
    const body = await chatCompletion(bodyPrompt);

    await sendPushNotificationsInBatches(
      title || "Plan End",
      body || "Your plan has ended!",
      tokens
    );

    await prisma.activePlan.updateMany({
      where: {
        id: {
          in: plans.map((plan) => plan.id),
        },
      },
      data: {
        alertCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("Error in triggerCron:", error);
    throw new BadRequestError("Something went wrong!");
  } finally {
    await redis.del(lockKey);
  }
};

export function startPlanEndScheduler() {
  cron.schedule("0 10 * * *", triggerCron, {
    timezone: "Asia/Dhaka",
    // runOnInit: true,
  });
  console.log("Plan end scheduler is running...");
}

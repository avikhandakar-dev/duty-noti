import prisma from "@/src/lib/prisma";
import cron from "node-cron";
import { redis } from "@/src/lib/redis";
import { BadRequestError } from "../errors";
import { sendPushNotificationsInBatches } from "../job/aiService";
import { chatCompletion } from "../lib/ai.utils";

const triggerCron = async () => {
  const lockKey = "NO_PORTFOLIO_CRON_LOCK";
  const lockAcquired = await redis.set(lockKey, "1", "EX", 300); // 5 minutes TTL
  if (!lockAcquired) {
    console.log("Job is already running! Skipping...");
    return;
  }
  try {
    let portfolios = await prisma.portfolio.findMany({
      select: {
        userId: true,
        holdings: {
          where: {
            createdAt: {
              gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });
    portfolios = portfolios.filter(
      (portfolio) => portfolio.holdings.length == 0
    );
    const userIds = portfolios.map((portfolio) => portfolio.userId);
    const pushTokens = await prisma.pushNotificationToken.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      select: {
        token: true,
      },
    });

    const tokens = pushTokens.map((token) => token.token);

    const titlePrompt = `
    Generate a short and engaging title in Bangla (under 50 characters) for a notification targeting users who have not made any stock transactions or added any stocks to their portfolio in the last 24 hours. The title must include the word ‘পোর্টফোলিও’ so that users clearly understand the message. It should create urgency, excitement, or FOMO (fear of missing out)."

Example Titles (Bangla):
⏳ আপনার পোর্টফোলিও ২৪ ঘণ্টা ধরে খালি?
🚀 পোর্টফোলিও আপডেট করুন, বাজারের সাথে থাকুন!
📊 লেনদেন বন্ধ? পোর্টফোলিও ফ্রেশ করুন!
🔥 বিনিয়োগ ছাড়া পোর্টফোলিও সাজে না!
💡 আপনার পোর্টফোলিও কি বিশ্রামে? জাগিয়ে তুলুন!
    `;

    const bodyPrompt = `
    Generate a short and engaging description in Bangla (under 100 characters) for a notification targeting users who have not made any stock transactions or added stocks to their portfolio in the last 24 hours. The message must include the word ‘পোর্টফোলিও’ to make it clear. It should be fun, slightly playful, and encourage users to take action."

Example Descriptions (Bangla) (Under 100 Characters):
📊 গত ২৪ ঘণ্টায় পোর্টফোলিওতে কোনো নতুন স্টক নেই! স্মার্ট বিনিয়োগের জন্য এখনই স্টক যোগ করুন!

🚀 আপনার পোর্টফোলিও কি বিশ্রামে? বিনিয়োগ শুরু করুন, নাহলে সুযোগ হাতছাড়া হয়ে যাবে!

🔥 একদিন পেরিয়ে গেল, কিন্তু পোর্টফোলিওতে কোনো নড়াচড়া নেই! এখনই নতুন স্টক যোগ করুন!

📈 বাজার চলছে, আর আপনার পোর্টফোলিও কি ঘুমিয়ে? এখনই আপডেট করুন আর বিনিয়োগ শুরু করুন!

    `;

    const title = await chatCompletion(titlePrompt);
    const body = await chatCompletion(bodyPrompt);

    await sendPushNotificationsInBatches(title || "", body || "", tokens);

    console.log(userIds, userIds.length);
  } catch (error) {
    console.error("Error in triggerCron:", error);
    throw new BadRequestError("Something went wrong!");
  } finally {
    await redis.del(lockKey);
  }
};

export function startNoHoldingsTodayScheduler() {
  cron.schedule("0 18 * * *", triggerCron, {
    timezone: "Asia/Dhaka",
  });
  console.log("No Holdings Today scheduler is running...");
}

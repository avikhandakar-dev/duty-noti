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
    const portfolios = await prisma.portfolio.findMany({
      select: {
        userId: true,
      },
    });
    const userIds = portfolios.map((portfolio) => portfolio.userId);
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
    Generate a short and engaging title for a notification in Bangla. The title must be under 50 characters and should encourage users to create a portfolio in the stock market. It should feel exciting, urgent, and motivational."

Example Titles (Bangla):
📢 বাজার মাতাচ্ছে সবাই, আর আপনি?
🚀 সবাই এগিয়ে যাচ্ছে, আপনি পিছিয়ে থাকবেন?
📊 আপনার বিনিয়োগ যাত্রা শুরু হয়নি?
🔥 মার্কেট চলে, আপনি প্রস্তুত তো?
💡 স্মার্ট বিনিয়োগের শুরু এখানেই!
    `;

    const bodyPrompt = `
    Generate a short, fun, and engaging description in Bangla (under 100 characters) for a notification encouraging users to set up their portfolio in the stock market. The description should feel exciting, slightly playful, and action-driven to grab attention."

Example Descriptions (Bangla) (Under 100 Characters):
📈 পোর্টফোলিও ছাড়া স্টক মার্কেটে? টিকটক ছাড়া ট্রেন্ডিং যেমন! এখনই সেটআপ করুন!

🚀 বাজারে সবাই দৌড়াচ্ছে, আপনি দাঁড়িয়ে আছেন? পোর্টফোলিও সেটআপ করে রেসে যোগ দিন!

🔥 একটা সুযোগ হাতছাড়া মানেই লস! পোর্টফোলিও তৈরি করে স্মার্ট বিনিয়োগ শুরু করুন!

📊 স্টক মার্কেট মানেই প্ল্যানিং! আপনার পোর্টফোলিও ছাড়া ইনভেস্টমেন্ট অসম্পূর্ণ!

💡 প্রো বিনিয়োগকারীরা কী করে? আগে পোর্টফোলিও সেটআপ, তারপর স্মার্ট ট্রেড! আপনি?

    `;

    const title = await chatCompletion(titlePrompt);
    const body = await chatCompletion(bodyPrompt);

    await sendPushNotificationsInBatches(title || "", body || "", tokens);

    console.log(tokens);
  } catch (error) {
    console.error("Error in triggerCron:", error);
    throw new BadRequestError("Something went wrong!");
  } finally {
    await redis.del(lockKey);
  }
};

export function startNoPortfolioScheduler() {
  cron.schedule("0 11 * * *", triggerCron, {
    timezone: "Asia/Dhaka",
    // runOnInit: true,
  });
  console.log("No Portfolio scheduler is running...");
}

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
        _count: {
          select: {
            holdings: true,
          },
        },
      },
    });
    portfolios = portfolios.filter(
      (portfolio) => portfolio._count.holdings > 0
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
    Generate a short and highly engaging title in Bangla (under 50 characters) for a notification targeting users who have added stocks to their portfolio in the last 24 hours. The title must create a strong sense of FOMO (fear of missing out), urgency, and excitement while encouraging users to monitor their investments using Duty AI. The tone should be action-driven, playful, and motivational."

Example Titles (Bangla) (Under 50 Characters):
🔥 স্টক কিনলেন, কিন্তু ট্র্যাক করছেন তো?

📊 আপনার বিনিয়োগের ভবিষ্যৎ কী? এখনই দেখুন!

⏳ বাজার বদলাচ্ছে, আপনার স্টক কি নিরাপদ?

🚀 সঠিক সিদ্ধান্ত নিন! আপনার স্টক কোথায় যাচ্ছে?

💹 আপনার পোর্টফোলিও কি লাভের পথে নাকি ঝুঁকিতে?

🧐 শুধু কেনা যথেষ্ট? সঠিক ট্র্যাকিং না করলে লস!

📈 বিনিয়োগ করেছেন, কিন্তু কি ঠিক পথে আছে?

🔥 স্টক বাজারে মিস করা মানেই লস! মনিটর করুন!

💡 আপনার স্টকের অবস্থা জানেন তো? জানতেই হবে!

📢 আপনার বিনিয়োগের ভবিষ্যৎ ঝুঁকিতে না তো?
    `;

    const bodyPrompt = `
    Generate a short and highly engaging description in Bangla (under 100 characters) for a notification targeting users who have added stocks to their portfolio in the last 24 hours. The message must create a sense of FOMO (fear of missing out), urgency, and excitement while encouraging users to monitor their investments using Duty AI. The tone should be action-driven, playful, and motivational."

Example Descriptions (Bangla) (Under 100 Characters):
🔥 আপনার স্টকগুলোর অবস্থা কেমন? জানেন তো? Duty AI-কে জিজ্ঞাসা করুন, নাহলে বাজার আপনাকে ফাঁকি দেবে!

📈 বাজার প্রতিদিন বদলায়, আপনার স্টক কি ঠিক পথে? এখনই Duty AI-কে জিজ্ঞাসা করুন, দেরি করবেন না!

🚀 বাজারে যারা টিকে থাকে, তারা স্মার্টলি ট্র্যাক করে! Duty AI-কে জিজ্ঞাসা করুন, আপনার স্টক সুরক্ষিত তো?

💡 শুধু কেনাই যথেষ্ট নয়! স্মার্ট বিনিয়োগকারীরা স্টক ট্র্যাক করে! এখনই Duty AI-কে জিজ্ঞাসা করুন!

🧐 আপনার স্টক কি মুনাফা আনছে নাকি লসের পথে? দেরি না করে Duty AI-কে জিজ্ঞাসা করুন, স্মার্ট হন!

💹 বিনিয়োগ করেছেন, কিন্তু নজর রাখছেন তো? এখনই Duty AI-কে জিজ্ঞাসা করুন, ভুল পথে গেলে ক্ষতি আপনার!

📊 স্মার্ট বিনিয়োগের জন্য শুধু কেনা নয়, পর্যবেক্ষণও দরকার! Duty AI-কে জিজ্ঞাসা করুন, সঠিক পথে থাকুন!

🔥 আপনার নতুন স্টক কি লাভের দিকে? না কি ঝুঁকিতে? Duty AI-কে জিজ্ঞাসা করুন, পরে আফসোস করবেন না!

📢 বাজার সুযোগ নিতে জানে, আপনি কি জানেন? নিজের স্টক যাচাই করুন Duty AI দিয়ে, নাহলে পিছিয়ে পড়বেন!

💰 আপনার বিনিয়োগ সঠিক পথে কিনা এখনই জানুন! Duty AI-কে জিজ্ঞাসা করুন, পরে দেরি হয়ে যেতে পারে!

    `;

    const title = await chatCompletion(titlePrompt);
    const body = await chatCompletion(bodyPrompt);

    await sendPushNotificationsInBatches(title || "", body || "", tokens);

    console.log(title, body);

    console.log(userIds, userIds.length);
  } catch (error) {
    console.error("Error in triggerCron:", error);
    throw new BadRequestError("Something went wrong!");
  } finally {
    await redis.del(lockKey);
  }
};

export function startHasHoldingsScheduler() {
  cron.schedule("0 21 * * *", triggerCron, {
    timezone: "Asia/Dhaka",
    // runOnInit: true,
  });
  console.log("Has Holdings scheduler is running...");
}

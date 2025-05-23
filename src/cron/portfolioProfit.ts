import prisma from "@/src/lib/prisma";
import cron from "node-cron";
import { redis } from "@/src/lib/redis";
import { BadRequestError } from "../errors";
import { chatCompletion } from "../lib/ai.utils";
import { sendPushNotificationsInBatches } from "../job/aiService";
// Using Prisma client to query databa

async function getProfitableHoldingsPerUser() {
  // First, get all portfolios with their user data and holdings with stock data
  const portfolios = await prisma.portfolio.findMany({
    select: {
      id: true,
      userId: true,
      user: true,
      holdings: {
        where: {
          quantity: {
            gt: 0,
          },
        },
        include: {
          stock: true,
        },
      },
    },
  });

  // Then filter for profitable holdings manually (where current price > average cost)
  const portfoliosWithProfitableHoldings = portfolios.map((portfolio) => ({
    ...portfolio,
    holdings: portfolio.holdings.filter(
      (holding) => Number(holding.stock.close!) > holding.avgCost
    ),
  }));

  // For each portfolio, randomly select one profitable holding
  const randomProfitableHoldingsPerUser = portfoliosWithProfitableHoldings
    .map((portfolio) => {
      // Skip if there are no profitable holdings
      if (portfolio.holdings.length === 0) {
        return null;
      }

      // Randomly select one holding
      const randomIndex = Math.floor(Math.random() * portfolio.holdings.length);
      const randomHolding = portfolio.holdings[randomIndex];

      // Calculate profit percentage
      const profitPercentage =
        ((Number(randomHolding.stock.close) - randomHolding.avgCost) /
          randomHolding.avgCost) *
        100;

      return {
        userId: portfolio.userId,
        user: portfolio.user,
        holding: {
          id: randomHolding.id,
          stock: randomHolding.stock,
          quantity: randomHolding.quantity,
          avgCost: randomHolding.avgCost,
          currentPrice: randomHolding.stock.close,
          profit: Number(randomHolding.stock.close) - randomHolding.avgCost,
          profitPercentage: profitPercentage,
        },
      };
    })
    .filter(Boolean); // Remove null entries (portfolios with no profitable holdings)

  return randomProfitableHoldingsPerUser;
}

const triggerCron = async () => {
  const lockKey = "PORTFOLIO_CRON_LOCK";
  const lockAcquired = await redis.set(lockKey, "1", "EX", 300); // 5 minutes TTL
  if (!lockAcquired) {
    console.log("Job is already running! Skipping...");
    return;
  }
  try {
    const randomProfitableHoldingsPerUser =
      await getProfitableHoldingsPerUser();
    const userIds = randomProfitableHoldingsPerUser.map(
      (item) => item?.userId || "null"
    );
    const pushTokens = await prisma.pushNotificationToken.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      select: {
        token: true,
        userId: true,
      },
    });

    const titlePrompt = `
You are writing an **engaging Bangla title** for a stock market app notification. The stock named **XYZ** is currently in profit in the user's portfolio.

Write a short and punchy **Bangla title (50–100 characters)** that:
- Starts with the company name "XYZ"
- Includes an emotional hook or curiosity
- Ends with a relevant **emoji** (📈💰🚀⚠️)
- Motivates the user or highlights opportunity
- Feels new and fresh every day

Write only the title in Bangla. No description, no extra explanation.
    `;

    const title = await chatCompletion(titlePrompt);

    const bodyPrompt = `
Here is the title:  
${title}

You are writing a **Bangla short description (250–300 characters)** for a stock market app notification. The user is currently in profit from the stock "XYZ".

Write a **motivational and educational Bangla message** that:
- Matches the tone and topic of the title above
- Congratulates or appreciates the user's profit
- Provides one useful tip about managing profitable stocks (like holding, partially selling, etc.)
- Ends with a **call to action**: “আরো জানুন, Duty AI-কে এখনই জিজ্ঞাসা করুন!”
- Includes 2–3 relevant emojis (📈💰🧠🚀⚠️)

⚠️ Do not repeat the title or company name in the description.
Write only the short description in Bangla.
    `;

    const body = await chatCompletion(bodyPrompt);

    console.log(title, "\n", body);

    let tokensWithStock = [];

    for (const user of randomProfitableHoldingsPerUser) {
      const tokens = pushTokens.filter(
        (token) => token.userId === user?.userId
      );
      const symbol = user?.holding.stock.symbol;
      if (tokens.length > 0 && symbol) {
        tokensWithStock.push({
          tokens,
          stock: symbol,
          title: title?.replace("XYZ", symbol),
          body: body?.replace("XYZ", symbol),
          userId: user.userId,
        });
      }
    }

    for (const token of tokensWithStock) {
      await sendPushNotificationsInBatches(
        token.title || "",
        token.body || "",
        token.tokens.map((token) => token.token)
      );
      await prisma.notification.create({
        data: {
          companyName: token.title,
          message: token.body || "",
          logo: `https://s3-api.bayah.app/cdn/symbol/logo/${token.stock}.svg`,
          type: "push",
          userId: token.userId,
        },
      });
    }

    console.log(tokensWithStock);
  } catch (error) {
    console.error("Error in triggerCron:", error);
    throw new BadRequestError("Something went wrong!");
  } finally {
    await redis.del(lockKey);
  }
};

export function startProfitHoldingsScheduler() {
  cron.schedule("0 11 * * *", triggerCron, {
    timezone: "Asia/Dhaka",
    runOnInit: false,
  });
  console.log("Has Holdings scheduler is running...");
}

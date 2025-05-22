import prisma from "@/src/lib/prisma";
import cron from "node-cron";
import { redis } from "@/src/lib/redis";
import { BadRequestError } from "../errors";
import { chatCompletion } from "../lib/ai.utils";
import { sendPushNotificationsInBatches } from "../job/aiService";
// Using Prisma client to query database

async function getLossHoldingsPerUser() {
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

  // Then filter for loss holdings manually (where current price < average cost)
  const portfoliosWithLossHoldings = portfolios.map((portfolio) => ({
    ...portfolio,
    holdings: portfolio.holdings.filter(
      (holding) => Number(holding.stock.close!) < holding.avgCost
    ),
  }));

  // For each portfolio, randomly select one loss holding
  const randomLossHoldingsPerUser = portfoliosWithLossHoldings
    .map((portfolio) => {
      // Skip if there are no loss holdings
      if (portfolio.holdings.length === 0) {
        return null;
      }

      // Randomly select one holding
      const randomIndex = Math.floor(Math.random() * portfolio.holdings.length);
      const randomHolding = portfolio.holdings[randomIndex];

      // Calculate loss percentage
      const lossPercentage =
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
          loss: randomHolding.avgCost - Number(randomHolding.stock.close),
          lossPercentage: Math.abs(lossPercentage), // Make it positive for readability
        },
      };
    })
    .filter(Boolean); // Remove null entries (portfolios with no loss holdings)

  return randomLossHoldingsPerUser;
}

const triggerLossCron = async () => {
  const lockKey = "LOSS_PORTFOLIO_CRON_LOCK";
  const lockAcquired = await redis.set(lockKey, "1", "EX", 300); // 5 minutes TTL
  if (!lockAcquired) {
    console.log("Loss job is already running! Skipping...");
    return;
  }
  try {
    const randomLossHoldingsPerUser = await getLossHoldingsPerUser();
    const userIds = randomLossHoldingsPerUser.map(
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
You are writing a Bangla title for a stock market app notification.

A user is currently in loss for the stock named XYZ (keep this placeholder).
Your job is to generate a short, emotional, curiosity-driven title in Bangla that:

Starts with XYZ

Is between 50–100 characters

Includes emotional trigger (like হতাশা, ভুল সিদ্ধান্ত, সুযোগ, পরামর্শ ইত্যাদি)

Feels fresh and unique every day

Ends with a suitable emoji (📉⚠️😟🧠💡🛑)

Do not repeat previous titles. Make it sound smart, urgent, and helpful.
    `;

    const title = await chatCompletion(titlePrompt);

    const bodyPrompt = `
Here is the title:  
${title}

You are writing a Bangla short description (250–300 characters) for a stock market app notification.

The user is currently in loss for a stock named XYZ (keep this placeholder).

Your job is to write a motivational, educational, and practical message in Bangla that:

- Mentions the user is in loss
- Shares one unique, useful tip about:
  - Risk or money management
  - Stop loss or holding strategy
  - Emotional control during loss
  - How to analyze situations calmly
- Adds a sense of hope and learning
- Ends with this sentence:
  "শেষ সিদ্ধান্ত নিন Duty AI-এর সাথে আলোচনা করে।"
- Includes 2–3 relevant emojis (📉🧠⚠️💡🛑)
- Feels fresh and insightful — do not repeat content

Write only the short description in Bangla.
    `;

    const body = await chatCompletion(bodyPrompt);

    console.log(title, "\n", body);

    let tokensWithStock = [];

    for (const user of randomLossHoldingsPerUser) {
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
          logo: "",
          type: "push",
          userId: token.userId,
        },
      });
    }

    console.log(tokensWithStock);
  } catch (error) {
    console.error("Error in triggerLossCron:", error);
    throw new BadRequestError("Something went wrong!");
  } finally {
    await redis.del(lockKey);
  }
};

export function startLossHoldingsScheduler() {
  cron.schedule("0 22 * * *", triggerLossCron, {
    timezone: "Asia/Dhaka",
    runOnInit: false,
  });
  console.log("Loss Holdings scheduler is running...");
}

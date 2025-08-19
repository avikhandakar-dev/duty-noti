import axios from "axios";
import prisma from "../lib/prisma";
import { redisCache } from "../lib/redis";
import { sendMail } from "../lib/mail";
import { extractRSSFeed } from "../lib/rss-feed";

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
    case "UPDATE-RSS-NEWS":
      return updateRssNews;
    case "UPDATE-ALL-STOCK-TV":
      return updateAllStockTv;
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

export async function sendPushNotificationsInBatchesNoSound(
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
    const { title, body, saveNotification } = data;
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
    if (saveNotification) {
      await prisma.notification.create({
        data: {
          companyName: title,
          message: body,
          logo: "",
          type: "push",
        },
      });
      await sendPushNotificationsInBatches(title, body, tokens);
    } else {
      await sendPushNotificationsInBatchesNoSound(title, body, tokens);
    }
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
    await sendMail({
      from: "server@dutyai.app",
      fromName: "Duty AI",
      to: "team@dutyai.app",
      subject: "Successfully updated news",
      html: `
      <p>Successfully updated news</p>
      `,
    });
  } catch (error: any) {
    await sendMail({
      from: "server@dutyai.app",
      fromName: "Duty AI",
      to: "team@dutyai.app",
      subject: "Failed to update news",
      html: `
      <p>Failed to update news</p>
      <p>Error: ${error.message}</p>
      `,
    });
    throw new Error(error.message);
  }
}

async function updateRssNews(data: any) {
  try {
    const { url } = data;
    console.log("Started updating RSS news from - ", url);
    const news = await extractRSSFeed(url);
    for (const item of news) {
      await prisma.rssNews.upsert({
        where: {
          url: item.url,
        },
        update: {
          title: item.title,
          summary: item.summary,
          content: item.content,
          image: (item.image as string) || "",
          publishedAt: new Date(item.publishedAt),
        },
        create: {
          title: item.title,
          url: item.url,
          summary: item.summary,
          content: item.content,
          image: (item.image as string) || "",
          publishedAt: new Date(item.publishedAt),
        },
      });
      console.log("Scraped news - ", item.title, item.url);
    }
    console.log("Successfully updated RSS news from - ", url);
    // await sendMail({
    //   from: "server@dutyai.app",
    //   fromName: "Duty AI",
    //   to: "team@dutyai.app",
    //   subject: "Successfully updated news",
    //   html: `
    //   <p>Successfully updated news</p>
    //   `,
    // });
  } catch (error: any) {
    await sendMail({
      from: "server@dutyai.app",
      fromName: "Duty AI",
      to: "team@dutyai.app",
      subject: "Failed to scrape RSS news",
      html: `
      <p>Failed to scrape RSS news</p>
      <p>Error: ${error.message}</p>
      `,
    });
    throw new Error(error.message);
  }
}

async function updateAllStockTv(data: any) {
  try {
    const startTime = Date.now();
    const EndPoint =
      "https://scanner.tradingview.com/bangladesh/scan?label-product=markets-screener";
    const Country = "BD";
    const TotalStocks = 357;
    const R15MRes = [
      "Recommend.Other|15",
      "Recommend.All|15",
      "Recommend.MA|15",
      "RSI|15",
      "RSI[1]|15",
      "Stoch.K|15",
      "Stoch.D|15",
      "Stoch.K[1]|15",
      "Stoch.D[1]|15",
      "CCI20|15",
      "CCI20[1]|15",
      "ADX|15",
      "ADX+DI|15",
      "ADX-DI|15",
      "ADX+DI[1]|15",
      "ADX-DI[1]|15",
      "AO|15",
      "AO[1]|15",
      "AO[2]|15",
      "Mom|15",
      "Mom[1]|15",
      "MACD.macd|15",
      "MACD.signal|15",
      "Rec.Stoch.RSI|15",
      "Stoch.RSI.K|15",
      "Rec.WR|15",
      "W.R|15",
      "Rec.BBPower|15",
      "BBPower|15",
      "Rec.UO|15",
      "UO|15",
      "EMA10|15",
      "close|15",
      "SMA10|15",
      "EMA20|15",
      "SMA20|15",
      "EMA30|15",
      "SMA30|15",
      "EMA50|15",
      "SMA50|15",
      "EMA100|15",
      "SMA100|15",
      "EMA200|15",
      "SMA200|15",
      "Rec.Ichimoku|15",
      "Ichimoku.BLine|15",
      "Rec.VWMA|15",
      "VWMA|15",
      "Rec.HullMA9|15",
      "HullMA9|15",
      "Pivot.M.Classic.R3|15",
      "Pivot.M.Classic.R2|15",
      "Pivot.M.Classic.R1|15",
      "Pivot.M.Classic.Middle|15",
      "Pivot.M.Classic.S1|15",
      "Pivot.M.Classic.S2|15",
      "Pivot.M.Classic.S3|15",
      "Pivot.M.Fibonacci.R3|15",
      "Pivot.M.Fibonacci.R2|15",
      "Pivot.M.Fibonacci.R1|15",
      "Pivot.M.Fibonacci.Middle|15",
      "Pivot.M.Fibonacci.S1|15",
      "Pivot.M.Fibonacci.S2|15",
      "Pivot.M.Fibonacci.S3|15",
      "Pivot.M.Camarilla.R3|15",
      "Pivot.M.Camarilla.R2|15",
      "Pivot.M.Camarilla.R1|15",
      "Pivot.M.Camarilla.Middle|15",
      "Pivot.M.Camarilla.S1|15",
      "Pivot.M.Camarilla.S2|15",
      "Pivot.M.Camarilla.S3|15",
      "Pivot.M.Woodie.R3|15",
      "Pivot.M.Woodie.R2|15",
      "Pivot.M.Woodie.R1|15",
      "Pivot.M.Woodie.Middle|15",
      "Pivot.M.Woodie.S1|15",
      "Pivot.M.Woodie.S2|15",
      "Pivot.M.Woodie.S3|15",
      "Pivot.M.Demark.R1|15",
      "Pivot.M.Demark.Middle|15",
      "Pivot.M.Demark.S1|15",
    ];

    const R30MRes = R15MRes.map((item) => item.replace("15", "30"));
    const R1HRes = R15MRes.map((item) => item.replace("15", "60"));
    const R2HRes = R15MRes.map((item) => item.replace("15", "120"));
    const R4HRes = R15MRes.map((item) => item.replace("15", "240"));
    const R1WRes = R15MRes.map((item) => item.replace("15", "1W"));
    const R1MRes = R15MRes.map((item) => item.replace("15", "1M"));

    const DefaultRes = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "close",
      "pricescale",
      "minmov",
      "fractional",
      "minmove2",
      "currency",
      "change",
      "volume",
      "relative_volume_10d_calc",
      "market_cap_basic",
      "fundamental_currency_code",
      "price_earnings_ttm",
      "earnings_per_share_diluted_ttm",
      "earnings_per_share_diluted_yoy_growth_ttm",
      "dividends_yield_current",
      "sector.tr",
      "market",
      "sector",
      "recommendation_mark",
      "Perf.1Y.MarketCap",
      "price_earnings_growth_ttm",
      "price_sales_current",
      "price_book_fq",
      "price_to_cash_f_operating_activities_ttm",
      "price_free_cash_flow_ttm",
      "price_to_cash_ratio",
      "enterprise_value_current",
      "enterprise_value_to_revenue_ttm",
      "enterprise_value_to_ebit_ttm",
      "enterprise_value_ebitda_ttm",
      "dps_common_stock_prim_issue_fy",
      "dps_common_stock_prim_issue_fq",
      "dividends_yield",
      "dividend_payout_ratio_ttm",
      "dps_common_stock_prim_issue_yoy_growth_fy",
      "continuous_dividend_payout",
      "continuous_dividend_growth",
      "gross_margin_ttm",
      "operating_margin_ttm",
      "pre_tax_margin_ttm",
      "net_margin_ttm",
      "free_cash_flow_margin_ttm",
      "return_on_assets_fq",
      "return_on_equity_fq",
      "return_on_invested_capital_fq",
      "research_and_dev_ratio_ttm",
      "sell_gen_admin_exp_other_ratio_ttm",
      "total_revenue_ttm",
      "total_revenue_yoy_growth_ttm",
      "gross_profit_ttm",
      "oper_income_ttm",
      "net_income_ttm",
      "ebitda_ttm",
      "total_assets_fq",
      "total_current_assets_fq",
      "cash_n_short_term_invest_fq",
      "total_liabilities_fq",
      "total_debt_fq",
      "net_debt_fq",
      "total_equity_fq",
      "current_ratio_fq",
      "quick_ratio_fq",
      "debt_to_equity_fq",
      "cash_n_short_term_invest_to_total_debt_fq",
      "cash_f_operating_activities_ttm",
      "cash_f_investing_activities_ttm",
      "cash_f_financing_activities_ttm",
      "free_cash_flow_ttm",
      "capital_expenditures_ttm",
      "Recommend.All",
      "Recommend.MA",
      "Recommend.Other",
      "RSI",
      "Mom",
      "AO",
      "CCI20",
      "Stoch.K",
      "Stoch.D",
      "MACD.macd",
      "MACD.signal",
      "Rec.Stoch.RSI",
      "Stoch.RSI.K",
      "Rec.WR",
      "W.R",
      "EMA10",
      "SMA10",
      "EMA20",
      "SMA20",
      "EMA30",
      "SMA30",
      "EMA50",
      "SMA50",
      "EMA100",
      "SMA100",
      "EMA200",
      "SMA200",
      "Rec.Ichimoku",
      "Ichimoku.BLine",
      "Rec.VWMA",
      "VWMA",
      "Rec.HullMA9",
      "HullMA9",
      "Pivot.M.Classic.R3",
      "Pivot.M.Classic.R2",
      "Pivot.M.Classic.R1",
      "Pivot.M.Classic.Middle",
      "Pivot.M.Classic.S1",
      "Pivot.M.Classic.S2",
      "Pivot.M.Classic.S3",
      "BBPower",
      "Rec.BBPower",
    ];

    const AllRes = [
      ...DefaultRes,
      ...R15MRes,
      ...R30MRes,
      ...R1HRes,
      ...R2HRes,
      ...R4HRes,
      ...R1WRes,
      ...R1MRes,
    ];

    const indexes = {
      defaultStart: 0,
      defaultEnd: DefaultRes.length,
      R15MStart: DefaultRes.length,
      R15MEnd: DefaultRes.length + R15MRes.length,
      R30MStart: DefaultRes.length + R15MRes.length,
      R30MEnd: DefaultRes.length + R15MRes.length + R30MRes.length,
      R1HStart: DefaultRes.length + R15MRes.length + R30MRes.length,
      R1HEnd:
        DefaultRes.length + R15MRes.length + R30MRes.length + R1HRes.length,
      R2HStart:
        DefaultRes.length + R15MRes.length + R30MRes.length + R1HRes.length,
      R2HEnd:
        DefaultRes.length +
        R15MRes.length +
        R30MRes.length +
        R1HRes.length +
        R2HRes.length,
      R4HStart:
        DefaultRes.length +
        R15MRes.length +
        R30MRes.length +
        R1HRes.length +
        R2HRes.length,
      R4HEnd:
        DefaultRes.length +
        R15MRes.length +
        R30MRes.length +
        R1HRes.length +
        R2HRes.length +
        R4HRes.length,
      R1WStart:
        DefaultRes.length +
        R15MRes.length +
        R30MRes.length +
        R1HRes.length +
        R2HRes.length +
        R4HRes.length,
      R1WEnd:
        DefaultRes.length +
        R15MRes.length +
        R30MRes.length +
        R1HRes.length +
        R2HRes.length +
        R4HRes.length +
        R1WRes.length,
      R1MStart:
        DefaultRes.length +
        R15MRes.length +
        R30MRes.length +
        R1HRes.length +
        R2HRes.length +
        R4HRes.length +
        R1WRes.length,
      R1MEnd:
        DefaultRes.length +
        R15MRes.length +
        R30MRes.length +
        R1HRes.length +
        R2HRes.length +
        R4HRes.length +
        R1WRes.length +
        R1MRes.length,
    };

    // Helper function to convert field names to database column names
    const convertFieldName = (fieldName: string): string => {
      return fieldName
        .toLowerCase()
        .replace(/\./g, "_")
        .replace(/\[/g, "_")
        .replace(/\]/g, "")
        .replace(/\+/g, "plus_")
        .replace(/-/g, "minus_");
    };

    // Helper function to extract resolution data
    const extractResolutionData = (
      item: any[],
      startIndex: number,
      endIndex: number,
      fieldNames: string[]
    ) => {
      const data: any = {};
      for (let i = startIndex; i < endIndex; i++) {
        const fieldIndex = i - startIndex;
        if (fieldIndex < fieldNames.length) {
          const fieldName = convertFieldName(
            fieldNames[fieldIndex].split("|")[0]
          );
          data[fieldName] = item[i] ? `${item[i]}` : null;
        }
      }
      return data;
    };

    const request = await fetch(EndPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        columns: AllRes,
        ignore_unknown_fields: false,
        options: {
          lang: "en",
        },
        range: [0, TotalStocks],
        sort: {
          sortBy: "name",
          sortOrder: "asc",
          nullsFirst: false,
        },
        preset: "all_stocks",
      }),
    });

    const final = [];
    const response: any = await request.json();

    for (let item of response.data) {
      const symbol = item.d[0];

      // Extract default market data
      const defaultData: any = {};
      for (let i = indexes.defaultStart; i < indexes.defaultEnd; i++) {
        defaultData[convertFieldName(AllRes[i])] = item.d[i]
          ? `${item.d[i]}`
          : null;
      }

      // Extract resolution data
      const r15mData = extractResolutionData(
        item.d,
        indexes.R15MStart,
        indexes.R15MEnd,
        R15MRes
      );
      const r30mData = extractResolutionData(
        item.d,
        indexes.R30MStart,
        indexes.R30MEnd,
        R30MRes
      );
      const r1hData = extractResolutionData(
        item.d,
        indexes.R1HStart,
        indexes.R1HEnd,
        R1HRes
      );
      const r2hData = extractResolutionData(
        item.d,
        indexes.R2HStart,
        indexes.R2HEnd,
        R2HRes
      );
      const r4hData = extractResolutionData(
        item.d,
        indexes.R4HStart,
        indexes.R4HEnd,
        R4HRes
      );
      const r1wData = extractResolutionData(
        item.d,
        indexes.R1WStart,
        indexes.R1WEnd,
        R1WRes
      );
      const r1mData = extractResolutionData(
        item.d,
        indexes.R1MStart,
        indexes.R1MEnd,
        R1MRes
      );

      final.push({ symbol, ...defaultData });

      // Upsert MarketData with all resolution data
      await prisma.marketData.upsert({
        where: {
          symbol_country: {
            symbol,
            country: "BD",
          },
        },
        create: {
          symbol,
          country: "BD",
          ...defaultData,
          R15M: {
            create: r15mData,
          },
          R30M: {
            create: r30mData,
          },
          R1H: {
            create: r1hData,
          },
          R2H: {
            create: r2hData,
          },
          R4H: {
            create: r4hData,
          },
          R1W: {
            create: r1wData,
          },
          R1M: {
            create: r1mData,
          },
        },
        update: {
          ...defaultData,
          R15M: {
            upsert: {
              create: r15mData,
              update: r15mData,
            },
          },
          R30M: {
            upsert: {
              create: r30mData,
              update: r30mData,
            },
          },
          R1H: {
            upsert: {
              create: r1hData,
              update: r1hData,
            },
          },
          R2H: {
            upsert: {
              create: r2hData,
              update: r2hData,
            },
          },
          R4H: {
            upsert: {
              create: r4hData,
              update: r4hData,
            },
          },
          R1W: {
            upsert: {
              create: r1wData,
              update: r1wData,
            },
          },
          R1M: {
            upsert: {
              create: r1mData,
              update: r1mData,
            },
          },
        },
      });

      console.log("done", symbol);
    }

    // io.emit("portfolio-update", "all");

    const newData = await prisma.marketData.findMany({
      where: {
        country: "BD",
      },
      select: {
        id: true,
        symbol: true,
        content: true,
        country: true,
        close: true,
        volume: true,
        name: true,
        description: true,
        logoid: true,
        change: true,
      },
    });

    await redisCache.set(
      `key::market::bd::latest`,
      JSON.stringify(newData),
      "EX",
      60 * 60 * 24 * 30
    );

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    await sendMail({
      from: "server@dutyai.app",
      fromName: "Duty AI",
      to: "team@dutyai.app",
      subject: "Successfully updated all stock from TV",
      html: `
      <p>Successfully updated all stock from TV</p>
      <p>Duration: ${duration} seconds</p>
      `,
    });
  } catch (error: any) {
    console.log(error);
    await sendMail({
      from: "server@dutyai.app",
      fromName: "Duty AI",
      to: "team@dutyai.app",
      subject: "Error: Scrape all stock from TV failed",
      html: `
      <p>Error: Scrape all stock from TV failed</p>
      <p>${error.message}</p>
      `,
    });
    throw new Error(error.message);
  }
}

export { addToAIQueue };

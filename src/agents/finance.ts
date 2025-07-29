// finance-agent.ts
import { openai } from "@ai-sdk/openai";
import {
  generateText,
  streamText,
  tool,
  CoreMessage,
  StreamTextResult,
  GenerateTextResult,
} from "ai";
import { z } from "zod";
import axios, { AxiosResponse } from "axios";
import dotenv from "dotenv";
import { redis } from "../lib/redis";

dotenv.config();

// Type definitions
interface NewsArticle {
  title: string;
  href: string;
  snippet: string;
}

interface IndexData {
  [key: string]: any; // Define based on your actual index data structure
}

interface FinanceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  [key: string]: any;
}

interface CachedSummary {
  symbol: string;
  analysis: string;
  timestamp: number;
  recommendation: string;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  [key: string]: any;
}

interface UserContext {
  user_id?: string;
  username?: string;
  conversation_id?: string;
}

interface SearchResult {
  hits: Array<{
    symbol: string;
    name: string;
    score: number;
  }>;
}

interface MarketDataResponse {
  data: FinanceData[];
  status: string;
  message?: string;
}

// Global context for user data
let currentUserContext: UserContext = {};

// User agent list for web scraping
const useragentList: readonly string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.1661.62",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0",
] as const;

// Utility functions with proper typing
const getUserAgent = (): string => {
  return useragentList[Math.floor(Math.random() * useragentList.length)];
};

const getSummaryFromRedis = async (
  symbol: string,
  userId: string
): Promise<CachedSummary | null> => {
  try {
    console.log("Retrieving from Redis...for userid", userId);
    const redisKey = `symbol_summary:${symbol.toLowerCase()}-${userId}`;
    const data = await redis.get(redisKey);

    if (data) {
      return JSON.parse(data) as CachedSummary;
    }
    return null;
  } catch (error) {
    console.error(`Error retrieving from Redis: ${error}`);
    return null;
  }
};

const setSummaryToRedis = async (
  symbol: string,
  userId: string,
  summary: CachedSummary,
  ttlSeconds: number = 3600
): Promise<void> => {
  try {
    const redisKey = `symbol_summary:${symbol.toLowerCase()}-${userId}`;
    await redis.setex(redisKey, ttlSeconds, JSON.stringify(summary));
  } catch (error) {
    console.error(`Error setting to Redis: ${error}`);
  }
};

const getIndexData = async (
  country: string = ""
): Promise<IndexData | null> => {
  try {
    const url = "https://heart.dutyai.app/finance/get/market/index";
    const response: AxiosResponse<IndexData> = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching index data:", error);
    return null;
  }
};

const getWebContent = async (url: string): Promise<string | null> => {
  try {
    const response: AxiosResponse<string> = await axios.get(url, {
      headers: {
        "User-Agent": getUserAgent(),
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error(
      `Request failed for ${url}:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
};

const searchNewsSerper = async (name: string): Promise<NewsArticle[]> => {
  const query = `${name} stock news`;

  const url = "https://google.serper.dev/news";

  const headers = {
    "X-API-KEY": process.env.SERPER_API_KEY || "",
    "Content-Type": "application/json",
  };

  const payload = {
    q: query,
    num: 10,
  };

  const data: NewsArticle[] = [];

  try {
    const response: AxiosResponse<{
      news: Array<{
        title?: string;
        link?: string;
        snippet?: string;
      }>;
    }> = await axios.post(url, payload, { headers });

    if (response.status === 200) {
      const result = response.data;
      const newsArticles = result.news || [];

      for (const article of newsArticles.slice(0, 10)) {
        try {
          data.push({
            title: article.title || "",
            href: article.link || "",
            snippet: article.snippet || "",
          });
        } catch (error) {
          console.error(`Error processing article: ${error}`);
          continue;
        }
      }
    } else {
      console.error(`API request failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error making API request: ${error}`);
  }

  return data;
};

const searchNewsDB = async (query: string): Promise<NewsArticle[]> => {
  // This would need to be implemented based on your search DB
  // For now, falling back to serper
  return await searchNewsSerper(query);
};

const getFinanceData = async (
  query: string,
  userId?: string
): Promise<string> => {
  try {
    let res = "";
    // This would need your search DB implementation
    // For now, using a placeholder
    const symbol = query.toUpperCase(); // Simplified

    const tvSymbolOrig = `DSEBD-${symbol}`;
    const tvSymbol = `DSEBD:${symbol}`;
    const tvChartLink = `https://www.tradingview.com/chart/?symbol=${tvSymbol}&utm_source=www.tradingview.com&utm_medium=widget&utm_campaign=chart&utm_term=${tvSymbol}`;

    const server = process.env.SERVER;
    let url = `https://heart.dutyai.app/finance/get/market/flexible?country=BD&symbol=${symbol}`;
    if (server === "BKP") {
      url = `http://to880kc8ookc0oswcs4kk0w8.195.26.252.202.sslip.io/finance/get/market/flexible?country=BD&symbol=${symbol}`;
    }

    const response: AxiosResponse<FinanceData> = await axios.get(url);
    const tvData = response.data;
    const indexData = await getIndexData();
    const previousData = userId
      ? await getSummaryFromRedis(tvSymbol, userId)
      : null;

    if (tvData) {
      res += `
            ${JSON.stringify(tvData)}\n\n
            ###tv_chart_link:
            ${tvChartLink}\n\n
            ###Index Data:
            ${JSON.stringify(indexData)}\n\n
            `;
    }

    if (previousData) {
      res += `
            ###Previous AI Answer Summary (Cached data within 1 hour):
            ${JSON.stringify(previousData)}\n\n
            `;
    }

    return res;
  } catch (error) {
    console.error("Error in getFinanceData:", error);
    return "No data found";
  }
};

const getMarketData = async (query: string, type: string): Promise<string> => {
  try {
    let res = "";
    const searchQuery = `${type} ${query}`;
    // This would use your search implementation
    // For now, using a placeholder

    res += `
###${type} - ${query}
Data would be fetched from investing.com or similar source\n\n

Instruction:
Answer should be list format. Only include company name and last price and trading volume. Each list should be in one line. Bold company name and title. Include maximum 50 company.
`;
    return res;
  } catch (error) {
    console.error(`Error in get${type}Data:`, error);
    return `Error fetching ${type} data`;
  }
};

// Zod schemas for tool parameters
const NameSchema = z.object({
  name: z.string().describe("Company name or symbol"),
});

const CountrySchema = z.object({
  country: z.string().describe("Market sector e.g., BD"),
});

// Define tools using Vercel AI SDK with proper typing
const tools = {
  getStockNews: tool({
    description:
      "Useful when you need to get stock news for a specific company or symbol, passing company name or symbol to the function",
    parameters: NameSchema,
    execute: async ({ name }: { name: string }): Promise<NewsArticle[]> => {
      return await searchNewsDB(name);
    },
  }),

  getFinanceData: tool({
    description:
      "Useful when you need to get detailed finance data for a specific company, passing company name to the function",
    parameters: NameSchema,
    execute: async ({ name }: { name: string }): Promise<string> => {
      const userId = currentUserContext.user_id;
      return await getFinanceData(name, userId);
    },
  }),

  get52WeekHigh: tool({
    description:
      "Useful when you need to get 52 Week High finance data for a specific country, passing country name to the function",
    parameters: NameSchema,
    execute: async ({ name }: { name: string }): Promise<string> => {
      return await getMarketData(name, "52 week high");
    },
  }),

  get52WeekLow: tool({
    description:
      "Useful when you need to get 52 Week Low finance data for a specific country, passing country name to the function",
    parameters: NameSchema,
    execute: async ({ name }: { name: string }): Promise<string> => {
      return await getMarketData(name, "52 week low");
    },
  }),

  getTopGainers: tool({
    description:
      "Useful when you need to get Top Stock Gainers for a specific country, passing country name to the function",
    parameters: NameSchema,
    execute: async ({ name }: { name: string }): Promise<string> => {
      return await getMarketData(name, "Top Stock Gainers");
    },
  }),

  getTopLosers: tool({
    description:
      "Useful when you need to get Top Stock Losers for a specific country, passing country name to the function",
    parameters: NameSchema,
    execute: async ({ name }: { name: string }): Promise<string> => {
      return await getMarketData(name, "Top Stock Losers");
    },
  }),

  getMostActive: tool({
    description:
      "Useful when you need to get Most Active Stocks for a specific country, passing country name to the function",
    parameters: NameSchema,
    execute: async ({ name }: { name: string }): Promise<string> => {
      return await getMarketData(name, "Most Active Stocks");
    },
  }),

  getIndexData: tool({
    description: `Use this tool in the following circumstances:
        - When you need to get the overall market condition.
        - When you need to get the market index data.
        - Useful when you need to predict the market future.
        Pass the country code to the function. Available countries: "BD"`,
    parameters: CountrySchema,
    execute: async ({
      country,
    }: {
      country: string;
    }): Promise<IndexData | null> => {
      return await getIndexData(country);
    },
  }),
} as const;

const getSystemContent = (username: string): string => {
  return `You are DutyAI, a large language model trained by Duty Inc, based on the D-BD architecture. You are a share market analyst with extensive knowledge and experience in the stock market.
You do not make things up, you will try as hard as possible to gather news & financial data to provide insights, analysis, potential concerns, predictions and investment decision.

Knowledge cutoff: 2024-01
Current date: ${new Date().toISOString()}

Always answer in Bangla unless the user specifically requests English.**
If the user does not mention the language, default to Bangla and ensure the response is as detailed and in-depth as an English response would be.

---

### ✅ News Query Handling (New Addition):

If the user asks anything about **news**, the AI **must use internet access** (where available) to fetch and display **the most recent and relevant news** about the company or topic.

* **Do NOT try to generate news internally** or pull from old backend data unless explicitly requested.
* Clearly mention the news is from internet sources.
* Provide 3–5 bullet points or short paragraphs summarizing the latest events.

---

### ✅ Index Query Handling (New Addition):

If the user asks about a **market index** (e.g., DSEX, S&P 500, Nikkei 225):

* **Never treat the index as a company.**
* Do not give a company-style overview for indices.
* Instead, explain:

  * How the index has been performing recently.
  * What market signals or trends it indicates.
  * A forecast or outlook (if possible).
  * Suggest **relevant technical indicators** such as:

    * MACD crossover
    * RSI level
    * Moving Average position (e.g., above/below 50/200 MA)
    * ADX strength
    * Bollinger Band width or breakout
* Make sure to clearly differentiate between company and index.

---

## 📊 Rating & Label Guide (with Stars)

Use this format for scoring:

**8–10** → Good
**5–7** → Average
**Below 5** → Bad

Examples:

* Score: 8.0 ⭐ (Good)
* Score: 6.0 ⭐☆ (Average)
* Score: 5.0 ⭐☆☆ (Average)
* Score: 4.5 ⭐☆☆☆ (Bad)

> Always use a **data-driven numeric score** (e.g., 7.2, 6.5) with a matching label and optional stars.

---

## 📋 Analysis and Scoring Structure (Mandatory for Every Stock)

All the sections below **must be included** for every stock analysis—**none can be skipped** even if data is missing.

If any data is unavailable, use assumed or placeholder data but still complete the structure.

Fair value must always be **numeric**.
**Stop-loss** must be placed **below a deeper support**, but never call it "support" explicitly.

---

### 🔁 Catching & Prior Analysis Consistency (Critical)

Before any analysis:

* Check if the stock has been analyzed before.
* If yes, summarize the **prior recommendation**:

  * Previous buy/sell
  * Prior stop-loss, take-profit, etc.

Then:

* Compare with the current situation.
* If there is a change in recommendation, **explain why**, using market conditions, new data, or technical shifts.
* Do not contradict prior advice without clear explanation.
* Maintain consistency in buy/sell/TP/SL levels where possible.

---

Use the following information to greet the user:
user_name: ${username}

Note: I want to add a link at the end of the answer. User can click the link to see the chart of the company. So you must add a link like this:
[Show Chart](tv_chart_link)
You can find the tv_chart_link in the content`;
};

// Finance Agent Class with proper typing
class FinanceAgent {
  private query: string;
  // private memory: CoreMessage[];
  private messageId: string;
  private convId: string;
  private username: string;
  private userId: string;

  constructor(
    query: string,
    // memory: CoreMessage[],
    messageId: string,
    convId: string,
    username: string,
    userId: string
  ) {
    this.query = query;
    // this.memory = memory;
    this.messageId = messageId;
    this.convId = convId;
    this.username = username;
    this.userId = userId;
  }

  async createStream() {
    currentUserContext.user_id = this.userId;
    currentUserContext.username = this.username;
    currentUserContext.conversation_id = this.convId;

    try {
      const messages: CoreMessage[] = [
        {
          role: "system",
          content: getSystemContent(this.username),
        },
        // ...this.memory,
        {
          role: "user",
          content: this.query,
        },
      ];

      const result = await streamText({
        model: openai("gpt-4o-mini"),
        messages,
        tools,
      });

      return result;
    } catch (error) {
      console.error("Error in createStream:", error);
      throw error;
    }
  }

  async createGeneration(): Promise<string> {
    currentUserContext.user_id = this.userId;
    currentUserContext.username = this.username;
    currentUserContext.conversation_id = this.convId;

    try {
      const messages: CoreMessage[] = [
        {
          role: "system",
          content: getSystemContent(this.username),
        },
        // ...this.memory,
        {
          role: "user",
          content: this.query,
        },
      ];

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        messages,
        tools,
      });

      // Save message to database (implement your createMessage function)
      // await createMessage(this.messageId, this.convId, result.text, "Finance", this.userId);

      return result.text;
    } catch (error) {
      console.error("Error in createGeneration:", error);
      throw error;
    }
  }

  // Method to save analysis summary to cache
  async saveSummaryToCache(
    symbol: string,
    analysis: string,
    recommendation: string
  ): Promise<void> {
    const summary: CachedSummary = {
      symbol,
      analysis,
      recommendation,
      timestamp: Date.now(),
    };

    await setSummaryToRedis(symbol, this.userId, summary);
  }
}

// Export types for external use
export type {
  NewsArticle,
  IndexData,
  FinanceData,
  CachedSummary,
  UserContext,
  SearchResult,
  MarketDataResponse,
};

export { FinanceAgent, tools, getSystemContent };

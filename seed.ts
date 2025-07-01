import prisma from "@/src/lib/prisma";
import { classifyComment } from "./src/lib/ai.utils";
import { subDays, subMinutes } from "date-fns";
import Parser from "rss-parser";

type CustomItem = {
  title?: string;
  link?: string;
  description?: string;
  content?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: {
    url?: string;
    type?: string;
  };
  "media:content"?: {
    $: {
      url: string;
      medium?: string;
      width?: string;
      height?: string;
    };
  }[];
};

type NormalizedItem = {
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
  image: string | null;
};

const parser: Parser<{}, CustomItem> = new Parser({
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: true }],
      ["enclosure", "enclosure"],
    ],
  },
});

function extractImage(item: CustomItem): string | null {
  if (item["media:content"]?.length) {
    const media = item["media:content"].find((m) => m.$?.url);
    if (media?.$?.url) return media.$.url;
  }

  if (item.enclosure?.url && item.enclosure.type?.startsWith("image")) {
    return item.enclosure.url;
  }

  const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch) return imgMatch[1];

  return null;
}

const main = async () => {
  const feeds = [
    "https://www.somoynews.tv/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://www.reddit.com/.rss",
  ];

  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url);
      console.log(`\n--- Feed: ${feed.title} ---`);

      const normalizedItems: NormalizedItem[] = feed.items
        .slice(0, 5)
        .map((item) => ({
          title: item.title || "",
          url: item.link || "",
          summary:
            item.contentSnippet || item.content || item.description || "",
          publishedAt: item.isoDate || item.pubDate || "",
          image: extractImage(item),
        }));

      normalizedItems.forEach((item) => console.log(item));
    } catch (err: any) {
      console.error(`Failed to fetch ${url}:`, err.message);
    }
  }
};

main();

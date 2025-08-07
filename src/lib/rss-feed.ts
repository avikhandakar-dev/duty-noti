import Parser from "rss-parser";
import { scrapeNews } from "./news-extractor";

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

export async function extractRSSFeed(url: string) {
  try {
    const feed = await parser.parseURL(url);
    const normalizedItems: NormalizedItem[] = feed.items.map((item) => ({
      title: item.title || "",
      url: item.link || "",
      summary: item.contentSnippet || item.content || item.description || "",
      publishedAt: item.isoDate || item.pubDate || "",
      image: extractImage(item),
    }));
    const result = [];
    for (const item of normalizedItems) {
      const newsDetails = await scrapeNews(item.url);
      if (newsDetails.success && newsDetails.data) {
        result.push({
          ...item,
          image: item.image || newsDetails.data.coverPhoto,
          content: newsDetails.data.content,
        });
      } else {
        result.push({
          ...item,
          content: "",
        });
      }
    }
    return result;
  } catch (error) {
    console.log(error);
    return [];
  }
}

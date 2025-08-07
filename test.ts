import { extractRSSFeed } from "./src/lib/rss-feed";

const main = async () => {
  const result = await extractRSSFeed("https://www.somoynews.tv/rss.xml");

  console.log(result);
};

main();

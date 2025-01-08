import prisma from "@/src/lib/prisma";
import { isQuestionStockMarketRelated } from "./src/utils/ai.utils";

const main = async () => {
  const question = "how is the market condition?";
  const res = await isQuestionStockMarketRelated(question);
  console.log(res);
};

main();

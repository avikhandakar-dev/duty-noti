import prisma from "@/src/lib/prisma";
import { classifyComment } from "./src/lib/ai.utils";

const main = async () => {
  //all notifications that created within the last 30 minutes
  const comment = "fuck you";
  const classify = await classifyComment(comment);
  console.log(classify);
};

main();

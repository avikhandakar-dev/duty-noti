import prisma from "@/src/lib/prisma";
import { subDays, subMinutes } from "date-fns";
import { sendPushNotificationsInBatches } from "./src/job/aiService";

const main = async () => {
  const user = await prisma.user.findUnique({
    where: {
      email: "avikhwork@gmail.com",
    },
  });
  const pushTokens = await prisma.pushNotificationToken.findMany({
    where: {
      userId: user?.clerkId,
      token: {
        startsWith: "ExponentPushToken",
      },
    },
  });
  const tokens = pushTokens.map((token) => token.token);
  console.log(tokens);

  await sendPushNotificationsInBatches("Test", "Test", tokens);
};

main();

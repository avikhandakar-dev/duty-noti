import axios from "axios";
import prisma from "../lib/prisma";

const addToAIQueue = (operationType: string) => {
  switch (operationType) {
    case "SEND-PUSH-NOTIFICATION":
      return sendPushNoti;
    case "SEND-PUSH-NOTIFICATION-ANALYSIS":
      return sendPushNotiAnalysis;
    default:
      throw new Error("Invalid operation type");
  }
};

async function sendPushNotificationsInBatches(
  title: string,
  body: string,
  tokens: string[]
) {
  const endpoint = "https://exp.host/--/api/v2/push/send";
  const batchSize = 500;
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
    const { title, body } = data;
    const pushTokens = await prisma.pushNotificationToken.findMany();
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
        tokens.push(token.token);
      }
    }
    await sendPushNotificationsInBatches(title, body, tokens);
    await prisma.notification.createMany({
      data: prismaTransaction,
      skipDuplicates: true,
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}

async function sendPushNotiAnalysis(data: any) {
  try {
    const { title, message, companyName, analysisId } = data;
    const pushTokens = await prisma.pushNotificationToken.findMany();
    const ids: string[] = [];
    const tokens: string[] = [];
    const prismaTransaction: any = [];

    for (let token of pushTokens) {
      const userId = token.userId;

      if (!ids.includes(userId)) {
        prismaTransaction.push({
          userId: userId,
          companyName,
          message,
          logo: "",
          type: "analysis",
          entityId: analysisId,
        });
        ids.push(userId);
        tokens.push(token.token);
      }
    }
    await sendPushNotificationsInBatches(title, message, tokens);
    await prisma.notification.createMany({
      data: prismaTransaction,
      skipDuplicates: true,
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export { addToAIQueue };

import prisma from "@/src/lib/prisma";

const main = async () => {
  //all notifications that created within the last 30 minutes
  const notis = await prisma.notification.deleteMany({
    where: {
      createdAt: {
        gte: new Date(new Date().getTime() - 30 * 60000),
      },
    },
  });

  console.log(notis);
};

main();

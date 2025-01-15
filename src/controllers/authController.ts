import { Request, Response } from "express";
import prisma from "@/src/lib/prisma";
import { BadRequestError, UnAuthenticatedError } from "@/src/errors";
import { StatusCodes } from "http-status-codes";
import { date, z } from "zod";

const getUsersSchema = z.object({
  from: z.coerce.date().default(new Date()),
  to: z.coerce.date().default(new Date()),
  date: z.coerce.date().optional().nullish(),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(200).default(10),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().optional(),
});

const getAllUsers = async (req: any, res: Response) => {
  try {
    const { from, to, q, page, perPage } = getUsersSchema.parse(req.query);
    console.log(from, to, q, page, perPage);

    const offset = (page - 1) * perPage;
    let whereCondition = {};
    if (q) {
      whereCondition = {
        OR: [{ firstName: { contains: q, mode: "insensitive" } }],
      };
    }

    const [items, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: {
          ...(from && { createdAt: { gte: from } }),
          ...(to && { createdAt: { lte: to } }),
          ...whereCondition,
        },
        skip: offset,
        take: perPage,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.user.count({
        where: {
          ...(from && { createdAt: { gte: from } }),
          ...(to && { createdAt: { lte: to } }),
        },
      }),
    ]);
    const totalPages = Math.ceil(totalCount / perPage);
    res
      .status(StatusCodes.OK)
      .json({ users: items, total: totalCount, totalPages });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const getActiveUsers = async (req: Request, res: Response) => {
  try {
    let { from, to, q, page, perPage } = getUsersSchema.parse(req.query);

    console.log(from, to, q, page, perPage);

    const messages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      take: 10000,
      select: {
        conversation: {
          select: {
            userId: true,
          },
        },
      },
    });
    const userIds = messages.map((message) => {
      return message.conversation.userId;
    });

    //unique user ids
    const uniqueUserIds = [...new Set(userIds)];
    console.log(uniqueUserIds);

    const offset = (page - 1) * perPage;
    let whereCondition = {};

    const [items] = await Promise.all([
      prisma.user.findMany({
        where: {
          clerkId: { in: uniqueUserIds as string[] },
        },
        skip: offset,
        take: perPage,
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);
    const totalCount = uniqueUserIds.length;
    const totalPages = Math.ceil(totalCount / perPage);
    res
      .status(StatusCodes.OK)
      .json({ users: items, total: totalCount, totalPages });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

export { getAllUsers, getActiveUsers };

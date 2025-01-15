import { Request, Response } from "express";
import prisma from "@/src/lib/prisma";
import { BadRequestError, UnAuthenticatedError } from "@/src/errors";
import { StatusCodes } from "http-status-codes";
import { date, z } from "zod";

const getUsersSchema = z.object({
  from: z.coerce.date().optional().nullish(),
  to: z.coerce.date().optional().nullish(),
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
          ...whereCondition,
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
    const { from, to, q, page, perPage } = getUsersSchema.parse(req.query);
    console.log(from, to, q, page, perPage);

    const messages = await prisma.message.groupBy({
      by: ["user"],
      where: {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      },
      _count: {
        id: true,
      },
    });
    console.log(messages);

    const userIds = messages.map((message) => {
      return message.user;
    });

    console.log(userIds);

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
          clerkId: { in: userIds as string[] },
        },
        skip: offset,
        take: perPage,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.user.count({
        where: {
          clerkId: { in: userIds as string[] },
          ...(from && { createdAt: { gte: from } }),
          ...(to && { createdAt: { lte: to } }),
          ...whereCondition,
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

export { getAllUsers, getActiveUsers };

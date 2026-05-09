/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user: any = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = await req.json();

    const { messages, chatId, model, tools = [] } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        {
          success: false,
          message: "Messages are required",
        },
        {
          status: 400,
        },
      );
    }

    const latestUserMessage = messages[messages.length - 1];

    if (!latestUserMessage) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid message",
        },
        {
          status: 400,
        },
      );
    }

    const aiResponse = await runAgent(messages, tools, model);

    let chat;

    /**
     * EXISTING CHAT
     */
    if (chatId) {
      chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: user.userId,
        },
      });

      if (!chat) {
        return NextResponse.json(
          {
            success: false,
            message: "Chat not found",
          },
          {
            status: 404,
          },
        );
      }

      await prisma.message.createMany({
        data: [
          {
            role: "user",
            content: latestUserMessage.content,
            chatId,
          },
          {
            role: "assistant",
            content: aiResponse,
            chatId,
          },
        ],
      });
    } else {

    /**
     * NEW CHAT
     */
      const title = latestUserMessage.content.slice(0, 40) || "New Chat";

      chat = await prisma.chat.create({
        data: {
          title,
          userId: user.userId,
        },
      });

      await prisma.message.createMany({
        data: [
          {
            role: "user",
            content: latestUserMessage.content,
            chatId: chat.id,
          },
          {
            role: "assistant",
            content: aiResponse,
            chatId: chat.id,
          },
        ],
      });
    }

    const updatedMessages = await prisma.message.findMany({
      where: {
        chatId: chat.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        role: true,
        content: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: chat.id,
        messages: updatedMessages,
      },
    });
  } catch (error: any) {
    console.error("Chat Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}

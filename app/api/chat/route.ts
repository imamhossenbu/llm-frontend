import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const data = await prisma.chat.findMany();
  return Response.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages = body.messages;

    const response = await runAgent(messages);

    return NextResponse.json({
      success: true,
      message: response,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}

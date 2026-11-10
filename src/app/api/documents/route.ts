import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentRole } from "@/lib/access";

const createDocSchema = z.object({
  title: z.string().trim().max(120, "Title cannot exceed 120 characters").optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch documents owned by the user
    const ownedDocs = await prisma.document.findMany({
      where: { ownerId: user.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        shares: {
          select: {
            id: true,
            userId: true,
            permission: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Fetch documents shared with the user
    const sharedShares = await prisma.documentShare.findMany({
      where: { userId: user.id },
      include: {
        document: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            shares: {
              select: {
                id: true,
                userId: true,
                permission: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const myDocuments = ownedDocs.map((doc) => ({
      ...doc,
      role: "owner" as const,
    }));

    const sharedWithMe = sharedShares.map((share) => ({
      ...share.document,
      role: getDocumentRole(user.id, share.document, share.document.shares),
      myPermission: share.permission,
    }));

    return NextResponse.json({
      myDocuments,
      sharedWithMe,
    });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let title = "Untitled Document";
    try {
      const body = await req.json();
      const parseResult = createDocSchema.safeParse(body);
      if (parseResult.success && parseResult.data.title) {
        title = parseResult.data.title;
      }
    } catch {
      // If no JSON body, use default title
    }

    const defaultContent = {
      type: "doc",
      content: [],
    };

    const document = await prisma.document.create({
      data: {
        title,
        content: defaultContent,
        ownerId: user.id,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        shares: true,
      },
    });

    return NextResponse.json({
      document: {
        ...document,
        role: "owner" as const,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


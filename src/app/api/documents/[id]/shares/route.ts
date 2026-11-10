import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentRole } from "@/lib/access";
import { Permission } from "@prisma/client";

const addShareSchema = z.object({
  email: z.string().trim().email("Please provide a valid email"),
  permission: z.enum(["VIEW", "EDIT", "view", "edit"]),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const role = getDocumentRole(user.id, doc, doc.shares);
    if (!role) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      owner: doc.owner,
      shares: doc.shares,
      isOwner: role === "owner",
    });
  } catch (error) {
    console.error("GET /api/documents/[id]/shares error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { shares: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const role = getDocumentRole(user.id, doc, doc.shares);

    // Only the document owner can share or modify permissions
    if (role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can manage sharing permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = addShareSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, permission: rawPermission } = parseResult.data;
    const targetEmail = email.toLowerCase();

    // Find the user to share with
    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: `User with email "${targetEmail}" does not exist in the system` },
        { status: 404 }
      );
    }

    // Owner cannot share document with themselves
    if (targetUser.id === doc.ownerId) {
      return NextResponse.json(
        { error: "You cannot share a document with yourself (you are the owner)" },
        { status: 400 }
      );
    }

    const permission: Permission =
      rawPermission.toUpperCase() === "EDIT" ? Permission.EDIT : Permission.VIEW;

    // Upsert share
    const share = await prisma.documentShare.upsert({
      where: {
        documentId_userId: {
          documentId: doc.id,
          userId: targetUser.id,
        },
      },
      update: {
        permission,
      },
      create: {
        documentId: doc.id,
        userId: targetUser.id,
        permission,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ share }, { status: 200 });
  } catch (error) {
    console.error("POST /api/documents/[id]/shares error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

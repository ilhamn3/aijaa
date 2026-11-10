import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentRole } from "@/lib/access";
import { Permission } from "@prisma/client";

const shareSchema = z.object({
  email: z.string().trim().email("Please provide a valid email"),
  permission: z.enum(["VIEW", "EDIT", "view", "edit"]),
});

const patchShareSchema = z.object({
  shareId: z.string().optional(),
  email: z.string().trim().email().optional(),
  permission: z.enum(["VIEW", "EDIT", "view", "edit"]),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/documents/[id]/shares
 * Owner only: returns the current share list.
 */
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

    // Only owner can view the share list
    if (role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can view sharing settings" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      owner: doc.owner,
      shares: doc.shares,
      isOwner: true,
    });
  } catch (error) {
    console.error("GET /api/documents/[id]/shares error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/[id]/shares
 * Owner only: share with user by email (upserts on documentId+userId).
 */
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

    // Only owner can manage shares
    if (role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can manage sharing permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = shareSchema.safeParse(body);

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

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: `No user with that email found: "${targetEmail}"` },
        { status: 404 }
      );
    }

    // Owner cannot share document with themselves
    if (targetUser.id === doc.ownerId) {
      return NextResponse.json(
        { error: "Cannot share document with yourself (you are the owner)" },
        { status: 400 }
      );
    }

    const permission: Permission =
      rawPermission.toUpperCase() === "EDIT" ? Permission.EDIT : Permission.VIEW;

    // Upsert share on documentId + userId
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

/**
 * PATCH /api/documents/[id]/shares
 * Owner only: update permission by shareId or email.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    if (role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can update share permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = patchShareSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { shareId, email, permission: rawPermission } = parseResult.data;
    const targetPermission: Permission =
      rawPermission.toUpperCase() === "EDIT" ? Permission.EDIT : Permission.VIEW;

    let updatedShare;

    if (shareId) {
      const existing = await prisma.documentShare.findFirst({
        where: { id: shareId, documentId: id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Share not found" }, { status: 404 });
      }
      updatedShare = await prisma.documentShare.update({
        where: { id: shareId },
        data: { permission: targetPermission },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    } else if (email) {
      const targetUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (!targetUser) {
        return NextResponse.json({ error: "No user with that email found" }, { status: 404 });
      }
      updatedShare = await prisma.documentShare.update({
        where: {
          documentId_userId: {
            documentId: id,
            userId: targetUser.id,
          },
        },
        data: { permission: targetPermission },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    } else {
      return NextResponse.json(
        { error: "Either shareId or email must be provided" },
        { status: 400 }
      );
    }

    return NextResponse.json({ share: updatedShare });
  } catch (error) {
    console.error("PATCH /api/documents/[id]/shares error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]/shares
 * Owner only: revoke share via query parameter (?shareId=... or ?userId=...).
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    if (role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can revoke shares" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get("shareId");
    const userId = searchParams.get("userId");

    if (shareId) {
      await prisma.documentShare.deleteMany({
        where: { id: shareId, documentId: id },
      });
    } else if (userId) {
      await prisma.documentShare.deleteMany({
        where: { userId, documentId: id },
      });
    } else {
      return NextResponse.json(
        { error: "Either shareId or userId must be specified" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documents/[id]/shares error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

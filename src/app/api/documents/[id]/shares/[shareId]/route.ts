import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentRole } from "@/lib/access";
import { Permission } from "@prisma/client";

const updateShareSchema = z.object({
  permission: z.enum(["VIEW", "EDIT", "view", "edit"]),
});

interface RouteParams {
  params: Promise<{ id: string; shareId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, shareId } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { shares: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const role = getDocumentRole(user.id, doc, doc.shares);

    // Only owner can modify share permissions
    if (role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can update share permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = updateShareSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const targetPermission: Permission =
      parseResult.data.permission.toUpperCase() === "EDIT"
        ? Permission.EDIT
        : Permission.VIEW;

    const existingShare = await prisma.documentShare.findFirst({
      where: {
        id: shareId,
        documentId: id,
      },
    });

    if (!existingShare) {
      return NextResponse.json(
        { error: "Share not found on this document" },
        { status: 404 }
      );
    }

    const updatedShare = await prisma.documentShare.update({
      where: { id: shareId },
      data: { permission: targetPermission },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ share: updatedShare });
  } catch (error) {
    console.error("PATCH /api/documents/[id]/shares/[shareId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, shareId } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { shares: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const role = getDocumentRole(user.id, doc, doc.shares);

    // Only owner can revoke shares
    if (role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can revoke shares" },
        { status: 403 }
      );
    }

    // Verify share exists on this document
    const existingShare = await prisma.documentShare.findFirst({
      where: {
        id: shareId,
        documentId: id,
      },
    });

    if (!existingShare) {
      return NextResponse.json(
        { error: "Share not found on this document" },
        { status: 404 }
      );
    }

    await prisma.documentShare.delete({
      where: { id: shareId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documents/[id]/shares/[shareId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

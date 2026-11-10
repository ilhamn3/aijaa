import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentRole } from "@/lib/access";

interface RouteParams {
  params: Promise<{ id: string; shareId: string }>;
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

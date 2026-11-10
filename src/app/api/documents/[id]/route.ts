import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentRole } from "@/lib/access";

const updateDocSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(255).optional(),
  content: z.record(z.string(), z.any()).optional(),
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
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const role = getDocumentRole(user.id, doc, doc.shares);
    if (!role) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({
      document: doc,
      role,
    });
  } catch (error) {
    console.error("GET /api/documents/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        shares: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const role = getDocumentRole(user.id, doc, doc.shares);

    // Enforce role authorization
    if (!role) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
    }

    if (role === "view") {
      return NextResponse.json(
        { error: "Forbidden: You have view-only permissions for this document" },
        { status: 403 }
      );
    }

    // Role is "owner" or "edit" -> allowed to update
    const body = await req.json();
    const parseResult = updateDocSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, content } = parseResult.data;

    // Must provide at least one field to update
    if (title === undefined && content === undefined) {
      return NextResponse.json(
        { error: "At least one of 'title' or 'content' must be provided" },
        { status: 400 }
      );
    }

    const updatedDoc = await prisma.document.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({
      document: updatedDoc,
      role,
    });
  } catch (error) {
    console.error("PATCH /api/documents/[id] error:", error);
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

    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { shares: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const role = getDocumentRole(user.id, doc, doc.shares);

    // Only owner can delete the document
    if (role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can delete this document" },
        { status: 403 }
      );
    }

    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documents/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

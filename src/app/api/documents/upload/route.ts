import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  convertUploadedFileToTipTap,
  getFileExtension,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_EXTENSIONS,
} from "@/lib/convertFile";

// Explicit requirement: Route handler must use export const runtime = "nodejs"
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Please select a .txt, .md, or .docx file." },
        { status: 400 }
      );
    }

    // 1. File Size Validation (max 2MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `File size (${sizeMB}MB) exceeds the maximum limit of 2MB. Please upload a smaller file.`,
        },
        { status: 400 }
      );
    }

    // 2. File Type Validation (.txt, .md, .docx only)
    const ext = getFileExtension(file.name);
    const isSupported = SUPPORTED_EXTENSIONS.includes(
      ext as (typeof SUPPORTED_EXTENSIONS)[number]
    );

    if (!isSupported) {
      return NextResponse.json(
        {
          error: `Unsupported file format "${ext}". Supported types: ${SUPPORTED_EXTENSIONS.join(", ")} (max 2MB).`,
        },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to TipTap JSON structure
    const { title, content } = await convertUploadedFileToTipTap(
      file.name,
      buffer
    );

    // Persist as a new editable document owned by the user
    const document = await prisma.document.create({
      data: {
        title,
        content,
        ownerId: user.id,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        shares: true,
      },
    });

    return NextResponse.json(
      {
        document: {
          ...document,
          role: "owner" as const,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("File upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process uploaded file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

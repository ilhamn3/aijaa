import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  convertUploadedFileToTipTap,
  validateFileType,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_EXTENSIONS,
} from "@/lib/convertFile";

// Route handler must use export const runtime = "nodejs"
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

    // 1. Validate Non-Empty File (400 Bad Request)
    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty (0 bytes)." },
        { status: 400 }
      );
    }

    // 2. Validate File Size: Max 2MB (413 Payload Too Large)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `File size (${sizeMB}MB) exceeds the maximum limit of 2MB. Please upload a smaller file.`,
        },
        { status: 413 }
      );
    }

    // 3. Validate Extension & MIME Type (415 Unsupported Media Type)
    const typeValidation = validateFileType(file.name, file.type);
    if (!typeValidation.isValid) {
      return NextResponse.json(
        {
          error:
            typeValidation.error ||
            `Unsupported media type. Supported formats: ${SUPPORTED_EXTENSIONS.join(", ")} (max 2MB).`,
        },
        { status: 415 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Convert file to TipTap JSON AST (400 on unparseable / empty content)
    let conversionResult;
    try {
      conversionResult = await convertUploadedFileToTipTap(file.name, buffer);
    } catch (parseError) {
      const msg =
        parseError instanceof Error
          ? parseError.message
          : "Failed to parse file content";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { title, content } = conversionResult;

    // 5. Create new editable document in database
    const document = await prisma.document.create({
      data: {
        title: title || "Imported Document",
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

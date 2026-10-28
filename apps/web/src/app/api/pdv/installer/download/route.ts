import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "downloads", "Emporio-PDV-Setup-2.0.0.exe");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Instalador ainda não foi gerado." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const headers = new Headers();
    headers.set("Content-Type", "application/vnd.microsoft.portable-executable");
    headers.set("Content-Disposition", 'attachment; filename="Emporio-PDV-Setup-2.0.0.exe"');
    headers.set("Content-Length", String(fileBuffer.length));

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (err) {
    console.error("Erro no download do instalador:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

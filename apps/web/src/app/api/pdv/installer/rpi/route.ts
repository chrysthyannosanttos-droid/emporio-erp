import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  try {
    const filePath = path.join(process.cwd(), "..", "..", "tools", "rpi-pdv", "firstrun.sh");

    let scriptContent = "";
    if (fs.existsSync(filePath)) {
      scriptContent = fs.readFileSync(filePath, "utf-8");
    } else {
      // Fallback path
      const localToolsPath = path.join(process.cwd(), "tools", "rpi-pdv", "firstrun.sh");
      if (fs.existsSync(localToolsPath)) {
        scriptContent = fs.readFileSync(localToolsPath, "utf-8");
      }
    }

    // Identificar a URL base da requisição atual
    const url = new URL(request.url);
    const host = url.host;
    const protocol = url.protocol;
    const targetUrl = `${protocol}//${host}/pdv`;

    if (scriptContent) {
      scriptContent = scriptContent.replace(
        /SERVER_URL="http:\/\/.*:3000\/pdv"/,
        `SERVER_URL="${targetUrl}"`
      );
    }

    return new NextResponse(scriptContent, {
      status: 200,
      headers: {
        "Content-Type": "text/x-shellscript; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


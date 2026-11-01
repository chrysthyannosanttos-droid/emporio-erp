import fs from "fs";
import path from "path";

const src = "C:/Users/tisup/.gemini/antigravity/brain/309d7d10-0ff8-4046-b80f-870f657d0fbf/.user_uploaded/media_1793311620142_8dc87487.png";
const dst1 = path.join(process.cwd(), "public", "logo-cybertech.png");
const dst2 = path.join(process.cwd(), "public", "logo-cybertech-diamond.png");

if (fs.existsSync(src)) {
  const data = fs.readFileSync(src);
  fs.writeFileSync(dst1, data);
  fs.writeFileSync(dst2, data);
  console.log("Logo copiada com sucesso para public/logo-cybertech.png!");
} else {
  console.error("Arquivo de origem não encontrado:", src);
}


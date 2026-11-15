import { readFile } from "fs/promises";
import { join } from "path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Brami – Saffron Adela Sunny";

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "src/assets/images/brami-naturalna-kozmetika-s-shafran-og.jpg"));
  const logoSrc = `data:image/jpeg;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    <img src={logoSrc} style={{ width: 1200, height: 630, objectFit: "cover" }} />,
    { ...size }
  );
}

import { readFile } from "fs/promises";
import { join } from "path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Brami — Натурална козметика за лице, тяло и коса";

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public/og-logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8f4fc 0%, #ede0f7 55%, #ddc8f0 100%)",
          gap: 32,
        }}
      >
        {/* top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #9f79ac 0%, #432855 100%)",
          }}
        />

        <img
          src={logoSrc}
          style={{ width: 360, height: "auto", objectFit: "contain" }}
        />

        <div
          style={{
            fontSize: 28,
            color: "#6b587f",
            letterSpacing: "0.06em",
          }}
        >
          Натурална козметика за лице, тяло и коса
        </div>

        {/* bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #9f79ac 0%, #432855 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}

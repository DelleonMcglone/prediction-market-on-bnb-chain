import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Igbo Labs · Prediction Market Demo";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#0a0a0c",
          color: "#f0f0f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 22, letterSpacing: 4, color: "#78788a" }}>
            IGBO LABS · CASE STUDY № 007
          </div>
          <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.05, maxWidth: 1050 }}>
            Prediction markets on BNB testnet
          </div>
          <div style={{ fontSize: 32, color: "#78788a", marginTop: 16 }}>
            LMSR pricing · no real money · create, trade, resolve, claim
          </div>
        </div>

        {/* Mock price bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 28,
              fontFamily: "monospace",
            }}
          >
            <div style={{ color: "#3cc882" }}>YES 54¢</div>
            <div style={{ color: "#e65064" }}>NO 46¢</div>
          </div>
          <div
            style={{
              display: "flex",
              height: 12,
              borderRadius: 9999,
              overflow: "hidden",
              backgroundColor: "rgba(230, 80, 100, 0.3)",
            }}
          >
            <div style={{ width: "54%", backgroundColor: "#3cc882" }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}

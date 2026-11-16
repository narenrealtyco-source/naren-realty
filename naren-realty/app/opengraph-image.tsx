import { ImageResponse } from "next/og";

export const alt = "NAREN REALTY property listings";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "76px",
          background: "linear-gradient(135deg, #10243A 0%, #173D5B 100%)",
          color: "#FFFFFF",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: 5, color: "#F2C46D" }}>
          NAREN REALTY
        </div>
        <div style={{ display: "flex", marginTop: 38, fontSize: 64, lineHeight: 1.12, fontWeight: 700, maxWidth: 1000 }}>
          Find your place.
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 34, color: "#D9E4EF" }}>
          Verified rentals · Resale · PG · Short stays
        </div>
        <div style={{ display: "flex", marginTop: 54, fontSize: 25, color: "#F2C46D" }}>
          Property details and enquiries at NAREN REALTY
        </div>
      </div>
    ),
    { ...size },
  );
}

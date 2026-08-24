"use client";
import BottomNav from "@/components/BottomNav";

export default function MorePage() {
  return (
    <>
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "#F7F7F7" }}
      >
        <p className="text-4xl mb-3">•••</p>
        <h1 className="wordmark text-2xl" style={{ color: "#1E1830" }}>
          More
        </h1>
        <p className="text-sm mt-2" style={{ color: "#B0A8C8" }}>
          Settings &amp; profile — coming soon
        </p>
      </div>
      <BottomNav />
    </>
  );
}

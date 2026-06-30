"use client";

import { useRouter, usePathname } from "next/navigation";

type Tab = "home" | "house" | "meals" | "vault" | "more";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function HomeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function SparkleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0115.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z" />
    </svg>
  );
}

function UtensilsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <path d="M21 15V2a5 5 0 00-5 5v6h3.3a1 1 0 01.9.6l.8 3c.3.7-.2 1.4-1 1.4H21v4" />
    </svg>
  );
}

function LockIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function DotsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

const TABS: { id: Tab; label: string; Icon: React.FC<{ size?: number }>; href: string }[] = [
  { id: "home",  label: "Home",  Icon: HomeIcon,     href: "/" },
  { id: "house", label: "House", Icon: SparkleIcon,  href: "/house" },
  { id: "meals", label: "Meals", Icon: UtensilsIcon, href: "/meals" },
  { id: "vault", label: "Vault", Icon: LockIcon,     href: "/vault" },
  { id: "more",  label: "More",  Icon: DotsIcon,     href: "/more" },
];

function pathnameToTab(pathname: string): Tab {
  if (pathname.startsWith("/house")) return "house";
  if (pathname.startsWith("/meals")) return "meals";
  if (pathname.startsWith("/vault")) return "vault";
  if (pathname.startsWith("/more")) return "more";
  return "home";
}

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathnameToTab(pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around"
      style={{
        background: "#FFFFFF",
        borderRadius: "24px 24px 0 0",
        paddingTop: 10,
        paddingLeft: 6,
        paddingRight: 6,
        paddingBottom: "max(28px, env(safe-area-inset-bottom))",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.06)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => router.push(tab.href)}
            className="flex flex-col items-center gap-1"
            style={{ minWidth: 56 }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 34,
                borderRadius: 12,
                background: isActive ? "#EDE8F8" : "transparent",
                color: isActive ? "#5040A0" : "#B0A8C8",
                transition: "background 0.15s",
              }}
            >
              <tab.Icon size={20} />
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: isActive ? "#5040A0" : "#B0A8C8",
                letterSpacing: "0.02em",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

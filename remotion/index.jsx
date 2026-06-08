import React from "react";
import { Composition, AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const fps = 30;
const width = 1080;
const height = 1920;
const sceneLength = 135;

const scenes = [
  {
    title: "Welcome to HHH-FINANCE",
    kicker: "Heart Health Hub",
    body: "This is our shared finance app for orders, expenses, assets, liabilities, and monthly profit.",
    bullets: ["Install it on your phone", "Sign in with your approved email", "Everything syncs automatically"],
    accent: "#147a5c"
  },
  {
    title: "Start by signing in",
    kicker: "One account per person",
    body: "Use your email and password. Once you sign in, the app loads the same shared records on every device.",
    bullets: ["kingfishbamz@gmail.com", "maryamumar917@gmail.com", "No need to paste Supabase keys"],
    accent: "#315e9f"
  },
  {
    title: "Read the dashboard first",
    kicker: "Quick business health check",
    body: "The dashboard shows revenue, expenses, net profit, and founder salary for the month.",
    bullets: ["Founder Salary = 15% of net profit", "Recent activity appears below", "Trends help you compare months"],
    accent: "#d99b2b"
  },
  {
    title: "Log a new order",
    kicker: "Orders page",
    body: "Tap New Order, enter the customer, choose products, add delivery cost, then save.",
    bullets: ["Customer names autocomplete", "Order numbers are automatic", "Profit is calculated for you"],
    accent: "#147a5c"
  },
  {
    title: "Review before saving",
    kicker: "Avoid small mistakes",
    body: "Before tapping Save Order, quickly check product price, product cost, delivery cost, and payment status.",
    bullets: ["Price sold to customer", "Cost of product", "Delivery cost to us"],
    accent: "#b9473f"
  },
  {
    title: "Track expenses",
    kicker: "Expenses page",
    body: "Log data, transport, ads, packaging, and other business costs as soon as they happen.",
    bullets: ["Pick the category", "Enter amount and date", "Add a short note if useful"],
    accent: "#315e9f"
  },
  {
    title: "Assets and liabilities",
    kicker: "Balance sheet habit",
    body: "Use Assets for investments and owned value. Use Liabilities for refunds, debts, and obligations.",
    bullets: ["Assets increase your snapshot", "Open liabilities reduce confidence", "Mark settled obligations clearly"],
    accent: "#147a5c"
  },
  {
    title: "Install on your phone",
    kicker: "Use it like an app",
    body: "Open hhh-finance.netlify.app in your browser, then choose Add to Home Screen or Install App.",
    bullets: ["Works on mobile and laptop", "Use the same login", "Data syncs through Supabase"],
    accent: "#d99b2b"
  }
];

export const RemotionRoot = () => (
  <Composition
    id="HHHFinanceOnboarding"
    component={OnboardingVideo}
    durationInFrames={scenes.length * sceneLength}
    fps={fps}
    width={width}
    height={height}
  />
);

function OnboardingVideo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f6f7f4", fontFamily: "Inter, Arial, sans-serif" }}>
      {scenes.map((scene, index) => (
        <Sequence key={scene.title} from={index * sceneLength} durationInFrames={sceneLength}>
          <Scene scene={scene} index={index} total={scenes.length} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function Scene({ scene, index, total }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const fadeOut = interpolate(frame, [sceneLength - 24, sceneLength], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = enter * fadeOut;
  const y = interpolate(enter, [0, 1], [70, 0]);

  return (
    <AbsoluteFill style={{ padding: 72, opacity, transform: `translateY(${y}px)` }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${scene.accent}18, transparent 52%)` }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
        <Header scene={scene} index={index} total={total} />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
          <div style={{ fontSize: 34, color: scene.accent, fontWeight: 900, textTransform: "uppercase" }}>{scene.kicker}</div>
          <h1 style={{ margin: 0, fontSize: 92, lineHeight: 0.96, color: "#17201d", letterSpacing: 0 }}>{scene.title}</h1>
          <p style={{ margin: 0, fontSize: 42, lineHeight: 1.25, color: "#4d5b55" }}>{scene.body}</p>
          <div style={{ display: "grid", gap: 22, marginTop: 18 }}>
            {scene.bullets.map((bullet, bulletIndex) => (
              <Bullet key={bullet} text={bullet} accent={scene.accent} delay={bulletIndex * 7} />
            ))}
          </div>
        </main>
        <Footer index={index} total={total} accent={scene.accent} />
      </div>
    </AbsoluteFill>
  );
}

function Header({ scene, index, total }) {
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 78, height: 78, borderRadius: 18, display: "grid", placeItems: "center", background: "#b9e0ca", fontSize: 44 }}>ðŸ’°</div>
        <div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#17201d" }}>HHH-FINANCE</div>
          <div style={{ fontSize: 24, color: "#66736d" }}>Heart Health Hub</div>
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: scene.accent }}>{index + 1}/{total}</div>
    </header>
  );
}

function Bullet({ text, accent, delay }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: Math.max(0, frame - 36 - delay), fps, config: { damping: 16, stiffness: 100 } });
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        alignItems: "center",
        opacity: progress,
        transform: `translateX(${interpolate(progress, [0, 1], [40, 0])}px)`,
        padding: "24px 26px",
        background: "white",
        border: "2px solid #dce3dc",
        borderRadius: 14,
        boxShadow: "0 18px 40px rgba(28,42,35,0.08)"
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: accent, color: "white", display: "grid", placeItems: "center", fontWeight: 900 }}>âœ“</div>
      <div style={{ fontSize: 34, color: "#17201d", fontWeight: 800 }}>{text}</div>
    </div>
  );
}

function Footer({ index, total, accent }) {
  return (
    <footer style={{ display: "grid", gap: 18 }}>
      <div style={{ height: 12, background: "#dce3dc", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${((index + 1) / total) * 100}%`, background: accent }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#66736d", fontWeight: 800 }}>
        <span>hhh-finance.netlify.app</span>
        <span>Review details before saving</span>
      </div>
    </footer>
  );
}

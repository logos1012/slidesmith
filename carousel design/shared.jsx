// Shared UI helpers + icon set + small primitives used by both directions.
// Exported to window so other Babel scripts can pull them in.
/* global React */
const { useState, useEffect, useMemo, useRef } = React;

// ─── Inline icons (1.5px stroke, currentColor) ──────────────────────────
const Icon = {
  sparkle: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 5.4L19 10.2l-5.2 1.8L12 17.4l-1.8-5.4L5 10.2l5.2-1.8z"/><path d="M19 4v3M20.5 5.5h-3"/></svg>,
  bolt: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M13 3L4 14h6l-1 7 9-11h-6z"/></svg>,
  check: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11"/></svg>,
  arr: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  search: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>,
  plus: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  hash: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16"/></svg>,
  layers: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5M3 18l9 5 9-5"/></svg>,
  copy: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>,
  shield: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
  alert: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>,
  image: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M3 17l5-5 5 5 3-3 5 5"/></svg>,
  type: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6V4h14v2M9 20h6M12 4v16"/></svg>,
  drop: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3s7 7 7 12a7 7 0 1 1-14 0c0-5 7-12 7-12z"/></svg>,
  lock: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>,
  cloud: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a5 5 0 0 1-1-9.9A6 6 0 0 1 18 9a4 4 0 0 1 0 8z"/></svg>,
  dot: (p) => <svg width={p.s||4} height={p.s||4} viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>,
  dragHandle: (p) => <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="8" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="8" cy="12" r="1.2"/></svg>,
  close: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6l-6 6-6 6"/></svg>,
};

// ─── Pill row of small chips ────────────────────────────────────────────
function ChipRow({ items, active, accent }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map((label, i) => (
        <span key={i} className="tag" style={i === active ? {
          background: accent || "var(--violet)", color: "white", borderColor: "transparent",
          fontWeight: 600,
        } : {}}>{label}</span>
      ))}
    </div>
  );
}

// ─── 9:16 carousel slide preview (reused by editor + caption screens) ───
function SlideMini({ idx, title, sub, accent, w = 96, h = 168, mode = "grad", img }) {
  const bg = mode === "grad"
    ? `linear-gradient(160deg, ${accent} 0%, ${accent}cc 100%)`
    : mode === "image" ? undefined : "var(--surface)";
  return (
    <div style={{
      width: w, height: h, borderRadius: 10, overflow: "hidden", position: "relative",
      background: bg, color: mode === "grad" || mode === "image" ? "white" : "var(--ink)",
      border: mode === "card" ? "1px solid var(--line)" : "none",
      flex: "0 0 auto",
      boxShadow: "0 4px 14px -8px rgba(0,0,0,.25)",
    }}>
      {mode === "image" && (
        <div className="ph-img" style={{ position: "absolute", inset: 0, color: "rgba(255,255,255,.7)" }}>{img || "PHOTO"}</div>
      )}
      <div style={{ position: "absolute", top: 8, left: 10, fontSize: 9, opacity: .75, fontFamily: "var(--font-mono)" }}>
        {String(idx).padStart(2, "0")} / 05
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 10, right: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, marginBottom: 4, textWrap: "balance" }}>{title}</div>
        {sub && <div style={{ fontSize: 9, opacity: .8, lineHeight: 1.4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── App-chrome bits ────────────────────────────────────────────────────
function TopBar({ tone = "aurora", title = "Slidesmith", crumbs = [], right }) {
  return (
    <div style={{
      height: 48, padding: "0 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: "1px solid var(--line)",
      background: "var(--surface)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Logo tone={tone} />
        <div style={{ width: 1, height: 18, background: "var(--line)" }}/>
        {crumbs.map((c, i) => (
          <span key={i} style={{ fontSize: 12, color: i === crumbs.length - 1 ? "var(--ink)" : "var(--ink-3)", fontWeight: i === crumbs.length-1 ? 600 : 500 }}>
            {c}{i < crumbs.length - 1 && <span style={{ margin: "0 8px", color: "var(--ink-3)" }}>›</span>}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{right}</div>
    </div>
  );
}

function Logo({ tone = "aurora", size = 22 }) {
  if (tone === "hangang") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: size, height: size, borderRadius: 4,
          background: "var(--mint)", color: "white",
          display: "grid", placeItems: "center", fontWeight: 700,
          fontFamily: "var(--font-serif)", fontSize: 13,
        }}>S</div>
        <div className="serif" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>Slidesmith</div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: size, height: size, borderRadius: 6,
        background: "var(--grad-button)",
        boxShadow: "0 2px 8px -2px rgba(124,92,255,.5)",
        position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 4, background: "white", borderRadius: 3, opacity: .9 }}/>
        <div style={{ position: "absolute", left: 6, top: 6, width: 6, height: 14, background: "var(--violet)", borderRadius: 1 }}/>
        <div style={{ position: "absolute", right: 6, top: 6, width: 6, height: 14, background: "var(--pink)", borderRadius: 1 }}/>
      </div>
      <div style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>Slidesmith</div>
    </div>
  );
}

// ─── Sidebar (desktop nav) ──────────────────────────────────────────────
function Sidebar({ items, active }) {
  return (
    <div style={{
      width: 64, padding: "16px 0",
      borderRight: "1px solid var(--line)", background: "var(--surface)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          width: 44, height: 44, borderRadius: 10,
          display: "grid", placeItems: "center",
          background: i === active ? "var(--surface-2)" : "transparent",
          color: i === active ? "var(--ink)" : "var(--ink-3)",
          fontSize: 9, position: "relative",
        }}>
          {i === active && <div style={{ position: "absolute", left: -1, top: 8, bottom: 8, width: 3, borderRadius: 2, background: "var(--violet, var(--mint))" }}/>}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {it.icon}
            <div style={{ fontWeight: 500 }}>{it.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Icon, ChipRow, SlideMini, TopBar, Sidebar, Logo });

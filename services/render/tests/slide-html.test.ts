// wrapSlideHtml — Cycle 2 정식. Pure function, no mocks.
import { describe, expect, it } from "vitest";
import {
  DIMENSIONS,
  resolveDimensions,
  wrapSlideHtml,
} from "../src/lib/slide-html.js";

describe("wrapSlideHtml (Cycle 2)", () => {
  it("uses the correct dimensions per aspect ratio", () => {
    expect(DIMENSIONS["1:1"]).toEqual({ width: 1080, height: 1080 });
    expect(DIMENSIONS["4:5"]).toEqual({ width: 1080, height: 1350 });
    expect(DIMENSIONS["9:16"]).toEqual({ width: 1080, height: 1920 });
  });

  it("wraps slide html inside .slide-preview-container with Pretendard", () => {
    const html = wrapSlideHtml({
      slideHtml: '<h1 data-test="t">안녕</h1>',
      aspectRatio: "4:5",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('lang="ko"');
    expect(html).toContain("Pretendard Variable");
    expect(html).toContain("Noto Serif KR");
    expect(html).toContain('class="slide-preview-container"');
    expect(html).toContain("width: 1080px");
    expect(html).toContain("height: 1350px");
    expect(html).toContain('<h1 data-test="t">안녕</h1>');
  });

  // Cycle 3 — DESIGN-v3 §2-1 Editorial split: serif heading + sans body.
  it("uses Noto Serif KR for headings and Pretendard for body by default", () => {
    const html = wrapSlideHtml({
      slideHtml: "<h1>안녕하세요 ㄱㄴㄷ ㅁㅂㅅ</h1><p>본문</p>",
      aspectRatio: "1:1",
    });
    expect(html).toContain("--brand-font-heading: 'Noto Serif KR'");
    expect(html).toContain("--brand-font-body: 'Pretendard Variable'");
    // Korean characters preserved verbatim into the slide page.
    expect(html).toContain("안녕하세요 ㄱㄴㄷ ㅁㅂㅅ");
  });

  // Cycle 3 — explicit `size` overrides the aspectRatio default.
  it("size override drives the inline width/height (9:16 + 4:5 + custom)", () => {
    const portrait = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "9:16",
      size: { width: 1080, height: 1920 },
    });
    expect(portrait).toContain("width: 1080px");
    expect(portrait).toContain("height: 1920px");

    const insta = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "4:5",
      size: { width: 1080, height: 1350 },
    });
    expect(insta).toContain("height: 1350px");

    // Arbitrary print-style size still works without a SPEC change.
    const oddball = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      size: { width: 1200, height: 1800 },
    });
    expect(oddball).toContain("width: 1200px");
    expect(oddball).toContain("height: 1800px");
  });

  it("resolveDimensions falls back to DIMENSIONS[aspectRatio] when size omitted", () => {
    expect(resolveDimensions("9:16")).toEqual({ width: 1080, height: 1920 });
    expect(resolveDimensions("4:5")).toEqual({ width: 1080, height: 1350 });
    expect(resolveDimensions("1:1", { width: 800, height: 800 })).toEqual({
      width: 800,
      height: 800,
    });
  });

  it("propagates brand DSL primary color to scoped CSS variables", () => {
    const html = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      brandDSL: { colors: { primary: "#ff0066" } },
    });
    // Scoped under .slide-preview-container, NOT :root
    expect(html).toContain("--brand-color-primary: #ff0066");
    expect(html).not.toContain(":root");
  });

  it("emits 1px frame for an explicitly weak-tone brand color", () => {
    const html = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      brandDSL: { colors: { primary: "#5577AA" } }, // S < 80, L > 30
    });
    expect(html).toContain('data-frame-thickness="1"');
    expect(html).toContain('data-strong-color="false"');
  });

  it("switches to 2px adaptive frame for strong-color brand (saturation > 80)", () => {
    const html = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      brandDSL: { colors: { primary: "#ff0000" } },
    });
    expect(html).toContain('data-frame-thickness="2"');
    expect(html).toContain('data-strong-color="true"');
  });

  it("switches to 2px adaptive frame for low-luminance brand (lightness < 30)", () => {
    const html = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      brandDSL: { colors: { primary: "#1a1a1a" } },
    });
    expect(html).toContain('data-frame-thickness="2"');
    expect(html).toContain('data-strong-color="true"');
  });

  it("omits the watermark when watermark.enabled is false", () => {
    const html = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      watermark: { enabled: false },
    });
    expect(html).not.toContain('data-testid="watermark"');
  });

  it("emits a watermark with default text + auto color", () => {
    const html = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      brandDSL: { colors: { primary: "#3366ff" } },
    });
    expect(html).toContain('data-testid="watermark"');
    expect(html).toContain("made with slidesmith");
  });

  it("falls back to #999 watermark color for very-bright brand (lightest L > 80)", () => {
    // Lime is the canonical DESIGN-v3 §8-2 example.
    const html = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      brandDSL: { colors: { primary: "#7CFC00" } },
    });
    expect(html).toMatch(/data-watermark-color="#999/);
  });

  it("escapes HTML in watermark text + sanitizes brand color injection", () => {
    const html = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      brandDSL: { colors: { primary: "red; } body { background: url(x); }" } },
      watermark: { text: '"><script>alert(1)</script>' },
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("background: url(x)");
    // sanitized fallback color (Loop 2 Aurora swap: ink-deep #170d2e default).
    expect(html).toContain("--brand-color-primary: #170d2e");
  });

  it("supports bottom-left and bottom-center watermark positions", () => {
    const left = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      watermark: { position: "bottom-left" },
    });
    const center = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      watermark: { position: "bottom-center" },
    });
    expect(left).toContain("left: 24px;");
    expect(center).toContain("translateX(-50%)");
  });
});

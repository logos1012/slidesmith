// main.jsx — wires the design canvas with all 16 artboards + tweaks panel.
/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard, DCPostIt,
   AuroraLanding, AuroraBrief, AuroraCopy, AuroraEditor, AuroraCaption,
   AuroraModeration, AuroraSaga, AuroraHealth,
   HangangLanding, HangangBrief, HangangCopy, HangangEditor, HangangCaption,
   HangangModeration, HangangSaga, HangangHealth,
   useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakSlider, TweakSelect, TweakToggle */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "auroraAccent": "#7c5cff",
  "auroraGrad": ["#f1e6d0","#e8c9b0","#c9d4be"],
  "hangangAccent": "#2d7a5f",
  "fontScale": 1.0,
  "radius": "soft",
  "showWatermark": true,
  "density": "comfy"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply tweaks live via CSS vars on root. Aurora gets accent + gradient swap;
  // Hangang gets its own accent. Font-scale and radius scale across both.
  React.useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--tw-aurora-accent", t.auroraAccent);
    r.style.setProperty("--tw-aurora-grad",
      `linear-gradient(135deg, ${t.auroraGrad[0]} 0%, ${t.auroraGrad[1]} 50%, ${t.auroraGrad[2]} 100%)`);
    r.style.setProperty("--tw-aurora-btn",
      `linear-gradient(135deg, ${t.auroraAccent} 0%, ${t.auroraGrad[1]} 100%)`);
    r.style.setProperty("--tw-hangang-accent", t.hangangAccent);
    r.style.setProperty("--tw-font-scale", String(t.fontScale));
    const radii = { sharp: { card: "2px", pill: "4px" }, soft: { card: "12px", pill: "999px" }, plush: { card: "22px", pill: "999px" } }[t.radius];
    r.style.setProperty("--tw-radius-card", radii.card);
    r.style.setProperty("--tw-radius-pill", radii.pill);
  }, [t]);

  return <>
    <DesignCanvas defaultZoom={0.55}>
      <DCSection id="overview" title="슬라이드스미스 / 카루" subtitle="1줄 → 5분 → 카루셀 5장 발행. 두 방향, 8 화면.">
        <DCPostIt x={20} y={-110} w={260} rotation={-2}>
          두 디자인 방향. <b>Aurora</b>는 컬러풀 그라디언트(참고 스크린샷 톤). <b>Hangang</b>은 한국 미니멀 에디토리얼.
          오른쪽 상단 <b>Tweaks</b>를 켜면 색·반경·폰트 스케일을 즉시 비교할 수 있어요.
        </DCPostIt>
      </DCSection>

      <DCSection id="aurora" title="A · Aurora" subtitle="Vibrant gradient direction — Pretendard, soft glass cards, 그라디언트 CTA">
        <DCArtboard id="a01" label="01 · 랜딩 / 홈"      width={1280} height={800}><AuroraLanding/></DCArtboard>
        <DCArtboard id="a02" label="02 · Brief 입력"     width={1280} height={800}><AuroraBrief/></DCArtboard>
        <DCArtboard id="a03" label="03 · AI 카피 (PAS/AIDA/Cialdini)" width={1280} height={800}><AuroraCopy/></DCArtboard>
        <DCArtboard id="a04" label="04 · 에디터"         width={1280} height={800}><AuroraEditor/></DCArtboard>
        <DCArtboard id="a05" label="05 · Caption + 30 해시태그" width={1280} height={800}><AuroraCaption/></DCArtboard>
        <DCArtboard id="a06" label="06 · Moderation 차단" width={1280} height={800}><AuroraModeration/></DCArtboard>
        <DCArtboard id="a07" label="07 · Save / Saga 진행" width={1280} height={800}><AuroraSaga/></DCArtboard>
        <DCArtboard id="a08" label="08 · 9-light 헬스"    width={1280} height={800}><AuroraHealth/></DCArtboard>
      </DCSection>

      <DCSection id="hangang" title="B · Hangang" subtitle="Editorial Korean — IBM Plex Serif + Pretendard, paper bg, mint·coral 1-accent">
        <DCArtboard id="h01" label="01 · 랜딩 / 홈"      width={1280} height={800}><HangangLanding/></DCArtboard>
        <DCArtboard id="h02" label="02 · Brief 입력"     width={1280} height={800}><HangangBrief/></DCArtboard>
        <DCArtboard id="h03" label="03 · AI 카피"         width={1280} height={800}><HangangCopy/></DCArtboard>
        <DCArtboard id="h04" label="04 · 에디터"         width={1280} height={800}><HangangEditor/></DCArtboard>
        <DCArtboard id="h05" label="05 · Caption + 30 해시태그" width={1280} height={800}><HangangCaption/></DCArtboard>
        <DCArtboard id="h06" label="06 · Moderation 차단" width={1280} height={800}><HangangModeration/></DCArtboard>
        <DCArtboard id="h07" label="07 · Save / Saga 진행" width={1280} height={800}><HangangSaga/></DCArtboard>
        <DCArtboard id="h08" label="08 · 9-light 헬스"    width={1280} height={800}><HangangHealth/></DCArtboard>
      </DCSection>
    </DesignCanvas>

    <TweaksPanel title="Tweaks">
      <TweakSection title="Aurora · 컬러풀 방향">
        <TweakColor label="Accent" value={t.auroraAccent} onChange={v => setTweak("auroraAccent", v)}
          options={["#7c5cff","#ff6b9d","#5cb8ff","#46e0c6"]}/>
        <TweakColor label="Hero gradient" value={t.auroraGrad} onChange={v => setTweak("auroraGrad", v)}
          options={[
            ["#f1e6d0","#e8c9b0","#c9d4be"], /* cream · clay · sage  */
            ["#e8d8c2","#d49a85","#8a5a4a"], /* terracotta · adobe   */
            ["#dde6ea","#f1ece1","#3a5a8a"], /* gobaek 백자 + cobalt */
            ["#cfd9c3","#e8e3d2","#7a8a6c"], /* eucalyptus editorial */
            ["#1f1a2e","#3a2a4d","#0d2538"], /* late-night ink       */
          ]}/>
      </TweakSection>
      <TweakSection title="Hangang · 에디토리얼 방향">
        <TweakColor label="Accent" value={t.hangangAccent} onChange={v => setTweak("hangangAccent", v)}
          options={["#2d7a5f","#e0653b","#3a5fcf","#1a1815"]}/>
      </TweakSection>
      <TweakSection title="Type & shape">
        <TweakSlider label="Font scale" min={0.85} max={1.15} step={0.05}
          value={t.fontScale} onChange={v => setTweak("fontScale", v)} formatValue={v => v.toFixed(2) + "×"}/>
        <TweakRadio label="Corner radius" value={t.radius} onChange={v => setTweak("radius", v)}
          options={[{value:"sharp",label:"Sharp"},{value:"soft",label:"Soft"},{value:"plush",label:"Plush"}]}/>
        <TweakRadio label="Density" value={t.density} onChange={v => setTweak("density", v)}
          options={[{value:"compact",label:"Compact"},{value:"comfy",label:"Comfy"}]}/>
        <TweakToggle label="@handle 워터마크" value={t.showWatermark} onChange={v => setTweak("showWatermark", v)}/>
      </TweakSection>
    </TweaksPanel>
  </>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

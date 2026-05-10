// Direction B — Hangang screens 03 (Copy) + 04 (Editor) + 05 (Caption).
/* global React, Icon, ChipRow, SlideMini, TopBar, Logo */

function HangangCopy() {
  const [fw, setFw] = React.useState("PAS");
  const frames = {
    PAS: ["Problem","Agitate","Solution","Proof","CTA"],
    AIDA: ["Attention","Interest","Desire","Action","Bonus"],
    Cialdini: ["Reciprocity","Commitment","Social Proof","Authority","Scarcity"],
  };
  const text = {
    PAS: [
      ["30대 직장인의 90%가 '루틴'에 실패하는 이유","의지력은 09:00에 바닥납니다."],
      ["결국 미루다 6개월이 흐릅니다","사이드 프로젝트 80%가 아이디어 단계에서 멈춥니다."],
      ["출근 전 2시간이 답입니다","같은 시간 · 같은 자리 · 90분."],
      ["21일 / 직장인 김OO 사이드 런칭","MAU 320 → 월 매출 41만원."],
      ["내일 새벽 5시, 시작해 보세요","프로필 링크 → 21일 체크리스트 PDF 무료."],
    ],
    AIDA: [
      ["퇴근 후가 아니라, 출근 전이 진짜","충격적이지만 데이터가 말합니다."],
      ["왜 새벽 5시 기상이 표준이 되었나","12개 인디해커 인터뷰 공통점."],
      ["의지력이 아닌 '환경'으로 굴러갑니다","준비 90초 · 실행 90분."],
      ["오늘부터 적용할 6단계","전날 밤 세팅 → 알람 → 물 → 자리 → 타이머 → 회고."],
      ["21일 챌린지 PDF","프로필 링크 · DM '루틴'."],
    ],
    Cialdini: [
      ["21일 체크리스트 무료","Reciprocity — 댓글에 '시작' 입력."],
      ["지금 댓글 다신 분 312명","Commitment — 공개 약속이 +43% 완주."],
      ["직장인 12명 인터뷰","Social Proof — 공통점 3가지 + 실패 2가지."],
      ["프로덕트헌트 1위 메이커 인용","Authority — '퇴근 후 코딩은 작동하지 않습니다.'"],
      ["오늘 자정까지 1:1 코칭 1회","Scarcity — 선착순 5명 · 9시 마감."],
    ],
  };
  return (
    <div className="frame frame--desktop dir-hangang" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <Logo tone="hangang"/>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>03 / 05  Copy</div>
        <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12, borderRadius: 4, background: "var(--ink)", color: "var(--paper)" }}>Visual →</button>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid var(--line)", padding: 22, background: "var(--paper)" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--ink-3)", marginBottom: 14 }}>FRAMEWORK</div>
          {Object.keys(frames).map(f => (
            <button key={f} onClick={() => setFw(f)} style={{
              display: "block", width: "100%", textAlign: "left", marginBottom: 8,
              padding: "12px 14px", border: "1px solid", borderRadius: 4,
              background: fw === f ? "var(--ink)" : "var(--paper)",
              color: fw === f ? "var(--paper)" : "var(--ink)",
              borderColor: fw === f ? "var(--ink)" : "var(--line-2)",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <div className="serif" style={{ fontSize: 17, fontWeight: 500 }}>{f}</div>
              <div style={{ fontSize: 11, marginTop: 2, opacity: fw === f ? .7 : 1, color: fw === f ? "var(--paper)" : "var(--ink-3)" }}>
                {f === "PAS" ? "문제 → 격앙 → 해결" : f === "AIDA" ? "주의 → 흥미 → 욕구 → 행동" : "6 영향 원리"}
              </div>
            </button>
          ))}
          <div style={{ marginTop: 14, padding: 12, border: "1px dashed var(--line-2)", borderRadius: 4, fontSize: 11, lineHeight: 1.6, color: "var(--ink-2)" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>MODEL</div>
            Claude Sonnet 4.5 · stream<br/>
            <span className="mono" style={{ color: "var(--ink-3)" }}>0.7 · 1.8s · 1,247 tok</span>
          </div>
        </div>
        <div style={{ padding: "26px 32px", overflow: "auto", background: "var(--bg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
            <h3 className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>{fw} · 5장 카피 초안</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 3 }}>다시 생성</button>
              <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 3 }}>변형 +3</button>
            </div>
          </div>
          {text[fw].map(([t,s], i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "60px 1fr", gap: 20,
              padding: "20px 0", borderTop: "1px solid var(--line)",
            }}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>0{i+1}</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--mint)", marginTop: 4, letterSpacing: ".06em", textTransform: "uppercase" }}>{frames[fw][i]}</div>
              </div>
              <div>
                <div className="serif" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.3, letterSpacing: "-0.01em" }}>{t}</div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.6 }}>{s}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11 }}>
                  <span className="mono" style={{ color: "var(--ink-3)" }}>{t.length}자</span>
                  <button style={{ background: "none", border: "none", padding: 0, color: "var(--mint)", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>편집</button>
                  <button style={{ background: "none", border: "none", padding: 0, color: "var(--mint)", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>변형</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HangangEditor() {
  return (
    <div className="frame frame--desktop dir-hangang" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <Logo tone="hangang"/>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>04 / 05  Visual</div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--mint)", padding: "5px 8px", border: "1px solid var(--mint)", borderRadius: 3 }}>● 자동 저장</span>
          <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12, borderRadius: 4, background: "var(--ink)", color: "var(--paper)" }}>Caption →</button>
        </div>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "48px 1fr 280px", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid var(--line)", background: "var(--paper)", padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {[Icon.type, Icon.image, Icon.layers, Icon.drop, Icon.sparkle].map((I, i) => (
            <div key={i} style={{
              width: 36, height: 36, borderRadius: 4, display: "grid", placeItems: "center",
              color: i === 0 ? "var(--paper)" : "var(--ink-3)",
              background: i === 0 ? "var(--ink)" : "transparent",
            }}><I s={15}/></div>
          ))}
        </div>
        <div style={{ background: "var(--bg)", padding: 24, overflow: "auto" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width: 60, height: 75, borderRadius: 2, position: "relative",
                background: ["#2d7a5f","#1a1815","#e0653b","#d49b3b","#2d7a5f"][i],
                outline: i === 1 ? "2px solid var(--ink)" : "1px solid var(--line)",
                outlineOffset: i === 1 ? "2px" : 0,
              }}>
                <span className="mono" style={{ position: "absolute", top: 3, left: 5, fontSize: 9, color: "var(--paper)", opacity: .8 }}>0{i+1}</span>
              </div>
            ))}
            <button style={{ width: 60, height: 75, border: "1px dashed var(--line-2)", borderRadius: 2, background: "transparent", cursor: "pointer", color: "var(--ink-3)" }}>+</button>
          </div>
          <div style={{ display: "grid", placeItems: "center" }}>
            <div style={{
              width: 320, height: 400, borderRadius: 4,
              background: "var(--ink)", color: "var(--paper)",
              padding: 32, position: "relative",
              boxShadow: "0 30px 60px -25px rgba(26,24,21,.4)",
            }}>
              <div className="mono" style={{ position: "absolute", top: 20, left: 24, fontSize: 10, opacity: .6 }}>02 / 05</div>
              <div className="mono" style={{ position: "absolute", top: 20, right: 24, fontSize: 10, opacity: .6 }}>@your_handle</div>
              <div style={{ position: "absolute", left: 24, top: 80, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--coral)", letterSpacing: ".15em" }}>— PAS · AGITATE</div>
              <div className="serif" style={{
                position: "absolute", left: 24, right: 24, top: 110,
                fontSize: 30, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.02em",
              }}>
                결국 미루다<br/>6개월이<br/>흐릅니다.
              </div>
              <div style={{ position: "absolute", left: 24, right: 24, bottom: 60, fontSize: 12, opacity: .85, lineHeight: 1.5 }}>
                사이드 프로젝트 80%가 아이디어 단계에서 멈춤<br/>(2025 인디해커 보고서)
              </div>
              <div style={{ position: "absolute", left: 24, bottom: 24, display: "flex", gap: 3 }}>
                {[0,1,2,3,4].map(i => <div key={i} style={{ width: 18, height: 2, background: i === 1 ? "var(--paper)" : "rgba(254,253,248,.3)" }}/>)}
              </div>
              <div style={{ position: "absolute", left: 16, top: 100, right: 16, height: 110, border: "1px dashed var(--coral)", borderRadius: 2 }}>
                <div className="mono" style={{ position: "absolute", top: -18, left: 0, fontSize: 9, color: "var(--coral)", background: "var(--ink)", padding: "1px 6px" }}>HEADLINE · 26 / 120</div>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 10 }}>1080 × 1350 · 4:5 · 100%</div>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--line)", background: "var(--paper)", overflow: "auto", padding: 20 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".15em", marginBottom: 10 }}>BRAND DSL</div>

          <div style={{ marginBottom: 20 }}>
            <div className="serif" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Palette</div>
            <div style={{ display: "flex", gap: 4 }}>
              {["#1a1815","#2d7a5f","#e0653b","#d49b3b","#fefdf8"].map((c, i) => (
                <div key={i} style={{ width: 30, height: 30, background: c, border: i === 0 ? "2px solid var(--ink)" : "1px solid var(--line-2)", borderRadius: 2, position: "relative" }}>
                  {i === 0 && <div style={{ position: "absolute", inset: -4, border: "1px solid var(--ink)", borderRadius: 4 }}/>}
                </div>
              ))}
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 6 }}>brand-dsl · auto-applied</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="serif" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Typography</div>
            {[["Headline","Plex Serif",30],["Body","Pretendard 500",13],["Caption","Plex Mono",10]].map(([k,v,s], i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, padding: "6px 0", fontSize: 11, borderBottom: i < 2 ? "1px dotted var(--line-2)" : "none" }}>
                <span style={{ fontWeight: 500 }}>{k}</span>
                <span style={{ color: "var(--ink-3)" }}>{v}</span>
                <span className="mono" style={{ color: "var(--ink-3)" }}>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: 10, background: "rgba(45,122,95,.08)", border: "1px solid rgba(45,122,95,.2)", borderRadius: 3, marginBottom: 20, fontSize: 11 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--mint)", marginBottom: 2 }}>한글 안전 영역</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>모든 슬라이드 통과</span>
              <span className="mono" style={{ fontWeight: 600 }}>5/5 ✓</span>
            </div>
          </div>

          <div className="serif" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>워터마크</div>
          {[["우하단 핸들 표시", true],["@logos1012 · slidesmith.app", false]].map(([l, on], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 11 }}>
              <span style={{ color: "var(--ink-2)" }}>{l}</span>
              <div style={{ width: 28, height: 16, borderRadius: 2, background: on ? "var(--mint)" : "var(--line-2)", position: "relative" }}>
                <div style={{ position: "absolute", top: 1, left: on ? 13 : 1, width: 14, height: 14, background: "var(--paper)", borderRadius: 1 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HangangCaption() {
  const tags = ["#아침루틴","#사이드프로젝트","#직장인루틴","#새벽기상","#생산성","#5시기상","#모닝루틴","#자기계발","#인디해커","#1인기업","#사이드잡","#부캐","#개발자루틴","#노션","#타임블로킹","#딥워크","#아침형인간","#작가루틴","#크리에이터","#리얼라이프","#일상기록","#자기관리","#mvp","#사이드허슬","#디지털노마드","#원페이지","#카드뉴스","#인스타그램","#성장기록","#4시반기상"];
  return (
    <div className="frame frame--desktop dir-hangang" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <Logo tone="hangang"/>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>05 / 05  Caption</div>
        <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12, borderRadius: 4, background: "var(--coral)", color: "var(--paper)" }}>Save & Publish</button>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 320px", overflow: "hidden" }}>
        <div style={{ padding: "26px 32px", overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h3 className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Caption</h3>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>1,847 / 2,200</span>
          </div>
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 4, padding: 22, marginBottom: 20, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--ink-2)" }}>{`30대 직장인이 출근 전 2시간으로 사이드 프로젝트를 시작하는 법 — 실제 21일 결과 첨부.

대부분 퇴근 후 의지력으로 시작합니다. 그러나 의지력은 09:00에 바닥납니다. 핵심은 '환경'입니다. 같은 시간 · 같은 자리 · 90분.

→ 프로필 링크 → 21일 체크리스트 PDF 무료 받기
→ 댓글에 '시작' 남기시면 DM으로 보내드립니다.`}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px dotted var(--line-2)" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 3 }}>다시 생성</button>
                <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 3 }}>짧게/길게</button>
              </div>
              <span className="mono" style={{ fontSize: 10, color: "var(--mint)", fontWeight: 600 }}>✓ 5 rules pass</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <h3 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Hashtags</h3>
            <span className="mono" style={{ fontSize: 11, color: "var(--coral)", fontWeight: 600 }}>30 / 30 정확</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {tags.map((t, i) => (
              <span key={i} style={{
                fontSize: 11, padding: "4px 9px", borderRadius: 3,
                background: i < 6 ? "var(--ink)" : "var(--paper)",
                color: i < 6 ? "var(--paper)" : "var(--ink-2)",
                border: i < 6 ? "1px solid var(--ink)" : "1px solid var(--line-2)",
              }}>{t}</span>
            ))}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 24, fontSize: 11 }}>
            <div><span className="serif" style={{ fontSize: 18, fontWeight: 500 }}>6</span> <span style={{ color: "var(--ink-3)" }}>시그니처</span></div>
            <div><span className="serif" style={{ fontSize: 18, fontWeight: 500 }}>14</span> <span style={{ color: "var(--ink-3)" }}>중간 도달</span></div>
            <div><span className="serif" style={{ fontSize: 18, fontWeight: 500 }}>10</span> <span style={{ color: "var(--ink-3)" }}>롱테일</span></div>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--line)", background: "var(--paper)", padding: 20 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--ink-3)", marginBottom: 10 }}>FEED PREVIEW</div>
          <div style={{
            aspectRatio: "4/5", background: "var(--ink)", color: "var(--paper)",
            borderRadius: 3, padding: 18, position: "relative",
          }}>
            <div className="mono" style={{ fontSize: 9, opacity: .6 }}>01 / 05</div>
            <div className="serif" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.2, marginTop: 50, letterSpacing: "-0.01em" }}>
              30대 직장인의<br/>2시간 아침 루틴
            </div>
            <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div className="mono" style={{ fontSize: 9, opacity: .7 }}>@your_handle</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--coral)" }}>BEST 5 →</div>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: 12, border: "1px solid var(--line)", borderRadius: 3 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6, letterSpacing: ".1em" }}>발행 옵션</div>
            {[["예약","화 09:00"],["출력","5장 · 4.2MB"],["저장","S3 + Airtable"]].map(([k,v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, borderTop: i ? "1px dotted var(--line-2)" : "none" }}>
                <span style={{ color: "var(--ink-3)" }}>{k}</span>
                <span className="mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HangangCopy, HangangEditor, HangangCaption });

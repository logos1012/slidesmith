// Direction B — Hangang (한강). Editorial Korean creator app: cream paper,
// deep ink, mint accent, coral CTA. Tighter, serif headlines.
/* global React, Icon, ChipRow, SlideMini, TopBar, Logo */

// ─── B-01 LANDING ───────────────────────────────────────────────────────
function HangangLanding() {
  return (
    <div className="frame frame--desktop dir-hangang" style={{ display: "flex", flexDirection: "column" }}>
      {/* top strip */}
      <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <Logo tone="hangang"/>
        <div style={{ display: "flex", gap: 18, fontSize: 12 }}>
          {["프로젝트","Knowledge","Brand","문서","보안"].map((n, i) => (
            <span key={n} style={{ fontWeight: i === 0 ? 600 : 500, color: i === 0 ? "var(--ink)" : "var(--ink-3)" }}>{n}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>v1.0.0</span>
          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(45,122,95,.1)", color: "var(--mint)", fontWeight: 600 }}>● 4 healthy</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Hero — editorial split */}
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", borderBottom: "1px solid var(--line)", minHeight: 420 }}>
          <div style={{ padding: "48px 56px", display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--paper)" }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--mint)", marginBottom: 18, textTransform: "uppercase" }}>
              ＋  Issue 01 · 솔로 크리에이터
            </div>
            <h1 className="serif" style={{
              fontSize: 56, fontWeight: 600, lineHeight: 1.05, margin: 0,
              letterSpacing: "-0.025em",
            }}>
              한 줄을 카루셀로,<br/>
              <span style={{ fontStyle: "italic", color: "var(--mint)" }}>5분</span>이면 충분합니다.
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--ink-2)", maxWidth: 460, marginTop: 22 }}>
              Brand DSL이 톤·색·폰트를 자동으로 맞추고, PAS·AIDA·Cialdini 같은 검증된 프레임워크가 카피를 깎아줍니다. 한글이 깨지지 않는 HTML 엔진 위에서 굴러갑니다.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
              <button className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 13, borderRadius: 4, background: "var(--ink)", color: "var(--paper)" }}>새 카루셀 만들기 →</button>
              <button className="btn btn-ghost" style={{ padding: "12px 18px", fontSize: 13, borderRadius: 4, background: "transparent", borderColor: "var(--line-2)" }}>README 읽기</button>
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 20, letterSpacing: ".04em" }}>
              local-first · MIT · M2 Mac mini OK · docker compose up
            </div>
          </div>
          <div style={{ background: "var(--grad-hero)", position: "relative", padding: 40, display: "grid", placeItems: "center" }}>
            {/* mock carousel */}
            <div style={{ display: "flex", gap: -20, position: "relative" }}>
              {[
                { c: "#2d7a5f", t: "30대 직장인의\n2시간 아침 루틴", n: "01" },
                { c: "#1a1815", t: "결국 미루다\n6개월이 흐릅니다", n: "02" },
                { c: "#e0653b", t: "출근 전 2시간이\n답입니다", n: "03" },
              ].map((s, i) => (
                <div key={i} style={{
                  width: 140, height: 175, borderRadius: 4,
                  background: s.c, color: "var(--paper)",
                  padding: 14, marginLeft: i ? -28 : 0,
                  transform: `rotate(${(i-1)*4}deg) translateY(${i === 1 ? -8 : 0}px)`,
                  boxShadow: "0 18px 36px -22px rgba(26,24,21,.4)",
                  position: "relative", zIndex: i === 1 ? 2 : 1,
                }}>
                  <div className="mono" style={{ fontSize: 9, opacity: .7 }}>{s.n} / 05</div>
                  <div className="serif" style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.25, marginTop: 36, whiteSpace: "pre-line" }}>{s.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* metrics row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid var(--line)" }}>
          {[
            ["평균 제작 시간", "4m 47s", "Phase 1~6 측정"],
            ["Brand DSL 일관도", "98%", "톤·색·폰트 자동"],
            ["Knowledge seed", "51", "v1.1 → 65 예정"],
            ["테스트 커버리지", "90.59%", "4 서비스 평균"],
          ].map(([k,v,s], i) => (
            <div key={i} style={{ padding: "26px 28px", borderRight: i < 3 ? "1px solid var(--line)" : "none" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>{k}</div>
              <div className="serif" style={{ fontSize: 30, fontWeight: 500, color: "var(--ink)" }}>{v}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* recent / activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr" }}>
          <div style={{ padding: "32px 40px", borderRight: "1px solid var(--line)" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--ink-3)", marginBottom: 14 }}>최근 카루셀 — 12건</div>
            {[
              { t: "직장인 아침 루틴 BEST 5", d: "2026.05.10", s: "발행됨", c: "#2d7a5f" },
              { t: "맥북 초기 세팅 꿀팁", d: "2026.05.09", s: "초안", c: "#1a1815" },
              { t: "사이드 프로젝트 6주 회고", d: "2026.05.08", s: "발행됨", c: "#e0653b" },
              { t: "노션 한 페이지 생산성", d: "2026.05.06", s: "발행됨", c: "#d49b3b" },
            ].map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto auto", gap: 16, alignItems: "center", padding: "16px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ width: 32, height: 40, background: r.c, borderRadius: 2 }}/>
                <div>
                  <div className="serif" style={{ fontSize: 16, fontWeight: 500 }}>{r.t}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{r.d} · 5장 · 1080×1350</div>
                </div>
                <div style={{ fontSize: 11, color: r.s === "발행됨" ? "var(--mint)" : "var(--ink-3)", fontWeight: 600 }}>{r.s}</div>
                <Icon.arr s={14}/>
              </div>
            ))}
          </div>
          <div style={{ padding: "32px 40px" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--ink-3)", marginBottom: 14 }}>이번 주 인사이트</div>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1.35, marginBottom: 16 }}>
              화요일 오전 9시 발행이 평균 <span style={{ color: "var(--coral)" }}>+34%</span> 도달이었습니다. 내일 09:00 예약을 추천합니다.
            </div>
            <div style={{ paddingTop: 14, borderTop: "1px solid var(--line)", fontSize: 12, lineHeight: 1.6, color: "var(--ink-2)" }}>
              — 21일 회고. <i>"퇴근 후가 아니라 출근 전 2시간이 진짜였다"</i>는 발견 이후, 발행 시간을 옮기면서 도달이 바뀌었다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── B-02 BRIEF ─────────────────────────────────────────────────────────
function HangangBrief() {
  return (
    <div className="frame frame--desktop dir-hangang" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <Logo tone="hangang"/>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>새 카루셀 · 01 / 05  Brief</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12, borderRadius: 4 }}>저장하고 나가기</button>
          <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12, borderRadius: 4, background: "var(--ink)", color: "var(--paper)" }}>다음 →</button>
        </div>
      </div>

      {/* dotted step rail */}
      <div style={{ padding: "10px 24px", borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
        <div style={{ display: "flex", maxWidth: 720, margin: "0 auto", gap: 0, alignItems: "center" }}>
          {["Brief","Frame","Copy","Visual","Caption"].map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontSize: 10, color: i === 0 ? "var(--mint)" : "var(--ink-3)" }}>0{i+1}</span>
                <span className="serif" style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "var(--ink)" : "var(--ink-3)" }}>{s}</span>
              </div>
              {i < 4 && <div style={{ flex: 1, height: 1, background: "var(--line)", margin: "0 12px", borderTop: "1px dotted var(--line-2)", border: "none", borderTop: "1px dotted var(--line-2)" }}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: "48px 56px", overflow: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--mint)", marginBottom: 14, textTransform: "uppercase" }}>STEP 01 — BRIEF</div>
          <h2 className="serif" style={{ fontSize: 38, fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            한 줄로 주제를 적어주세요.
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
            구체적일수록 좋아요. <i>누구를 위해 · 무엇을 알리고 싶은지</i>. AI는 이 한 줄을 5장 카루셀과 30개 해시태그로 펼쳐줍니다.
          </p>

          <div style={{ background: "var(--paper)", border: "1px solid var(--ink)", borderRadius: 4, padding: 20 }}>
            <textarea
              defaultValue="30대 직장인이 출근 전 2시간 아침 루틴으로 사이드 프로젝트를 시작하는 법"
              style={{
                width: "100%", border: "none", outline: "none", background: "transparent",
                resize: "none", fontFamily: "var(--font-serif)", fontSize: 22, lineHeight: 1.5,
                color: "var(--ink)", minHeight: 80, fontWeight: 500,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px dotted var(--line-2)" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>42 / 200 chars · 한국어 감지</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 3 }}><Icon.sparkle s={10}/> 다듬기</button>
                <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 3 }}>예시 보기</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            {[
              { t: "톤", o: ["친근한 멘토","객관적 정보","도발적","감성적"], on: 0 },
              { t: "길이", o: ["3장 · 짧게","5장 · 표준","7장 · 깊이","10장 · 가이드"], on: 1 },
              { t: "플랫폼", o: ["Instagram 4:5","Instagram 1:1","Threads 4:5","LinkedIn"], on: 0 },
              { t: "목표", o: ["도달","저장 유도","팔로우","DM 유도"], on: 0 },
            ].map((g, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 24, padding: "18px 0", borderTop: "1px solid var(--line)" }}>
                <div className="serif" style={{ fontSize: 16, fontWeight: 500, paddingTop: 4 }}>{g.t}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {g.o.map((opt, j) => (
                    <button key={j} className="btn" style={{
                      padding: "8px 14px", fontSize: 12, borderRadius: 3, fontWeight: 500,
                      background: j === g.on ? "var(--mint)" : "var(--paper)",
                      color: j === g.on ? "var(--paper)" : "var(--ink-2)",
                      borderColor: j === g.on ? "var(--mint)" : "var(--line-2)",
                    }}>{opt}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: 16, background: "var(--paper)", border: "1px dashed var(--line-2)", borderRadius: 4, display: "flex", alignItems: "center", gap: 14 }}>
            <Icon.layers s={18}/>
            <div style={{ flex: 1 }}>
              <div className="serif" style={{ fontSize: 14, fontWeight: 500 }}>Knowledge 3건이 자동 인용 예정입니다.</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>k-routines-aft · k-cialdini-12 · k-hangul-typography</div>
            </div>
            <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 3 }}>미리보기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HangangLanding, HangangBrief });

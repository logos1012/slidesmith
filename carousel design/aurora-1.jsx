// Direction A — Aurora. Vibrant gradient, glassy cards, friendly creator UI.
/* global React, Icon, ChipRow, SlideMini, TopBar, Sidebar, Logo */
const { useState: useStateA } = React;

// ─────────── 01 LANDING / HOME ───────────
function AuroraLanding() {
  const sideItems = [
    { icon: <Icon.plus s={18}/>, label: "만들기" },
    { icon: <Icon.layers s={18}/>, label: "프로젝트" },
    { icon: <Icon.sparkle s={18}/>, label: "Brand" },
    { icon: <Icon.cloud s={18}/>, label: "Knowledge" },
    { icon: <Icon.shield s={18}/>, label: "보안" },
  ];
  return (
    <div className="frame frame--desktop dir-aurora" style={{ display: "flex" }}>
      <Sidebar items={sideItems} active={0}/>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <TopBar crumbs={["홈"]} right={
          <>
            <span className="tag" style={{ background: "rgba(124,92,255,.08)", color: "var(--violet-2)", borderColor: "rgba(124,92,255,.18)" }}>
              <Icon.dot s={6}/> 4 services healthy
            </span>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--grad-button)" }}/>
          </>
        }/>
        <div style={{ flex: 1, overflow: "auto", padding: 32, background: "var(--grad-hero)" }}>
          <div style={{ maxWidth: 920, margin: "0 auto" }}>
            {/* Hero */}
            <div style={{ paddingTop: 24, paddingBottom: 28, textAlign: "center" }}>
              <div className="tag" style={{ marginBottom: 18, background: "rgba(255,255,255,.6)", borderColor: "rgba(124,92,255,.2)" }}>
                <Icon.sparkle s={11}/> v1.0.0 · 51 Knowledge seed · MIT
              </div>
              <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.05, margin: "0 0 14px", letterSpacing: "-0.03em", textWrap: "balance" }}>
                한 줄을 <span style={{ background: "var(--grad-button)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>5분 카루셀</span>로,<br/>
                한국 솔로 크리에이터를 위한 도구
              </h1>
              <p style={{ color: "var(--ink-2)", fontSize: 16, lineHeight: 1.5, maxWidth: 540, margin: "0 auto 24px" }}>
                Brand DSL이 톤·색·폰트를 자동으로 맞추고, PAS·AIDA·Cialdini 같은 검증된 프레임워크가 카피를 깎아줍니다. 한글이 깨지지 않는 HTML 엔진 위에서.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 6 }}>
                <button className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14 }}>
                  <Icon.sparkle/> 새 카루셀 만들기
                </button>
                <button className="btn btn-ghost" style={{ padding: "12px 18px", background: "rgba(255,255,255,.6)" }}>
                  템플릿 둘러보기
                </button>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                ⌘N · 평균 4분 47초 · 30개 해시태그 자동
              </div>
            </div>

            {/* Demo card */}
            <div style={{
              background: "rgba(255,255,255,.7)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,.8)", borderRadius: 22, padding: 18,
              boxShadow: "0 30px 80px -30px rgba(124,92,255,.35)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="tag" style={{ background: "white", fontWeight: 600 }}>1줄 brief</span>
                  <Icon.arr s={12}/>
                  <span className="tag" style={{ background: "white" }}>frame</span>
                  <Icon.arr s={12}/>
                  <span className="tag" style={{ background: "white" }}>copy</span>
                  <Icon.arr s={12}/>
                  <span className="tag" style={{ background: "white" }}>visual</span>
                  <Icon.arr s={12}/>
                  <span className="tag" style={{ background: "var(--grad-button)", color: "white", borderColor: "transparent", fontWeight: 600 }}>publish</span>
                </div>
                <span className="mono muted" style={{ fontSize: 10 }}>04:32 elapsed</span>
              </div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                <SlideMini idx={1} title="30대 직장인의 2시간 아침 루틴" sub="놓치면 손해" accent="#7c5cff" w={120} h={200}/>
                <SlideMini idx={2} title="새벽 5시 기상의 진짜 이유" sub="PAS — Problem" accent="#9d6bff" w={120} h={200}/>
                <SlideMini idx={3} title="3가지 핵심 습관" sub="PAS — Solution" accent="#c25dff" w={120} h={200}/>
                <SlideMini idx={4} title="실제 21일 결과" sub="증거" accent="#ff5cb1" w={120} h={200}/>
                <SlideMini idx={5} title="오늘 시작해 보세요" sub="CTA" accent="#ff6b9d" w={120} h={200}/>
              </div>
            </div>

            {/* Recent + key value */}
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, marginTop: 22 }}>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>최근 카루셀</div>
                  <span className="muted mono" style={{ fontSize: 10 }}>12건</span>
                </div>
                {[
                  { t: "직장인 아침 루틴 BEST 5", d: "오늘 14:22", s: "published" },
                  { t: "맥북 초기 세팅 꿀팁", d: "어제 09:11", s: "draft" },
                  { t: "사이드 프로젝트 6주 회고", d: "5/8", s: "published" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                    <div style={{ width: 32, height: 40, borderRadius: 4, background: ["#7c5cff","#ff6b9d","#5cb8ff"][i] }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{r.t}</div>
                      <div className="muted mono" style={{ fontSize: 10 }}>{r.d}</div>
                    </div>
                    <span className="tag" style={{ fontSize: 10, background: r.s === "published" ? "rgba(43,182,115,.12)" : "var(--surface-2)", color: r.s === "published" ? "#1d8a55" : "var(--ink-3)", borderColor: "transparent" }}>{r.s}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>이번 주</div>
                {[
                  ["발행", "3 / 5", 60],
                  ["평균 제작 시간", "4m 47s", 88],
                  ["Brand DSL 일관도", "98%", 98],
                ].map(([k,v,p], i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                      <span className="muted-2">{k}</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                    <div className="bar"><i style={{ width: p+"%" }}/></div>
                  </div>
                ))}
                <div style={{ marginTop: 14, padding: 12, background: "var(--surface-2)", borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}><Icon.bolt s={11}/> 이번 주 인사이트</div>
                  <div className="muted-2" style={{ fontSize: 11, lineHeight: 1.5 }}>
                    화요일 오전 9시 발행이 평균 +34% 도달. 내일 09:00 예약을 추천합니다.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── 02 BRIEF (1줄 → 톤·길이·프레임) ───────────
function AuroraBrief() {
  return (
    <div className="frame frame--desktop dir-aurora" style={{ display: "flex", flexDirection: "column" }}>
      <TopBar crumbs={["새 카루셀", "01 / 05  Brief"]} right={
        <>
          <span className="tag mono" style={{ fontSize: 10 }}>저장됨 · 14:22</span>
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>나가기</button>
          <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>다음 단계 <Icon.arr s={12}/></button>
        </>
      }/>
      {/* step rail */}
      <div style={{ padding: "12px 32px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <div style={{ display: "flex", gap: 0, alignItems: "center", maxWidth: 720, margin: "0 auto" }}>
          {["Brief","Frame","Copy","Visual","Caption"].map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: i === 0 ? "var(--grad-button)" : i < 0 ? "var(--violet)" : "var(--surface-2)",
                  color: i === 0 ? "white" : "var(--ink-3)",
                  display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700,
                  border: i === 0 ? "none" : "1px solid var(--line)",
                }}>{i+1}</div>
                <span style={{ fontSize: 12, color: i === 0 ? "var(--ink)" : "var(--ink-3)", fontWeight: i === 0 ? 600 : 500 }}>{s}</span>
              </div>
              {i < 4 && <div style={{ flex: 1, height: 1, background: "var(--line)", margin: "0 12px" }}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: "40px 32px", overflow: "auto", background: "var(--grad-hero)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            한 줄로 카루셀 주제를 알려주세요
          </h2>
          <p className="muted-2" style={{ fontSize: 13, marginBottom: 24 }}>
            구체적일수록 좋아요. 누구를 위해 · 무엇을 알리고 싶은지.
          </p>

          {/* big input */}
          <div style={{
            background: "rgba(255,255,255,.85)", borderRadius: 18,
            padding: 18, border: "1.5px solid var(--violet)",
            boxShadow: "0 0 0 4px rgba(124,92,255,.14)",
          }}>
            <textarea
              defaultValue="30대 직장인이 출근 전 2시간 아침 루틴으로 사이드 프로젝트를 시작하는 법"
              style={{
                width: "100%", border: "none", outline: "none", background: "transparent",
                resize: "none", fontFamily: "inherit", fontSize: 17, lineHeight: 1.5,
                color: "var(--ink)", minHeight: 64,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11 }}>
              <div className="muted mono">42 / 200 chars · 한국어 감지됨</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-soft" style={{ padding: "4px 10px", fontSize: 11 }}><Icon.sparkle s={10}/> AI 다듬기</button>
              </div>
            </div>
          </div>

          {/* options grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 22 }}>
            <OptionGroup title="톤" hint="브랜드 DSL과 충돌 시 경고" options={[
              { k: "친근한 멘토", on: true }, { k: "객관적 정보" }, { k: "도발적" }, { k: "감성적" },
            ]}/>
            <OptionGroup title="길이" hint="권장 5장" options={[
              { k: "3장 · 짧게" }, { k: "5장 · 표준", on: true }, { k: "7장 · 깊이" }, { k: "10장 · 가이드" },
            ]}/>
            <OptionGroup title="플랫폼" options={[
              { k: "Instagram 4:5", on: true }, { k: "Instagram 1:1" }, { k: "Threads 4:5" },
            ]}/>
            <OptionGroup title="목표" options={[
              { k: "도달", on: true }, { k: "저장 유도" }, { k: "팔로우" }, { k: "DM 유도" },
            ]}/>
          </div>

          {/* knowledge attach */}
          <div className="card" style={{ marginTop: 18, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124,92,255,.12)", color: "var(--violet-2)", display: "grid", placeItems: "center" }}>
              <Icon.layers s={18}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Knowledge 3건 자동 인용 예정</div>
              <div className="muted-2 mono" style={{ fontSize: 11 }}>k-routines-aft · k-cialdini-12 · k-hangul-typography</div>
            </div>
            <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>미리보기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function OptionGroup({ title, hint, options }) {
  return (
    <div className="card" style={{ padding: 16, background: "rgba(255,255,255,.8)", backdropFilter: "blur(8px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{title}</div>
        {hint && <div className="muted mono" style={{ fontSize: 10 }}>{hint}</div>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o, i) => (
          <button key={i} className="btn" style={{
            padding: "7px 12px", fontSize: 12, fontWeight: o.on ? 600 : 500,
            background: o.on ? "var(--grad-button)" : "var(--surface-2)",
            color: o.on ? "white" : "var(--ink-2)",
            borderColor: o.on ? "transparent" : "var(--line)",
          }}>{o.k}</button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { AuroraLanding, AuroraBrief, OptionGroup });

// Direction A — Aurora screens 03 (AI copy) + 04 (Editor)
/* global React, Icon, ChipRow, SlideMini, TopBar */

// ─────────── 03 AI COPY (PAS / AIDA / Cialdini toggle) ───────────
function AuroraCopy() {
  const [framework, setFw] = React.useState("PAS");
  const frames = {
    PAS: ["Problem", "Agitate", "Solution", "Proof", "CTA"],
    AIDA: ["Attention", "Interest", "Desire", "Action", "Bonus"],
    Cialdini: ["Reciprocity", "Commitment", "Social Proof", "Authority", "Scarcity"],
  };
  const slides = {
    PAS: [
      { t: "30대 직장인의 90%가 '루틴'에 실패하는 이유", s: "퇴근 후 의지력으로 시작하기 때문 — 의지력은 09:00에 바닥납니다." },
      { t: "결국 미루다 6개월 → 1년 흘러갑니다", s: "사이드 프로젝트 80%가 아이디어 단계에서 멈춤 (2025 인디해커)." },
      { t: "출근 전 2시간이 답입니다", s: "아침엔 의지력이 가장 큽니다. 핵심은 '같은 시간 · 같은 자리 · 90분'." },
      { t: "21일 / 직장인 김OO 사이드 프로젝트 런칭", s: "MAU 320 → 월 매출 41만원. 인터뷰 첨부." },
      { t: "내일 새벽 5시, 시작해 보세요", s: "프로필 링크 → 21일 체크리스트 PDF 무료." },
    ],
    AIDA: [
      { t: "퇴근 후가 아니라, 출근 전 2시간이 진짜입니다", s: "충격적이지만 데이터가 말합니다." },
      { t: "왜 새벽 5시 기상이 사이드 프로젝트의 표준이 되었나", s: "12개 인디해커 인터뷰의 공통점." },
      { t: "이 루틴은 의지력이 아니라 '환경'으로 굴러갑니다", s: "준비 90초 · 실행 90분 · 마무리 30초." },
      { t: "오늘부터 적용 가능한 6단계", s: "전날 밤 세팅 → 알람 → 물 → 자리 → 타이머 → 회고." },
      { t: "21일 챌린지 PDF 받아 보세요", s: "프로필 링크 · DM '루틴' 입력." },
    ],
    Cialdini: [
      { t: "21일 체크리스트 무료 (Reciprocity)", s: "댓글에 '시작' 남기시면 PDF 보내드립니다." },
      { t: "지금 댓글 다신 분 312명 (Commitment)", s: "공개 약속이 완주율을 +43% 올립니다." },
      { t: "직장인 12명 인터뷰 결과 (Social Proof)", s: "공통점 3가지 + 실패 사례 2가지." },
      { t: "프로덕트헌트 1위 메이커 인용 (Authority)", s: "\"퇴근 후 코딩은 거의 작동하지 않습니다.\"" },
      { t: "오늘 자정까지 신청 시 1:1 코칭 1회 (Scarcity)", s: "선착순 5명 · 9시 마감." },
    ],
  };
  return (
    <div className="frame frame--desktop dir-aurora" style={{ display: "flex", flexDirection: "column" }}>
      <TopBar crumbs={["새 카루셀", "03 / 05  Copy"]} right={
        <>
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>← Frame</button>
          <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Visual <Icon.arr s={12}/></button>
        </>
      }/>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "320px 1fr", overflow: "hidden" }}>
        {/* left: framework selector */}
        <div style={{ borderRight: "1px solid var(--line)", padding: 22, background: "var(--surface)", overflow: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-3)", marginBottom: 10 }}>
            카피 프레임워크
          </div>
          {Object.keys(frames).map(f => (
            <button key={f} onClick={() => setFw(f)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "12px 14px", marginBottom: 8,
              borderRadius: 12, border: "1px solid",
              background: framework === f ? "var(--grad-card)" : "var(--surface-2)",
              borderColor: framework === f ? "var(--violet)" : "var(--line)",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{f}</div>
                {framework === f && <Icon.check s={14}/>}
              </div>
              <div className="muted-2" style={{ fontSize: 11, marginTop: 2 }}>
                {f === "PAS" && "문제 → 격앙 → 해결. 인지도형 카루셀에 강함."}
                {f === "AIDA" && "주의 → 흥미 → 욕구 → 행동. 전환형."}
                {f === "Cialdini" && "6 영향 원리. CTA·DM 유도형."}
              </div>
              <div className="mono" style={{ fontSize: 10, marginTop: 6, color: framework === f ? "var(--violet-2)" : "var(--ink-3)" }}>
                {frames[f].slice(0,3).join(" · ")}…
              </div>
            </button>
          ))}
          <div style={{ marginTop: 18, padding: 14, background: "var(--surface-2)", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <Icon.bolt s={11}/> 모델
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Claude Sonnet 4.5</span><span className="muted mono">stream</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>온도</span><span className="mono">0.7</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Knowledge 인용</span><span className="mono">3건</span></div>
            </div>
          </div>
        </div>

        {/* right: streamed slides */}
        <div style={{ padding: "20px 28px", overflow: "auto", background: "var(--bg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{framework} · 5장 카피 초안</h3>
              <div className="muted-2" style={{ fontSize: 12, marginTop: 2 }}>스트리밍 완료 · 1.8s · token 1,247</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-soft" style={{ padding: "6px 10px", fontSize: 11 }}><Icon.sparkle s={10}/> 다시 생성</button>
              <button className="btn btn-soft" style={{ padding: "6px 10px", fontSize: 11 }}><Icon.copy s={10}/> 변형 +3</button>
            </div>
          </div>
          {slides[framework].map((s, i) => (
            <div key={i} className="card" style={{ padding: 16, marginBottom: 10, display: "flex", gap: 14 }}>
              <div style={{
                flex: "0 0 56px", height: 56, borderRadius: 12,
                background: `linear-gradient(160deg, hsl(${260+i*16} 90% 65%), hsl(${300+i*12} 88% 70%))`,
                color: "white", display: "grid", placeItems: "center",
                fontWeight: 700, fontSize: 13,
              }}>
                <div style={{ textAlign: "center", lineHeight: 1.1 }}>
                  <div style={{ fontSize: 9, opacity: .8, fontFamily: "var(--font-mono)" }}>0{i+1}</div>
                  <div style={{ fontSize: 9 }}>{frames[framework][i].slice(0,7)}</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span className="tag" style={{ fontSize: 10, background: "rgba(124,92,255,.1)", color: "var(--violet-2)", borderColor: "transparent" }}>
                    {frames[framework][i]}
                  </span>
                  {i === 2 && <span className="tag" style={{ fontSize: 10, background: "rgba(70,224,198,.15)", color: "#0d8a78", borderColor: "transparent" }}>Knowledge k-routines-aft</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 4, textWrap: "balance" }}>{s.t}</div>
                <div className="muted-2" style={{ fontSize: 12, lineHeight: 1.55 }}>{s.s}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>편집</button>
                <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>변형</button>
                <span className="mono muted" style={{ fontSize: 9 }}>{s.t.length}자</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────── 04 EDITOR (canvas + DSL panel) ───────────
function AuroraEditor() {
  return (
    <div className="frame frame--desktop dir-aurora" style={{ display: "flex", flexDirection: "column" }}>
      <TopBar crumbs={["직장인 아침 루틴", "04 / 05  Visual"]} right={
        <>
          <span className="tag mono" style={{ fontSize: 10, background: "rgba(43,182,115,.12)", color: "#1d8a55", borderColor: "transparent" }}><Icon.dot s={6}/> 자동 저장</span>
          <button className="btn btn-soft" style={{ padding: "6px 10px", fontSize: 11 }}>미리보기</button>
          <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Caption <Icon.arr s={12}/></button>
        </>
      }/>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "56px 1fr 320px", overflow: "hidden" }}>
        {/* left tools */}
        <div style={{ borderRight: "1px solid var(--line)", background: "var(--surface)", padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          {[Icon.type, Icon.image, Icon.layers, Icon.drop, Icon.sparkle].map((I, i) => (
            <div key={i} style={{
              width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center",
              color: i === 0 ? "white" : "var(--ink-3)",
              background: i === 0 ? "var(--grad-button)" : "transparent",
            }}><I s={16}/></div>
          ))}
        </div>

        {/* canvas */}
        <div style={{ background: "var(--bg-deep)", padding: 24, overflow: "auto", position: "relative" }}>
          {/* slide thumbnails strip */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, padding: "8px 0" }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width: 64, height: 80, borderRadius: 6,
                background: i === 1 ? "white" : "var(--surface-2)",
                border: i === 1 ? "2px solid var(--violet)" : "1px solid var(--line)",
                position: "relative", overflow: "hidden", flex: "0 0 auto",
              }}>
                <div style={{ position: "absolute", inset: 4, background: `linear-gradient(160deg, hsl(${260+i*16} 90% 70%), hsl(${300+i*10} 86% 75%))`, borderRadius: 3 }}/>
                <div className="mono" style={{ position: "absolute", top: 2, left: 4, fontSize: 9, color: "white" }}>0{i+1}</div>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ width: 64, height: 80, padding: 0, flexDirection: "column", borderStyle: "dashed", color: "var(--ink-3)" }}>
              <Icon.plus s={14}/>
              <span style={{ fontSize: 10, marginTop: 2 }}>추가</span>
            </button>
          </div>

          {/* main slide */}
          <div style={{ display: "grid", placeItems: "center", paddingBottom: 20 }}>
            <div style={{
              width: 360, height: 450, borderRadius: 14,
              background: "linear-gradient(160deg, #7c5cff 0%, #c25dff 60%, #ff6b9d 100%)",
              boxShadow: "0 30px 80px -30px rgba(124,92,255,.5), 0 0 0 1px rgba(124,92,255,.2)",
              position: "relative", overflow: "hidden", color: "white",
            }}>
              <div style={{ position: "absolute", top: 18, left: 22, fontSize: 11, fontFamily: "var(--font-mono)", opacity: .85 }}>02 / 05</div>
              <div style={{ position: "absolute", top: 18, right: 22, fontSize: 11, opacity: .85 }}>@your_handle</div>
              <div style={{
                position: "absolute", left: 22, top: 90, right: 22,
                fontSize: 30, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em",
              }}>
                결국 미루다<br/>6개월이 흐릅니다
              </div>
              <div style={{ position: "absolute", left: 22, bottom: 110, right: 22, fontSize: 14, opacity: .9, lineHeight: 1.5 }}>
                사이드 프로젝트 80%가 아이디어 단계에서 멈춤<br/>(2025 인디해커 보고서)
              </div>
              <div style={{ position: "absolute", left: 22, bottom: 22, display: "flex", gap: 4 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ width: 22, height: 3, borderRadius: 2, background: i === 1 ? "white" : "rgba(255,255,255,.35)" }}/>
                ))}
              </div>
              {/* selection box */}
              <div style={{ position: "absolute", left: 14, top: 82, right: 14, height: 100, border: "1.5px dashed rgba(255,255,255,.7)", borderRadius: 6 }}>
                <div style={{ position: "absolute", top: -22, left: 0, fontSize: 10, fontFamily: "var(--font-mono)", color: "white", background: "var(--violet-2)", padding: "2px 6px", borderRadius: 4 }}>
                  Headline · 30/120
                </div>
              </div>
            </div>
            <div className="mono muted" style={{ fontSize: 10, marginTop: 8 }}>1080 × 1350 · 4:5 · 100%</div>
          </div>
        </div>

        {/* right panel: Brand DSL */}
        <div style={{ borderLeft: "1px solid var(--line)", background: "var(--surface)", overflow: "auto" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", gap: 4 }}>
            {["Brand DSL", "Layer", "Inspect"].map((t, i) => (
              <button key={t} className="btn" style={{
                padding: "5px 10px", fontSize: 11, flex: 1,
                background: i === 0 ? "var(--surface-2)" : "transparent",
                color: i === 0 ? "var(--ink)" : "var(--ink-3)",
                fontWeight: i === 0 ? 600 : 500, border: "none",
              }}>{t}</button>
            ))}
          </div>
          <div style={{ padding: 16 }}>
            <PanelRow title="Palette" extra={<span className="mono muted" style={{ fontSize: 10 }}>5/5</span>}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#7c5cff","#c25dff","#ff6b9d","#5cb8ff","#170d2e"].map((c, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: c, boxShadow: "0 0 0 1px rgba(0,0,0,.06)" }}/>
                    {i === 0 && <div style={{ position: "absolute", inset: -2, border: "2px solid var(--ink)", borderRadius: 10 }}/>}
                  </div>
                ))}
              </div>
              <div className="mono muted" style={{ fontSize: 10, marginTop: 6 }}>brand-dsl · auto-applied</div>
            </PanelRow>

            <PanelRow title="Typography">
              <div style={{ display: "grid", gap: 6 }}>
                {[["Headline","Pretendard 800","32"],["Body","Pretendard 500","14"],["Caption","JetBrains Mono","11"]].map(([k,v,s], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{k}</span>
                    <span className="muted-2">{v}</span>
                    <span className="mono muted">{s}</span>
                  </div>
                ))}
              </div>
            </PanelRow>

            <PanelRow title="한글 안전 영역" hint="줄바꿈 방지">
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "rgba(70,224,198,.12)", color: "#0a7a6a", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                <span>✓ 모든 슬라이드 통과</span>
                <span className="mono">5/5</span>
              </div>
            </PanelRow>

            <PanelRow title="워터마크">
              <Toggle label="우하단 핸들 표시" on/>
              <Toggle label="@logos1012 · slidesmith.app"/>
            </PanelRow>

            <PanelRow title="배경">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {["Solid","Grad","Photo"].map((m, i) => (
                  <button key={m} className="btn" style={{
                    padding: "8px 4px", fontSize: 11,
                    background: i === 1 ? "var(--grad-card)" : "var(--surface-2)",
                    borderColor: i === 1 ? "var(--violet)" : "var(--line)",
                    color: "var(--ink)",
                  }}>{m}</button>
                ))}
              </div>
            </PanelRow>
          </div>
        </div>
      </div>
    </div>
  );
}
function PanelRow({ title, hint, extra, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-2)" }}>{title}</div>
        {extra || (hint && <span className="muted mono" style={{ fontSize: 10 }}>{hint}</span>)}
      </div>
      {children}
    </div>
  );
}
function Toggle({ label, on }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 12 }}>
      <span style={{ color: "var(--ink-2)" }}>{label}</span>
      <div style={{
        width: 30, height: 18, borderRadius: 99,
        background: on ? "var(--violet)" : "var(--line-2)",
        position: "relative", transition: "background .2s",
      }}>
        <div style={{
          position: "absolute", top: 2, left: on ? 14 : 2,
          width: 14, height: 14, borderRadius: "50%", background: "white",
          transition: "left .2s",
        }}/>
      </div>
    </div>
  );
}

Object.assign(window, { AuroraCopy, AuroraEditor, PanelRow, Toggle });

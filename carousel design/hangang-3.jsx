// Direction B — Hangang screens 06 (Moderation) + 07 (Saga) + 08 (Health).
/* global React, Icon, Logo */

function HangangModeration() {
  return (
    <div className="frame frame--desktop dir-hangang" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <Logo tone="hangang"/>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>Moderation</div>
        <div/>
      </div>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 32, background: "var(--bg)" }}>
        <div style={{ width: "min(680px, 100%)", background: "var(--paper)", border: "1px solid var(--ink)", borderRadius: 4, position: "relative" }}>
          <div style={{ height: 6, background: "var(--coral)" }}/>
          <div style={{ padding: 32 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--coral)", marginBottom: 10, textTransform: "uppercase" }}>
              ▲ MODERATION · KNOWLEDGE.SENSITIVETOPICS
            </div>
            <h2 className="serif" style={{ margin: "0 0 18px", fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em" }}>
              발행이 강제로 정지되었습니다.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)" }}>
              슬라이드 03·04에서 <b>의료 처방·복용량</b> 카테고리가 감지되었습니다. 자격 없는 정보 제공은 사용자 안전 위험으로 카루셀 발행이 일시 정지됩니다.
            </p>

            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--ink-3)", marginBottom: 10 }}>감지된 문장</div>
              {[
                ["03", "하루 1회 비타민 D 5,000IU 복용을 추천합니다.", "복용량 명시 (의료 자격 필요)"],
                ["04", "이 영양제는 면역력을 22% 강화시킵니다.", "효능 단정 (식약처 가이드 위반)"],
              ].map(([n, t, r], i) => (
                <div key={i} style={{ padding: "12px 14px", borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "44px 1fr", gap: 12 }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: "var(--coral)" }}>{n}</div>
                  <div>
                    <div className="serif" style={{ fontSize: 15, fontStyle: "italic" }}>"{t}"</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>— {r}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: 16, background: "var(--bg)", borderRadius: 3, fontSize: 12, lineHeight: 1.7, color: "var(--ink-2)" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--ink-3)", marginBottom: 6 }}>왜 (4-원칙)</div>
              <b>What.</b> 의료/금융/정치는 자격 없는 정보 제공 시 위험.<br/>
              <b>Why.</b> 카루셀은 캡션 없이 빠르게 소비됩니다.<br/>
              <b>Next.</b> 일반 정보 톤으로 다시 쓰거나, "전문가 상담 권유" CTA 추가.<br/>
              <b>Recover.</b> 무시 발행은 운영자 패스워드 + 감사 로그 필요.
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
              <button className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 12, borderRadius: 3 }}>가이드 보기</button>
              <button className="btn btn-soft" style={{ padding: "10px 14px", fontSize: 12, borderRadius: 3 }}>다시 쓰기</button>
              <button className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 12, borderRadius: 3, background: "var(--ink)", color: "var(--paper)" }}>AI 자동 수정</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HangangSaga() {
  return (
    <div className="frame frame--desktop dir-hangang" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <Logo tone="hangang"/>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>Save · Saga</div>
        <div/>
      </div>
      <div style={{ flex: 1, display: "grid", placeItems: "center", background: "var(--bg)", padding: 32 }}>
        <div style={{ width: "min(680px, 100%)", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 4, padding: 32 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--mint)", marginBottom: 8 }}>SAGA · IDEMPOTENT 9F-CA4B2E</div>
          <h2 className="serif" style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 500 }}>저장 중입니다…</h2>
          <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 22 }}>분산 저장 (Airtable + S3) — 보상 가능 단계로 진행됩니다.</p>

          {[
            ["01","LLM 카피 검증 + Brand DSL 적용","done","1.2s"],
            ["02","Render PNG 5장 (Puppeteer 1080×1350)","done","3.8s"],
            ["03","S3 업로드 (presigned PUT × 5)","active","진행 중 · 3 / 5"],
            ["04","Airtable 레코드 생성 + Knowledge 인용","pending",""],
            ["05","Caption + 30 hashtag 저장","pending",""],
          ].map(([n,t,st,tm], i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 14, alignItems: "center",
              padding: "14px 0", borderTop: i ? "1px solid var(--line)" : "none",
            }}>
              <div className="mono" style={{
                fontSize: 11, fontWeight: 600,
                color: st === "done" ? "var(--mint)" : st === "active" ? "var(--coral)" : "var(--ink-3)",
              }}>
                {st === "done" ? "✓" : n}
              </div>
              <div>
                <div className="serif" style={{
                  fontSize: 15, fontWeight: 500,
                  color: st === "pending" ? "var(--ink-3)" : "var(--ink)",
                }}>{t}</div>
                {st === "active" && (
                  <div style={{ marginTop: 6, height: 2, background: "var(--line)", borderRadius: 1, overflow: "hidden" }}>
                    <div style={{ width: "60%", height: "100%", background: "var(--coral)" }}/>
                  </div>
                )}
              </div>
              {tm && <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{tm}</div>}
            </div>
          ))}

          <div style={{ marginTop: 18, padding: 14, border: "1px dashed var(--line-2)", borderRadius: 3, fontSize: 11, lineHeight: 1.6, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 12 }}>
            <Icon.shield s={14}/>
            <div style={{ flex: 1 }}>실패 시 보상 단계가 자동 실행됩니다. 같은 Idempotency-Key로 5회 동시 호출해도 1 saga만 살아남습니다.</div>
            <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 3 }}>로그</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HangangHealth() {
  const lights = [
    ["web","Next.js 16.2.6","up","200 OK · 12ms"],
    ["llm","Hono · Anthropic","up","stream OK · 240ms"],
    ["render","Puppeteer 1.5GB","up","queue 0 · 1.8s"],
    ["storage","Hono · SQLite","up","WAL · 4ms"],
    ["Anthropic","external","up","$1.42 / 5.00"],
    ["Airtable PAT","external","warn","만료 17일 남음"],
    ["AWS S3","ap-northeast-2","up","1.4GB · $0.032"],
    ["Gemini","옵션","down","API key 미설정"],
    ["Saga state","5분 윈도우","up","0 inflight · 0 partial"],
  ];
  return (
    <div className="frame frame--desktop dir-hangang" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <Logo tone="hangang"/>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>관리자 · Health</div>
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>last 30s</span>
      </div>
      <div style={{ flex: 1, padding: "32px 40px", overflow: "auto", background: "var(--bg)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: ".15em", color: "var(--ink-3)", marginBottom: 6 }}>9-LIGHT HEALTH</div>
              <h2 className="serif" style={{ margin: 0, fontSize: 32, fontWeight: 500 }}>운영 진단</h2>
              <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>4 서비스 + 4 외부 의존성 + Saga 상태. 5분 입력으로 끝나는 점검.</p>
            </div>
            <div style={{ display: "flex", gap: 28 }}>
              {[["7","Up","var(--mint)"],["1","Warn","var(--amber)"],["1","Down","var(--coral)"]].map(([n,l,c], i) => (
                <div key={i} style={{ textAlign: "right" }}>
                  <div className="serif" style={{ fontSize: 36, fontWeight: 500, color: c, lineHeight: 1 }}>{n}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4, letterSpacing: ".1em" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 3 }}>
            {lights.map(([k, l, s, v], i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "20px 180px 1fr auto",
                gap: 16, padding: "14px 18px", alignItems: "center",
                borderTop: i ? "1px solid var(--line)" : "none",
              }}>
                <span className={`lite lite-${s} ${s !== "up" ? "lite-pulse" : ""}`}/>
                <div>
                  <div className="serif" style={{ fontSize: 14, fontWeight: 500 }}>{k}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{l}</div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: s === "warn" ? "#a86600" : s === "down" ? "var(--coral)" : "var(--ink-2)" }}>{v}</div>
                {s !== "up" ? (
                  <button className="btn btn-soft" style={{ padding: "4px 10px", fontSize: 10, borderRadius: 3 }}>해결 가이드 →</button>
                ) : <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>OK</span>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 3, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="serif" style={{ fontSize: 16, fontWeight: 500 }}>Saga 활동 · 24h</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>14 완료 · 평균 5.2s · 보상 0회</div>
            </div>
            <svg viewBox="0 0 800 90" style={{ width: "100%", height: 90 }}>
              {[20,40,60,80].map(y => <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="var(--line)" strokeDasharray="2 4"/>)}
              <path d="M0 60 L40 50 L80 65 L120 40 L160 45 L200 30 L240 25 L280 40 L320 20 L360 15 L400 35 L440 22 L480 15 L520 28 L560 22 L600 12 L640 16 L680 8 L720 14 L760 6 L800 12" fill="none" stroke="var(--mint)" strokeWidth="1.5"/>
              {[0,40,80,120,160,200,240,280,320,360,400,440,480,520,560,600,640,680,720,760].map((x, i) => (
                <circle key={i} cx={x} cy={[60,50,65,40,45,30,25,40,20,15,35,22,15,28,22,12,16,8,14,6][i]} r="2" fill="var(--mint)"/>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HangangModeration, HangangSaga, HangangHealth });

// Direction A — Aurora screens 05 (Caption) + 06 (Moderation) + 07 (Saga) + 08 (Health)
/* global React, Icon, ChipRow, SlideMini, TopBar */

// ─────────── 05 CAPTION + 30 hashtags ───────────
function AuroraCaption() {
  const tags = ["#아침루틴","#사이드프로젝트","#직장인루틴","#새벽기상","#생산성","#5시기상","#모닝루틴","#자기계발","#인디해커","#1인기업","#사이드잡","#부캐","#개발자루틴","#노션","#타임블로킹","#딥워크","#아침형인간","#작가루틴","#크리에이터","#리얼라이프","#일상기록","#자기관리","#mvp","#사이드허슬","#디지털노마드","#원페이지","#인스타그램카루셀","#카드뉴스","#성장기록","#4시반기상"];
  return (
    <div className="frame frame--desktop dir-aurora" style={{ display: "flex", flexDirection: "column" }}>
      <TopBar crumbs={["직장인 아침 루틴", "05 / 05  Caption"]} right={
        <>
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>← Visual</button>
          <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Save & Publish <Icon.arr s={12}/></button>
        </>
      }/>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 360px", overflow: "hidden", background: "var(--bg)" }}>
        <div style={{ padding: "24px 28px", overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Instagram Caption</h3>
            <div className="mono muted" style={{ fontSize: 11 }}>1,847 / 2,200 chars</div>
          </div>

          <div className="card" style={{ padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{`30대 직장인이 출근 전 2시간으로 사이드 프로젝트를 시작하는 법 — 실제 21일 결과 첨부.

대부분 퇴근 후 의지력으로 시작합니다. 그러나 의지력은 09:00에 바닥납니다. 핵심은 '환경'입니다. 같은 시간 · 같은 자리 · 90분.

→ 프로필 링크 → 21일 체크리스트 PDF 무료 받기
→ 댓글에 '시작' 남기시면 DM으로 보내드립니다.

저장해 두고 매일 보세요. 21일 후 다시 만나요. 🌅`}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 11 }}><Icon.sparkle s={10}/> 다시 생성</button>
              <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 11 }}><Icon.copy s={10}/> 복사</button>
              <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 11 }}>짧게 / 길게</button>
              <div style={{ flex: 1 }}/>
              <span className="tag" style={{ fontSize: 10, background: "rgba(70,224,198,.14)", color: "#0a7a6a", borderColor: "transparent" }}><Icon.check s={10}/> 5 rules pass</span>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Hashtags</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--violet-2)", fontWeight: 600 }}>30 / 30 정확</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tags.map((t, i) => (
                <span key={i} className="tag" style={{
                  fontSize: 11,
                  background: i < 6 ? "rgba(124,92,255,.1)" : "var(--surface-2)",
                  color: i < 6 ? "var(--violet-2)" : "var(--ink-2)",
                  borderColor: "transparent", fontWeight: i < 6 ? 600 : 500,
                  cursor: "pointer",
                }}>{t}<Icon.close s={9}/></span>
              ))}
              <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: 11, borderStyle: "dashed" }}><Icon.plus s={10}/> 추가</button>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", fontSize: 11 }}>
              <Stat k="시그니처" v="6" tone="violet"/>
              <Stat k="중간 도달" v="14" tone="muted"/>
              <Stat k="롱테일" v="10" tone="muted"/>
            </div>
          </div>
        </div>

        {/* preview column */}
        <div style={{ borderLeft: "1px solid var(--line)", background: "var(--surface)", padding: 18, overflow: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-2)", marginBottom: 10 }}>피드 미리보기</div>
          <div style={{ background: "var(--bg-deep)", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--grad-button)" }}/>
              <div style={{ fontSize: 11, fontWeight: 600 }}>your_handle</div>
              <div style={{ flex: 1 }}/>
              <Icon.dot s={4}/><Icon.dot s={4}/><Icon.dot s={4}/>
            </div>
            <div style={{
              aspectRatio: "4/5", borderRadius: 6, overflow: "hidden",
              background: "linear-gradient(160deg, #7c5cff, #ff6b9d)",
              display: "grid", placeItems: "center", color: "white", padding: 14,
            }}>
              <div style={{ textAlign: "center" }}>
                <div className="mono" style={{ fontSize: 9, opacity: .8, marginBottom: 6 }}>01 / 05</div>
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>30대 직장인의<br/>2시간 아침 루틴</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              {[0,1,2,3,4].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i === 0 ? "var(--violet)" : "var(--line-2)" }}/>)}
            </div>
            <div style={{ fontSize: 11, marginTop: 10, lineHeight: 1.45 }}>
              <b>your_handle</b>  30대 직장인이 출근 전 2시간으로 사이드 프로젝트를 시작하는 법…
            </div>
          </div>
          <div style={{ marginTop: 14, padding: 12, background: "var(--surface-2)", borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>발행 옵션</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0" }}><span className="muted-2">예약</span><span className="mono">화 09:00</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0" }}><span className="muted-2">PNG 1080×1350</span><span className="mono">5장 · 4.2MB</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0" }}><span className="muted-2">저장 위치</span><span className="mono">S3 + Airtable</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
function Stat({ k, v, tone }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: tone === "violet" ? "var(--violet-2)" : "var(--ink)" }}>{v}</div>
      <div className="muted" style={{ fontSize: 10 }}>{k}</div>
    </div>
  );
}

// ─────────── 06 MODERATION block ───────────
function AuroraModeration() {
  return (
    <div className="frame frame--desktop dir-aurora" style={{ display: "flex", flexDirection: "column" }}>
      <TopBar crumbs={["새 카루셀", "Moderation"]}/>
      <div style={{ flex: 1, padding: 32, display: "grid", placeItems: "center", background: "var(--grad-hero)" }}>
        <div className="card" style={{ width: "min(640px, 100%)", padding: 32, background: "rgba(255,255,255,.92)", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(240,74,107,.12)",
              color: "var(--danger)",
              display: "grid", placeItems: "center",
            }}><Icon.alert s={22}/></div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>발행 강제 정지</div>
              <div className="muted-2 mono" style={{ fontSize: 11 }}>Moderation · Knowledge.SensitiveTopics</div>
            </div>
          </div>

          <div style={{ padding: 16, background: "rgba(240,74,107,.06)", borderRadius: 12, border: "1px solid rgba(240,74,107,.18)", marginBottom: 18 }}>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <b>무엇이 일어났나</b><br/>
              <span className="muted-2">슬라이드 03·04에서 <b>의료 처방·복용량</b> 카테고리가 감지되었습니다. 자격 없는 정보 제공은 사용자 안전 위험으로 카루셀 발행이 일시 정지됩니다.</span>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-2)", marginBottom: 8 }}>감지된 문장</div>
            {[
              { slide: 3, text: "하루 1회 비타민 D 5,000IU 복용을 추천합니다.", reason: "복용량 명시 (의료 자격 필요)" },
              { slide: 4, text: "이 영양제는 면역력을 22% 강화시킵니다.", reason: "효능 단정 (식약처 가이드 위반)" },
            ].map((r, i) => (
              <div key={i} style={{ padding: 12, background: "var(--surface-2)", borderRadius: 10, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span className="tag mono" style={{ fontSize: 10, background: "var(--ink)", color: "white", borderColor: "transparent" }}>SLIDE 0{r.slide}</span>
                  <span className="muted mono" style={{ fontSize: 10 }}>{r.reason}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)" }}>"{r.text}"</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-2)", marginBottom: 8 }}>왜 (4-원칙 사용자 메시지)</div>
            <div className="muted-2" style={{ fontSize: 12, lineHeight: 1.6 }}>
              <b>What.</b> 의료/금융/정치는 자격 없는 정보 제공 시 위험.<br/>
              <b>Why.</b> 카루셀은 캡션 없이 빠르게 소비됩니다 — 맥락 손실 시 잘못된 결론 가능.<br/>
              <b>Next.</b> 일반 정보 톤으로 다시 쓰거나, "전문가 상담 권유" CTA 추가.<br/>
              <b>Recover.</b> 무시 발행은 운영자 패스워드로만 가능. 감사 로그 남음.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <button className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 13 }}>Knowledge 가이드 보기</button>
            <button className="btn btn-soft" style={{ padding: "10px 14px", fontSize: 13 }}>이 슬라이드 다시 쓰기</button>
            <button className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 13 }}><Icon.sparkle s={12}/> AI로 자동 수정</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── 07 SAVE / SAGA progress ───────────
function AuroraSaga() {
  return (
    <div className="frame frame--desktop dir-aurora" style={{ display: "flex", flexDirection: "column" }}>
      <TopBar crumbs={["직장인 아침 루틴", "Save"]}/>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 32, background: "var(--grad-hero)" }}>
        <div className="card" style={{ width: "min(680px, 100%)", padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--grad-button)",
              display: "grid", placeItems: "center", color: "white",
            }}><Icon.cloud s={22}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>저장 중 · Saga</div>
              <div className="muted-2" style={{ fontSize: 12 }}>분산 저장(Airtable + S3) — 보상 가능 단계로 진행됩니다.</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>Idempotency 9f-ca4b2e</span>
          </div>

          <div className="bar" style={{ marginBottom: 16 }}><i style={{ width: "62%" }}/></div>

          {[
            { k: "01", t: "LLM 카피 검증 + Brand DSL 적용", st: "done", time: "1.2s" },
            { k: "02", t: "Render PNG 5장 (Puppeteer 1080×1350)", st: "done", time: "3.8s" },
            { k: "03", t: "S3 업로드 (presigned PUT × 5)", st: "active", time: "진행 중 · 3/5" },
            { k: "04", t: "Airtable 레코드 생성 + Knowledge 인용", st: "pending" },
            { k: "05", t: "Caption + 30 hashtag 저장", st: "pending" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: s.st === "done" ? "rgba(43,182,115,.15)" : s.st === "active" ? "var(--grad-button)" : "var(--surface-2)",
                color: s.st === "done" ? "#1d8a55" : s.st === "active" ? "white" : "var(--ink-3)",
                display: "grid", placeItems: "center", flex: "0 0 auto",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
              }}>
                {s.st === "done" ? <Icon.check s={14}/> : s.k}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.st === "pending" ? "var(--ink-3)" : "var(--ink)" }}>{s.t}</div>
                  {s.time && <div className="mono muted" style={{ fontSize: 11 }}>{s.time}</div>}
                </div>
                {s.st === "active" && (
                  <div style={{ marginTop: 6 }}>
                    <div className="bar" style={{ background: "rgba(124,92,255,.12)" }}><i style={{ width: "60%" }}/></div>
                    <div className="muted-2 mono" style={{ fontSize: 10, marginTop: 4 }}>slide-03.png · 412KB · ETag 8c4...</div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 14, padding: 12, background: "var(--surface-2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon.shield s={14}/>
            <div className="muted-2" style={{ fontSize: 11, flex: 1 }}>
              실패 시 보상 단계가 자동 실행됩니다. 같은 Idempotency-Key로 5회 동시 호출해도 1 saga만 살아남음.
            </div>
            <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}>로그</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── 08  9-LIGHT HEALTH dashboard ───────────
function AuroraHealth() {
  const lights = [
    { k: "web", l: "Next.js 16.2.6", s: "up", v: "200 OK · 12ms" },
    { k: "llm", l: "Hono · Anthropic", s: "up", v: "stream OK · 240ms" },
    { k: "render", l: "Puppeteer 1.5GB", s: "up", v: "queue 0 · 1.8s avg" },
    { k: "storage", l: "Hono · SQLite", s: "up", v: "WAL · 4ms" },
    { k: "Anthropic", l: "external", s: "up", v: "$1.42 / 5.00 used" },
    { k: "Airtable PAT", l: "external", s: "warn", v: "만료 17일 남음" },
    { k: "AWS S3", l: "ap-northeast-2", s: "up", v: "1.4GB · $0.032" },
    { k: "Gemini", l: "옵션", s: "down", v: "API key 미설정" },
    { k: "Saga state", l: "5분 윈도우", s: "up", v: "0 inflight · 0 partial" },
  ];
  return (
    <div className="frame frame--desktop dir-aurora" style={{ display: "flex", flexDirection: "column" }}>
      <TopBar crumbs={["관리자", "Health · 9-light"]} right={
        <>
          <span className="mono muted" style={{ fontSize: 11 }}>last 30s</span>
          <button className="btn btn-soft" style={{ padding: "6px 10px", fontSize: 11 }}>새로고침</button>
        </>
      }/>
      <div style={{ flex: 1, padding: 24, overflow: "auto", background: "var(--bg)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>운영 진단 · 9-light</h2>
              <div className="muted-2" style={{ fontSize: 13, marginTop: 4 }}>4 서비스 + 4 외부 의존성 + Saga 상태 · 5분 입력으로 끝나는 운영 점검.</div>
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              <BigStat n="7" l="Up" tone="ok"/>
              <BigStat n="1" l="Warn" tone="warn"/>
              <BigStat n="1" l="Down" tone="bad"/>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 22 }}>
            {lights.map((l, i) => (
              <div key={i} className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span className={`lite lite-${l.s} ${l.s !== "up" ? "lite-pulse" : ""}`}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{l.k}</div>
                    <div className="muted mono" style={{ fontSize: 10 }}>{l.l}</div>
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: l.s === "warn" ? "#a86600" : l.s === "down" ? "var(--danger)" : "var(--ink-2)" }}>
                  {l.v}
                </div>
                {l.s !== "up" && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
                    <button className="btn btn-soft" style={{ padding: "5px 10px", fontSize: 10 }}>해결 가이드</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* sparklines */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Saga · 최근 24h</div>
              <ChipRow items={["1h","6h","24h","7d"]} active={2} accent="var(--violet)"/>
            </div>
            <svg viewBox="0 0 800 110" style={{ width: "100%", height: 110 }}>
              <defs>
                <linearGradient id="sparkA" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7c5cff" stopOpacity=".35"/>
                  <stop offset="100%" stopColor="#7c5cff" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[20,40,60,80,100].map(y => <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="var(--line)" strokeDasharray="2 4"/>)}
              <path d="M0 70 L40 60 L80 75 L120 50 L160 55 L200 40 L240 35 L280 50 L320 30 L360 25 L400 45 L440 30 L480 22 L520 38 L560 30 L600 18 L640 22 L680 14 L720 20 L760 12 L800 18 L800 110 L0 110Z" fill="url(#sparkA)"/>
              <path d="M0 70 L40 60 L80 75 L120 50 L160 55 L200 40 L240 35 L280 50 L320 30 L360 25 L400 45 L440 30 L480 22 L520 38 L560 30 L600 18 L640 22 L680 14 L720 20 L760 12 L800 18" fill="none" stroke="var(--violet)" strokeWidth="2"/>
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11 }}>
              <span className="muted-2">완료 saga · 24h</span>
              <span className="mono"><b>14</b> · 평균 5.2s · 보상 0회 · partial 0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function BigStat({ n, l, tone }) {
  const c = tone === "ok" ? "#2bb673" : tone === "warn" ? "#d9941f" : "var(--danger)";
  return (
    <div style={{ textAlign: "right" }}>
      <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: c, lineHeight: 1 }}>{n}</div>
      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{l}</div>
    </div>
  );
}

Object.assign(window, { AuroraCaption, AuroraModeration, AuroraSaga, AuroraHealth, BigStat, Stat });

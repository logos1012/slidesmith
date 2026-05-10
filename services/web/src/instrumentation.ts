// instrumentation.ts — Next.js 16 server boot hook (SERVICE-web.md §11 Cycle 2 acceptance)
// 서버 시작 시 PersistOrchestrator.recoverIncomplete() 1회 실행 → 미완료 saga 자동 복구.
// Cycle 3 (A2): 정밀 step replay — recover 결과를 stdout 로그로 박제 검증 가능.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { getContainer } = await import('@/lib/container');
  try {
    const c = getContainer();
    const result = await c.persist.recoverIncomplete();
    console.log(`[instrumentation] saga recoverIncomplete: recovered=${result.recovered} orphaned=${result.orphaned}`);
  } catch (err) {
    // saga db 액세스 실패 시 부팅을 막지 않음 (health endpoint는 계속 응답해야 함).
    console.error('[instrumentation] saga recover failed:', err);
  }
}

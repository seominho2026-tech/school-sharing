export type GasRunner = {
  withSuccessHandler(callback: (value: unknown) => void): GasRunner;
  withFailureHandler(callback: (error: { message?: string }) => void): GasRunner;
  schoolApi(request: { action: string; payload: unknown; requestId?: string }): void;
};
declare global {
  interface Window {
    google?: { script?: { run?: GasRunner } };
    __SCHOOL_ASSETS__?: Record<string, string>;
    __SCHOOL_APP_URL__?: string;
    __PDF_WORKER__?: string;
  }
}
export const isAppsScript = () => typeof window !== "undefined" && Boolean(window.google?.script?.run);
export function appUrl(page = "") {
  const base = typeof window !== "undefined" ? window.__SCHOOL_APP_URL__ : undefined;
  return base ? base + (page ? "?page=" + encodeURIComponent(page) : "") : (page === "privacy" ? "/privacy/" : "/");
}
export function gasCall<T>(action: string, payload: unknown = {}, requestId?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = typeof window !== "undefined" && window.google?.script?.run;
    if (!run) return reject(new Error("공유 저장은 학교 Apps Script 주소에서 사용할 수 있습니다."));
    const timeout = setTimeout(() => reject(new Error("응답이 늦습니다. 저장 여부를 새로고침으로 확인한 뒤 다시 시도해 주세요.")), 45000);
    run.withSuccessHandler(value => { clearTimeout(timeout); resolve(value as T); })
      .withFailureHandler(error => { clearTimeout(timeout); reject(new Error(error.message || "요청을 처리하지 못했습니다.")); })
      .schoolApi({ action, payload, requestId });
  });
}

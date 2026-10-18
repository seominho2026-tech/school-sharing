/* public 폴더의 이미지 경로 앞에 basePath 를 붙입니다.
   next.config.ts 의 basePath 는 <img src="..."> 같은 직접 경로에는 적용되지 않아서
   GitHub Pages 하위 경로 배포에서 이미지가 깨지는 것을 막습니다. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string) {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  if (typeof window !== "undefined" && window.__SCHOOL_ASSETS__?.[path]) return window.__SCHOOL_ASSETS__[path];
  return `${basePath}${path}`;
}

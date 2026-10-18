import { SCHOOL_DOMAIN_LIST as SCHOOL_DOMAINS } from "@/config/school";
import { LIMITS } from "./school-limits";
import type { Teacher } from "./school-types";
export function parseTeacherText(text: string): Teacher[] {
  const domain = SCHOOL_DOMAINS[0] ?? "";
  const out: Teacher[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.replace("\r", "").trim();
    if (!line) continue;

    /* 쉼표, 탭, 세미콜론, 두 칸 이상 공백으로 칸을 나눕니다. */
    const cells = line
      .split(/[\t,;]+|\s{2,}/)
      .map(c => c.trim())
      .filter(Boolean);

    /* 칸이 하나뿐이면 "홍길동 hong" 처럼 한 칸 띄어 쓴 것으로 봅니다. */
    const parts = cells.length === 1 ? cells[0].split(/\s+/) : cells;
    if (parts.length < 2) continue;

    const name = parts[0];
    let account = parts[1];
    const dept = parts[2] ?? "";

    if (!account) continue;
    if (!account.includes("@")) account = domain ? account + "@" + domain : account;
    if (!account.includes("@")) continue;

    out.push({
      name: name.slice(0, LIMITS.personName),
      email: account.toLowerCase().slice(0, LIMITS.email),
      dept: dept.slice(0, LIMITS.personName)
    });
  }

  return out;
}


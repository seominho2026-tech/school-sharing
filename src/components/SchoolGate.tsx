"use client";

/* 학교 계정을 Apps Script 서버에서 확인합니다. 로컬 미리보기에서는 저장하지 않습니다. */

import { createContext, useContext, useEffect, useState } from "react";
import { SCHOOL } from "@/config/school";
import { isAppsScript, appUrl } from "@/lib/apps-script";
import InstallButton from "@/components/InstallButton";
import {
  OWNER_EMAIL,
  SCHOOL_DOMAINS,
  isSchoolLoginEnabled,
  signInWithSchool,
  signOutSchool,
  watchMyRole,
  watchUser,
  watchConnectionError,
  type Admin,
  type SchoolUser
} from "@/lib/school";

type GateValue = {
  user: SchoolUser | null;
  /* 편집 권한입니다. 등록되지 않았으면 null 입니다. */
  role: Admin | null;
  /* 권한을 나눠 줄 수 있는 사람인지입니다. */
  isOwner: boolean;
  /* 이 부서의 업무분장·서식·드라이브 링크를 고칠 수 있는지입니다. */
  canEdit: (deptId?: string) => boolean;
  signOut: () => void;
};

const SchoolUserContext = createContext<GateValue>({
  user: null,
  role: null,
  isOwner: false,
  canEdit: () => false,
  signOut: () => {}
});

export function useSchoolUser() {
  return useContext(SchoolUserContext);
}

export default function SchoolGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SchoolUser | null>(null);
  const [role, setRole] = useState<Admin | null>(null);
  const [checked, setChecked] = useState(!isSchoolLoginEnabled);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* 바탕화면 앱으로 설치되게 하는 서비스워커입니다. 로그인 전에도 등록해 둡니다. */
  useEffect(() => {
    if (isAppsScript() || !("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSchoolLoginEnabled) return;
    const unError = watchConnectionError(setError);
    const unUser = watchUser(next => {
      setUser(next);
      setChecked(true);
    });
    return () => { unError(); unUser(); };
  }, []);

  /* 로그인한 사람의 편집 권한을 지켜봅니다. */
  useEffect(() => {
    if (!isSchoolLoginEnabled || !user) {
      setRole(null);
      return;
    }
    return watchMyRole(user.email, setRole);
  }, [user]);

  const isOwner = user?.email === OWNER_EMAIL;

  const value: GateValue = {
    user,
    role,
    isOwner,
    canEdit: (deptId?: string) => {
      if (!user) return false;
      if (isOwner) return true;
      if (!role) return false;
      if (!role.dept) return true;
      return !deptId || role.dept === deptId;
    },
    signOut: () => {
      void signOutSchool();
    }
  };

  /* 로컬에서는 명시적으로 선택한 읽기 전용 미리보기만 제공합니다. */
  if (preview && !isAppsScript()) {
    return <SchoolUserContext.Provider value={value}>{children}</SchoolUserContext.Provider>;
  }

  if (!checked) return null;

  if (user) {
    return <SchoolUserContext.Provider value={value}>{children}</SchoolUserContext.Provider>;
  }

  const login = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithSchool();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sg-root">
      <div className="sg-card">
        <h1 className="sg-title">{SCHOOL.name} {SCHOOL.siteName}</h1>
        <p className="sg-copy">
          학교에서 받은 구글 계정으로 로그인해야 볼 수 있습니다.
          {SCHOOL_DOMAINS.length > 0 ? (
            <>
              <br />
              허용 계정: {SCHOOL_DOMAINS.map(d => `@${d}`).join(", ")}
            </>
          ) : null}
        </p>
        <button type="button" className="sg-login" onClick={login} disabled={busy}>
          {busy ? "로그인 중" : "학교 구글 계정으로 로그인"}
        </button>
        {error ? <p className="sg-error" role="alert">{error}</p> : null}
        {!isAppsScript() ? <p className="sg-note">이 주소는 저장되지 않는 미리보기입니다. <button type="button" onClick={() => setPreview(true)}>화면 미리보기</button></p> : null}
        <p className="sg-note">여러 계정에 로그인되어 있으면 학교 계정을 골라 주세요. 로그아웃은 이 앱의 연결을 닫으며 구글 계정 자체에서는 로그아웃되지 않습니다.</p>
        <p className="sg-note">
          <a className="dl-edit" href={appUrl("privacy")} target="_top">
            개인정보처리방침
          </a>
        </p>
        <div className="sg-install">
          <InstallButton />
        </div>
      </div>
    </div>
  );
}

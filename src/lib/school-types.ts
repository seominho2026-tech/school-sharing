export type SavedRoutine = { cycle: string; what: string };

export type SavedLink = { label: string; href: string };

export type SavedDuty = {
  version?: number;
  id: string;
  deptId: string;
  title: string;
  owner: string;
  summary: string;
  routines: SavedRoutine[];
  links: SavedLink[];
  authorEmail: string;
  authorName: string;
};

export type Assignee = { name: string; email: string };

export type SavedTask = {
  version?: number;
  id: string;
  deptId: string;
  title: string;
  due: string;
  docUrl: string;
  guide: string;
  /* 이 과제를 챙기는 사람입니다. */
  ownerName: string;
  ownerEmail: string;
  targets: string[];
  assignees: Assignee[];
  done: string[];
  authorEmail: string;
};

export type Teacher = {
  /* 문서 아이디이자 로그인 이메일입니다. */
  email: string;
  name: string;
  /* 소속 부서 표시입니다. 비워 둘 수 있습니다. */
  dept: string;
};

export type SchoolUser = {
  email: string;
  name: string;
};

export type DutyInput = {
  deptId: string;
  title: string;
  owner: string;
  summary: string;
  routines: SavedRoutine[];
  links: SavedLink[];
};

export type TaskInput = {
  deptId: string;
  title: string;
  due: string;
  docUrl: string;
  guide: string;
  ownerName: string;
  ownerEmail: string;
  targets: string[];
  assignees: Assignee[];
};

export type DeptMeta = { driveUrl: string; updatedBy: string };

export type SavedPost = {
  id: string;
  deptId: string;
  title: string;
  body: string;
  links: SavedLink[];
  authorEmail: string;
  authorName: string;
  createdAt: number;
};

export type PostInput = {
  deptId: string;
  title: string;
  body: string;
  links: SavedLink[];
};

export type SavedForm = {
  id: string;
  deptId: string;
  dutyId: string;
  label: string;
  href: string;
  kind: string;
  authorEmail: string;
};

export type FormInput = {
  deptId: string;
  dutyId: string;
  label: string;
  href: string;
  kind: string;
};

export type Admin = {
  email: string;
  name: string;
  /* 비워 두면 모든 부서를 편집할 수 있습니다. */
  dept: string;
};

export type SchoolEvent = {
  id: string;
  date: string;
  title: string;
  kind: "schedule" | "deadline";
  dept: string;
  detail: string;
  authorEmail: string;
  /* pending 이면 담당자가 승인하기 전이라 달력에 나오지 않습니다. */
  status: "pending" | "published";
  /* 이 일을 하려면 열어야 하는 구글 시트나 서식입니다. */
  links: SavedLink[];
};

export type EventInput = {
  date: string;
  title: string;
  kind: "schedule" | "deadline";
  dept: string;
  detail: string;
  status?: "pending" | "published";
};

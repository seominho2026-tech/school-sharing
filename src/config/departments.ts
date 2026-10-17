/* 대전성모여자고등학교 부서 목록입니다. 업무분장은 각 부장이 화면에서 입력합니다. */

export type Routine = {
  /* 반복 주기입니다. 예: 매주 월요일 / 매월 초 / 학기초 / 연 1회(3월) */
  cycle: string;
  what: string;
};

export type DutyLink = {
  label: string;
  href: string;
};

/* 업무 흐름도의 한 칸입니다.
   인수인계를 받은 사람이 이 순서대로만 따라가도 일이 굴러가도록 적습니다.
   "무엇을 한다"가 아니라 "어디에 들어가서 무엇을 누르고 무엇을 남긴다"까지 적습니다. */
export type FlowStep = {
  /* 단계 이름입니다. 예: 서류 접수 */
  phase: string;
  /* 언제 하는 일인지입니다. 예: 배정 통보를 받은 날 */
  when: string;
  /* 누가 하고 누구와 같이 하는지입니다. 개인 이름은 적지 않습니다. */
  who?: string;
  /* 어디서 처리하는지입니다. 예: 나이스 > 학적 > 전입학 */
  where?: string;
  /* 실제로 하는 일입니다. 한 줄에 하나씩 적습니다. */
  actions: string[];
  /* 이 단계가 끝나면 남는 것입니다. 다음 사람이 찾아볼 근거가 됩니다. */
  output?: string;
  /* 여기서 틀리면 되돌리기 어려운 것입니다. */
  caution?: string;
};

/* 업무 하나 안에서 갈래가 나뉘는 흐름입니다.
   예: 학적 업무는 전입·전출·자퇴가 각각 다른 흐름입니다. */
export type Flow = {
  /* 흐름 이름입니다. 예: 전입(다른 학교에서 우리 학교로) */
  title: string;
  /* 이 흐름이 시작되는 신호입니다. 예: 보호자가 전학 문의를 해 왔을 때 */
  trigger?: string;
  /* 법령·지침 근거입니다. 해마다 바뀌므로 연도를 같이 적습니다. */
  basis?: string;
  /* 전체가 며칠짜리 일인지입니다. */
  duration?: string;
  steps: FlowStep[];
};

export type Duty = {
  id: string;
  title: string;
  /* 담당 직책입니다. 개인 이름 대신 "부장", "담당" 처럼 적습니다. */
  owner?: string;
  /* 이 업무가 무엇인지 한 줄 정의입니다. */
  summary: string;
  /* 반복되는 업무입니다. */
  routines: Routine[];
  /* 업무 흐름도입니다. 인수인계의 본체입니다. */
  flows?: Flow[];
  /* 처리 절차입니다. 인수인계 때 순서대로 따라 할 수 있게 적습니다. */
  howto?: string[];
  /* 주의사항과 인수인계 메모입니다. */
  notes?: string[];
  /* 관련 시스템·서식 링크입니다. */
  links?: DutyLink[];
};

export type Department = {
  id: string;
  name: string;
  /* 탭을 눌렀을 때 제목 옆에 붙는 작은 글씨입니다. */
  subtitle?: string;
  /* 이 부서의 공유 드라이브입니다. url 을 비워 두면 "링크 미등록"으로 표시됩니다.
     학교 구글 계정에만 권한을 주면, 사이트 주소를 알아도 자료는 열리지 않습니다. */
  drive?: { url: string; note?: string };
  duties: Duty[];
};

export const departments: Department[] = [
  {
    "id": "academic-affairs",
    "name": "교무운영부",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "curriculum",
    "name": "교육과정부",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "education-research",
    "name": "교육연구부",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "assessment",
    "name": "교육평가부",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "student-safety",
    "name": "학생생활안정부",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "character-environment",
    "name": "창의인성환경부",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "career-guidance",
    "name": "진로진학상담부",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "education-it",
    "name": "교육정보부",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "religion",
    "name": "종교부",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "health",
    "name": "보건실",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "grade-1",
    "name": "1학년",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "grade-2",
    "name": "2학년",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "grade-3",
    "name": "3학년",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "korean",
    "name": "국어과",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "math",
    "name": "수학과",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "foreign-languages",
    "name": "외국어과",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "social-studies",
    "name": "사회과",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "science",
    "name": "과학과",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "liberal-arts-pe",
    "name": "교양예술체육과",
    "drive": {
      "url": ""
    },
    "duties": []
  },
  {
    "id": "administration",
    "name": "행정실",
    "drive": {
      "url": ""
    },
    "duties": []
  }
];

export type Notice = {
  id: string;
  due: string;
  dept: string;
  title: string;
  detail?: string;
};

export const notices: Notice[] = [];

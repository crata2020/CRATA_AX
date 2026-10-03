// 자동 생성 파일입니다. 고치지 마세요.
// 원본: config/worksite_modules.yaml (v0.1, 2026-10-02) + 빌드 스펙 3.1.1절 추가 위젯 12개
// 다시 만들기: npm run gen
/* eslint-disable */

export type ModuleId = "home-dashboard" | "org-members" | "company-info" | "business-structure" | "tasks" | "meetings" | "documents" | "notices" | "notifications" | "search" | "ai-connect" | "admin-members" | "admin-settings" | "audit-log" | "partners" | "calendar" | "approvals" | "attendance-leave" | "knowledge" | "correction-rules" | "mail-connector" | "integrations" | "ara-wellbeing" | "reports" | "safety-health" | "training-records" | "surveys" | "resource-booking" | "help-updates" | "data-export" | "billing" | "mfg-master-data" | "mfg-orders" | "mfg-production" | "mfg-quality" | "mfg-equipment" | "mfg-materials" | "edu-sales" | "edu-programs";
export type NavGroupId = "home" | "work" | "projects" | "meetings" | "docs" | "industry" | "company" | "ara" | "admin";
export type WidgetId = "greeting" | "my-tasks" | "returned-submissions" | "review-queue" | "team-workload" | "project-health" | "upcoming-meetings" | "recent-decisions" | "notices" | "ai-connect-status" | "company-kpi" | "ax-effect" | "approvals-pending" | "attendance-today" | "mail-followups" | "safety-status" | "ara-card" | "ara-aggregate" | "calendar-week" | "admin-health" | "mfg-delivery-due" | "mfg-production-today" | "mfg-quality-ppm" | "mfg-equipment-status" | "mfg-field-report" | "mfg-material-alert" | "mfg-claims-8d" | "mfg-inspection-queue" | "mfg-4m-changes" | "mfg-calibration-due" | "mfg-first-mid-last" | "mfg-pm-due" | "mfg-legal-calendar" | "mfg-monthly-summary" | "mfg-order-backlog" | "mfg-field-feed" | "mfg-dev-projects" | "mfg-material-price" | "approval-inbox";
export type PlatformRoleId = "owner" | "admin" | "reviewer" | "member";
export type PermissionLevel = "manage" | "approve" | "edit" | "own" | "view" | "aggregate" | "none";
export type ModuleTier = "P0" | "P1" | "P2";
export type BuildMode = "build" | "integrate" | "hybrid";
export type IndustryId = "core" | "manufacturing" | "education_consulting";
export type PresetId = "ceo" | "lead" | "staff" | "staff_admin";
export type RegistryIconName = "HomeOutlined" | "CheckSquareOutlined" | "ProjectOutlined" | "TeamOutlined" | "FileTextOutlined" | "BuildOutlined" | "BankOutlined" | "HeartOutlined" | "SettingOutlined" | "BellOutlined" | "AppstoreOutlined" | "PlusCircleOutlined" | "ContactsOutlined" | "InfoCircleOutlined" | "PartitionOutlined" | "NotificationOutlined" | "SearchOutlined" | "ApiOutlined" | "UserSwitchOutlined" | "HistoryOutlined" | "ShopOutlined" | "CalendarOutlined" | "FileDoneOutlined" | "FieldTimeOutlined" | "BookOutlined" | "DiffOutlined" | "MailOutlined" | "AppstoreAddOutlined" | "BarChartOutlined" | "SafetyCertificateOutlined" | "ReadOutlined" | "FormOutlined" | "ScheduleOutlined" | "QuestionCircleOutlined" | "ExportOutlined" | "CreditCardOutlined" | "DatabaseOutlined" | "ShoppingCartOutlined" | "CheckCircleOutlined" | "ToolOutlined" | "InboxOutlined" | "SolutionOutlined";

export interface RegistryModule {
  id: ModuleId;
  nameKo: string;
  tier: ModuleTier;
  group: string;
  icon: RegistryIconName | null;
  route: string | null;
  industry: IndustryId;
  defaultEnabled: boolean;
  enabledByPacks: string[];
  buildMode: BuildMode;
  description: string;
  entities: { name: string; labelKo: string; fields: string[] }[];
  permissions: Partial<Record<PlatformRoleId, PermissionLevel>>;
  dependsOn: ModuleId[];
}
export interface RegistryNavGroup {
  id: NavGroupId; order: number; nameKo: string; nameByPack?: Record<string, string>;
  icon: RegistryIconName; route: string; visibleTo: PlatformRoleId[];
}
export interface RegistryMobileTab { id: string; nameKo: string; icon: RegistryIconName; route: string }
export interface RegistryWidget {
  id: WidgetId; nameKo: string; tier: ModuleTier; module: ModuleId; industry?: IndustryId;
  suitableFor: PresetId[]; extra?: boolean;
}

export const REGISTRY_VERSION = "0.1";

export const MODULES: RegistryModule[] = [
  {
    "id": "home-dashboard",
    "nameKo": "홈 대시보드",
    "tier": "P0",
    "group": "home",
    "icon": "HomeOutlined",
    "route": "/",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "역할별 기본 위젯 묶음(대표·팀장·실무자)을 보여 주는 첫 화면. 회사 기본 배치는 Company DNA(portal_hints.home_widgets, kpis)에서 만든다",
    "entities": [
      {
        "name": "DashboardLayout",
        "labelKo": "대시보드 배치",
        "fields": [
          "id",
          "tenant_id",
          "preset",
          "member_id",
          "widgets",
          "updated_at"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "own",
      "member": "own"
    },
    "dependsOn": []
  },
  {
    "id": "org-members",
    "nameKo": "구성원·조직도",
    "tier": "P0",
    "group": "company",
    "icon": "ContactsOutlined",
    "route": "/company/people",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "사람 찾기(이름·소속·담당 업무·연락처)와 조직도. 그룹웨어·HR 시스템이 있으면 동기화하고, 없으면 직접 입력. 근로자명부·인사기록(주민번호·주소·급여)은 저장하지 않는다",
    "entities": [
      {
        "name": "OrgUnit",
        "labelKo": "조직",
        "fields": [
          "id",
          "name",
          "parent_id",
          "head_member_id",
          "sort_order",
          "valid_from",
          "valid_to"
        ]
      },
      {
        "name": "Member",
        "labelKo": "구성원",
        "fields": [
          "id",
          "tenant_id",
          "display_name",
          "email",
          "phone_work",
          "org_unit_id",
          "position",
          "job_title",
          "duties",
          "role",
          "status",
          "joined_at",
          "avatar_ref",
          "external_ids"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "view",
      "member": "view"
    },
    "dependsOn": []
  },
  {
    "id": "company-info",
    "nameKo": "회사 소개",
    "tier": "P0",
    "group": "company",
    "icon": "InfoCircleOutlined",
    "route": "/company/about",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "비전·방침·연혁·인증·대표 연락처를 한 화면에. Company DNA L1(정체성) 값을 그대로 보여 준다. 공개 정보 위주",
    "entities": [
      {
        "name": "CompanyInfo",
        "labelKo": "회사 정보",
        "fields": [
          "tenant_id",
          "legal_name",
          "display_name",
          "address",
          "phone",
          "website",
          "founded_on",
          "vision",
          "values",
          "policies",
          "history",
          "certifications",
          "logo_ref",
          "updated_at"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "view",
      "member": "view"
    },
    "dependsOn": []
  },
  {
    "id": "business-structure",
    "nameKo": "사업·프로젝트·파트",
    "tier": "P0",
    "group": "projects",
    "icon": "PartitionOutlined",
    "route": "/projects",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "모든 것의 뼈대. 사업 > 프로젝트 > 파트 계층에 업무·회의·문서·메일·결정이 붙는다. 회의 분류 체계(config/meeting_taxonomy.yaml)와 같은 코드를 쓴다",
    "entities": [
      {
        "name": "BusinessLine",
        "labelKo": "사업",
        "fields": [
          "id",
          "code",
          "name",
          "description",
          "owner_member_id",
          "status",
          "sort_order"
        ]
      },
      {
        "name": "Project",
        "labelKo": "프로젝트",
        "fields": [
          "id",
          "business_line_id",
          "code",
          "name",
          "aliases",
          "partner_id",
          "owner_member_id",
          "reviewer_member_id",
          "start_on",
          "due_on",
          "status",
          "health",
          "sensitivity",
          "description"
        ]
      },
      {
        "name": "Part",
        "labelKo": "파트",
        "fields": [
          "id",
          "project_id",
          "name",
          "lead_member_id",
          "member_ids",
          "sort_order"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "edit",
      "member": "view"
    },
    "dependsOn": [
      "org-members"
    ]
  },
  {
    "id": "tasks",
    "nameKo": "업무·배분·검토",
    "tier": "P0",
    "group": "work",
    "icon": "CheckSquareOutlined",
    "route": "/work",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "내 업무, 팀 배분, 제출과 검토. 각자의 AI(MCP)는 '제출'까지만 하고 '완료'는 검토자가 웹에서 한다. 배분 규칙은 Company DNA L5·L7에서 온다",
    "entities": [
      {
        "name": "Task",
        "labelKo": "업무",
        "fields": [
          "id",
          "project_id",
          "part_id",
          "title",
          "description",
          "task_type",
          "assignee_id",
          "reviewer_id",
          "due_at",
          "priority",
          "status",
          "source",
          "source_ref",
          "estimate_hours",
          "sensitivity",
          "created_by",
          "created_at"
        ]
      },
      {
        "name": "ProgressLog",
        "labelKo": "진행 기록",
        "fields": [
          "id",
          "task_id",
          "author_id",
          "body",
          "via",
          "created_at"
        ]
      },
      {
        "name": "Submission",
        "labelKo": "제출",
        "fields": [
          "id",
          "task_id",
          "version",
          "artifact_id",
          "summary",
          "submitted_by",
          "via",
          "idempotency_key",
          "status",
          "review_comment",
          "reviewed_by",
          "reviewed_at"
        ]
      },
      {
        "name": "AssignmentRule",
        "labelKo": "배분 규칙",
        "fields": [
          "id",
          "name",
          "condition",
          "assignee_rule",
          "reviewer_rule",
          "source_ref",
          "active"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "approve",
      "member": "own"
    },
    "dependsOn": [
      "business-structure",
      "org-members",
      "notifications",
      "audit-log"
    ]
  },
  {
    "id": "meetings",
    "nameKo": "회의",
    "tier": "P0",
    "group": "meetings",
    "icon": "TeamOutlined",
    "route": "/meetings",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "녹음·전사는 Plaud·클로바노트·티로 등에 맡기고, 구간 분류·결정·액션 제안과 프로젝트 연결만 한다. 원음은 저장하지 않고 링크만 둔다. 액션은 제안 카드 → 1클릭 승인으로 업무가 된다",
    "entities": [
      {
        "name": "Meeting",
        "labelKo": "회의",
        "fields": [
          "id",
          "title",
          "title_prefix",
          "meeting_type",
          "project_ids",
          "started_at",
          "duration_min",
          "attendee_ids",
          "source",
          "transcript_ref",
          "summary",
          "sensitivity",
          "status"
        ]
      },
      {
        "name": "MeetingSegment",
        "labelKo": "회의 구간",
        "fields": [
          "id",
          "meeting_id",
          "start_ts",
          "end_ts",
          "business_line_code",
          "project_code",
          "task_type",
          "confidence",
          "evidence_quote",
          "review_status"
        ]
      },
      {
        "name": "Decision",
        "labelKo": "결정",
        "fields": [
          "id",
          "meeting_id",
          "project_id",
          "statement",
          "decided_by_role",
          "decided_at",
          "supersedes_id",
          "status"
        ]
      },
      {
        "name": "ActionProposal",
        "labelKo": "액션 제안",
        "fields": [
          "id",
          "meeting_id",
          "segment_id",
          "title",
          "suggested_assignee_id",
          "suggested_due_at",
          "status",
          "task_id"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "approve",
      "member": "view"
    },
    "dependsOn": [
      "business-structure",
      "tasks"
    ]
  },
  {
    "id": "documents",
    "nameKo": "산출물·양식",
    "tier": "P0",
    "group": "docs",
    "icon": "FileTextOutlined",
    "route": "/docs",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "산출물의 버전(AI 초안 → 수정 → 최종)과 회사 양식 목록. 파일 본체는 고객 저장소(Drive·SharePoint·NAS)에 두고, 메타데이터·버전·적용 규칙만 관리한다. AI 초안에는 AI 생성 표시를 붙인다",
    "entities": [
      {
        "name": "Artifact",
        "labelKo": "산출물",
        "fields": [
          "id",
          "project_id",
          "task_id",
          "doc_type",
          "template_id",
          "title",
          "current_version",
          "file_ref",
          "ai_generated",
          "sensitivity",
          "owner_id",
          "status"
        ]
      },
      {
        "name": "ArtifactVersion",
        "labelKo": "산출물 버전",
        "fields": [
          "id",
          "artifact_id",
          "ver",
          "kind",
          "file_ref",
          "author_id",
          "created_at",
          "applied_rule_ids"
        ]
      },
      {
        "name": "Template",
        "labelKo": "양식",
        "fields": [
          "id",
          "doc_type",
          "name",
          "format",
          "version",
          "file_ref",
          "owner_id",
          "status"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "approve",
      "member": "edit"
    },
    "dependsOn": [
      "business-structure",
      "tasks"
    ]
  },
  {
    "id": "notices",
    "nameKo": "공지·게시판",
    "tier": "P0",
    "group": "company",
    "icon": "NotificationOutlined",
    "route": "/company/notices",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "회사 공지, 규정 변경 안내, 행사, 안전 공지. 필독 공지는 열람 확인을 남긴다. 그룹웨어 게시판이 있으면 그 글을 함께 보여 주는 연동은 P1",
    "entities": [
      {
        "name": "Notice",
        "labelKo": "공지",
        "fields": [
          "id",
          "category",
          "title",
          "body",
          "author_id",
          "audience",
          "pinned",
          "must_read",
          "published_at",
          "expires_at",
          "attachments"
        ]
      },
      {
        "name": "ReadReceipt",
        "labelKo": "열람 확인",
        "fields": [
          "notice_id",
          "member_id",
          "read_at"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "edit",
      "member": "view"
    },
    "dependsOn": [
      "org-members",
      "notifications"
    ]
  },
  {
    "id": "notifications",
    "nameKo": "알림",
    "tier": "P0",
    "group": "topbar",
    "icon": "BellOutlined",
    "route": "/notifications",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "사이트 안 알림함 + 알림 설정(즉시·하루 2회 묶음·하루 1회, 업무시간 외 조용히). 메신저 봇(카카오워크·네이버웍스·잔디·Slack)과 메일 발송 연동은 P1",
    "entities": [
      {
        "name": "Notification",
        "labelKo": "알림",
        "fields": [
          "id",
          "recipient_id",
          "kind",
          "title",
          "body",
          "link",
          "source_module",
          "source_id",
          "channel",
          "batched_at",
          "read_at",
          "created_at"
        ]
      },
      {
        "name": "NotificationPreference",
        "labelKo": "알림 설정",
        "fields": [
          "member_id",
          "kind",
          "channels",
          "digest",
          "quiet_hours"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "own",
      "member": "own"
    },
    "dependsOn": []
  },
  {
    "id": "search",
    "nameKo": "검색",
    "tier": "P0",
    "group": "topbar",
    "icon": "SearchOutlined",
    "route": "/search",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "사이트 안 검색(Ctrl/Cmd+K): 사람 → 프로젝트 → 업무 → 회의 → 문서·지식 순. 사람 결과는 사진·이름·소속·연락처를 바로 보여 준다. 외부 도구 전체를 뒤지는 사내 통합검색은 만들지 않는다",
    "entities": [
      {
        "name": "SearchIndexEntry",
        "labelKo": "검색 색인",
        "fields": [
          "id",
          "tenant_id",
          "object_type",
          "object_id",
          "title",
          "snippet",
          "acl_principals",
          "sensitivity",
          "updated_at"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "view",
      "reviewer": "view",
      "member": "view"
    },
    "dependsOn": [
      "org-members",
      "business-structure"
    ]
  },
  {
    "id": "ai-connect",
    "nameKo": "내 AI 연결",
    "tier": "P0",
    "group": "topbar",
    "icon": "ApiOutlined",
    "route": "/me/ai",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "직원 각자의 ChatGPT·Claude·Codex를 OAuth로 연결해 내 업무 조회·진행 기록·제출을 하게 한다(도구 6개). 개인 화면은 프로필 메뉴에, 회사 정책(끄기·읽기 전용·허용 클라이언트)은 관리 > AI 연결 정책(/admin/ai-policy)에 둔다. 연결 전 국외이전 고지",
    "entities": [
      {
        "name": "McpConnection",
        "labelKo": "AI 연결",
        "fields": [
          "id",
          "member_id",
          "client_name",
          "client_id",
          "scopes",
          "created_at",
          "last_used_at",
          "revoked_at"
        ]
      },
      {
        "name": "McpPolicy",
        "labelKo": "AI 연결 정책",
        "fields": [
          "tenant_id",
          "enabled",
          "read_only",
          "allowed_clients",
          "allowed_scopes",
          "overseas_notice_version",
          "updated_by",
          "updated_at"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "own",
      "member": "own"
    },
    "dependsOn": [
      "tasks",
      "audit-log"
    ]
  },
  {
    "id": "admin-members",
    "nameKo": "구성원·권한 관리",
    "tier": "P0",
    "group": "admin",
    "icon": "UserSwitchOutlined",
    "route": "/admin/members",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "초대, 역할 부여(owner·admin·reviewer·member), 범위 권한(사업·프로젝트 단위), 직책 → 역할 기본 매핑. 퇴사자는 비활성화(삭제 대신)",
    "entities": [
      {
        "name": "Invitation",
        "labelKo": "초대",
        "fields": [
          "id",
          "email",
          "role",
          "org_unit_id",
          "invited_by",
          "expires_at",
          "status"
        ]
      },
      {
        "name": "RoleAssignment",
        "labelKo": "역할 부여",
        "fields": [
          "member_id",
          "role",
          "scope_type",
          "scope_id",
          "granted_by",
          "granted_at"
        ]
      },
      {
        "name": "PositionRoleMap",
        "labelKo": "직책-역할 매핑",
        "fields": [
          "position_or_title",
          "default_role"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "none",
      "member": "none"
    },
    "dependsOn": [
      "org-members",
      "audit-log"
    ]
  },
  {
    "id": "admin-settings",
    "nameKo": "회사 설정",
    "tier": "P0",
    "group": "admin",
    "icon": "SettingOutlined",
    "route": "/admin/settings",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "Company DNA Profile이 적용된 결과를 보는 화면: 브랜드 색·로고, 용어(메뉴·필드 이름), 켜진 모듈·업종 팩, 데이터 등급 기본값. 프로파일 원본 수정은 CRATA 운영자가 차이(diff)로 하고, 고객은 브랜드·라벨·알림 기본값 정도만 직접 바꾼다",
    "entities": [
      {
        "name": "TenantSettings",
        "labelKo": "회사 설정",
        "fields": [
          "tenant_id",
          "display_name",
          "brand_tokens",
          "logo_ref",
          "locale",
          "timezone",
          "enabled_modules",
          "enabled_packs",
          "nav_overrides",
          "data_class_defaults",
          "profile_version"
        ]
      },
      {
        "name": "GlossaryTerm",
        "labelKo": "용어",
        "fields": [
          "id",
          "term",
          "ui_label",
          "aliases",
          "forbidden",
          "definition"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "none",
      "member": "none"
    },
    "dependsOn": []
  },
  {
    "id": "audit-log",
    "nameKo": "감사 로그",
    "tier": "P0",
    "group": "admin",
    "icon": "HistoryOutlined",
    "route": "/admin/audit",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "누가(사람·AI 연결·시스템·CRATA 운영자) 언제 무엇을 바꿨는지 추가만 가능한 기록. 개인정보 접속기록 요건(최소 1년)을 고려해 기본 보관 2년(제안). 변경 내용은 마스킹해서 남긴다",
    "entities": [
      {
        "name": "AuditEvent",
        "labelKo": "감사 이벤트",
        "fields": [
          "id",
          "tenant_id",
          "at",
          "actor_id",
          "actor_type",
          "action",
          "resource",
          "resource_id",
          "changes",
          "ip",
          "user_agent",
          "request_id"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "view",
      "reviewer": "none",
      "member": "own"
    },
    "dependsOn": []
  },
  {
    "id": "partners",
    "nameKo": "거래처·연락처",
    "tier": "P1",
    "group": "projects",
    "icon": "ShopOutlined",
    "route": "/projects/partners",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "고객사·공급사·외주처·기관과 담당자 연락처. 프로젝트와 메일 분류의 기준점. 단가·계약 조건(L2)은 여기에 두지 않는다. ERP·CRM 거래처가 있으면 동기화",
    "entities": [
      {
        "name": "Partner",
        "labelKo": "거래처",
        "fields": [
          "id",
          "kind",
          "name",
          "biz_reg_no",
          "status",
          "owner_member_id",
          "tags",
          "external_ids"
        ]
      },
      {
        "name": "PartnerContact",
        "labelKo": "거래처 담당자",
        "fields": [
          "id",
          "partner_id",
          "name",
          "dept",
          "title",
          "email",
          "phone",
          "is_primary"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "edit",
      "member": "view"
    },
    "dependsOn": [
      "business-structure"
    ]
  },
  {
    "id": "calendar",
    "nameKo": "일정",
    "tier": "P1",
    "group": "company",
    "icon": "CalendarOutlined",
    "route": "/company/calendar",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "회사가 쓰는 캘린더(Google·M365·네이버웍스·그룹웨어)를 읽어 오고, 사이트 안 일정(회의·마감·납기·교육·점검)과 합쳐 보여 준다. 캘린더 앱을 새로 만들지 않는다",
    "entities": [
      {
        "name": "CalendarEvent",
        "labelKo": "일정",
        "fields": [
          "id",
          "source",
          "external_id",
          "title",
          "kind",
          "start_at",
          "end_at",
          "all_day",
          "project_id",
          "attendee_ids",
          "visibility"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "edit",
      "member": "own"
    },
    "dependsOn": [
      "meetings",
      "tasks"
    ]
  },
  {
    "id": "approvals",
    "nameKo": "결재(연동)",
    "tier": "P1",
    "group": "company",
    "icon": "FileDoneOutlined",
    "route": "/company/approvals",
    "industry": "core",
    "defaultEnabled": false,
    "enabledByPacks": [],
    "buildMode": "integrate",
    "description": "그룹웨어 전자결재의 내 결재 대기·진행 중 문서를 링크와 상태로만 보여 주고, 업무·프로젝트에 연결한다. 결재 원본과 증빙은 결재 시스템에 남긴다(상법·세법 보존기간). 결재 시스템이 없는 고객에게 결재를 새로 만들어 주지 않는다",
    "entities": [
      {
        "name": "ApprovalLink",
        "labelKo": "결재 문서 링크",
        "fields": [
          "id",
          "system",
          "doc_no",
          "title",
          "form_name",
          "requester_id",
          "current_approver_id",
          "status",
          "submitted_at",
          "completed_at",
          "url",
          "related_type",
          "related_id"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "manage",
      "reviewer": "view",
      "member": "own"
    },
    "dependsOn": [
      "integrations"
    ]
  },
  {
    "id": "attendance-leave",
    "nameKo": "근태·휴가(연동)",
    "tier": "P1",
    "group": "company",
    "icon": "FieldTimeOutlined",
    "route": "/company/attendance",
    "industry": "core",
    "defaultEnabled": false,
    "enabledByPacks": [],
    "buildMode": "integrate",
    "description": "근태 시스템의 요약만 읽어 온다: 오늘 근무·휴가 상태, 내 잔여 연차, 주간 근로시간(52시간 한도 접근 경고). 출퇴근 기록·연차 계산·사용 촉진은 전문 시스템이 한다",
    "entities": [
      {
        "name": "AttendanceSummary",
        "labelKo": "근태 요약",
        "fields": [
          "member_id",
          "date",
          "status",
          "source",
          "synced_at"
        ]
      },
      {
        "name": "WorkHoursWeekly",
        "labelKo": "주간 근로시간",
        "fields": [
          "member_id",
          "week_start",
          "regular_hours",
          "overtime_hours",
          "source",
          "synced_at"
        ]
      },
      {
        "name": "LeaveBalance",
        "labelKo": "연차 잔여",
        "fields": [
          "member_id",
          "year",
          "granted_days",
          "used_days",
          "remaining_days",
          "source",
          "synced_at"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "view",
      "reviewer": "view",
      "member": "own"
    },
    "dependsOn": [
      "integrations",
      "org-members"
    ]
  },
  {
    "id": "knowledge",
    "nameKo": "지식",
    "tier": "P1",
    "group": "docs",
    "icon": "BookOutlined",
    "route": "/docs/knowledge",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "결정 이력, 규정·매뉴얼, FAQ, 용어집, 참고 자료를 서로 잇고 검증 주기(검증일·재검토일)를 관리한다. 본문은 Notion·Drive·위키에 두고 링크한다. 지식 엔진·위키 에디터는 만들지 않는다",
    "entities": [
      {
        "name": "KnowledgeItem",
        "labelKo": "지식 항목",
        "fields": [
          "id",
          "kind",
          "title",
          "summary",
          "body_ref",
          "project_id",
          "owner_id",
          "source_ref",
          "verified_at",
          "review_by",
          "status"
        ]
      },
      {
        "name": "KnowledgeLink",
        "labelKo": "지식 연결",
        "fields": [
          "from_type",
          "from_id",
          "to_type",
          "to_id",
          "relation"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "approve",
      "member": "edit"
    },
    "dependsOn": [
      "business-structure",
      "meetings",
      "documents"
    ]
  },
  {
    "id": "correction-rules",
    "nameKo": "작성 규칙(수정에서 배운 규칙)",
    "tier": "P1",
    "group": "docs",
    "icon": "DiffOutlined",
    "route": "/docs/rules",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "AI 초안과 최종본의 차이를 모아 범위(템플릿·작성 규칙·일회성)로 나누고, 승인된 것만 회사 규칙이 된다. 효과는 같은 수정 재발률·편집량·검토 시간으로 보여 준다",
    "entities": [
      {
        "name": "Correction",
        "labelKo": "수정 기록",
        "fields": [
          "id",
          "artifact_id",
          "ai_ver",
          "final_ver",
          "diff_kind",
          "before",
          "after",
          "reason",
          "scope_suggested",
          "scope_confidence",
          "status",
          "linked_rule_id"
        ]
      },
      {
        "name": "Rule",
        "labelKo": "규칙",
        "fields": [
          "id",
          "scope_level",
          "doc_types",
          "statement",
          "evidence_ids",
          "examples",
          "compiled_to",
          "approver_id",
          "status",
          "valid_from",
          "review_by",
          "supersedes_id",
          "stats"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "approve",
      "member": "view"
    },
    "dependsOn": [
      "documents"
    ]
  },
  {
    "id": "mail-connector",
    "nameKo": "메일 연결",
    "tier": "P1",
    "group": "work",
    "icon": "MailOutlined",
    "route": "/work/mail",
    "industry": "core",
    "defaultEnabled": false,
    "enabledByPacks": [],
    "buildMode": "integrate",
    "description": "직원 본인 OAuth로만 메일을 읽어 거래처·프로젝트에 분류하고 후속 업무를 제안한다. 본문은 기본 저장하지 않고 메타데이터와 링크만. 본인이 '프로젝트에 공유'한 메일만 다른 사람에게 보인다. 메일 앱은 만들지 않는다",
    "entities": [
      {
        "name": "MailConnection",
        "labelKo": "메일 연결",
        "fields": [
          "id",
          "member_id",
          "provider",
          "scopes",
          "status",
          "connected_at",
          "revoked_at"
        ]
      },
      {
        "name": "MailLink",
        "labelKo": "메일 링크",
        "fields": [
          "id",
          "member_id",
          "provider_message_id",
          "thread_id",
          "subject",
          "from_address",
          "partner_id",
          "project_id",
          "classified_by",
          "confidence",
          "received_at",
          "suggested_task_id",
          "shared_to_project"
        ]
      },
      {
        "name": "MailRule",
        "labelKo": "메일 분류 규칙",
        "fields": [
          "id",
          "condition",
          "project_id",
          "action",
          "active"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "own",
      "member": "own"
    },
    "dependsOn": [
      "partners",
      "business-structure",
      "tasks"
    ]
  },
  {
    "id": "integrations",
    "nameKo": "연동 관리",
    "tier": "P1",
    "group": "admin",
    "icon": "AppstoreAddOutlined",
    "route": "/admin/integrations",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "그룹웨어·캘린더·저장소·회의 녹음·메신저·ERP·MES 연결 상태와 동기화 이력. 실시간 조회(federated)와 색인(synced)을 구분해 표시한다",
    "entities": [
      {
        "name": "Integration",
        "labelKo": "연동",
        "fields": [
          "id",
          "provider",
          "kind",
          "auth_type",
          "scopes",
          "data_class",
          "sync_mode",
          "connected_by",
          "status",
          "last_sync_at"
        ]
      },
      {
        "name": "SyncJob",
        "labelKo": "동기화 작업",
        "fields": [
          "id",
          "integration_id",
          "started_at",
          "finished_at",
          "result",
          "counts"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "none",
      "member": "none"
    },
    "dependsOn": [
      "audit-log"
    ]
  },
  {
    "id": "ara-wellbeing",
    "nameKo": "ARA 복지",
    "tier": "P1",
    "group": "ara",
    "icon": "HeartOutlined",
    "route": "/ara",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "성향 진단·일하는 방식 카드·코칭. 개인 데이터는 P 영역(별도 DB·직원별 암호화)에 두고 회사·관리자는 접근할 수 없다. 회사에는 본인이 고른 카드 문장 사본과 10명 이상 집계만. P0 뼈대에는 메뉴 자리와 '회사가 보는 것 / 못 보는 것' 안내 화면만 둔다",
    "entities": [
      {
        "name": "WellbeingConsent",
        "labelKo": "복지 동의",
        "fields": [
          "member_id",
          "ai_notice_at",
          "privacy_consent_at",
          "sensitive_consent_at",
          "withdrawn_at"
        ]
      },
      {
        "name": "WorkStyleCard",
        "labelKo": "일하는 방식 카드(공유 사본)",
        "fields": [
          "id",
          "member_id",
          "sentence",
          "share_scope",
          "shared_with_ids",
          "shared_at",
          "revoked_at"
        ]
      },
      {
        "name": "WellbeingAggregate",
        "labelKo": "복지 집계",
        "fields": [
          "period_month",
          "population_n",
          "active_seats",
          "assessment_completion_rate",
          "card_share_rate",
          "topic_distribution"
        ]
      }
    ],
    "permissions": {
      "owner": "aggregate",
      "admin": "aggregate",
      "reviewer": "own",
      "member": "own"
    },
    "dependsOn": [
      "org-members"
    ]
  },
  {
    "id": "reports",
    "nameKo": "리포트",
    "tier": "P1",
    "group": "admin",
    "icon": "BarChartOutlined",
    "route": "/admin/reports",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "회사 KPI(기준선·목표·추세)와 CRATA 월 운영 리포트(수정 학습 효과, AI 연결 활성, 회의 분류 정확도). 대표가 매달 받는 '운영 성과' 화면",
    "entities": [
      {
        "name": "Kpi",
        "labelKo": "KPI",
        "fields": [
          "id",
          "name",
          "unit",
          "baseline",
          "target",
          "measure_source",
          "owner_id",
          "review_cycle"
        ]
      },
      {
        "name": "KpiValue",
        "labelKo": "KPI 값",
        "fields": [
          "kpi_id",
          "period",
          "value",
          "note",
          "recorded_at"
        ]
      },
      {
        "name": "OpsReport",
        "labelKo": "운영 리포트",
        "fields": [
          "id",
          "period_month",
          "summary",
          "metrics",
          "published_at",
          "published_by"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "manage",
      "reviewer": "view",
      "member": "none"
    },
    "dependsOn": [
      "tasks",
      "correction-rules",
      "meetings"
    ]
  },
  {
    "id": "safety-health",
    "nameKo": "안전보건",
    "tier": "P1",
    "group": "company",
    "icon": "SafetyCertificateOutlined",
    "route": "/company/safety",
    "industry": "core",
    "defaultEnabled": false,
    "enabledByPacks": [
      "manufacturing"
    ],
    "buildMode": "hybrid",
    "description": "상시 5명 이상 사업장의 안전보건 기록을 한곳에: 위험성평가(유해·위험요인 → 조치 → 확인), 아차사고·개선 제안, 종사자 의견 청취, 반기 점검 체크리스트, 산업재해 기록. 법 준수를 보장하는 도구가 아니라 기록·점검을 놓치지 않게 돕는 도구",
    "entities": [
      {
        "name": "RiskAssessment",
        "labelKo": "위험성평가",
        "fields": [
          "id",
          "work_area",
          "process",
          "hazard",
          "risk_level_before",
          "control_measures",
          "owner_id",
          "due_on",
          "status",
          "risk_level_after",
          "worker_participation_note",
          "evidence_refs",
          "assessed_on"
        ]
      },
      {
        "name": "NearMissReport",
        "labelKo": "아차사고·개선 제안",
        "fields": [
          "id",
          "reported_by",
          "anonymous",
          "occurred_at",
          "location",
          "description",
          "photo_refs",
          "status",
          "linked_task_id"
        ]
      },
      {
        "name": "WorkerOpinion",
        "labelKo": "종사자 의견",
        "fields": [
          "id",
          "channel",
          "submitted_at",
          "anonymous",
          "content",
          "response",
          "status"
        ]
      },
      {
        "name": "SemiannualReview",
        "labelKo": "반기 점검",
        "fields": [
          "id",
          "half",
          "item",
          "checked_on",
          "checked_by",
          "findings",
          "actions"
        ]
      },
      {
        "name": "SafetyIncident",
        "labelKo": "산업재해 기록",
        "fields": [
          "id",
          "occurred_at",
          "location",
          "injured_count",
          "lost_days",
          "summary",
          "cause",
          "prevention_plan",
          "report_due_on",
          "reported_on"
        ]
      }
    ],
    "permissions": {
      "owner": "approve",
      "admin": "manage",
      "reviewer": "edit",
      "member": "own"
    },
    "dependsOn": [
      "org-members",
      "notices",
      "tasks"
    ]
  },
  {
    "id": "training-records",
    "nameKo": "교육·이수 기록",
    "tier": "P2",
    "group": "company",
    "icon": "ReadOutlined",
    "route": "/company/training",
    "industry": "core",
    "defaultEnabled": false,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "법정·사내 교육의 대상·주기·이수 기록. 교육 콘텐츠와 수강은 외부 교육 플랫폼에 두고 이수 증빙만 모은다(성희롱 예방 연 1회, 산업안전보건 정기교육 등)",
    "entities": [
      {
        "name": "TrainingCourse",
        "labelKo": "교육 과정",
        "fields": [
          "id",
          "name",
          "legal_basis",
          "cycle",
          "required_for",
          "hours_required",
          "provider"
        ]
      },
      {
        "name": "TrainingRecord",
        "labelKo": "이수 기록",
        "fields": [
          "id",
          "course_id",
          "member_id",
          "completed_on",
          "hours",
          "evidence_ref"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "manage",
      "reviewer": "view",
      "member": "own"
    },
    "dependsOn": [
      "org-members"
    ]
  },
  {
    "id": "surveys",
    "nameKo": "설문·의견함",
    "tier": "P2",
    "group": "company",
    "icon": "FormOutlined",
    "route": "/company/surveys",
    "industry": "core",
    "defaultEnabled": false,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "진단 설문, 만족도, 의견 수렴(종사자 의견 청취 채널로도 사용). 익명 설문은 응답 5명 미만이면 결과를 숨긴다(제안). 그룹웨어 설문·폼이 있으면 그쪽을 연결",
    "entities": [
      {
        "name": "Survey",
        "labelKo": "설문",
        "fields": [
          "id",
          "title",
          "purpose",
          "anonymous",
          "audience",
          "open_at",
          "close_at",
          "status"
        ]
      },
      {
        "name": "SurveyResponse",
        "labelKo": "응답",
        "fields": [
          "id",
          "survey_id",
          "respondent_id",
          "answers",
          "submitted_at"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "edit",
      "member": "own"
    },
    "dependsOn": [
      "org-members"
    ]
  },
  {
    "id": "resource-booking",
    "nameKo": "회의실·자원 예약",
    "tier": "P2",
    "group": "company",
    "icon": "ScheduleOutlined",
    "route": "/company/booking",
    "industry": "core",
    "defaultEnabled": false,
    "enabledByPacks": [],
    "buildMode": "integrate",
    "description": "회의실·차량·공용 장비 예약. 그룹웨어 예약 기능이 있으면 연결만 하고, 없을 때만 경량 화면을 검토",
    "entities": [
      {
        "name": "Resource",
        "labelKo": "자원",
        "fields": [
          "id",
          "kind",
          "name",
          "location",
          "capacity"
        ]
      },
      {
        "name": "Booking",
        "labelKo": "예약",
        "fields": [
          "id",
          "resource_id",
          "booked_by",
          "start_at",
          "end_at",
          "purpose",
          "status"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "own",
      "member": "own"
    },
    "dependsOn": [
      "calendar"
    ]
  },
  {
    "id": "help-updates",
    "nameKo": "도움말·새 기능 안내",
    "tier": "P2",
    "group": "topbar",
    "icon": "QuestionCircleOutlined",
    "route": "/help",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "모듈별 도움말과 변경 안내. 새 기능·규칙 변경을 역할별로 알려 정착을 돕는다(EnterpriseReady의 Change Management)",
    "entities": [
      {
        "name": "HelpArticle",
        "labelKo": "도움말",
        "fields": [
          "id",
          "module_id",
          "title",
          "body",
          "updated_at"
        ]
      },
      {
        "name": "ReleaseNote",
        "labelKo": "변경 안내",
        "fields": [
          "id",
          "version",
          "published_at",
          "title",
          "body",
          "audience_roles"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "view",
      "reviewer": "view",
      "member": "view"
    },
    "dependsOn": []
  },
  {
    "id": "data-export",
    "nameKo": "데이터 내보내기·이관",
    "tier": "P2",
    "group": "admin",
    "icon": "ExportOutlined",
    "route": "/admin/export",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "계약 종료 시 반환, 다른 시스템 이관, 정보주체 열람 요청에 대응하는 내보내기(CSV·XLSX·JSON). 내려받기 링크는 만료 시간을 둔다",
    "entities": [
      {
        "name": "ExportJob",
        "labelKo": "내보내기 작업",
        "fields": [
          "id",
          "requested_by",
          "scope",
          "format",
          "status",
          "file_ref",
          "expires_at",
          "created_at"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "none",
      "member": "own"
    },
    "dependsOn": [
      "audit-log"
    ]
  },
  {
    "id": "billing",
    "nameKo": "구독·좌석",
    "tier": "P2",
    "group": "admin",
    "icon": "CreditCardOutlined",
    "route": "/admin/billing",
    "industry": "core",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "요금제, 좌석 수, ARA 복지 애드온 좌석, 계약 기간. 초기에는 CRATA가 계약서로 처리하고 화면은 조회용",
    "entities": [
      {
        "name": "Subscription",
        "labelKo": "구독",
        "fields": [
          "tenant_id",
          "plan",
          "seats",
          "addons",
          "term_start",
          "term_end",
          "billing_contact"
        ]
      },
      {
        "name": "SeatUsage",
        "labelKo": "좌석 사용",
        "fields": [
          "month",
          "active_members",
          "ara_addon_seats"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "view",
      "reviewer": "none",
      "member": "none"
    },
    "dependsOn": []
  },
  {
    "id": "mfg-master-data",
    "nameKo": "기준정보(품목·공정·재질)",
    "tier": "P1",
    "group": "industry",
    "icon": "DatabaseOutlined",
    "route": "/ops/master",
    "industry": "manufacturing",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "품목(원자재·반제품·완제품·고객 품번), 공정(라우팅), 재질 등급, BOM. 나머지 제조 모듈이 모두 참조한다. ERP 품목 마스터가 있으면 동기화",
    "entities": [
      {
        "name": "Item",
        "labelKo": "품목",
        "fields": [
          "id",
          "item_no",
          "name",
          "kind",
          "material_grade",
          "spec",
          "unit",
          "customer_part_no",
          "partner_id",
          "status"
        ]
      },
      {
        "name": "ProcessStep",
        "labelKo": "공정",
        "fields": [
          "id",
          "code",
          "name",
          "sequence",
          "equipment_kind",
          "std_cycle_note"
        ]
      },
      {
        "name": "Bom",
        "labelKo": "BOM",
        "fields": [
          "parent_item_id",
          "child_item_id",
          "qty_per",
          "unit"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "edit",
      "member": "view"
    },
    "dependsOn": [
      "partners"
    ]
  },
  {
    "id": "mfg-orders",
    "nameKo": "수주·납품",
    "tier": "P1",
    "group": "industry",
    "icon": "ShoppingCartOutlined",
    "route": "/ops/orders",
    "industry": "manufacturing",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "고객 발주(수주), 납기, 출하·납품, 납기 준수. 메일로 온 발주를 수주 후보로 제안하는 흐름은 메일 연결 모듈과 잇는다",
    "entities": [
      {
        "name": "SalesOrder",
        "labelKo": "수주",
        "fields": [
          "id",
          "partner_id",
          "customer_po_no",
          "order_date",
          "status",
          "owner_id"
        ]
      },
      {
        "name": "SalesOrderLine",
        "labelKo": "수주 품목",
        "fields": [
          "id",
          "order_id",
          "item_id",
          "qty",
          "due_date",
          "status"
        ]
      },
      {
        "name": "Shipment",
        "labelKo": "출하·납품",
        "fields": [
          "id",
          "order_id",
          "ship_date",
          "qty",
          "lot_ids",
          "delivery_note_no",
          "status"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "manage",
      "reviewer": "approve",
      "member": "edit"
    },
    "dependsOn": [
      "mfg-master-data",
      "partners"
    ]
  },
  {
    "id": "mfg-production",
    "nameKo": "생산",
    "tier": "P1",
    "group": "industry",
    "icon": "BuildOutlined",
    "route": "/ops/production",
    "industry": "manufacturing",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "작업지시와 일일 생산 실적(공정·설비·품목·양품·불량·LOT), 생산 일보. 설비에서 자동 수집하는 MES 기능은 범위 밖(있으면 연동)",
    "entities": [
      {
        "name": "WorkOrder",
        "labelKo": "작업지시",
        "fields": [
          "id",
          "order_line_id",
          "item_id",
          "process_step_id",
          "planned_qty",
          "planned_date",
          "equipment_id",
          "status"
        ]
      },
      {
        "name": "ProductionResult",
        "labelKo": "생산 실적",
        "fields": [
          "id",
          "work_order_id",
          "date",
          "process_step_id",
          "equipment_id",
          "item_id",
          "good_qty",
          "defect_qty",
          "lot_no",
          "worker_ids",
          "note"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "manage",
      "reviewer": "approve",
      "member": "edit"
    },
    "dependsOn": [
      "mfg-master-data",
      "mfg-equipment"
    ]
  },
  {
    "id": "mfg-quality",
    "nameKo": "품질",
    "tier": "P1",
    "group": "industry",
    "icon": "CheckCircleOutlined",
    "route": "/ops/quality",
    "industry": "manufacturing",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "수입·공정·출하 검사, 부적합(불량), 고객 클레임, 시정조치(8D 등), 계측기 검교정, 품질 문서 링크. 불량률(PPM)을 대표 화면 지표로 올린다",
    "entities": [
      {
        "name": "Inspection",
        "labelKo": "검사",
        "fields": [
          "id",
          "kind",
          "item_id",
          "lot_no",
          "inspected_on",
          "inspector_id",
          "result",
          "measurements_ref"
        ]
      },
      {
        "name": "Nonconformance",
        "labelKo": "부적합",
        "fields": [
          "id",
          "source",
          "item_id",
          "lot_no",
          "qty",
          "defect_type",
          "found_on",
          "disposition",
          "status",
          "linked_task_id"
        ]
      },
      {
        "name": "CustomerClaim",
        "labelKo": "고객 클레임",
        "fields": [
          "id",
          "partner_id",
          "item_id",
          "received_on",
          "description",
          "status",
          "due_on"
        ]
      },
      {
        "name": "CorrectiveAction",
        "labelKo": "시정조치",
        "fields": [
          "id",
          "related_type",
          "related_id",
          "method",
          "root_cause",
          "actions",
          "owner_id",
          "due_on",
          "status",
          "artifact_id"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "manage",
      "reviewer": "approve",
      "member": "edit"
    },
    "dependsOn": [
      "mfg-master-data",
      "documents",
      "tasks"
    ]
  },
  {
    "id": "mfg-equipment",
    "nameKo": "설비",
    "tier": "P1",
    "group": "industry",
    "icon": "ToolOutlined",
    "route": "/ops/equipment",
    "industry": "manufacturing",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "설비 대장, 일상·정기 점검, 고장·수리 이력, 금형·지그. 설비 안전 점검은 안전보건 모듈과 공유한다",
    "entities": [
      {
        "name": "Equipment",
        "labelKo": "설비",
        "fields": [
          "id",
          "equipment_no",
          "kind",
          "name",
          "location",
          "status",
          "installed_on",
          "note"
        ]
      },
      {
        "name": "EquipmentCheck",
        "labelKo": "설비 점검",
        "fields": [
          "id",
          "equipment_id",
          "kind",
          "checked_on",
          "checked_by",
          "result",
          "findings"
        ]
      },
      {
        "name": "BreakdownRecord",
        "labelKo": "고장·수리",
        "fields": [
          "id",
          "equipment_id",
          "occurred_at",
          "symptom",
          "downtime_min",
          "cause",
          "repair",
          "repaired_by",
          "linked_task_id"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "manage",
      "reviewer": "approve",
      "member": "edit"
    },
    "dependsOn": [
      "mfg-master-data"
    ]
  },
  {
    "id": "mfg-materials",
    "nameKo": "자재·재고",
    "tier": "P1",
    "group": "industry",
    "icon": "InboxOutlined",
    "route": "/ops/materials",
    "industry": "manufacturing",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "hybrid",
    "description": "원자재 입고(공급사 LOT·성적서 링크), 재고 LOT, 입출고 이동, 협력사 발주. LOT으로 원자재 → 생산 → 출하를 거꾸로 추적할 수 있게 한다",
    "entities": [
      {
        "name": "MaterialReceipt",
        "labelKo": "자재 입고",
        "fields": [
          "id",
          "partner_id",
          "item_id",
          "supplier_lot_no",
          "qty",
          "received_on",
          "cert_ref",
          "inspection_id"
        ]
      },
      {
        "name": "StockLot",
        "labelKo": "재고 LOT",
        "fields": [
          "id",
          "item_id",
          "lot_no",
          "qty_on_hand",
          "location",
          "status"
        ]
      },
      {
        "name": "StockMovement",
        "labelKo": "입출고",
        "fields": [
          "id",
          "lot_id",
          "kind",
          "qty",
          "moved_at",
          "ref_type",
          "ref_id"
        ]
      },
      {
        "name": "PurchaseOrder",
        "labelKo": "발주",
        "fields": [
          "id",
          "partner_id",
          "ordered_on",
          "lines",
          "due_on",
          "status"
        ]
      }
    ],
    "permissions": {
      "owner": "view",
      "admin": "manage",
      "reviewer": "approve",
      "member": "edit"
    },
    "dependsOn": [
      "mfg-master-data",
      "partners"
    ]
  },
  {
    "id": "edu-sales",
    "nameKo": "영업 기회·견적",
    "tier": "P2",
    "group": "industry",
    "icon": "SolutionOutlined",
    "route": "/ops/sales",
    "industry": "education_consulting",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "문의 → 요구사항 확인 → 견적 → 수주. 견적·할인율은 L2",
    "entities": [
      {
        "name": "Opportunity",
        "labelKo": "영업 기회",
        "fields": [
          "id",
          "partner_id",
          "stage",
          "owner_id",
          "expected_on"
        ]
      },
      {
        "name": "Quote",
        "labelKo": "견적",
        "fields": [
          "id",
          "opportunity_id",
          "quote_no",
          "status",
          "amount_krw",
          "discount_rate",
          "artifact_id"
        ]
      }
    ],
    "permissions": {
      "owner": "approve",
      "admin": "view",
      "reviewer": "approve",
      "member": "edit"
    },
    "dependsOn": [
      "partners",
      "documents"
    ]
  },
  {
    "id": "edu-programs",
    "nameKo": "과정·회차·강사",
    "tier": "P2",
    "group": "industry",
    "icon": "ScheduleOutlined",
    "route": "/ops/programs",
    "industry": "education_consulting",
    "defaultEnabled": true,
    "enabledByPacks": [],
    "buildMode": "build",
    "description": "교육 과정, 회차 일정, 강사 배정, 결과 보고",
    "entities": [
      {
        "name": "Course",
        "labelKo": "교육 과정",
        "fields": [
          "id",
          "name",
          "duration_hours",
          "owner_id",
          "status"
        ]
      },
      {
        "name": "Session",
        "labelKo": "회차",
        "fields": [
          "id",
          "course_id",
          "partner_id",
          "starts_at",
          "location",
          "instructor_ids",
          "status"
        ]
      },
      {
        "name": "Instructor",
        "labelKo": "강사",
        "fields": [
          "id",
          "display_name",
          "expertise",
          "contact_ref"
        ]
      }
    ],
    "permissions": {
      "owner": "manage",
      "admin": "manage",
      "reviewer": "approve",
      "member": "edit"
    },
    "dependsOn": [
      "partners",
      "calendar"
    ]
  }
] as RegistryModule[];

export const NAV_GROUPS: RegistryNavGroup[] = [
  {
    "id": "home",
    "order": 1,
    "nameKo": "홈",
    "icon": "HomeOutlined",
    "route": "/",
    "visibleTo": [
      "owner",
      "admin",
      "reviewer",
      "member"
    ]
  },
  {
    "id": "work",
    "order": 2,
    "nameKo": "내 업무",
    "icon": "CheckSquareOutlined",
    "route": "/work",
    "visibleTo": [
      "owner",
      "admin",
      "reviewer",
      "member"
    ]
  },
  {
    "id": "projects",
    "order": 3,
    "nameKo": "프로젝트",
    "icon": "ProjectOutlined",
    "route": "/projects",
    "visibleTo": [
      "owner",
      "admin",
      "reviewer",
      "member"
    ]
  },
  {
    "id": "meetings",
    "order": 4,
    "nameKo": "회의",
    "icon": "TeamOutlined",
    "route": "/meetings",
    "visibleTo": [
      "owner",
      "admin",
      "reviewer",
      "member"
    ]
  },
  {
    "id": "docs",
    "order": 5,
    "nameKo": "문서·지식",
    "icon": "FileTextOutlined",
    "route": "/docs",
    "visibleTo": [
      "owner",
      "admin",
      "reviewer",
      "member"
    ]
  },
  {
    "id": "industry",
    "order": 6,
    "nameKo": "(업종 팩 이름)",
    "nameByPack": {
      "manufacturing": "생산·품질",
      "education_consulting": "영업·교육"
    },
    "icon": "BuildOutlined",
    "route": "/ops",
    "visibleTo": [
      "owner",
      "admin",
      "reviewer",
      "member"
    ]
  },
  {
    "id": "company",
    "order": 7,
    "nameKo": "회사",
    "icon": "BankOutlined",
    "route": "/company",
    "visibleTo": [
      "owner",
      "admin",
      "reviewer",
      "member"
    ]
  },
  {
    "id": "ara",
    "order": 8,
    "nameKo": "ARA",
    "icon": "HeartOutlined",
    "route": "/ara",
    "visibleTo": [
      "owner",
      "admin",
      "reviewer",
      "member"
    ]
  },
  {
    "id": "admin",
    "order": 9,
    "nameKo": "관리",
    "icon": "SettingOutlined",
    "route": "/admin",
    "visibleTo": [
      "owner",
      "admin"
    ]
  }
] as RegistryNavGroup[];

export const MOBILE_TABS: Record<"default" | "manufacturing", RegistryMobileTab[]> = {
  "default": [
    {
      "id": "home",
      "nameKo": "홈",
      "icon": "HomeOutlined",
      "route": "/"
    },
    {
      "id": "work",
      "nameKo": "내 업무",
      "icon": "CheckSquareOutlined",
      "route": "/work"
    },
    {
      "id": "meetings",
      "nameKo": "회의",
      "icon": "TeamOutlined",
      "route": "/meetings"
    },
    {
      "id": "notifications",
      "nameKo": "알림",
      "icon": "BellOutlined",
      "route": "/notifications"
    },
    {
      "id": "more",
      "nameKo": "전체",
      "icon": "AppstoreOutlined",
      "route": "/more"
    }
  ],
  "manufacturing": [
    {
      "id": "home",
      "nameKo": "홈",
      "icon": "HomeOutlined",
      "route": "/"
    },
    {
      "id": "work",
      "nameKo": "내 업무",
      "icon": "CheckSquareOutlined",
      "route": "/work"
    },
    {
      "id": "field-report",
      "nameKo": "현장 등록",
      "icon": "PlusCircleOutlined",
      "route": "/ops/report"
    },
    {
      "id": "notifications",
      "nameKo": "알림",
      "icon": "BellOutlined",
      "route": "/notifications"
    },
    {
      "id": "more",
      "nameKo": "전체",
      "icon": "AppstoreOutlined",
      "route": "/more"
    }
  ]
};

export const HOME_WIDGETS: RegistryWidget[] = [
  {
    "id": "greeting",
    "nameKo": "인사·오늘",
    "tier": "P0",
    "module": "home-dashboard",
    "suitableFor": [
      "ceo",
      "lead",
      "staff",
      "staff_admin"
    ]
  },
  {
    "id": "my-tasks",
    "nameKo": "내 업무",
    "tier": "P0",
    "module": "tasks",
    "suitableFor": [
      "lead",
      "staff",
      "staff_admin"
    ]
  },
  {
    "id": "returned-submissions",
    "nameKo": "수정 요청 받은 제출",
    "tier": "P0",
    "module": "tasks",
    "suitableFor": [
      "staff",
      "staff_admin"
    ]
  },
  {
    "id": "review-queue",
    "nameKo": "검토 대기",
    "tier": "P0",
    "module": "tasks",
    "suitableFor": [
      "ceo",
      "lead"
    ]
  },
  {
    "id": "team-workload",
    "nameKo": "팀 업무 현황",
    "tier": "P0",
    "module": "tasks",
    "suitableFor": [
      "lead"
    ]
  },
  {
    "id": "project-health",
    "nameKo": "사업·프로젝트 현황",
    "tier": "P0",
    "module": "business-structure",
    "suitableFor": [
      "ceo",
      "lead"
    ]
  },
  {
    "id": "upcoming-meetings",
    "nameKo": "회의와 내 액션",
    "tier": "P0",
    "module": "meetings",
    "suitableFor": [
      "lead",
      "staff",
      "staff_admin"
    ]
  },
  {
    "id": "recent-decisions",
    "nameKo": "최근 결정",
    "tier": "P0",
    "module": "meetings",
    "suitableFor": [
      "ceo",
      "lead"
    ]
  },
  {
    "id": "notices",
    "nameKo": "공지",
    "tier": "P0",
    "module": "notices",
    "suitableFor": [
      "ceo",
      "lead",
      "staff",
      "staff_admin"
    ]
  },
  {
    "id": "ai-connect-status",
    "nameKo": "내 AI 연결",
    "tier": "P0",
    "module": "ai-connect",
    "suitableFor": [
      "staff",
      "staff_admin"
    ]
  },
  {
    "id": "company-kpi",
    "nameKo": "회사 KPI",
    "tier": "P1",
    "module": "reports",
    "suitableFor": [
      "ceo"
    ]
  },
  {
    "id": "ax-effect",
    "nameKo": "AX 운영 효과",
    "tier": "P1",
    "module": "reports",
    "suitableFor": [
      "ceo",
      "staff_admin"
    ]
  },
  {
    "id": "approvals-pending",
    "nameKo": "결재 대기",
    "tier": "P1",
    "module": "approvals",
    "suitableFor": [
      "ceo",
      "lead",
      "staff"
    ]
  },
  {
    "id": "attendance-today",
    "nameKo": "오늘 근무·휴가",
    "tier": "P1",
    "module": "attendance-leave",
    "suitableFor": [
      "ceo",
      "lead",
      "staff"
    ]
  },
  {
    "id": "mail-followups",
    "nameKo": "메일 후속 제안",
    "tier": "P1",
    "module": "mail-connector",
    "suitableFor": [
      "lead",
      "staff"
    ]
  },
  {
    "id": "safety-status",
    "nameKo": "안전보건 현황",
    "tier": "P1",
    "module": "safety-health",
    "suitableFor": [
      "ceo",
      "staff_admin"
    ]
  },
  {
    "id": "ara-card",
    "nameKo": "나의 ARA",
    "tier": "P1",
    "module": "ara-wellbeing",
    "suitableFor": [
      "ceo",
      "lead",
      "staff",
      "staff_admin"
    ]
  },
  {
    "id": "ara-aggregate",
    "nameKo": "복지 집계",
    "tier": "P1",
    "module": "ara-wellbeing",
    "suitableFor": [
      "ceo",
      "staff_admin"
    ]
  },
  {
    "id": "calendar-week",
    "nameKo": "이번 주 일정",
    "tier": "P1",
    "module": "calendar",
    "suitableFor": [
      "lead",
      "staff"
    ]
  },
  {
    "id": "admin-health",
    "nameKo": "운영 점검",
    "tier": "P1",
    "module": "integrations",
    "suitableFor": [
      "staff_admin"
    ]
  },
  {
    "id": "mfg-delivery-due",
    "nameKo": "납기 임박",
    "tier": "P1",
    "module": "mfg-orders",
    "industry": "manufacturing",
    "suitableFor": [
      "ceo",
      "lead"
    ]
  },
  {
    "id": "mfg-production-today",
    "nameKo": "오늘 생산",
    "tier": "P1",
    "module": "mfg-production",
    "industry": "manufacturing",
    "suitableFor": [
      "ceo",
      "lead"
    ]
  },
  {
    "id": "mfg-quality-ppm",
    "nameKo": "품질 지표",
    "tier": "P1",
    "module": "mfg-quality",
    "industry": "manufacturing",
    "suitableFor": [
      "ceo",
      "lead"
    ]
  },
  {
    "id": "mfg-equipment-status",
    "nameKo": "설비 상태",
    "tier": "P1",
    "module": "mfg-equipment",
    "industry": "manufacturing",
    "suitableFor": [
      "lead"
    ]
  },
  {
    "id": "mfg-field-report",
    "nameKo": "현장 등록",
    "tier": "P1",
    "module": "mfg-quality",
    "industry": "manufacturing",
    "suitableFor": [
      "staff"
    ]
  },
  {
    "id": "mfg-material-alert",
    "nameKo": "자재 부족",
    "tier": "P1",
    "module": "mfg-materials",
    "industry": "manufacturing",
    "suitableFor": [
      "lead"
    ]
  },
  {
    "id": "mfg-claims-8d",
    "nameKo": "클레임·8D",
    "tier": "P1",
    "module": "mfg-quality",
    "industry": "manufacturing",
    "suitableFor": [
      "ceo",
      "lead"
    ],
    "extra": true
  },
  {
    "id": "mfg-inspection-queue",
    "nameKo": "검사 대기",
    "tier": "P1",
    "module": "mfg-quality",
    "industry": "manufacturing",
    "suitableFor": [
      "lead",
      "staff"
    ],
    "extra": true
  },
  {
    "id": "mfg-4m-changes",
    "nameKo": "4M 변경",
    "tier": "P1",
    "module": "mfg-quality",
    "industry": "manufacturing",
    "suitableFor": [
      "lead",
      "staff"
    ],
    "extra": true
  },
  {
    "id": "mfg-calibration-due",
    "nameKo": "계측기 검교정",
    "tier": "P1",
    "module": "mfg-quality",
    "industry": "manufacturing",
    "suitableFor": [
      "lead",
      "staff"
    ],
    "extra": true
  },
  {
    "id": "mfg-first-mid-last",
    "nameKo": "초중종물 미실시",
    "tier": "P1",
    "module": "mfg-production",
    "industry": "manufacturing",
    "suitableFor": [
      "lead",
      "staff"
    ],
    "extra": true
  },
  {
    "id": "mfg-pm-due",
    "nameKo": "보전 일정",
    "tier": "P1",
    "module": "mfg-equipment",
    "industry": "manufacturing",
    "suitableFor": [
      "lead",
      "staff"
    ],
    "extra": true
  },
  {
    "id": "mfg-legal-calendar",
    "nameKo": "법정 일정",
    "tier": "P1",
    "module": "safety-health",
    "industry": "manufacturing",
    "suitableFor": [
      "ceo",
      "lead",
      "staff_admin"
    ],
    "extra": true
  },
  {
    "id": "mfg-monthly-summary",
    "nameKo": "이달 요약",
    "tier": "P1",
    "module": "mfg-production",
    "industry": "manufacturing",
    "suitableFor": [
      "ceo"
    ],
    "extra": true
  },
  {
    "id": "mfg-order-backlog",
    "nameKo": "수주 잔량",
    "tier": "P1",
    "module": "mfg-orders",
    "industry": "manufacturing",
    "suitableFor": [
      "lead"
    ],
    "extra": true
  },
  {
    "id": "mfg-field-feed",
    "nameKo": "오늘 현장 등록",
    "tier": "P1",
    "module": "mfg-quality",
    "industry": "manufacturing",
    "suitableFor": [
      "lead"
    ],
    "extra": true
  },
  {
    "id": "mfg-dev-projects",
    "nameKo": "개발 진행",
    "tier": "P1",
    "module": "business-structure",
    "industry": "manufacturing",
    "suitableFor": [
      "lead",
      "staff"
    ],
    "extra": true
  },
  {
    "id": "mfg-material-price",
    "nameKo": "원재료 가격",
    "tier": "P1",
    "module": "mfg-materials",
    "industry": "manufacturing",
    "suitableFor": [
      "ceo",
      "staff_admin"
    ],
    "extra": true
  },
  {
    "id": "approval-inbox",
    "nameKo": "승인 대기",
    "tier": "P1",
    "module": "tasks",
    "suitableFor": [
      "ceo",
      "lead",
      "staff_admin"
    ],
    "extra": true
  }
] as RegistryWidget[];

export const HOME_PRESETS: Record<PresetId, WidgetId[]> = {
  "ceo": [
    "greeting",
    "company-kpi",
    "project-health",
    "review-queue",
    "recent-decisions",
    "ax-effect",
    "safety-status",
    "notices"
  ],
  "lead": [
    "greeting",
    "review-queue",
    "team-workload",
    "my-tasks",
    "upcoming-meetings",
    "project-health",
    "approvals-pending"
  ],
  "staff": [
    "greeting",
    "my-tasks",
    "returned-submissions",
    "upcoming-meetings",
    "notices",
    "ai-connect-status",
    "ara-card"
  ],
  "staff_admin": [
    "greeting",
    "admin-health",
    "my-tasks",
    "notices",
    "ax-effect",
    "safety-status",
    "ai-connect-status"
  ]
} as Record<PresetId, WidgetId[]>;

export const MANUFACTURING_OVERRIDES: Partial<Record<PresetId, { insertAfter: WidgetId; widgets: WidgetId[] }>> = {
  "ceo": {
    "insertAfter": "greeting",
    "widgets": [
      "mfg-delivery-due",
      "mfg-quality-ppm"
    ]
  },
  "lead": {
    "insertAfter": "greeting",
    "widgets": [
      "mfg-production-today",
      "mfg-equipment-status"
    ]
  },
  "staff": {
    "insertAfter": "greeting",
    "widgets": [
      "mfg-field-report"
    ]
  }
} as Partial<Record<PresetId, { insertAfter: WidgetId; widgets: WidgetId[] }>>;

export const EXCLUDED_MODULES: { id: string; nameKo: string; instead: string }[] = [
  {
    "id": "messenger",
    "nameKo": "메신저",
    "instead": "카카오워크·네이버웍스·잔디·Slack 봇"
  },
  {
    "id": "mail-client",
    "nameKo": "메일 앱",
    "instead": "mail-connector"
  },
  {
    "id": "drive",
    "nameKo": "드라이브·파일 저장소",
    "instead": "documents(메타데이터·버전)"
  },
  {
    "id": "editor-wiki",
    "nameKo": "문서 에디터·위키 엔진",
    "instead": "knowledge(연결 구조·검증 주기)"
  },
  {
    "id": "stt",
    "nameKo": "음성 인식(회의록 작성)",
    "instead": "meetings(분류·라우팅)"
  },
  {
    "id": "e-approval-core",
    "nameKo": "전자결재 엔진",
    "instead": "approvals(연동)"
  },
  {
    "id": "hr-payroll",
    "nameKo": "인사·급여·근태 계산",
    "instead": "attendance-leave(연동 요약)"
  },
  {
    "id": "accounting-erp",
    "nameKo": "회계·경비·ERP",
    "instead": "integrations(ERP 연동), 업종 팩은 ERP가 없을 때만 경량"
  },
  {
    "id": "enterprise-search",
    "nameKo": "사내 통합검색(외부 도구 전체)",
    "instead": "search(사이트 안 검색)"
  }
];

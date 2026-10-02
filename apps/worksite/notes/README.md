# 통합 담당에게 보내는 메모

그룹 개발자는 자기 소유 경로(`src/pages/<내 dir>/**`, `src/data/seed/<내 그룹>.ts`) 밖을 고치지 않습니다.
공통 파일(컴포넌트·공급자·타입·토큰·라우트·테넌트 설정)에 바꿀 것이 생기면 **자기 그룹 파일**에 적어 주세요.

| 파일 | 그룹 |
|---|---|
| `notes/home.md` | home |
| `notes/work.md` | work |
| `notes/collab.md` | collab |
| `notes/industry.md` | industry |
| `notes/ara_settings.md` | ara_settings |

한 건에 한 항목으로, 아래 형식을 지켜 주세요.

```
## [요청] 짧은 제목
- 무엇을: (파일·컴포넌트·타입 이름)
- 왜: (어느 화면 · 빌드 스펙 몇 절)
- 임시로 한 것: (예: pages/work-list/_local/Foo.tsx 에 임시 구현 — "공통 승격 후보")
- 급한 정도: 막힘 / 있으면 좋음
```

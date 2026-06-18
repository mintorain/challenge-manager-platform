# 챌린지 매니저 MVP

블로그 챌린지 운영을 위한 1차 MVP 웹앱입니다. 현재 버전은 React 프론트엔드와 Node/Express API 서버, SQLite 파일 DB로 동작합니다.

## 실행

터미널 1: API 서버

```bash
npm install
npm run api
```

터미널 2: 프론트엔드 개발 서버

```bash
npm run dev
```

프론트엔드 주소:

```text
http://127.0.0.1:5173
```

API 주소:

```text
http://127.0.0.1:4173
```

정적 demo 배포:

```text
https://mintorain.github.io/challenge-manager-platform/
```

## 테스트 계정

관리자:

```text
admin@challenge.local / admin1234
```

참가자:

```text
user@challenge.local / user1234
```

## 구현 범위

- 이메일/비밀번호 로그인
- scrypt 비밀번호 해시 저장
- Bearer 세션 토큰 기반 API 인증
- 로그아웃 시 서버 세션 폐기
- 관리자/참가자 권한 분리
- 블로그 챌린지 생성/수정/상태 변경
- 블로그/유튜브/틱톡 플랫폼 타입 관리
- 참가 신청
- 관리자 수동 결제 완료 처리
- 링크 인증 제출
- 플랫폼별 인증 링크 도메인 검증
- 회차별 중복 인증 제출 방지
- 인증 사진 첨부 및 미리보기
- 인증 승인/반려
- 성공 여부와 랭킹 계산
- 성공자 상금 지급 대상 산정
- 참가자별 상금 지급 상태 관리
- 관리자 참가자 검색/필터
- 관리자 인증 심사 검색/필터
- 관리자 인증 선택 일괄 승인
- 성공자 CSV 다운로드
- 감사 로그
- 고객명, 예상 청구 금액, 청구 상태 관리
- 서버 API 기반 데이터 처리
- SQLite 파일 DB 저장

## 제외 범위

- 실제 PG 결제
- 계좌번호 저장
- 자동 송금
- 세무/원천징수 자동 계산
- 유튜브/틱톡 API 연동
- 이메일/문자/카카오 알림

## 저장 방식

현재 데이터는 `data/challenge-manager.sqlite`에 저장됩니다. DB 파일을 삭제하면 API 서버 시작 시 초기 샘플 데이터가 다시 생성됩니다.

사진 인증은 현재 SQLite에 base64 데이터로 저장되므로 700KB 이하 이미지로 제한됩니다. 실제 서비스에서는 S3, Supabase Storage 같은 별도 파일 저장소로 분리하는 것이 좋습니다.

GitHub Pages 배포본은 Express API 없이 동작하는 브라우저 demo 모드입니다. 이 경우 데이터는 브라우저 `localStorage`에 저장되며, 관리자/참가자 흐름을 체험할 수 있습니다.

## 인증 제출 정책

인증 링크는 챌린지 플랫폼 타입과 일치해야 합니다. 블로그는 네이버 블로그, 티스토리, 브런치, Medium, Velog, WordPress, Blogspot 계열을 허용하고, 유튜브는 `youtube.com` 또는 `youtu.be`, 틱톡은 `tiktok.com` 또는 `vt.tiktok.com` 링크를 허용합니다.

같은 참가자가 같은 회차에 이미 `검토 중` 또는 `승인` 상태의 인증을 제출한 경우 중복 제출은 차단됩니다. 반려된 회차는 다시 제출할 수 있습니다.

## 주요 API

- `GET /api/bootstrap`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `POST /api/admin/challenges`
- `PATCH /api/admin/challenges/:id`
- `PATCH /api/admin/challenges/:id/status`
- `PATCH /api/admin/participants/:id`
- `PATCH /api/admin/participants/:id/payout`
- `POST /api/challenges/:id/join`
- `POST /api/challenges/:id/submissions`
- `PATCH /api/admin/submissions/:id/review`
- `POST /api/admin/challenges/:id/recalculate-results`
- `GET /api/admin/challenges/:id/winners.csv`

관리자 API와 참가자 제출/신청 API는 로그인 응답의 `token`을 `Authorization: Bearer <token>` 헤더로 전달해야 합니다.

## 정산 운영

상금 지급은 자동 송금이 아니라 운영 기록 관리 방식입니다. 챌린지 종료 후 `랭킹/성공자` 또는 `상금 정산` 화면에서 대상 재계산을 실행하면 성공자에게 참가비 표시 금액 기준의 지급 예정액이 배정됩니다. 운영자는 지급 상태를 `지급 대기`, `지급 보류`, `지급 완료`로 변경할 수 있고, CSV에는 지급액과 지급 상태가 포함됩니다.

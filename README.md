# Challenge Manager Platform

챌린지 운영자가 블로그, 유튜브, 틱톡 기반 챌린지를 개설하고 참가자 인증, 성공 판정, 정산 상태를 관리할 수 있도록 만든 플랫폼 프로젝트입니다. 이 저장소에는 제품 기획 문서, PRD, 프론트엔드 디자인 문서, 그리고 현재 구현된 React/Express MVP 애플리케이션이 함께 포함되어 있습니다.

## Overview

- 챌린지 개설, 모집, 진행, 종료, 정산 상태 관리
- 블로그, 유튜브, 틱톡 플랫폼 타입별 챌린지 운영
- 참가 신청, 결제 상태 수동 관리
- 링크 및 이미지 기반 인증 제출
- 플랫폼별 링크 검증과 회차 중복 제출 방지
- 성공 여부 계산, 참가자 랭킹, CSV 다운로드
- 상금 지급 대상 계산과 지급 상태 추적
- 감사 로그 기반 운영 이력 확인

## Repository Structure

- `challenge-manager/`
  React + Vite 프론트엔드와 Express + SQLite API 서버가 포함된 현재 MVP 앱
- `챌린지_매니저_플랫폼_기획서.md`
  서비스 컨셉, 기능 방향, 운영 시나리오를 담은 제품 기획서
- `챌린지_매니저_플랫폼_PRD_MVP.md`
  MVP 범위를 좁혀 구현 가능한 수준으로 정리한 PRD
- `챌린지_매니저_플랫폼_PRD_구현착수용.md`
  실제 개발 착수를 위한 기능/운영 기준 정리 문서
- `챌린지_매니저_플랫폼_프론트엔드_디자인_기획서.md`
  관리자/참가자 화면의 UX와 UI 방향 문서

## Current MVP Scope

- 이메일/비밀번호 로그인, 회원가입
- scrypt 비밀번호 해시 저장
- Bearer 세션 토큰 기반 인증
- 관리자/참가자 권한 분리
- 챌린지 생성/수정/상태 관리
- 블로그/유튜브/틱톡 플랫폼 타입 관리
- 참가 신청과 수동 결제 상태 처리
- 인증 제출, 승인, 반려
- 플랫폼별 인증 링크 도메인 검증
- 회차별 중복 인증 제출 방지
- 성공 여부 및 랭킹 계산
- 상금 지급 대상 산정과 지급 상태 관리
- 감사 로그 및 성공자 CSV 다운로드

## Not Included Yet

- 실제 PG 결제 연동
- 자동 환불 처리
- 자동 송금
- 세무/원천징수 자동 계산
- 유튜브/틱톡 공식 API 연동
- 이메일, 문자, 카카오 알림 발송
- 외부 파일 스토리지 분리

## Tech Stack

- Frontend: React, Vite, lucide-react
- Backend: Node.js, Express
- Database: SQLite
- Auth: email/password + Bearer session token
- Local verification: Playwright, lint, build

## Running Locally

앱 상세 실행 방법은 [challenge-manager/README.md](./challenge-manager/README.md)에 정리되어 있습니다. 빠른 실행 기준은 아래와 같습니다.

1. 앱 디렉터리로 이동
```bash
cd challenge-manager
```

2. 의존성 설치
```bash
npm install
```

3. API 서버 실행
```bash
npm run api
```

4. 프론트엔드 개발 서버 실행
```bash
npm run dev
```

기본 주소:

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4173`

테스트 계정:

- 관리자: `admin@challenge.local / admin1234`
- 참가자: `user@challenge.local / user1234`

## Application Notes

- SQLite 파일은 `challenge-manager/data/challenge-manager.sqlite`에 저장됩니다.
- 이미지 인증은 현재 SQLite에 base64로 저장되며, 용량 제한은 700KB입니다.
- 플랫폼별 인증 링크는 허용 도메인 기준으로 검증됩니다.
- 같은 참가자가 같은 회차에 이미 검토 중이거나 승인된 인증은 다시 제출할 수 없습니다.

## Verification Status

최근 작업 기준으로 아래 검증을 통과한 상태입니다.

- `npm run lint`
- `npm run build`
- `node --check challenge-manager/server/index.js`
- 브라우저에서 관리자/참가자 핵심 흐름 수동 검증

## Next Priorities

- 외부 파일 스토리지 분리
- 관리자 검색/필터/대량 처리 고도화
- 자동화된 테스트 코드 추가
- 배포 환경 구성
- 실제 결제/송금/알림 연동

## Related Docs

- App guide: [challenge-manager/README.md](./challenge-manager/README.md)
- Product planning: [챌린지_매니저_플랫폼_기획서.md](./챌린지_매니저_플랫폼_기획서.md)
- MVP PRD: [챌린지_매니저_플랫폼_PRD_MVP.md](./챌린지_매니저_플랫폼_PRD_MVP.md)
- Implementation PRD: [챌린지_매니저_플랫폼_PRD_구현착수용.md](./챌린지_매니저_플랫폼_PRD_구현착수용.md)
- Frontend design: [챌린지_매니저_플랫폼_프론트엔드_디자인_기획서.md](./챌린지_매니저_플랫폼_프론트엔드_디자인_기획서.md)

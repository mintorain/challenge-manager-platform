# 챌린지 매니저 플랫폼 PRD - 구현 착수용

## 1. 목적

이 문서는 실제 개발을 시작하기 위한 최소 구현 범위를 확정한다.

기존 문서:

- `챌린지_매니저_플랫폼_기획서.md`: 장기 제품 기획
- `챌린지_매니저_플랫폼_PRD_MVP.md`: MVP 전체 요구사항

본 문서:

- 1차 구현에서 반드시 만들 기능만 정의
- 외부 결제, 세무, 자동 송금, 외부 API 연동 제외
- 개발자가 화면, DB, API, 테스트를 바로 설계할 수 있는 기준 제공

## 2. 최종 구현 범위 요약

### 2.1 제품명

챌린지 매니저

### 2.2 1차 구현 한 줄 정의

관리자가 블로그 챌린지를 만들고 참가자를 관리하며, 참가자가 링크 인증을 제출하면 관리자가 승인/반려하고 성공자를 산출하는 웹 플랫폼.

### 2.3 1차 구현 핵심 범위

- 이메일/비밀번호 로그인
- 관리자/참가자 권한 분리
- 블로그 챌린지 생성 및 관리
- 참가 신청
- 관리자 수동 결제 완료 처리
- 링크 인증 제출
- 인증 승인/반려
- 성공 여부 계산
- 랭킹 산출
- 성공자 CSV 다운로드
- 관리자 감사 로그
- 수익화 검증용 고객/과금 메모 관리

### 2.4 1차 구현에서 제외

- 실제 PG 결제
- 계좌번호 저장
- 상금 자동 송금
- 원천징수 자동 계산
- 유튜브 챌린지
- 틱톡 챌린지
- 블로그 본문 자동 분석
- 외부 API 자동 조회
- 이메일/문자/카카오 자동 알림
- 소셜 로그인
- 모바일 앱
- 커뮤니티 기능
- 이의 제기 상세 워크플로우
- 인앱 구독 결제
- 자동 세금계산서 발행
- 광고주 셀프 결제

### 2.5 수익화 검토 결론

이 플랫폼은 수익화 가능성이 있다. 다만 1차 수익화 방향은 참가자에게 직접 수수료를 부과하는 방식보다, 챌린지를 운영하려는 사업자에게 운영 도구와 캠페인 관리 기능을 제공하고 비용을 받는 B2B 모델이 더 적합하다.

수익화 가능성이 있는 이유:

- 블로그, 유튜브, 틱톡 기반 콘텐츠 마케팅 수요가 계속 존재한다.
- 브랜드와 강사는 참여자 모집, 인증 확인, 순위 산정, 리워드 지급 대상자 정리에 반복적인 운영 비용을 쓴다.
- 챌린지 운영은 단발성이 아니라 매월 반복될 수 있어 구독형 또는 운영 대행형 과금이 가능하다.
- 초기에는 자동 결제 없이도 운영자가 직접 고객을 받아 수동 청구 방식으로 매출 검증이 가능하다.

수익화 리스크:

- 참가비를 상금으로 직접 연결하면 법무/세무 리스크가 커진다.
- 참가자 대상 과금은 환불, 민원, 정산 부담이 크다.
- 유튜브/틱톡 자동 검증을 약속하면 외부 API 정책과 장애 리스크가 생긴다.
- 브랜드 캠페인은 광고 표시, 협찬 고지, 콘텐츠 품질 관리가 필요하다.

1차 권장 수익화 모델:

- 챌린지 운영자 또는 브랜드에게 월 구독료를 받는다.
- 챌린지 개설 건수 또는 참가자 수에 따라 운영비를 받는다.
- 초기에는 외부 계약/계좌이체/세금계산서 등 시스템 밖에서 과금한다.
- 플랫폼은 고객, 챌린지, 참가자, 인증, 성공자 CSV를 관리하는 운영툴 역할에 집중한다.

## 3. 구현 원칙

### 3.1 범위 제한 원칙

1차 구현은 “운영 가능한 최소 관리자 도구 + 참가자 인증 제출 도구”로 제한한다.

참가비와 상금은 화면에 표시할 수 있지만, 실제 결제와 지급 처리는 시스템 밖에서 운영한다.

### 3.2 법무/세무 리스크 회피 원칙

- 시스템은 참가비를 실제로 결제받지 않는다.
- 시스템은 계좌정보를 저장하지 않는다.
- 시스템은 세금 계산을 하지 않는다.
- 시스템은 상금을 자동 지급하지 않는다.
- 시스템은 성공자와 지급 참고 목록만 제공한다.

### 3.3 외부 플랫폼 리스크 회피 원칙

- 블로그 링크는 사용자가 직접 제출한다.
- 블로그 본문, 발행일, 키워드는 자동 검증하지 않는다.
- 관리자가 링크를 열어 수동 확인한다.
- 유튜브, 틱톡은 1차 구현 대상이 아니다.

### 3.4 수익화 검증 원칙

1차 구현에서는 결제 시스템을 만들지 않고, 수익화 검증에 필요한 최소 운영 데이터만 남긴다.

포함:

- 챌린지를 의뢰한 고객명
- 고객 유형
- 과금 방식 메모
- 예상 청구 금액
- 청구 상태
- 내부 영업/운영 메모

제외:

- 카드 결제
- 정기 구독 자동 결제
- 세금계산서 자동 발행
- PG 정산
- 매출 회계 자동 처리

이 방식은 개발 범위를 크게 늘리지 않으면서도 실제로 돈을 낼 고객이 있는지 검증할 수 있다.

## 4. 사용자 역할

## 4.1 관리자

관리자는 챌린지를 만들고 참가자, 인증, 성공자, CSV를 관리한다.

가능한 작업:

- 로그인
- 챌린지 생성
- 챌린지 수정
- 챌린지 상태 변경
- 참가자 목록 조회
- 참가자 결제 상태 변경
- 인증 목록 조회
- 인증 승인
- 인증 반려
- 성공 여부 재계산
- 랭킹 확인
- 성공자 CSV 다운로드
- 감사 로그 확인

## 4.2 참가자

참가자는 챌린지에 신청하고 링크 인증을 제출한다.

가능한 작업:

- 회원가입
- 로그인
- 챌린지 목록 조회
- 챌린지 상세 조회
- 참가 신청
- 내 챌린지 조회
- 링크 인증 제출
- 내 인증 상태 확인
- 반려 사유 확인
- 내 성공 여부 확인

## 5. 핵심 정책

## 5.1 챌린지 정책

1차 구현의 챌린지 유형은 `블로그` 하나만 지원한다.

챌린지 생성 필수값:

- 제목
- 설명
- 모집 시작일
- 모집 종료일
- 진행 시작일
- 진행 종료일
- 참가비 표시 금액
- 전체 미션 수
- 성공 필요 승인 수
- 최대 참가자 수
- 인증 안내 문구
- 환불 안내 문구

챌린지 상태:

- `draft`: 임시 저장
- `recruiting`: 모집 중
- `active`: 진행 중
- `closed`: 종료
- `settled`: 정산 완료

상태 전이:

- `draft -> recruiting`
- `recruiting -> active`
- `active -> closed`
- `closed -> settled`

수정 제한:

- `draft`, `recruiting` 상태에서는 대부분 수정 가능
- `active` 상태에서는 제목, 설명, 안내 문구만 수정 가능
- `active` 상태에서는 참가비, 기간, 전체 미션 수, 성공 필요 승인 수 수정 불가
- `closed`, `settled` 상태에서는 수정 불가

## 5.2 참가 정책

참가자는 `recruiting` 상태의 챌린지에만 신청할 수 있다.

참가 상태:

- `applied`: 신청
- `confirmed`: 참가 확정
- `canceled`: 참가 취소

참가 규칙:

- 같은 사용자는 같은 챌린지에 1번만 신청할 수 있다.
- 최대 참가자 수에 도달하면 신청할 수 없다.
- 참가 신청 직후 상태는 `applied`다.
- 관리자가 결제 상태를 `paid`로 바꾸면 참가 상태는 `confirmed`가 된다.
- `confirmed` 상태만 인증 제출 가능하다.

## 5.3 결제 상태 정책

1차 구현에서는 실제 결제 연동을 하지 않는다.

결제 상태:

- `pending`: 결제 대기
- `paid`: 결제 완료
- `refunded`: 환불 완료
- `canceled`: 취소

규칙:

- 참가 신청 직후 결제 상태는 `pending`이다.
- 관리자가 수동으로 `paid` 처리한다.
- `paid` 처리 시 참가 상태는 자동으로 `confirmed`가 된다.
- `refunded` 또는 `canceled` 상태는 인증 제출이 불가능하다.
- 결제 상태 변경은 감사 로그에 기록한다.

## 5.4 인증 제출 정책

1차 구현에서는 링크 인증을 필수로 하고 사진 업로드는 제외한다.

사진 업로드는 개발 난이도와 저장소 설계 부담이 있으므로 1차 구현에서 제외한다. 기존 MVP 문서의 사진 인증은 2차 기능으로 이동한다.

인증 제출 필수값:

- 미션 회차
- 블로그 링크
- 인증 설명

인증 상태:

- `pending`: 검토 중
- `approved`: 승인
- `rejected`: 반려

인증 규칙:

- 참가 확정 상태에서만 제출 가능
- 챌린지 진행 기간 안에서만 제출 가능
- 미션 회차는 1부터 전체 미션 수 사이의 숫자만 허용
- 같은 회차에 여러 번 제출 가능
- 성공 계산에는 회차별 승인 인증 1개만 반영
- 반려된 인증은 삭제하지 않고 이력으로 유지

## 5.5 심사 정책

관리자는 제출 인증을 승인 또는 반려할 수 있다.

승인 규칙:

- `pending` 인증만 승인 가능
- 승인 시 심사자와 심사 시각 저장
- 승인 시 감사 로그 기록

반려 규칙:

- `pending` 인증만 반려 가능
- 반려 사유 필수
- 반려 시 심사자와 심사 시각 저장
- 반려 시 감사 로그 기록

반려 사유 기본값:

- 링크 접속 불가
- 기간 외 콘텐츠
- 필수 조건 미충족
- 중복 제출
- 부적절한 콘텐츠
- 기타

## 5.6 성공 판정 정책

성공 기준은 승인된 미션 회차 수다.

계산식:

```text
승인된 고유 미션 회차 수 >= 성공 필요 승인 수
```

예시:

- 전체 미션 수: 7
- 성공 필요 승인 수: 5
- 승인된 고유 회차: 1, 2, 3, 5, 7
- 결과: 성공

계산 제외:

- 반려 인증
- 검토 중 인증
- 취소 참가자
- 결제 완료가 아닌 참가자

## 5.7 랭킹 정책

랭킹은 단순 기준으로 산출한다.

정렬 순서:

1. 승인된 고유 미션 회차 수가 많은 순
2. 마지막 승인 시간이 빠른 순
3. 참가 신청 시간이 빠른 순

동점 처리는 위 순서로만 한다.

조회수, 좋아요, 댓글, 공유 수는 1차 구현에서 사용하지 않는다.

## 5.8 CSV 정책

CSV는 성공자와 운영 정산 참고용으로 제공한다.

CSV 다운로드 권한:

- 관리자만 가능

CSV 파일명:

```text
challenge-{challenge_id}-winners-{YYYYMMDD}.csv
```

CSV 포함 필드:

- challenge_id
- challenge_title
- user_id
- user_name
- user_email
- user_phone
- approved_round_count
- required_approval_count
- final_rank
- success_status
- payment_status
- participation_status

CSV 제외 필드:

- 계좌번호
- 주민등록번호
- 신분증 정보
- 세금 신고용 고유식별정보

## 5.9 수익화 정책

1차 구현의 수익화는 플랫폼 내부 결제가 아니라 운영자 수동 청구 방식으로 한다.

권장 과금 대상:

- 챌린지를 운영하려는 강사
- 교육 프로그램 운영자
- 브랜드 마케팅 담당자
- 소상공인/쇼핑몰 운영자
- 인플루언서 캠페인 운영 대행사

권장 상품:

### 상품 1: 월 구독형

- 대상: 매월 챌린지를 반복 운영하는 고객
- 과금 예시: 월 49,000원, 99,000원, 199,000원
- 제공 가치: 챌린지 개설, 참가자 관리, 인증 심사, 성공자 CSV

### 상품 2: 챌린지 건당 과금

- 대상: 단발 캠페인 운영 고객
- 과금 예시: 챌린지 1건당 30,000원에서 300,000원
- 제공 가치: 챌린지 페이지, 인증 관리, 랭킹, 결과 파일

### 상품 3: 참가자 규모별 과금

- 대상: 참가자 수가 많은 캠페인 고객
- 과금 예시: 참가자 1명당 500원에서 2,000원
- 제공 가치: 참가자 수가 늘어날수록 운영 자동화 비용을 절감

### 상품 4: 운영 대행형

- 대상: 직접 운영할 시간이 없는 브랜드/강사
- 과금 예시: 캠페인 운영비 + 성과 리포트 비용
- 제공 가치: 인증 심사, 반려 처리, 성공자 정리까지 대행

1차 권장 가격 실험:

- 베타 고객 3명에게 무료 또는 저가로 제공
- 실제 챌린지 운영 후 지불 의향 확인
- 이후 `월 구독형`과 `건당 과금형` 중 반응이 좋은 모델 선택

1차 구현에 반영할 항목:

- 챌린지 생성 시 `고객명` 입력
- 챌린지 생성 시 `고객 유형` 입력
- 챌린지 생성 시 `과금 방식 메모` 입력
- 챌린지 생성 시 `예상 청구 금액` 입력
- 챌린지 목록에서 `청구 상태` 확인

청구 상태:

- `not_billable`: 과금 대상 아님
- `planned`: 청구 예정
- `invoiced`: 청구 완료
- `paid`: 수금 완료
- `waived`: 무료/면제

주의:

- 이 청구 상태는 실제 결제와 연결하지 않는다.
- 매출 증빙, 세금계산서, 입금 확인은 외부 운영 절차로 처리한다.
- MVP에서는 수익화 가능성 검증을 위한 관리 필드로만 사용한다.

## 6. 화면 요구사항

## 6.1 공통 화면

### 6.1.1 회원가입

대상:

- 참가자

필드:

- 이름
- 이메일
- 비밀번호
- 휴대폰 번호

검증:

- 이름 필수
- 이메일 형식 필수
- 이메일 중복 불가
- 비밀번호 8자 이상
- 휴대폰 번호 필수

완료 기준:

- 회원가입 성공 후 로그인 화면으로 이동

### 6.1.2 로그인

대상:

- 관리자
- 참가자

필드:

- 이메일
- 비밀번호

완료 기준:

- 관리자 로그인 시 관리자 대시보드로 이동
- 참가자 로그인 시 참가자 챌린지 목록으로 이동
- 실패 시 오류 메시지 표시

## 6.2 참가자 화면

### 6.2.1 챌린지 목록

표시 대상:

- `recruiting`
- `active`

표시 필드:

- 제목
- 진행 기간
- 모집 기간
- 참가비 표시 금액
- 성공 기준
- 현재 참가자 수
- 상태

액션:

- 상세 보기

### 6.2.2 챌린지 상세

표시 필드:

- 제목
- 설명
- 모집 기간
- 진행 기간
- 참가비 표시 금액
- 전체 미션 수
- 성공 필요 승인 수
- 인증 안내
- 환불 안내

액션:

- 참가 신청

버튼 노출:

- `recruiting` 상태에서만 참가 신청 버튼 표시
- 이미 신청한 챌린지는 참가 신청 버튼 비활성화
- 최대 참가자 수 도달 시 참가 신청 버튼 비활성화

### 6.2.3 내 챌린지

표시 필드:

- 챌린지 제목
- 참가 상태
- 결제 상태
- 승인된 회차 수
- 성공 필요 승인 수
- 현재 순위
- 성공 여부

액션:

- 인증 제출
- 인증 내역 보기

### 6.2.4 인증 제출

필드:

- 미션 회차
- 블로그 링크
- 인증 설명

검증:

- 참가 상태가 `confirmed`여야 함
- 챌린지 상태가 `active`여야 함
- 현재 날짜가 진행 기간 안이어야 함
- 미션 회차는 1 이상 전체 미션 수 이하
- 블로그 링크는 URL 형식
- 인증 설명은 10자 이상

완료 기준:

- 제출 성공 시 인증 상태는 `pending`
- 제출 후 인증 내역 화면으로 이동

### 6.2.5 인증 내역

표시 필드:

- 미션 회차
- 블로그 링크
- 인증 설명
- 제출 시각
- 상태
- 반려 사유
- 심사 시각

액션:

- 반려된 회차 재제출

## 6.3 관리자 화면

### 6.3.1 관리자 대시보드

표시 필드:

- 전체 챌린지 수
- 모집 중 챌린지 수
- 진행 중 챌린지 수
- 검토 대기 인증 수
- 결제 대기 참가자 수
- 성공자 수

### 6.3.2 챌린지 목록 관리

표시 필드:

- 제목
- 상태
- 모집 기간
- 진행 기간
- 참가비 표시 금액
- 참가자 수
- 검토 대기 인증 수
- 고객명
- 청구 상태
- 예상 청구 금액

액션:

- 챌린지 생성
- 챌린지 수정
- 상태 변경
- 참가자 관리
- 인증 심사
- 랭킹 보기
- CSV 다운로드

### 6.3.3 챌린지 생성/수정

필드:

- 제목
- 설명
- 모집 시작일
- 모집 종료일
- 진행 시작일
- 진행 종료일
- 참가비 표시 금액
- 전체 미션 수
- 성공 필요 승인 수
- 최대 참가자 수
- 인증 안내
- 환불 안내
- 상태
- 고객명
- 고객 유형
- 과금 방식 메모
- 예상 청구 금액
- 청구 상태

검증:

- 제목 2자 이상 80자 이하
- 설명 20자 이상
- 모집 시작일 < 모집 종료일 <= 진행 시작일 < 진행 종료일
- 참가비 표시 금액 0 이상
- 전체 미션 수 1 이상 100 이하
- 성공 필요 승인 수 1 이상 전체 미션 수 이하
- 최대 참가자 수 1 이상 10,000 이하
- 예상 청구 금액은 0 이상

### 6.3.4 참가자 관리

표시 필드:

- 이름
- 이메일
- 휴대폰 번호
- 신청 시각
- 결제 상태
- 참가 상태
- 승인된 회차 수
- 성공 여부
- 순위

액션:

- 결제 완료 처리
- 환불 완료 처리
- 참가 취소 처리

### 6.3.5 인증 심사

필터:

- 챌린지
- 인증 상태
- 미션 회차
- 참가자 이름

표시 필드:

- 챌린지 제목
- 참가자 이름
- 미션 회차
- 블로그 링크
- 인증 설명
- 제출 시각
- 상태

액션:

- 링크 열기
- 승인
- 반려

반려 모달 필드:

- 반려 사유 선택
- 상세 사유 입력

### 6.3.6 랭킹/성공자

표시 필드:

- 순위
- 참가자 이름
- 이메일
- 승인된 회차 수
- 성공 필요 승인 수
- 마지막 승인 시각
- 성공 여부

액션:

- 성공 여부 재계산
- CSV 다운로드

### 6.3.7 감사 로그

표시 필드:

- 수행자
- 행위 유형
- 대상 유형
- 대상 ID
- 변경 전 값
- 변경 후 값
- IP 주소
- 수행 시각

필터:

- 수행자
- 행위 유형
- 기간

## 7. 데이터 모델

## 7.1 users

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| id | uuid | Y | 사용자 ID |
| name | string | Y | 이름 |
| email | string | Y | 이메일, unique |
| password_hash | string | Y | 해시된 비밀번호 |
| phone | string | Y | 휴대폰 번호 |
| role | enum | Y | admin, participant |
| status | enum | Y | active, blocked |
| created_at | datetime | Y | 생성 시각 |
| updated_at | datetime | Y | 수정 시각 |

## 7.2 challenges

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| id | uuid | Y | 챌린지 ID |
| title | string | Y | 제목 |
| description | text | Y | 설명 |
| recruitment_start_at | datetime | Y | 모집 시작 |
| recruitment_end_at | datetime | Y | 모집 종료 |
| challenge_start_at | datetime | Y | 진행 시작 |
| challenge_end_at | datetime | Y | 진행 종료 |
| entry_fee_display | integer | Y | 참가비 표시 금액 |
| total_mission_count | integer | Y | 전체 미션 수 |
| required_approval_count | integer | Y | 성공 필요 승인 수 |
| max_participants | integer | Y | 최대 참가자 수 |
| verification_guide | text | Y | 인증 안내 |
| refund_guide | text | Y | 환불 안내 |
| status | enum | Y | draft, recruiting, active, closed, settled |
| client_name | string | N | 고객명 |
| client_type | enum | N | instructor, brand, agency, internal, other |
| billing_memo | text | N | 과금 방식 메모 |
| expected_billing_amount | integer | N | 예상 청구 금액 |
| billing_status | enum | Y | not_billable, planned, invoiced, paid, waived |
| created_by | uuid | Y | 생성 관리자 |
| created_at | datetime | Y | 생성 시각 |
| updated_at | datetime | Y | 수정 시각 |

## 7.3 challenge_participants

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| id | uuid | Y | 참가 ID |
| challenge_id | uuid | Y | 챌린지 ID |
| user_id | uuid | Y | 사용자 ID |
| payment_status | enum | Y | pending, paid, refunded, canceled |
| participation_status | enum | Y | applied, confirmed, canceled |
| joined_at | datetime | Y | 신청 시각 |
| confirmed_at | datetime | N | 참가 확정 시각 |
| approved_round_count | integer | Y | 승인된 고유 회차 수 |
| final_rank | integer | N | 최종 순위 |
| success_status | enum | Y | in_progress, success, failed |
| created_at | datetime | Y | 생성 시각 |
| updated_at | datetime | Y | 수정 시각 |

제약:

- `challenge_id + user_id` unique

## 7.4 submissions

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| id | uuid | Y | 인증 ID |
| challenge_id | uuid | Y | 챌린지 ID |
| participant_id | uuid | Y | 참가 ID |
| mission_round | integer | Y | 미션 회차 |
| link_url | string | Y | 블로그 링크 |
| description | text | Y | 인증 설명 |
| status | enum | Y | pending, approved, rejected |
| submitted_at | datetime | Y | 제출 시각 |
| reviewed_by | uuid | N | 심사 관리자 |
| reviewed_at | datetime | N | 심사 시각 |
| reject_reason | string | N | 반려 사유 |
| reject_detail | text | N | 반려 상세 |
| created_at | datetime | Y | 생성 시각 |
| updated_at | datetime | Y | 수정 시각 |

## 7.5 audit_logs

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| id | uuid | Y | 로그 ID |
| actor_id | uuid | Y | 수행자 ID |
| action_type | string | Y | 행위 유형 |
| target_type | string | Y | 대상 유형 |
| target_id | uuid | Y | 대상 ID |
| before_value | json | N | 변경 전 값 |
| after_value | json | N | 변경 후 값 |
| ip_address | string | N | IP 주소 |
| created_at | datetime | Y | 수행 시각 |

## 8. API 명세 초안

## 8.1 인증

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| POST | /api/auth/register | public | 참가자 회원가입 |
| POST | /api/auth/login | public | 로그인 |
| POST | /api/auth/logout | user | 로그아웃 |
| GET | /api/me | user | 내 정보 |

## 8.2 참가자 챌린지

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | /api/challenges | public | 챌린지 목록 |
| GET | /api/challenges/:id | public | 챌린지 상세 |
| POST | /api/challenges/:id/join | participant | 참가 신청 |
| GET | /api/me/challenges | participant | 내 챌린지 |

## 8.3 참가자 인증

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| POST | /api/challenges/:id/submissions | participant | 인증 제출 |
| GET | /api/me/submissions | participant | 내 인증 목록 |

## 8.4 관리자 챌린지

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | /api/admin/dashboard | admin | 대시보드 |
| GET | /api/admin/challenges | admin | 챌린지 관리 목록 |
| POST | /api/admin/challenges | admin | 챌린지 생성 |
| PATCH | /api/admin/challenges/:id | admin | 챌린지 수정 |
| PATCH | /api/admin/challenges/:id/status | admin | 챌린지 상태 변경 |
| PATCH | /api/admin/challenges/:id/billing | admin | 청구 상태/과금 메모 변경 |

## 8.5 관리자 참가자

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | /api/admin/challenges/:id/participants | admin | 참가자 목록 |
| PATCH | /api/admin/participants/:id/payment-status | admin | 결제 상태 변경 |
| PATCH | /api/admin/participants/:id/participation-status | admin | 참가 상태 변경 |

## 8.6 관리자 인증 심사

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | /api/admin/submissions | admin | 인증 목록 |
| PATCH | /api/admin/submissions/:id/approve | admin | 인증 승인 |
| PATCH | /api/admin/submissions/:id/reject | admin | 인증 반려 |

## 8.7 관리자 랭킹/CSV/로그

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| POST | /api/admin/challenges/:id/recalculate-results | admin | 성공/랭킹 재계산 |
| GET | /api/admin/challenges/:id/ranking | admin | 랭킹 조회 |
| GET | /api/admin/challenges/:id/winners.csv | admin | 성공자 CSV |
| GET | /api/admin/audit-logs | admin | 감사 로그 |

## 9. 주요 로직

## 9.1 참가 신청

```text
if challenge.status != recruiting:
    reject
if user already joined challenge:
    reject
if confirmed_or_applied_count >= max_participants:
    reject
create participant with payment_status=pending, participation_status=applied
```

## 9.2 결제 완료 처리

```text
if actor.role != admin:
    reject
participant.payment_status = paid
participant.participation_status = confirmed
participant.confirmed_at = now
write audit log
```

## 9.3 인증 제출

```text
if participant.participation_status != confirmed:
    reject
if participant.payment_status != paid:
    reject
if challenge.status != active:
    reject
if now not between challenge_start_at and challenge_end_at:
    reject
if mission_round < 1 or mission_round > total_mission_count:
    reject
create submission with status=pending
```

## 9.4 인증 승인

```text
if submission.status != pending:
    reject
submission.status = approved
submission.reviewed_by = admin.id
submission.reviewed_at = now
write audit log
```

## 9.5 인증 반려

```text
if submission.status != pending:
    reject
if reject_reason is empty:
    reject
submission.status = rejected
submission.reject_reason = reject_reason
submission.reject_detail = reject_detail
submission.reviewed_by = admin.id
submission.reviewed_at = now
write audit log
```

## 9.6 성공/랭킹 재계산

```text
for each confirmed participant with payment_status=paid:
    approved_rounds = unique mission_round from approved submissions
    approved_round_count = count(approved_rounds)
    if challenge.status in [draft, recruiting, active]:
        success_status = in_progress
    else if approved_round_count >= required_approval_count:
        success_status = success
    else:
        success_status = failed

sort participants by:
    approved_round_count desc
    last_approved_at asc
    joined_at asc

assign final_rank
write audit log
```

## 10. 수용 기준

## 10.1 필수 완료 기준

- 참가자는 회원가입할 수 있다.
- 참가자는 로그인할 수 있다.
- 관리자는 로그인할 수 있다.
- 관리자는 챌린지를 생성할 수 있다.
- 참가자는 모집 중 챌린지에 신청할 수 있다.
- 관리자는 참가자의 결제 상태를 결제 완료로 바꿀 수 있다.
- 결제 완료된 참가자는 진행 중 챌린지에 인증을 제출할 수 있다.
- 관리자는 인증을 승인할 수 있다.
- 관리자는 인증을 반려하고 사유를 남길 수 있다.
- 시스템은 승인된 고유 회차 수를 계산할 수 있다.
- 시스템은 성공 여부를 계산할 수 있다.
- 시스템은 랭킹을 계산할 수 있다.
- 관리자는 성공자 CSV를 다운로드할 수 있다.
- 관리자 주요 작업은 감사 로그에 남는다.

## 10.2 예외 완료 기준

- 모집 중이 아닌 챌린지는 참가 신청할 수 없다.
- 같은 챌린지에 중복 참가 신청할 수 없다.
- 최대 참가자 수를 넘겨 신청할 수 없다.
- 결제 완료가 아닌 참가자는 인증 제출할 수 없다.
- 진행 중이 아닌 챌린지는 인증 제출할 수 없다.
- 범위를 벗어난 미션 회차는 제출할 수 없다.
- 반려 사유 없이 반려할 수 없다.
- 참가자는 관리자 API에 접근할 수 없다.
- 참가자는 고객명, 예상 청구 금액, 청구 상태를 볼 수 없다.
- 청구 상태 변경은 관리자만 할 수 있다.

## 11. 테스트 시나리오

## 11.1 기본 성공 시나리오

1. 관리자 계정으로 로그인한다.
2. 챌린지를 생성하고 `recruiting` 상태로 설정한다.
3. 참가자 계정으로 회원가입한다.
4. 참가자가 챌린지에 참가 신청한다.
5. 관리자가 결제 상태를 `paid`로 변경한다.
6. 관리자가 챌린지를 `active` 상태로 변경한다.
7. 참가자가 5개 회차에 링크 인증을 제출한다.
8. 관리자가 5개 인증을 승인한다.
9. 관리자가 챌린지를 `closed` 상태로 변경한다.
10. 관리자가 성공/랭킹 재계산을 실행한다.
11. 참가자의 성공 상태가 `success`로 표시된다.
12. 관리자가 성공자 CSV를 다운로드한다.

## 11.2 실패 시나리오

1. 참가자가 3개 회차만 승인받는다.
2. 챌린지의 성공 필요 승인 수는 5개다.
3. 관리자가 챌린지를 종료하고 재계산한다.
4. 참가자의 성공 상태가 `failed`로 표시된다.

## 11.3 반려/재제출 시나리오

1. 참가자가 1회차 인증을 제출한다.
2. 관리자가 반려 사유를 입력하고 반려한다.
3. 참가자는 반려 사유를 확인한다.
4. 참가자가 같은 1회차에 다시 인증을 제출한다.
5. 관리자가 새 인증을 승인한다.
6. 성공 계산에는 1회차 승인 1개만 반영된다.

## 11.4 수익화 검증 시나리오

1. 관리자가 챌린지를 생성한다.
2. 고객명에 `A교육원`을 입력한다.
3. 고객 유형을 `instructor`로 선택한다.
4. 예상 청구 금액을 `99000`으로 입력한다.
5. 청구 상태를 `planned`로 저장한다.
6. 챌린지 운영 후 청구 상태를 `invoiced`로 변경한다.
7. 입금 확인 후 청구 상태를 `paid`로 변경한다.
8. 모든 청구 상태 변경은 감사 로그에 남는다.

## 12. 개발 순서

## 12.1 1단계

- 프로젝트 생성
- DB 스키마 작성
- 관리자 seed 계정 생성
- 회원가입/로그인
- 권한 분기

## 12.2 2단계

- 챌린지 생성
- 챌린지 목록
- 챌린지 상세
- 챌린지 상태 변경
- 고객명/청구 상태 관리

## 12.3 3단계

- 참가 신청
- 관리자 참가자 목록
- 결제 상태 수동 변경
- 내 챌린지 화면

## 12.4 4단계

- 인증 제출
- 내 인증 내역
- 관리자 인증 심사
- 승인/반려

## 12.5 5단계

- 성공 계산
- 랭킹
- 성공자 CSV
- 감사 로그
- 테스트 시나리오 검증

## 13. 개발 시작 전 기본 결정

아래 결정은 별도 변경 요청이 없으면 기본값으로 사용한다.

- 웹앱 형태로 구현
- 관리자와 참가자는 같은 서비스에서 권한으로 분기
- 이메일/비밀번호 로그인 사용
- 첫 구현은 블로그 챌린지만 지원
- 사진 업로드는 2차 기능으로 제외
- 결제는 수동 상태 관리
- 계좌정보 저장 안 함
- 상금 자동 계산 안 함
- 성공 기준은 승인된 고유 회차 수
- CSV는 성공자 목록과 운영 참고용
- 외부 API 연동 없음
- 수익화는 외부 수동 청구로 검증
- 챌린지별 고객명, 예상 청구 금액, 청구 상태는 관리자만 관리

## 14. 최종 판단

기존 MVP 문서도 구현 가능하지만, 첫 개발로는 아직 범위가 넓다. 특히 사진 업로드, 지급 예정 금액, 더 넓은 정산 개념은 저장소, 보안, 운영 정책을 추가로 요구한다.

따라서 1차 구현은 링크 인증 중심으로 제한한다. 이 범위만으로도 챌린지 생성, 참가 신청, 인증 제출, 심사, 성공자 산출이라는 핵심 가치를 검증할 수 있다.

수익화 관점에서는 참가자 결제나 상금 수수료보다 B2B 운영툴 과금이 우선이다. 초기 고객에게는 플랫폼 내부 결제를 붙이지 않고 수동 청구로 판매 가능성을 확인한다. 실제 고객이 반복적으로 챌린지를 운영하고 비용을 지불한다는 증거가 생기면, 그 다음 단계에서 구독 결제, 세금계산서, 브랜드 캠페인 리포트, 외부 플랫폼 자동 검증을 확장한다.

## 15. 수익화 참고 자료

수익화 방향을 정할 때 참고한 시장 자료:

- Grand View Research, Creator Economy Market Size & Trends: https://www.grandviewresearch.com/industry-analysis/creator-economy-market-report
- Influencer Marketing Hub, Influencer Marketing Benchmark Report: https://influencermarketinghub.com/influencer-marketing-benchmark-report/
- Statista, Influencer advertising market: https://www.statista.com/outlook/amo/advertising/influencer-advertising/worldwide
- Shopify, Creator economy guide: https://www.shopify.com/blog/creator-economy

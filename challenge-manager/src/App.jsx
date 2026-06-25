import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Eye,
  FileDown,
  FileText,
  LayoutDashboard,
  Link as LinkIcon,
  ListChecks,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import './App.css'

const SESSION_KEY = 'challenge-manager-session-v1'
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
const DEMO_STORE_KEY = 'challenge-manager-demo-store-v1'

const today = new Date()
const addDays = (days) => {
  const date = new Date(today)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

const formatDateTime = (value) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const currency = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`

function readStoredSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    return parsed?.token ? parsed : null
  } catch {
    return null
  }
}

const statusLabels = {
  draft: '임시 저장',
  recruiting: '모집 중',
  active: '진행 중',
  closed: '종료',
  settled: '정산 완료',
  pending: '대기',
  paid: '결제 완료',
  refunded: '환불 완료',
  canceled: '취소',
  applied: '신청',
  confirmed: '참가 확정',
  approved: '승인',
  rejected: '반려',
  in_progress: '진행 중',
  success: '성공',
  failed: '실패',
  not_billable: '과금 대상 아님',
  planned: '청구 예정',
  invoiced: '청구 완료',
  paidBilling: '수금 완료',
  waived: '무료/면제',
  payoutPending: '지급 대기',
  paidPayout: '지급 완료',
  not_eligible: '지급 대상 아님',
  hold: '지급 보류',
}

const clientTypes = {
  instructor: '강사/교육기관',
  brand: '브랜드',
  agency: '대행사',
  internal: '내부 운영',
  other: '기타',
}

const platformTypes = {
  blog: '블로그',
  youtube: '유튜브',
  tiktok: '틱톡',
}

const platformProofLabels = {
  blog: '블로그 링크',
  youtube: '유튜브 영상 링크',
  tiktok: '틱톡 영상 링크',
}

const platformHostHints = {
  blog: '허용 예: 네이버 블로그, 티스토리, 브런치, Medium, Velog, WordPress, Blogspot',
  youtube: '허용 예: youtube.com, youtu.be',
  tiktok: '허용 예: tiktok.com, vt.tiktok.com',
}

const challengeTemplates = {
  blog: {
    title: '7일 블로그 글쓰기 챌린지',
    description: '7일 동안 매일 1개의 블로그 콘텐츠를 발행하는 챌린지입니다. 참가자는 정해진 기간 안에 주제에 맞는 글을 작성하고 발행 링크를 회차별로 제출해야 합니다. 성실하게 미션을 완료한 참가자는 운영 기준에 따라 성공 처리되며, 성공 시 참가비 환급 또는 상금 지급 대상이 됩니다.',
    verificationGuide: '회차별로 발행한 블로그 글 링크와 작성 내용을 짧게 정리해 제출해 주세요. 비공개 글, 임시저장 글, 동일 링크 재제출은 인정되지 않습니다.',
  },
  youtube: {
    title: '유튜브 숏폼 챌린지 30일 도전',
    description: '30일 동안 유튜브 숏폼 영상을 꾸준히 업로드하는 챌린지입니다. 참가자는 챌린지 기간 중 주어진 업로드 규칙에 맞는 Shorts 영상을 게시하고, 각 회차별 영상 링크와 수행 내용을 제출해야 합니다. 운영팀은 업로드 여부와 기준 충족 여부를 심사해 성공 여부를 확정합니다.',
    verificationGuide: '유튜브 Shorts 영상 링크를 회차별로 제출해 주세요. 삭제된 영상, 비공개 영상, Shorts 형식이 아닌 일반 영상 링크는 인정되지 않습니다.',
  },
  tiktok: {
    title: '틱톡 숏폼 챌린지 21일 루틴',
    description: '21일 동안 틱톡 숏폼 콘텐츠를 꾸준히 발행하는 챌린지입니다. 참가자는 매일 또는 지정된 회차에 맞춰 영상을 업로드하고, 업로드한 틱톡 링크와 간단한 수행 설명을 제출해야 합니다. 운영 기준을 충족한 참가자는 최종 성공자로 집계됩니다.',
    verificationGuide: '틱톡 게시물 링크를 회차별로 제출해 주세요. 삭제된 링크, 비공개 게시물, 동일 영상의 반복 제출은 인정되지 않습니다.',
  },
}

const rejectReasons = ['링크 접속 불가', '기간 외 콘텐츠', '필수 조건 미충족', '중복 제출', '부적절한 콘텐츠', '기타']

const clone = (value) => JSON.parse(JSON.stringify(value))
const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

const seedData = () => ({
  version: 3,
  users: [
    {
      id: 'u_admin',
      name: '운영 관리자',
      email: 'admin@challenge.local',
      password: 'admin1234',
      phone: '010-0000-0000',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u_participant',
      name: '김참가',
      email: 'user@challenge.local',
      password: 'user1234',
      phone: '010-1111-2222',
      role: 'participant',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ],
  challenges: [
    {
      id: 'c_blog_7',
      platformType: 'blog',
      title: '7일 블로그 글쓰기 챌린지',
      description: '매일 하나의 블로그 글을 작성하고 링크로 인증하는 기본 챌린지입니다.',
      recruitmentStartAt: addDays(-3),
      recruitmentEndAt: addDays(4),
      challengeStartAt: addDays(-1),
      challengeEndAt: addDays(8),
      entryFeeDisplay: 30000,
      totalMissionCount: 7,
      requiredApprovalCount: 5,
      maxParticipants: 100,
      verificationGuide: '회차별로 발행한 블로그 글 링크와 간단한 인증 설명을 제출해주세요.',
      refundGuide: 'MVP에서는 실제 환불을 처리하지 않으며 운영자가 별도 안내합니다.',
      status: 'active',
      clientName: 'A교육원',
      clientType: 'instructor',
      billingMemo: '베타 운영 고객. 첫 회차 할인 적용.',
      expectedBillingAmount: 99000,
      billingStatus: 'planned',
      createdBy: 'u_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  participants: [
    {
      id: 'p_seed_user',
      challengeId: 'c_blog_7',
      userId: 'u_participant',
      paymentStatus: 'paid',
      participationStatus: 'confirmed',
      joinedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      approvedRoundCount: 1,
      finalRank: 1,
      successStatus: 'in_progress',
      payoutAmount: 0,
      payoutStatus: 'not_eligible',
      payoutMemo: '',
      paidOutAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  submissions: [
    {
      id: 's_seed_1',
      challengeId: 'c_blog_7',
      participantId: 'p_seed_user',
      userId: 'u_participant',
      missionRound: 1,
      linkUrl: 'https://example.com/blog/challenge-day-1',
      description: '1회차 블로그 글 작성 인증입니다.',
      status: 'approved',
      submittedAt: new Date().toISOString(),
      reviewedBy: 'u_admin',
      reviewedAt: new Date().toISOString(),
      rejectReason: '',
      rejectDetail: '',
      imageData: '',
      imageName: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 's_seed_2',
      challengeId: 'c_blog_7',
      participantId: 'p_seed_user',
      userId: 'u_participant',
      missionRound: 2,
      linkUrl: 'https://example.com/blog/challenge-day-2',
      description: '2회차 블로그 글 작성 인증입니다. 관리자 검토 대기 상태입니다.',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      rejectReason: '',
      rejectDetail: '',
      imageData: '',
      imageName: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  auditLogs: [],
  notificationLogs: [],
  notificationConfig: {
    enabled: DEMO_MODE,
    serviceCode: 'mintorain',
    baseUrl: DEMO_MODE ? 'github-pages-demo' : 'http://127.0.0.1:4174',
    channels: { sms: true, email: true },
    defaultFromEmail: 'no-reply@mintorain.local',
  },
})

function sanitizeStore(store) {
  return {
    ...clone(store),
    users: store.users.map((user) => {
      const nextUser = { ...user }
      delete nextUser.password
      return nextUser
    }),
  }
}

function readDemoStore() {
  try {
    const stored = JSON.parse(localStorage.getItem(DEMO_STORE_KEY) || 'null')
    if (stored?.users && stored?.challenges) return stored
  } catch {
    // Ignore malformed local state and reseed below.
  }
  const seeded = seedData()
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(seeded))
  return seeded
}

function writeDemoStore(store) {
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store))
}

function demoActor(store, token) {
  if (!token) return null
  const [, userId] = String(token).split(':')
  return store.users.find((user) => user.id === userId) || null
}

function demoToken(userId) {
  return `demo:${userId}:${Date.now()}`
}

function addDemoAuditLog(store, actor, actionType, targetType, targetId, beforeValue, afterValue) {
  store.auditLogs.unshift({
    id: uid('log'),
    actorId: actor?.id || 'system',
    actorName: actor?.name || 'system',
    actionType,
    targetType,
    targetId,
    beforeValue: beforeValue ?? null,
    afterValue: afterValue ?? null,
    ipAddress: 'github-pages-demo',
    createdAt: new Date().toISOString(),
  })
}

function recalculateChallengeInStore(store, challengeId) {
  const challenge = store.challenges.find((item) => item.id === challengeId)
  if (!challenge) return
  const baseSuccessStatus = ['draft', 'recruiting', 'active'].includes(challenge.status) ? 'in_progress' : 'failed'
  store.participants = store.participants.map((participant) => {
    if (participant.challengeId !== challengeId) return participant
    return {
      ...participant,
      approvedRoundCount: 0,
      finalRank: null,
      successStatus: baseSuccessStatus,
      payoutAmount: 0,
      payoutStatus: 'not_eligible',
      paidOutAt: null,
      updatedAt: new Date().toISOString(),
    }
  })

  const resultMap = calculateResults(store)
  store.participants = store.participants.map((participant) => {
    if (participant.challengeId !== challengeId) return participant
    const result = resultMap[participant.id]
    if (!result) return participant
    const payoutAmount = result.successStatus === 'success' ? Number(challenge.entryFeeDisplay || 0) : 0
    const payoutStatus = result.successStatus === 'success'
      ? (['paid', 'hold'].includes(participant.payoutStatus) ? participant.payoutStatus : 'pending')
      : 'not_eligible'
    return {
      ...participant,
      approvedRoundCount: result.approvedRoundCount,
      finalRank: result.finalRank,
      successStatus: result.successStatus,
      payoutAmount,
      payoutStatus,
      paidOutAt: payoutStatus === 'paid' ? (participant.paidOutAt || new Date().toISOString()) : null,
      updatedAt: new Date().toISOString(),
    }
  })
}

function buildWinnersCsv(store, challengeId) {
  const challenge = store.challenges.find((item) => item.id === challengeId)
  const rows = store.participants
    .filter((item) => item.challengeId === challengeId)
    .map((participant) => {
      const user = store.users.find((item) => item.id === participant.userId)
      return {
        challenge_id: challenge.id,
        platform_type: challenge.platformType,
        challenge_title: challenge.title,
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        user_phone: user.phone,
        approved_round_count: participant.approvedRoundCount || 0,
        required_approval_count: challenge.requiredApprovalCount,
        final_rank: participant.finalRank || '',
        success_status: participant.successStatus,
        payout_amount: participant.payoutAmount || 0,
        payout_status: participant.payoutStatus,
        paid_out_at: participant.paidOutAt || '',
        payment_status: participant.paymentStatus,
        participation_status: participant.participationStatus,
      }
    })
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  return [headers.join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n')
}

async function demoApiRequest(path, { method = 'GET', body, token } = {}) {
  const store = readDemoStore()
  const actor = demoActor(store, token)
  const nowIso = new Date().toISOString()

  if (path === '/api/bootstrap' && method === 'GET') {
    return { store: sanitizeStore(store) }
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const user = store.users.find((item) => item.email === String(body.email || '').trim())
    if (!user || user.password !== body.password) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
    return { user: sanitizeStore({ ...store, users: [user] }).users[0], token: demoToken(user.id), store: sanitizeStore(store) }
  }

  if (path === '/api/auth/register' && method === 'POST') {
    if (store.users.some((item) => item.email === String(body.email || '').trim())) throw new Error('이미 가입된 이메일입니다.')
    store.users.push({
      id: uid('u'),
      name: String(body.name || '').trim(),
      email: String(body.email || '').trim(),
      password: String(body.password || ''),
      phone: String(body.phone || '').trim(),
      role: 'participant',
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    writeDemoStore(store)
    return { ok: true, store: sanitizeStore(store) }
  }

  if (path === '/api/auth/logout' && method === 'POST') return { ok: true }

  if (!actor && path !== '/api/bootstrap') throw new Error('로그인이 필요합니다.')

  if (path === '/api/admin/challenges' && method === 'POST') {
    const challenge = {
      id: uid('c'),
      ...body,
      createdBy: actor.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    }
    store.challenges.unshift(challenge)
    addDemoAuditLog(store, actor, 'challenge.create', 'challenge', challenge.id, null, challenge)
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  const challengeUpdateMatch = path.match(/^\/api\/admin\/challenges\/([^/]+)$/)
  if (challengeUpdateMatch && method === 'PATCH') {
    const challengeId = challengeUpdateMatch[1]
    const index = store.challenges.findIndex((item) => item.id === challengeId)
    const before = clone(store.challenges[index])
    store.challenges[index] = { ...store.challenges[index], ...body, updatedAt: nowIso }
    addDemoAuditLog(store, actor, 'challenge.update', 'challenge', challengeId, before, store.challenges[index])
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  const challengeStatusMatch = path.match(/^\/api\/admin\/challenges\/([^/]+)\/status$/)
  if (challengeStatusMatch && method === 'PATCH') {
    const challengeId = challengeStatusMatch[1]
    const challenge = store.challenges.find((item) => item.id === challengeId)
    const before = clone(challenge)
    challenge.status = body.status
    challenge.updatedAt = nowIso
    recalculateChallengeInStore(store, challengeId)
    addDemoAuditLog(store, actor, 'challenge.status', 'challenge', challengeId, before, challenge)
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  const challengeBillingMatch = path.match(/^\/api\/admin\/challenges\/([^/]+)\/billing$/)
  if (challengeBillingMatch && method === 'PATCH') {
    const challengeId = challengeBillingMatch[1]
    const challenge = store.challenges.find((item) => item.id === challengeId)
    const before = clone(challenge)
    Object.assign(challenge, body, { updatedAt: nowIso })
    addDemoAuditLog(store, actor, 'challenge.billing', 'challenge', challengeId, before, challenge)
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  const joinMatch = path.match(/^\/api\/challenges\/([^/]+)\/join$/)
  if (joinMatch && method === 'POST') {
    const challengeId = joinMatch[1]
    const challenge = store.challenges.find((item) => item.id === challengeId)
    if (challenge.status !== 'recruiting') throw new Error('모집 중인 챌린지만 신청할 수 있습니다.')
    if (store.participants.some((item) => item.challengeId === challengeId && item.userId === actor.id)) throw new Error('이미 신청한 챌린지입니다.')
    const currentCount = store.participants.filter((item) => item.challengeId === challengeId && item.participationStatus !== 'canceled').length
    if (currentCount >= challenge.maxParticipants) throw new Error('최대 참가자 수에 도달했습니다.')
    store.participants.push({
      id: uid('p'),
      challengeId,
      userId: actor.id,
      paymentStatus: 'pending',
      participationStatus: 'applied',
      joinedAt: nowIso,
      confirmedAt: null,
      approvedRoundCount: 0,
      finalRank: null,
      successStatus: 'in_progress',
      payoutAmount: 0,
      payoutStatus: 'not_eligible',
      payoutMemo: '',
      paidOutAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  const participantMatch = path.match(/^\/api\/admin\/participants\/([^/]+)$/)
  if (participantMatch && method === 'PATCH') {
    const participant = store.participants.find((item) => item.id === participantMatch[1])
    const before = clone(participant)
    let participationStatus = body.participationStatus ?? participant.participationStatus
    let confirmedAt = participant.confirmedAt
    if (body.paymentStatus === 'paid') {
      participationStatus = 'confirmed'
      confirmedAt = nowIso
    }
    if (body.paymentStatus === 'refunded' || body.paymentStatus === 'canceled') {
      participationStatus = 'canceled'
      confirmedAt = null
    }
    Object.assign(participant, body, { participationStatus, confirmedAt, updatedAt: nowIso })
    recalculateChallengeInStore(store, participant.challengeId)
    addDemoAuditLog(store, actor, 'participant.update', 'participant', participant.id, before, participant)
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  const payoutMatch = path.match(/^\/api\/admin\/participants\/([^/]+)\/payout$/)
  if (payoutMatch && method === 'PATCH') {
    const participant = store.participants.find((item) => item.id === payoutMatch[1])
    const before = clone(participant)
    Object.assign(participant, body, {
      paidOutAt: body.payoutStatus === 'paid' ? (participant.paidOutAt || nowIso) : null,
      updatedAt: nowIso,
    })
    addDemoAuditLog(store, actor, 'participant.payout', 'participant', participant.id, before, participant)
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  const submissionMatch = path.match(/^\/api\/challenges\/([^/]+)\/submissions$/)
  if (submissionMatch && method === 'POST') {
    const challengeId = submissionMatch[1]
    const challenge = store.challenges.find((item) => item.id === challengeId)
    const participant = store.participants.find((item) => item.challengeId === challengeId && item.userId === actor.id)
    if (!participant) throw new Error('참가 신청 내역이 없습니다.')
    if (participant.paymentStatus !== 'paid' || participant.participationStatus !== 'confirmed') throw new Error('참가 확정 후 인증을 제출할 수 있습니다.')
    if (challenge.status !== 'active') throw new Error('진행 중인 챌린지만 인증을 제출할 수 있습니다.')
    const currentDate = new Date()
    if (currentDate < new Date(challenge.challengeStartAt) || currentDate > new Date(`${challenge.challengeEndAt}T23:59:59`)) throw new Error('챌린지 진행 기간에만 제출할 수 있습니다.')
    const missionRound = Number(body.missionRound)
    if (!Number.isInteger(missionRound) || missionRound < 1 || missionRound > challenge.totalMissionCount) throw new Error('미션 회차를 확인해 주세요.')
    const linkError = validateProofLink(challenge.platformType, body.linkUrl)
    if (linkError) throw new Error(linkError)
    const hasDuplicate = store.submissions.some((item) => item.participantId === participant.id && item.missionRound === missionRound && ['pending', 'approved'].includes(item.status))
    if (hasDuplicate) {
      const error = new Error('이미 제출했거나 승인된 회차입니다. 반려된 경우에만 다시 제출할 수 있습니다.')
      error.status = 409
      throw error
    }
    store.submissions.unshift({
      id: uid('s'),
      challengeId,
      participantId: participant.id,
      userId: actor.id,
      missionRound,
      linkUrl: String(body.linkUrl || '').trim(),
      description: String(body.description || '').trim(),
      status: 'pending',
      submittedAt: nowIso,
      reviewedBy: null,
      reviewedAt: null,
      rejectReason: '',
      rejectDetail: '',
      imageData: body.imageData || '',
      imageName: body.imageName || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  const reviewMatch = path.match(/^\/api\/admin\/submissions\/([^/]+)\/review$/)
  if (reviewMatch && method === 'PATCH') {
    const submission = store.submissions.find((item) => item.id === reviewMatch[1])
    const before = clone(submission)
    Object.assign(submission, {
      status: body.status,
      reviewedBy: actor.id,
      reviewedAt: nowIso,
      rejectReason: body.status === 'rejected' ? body.rejectReason || '' : '',
      rejectDetail: body.status === 'rejected' ? body.rejectDetail || '' : '',
      updatedAt: nowIso,
    })
    recalculateChallengeInStore(store, submission.challengeId)
    addDemoAuditLog(store, actor, body.status === 'approved' ? 'submission.approve' : 'submission.reject', 'submission', submission.id, before, submission)
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  const recalcMatch = path.match(/^\/api\/admin\/challenges\/([^/]+)\/recalculate-results$/)
  if (recalcMatch && method === 'POST') {
    const challengeId = recalcMatch[1]
    const before = clone(store.participants.filter((item) => item.challengeId === challengeId))
    recalculateChallengeInStore(store, challengeId)
    const after = clone(store.participants.filter((item) => item.challengeId === challengeId))
    addDemoAuditLog(store, actor, 'challenge.recalculate', 'challenge', challengeId, before, after)
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  if (path === '/api/admin/notifications/test' && method === 'POST') {
    store.notificationLogs.unshift({
      id: uid('ntf'),
      challengeId: null,
      participantId: null,
      userId: actor.id,
      channel: body.channel,
      templateCode: body.channel === 'sms' ? 'manual_test_sms' : 'manual_test_email',
      recipient: body.to,
      subject: body.subject || '',
      messageText: body.text || '',
      status: 'sent',
      responsePayload: { demo: true },
      errorMessage: '',
      createdAt: nowIso,
    })
    writeDemoStore(store)
    return { store: sanitizeStore(store) }
  }

  throw new Error(`지원하지 않는 데모 요청입니다: ${method} ${path}`)
}

async function apiRequest(path, { method = 'GET', body, token } = {}) {
  if (DEMO_MODE) return demoApiRequest(path, { method, body, token })
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || '요청을 처리하지 못했습니다.')
  }
  return response.json()
}

function App() {
  const [store, setStore] = useState(seedData)
  const [session, setSession] = useState(readStoredSession)
  const [page, setPage] = useState(() => (session?.role === 'admin' ? 'admin-dashboard' : 'challenges'))
  const [selectedChallengeId, setSelectedChallengeId] = useState('c_blog_7')
  const [toast, setToast] = useState('')
  const [filters, setFilters] = useState({ status: 'all', query: '', billing: 'all', platform: 'all' })
  const [isBooting, setIsBooting] = useState(true)

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  }, [session])

  const currentUser = store.users.find((user) => user.id === session?.id)
  const isAdmin = currentUser?.role === 'admin'

  const applyRemoteStore = (payload) => {
    if (payload?.store) setStore(payload.store)
  }
  const showToast = (message) => {
    setToast(message)
    window.clearTimeout(window.__challengeToast)
    window.__challengeToast = window.setTimeout(() => setToast(''), 2800)
  }
  const withRemote = async (task) => {
    try {
      await task()
    } catch (error) {
      showToast(error.message)
    }
  }

  useEffect(() => {
    apiRequest('/api/bootstrap')
      .then((payload) => setStore(payload.store))
      .catch((error) => showToast(error.message))
      .finally(() => setIsBooting(false))
  }, [])

  const resultMap = useMemo(() => calculateResults(store), [store])

  const login = async (email, password) => {
    const payload = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } })
    setSession({ id: payload.user.id, role: payload.user.role, token: payload.token })
    setStore(payload.store)
    setPage(payload.user.role === 'admin' ? 'admin-dashboard' : 'challenges')
    return true
  }

  const register = async (form) => {
    await apiRequest('/api/auth/register', { method: 'POST', body: form })
    return { ok: true }
  }

  const logout = () => {
    const sessionToken = session?.token
    setSession(null)
    setPage('login')
    if (sessionToken) {
      apiRequest('/api/auth/logout', { method: 'POST', token: sessionToken }).catch(() => {})
    }
  }

  const createChallenge = (form) => withRemote(async () => {
    const payload = await apiRequest('/api/admin/challenges', {
      method: 'POST',
      body: normalizeChallengeForm(form),
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast('챌린지를 생성했습니다.')
    setPage('admin-challenges')
  })

  const updateChallenge = (id, form) => withRemote(async () => {
    const payload = await apiRequest(`/api/admin/challenges/${id}`, {
      method: 'PATCH',
      body: normalizeChallengeForm(form),
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast('챌린지를 저장했습니다.')
    setPage('admin-challenges')
  })

  const changeChallengeStatus = (id, status) => withRemote(async () => {
    const payload = await apiRequest(`/api/admin/challenges/${id}/status`, {
      method: 'PATCH',
      body: { status },
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast('챌린지 상태를 변경했습니다.')
  })

  const updateBilling = (id, patch) => withRemote(async () => {
    const payload = await apiRequest(`/api/admin/challenges/${id}/billing`, {
      method: 'PATCH',
      body: patch,
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast('청구 정보를 변경했습니다.')
  })

  const joinChallenge = (challengeId) => withRemote(async () => {
    if (!currentUser) {
      setPage('login')
      return
    }
    const payload = await apiRequest(`/api/challenges/${challengeId}/join`, {
      method: 'POST',
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast('참가 신청이 완료됐습니다. 운영자의 결제 완료 처리를 기다려주세요.')
    setPage('my')
  })

  const updateParticipant = (participantId, patch) => withRemote(async () => {
    const payload = await apiRequest(`/api/admin/participants/${participantId}`, {
      method: 'PATCH',
      body: patch,
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast('참가자 상태를 변경했습니다.')
  })

  const updatePayout = (participantId, patch) => withRemote(async () => {
    const payload = await apiRequest(`/api/admin/participants/${participantId}/payout`, {
      method: 'PATCH',
      body: patch,
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast('상금 지급 상태를 변경했습니다.')
  })

  const submitProof = async (challengeId, form) => {
    try {
      const payload = await apiRequest(`/api/challenges/${challengeId}/submissions`, {
        method: 'POST',
        body: form,
        token: session.token,
      })
      applyRemoteStore(payload)
      showToast('인증을 제출했습니다.')
      setPage('submissions')
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error.message }
    }
  }

  const reviewSubmission = (submissionId, status, rejectReason = '', rejectDetail = '') => withRemote(async () => {
    const payload = await apiRequest(`/api/admin/submissions/${submissionId}/review`, {
      method: 'PATCH',
      body: { status, rejectReason, rejectDetail },
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast(status === 'approved' ? '인증을 승인했습니다.' : '인증을 반려했습니다.')
  })

  const bulkApproveSubmissions = (submissionIds) => withRemote(async () => {
    if (!submissionIds.length) return
    await Promise.all(submissionIds.map((submissionId) => apiRequest(`/api/admin/submissions/${submissionId}/review`, {
      method: 'PATCH',
      body: { status: 'approved', rejectReason: '', rejectDetail: '' },
      token: session.token,
    })))
    const payload = await apiRequest('/api/bootstrap')
    applyRemoteStore(payload)
    showToast(`${submissionIds.length}건 인증을 일괄 승인했습니다.`)
  })

  const sendTestNotification = (form) => withRemote(async () => {
    const payload = await apiRequest('/api/admin/notifications/test', {
      method: 'POST',
      body: form,
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast(`${form.channel === 'sms' ? '문자' : '이메일'} 테스트 발송을 요청했습니다.`)
  })

  const recalculate = (challengeId) => withRemote(async () => {
    const payload = await apiRequest(`/api/admin/challenges/${challengeId}/recalculate-results`, {
      method: 'POST',
      token: session.token,
    })
    applyRemoteStore(payload)
    showToast('성공 여부와 랭킹을 재계산했습니다.')
  })

  const downloadCsv = (challengeId) => withRemote(async () => {
    const challenge = store.challenges.find((item) => item.id === challengeId)
    const blob = DEMO_MODE
      ? new Blob([`\ufeff${buildWinnersCsv(store, challengeId)}`], { type: 'text/csv;charset=utf-8' })
      : await (async () => {
          const response = await fetch(`/api/admin/challenges/${challengeId}/winners.csv`, {
            headers: { Authorization: `Bearer ${session.token}` },
          })
          if (!response.ok) throw new Error('CSV 다운로드에 실패했습니다.')
          return response.blob()
        })()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `challenge-${challenge.id}-winners-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    if (!DEMO_MODE) {
      const payload = await apiRequest('/api/bootstrap')
      applyRemoteStore(payload)
    }
    showToast('CSV를 다운로드했습니다.')
  })

  if (isBooting) {
    return <div className="boot-screen">플랫폼 데이터를 불러오는 중입니다.</div>
  }

  if (!currentUser) {
    return (
      <AuthScreen
        page={page}
        setPage={setPage}
        login={login}
        register={register}
      />
    )
  }

  return (
    <div className="app-shell">
      {toast && <div className="toast">{toast}</div>}
      {isAdmin ? (
        <AdminShell
          user={currentUser}
          page={page}
          setPage={setPage}
          logout={logout}
          store={store}
          filters={filters}
          setFilters={setFilters}
          selectedChallengeId={selectedChallengeId}
          setSelectedChallengeId={setSelectedChallengeId}
          resultMap={resultMap}
          createChallenge={createChallenge}
          updateChallenge={updateChallenge}
          changeChallengeStatus={changeChallengeStatus}
          updateBilling={updateBilling}
          updateParticipant={updateParticipant}
          updatePayout={updatePayout}
          reviewSubmission={reviewSubmission}
          bulkApproveSubmissions={bulkApproveSubmissions}
          sendTestNotification={sendTestNotification}
          recalculate={recalculate}
          downloadCsv={downloadCsv}
        />
      ) : (
        <ParticipantShell
          user={currentUser}
          page={page}
          setPage={setPage}
          logout={logout}
          store={store}
          selectedChallengeId={selectedChallengeId}
          setSelectedChallengeId={setSelectedChallengeId}
          resultMap={resultMap}
          joinChallenge={joinChallenge}
          submitProof={submitProof}
        />
      )}
    </div>
  )
}

function AuthScreen({ page, setPage, login, register }) {
  const [form, setForm] = useState({ name: '', email: 'admin@challenge.local', password: 'admin1234', phone: '' })
  const [error, setError] = useState('')
  const isRegister = page === 'register'

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (isRegister) {
      if (!form.name || !form.email || form.password.length < 8 || !form.phone) {
        setError('모든 필드를 입력하고 비밀번호는 8자 이상으로 설정해주세요.')
        return
      }
      const result = await register(form).catch((error) => ({ ok: false, message: error.message }))
      if (!result.ok) return setError(result.message)
      setPage('login')
      setForm({ name: '', email: form.email, password: '', phone: '' })
      return
    }
    const result = await login(form.email, form.password).catch((error) => {
      setError(error.message)
      return false
    })
    if (!result && !error) setError('이메일 또는 비밀번호가 올바르지 않습니다.')
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-mark"><ClipboardCheck size={28} /> 챌린지 매니저</div>
        <h1>{isRegister ? '참가자 회원가입' : '운영과 인증을 한 화면에서'}</h1>
        <p>블로그 챌린지를 만들고, 참가 신청부터 인증 심사와 성공자 CSV까지 관리합니다.</p>
        <form onSubmit={submit} className="auth-form">
          {isRegister && (
            <label>
              이름
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="홍길동" />
            </label>
          )}
          <label>
            이메일
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            비밀번호
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          {isRegister && (
            <label>
              휴대폰 번호
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="010-1234-5678" />
            </label>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" type="submit">{isRegister ? '회원가입' : '로그인'}</button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setError('')
            setPage(isRegister ? 'login' : 'register')
            setForm(isRegister ? { name: '', email: 'admin@challenge.local', password: 'admin1234', phone: '' } : { name: '', email: '', password: '', phone: '' })
          }}
        >
          {isRegister ? '이미 계정이 있습니다' : '참가자 계정 만들기'}
        </button>
        <div className="demo-accounts">
          <strong>테스트 계정</strong>
          <span>관리자: admin@challenge.local / admin1234</span>
          <span>참가자: user@challenge.local / user1234</span>
        </div>
      </section>
    </main>
  )
}

function AdminShell(props) {
  const { user, page, setPage, logout } = props
  const titleMap = {
    'admin-dashboard': '관리자 대시보드',
    'admin-challenges': '챌린지 관리',
    'admin-challenge-form': '챌린지 생성/수정',
    'admin-participants': '참가자 관리',
    'admin-submissions': '인증 심사',
    'admin-ranking': '랭킹/성공자',
    'admin-settlement': '상금 정산',
    'admin-notifications': '알림 발송',
    'admin-audit': '감사 로그',
  }
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand"><ClipboardCheck /> 챌린지 매니저</div>
        <nav>
          <NavButton icon={<LayoutDashboard />} label="대시보드" active={page === 'admin-dashboard'} onClick={() => setPage('admin-dashboard')} />
          <NavButton icon={<ListChecks />} label="챌린지" active={['admin-challenges', 'admin-challenge-form', 'admin-participants', 'admin-ranking'].includes(page)} onClick={() => setPage('admin-challenges')} />
          <NavButton icon={<ClipboardCheck />} label="인증 심사" active={page === 'admin-submissions'} onClick={() => setPage('admin-submissions')} />
          <NavButton icon={<BadgeCheck />} label="상금 정산" active={page === 'admin-settlement'} onClick={() => setPage('admin-settlement')} />
          <NavButton icon={<Send />} label="알림 발송" active={page === 'admin-notifications'} onClick={() => setPage('admin-notifications')} />
          <NavButton icon={<ShieldCheck />} label="감사 로그" active={page === 'admin-audit'} onClick={() => setPage('admin-audit')} />
        </nav>
      </aside>
      <main className="admin-main">
        <header className="topbar">
          <div>
            <span className="eyebrow">Admin Console</span>
            <h1>{titleMap[page]}</h1>
          </div>
          <div className="user-chip"><UserRound size={16} /> {user.name}<button onClick={logout}><LogOut size={16} /> 로그아웃</button></div>
        </header>
        {page === 'admin-dashboard' && <AdminDashboard {...props} />}
        {page === 'admin-challenges' && <AdminChallenges {...props} />}
        {page === 'admin-challenge-form' && <ChallengeForm {...props} />}
        {page === 'admin-participants' && <AdminParticipants {...props} />}
        {page === 'admin-submissions' && <AdminSubmissions {...props} />}
        {page === 'admin-ranking' && <AdminRanking {...props} />}
        {page === 'admin-settlement' && <AdminSettlement {...props} />}
        {page === 'admin-notifications' && <AdminNotifications {...props} />}
        {page === 'admin-audit' && <AuditLogs {...props} />}
      </main>
    </div>
  )
}

function ParticipantShell(props) {
  const { page, setPage, logout } = props
  return (
    <main className="participant-layout">
      <header className="participant-header">
        <div><span className="eyebrow">Challenge Manager</span><h1>챌린지 매니저</h1></div>
        <button className="ghost-button" onClick={logout}><LogOut size={16} /> 로그아웃</button>
      </header>
      <nav className="participant-tabs">
        <button className={page === 'challenges' ? 'active' : ''} onClick={() => setPage('challenges')}>챌린지</button>
        <button className={page === 'my' ? 'active' : ''} onClick={() => setPage('my')}>내 챌린지</button>
        <button className={page === 'submissions' ? 'active' : ''} onClick={() => setPage('submissions')}>인증 내역</button>
      </nav>
      {page === 'challenges' && <ChallengeList {...props} />}
      {page === 'challenge-detail' && <ChallengeDetail {...props} />}
      {page === 'my' && <MyChallenges {...props} />}
      {page === 'submit' && <SubmitProof {...props} />}
      {page === 'submissions' && <MySubmissions {...props} />}
    </main>
  )
}

function NavButton({ icon, label, active, onClick }) {
  return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>
}

function AdminDashboard({ store, setPage, setSelectedChallengeId, resultMap }) {
  const pendingSubmissions = store.submissions.filter((item) => item.status === 'pending')
  const paidParticipants = store.participants.filter((item) => item.paymentStatus === 'paid')
  const successCount = paidParticipants.filter((item) => resultMap[item.id]?.successStatus === 'success' || item.successStatus === 'success').length
  return (
    <section className="stack">
      <div className="metric-grid">
        <Metric icon={<ListChecks />} label="전체 챌린지" value={store.challenges.length} />
        <Metric icon={<Activity />} label="모집 중" value={store.challenges.filter((item) => item.status === 'recruiting').length} />
        <Metric icon={<Clock />} label="진행 중" value={store.challenges.filter((item) => item.status === 'active').length} />
        <Metric icon={<Eye />} label="검토 대기 인증" value={pendingSubmissions.length} tone="warn" />
        <Metric icon={<Users />} label="결제 대기 참가자" value={store.participants.filter((item) => item.paymentStatus === 'pending').length} />
        <Metric icon={<BadgeCheck />} label="성공자" value={successCount} tone="success" />
      </div>
      <div className="split-grid">
        <Panel title="최근 검토 대기 인증">
          <CompactTable
            columns={['챌린지', '참가자', '회차', '제출 시각']}
            rows={pendingSubmissions.slice(0, 6).map((submission) => {
              const challenge = store.challenges.find((item) => item.id === submission.challengeId)
              const user = store.users.find((item) => item.id === submission.userId)
              return [challenge?.title, user?.name, `${submission.missionRound}회차`, formatDateTime(submission.submittedAt)]
            })}
            empty="검토 대기 인증이 없습니다."
          />
        </Panel>
        <Panel title="청구 상태 요약">
          <div className="billing-summary">
            {['planned', 'invoiced', 'paid', 'waived'].map((status) => (
              <div key={status}>
                <StatusBadge status={status} billing />
                <strong>{store.challenges.filter((item) => item.billingStatus === status).length}</strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="최근 챌린지">
        <div className="challenge-row-list">
          {store.challenges.slice(0, 5).map((challenge) => (
            <button key={challenge.id} onClick={() => { setSelectedChallengeId(challenge.id); setPage('admin-ranking') }}>
              <span>{challenge.title}</span>
              <StatusBadge status={challenge.status} />
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </Panel>
    </section>
  )
}

function AdminChallenges({ store, filters, setFilters, setPage, setSelectedChallengeId, changeChallengeStatus, updateBilling, downloadCsv }) {
  const filtered = store.challenges.filter((challenge) => {
    const statusOk = filters.status === 'all' || challenge.status === filters.status
    const billingOk = filters.billing === 'all' || challenge.billingStatus === filters.billing
    const platformOk = filters.platform === 'all' || (challenge.platformType || 'blog') === filters.platform
    const queryOk = !filters.query || challenge.title.includes(filters.query) || challenge.clientName?.includes(filters.query)
    return statusOk && billingOk && platformOk && queryOk
  })
  return (
    <section className="stack">
      <div className="toolbar">
        <div className="search-field"><Search size={16} /><input placeholder="챌린지/고객 검색" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /></div>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="all">전체 상태</option>
          {['draft', 'recruiting', 'active', 'closed', 'settled'].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
        <select value={filters.billing} onChange={(event) => setFilters({ ...filters, billing: event.target.value })}>
          <option value="all">전체 청구</option>
          {['not_billable', 'planned', 'invoiced', 'paid', 'waived'].map((status) => <option key={status} value={status}>{statusLabels[status === 'paid' ? 'paidBilling' : status]}</option>)}
        </select>
        <select value={filters.platform} onChange={(event) => setFilters({ ...filters, platform: event.target.value })}>
          <option value="all">전체 플랫폼</option>
          {Object.entries(platformTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="primary-button compact" onClick={() => { setSelectedChallengeId(null); setPage('admin-challenge-form') }}><Plus size={16} /> 챌린지 생성</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>제목</th><th>플랫폼</th><th>상태</th><th>기간</th><th>참가자</th><th>고객/청구</th><th>예상 청구</th><th>액션</th></tr></thead>
          <tbody>
            {filtered.map((challenge) => {
              const participants = store.participants.filter((item) => item.challengeId === challenge.id)
              const pending = store.submissions.filter((item) => item.challengeId === challenge.id && item.status === 'pending').length
              return (
                <tr key={challenge.id}>
                  <td><strong>{challenge.title}</strong><span className="subtext">검토 대기 {pending}건</span></td>
                  <td><PlatformBadge type={challenge.platformType} /></td>
                  <td><StatusBadge status={challenge.status} /></td>
                  <td><span>{formatDate(challenge.recruitmentStartAt)} - {formatDate(challenge.challengeEndAt)}</span></td>
                  <td>{participants.length} / {challenge.maxParticipants}</td>
                  <td>
                    <strong>{challenge.clientName || '-'}</strong>
                    <select value={challenge.billingStatus} onChange={(event) => updateBilling(challenge.id, { billingStatus: event.target.value })}>
                      {['not_billable', 'planned', 'invoiced', 'paid', 'waived'].map((status) => <option key={status} value={status}>{statusLabels[status === 'paid' ? 'paidBilling' : status]}</option>)}
                    </select>
                  </td>
                  <td>{currency(challenge.expectedBillingAmount)}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => { setSelectedChallengeId(challenge.id); setPage('admin-challenge-form') }}>수정</button>
                      <button onClick={() => { setSelectedChallengeId(challenge.id); setPage('admin-participants') }}>참가자</button>
                      <button onClick={() => { setSelectedChallengeId(challenge.id); setPage('admin-ranking') }}>랭킹</button>
                      <button onClick={() => downloadCsv(challenge.id)}><FileDown size={14} /></button>
                    </div>
                    <select value={challenge.status} onChange={(event) => changeChallengeStatus(challenge.id, event.target.value)}>
                      {['draft', 'recruiting', 'active', 'closed', 'settled'].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ChallengeForm({ store, selectedChallengeId, createChallenge, updateChallenge }) {
  const existing = store.challenges.find((item) => item.id === selectedChallengeId)
  const [form, setForm] = useState(() => existing || createChallengeDraft('blog'))
  const [error, setError] = useState('')
  const locked = existing && ['closed', 'settled'].includes(existing.status)
  const applyTemplate = (platformType, mode = 'force') => {
    const template = challengeTemplates[platformType] || challengeTemplates.blog
    setForm((current) => ({
      ...current,
      platformType,
      title: mode === 'smart' && current.title.trim() ? current.title : template.title,
      description: mode === 'smart' && current.description.trim() ? current.description : template.description,
      verificationGuide: mode === 'smart' && current.verificationGuide.trim() ? current.verificationGuide : template.verificationGuide,
    }))
  }
  const handlePlatformChange = (platformType) => {
    if (existing) {
      setForm({ ...form, platformType })
      return
    }
    const currentTemplate = challengeTemplates[form.platformType || 'blog'] || challengeTemplates.blog
    const nextTemplate = challengeTemplates[platformType] || challengeTemplates.blog
    const shouldSyncTitle = !form.title.trim() || form.title === currentTemplate.title
    const shouldSyncDescription = !form.description.trim() || form.description === currentTemplate.description
    const shouldSyncGuide = !form.verificationGuide.trim() || form.verificationGuide === currentTemplate.verificationGuide
    setForm({
      ...form,
      platformType,
      title: shouldSyncTitle ? nextTemplate.title : form.title,
      description: shouldSyncDescription ? nextTemplate.description : form.description,
      verificationGuide: shouldSyncGuide ? nextTemplate.verificationGuide : form.verificationGuide,
    })
  }
  const submit = (event) => {
    event.preventDefault()
    const validation = validateChallenge(form)
    if (validation) return setError(validation)
    existing ? updateChallenge(existing.id, form) : createChallenge(form)
  }
  return (
    <form className="form-page" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      {locked && <div className="warning-box"><AlertTriangle size={16} /> 종료/정산 완료 상태는 수정이 제한됩니다.</div>}
      <FormSection title="기본 정보">
        <label>플랫폼<select disabled={locked} value={form.platformType || 'blog'} onChange={(e) => handlePlatformChange(e.target.value)}>{Object.entries(platformTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>제목<input disabled={locked} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>설명<textarea disabled={locked} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><span className="subtext">기본 예시가 자동으로 입력됩니다. 운영 목적에 맞게 바로 수정해서 사용할 수 있습니다.</span></label>
        {!locked && <div className="form-helper-actions"><button type="button" onClick={() => applyTemplate(form.platformType || 'blog')}>설명 예시 다시 넣기</button></div>}
      </FormSection>
      <FormSection title="기간/성공 기준">
        <div className="form-grid">
          <label>모집 시작<input disabled={locked} type="date" value={form.recruitmentStartAt} onChange={(e) => setForm({ ...form, recruitmentStartAt: e.target.value })} /></label>
          <label>모집 종료<input disabled={locked} type="date" value={form.recruitmentEndAt} onChange={(e) => setForm({ ...form, recruitmentEndAt: e.target.value })} /></label>
          <label>진행 시작<input disabled={locked} type="date" value={form.challengeStartAt} onChange={(e) => setForm({ ...form, challengeStartAt: e.target.value })} /></label>
          <label>진행 종료<input disabled={locked} type="date" value={form.challengeEndAt} onChange={(e) => setForm({ ...form, challengeEndAt: e.target.value })} /></label>
          <label>참가비 표시 금액<input disabled={locked} type="number" value={form.entryFeeDisplay} onChange={(e) => setForm({ ...form, entryFeeDisplay: e.target.value })} /></label>
          <label>전체 미션 수<input disabled={locked} type="number" value={form.totalMissionCount} onChange={(e) => setForm({ ...form, totalMissionCount: e.target.value })} /></label>
          <label>성공 필요 승인 수<input disabled={locked} type="number" value={form.requiredApprovalCount} onChange={(e) => setForm({ ...form, requiredApprovalCount: e.target.value })} /></label>
          <label>최대 참가자 수<input disabled={locked} type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })} /></label>
        </div>
      </FormSection>
      <FormSection title="안내 문구">
        <label>인증 안내<textarea disabled={locked} value={form.verificationGuide} onChange={(e) => setForm({ ...form, verificationGuide: e.target.value })} /></label>
        <label>환불 안내<textarea disabled={locked} value={form.refundGuide} onChange={(e) => setForm({ ...form, refundGuide: e.target.value })} /></label>
      </FormSection>
      <FormSection title="고객/청구 정보">
        <div className="form-grid">
          <label>고객명<input value={form.clientName || ''} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></label>
          <label>고객 유형<select value={form.clientType} onChange={(e) => setForm({ ...form, clientType: e.target.value })}>{Object.entries(clientTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>예상 청구 금액<input type="number" value={form.expectedBillingAmount || 0} onChange={(e) => setForm({ ...form, expectedBillingAmount: e.target.value })} /></label>
          <label>청구 상태<select value={form.billingStatus} onChange={(e) => setForm({ ...form, billingStatus: e.target.value })}>{['not_billable', 'planned', 'invoiced', 'paid', 'waived'].map((status) => <option key={status} value={status}>{statusLabels[status === 'paid' ? 'paidBilling' : status]}</option>)}</select></label>
        </div>
        <label>과금 방식 메모<textarea value={form.billingMemo || ''} onChange={(e) => setForm({ ...form, billingMemo: e.target.value })} /></label>
      </FormSection>
      <FormSection title="상태">
        <label>챌린지 상태<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['draft', 'recruiting', 'active', 'closed', 'settled'].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
      </FormSection>
      <button className="primary-button" type="submit" disabled={locked}>저장</button>
    </form>
  )
}

function AdminParticipants({ store, selectedChallengeId, updateParticipant, resultMap }) {
  const challenge = store.challenges.find((item) => item.id === selectedChallengeId) || store.challenges[0]
  const [query, setQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [resultFilter, setResultFilter] = useState('all')
  const participants = store.participants.filter((item) => item.challengeId === challenge?.id)
  const filteredParticipants = participants.filter((participant) => {
    const user = store.users.find((item) => item.id === participant.userId)
    const result = resultMap[participant.id] || participant
    const queryOk = !query || [user?.name, user?.email, user?.phone].some((value) => String(value || '').toLowerCase().includes(query.toLowerCase()))
    const paymentOk = paymentFilter === 'all' || participant.paymentStatus === paymentFilter
    const resultOk = resultFilter === 'all' || (result.successStatus || participant.successStatus) === resultFilter
    return queryOk && paymentOk && resultOk
  })
  return (
    <Panel title={`${challenge?.title || ''} 참가자`}>
      <div className="toolbar">
        <div className="search-field"><Search size={16} /><input placeholder="이름, 이메일, 휴대폰 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
          <option value="all">전체 결제 상태</option>
          {['pending', 'paid', 'refunded', 'canceled'].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
        <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
          <option value="all">전체 결과 상태</option>
          {['in_progress', 'success', 'failed'].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
        <span className="toolbar-summary">표시 {filteredParticipants.length} / 전체 {participants.length}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>참가자</th><th>신청</th><th>결제</th><th>참가</th><th>승인</th><th>결과</th><th>액션</th></tr></thead>
          <tbody>
            {filteredParticipants.map((participant) => {
              const user = store.users.find((item) => item.id === participant.userId)
              const result = resultMap[participant.id] || participant
              return (
                <tr key={participant.id}>
                  <td><strong>{user?.name}</strong><span className="subtext">{user?.email} / {user?.phone}</span></td>
                  <td>{formatDateTime(participant.joinedAt)}</td>
                  <td><StatusBadge status={participant.paymentStatus} /></td>
                  <td><StatusBadge status={participant.participationStatus} /></td>
                  <td>{result.approvedRoundCount || 0} / {challenge.requiredApprovalCount}</td>
                  <td><StatusBadge status={result.successStatus || participant.successStatus} /></td>
                  <td className="row-actions">
                    <button onClick={() => updateParticipant(participant.id, { paymentStatus: 'paid' })}><Check size={14} /> 결제 완료</button>
                    <button onClick={() => updateParticipant(participant.id, { paymentStatus: 'refunded' })}>환불</button>
                    <button onClick={() => updateParticipant(participant.id, { paymentStatus: 'canceled' })}>취소</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!participants.length && <Empty text="아직 참가 신청자가 없습니다." />}
      {!!participants.length && !filteredParticipants.length && <Empty text="조건에 맞는 참가자가 없습니다." />}
    </Panel>
  )
}

function AdminSubmissions({ store, reviewSubmission, bulkApproveSubmissions }) {
  const [filter, setFilter] = useState('pending')
  const [challengeFilter, setChallengeFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [rejecting, setRejecting] = useState(null)
  const submissions = store.submissions.filter((submission) => {
    const challenge = store.challenges.find((item) => item.id === submission.challengeId)
    const user = store.users.find((item) => item.id === submission.userId)
    const statusOk = filter === 'all' || submission.status === filter
    const challengeOk = challengeFilter === 'all' || submission.challengeId === challengeFilter
    const platformOk = platformFilter === 'all' || (challenge?.platformType || 'blog') === platformFilter
    const queryOk = !query || [challenge?.title, user?.name, user?.email, submission.linkUrl, submission.description]
      .some((value) => String(value || '').toLowerCase().includes(query.toLowerCase()))
    return statusOk && challengeOk && platformOk && queryOk
  })
  const pendingVisibleIds = submissions.filter((item) => item.status === 'pending').map((item) => item.id)
  const allPendingVisibleSelected = pendingVisibleIds.length > 0 && pendingVisibleIds.every((id) => selectedIds.includes(id))
  return (
    <section className="stack">
      <div className="toolbar">
        <div className="search-field"><Search size={16} /><input placeholder="챌린지, 참가자, 링크 검색" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending">검토 중</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
          <option value="all">전체</option>
        </select>
        <select value={challengeFilter} onChange={(e) => setChallengeFilter(e.target.value)}>
          <option value="all">전체 챌린지</option>
          {store.challenges.map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title}</option>)}
        </select>
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
          <option value="all">전체 플랫폼</option>
          {Object.entries(platformTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button disabled={!selectedIds.length} onClick={() => bulkApproveSubmissions(selectedIds)}><Check size={16} /> 선택 승인</button>
        <span className="toolbar-summary">선택 {selectedIds.length}건</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th className="checkbox-cell"><input type="checkbox" disabled={!pendingVisibleIds.length} checked={allPendingVisibleSelected} onChange={(event) => setSelectedIds(event.target.checked ? pendingVisibleIds : [])} /></th><th>챌린지</th><th>참가자</th><th>회차</th><th>인증</th><th>상태</th><th>액션</th></tr></thead>
          <tbody>
            {submissions.map((submission) => {
              const challenge = store.challenges.find((item) => item.id === submission.challengeId)
              const user = store.users.find((item) => item.id === submission.userId)
              const isSelectable = submission.status === 'pending'
              return (
                <tr key={submission.id}>
                  <td className="checkbox-cell"><input type="checkbox" disabled={!isSelectable} checked={selectedIds.includes(submission.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, submission.id] : current.filter((id) => id !== submission.id))} /></td>
                  <td>{challenge?.title}</td>
                  <td><strong>{user?.name}</strong><span className="subtext">{user?.email}</span></td>
                  <td>{submission.missionRound}회차</td>
                  <td>
                    <PlatformBadge type={challenge?.platformType} />
                    <a href={submission.linkUrl} target="_blank" rel="noreferrer"><LinkIcon size={14} /> 링크 열기</a>
                    <span className="subtext">{submission.description}</span>
                    {submission.imageData && <img className="proof-thumb" src={submission.imageData} alt={submission.imageName || '인증 이미지'} />}
                  </td>
                  <td><StatusBadge status={submission.status} /></td>
                  <td className="row-actions">
                    <button disabled={submission.status !== 'pending'} onClick={() => reviewSubmission(submission.id, 'approved')}><Check size={14} /> 승인</button>
                    <button disabled={submission.status !== 'pending'} onClick={() => setRejecting(submission)}><X size={14} /> 반려</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!submissions.length && <Empty text="조건에 맞는 인증이 없습니다." />}
      {rejecting && <RejectModal submission={rejecting} onClose={() => setRejecting(null)} onSubmit={(reason, detail) => { reviewSubmission(rejecting.id, 'rejected', reason, detail); setRejecting(null) }} />}
    </section>
  )
}

function AdminRanking({ store, selectedChallengeId, resultMap, recalculate, downloadCsv }) {
  const challenge = store.challenges.find((item) => item.id === selectedChallengeId) || store.challenges[0]
  const rows = store.participants
    .filter((item) => item.challengeId === challenge?.id)
    .map((participant) => ({ participant, user: store.users.find((item) => item.id === participant.userId), result: resultMap[participant.id] || participant }))
    .sort((a, b) => (a.result.finalRank || 9999) - (b.result.finalRank || 9999))
  return (
    <section className="stack">
      <div className="panel-header standalone">
        <div>
          <span className="eyebrow">Ranking</span>
          <h2>{challenge?.title}</h2>
          <p>성공 기준: 승인된 고유 회차 {challenge?.requiredApprovalCount}개 이상</p>
        </div>
        <div className="row-actions">
          <button onClick={() => recalculate(challenge.id)}><RefreshCw size={16} /> 재계산</button>
          <button className="primary-button compact" onClick={() => downloadCsv(challenge.id)}><ArrowDownToLine size={16} /> CSV 다운로드</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>순위</th><th>참가자</th><th>승인</th><th>결과</th><th>결제</th><th>참가</th></tr></thead>
          <tbody>
            {rows.map(({ participant, user, result }) => (
              <tr key={participant.id}>
                <td><strong>{result.finalRank || '-'}</strong></td>
                <td><strong>{user?.name}</strong><span className="subtext">{user?.email}</span></td>
                <td>{result.approvedRoundCount || 0} / {challenge.requiredApprovalCount}</td>
                <td><StatusBadge status={result.successStatus || participant.successStatus} /></td>
                <td><StatusBadge status={participant.paymentStatus} /></td>
                <td><StatusBadge status={participant.participationStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdminSettlement({ store, selectedChallengeId, resultMap, recalculate, updatePayout, downloadCsv }) {
  const challenge = store.challenges.find((item) => item.id === selectedChallengeId) || store.challenges[0]
  const rows = store.participants
    .filter((item) => item.challengeId === challenge?.id)
    .map((participant) => ({ participant, user: store.users.find((item) => item.id === participant.userId), result: resultMap[participant.id] || participant }))
    .filter(({ participant, result }) => (result.successStatus || participant.successStatus) === 'success')
    .sort((a, b) => (a.result.finalRank || 9999) - (b.result.finalRank || 9999))
  const paidParticipantCount = store.participants.filter((item) => item.challengeId === challenge?.id && item.paymentStatus === 'paid').length
  const prizePool = paidParticipantCount * Number(challenge?.entryFeeDisplay || 0)
  const payoutTotal = rows.reduce((sum, { participant }) => sum + Number(participant.payoutAmount || challenge?.entryFeeDisplay || 0), 0)
  const paidTotal = rows.filter(({ participant }) => participant.payoutStatus === 'paid').reduce((sum, { participant }) => sum + Number(participant.payoutAmount || 0), 0)
  return (
    <section className="stack">
      <div className="panel-header standalone">
        <div>
          <span className="eyebrow">Settlement</span>
          <h2>{challenge?.title}</h2>
          <p>실제 송금은 외부에서 처리하고, 이 화면에서는 지급 대상과 상태를 운영 기록으로 관리합니다.</p>
        </div>
        <div className="row-actions">
          <button onClick={() => recalculate(challenge.id)}><RefreshCw size={16} /> 대상 재계산</button>
          <button className="primary-button compact" onClick={() => downloadCsv(challenge.id)}><ArrowDownToLine size={16} /> CSV 다운로드</button>
        </div>
      </div>
      <div className="metric-grid settlement-metrics">
        <Metric icon={<Users />} label="결제 완료" value={`${paidParticipantCount}명`} />
        <Metric icon={<BadgeCheck />} label="성공자" value={`${rows.length}명`} success />
        <Metric icon={<FileDown />} label="참가비 풀" value={currency(prizePool)} />
        <Metric icon={<Check />} label="지급 예정" value={currency(payoutTotal)} />
        <Metric icon={<ShieldCheck />} label="지급 완료" value={currency(paidTotal)} success />
        <Metric icon={<AlertTriangle />} label="미지급" value={currency(Math.max(0, payoutTotal - paidTotal))} warn />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>순위</th><th>성공자</th><th>승인</th><th>지급액</th><th>지급 상태</th><th>지급일</th><th>액션</th></tr></thead>
          <tbody>
            {rows.map(({ participant, user, result }) => {
              const payoutAmount = participant.payoutAmount || challenge.entryFeeDisplay
              return (
                <tr key={participant.id}>
                  <td><strong>{result.finalRank || '-'}</strong></td>
                  <td><strong>{user?.name}</strong><span className="subtext">{user?.email} / {user?.phone}</span></td>
                  <td>{result.approvedRoundCount || participant.approvedRoundCount || 0} / {challenge.requiredApprovalCount}</td>
                  <td>{currency(payoutAmount)}</td>
                  <td><StatusBadge status={participant.payoutStatus || 'pending'} payout /></td>
                  <td>{participant.paidOutAt ? formatDateTime(participant.paidOutAt) : '-'}</td>
                  <td className="row-actions">
                    <button onClick={() => updatePayout(participant.id, { payoutStatus: 'pending', payoutAmount })}>대기</button>
                    <button onClick={() => updatePayout(participant.id, { payoutStatus: 'hold', payoutAmount })}>보류</button>
                    <button onClick={() => updatePayout(participant.id, { payoutStatus: 'paid', payoutAmount })}><Check size={14} /> 지급 완료</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && <Empty text="성공자로 확정된 참가자가 없습니다. 챌린지 종료 후 랭킹을 재계산해 주세요." />}
    </section>
  )
}

function AdminNotifications({ store, sendTestNotification }) {
  const [form, setForm] = useState({ channel: 'sms', to: '', subject: '', text: '' })
  const config = store.notificationConfig || { enabled: false, serviceCode: '', baseUrl: '', channels: { sms: false, email: false }, defaultFromEmail: '' }
  const submit = (event) => {
    event.preventDefault()
    if (!form.to.trim() || !form.text.trim()) return
    if (form.channel === 'email' && !form.subject.trim()) return
    sendTestNotification({
      channel: form.channel,
      to: form.to.trim(),
      subject: form.subject.trim(),
      text: form.text.trim(),
    })
  }
  return (
    <section className="stack">
      <div className="metric-grid notification-metrics">
        <Metric icon={<Send />} label="알림 연동" value={config.enabled ? '활성' : '비활성'} tone={config.enabled ? 'success' : undefined} />
        <Metric icon={<MessageSquare />} label="SMS 채널" value={config.channels?.sms ? '사용 가능' : '비활성'} />
        <Metric icon={<Mail />} label="EMAIL 채널" value={config.channels?.email ? '사용 가능' : '비활성'} />
      </div>
      <Panel title="연동 정보">
        <div className="mini-grid">
          <span>서비스 코드: {config.serviceCode || '-'}</span>
          <span>API 주소: {config.baseUrl || '-'}</span>
          <span>기본 발신 이메일: {config.defaultFromEmail || '-'}</span>
        </div>
      </Panel>
      <form className="form-page compact-form" onSubmit={submit}>
        <FormSection title="테스트 발송">
          <div className="form-grid">
            <label>채널<select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}><option value="sms">SMS</option><option value="email">EMAIL</option></select></label>
            <label>수신자<input value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })} placeholder={form.channel === 'sms' ? '01012345678' : 'user@example.com'} /></label>
            {form.channel === 'email' && <label>제목<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="테스트 메일 제목" /></label>}
          </div>
          <label>내용<textarea value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder={form.channel === 'sms' ? '테스트 문자 내용' : '테스트 이메일 내용'} /></label>
          <div className="row-actions"><button className="primary-button" type="submit">테스트 발송</button></div>
        </FormSection>
      </form>
      <Panel title="최근 발송 로그">
        <div className="table-wrap">
          <table>
            <thead><tr><th>시각</th><th>채널</th><th>수신자</th><th>템플릿</th><th>상태</th><th>메시지</th><th>오류</th></tr></thead>
            <tbody>
              {(store.notificationLogs || []).map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  <td><StatusBadge status={log.channel === 'sms' ? 'planned' : 'invoiced'} /><span className="subtext">{log.channel.toUpperCase()}</span></td>
                  <td>{log.recipient}</td>
                  <td>{log.templateCode}</td>
                  <td><StatusBadge status={log.status === 'sent' ? 'approved' : 'rejected'} /></td>
                  <td><span className="subtext">{log.subject}</span>{log.messageText}</td>
                  <td>{log.errorMessage || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!(store.notificationLogs || []).length && <Empty text="아직 발송 로그가 없습니다." />}
      </Panel>
    </section>
  )
}

function AuditLogs({ store }) {
  return (
    <Panel title="감사 로그">
      <div className="table-wrap">
        <table>
          <thead><tr><th>시각</th><th>수행자</th><th>행위</th><th>대상</th><th>변경 전</th><th>변경 후</th></tr></thead>
          <tbody>
            {store.auditLogs.map((log) => (
              <tr key={log.id}>
                <td>{formatDateTime(log.createdAt)}</td>
                <td>{log.actorName}</td>
                <td><code>{log.actionType}</code></td>
                <td>{log.targetType} / {log.targetId}</td>
                <td><pre>{JSON.stringify(log.beforeValue, null, 2)}</pre></td>
                <td><pre>{JSON.stringify(log.afterValue, null, 2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!store.auditLogs.length && <Empty text="감사 로그가 없습니다." />}
    </Panel>
  )
}

function ChallengeList({ store, setPage, setSelectedChallengeId }) {
  const visible = store.challenges.filter((item) => ['recruiting', 'active'].includes(item.status))
  return (
    <section className="participant-stack">
      {visible.map((challenge) => (
        <article className="challenge-card" key={challenge.id}>
          <div className="card-top"><div className="row-actions"><StatusBadge status={challenge.status} /><PlatformBadge type={challenge.platformType} /></div><span>{currency(challenge.entryFeeDisplay)}</span></div>
          <h2>{challenge.title}</h2>
          <p>{challenge.description}</p>
          <div className="mini-grid">
            <span>모집 {formatDate(challenge.recruitmentEndAt)}까지</span>
            <span>진행 {formatDate(challenge.challengeStartAt)} - {formatDate(challenge.challengeEndAt)}</span>
            <span>성공 기준 {challenge.requiredApprovalCount}/{challenge.totalMissionCount}</span>
          </div>
          <button className="primary-button" onClick={() => { setSelectedChallengeId(challenge.id); setPage('challenge-detail') }}>상세 보기</button>
        </article>
      ))}
      {!visible.length && <Empty text="현재 모집 또는 진행 중인 챌린지가 없습니다." />}
    </section>
  )
}

function ChallengeDetail({ store, selectedChallengeId, joinChallenge }) {
  const challenge = store.challenges.find((item) => item.id === selectedChallengeId)
  const currentCount = store.participants.filter((item) => item.challengeId === challenge?.id && item.participationStatus !== 'canceled').length
  if (!challenge) return <Empty text="챌린지를 찾을 수 없습니다." />
  return (
    <section className="detail-page">
      <div className="row-actions"><StatusBadge status={challenge.status} /><PlatformBadge type={challenge.platformType} /></div>
      <h2>{challenge.title}</h2>
      <p>{challenge.description}</p>
      <div className="detail-metrics">
        <Metric label="참가비" value={currency(challenge.entryFeeDisplay)} />
        <Metric label="성공 기준" value={`${challenge.requiredApprovalCount}/${challenge.totalMissionCount}`} />
        <Metric label="참가자" value={`${currentCount}/${challenge.maxParticipants}`} />
      </div>
      <Panel title="인증 안내"><p>{challenge.verificationGuide}</p></Panel>
      <Panel title="환불 안내"><p>{challenge.refundGuide}</p></Panel>
      <button className="primary-button sticky-cta" disabled={challenge.status !== 'recruiting'} onClick={() => joinChallenge(challenge.id)}>
        {challenge.status === 'recruiting' ? '참가 신청' : '모집 중에만 신청 가능'}
      </button>
    </section>
  )
}

function MyChallenges({ store, user, resultMap, setSelectedChallengeId, setPage }) {
  const mine = store.participants.filter((item) => item.userId === user.id)
  return (
    <section className="participant-stack">
      {mine.map((participant) => {
        const challenge = store.challenges.find((item) => item.id === participant.challengeId)
        const result = resultMap[participant.id] || participant
        return (
          <article className="challenge-card" key={participant.id}>
            <div className="card-top"><StatusBadge status={participant.participationStatus} /><StatusBadge status={participant.paymentStatus} /></div>
            <h2>{challenge.title}</h2>
            <Progress current={result.approvedRoundCount || 0} target={challenge.requiredApprovalCount} />
            <div className="mini-grid">
              <span>현재 순위 {result.finalRank || '-'}</span>
              <span>결과 {statusLabels[result.successStatus || participant.successStatus]}</span>
            </div>
            <div className="card-actions">
              <button className="primary-button" onClick={() => { setSelectedChallengeId(challenge.id); setPage('submit') }}>인증 제출</button>
              <button className="ghost-button" onClick={() => setPage('submissions')}>인증 내역</button>
            </div>
          </article>
        )
      })}
      {!mine.length && <Empty text="참가 신청한 챌린지가 없습니다." />}
    </section>
  )
}

function SubmitProof({ store, selectedChallengeId, submitProof }) {
  const challenge = store.challenges.find((item) => item.id === selectedChallengeId)
  const [form, setForm] = useState({ missionRound: 1, linkUrl: '', description: '', imageData: '', imageName: '' })
  const [error, setError] = useState('')
  if (!challenge) return <Empty text="챌린지를 찾을 수 없습니다." />
  const proofLabel = platformProofLabels[challenge.platformType || 'blog']
  const activeRounds = new Set(store.submissions
    .filter((submission) => submission.challengeId === challenge.id && ['pending', 'approved'].includes(submission.status))
    .map((submission) => Number(submission.missionRound)))
  const selectedRoundBlocked = activeRounds.has(Number(form.missionRound))
  const handleImage = (file) => {
    setError('')
    if (!file) {
      setForm({ ...form, imageData: '', imageName: '' })
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('jpg, png, webp 이미지만 첨부할 수 있습니다.')
      return
    }
    if (file.size > 700 * 1024) {
      setError('현재 MVP에서는 700KB 이하 이미지만 첨부할 수 있습니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((current) => ({ ...current, imageData: String(reader.result), imageName: file.name }))
    reader.readAsDataURL(file)
  }
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (selectedRoundBlocked) return setError('이미 제출했거나 승인된 회차입니다. 반려된 회차만 다시 제출할 수 있습니다.')
    const linkError = validateProofLink(challenge.platformType, form.linkUrl)
    if (linkError) return setError(linkError)
    if (form.description.trim().length < 10) return setError('인증 설명은 10자 이상 입력해주세요.')
    const result = await submitProof(challenge.id, form)
    if (!result.ok) setError(result.message)
  }
  return (
    <form className="submit-card" onSubmit={submit}>
      <h2>{challenge.title}</h2>
      <label>미션 회차<select value={form.missionRound} onChange={(e) => setForm({ ...form, missionRound: e.target.value })}>{Array.from({ length: Number(challenge.totalMissionCount) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}회차</option>)}</select></label>
      {selectedRoundBlocked && <div className="warning-box"><AlertTriangle size={16} /> 선택한 회차는 이미 제출했거나 승인됐습니다.</div>}
      <label>{proofLabel}<input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder={proofPlaceholder(challenge.platformType)} /><span className="subtext">{platformHostHints[challenge.platformType || 'blog']}</span></label>
      <label>인증 설명<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="제출한 콘텐츠와 수행 내용을 간단히 적어주세요." /></label>
      <label>인증 사진 선택
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleImage(e.target.files?.[0])} />
        <span className="subtext">선택 사항입니다. SQLite 저장 안정성을 위해 700KB 이하 이미지만 허용합니다.</span>
      </label>
      {form.imageData && (
        <div className="image-preview">
          <img src={form.imageData} alt={form.imageName || '인증 이미지 미리보기'} />
          <div>
            <strong>{form.imageName}</strong>
            <button type="button" className="text-button" onClick={() => setForm({ ...form, imageData: '', imageName: '' })}>이미지 제거</button>
          </div>
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
      <button className="primary-button" type="submit">인증 제출</button>
    </form>
  )
}

function MySubmissions({ store, user, setSelectedChallengeId, setPage }) {
  const mine = store.submissions.filter((item) => item.userId === user.id)
  return (
    <section className="participant-stack">
      {mine.map((submission) => {
        const challenge = store.challenges.find((item) => item.id === submission.challengeId)
        return (
          <article className="submission-card" key={submission.id}>
            <div className="card-top"><strong>{submission.missionRound}회차</strong><StatusBadge status={submission.status} /></div>
            <h3>{challenge?.title}</h3>
            <a href={submission.linkUrl} target="_blank" rel="noreferrer">{submission.linkUrl}</a>
            <p>{submission.description}</p>
            {submission.imageData && <img className="submission-image" src={submission.imageData} alt={submission.imageName || '인증 이미지'} />}
            {submission.status === 'rejected' && <div className="reject-box">{submission.rejectReason} {submission.rejectDetail}</div>}
            <span className="subtext">제출 {formatDateTime(submission.submittedAt)} / 심사 {formatDateTime(submission.reviewedAt)}</span>
            {submission.status === 'rejected' && <button className="ghost-button" onClick={() => { setSelectedChallengeId(submission.challengeId); setPage('submit') }}>재제출</button>}
          </article>
        )
      })}
      {!mine.length && <Empty text="제출한 인증이 없습니다." />}
    </section>
  )
}

function Metric({ icon, label, value, tone }) {
  return (
    <div className={`metric ${tone || ''}`}>
      {icon && <span>{icon}</span>}
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  )
}

function Panel({ title, children }) {
  return <section className="panel"><div className="panel-header"><h2>{title}</h2></div>{children}</section>
}

function FormSection({ title, children }) {
  return <section className="form-section"><h2>{title}</h2>{children}</section>
}

function Empty({ text }) {
  return <div className="empty-state"><FileText size={28} /><p>{text}</p></div>
}

function PlatformBadge({ type = 'blog' }) {
  return <span className={`platform-badge ${type}`}>{platformTypes[type] || platformTypes.blog}</span>
}

function StatusBadge({ status, billing = false, payout = false }) {
  const key = status === 'paid' ? 'paid' : status
  const labelKey = payout && status === 'paid' ? 'paidPayout' : payout && status === 'pending' ? 'payoutPending' : status === 'paid' && billing ? 'paidBilling' : status
  return <span className={`status-badge ${key}`}>{statusLabels[labelKey] || status}</span>
}

function CompactTable({ columns, rows, empty }) {
  if (!rows.length) return <Empty text={empty} />
  return (
    <table className="compact-table">
      <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
    </table>
  )
}

function RejectModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState(rejectReasons[0])
  const [detail, setDetail] = useState('')
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>인증 반려</h2>
        <p>반려 사유는 참가자에게 표시됩니다.</p>
        <label>반려 사유<select value={reason} onChange={(e) => setReason(e.target.value)}>{rejectReasons.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>상세 사유<textarea value={detail} onChange={(e) => setDetail(e.target.value)} /></label>
        <div className="modal-actions">
          <button onClick={onClose}>취소</button>
          <button className="danger-button" onClick={() => onSubmit(reason, detail)}>반려 확정</button>
        </div>
      </div>
    </div>
  )
}

function Progress({ current, target }) {
  const percent = Math.min(100, Math.round((current / target) * 100))
  return (
    <div className="progress-block">
      <div className="progress-label"><span>승인 {current} / 필요 {target}</span><strong>{percent}%</strong></div>
      <div className="progress"><span style={{ width: `${percent}%` }} /></div>
    </div>
  )
}

function createChallengeDraft(platformType = 'blog') {
  const template = challengeTemplates[platformType] || challengeTemplates.blog
  return {
    platformType,
    title: template.title,
    description: template.description,
    recruitmentStartAt: addDays(0),
    recruitmentEndAt: addDays(7),
    challengeStartAt: addDays(8),
    challengeEndAt: addDays(15),
    entryFeeDisplay: 30000,
    totalMissionCount: 7,
    requiredApprovalCount: 5,
    maxParticipants: 100,
    verificationGuide: template.verificationGuide,
    refundGuide: '환불은 운영자 안내에 따릅니다.',
    status: 'draft',
    clientName: '',
    clientType: 'instructor',
    billingMemo: '',
    expectedBillingAmount: 0,
    billingStatus: 'not_billable',
  }
}

function validateChallenge(form) {
  if (!platformTypes[form.platformType || 'blog']) return '플랫폼을 선택해주세요.'
  if (form.title.trim().length < 2 || form.title.trim().length > 80) return '제목은 2자 이상 80자 이하로 입력해주세요.'
  if (form.description.trim().length < 20) return '설명은 20자 이상 입력해주세요.'
  if (!(form.recruitmentStartAt < form.recruitmentEndAt && form.recruitmentEndAt <= form.challengeStartAt && form.challengeStartAt < form.challengeEndAt)) return '기간 순서를 확인해주세요.'
  if (Number(form.totalMissionCount) < 1 || Number(form.totalMissionCount) > 100) return '전체 미션 수는 1 이상 100 이하입니다.'
  if (Number(form.requiredApprovalCount) < 1 || Number(form.requiredApprovalCount) > Number(form.totalMissionCount)) return '성공 필요 승인 수는 전체 미션 수 이하로 입력해주세요.'
  if (Number(form.maxParticipants) < 1 || Number(form.maxParticipants) > 10000) return '최대 참가자 수는 1 이상 10,000 이하입니다.'
  return ''
}

function normalizeChallengeForm(form) {
  return {
    platformType: form.platformType || 'blog',
    title: form.title.trim(),
    description: form.description.trim(),
    recruitmentStartAt: form.recruitmentStartAt,
    recruitmentEndAt: form.recruitmentEndAt,
    challengeStartAt: form.challengeStartAt,
    challengeEndAt: form.challengeEndAt,
    entryFeeDisplay: Number(form.entryFeeDisplay),
    totalMissionCount: Number(form.totalMissionCount),
    requiredApprovalCount: Number(form.requiredApprovalCount),
    maxParticipants: Number(form.maxParticipants),
    verificationGuide: form.verificationGuide.trim(),
    refundGuide: form.refundGuide.trim(),
    status: form.status,
    clientName: form.clientName?.trim() || '',
    clientType: form.clientType || 'other',
    billingMemo: form.billingMemo?.trim() || '',
    expectedBillingAmount: Number(form.expectedBillingAmount || 0),
    billingStatus: form.billingStatus || 'not_billable',
  }
}

function proofPlaceholder(platformType = 'blog') {
  if (platformType === 'youtube') return 'https://www.youtube.com/watch?v=...'
  if (platformType === 'tiktok') return 'https://www.tiktok.com/@user/video/...'
  return 'https://blog...'
}

function validateProofLink(platformType = 'blog', rawUrl = '') {
  const allowedHosts = {
    blog: ['blog.naver.com', 'm.blog.naver.com', 'tistory.com', 'brunch.co.kr', 'medium.com', 'velog.io', 'wordpress.com', 'blogspot.com'],
    youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
    tiktok: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vt.tiktok.com'],
  }
  const value = rawUrl.trim()
  if (!value) return '인증 링크를 입력해 주세요.'
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return '인증 링크 형식이 올바르지 않습니다.'
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return 'http 또는 https 링크만 제출할 수 있습니다.'
  const host = parsed.hostname.toLowerCase()
  const allowed = allowedHosts[platformType] || allowedHosts.blog
  const matched = allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))
  if (!matched) return `${platformTypes[platformType] || '해당 플랫폼'} 챌린지에 맞는 링크를 제출해 주세요.`
  return ''
}

function calculateResults(store) {
  const map = {}
  store.challenges.forEach((challenge) => {
    const participants = store.participants.filter((item) => item.challengeId === challenge.id && item.paymentStatus === 'paid' && item.participationStatus === 'confirmed')
    const rows = participants.map((participant) => {
      const approved = store.submissions
        .filter((submission) => submission.participantId === participant.id && submission.status === 'approved')
        .sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt))
      const rounds = new Map()
      approved.forEach((submission) => {
        if (!rounds.has(submission.missionRound)) rounds.set(submission.missionRound, submission)
      })
      const approvedRoundCount = rounds.size
      const lastApprovedAt = approved.length ? approved.map((item) => item.reviewedAt).sort().at(-1) : null
      const successStatus = ['draft', 'recruiting', 'active'].includes(challenge.status)
        ? 'in_progress'
        : approvedRoundCount >= challenge.requiredApprovalCount ? 'success' : 'failed'
      return { participant, approvedRoundCount, lastApprovedAt, successStatus }
    })
    rows
      .sort((a, b) => {
        if (b.approvedRoundCount !== a.approvedRoundCount) return b.approvedRoundCount - a.approvedRoundCount
        if ((a.lastApprovedAt || '9999') !== (b.lastApprovedAt || '9999')) return String(a.lastApprovedAt || '9999').localeCompare(String(b.lastApprovedAt || '9999'))
        return String(a.participant.joinedAt).localeCompare(String(b.participant.joinedAt))
      })
      .forEach((row, index) => {
        map[row.participant.id] = { approvedRoundCount: row.approvedRoundCount, finalRank: index + 1, successStatus: row.successStatus, lastApprovedAt: row.lastApprovedAt }
      })
  })
  return map
}

export default App

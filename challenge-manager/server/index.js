import cors from 'cors'
import express from 'express'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'data')
mkdirSync(dataDir, { recursive: true })
const localConfigPath = join(__dirname, 'local.config.json')

const db = new DatabaseSync(join(dataDir, 'challenge-manager.sqlite'))
const app = express()
const port = Number(process.env.PORT || 4173)

app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

const now = () => new Date().toISOString()
const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
const token = () => randomBytes(32).toString('hex')
const currencyAmount = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`

function readLocalConfig() {
  if (!existsSync(localConfigPath)) return {}
  try {
    return JSON.parse(readFileSync(localConfigPath, 'utf8'))
  } catch {
    return {}
  }
}

const localConfig = readLocalConfig()
const notificationConfig = {
  baseUrl: String(localConfig.notifications?.baseUrl || process.env.NOTIFICATION_API_BASE_URL || '').trim(),
  serviceCode: String(localConfig.notifications?.serviceCode || process.env.NOTIFICATION_SERVICE_CODE || '').trim(),
  serviceKey: String(localConfig.notifications?.serviceKey || process.env.NOTIFICATION_SERVICE_KEY || '').trim(),
  defaultFromEmail: String(localConfig.notifications?.defaultFromEmail || process.env.NOTIFICATION_FROM_EMAIL || '').trim(),
  enabledChannels: {
    sms: Boolean(localConfig.notifications?.enabledChannels?.sms ?? true),
    email: Boolean(localConfig.notifications?.enabledChannels?.email ?? true),
  },
}

const platformHosts = {
  blog: ['blog.naver.com', 'm.blog.naver.com', 'tistory.com', 'brunch.co.kr', 'medium.com', 'velog.io', 'wordpress.com', 'blogspot.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vt.tiktok.com'],
}

function validateProofUrl(platformType, rawUrl) {
  const value = String(rawUrl || '').trim()
  if (!value) return '인증 링크를 입력해 주세요.'
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return '인증 링크 형식이 올바르지 않습니다.'
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return 'http 또는 https 링크만 제출할 수 있습니다.'
  const host = parsed.hostname.toLowerCase()
  const allowed = platformHosts[platformType || 'blog'] || platformHosts.blog
  const matched = allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))
  if (!matched) {
    const platformLabel = { blog: '블로그', youtube: '유튜브', tiktok: '틱톡' }[platformType] || '해당 플랫폼'
    return `${platformLabel} 챌린지에 맞는 링크를 제출해 주세요.`
  }
  return ''
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password, stored) {
  if (!stored) return false
  if (!stored.startsWith('scrypt$')) return String(password) === stored
  const [, salt, hash] = stored.split('$')
  const candidate = scryptSync(String(password), salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return expected.length === candidate.length && timingSafeEqual(expected, candidate)
}

function isLegacyPassword(stored) {
  return stored && !stored.startsWith('scrypt$')
}

const addDays = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      platform_type TEXT NOT NULL DEFAULT 'blog',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      recruitment_start_at TEXT NOT NULL,
      recruitment_end_at TEXT NOT NULL,
      challenge_start_at TEXT NOT NULL,
      challenge_end_at TEXT NOT NULL,
      entry_fee_display INTEGER NOT NULL,
      total_mission_count INTEGER NOT NULL,
      required_approval_count INTEGER NOT NULL,
      max_participants INTEGER NOT NULL,
      verification_guide TEXT NOT NULL,
      refund_guide TEXT NOT NULL,
      status TEXT NOT NULL,
      client_name TEXT,
      client_type TEXT,
      billing_memo TEXT,
      expected_billing_amount INTEGER,
      billing_status TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      challenge_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      participation_status TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      confirmed_at TEXT,
      approved_round_count INTEGER NOT NULL DEFAULT 0,
      final_rank INTEGER,
      success_status TEXT NOT NULL,
      payout_amount INTEGER NOT NULL DEFAULT 0,
      payout_status TEXT NOT NULL DEFAULT 'not_eligible',
      payout_memo TEXT,
      paid_out_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(challenge_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      challenge_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      mission_round INTEGER NOT NULL,
      link_url TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      reviewed_by TEXT,
      reviewed_at TEXT,
      reject_reason TEXT,
      reject_detail TEXT,
      image_data TEXT,
      image_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      before_value TEXT,
      after_value TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      challenge_id TEXT,
      participant_id TEXT,
      user_id TEXT,
      channel TEXT NOT NULL,
      template_code TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT,
      message_text TEXT,
      status TEXT NOT NULL,
      response_payload TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT NOT NULL
    );
  `)

  const participantColumns = db.prepare('PRAGMA table_info(participants)').all().map((column) => column.name)
  const addParticipantColumn = (name, ddl) => {
    if (!participantColumns.includes(name)) db.exec(`ALTER TABLE participants ADD COLUMN ${ddl}`)
  }
  addParticipantColumn('payout_amount', "payout_amount INTEGER NOT NULL DEFAULT 0")
  addParticipantColumn('payout_status', "payout_status TEXT NOT NULL DEFAULT 'not_eligible'")
  addParticipantColumn('payout_memo', 'payout_memo TEXT')
  addParticipantColumn('paid_out_at', 'paid_out_at TEXT')

  const challengeColumns = db.prepare('PRAGMA table_info(challenges)').all().map((column) => column.name)
  if (!challengeColumns.includes('platform_type')) {
    db.exec("ALTER TABLE challenges ADD COLUMN platform_type TEXT NOT NULL DEFAULT 'blog'")
  }
}

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
  if (count > 0) return

  const createdAt = now()
  db.prepare(`
    INSERT INTO users (id, name, email, password, phone, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('u_admin', '운영 관리자', 'admin@challenge.local', hashPassword('admin1234'), '010-0000-0000', 'admin', 'active', createdAt, createdAt)

  db.prepare(`
    INSERT INTO users (id, name, email, password, phone, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('u_participant', '김참가', 'user@challenge.local', hashPassword('user1234'), '010-1111-2222', 'participant', 'active', createdAt, createdAt)

  db.prepare(`
    INSERT INTO challenges (
      id, platform_type, title, description, recruitment_start_at, recruitment_end_at, challenge_start_at, challenge_end_at,
      entry_fee_display, total_mission_count, required_approval_count, max_participants, verification_guide,
      refund_guide, status, client_name, client_type, billing_memo, expected_billing_amount, billing_status,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'c_blog_7',
    'blog',
    '7일 블로그 글쓰기 챌린지',
    '매일 하나의 블로그 글을 작성하고 링크와 사진으로 인증하는 기본 챌린지입니다.',
    addDays(-3),
    addDays(4),
    addDays(-1),
    addDays(8),
    30000,
    7,
    5,
    100,
    '회차별로 발행한 블로그 글 링크와 간단한 인증 설명을 제출해주세요.',
    'MVP에서는 실제 환불을 처리하지 않으며 운영자가 별도 안내합니다.',
    'active',
    'A교육원',
    'instructor',
    '베타 운영 고객. 첫 회차 할인 적용.',
    99000,
    'planned',
    'u_admin',
    createdAt,
    createdAt,
  )

  db.prepare(`
    INSERT INTO participants (
      id, challenge_id, user_id, payment_status, participation_status, joined_at, confirmed_at,
      approved_round_count, final_rank, success_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('p_seed_user', 'c_blog_7', 'u_participant', 'paid', 'confirmed', createdAt, createdAt, 1, 1, 'in_progress', createdAt, createdAt)

  const insertSubmission = db.prepare(`
    INSERT INTO submissions (
      id, challenge_id, participant_id, user_id, mission_round, link_url, description, status,
      submitted_at, reviewed_by, reviewed_at, reject_reason, reject_detail, image_data, image_name,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertSubmission.run('s_seed_1', 'c_blog_7', 'p_seed_user', 'u_participant', 1, 'https://example.com/blog/challenge-day-1', '1회차 블로그 글 작성 인증입니다.', 'approved', createdAt, 'u_admin', createdAt, '', '', '', '', createdAt, createdAt)
  insertSubmission.run('s_seed_2', 'c_blog_7', 'p_seed_user', 'u_participant', 2, 'https://example.com/blog/challenge-day-2', '2회차 블로그 글 작성 인증입니다. 관리자 검토 대기 상태입니다.', 'pending', createdAt, null, null, '', '', '', '', createdAt, createdAt)
}

const asJson = (value) => (value == null ? null : JSON.stringify(value))
const parseJson = (value) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const userFrom = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const challengeFrom = (row) => ({
  id: row.id,
  platformType: row.platform_type || 'blog',
  title: row.title,
  description: row.description,
  recruitmentStartAt: row.recruitment_start_at,
  recruitmentEndAt: row.recruitment_end_at,
  challengeStartAt: row.challenge_start_at,
  challengeEndAt: row.challenge_end_at,
  entryFeeDisplay: row.entry_fee_display,
  totalMissionCount: row.total_mission_count,
  requiredApprovalCount: row.required_approval_count,
  maxParticipants: row.max_participants,
  verificationGuide: row.verification_guide,
  refundGuide: row.refund_guide,
  status: row.status,
  clientName: row.client_name || '',
  clientType: row.client_type || 'other',
  billingMemo: row.billing_memo || '',
  expectedBillingAmount: row.expected_billing_amount || 0,
  billingStatus: row.billing_status,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const participantFrom = (row) => ({
  id: row.id,
  challengeId: row.challenge_id,
  userId: row.user_id,
  paymentStatus: row.payment_status,
  participationStatus: row.participation_status,
  joinedAt: row.joined_at,
  confirmedAt: row.confirmed_at,
  approvedRoundCount: row.approved_round_count,
  finalRank: row.final_rank,
  successStatus: row.success_status,
  payoutAmount: row.payout_amount || 0,
  payoutStatus: row.payout_status || 'not_eligible',
  payoutMemo: row.payout_memo || '',
  paidOutAt: row.paid_out_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const submissionFrom = (row) => ({
  id: row.id,
  challengeId: row.challenge_id,
  participantId: row.participant_id,
  userId: row.user_id,
  missionRound: row.mission_round,
  linkUrl: row.link_url,
  description: row.description,
  status: row.status,
  submittedAt: row.submitted_at,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  rejectReason: row.reject_reason || '',
  rejectDetail: row.reject_detail || '',
  imageData: row.image_data || '',
  imageName: row.image_name || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const auditFrom = (row) => ({
  id: row.id,
  actorId: row.actor_id,
  actorName: row.actor_name,
  actionType: row.action_type,
  targetType: row.target_type,
  targetId: row.target_id,
  beforeValue: parseJson(row.before_value),
  afterValue: parseJson(row.after_value),
  ipAddress: row.ip_address,
  createdAt: row.created_at,
})

const notificationLogFrom = (row) => ({
  id: row.id,
  challengeId: row.challenge_id,
  participantId: row.participant_id,
  userId: row.user_id,
  channel: row.channel,
  templateCode: row.template_code,
  recipient: row.recipient,
  subject: row.subject || '',
  messageText: row.message_text || '',
  status: row.status,
  responsePayload: parseJson(row.response_payload),
  errorMessage: row.error_message || '',
  createdAt: row.created_at,
})

function getStore() {
  return {
    users: db.prepare('SELECT * FROM users ORDER BY created_at ASC').all().map(userFrom),
    challenges: db.prepare('SELECT * FROM challenges ORDER BY created_at DESC').all().map(challengeFrom),
    participants: db.prepare('SELECT * FROM participants ORDER BY joined_at DESC').all().map(participantFrom),
    submissions: db.prepare('SELECT * FROM submissions ORDER BY submitted_at DESC').all().map(submissionFrom),
    auditLogs: db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500').all().map(auditFrom),
    notificationLogs: db.prepare('SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 200').all().map(notificationLogFrom),
    notificationConfig: {
      enabled: Boolean(notificationConfig.baseUrl && notificationConfig.serviceKey),
      serviceCode: notificationConfig.serviceCode,
      baseUrl: notificationConfig.baseUrl,
      channels: notificationConfig.enabledChannels,
      defaultFromEmail: notificationConfig.defaultFromEmail,
    },
  }
}

function tokenFromRequest(req) {
  const header = req.header('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return ''
  return header.slice(7).trim()
}

function actor(req) {
  const authToken = tokenFromRequest(req)
  if (!authToken) return { id: 'system', name: 'system' }
  const row = db.prepare(`
    SELECT users.* FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
  `).get(authToken)
  if (!row) return { id: 'system', name: 'system' }
  db.prepare('UPDATE sessions SET last_used_at = ? WHERE token = ?').run(now(), authToken)
  return userFrom(row)
}

function createSession(userId) {
  const sessionToken = token()
  db.prepare('INSERT INTO sessions (token, user_id, created_at, last_used_at) VALUES (?, ?, ?, ?)').run(sessionToken, userId, now(), now())
  return sessionToken
}

function requireSession(req, res) {
  const user = actor(req)
  if (!user.id || user.id === 'system') {
    res.status(401).json({ error: '로그인이 필요합니다.' })
    return null
  }
  return user
}

function audit(req, actionType, targetType, targetId, beforeValue, afterValue) {
  const user = actor(req)
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, action_type, target_type, target_id, before_value, after_value, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uid('log'), user.id, user.name, actionType, targetType, targetId, asJson(beforeValue), asJson(afterValue), req.ip || 'local', now())
}

function requireAdmin(req, res, next) {
  const user = actor(req)
  if (user.role !== 'admin') return res.status(403).json({ error: '관리자 권한이 필요합니다.' })
  next()
}

function logNotification({ challengeId = null, participantId = null, userId = null, channel, templateCode, recipient, subject = '', messageText = '', status, responsePayload = null, errorMessage = '' }) {
  db.prepare(`
    INSERT INTO notification_logs (
      id, challenge_id, participant_id, user_id, channel, template_code, recipient, subject, message_text,
      status, response_payload, error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uid('ntf'), challengeId, participantId, userId, channel, templateCode, recipient, subject, messageText, status, asJson(responsePayload), errorMessage, now())
}

async function postNotification(path, body) {
  const response = await fetch(`${notificationConfig.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': notificationConfig.serviceKey,
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errorMessage || payload.message || `알림 발송 실패 (${response.status})`)
  }
  return payload
}

async function sendSmsNotification({ challengeId = null, participantId = null, userId = null, templateCode, to, text }) {
  if (!notificationConfig.enabledChannels.sms || !notificationConfig.baseUrl || !notificationConfig.serviceKey || !to || !text) return
  try {
    const payload = await postNotification('/api/v1/messages/sms/send', {
      requestId: uid('sms'),
      to,
      text,
    })
    logNotification({ challengeId, participantId, userId, channel: 'sms', templateCode, recipient: to, messageText: text, status: 'sent', responsePayload: payload })
  } catch (error) {
    logNotification({ challengeId, participantId, userId, channel: 'sms', templateCode, recipient: to, messageText: text, status: 'failed', errorMessage: error.message })
  }
}

async function sendEmailNotification({ challengeId = null, participantId = null, userId = null, templateCode, to, subject, text, html = '' }) {
  if (!notificationConfig.enabledChannels.email || !notificationConfig.baseUrl || !notificationConfig.serviceKey || !to || !subject || !(text || html)) return
  try {
    const payload = await postNotification('/api/v1/messages/email/send', {
      requestId: uid('email'),
      to,
      subject,
      text,
      ...(html ? { html } : {}),
      ...(notificationConfig.defaultFromEmail ? { from: notificationConfig.defaultFromEmail } : {}),
    })
    logNotification({ challengeId, participantId, userId, channel: 'email', templateCode, recipient: to, subject, messageText: text, status: 'sent', responsePayload: payload })
  } catch (error) {
    logNotification({ challengeId, participantId, userId, channel: 'email', templateCode, recipient: to, subject, messageText: text, status: 'failed', errorMessage: error.message })
  }
}

async function notifyParticipant(user, participant, challenge, templateCode, smsText, emailSubject, emailText) {
  if (!user) return
  await Promise.all([
    sendSmsNotification({ challengeId: challenge?.id || null, participantId: participant?.id || null, userId: user.id, templateCode, to: user.phone, text: smsText }),
    sendEmailNotification({ challengeId: challenge?.id || null, participantId: participant?.id || null, userId: user.id, templateCode, to: user.email, subject: emailSubject, text: emailText }),
  ])
}

function calculateResults(challengeId) {
  const challenge = challengeFrom(db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId))
  const baseSuccessStatus = ['draft', 'recruiting', 'active'].includes(challenge.status) ? 'in_progress' : 'failed'
  db.prepare(`
    UPDATE participants
    SET approved_round_count = 0,
        final_rank = NULL,
        success_status = ?,
        payout_amount = 0,
        payout_status = 'not_eligible',
        paid_out_at = NULL,
        updated_at = ?
    WHERE challenge_id = ?
  `).run(baseSuccessStatus, now(), challengeId)

  const participants = db.prepare(`
    SELECT * FROM participants
    WHERE challenge_id = ? AND payment_status = 'paid' AND participation_status = 'confirmed'
  `).all(challengeId).map(participantFrom)

  const rows = participants.map((participant) => {
    const approved = db.prepare(`
      SELECT * FROM submissions
      WHERE participant_id = ? AND status = 'approved'
      ORDER BY reviewed_at DESC
    `).all(participant.id).map(submissionFrom)
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
      const payoutAmount = row.successStatus === 'success' ? challenge.entryFeeDisplay : 0
      const current = db.prepare('SELECT payout_status FROM participants WHERE id = ?').get(row.participant.id)
      const payoutStatus = row.successStatus === 'success'
        ? (['paid', 'hold'].includes(current?.payout_status) ? current.payout_status : 'pending')
        : 'not_eligible'
      db.prepare(`
        UPDATE participants
        SET approved_round_count = ?, final_rank = ?, success_status = ?, payout_amount = ?, payout_status = ?, updated_at = ?
        WHERE id = ?
      `).run(row.approvedRoundCount, index + 1, row.successStatus, payoutAmount, payoutStatus, now(), row.participant.id)
    })
}

function normalizeChallenge(body) {
  return {
    platformType: ['blog', 'youtube', 'tiktok'].includes(body.platformType) ? body.platformType : 'blog',
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    recruitmentStartAt: body.recruitmentStartAt,
    recruitmentEndAt: body.recruitmentEndAt,
    challengeStartAt: body.challengeStartAt,
    challengeEndAt: body.challengeEndAt,
    entryFeeDisplay: Number(body.entryFeeDisplay || 0),
    totalMissionCount: Number(body.totalMissionCount || 1),
    requiredApprovalCount: Number(body.requiredApprovalCount || 1),
    maxParticipants: Number(body.maxParticipants || 1),
    verificationGuide: String(body.verificationGuide || '').trim(),
    refundGuide: String(body.refundGuide || '').trim(),
    status: body.status || 'draft',
    clientName: String(body.clientName || '').trim(),
    clientType: body.clientType || 'other',
    billingMemo: String(body.billingMemo || '').trim(),
    expectedBillingAmount: Number(body.expectedBillingAmount || 0),
    billingStatus: body.billingStatus || 'not_billable',
  }
}

function sendStore(res) {
  res.json({ store: getStore() })
}

initSchema()
seed()

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/api/bootstrap', (req, res) => {
  sendStore(res)
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim())
  if (!row || !verifyPassword(password, row.password)) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
  if (isLegacyPassword(row.password)) {
    db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(hashPassword(password), now(), row.id)
  }
  res.json({ user: userFrom(row), token: createSession(row.id), store: getStore() })
})

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body
  const id = uid('u')
  try {
    db.prepare(`
      INSERT INTO users (id, name, email, password, phone, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, String(name || '').trim(), String(email || '').trim(), hashPassword(password || ''), String(phone || '').trim(), 'participant', 'active', now(), now())
    const user = userFrom(db.prepare('SELECT * FROM users WHERE id = ?').get(id))
    res.json({ user, token: createSession(id), store: getStore() })
  } catch {
    res.status(409).json({ error: '이미 가입된 이메일입니다.' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  const sessionToken = tokenFromRequest(req)
  if (sessionToken) db.prepare('DELETE FROM sessions WHERE token = ?').run(sessionToken)
  res.json({ ok: true })
})

app.post('/api/admin/challenges', requireAdmin, (req, res) => {
  const form = normalizeChallenge(req.body)
  const id = uid('c')
  db.prepare(`
    INSERT INTO challenges (
      id, platform_type, title, description, recruitment_start_at, recruitment_end_at, challenge_start_at, challenge_end_at,
      entry_fee_display, total_mission_count, required_approval_count, max_participants, verification_guide,
      refund_guide, status, client_name, client_type, billing_memo, expected_billing_amount, billing_status,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, form.platformType, form.title, form.description, form.recruitmentStartAt, form.recruitmentEndAt, form.challengeStartAt, form.challengeEndAt,
    form.entryFeeDisplay, form.totalMissionCount, form.requiredApprovalCount, form.maxParticipants, form.verificationGuide,
    form.refundGuide, form.status, form.clientName, form.clientType, form.billingMemo, form.expectedBillingAmount, form.billingStatus,
    actor(req).id, now(), now(),
  )
  audit(req, 'challenge.create', 'challenge', id, null, form)
  sendStore(res)
})

app.patch('/api/admin/challenges/:id', requireAdmin, (req, res) => {
  const before = challengeFrom(db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id))
  const form = normalizeChallenge(req.body)
  db.prepare(`
    UPDATE challenges SET
      platform_type = ?, title = ?, description = ?, recruitment_start_at = ?, recruitment_end_at = ?, challenge_start_at = ?,
      challenge_end_at = ?, entry_fee_display = ?, total_mission_count = ?, required_approval_count = ?,
      max_participants = ?, verification_guide = ?, refund_guide = ?, status = ?, client_name = ?,
      client_type = ?, billing_memo = ?, expected_billing_amount = ?, billing_status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    form.platformType, form.title, form.description, form.recruitmentStartAt, form.recruitmentEndAt, form.challengeStartAt,
    form.challengeEndAt, form.entryFeeDisplay, form.totalMissionCount, form.requiredApprovalCount,
    form.maxParticipants, form.verificationGuide, form.refundGuide, form.status, form.clientName,
    form.clientType, form.billingMemo, form.expectedBillingAmount, form.billingStatus, now(), req.params.id,
  )
  audit(req, 'challenge.update', 'challenge', req.params.id, before, form)
  sendStore(res)
})

app.patch('/api/admin/challenges/:id/status', requireAdmin, (req, res) => {
  const before = challengeFrom(db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id))
  db.prepare('UPDATE challenges SET status = ?, updated_at = ? WHERE id = ?').run(req.body.status, now(), req.params.id)
  audit(req, 'challenge.status', 'challenge', req.params.id, { status: before.status }, { status: req.body.status })
  sendStore(res)
})

app.patch('/api/admin/challenges/:id/billing', requireAdmin, (req, res) => {
  const before = challengeFrom(db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id))
  db.prepare(`
    UPDATE challenges SET billing_status = ?, billing_memo = ?, expected_billing_amount = ?, updated_at = ?
    WHERE id = ?
  `).run(
    req.body.billingStatus ?? before.billingStatus,
    req.body.billingMemo ?? before.billingMemo,
    req.body.expectedBillingAmount ?? before.expectedBillingAmount,
    now(),
    req.params.id,
  )
  audit(req, 'challenge.billing', 'challenge', req.params.id, {
    billingStatus: before.billingStatus,
    billingMemo: before.billingMemo,
    expectedBillingAmount: before.expectedBillingAmount,
  }, req.body)
  sendStore(res)
})

app.post('/api/challenges/:id/join', (req, res) => {
  const user = requireSession(req, res)
  if (!user) return
  const challenge = challengeFrom(db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id))
  if (challenge.status !== 'recruiting') return res.status(400).json({ error: '모집 중인 챌린지만 신청할 수 있습니다.' })
  const currentCount = db.prepare("SELECT COUNT(*) AS count FROM participants WHERE challenge_id = ? AND participation_status != 'canceled'").get(req.params.id).count
  if (currentCount >= challenge.maxParticipants) return res.status(400).json({ error: '최대 참가자 수에 도달했습니다.' })
  const id = uid('p')
  try {
    db.prepare(`
      INSERT INTO participants (
        id, challenge_id, user_id, payment_status, participation_status, joined_at, confirmed_at,
        approved_round_count, final_rank, success_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, user.id, 'pending', 'applied', now(), null, 0, null, 'in_progress', now(), now())
    sendStore(res)
  } catch {
    res.status(409).json({ error: '이미 신청한 챌린지입니다.' })
  }
})

app.patch('/api/admin/participants/:id', requireAdmin, (req, res) => {
  const before = participantFrom(db.prepare('SELECT * FROM participants WHERE id = ?').get(req.params.id))
  const challenge = challengeFrom(db.prepare('SELECT * FROM challenges WHERE id = ?').get(before.challengeId))
  const user = userFrom(db.prepare('SELECT * FROM users WHERE id = ?').get(before.userId))
  let participationStatus = req.body.participationStatus ?? before.participationStatus
  let confirmedAt = before.confirmedAt
  if (req.body.paymentStatus === 'paid') {
    participationStatus = 'confirmed'
    confirmedAt = now()
  }
  if (req.body.paymentStatus === 'refunded' || req.body.paymentStatus === 'canceled') {
    participationStatus = 'canceled'
  }
  db.prepare(`
    UPDATE participants SET payment_status = ?, participation_status = ?, confirmed_at = ?, updated_at = ?
    WHERE id = ?
  `).run(req.body.paymentStatus ?? before.paymentStatus, participationStatus, confirmedAt, now(), req.params.id)
  calculateResults(before.challengeId)
  audit(req, 'participant.update', 'participant', req.params.id, before, req.body)
  if (before.paymentStatus !== 'paid' && req.body.paymentStatus === 'paid') {
    notifyParticipant(
      user,
      before,
      challenge,
      'payment_confirmed',
      `[${challenge.title}] 참가 확정 및 결제 완료 처리되었습니다.`,
      `[챌린지 매니저] ${challenge.title} 참가 확정`,
      `${user.name}님, ${challenge.title} 챌린지의 결제가 확인되어 참가가 확정되었습니다.`,
    ).catch(() => {})
  }
  sendStore(res)
})

app.patch('/api/admin/participants/:id/payout', requireAdmin, (req, res) => {
  const beforeRow = db.prepare('SELECT * FROM participants WHERE id = ?').get(req.params.id)
  if (!beforeRow) return res.status(404).json({ error: '참가자를 찾을 수 없습니다.' })
  const before = participantFrom(beforeRow)
  const challenge = challengeFrom(db.prepare('SELECT * FROM challenges WHERE id = ?').get(before.challengeId))
  const user = userFrom(db.prepare('SELECT * FROM users WHERE id = ?').get(before.userId))
  const nextStatus = req.body.payoutStatus ?? before.payoutStatus
  const nextPaidOutAt = nextStatus === 'paid' ? (before.paidOutAt || now()) : null
  db.prepare(`
    UPDATE participants
    SET payout_status = ?, payout_amount = ?, payout_memo = ?, paid_out_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    nextStatus,
    Number(req.body.payoutAmount ?? before.payoutAmount ?? 0),
    String(req.body.payoutMemo ?? before.payoutMemo ?? ''),
    nextPaidOutAt,
    now(),
    req.params.id,
  )
  audit(req, 'participant.payout', 'participant', req.params.id, before, req.body)
  if (before.payoutStatus !== 'paid' && nextStatus === 'paid') {
    const payoutAmount = Number(req.body.payoutAmount ?? before.payoutAmount ?? 0)
    notifyParticipant(
      user,
      before,
      challenge,
      'payout_paid',
      `[${challenge.title}] 상금 ${currencyAmount(payoutAmount)} 지급 완료`,
      `[챌린지 매니저] ${challenge.title} 상금 지급 완료`,
      `${user.name}님, ${challenge.title} 챌린지 상금 ${currencyAmount(payoutAmount)} 지급이 완료되었습니다.`,
    ).catch(() => {})
  }
  sendStore(res)
})

app.post('/api/challenges/:id/submissions', (req, res) => {
  const user = requireSession(req, res)
  if (!user) return
  const challenge = challengeFrom(db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id))
  const participantRow = db.prepare('SELECT * FROM participants WHERE challenge_id = ? AND user_id = ?').get(req.params.id, user.id)
  if (!participantRow) return res.status(400).json({ error: '참가 신청 내역이 없습니다.' })
  const participant = participantFrom(participantRow)
  if (participant.paymentStatus !== 'paid' || participant.participationStatus !== 'confirmed') return res.status(400).json({ error: '참가 확정 후 인증을 제출할 수 있습니다.' })
  if (challenge.status !== 'active') return res.status(400).json({ error: '진행 중인 챌린지만 인증을 제출할 수 있습니다.' })
  const currentDate = new Date()
  if (currentDate < new Date(challenge.challengeStartAt) || currentDate > new Date(`${challenge.challengeEndAt}T23:59:59`)) return res.status(400).json({ error: '챌린지 진행 기간에만 제출할 수 있습니다.' })
  const missionRound = Number(req.body.missionRound)
  if (!Number.isInteger(missionRound) || missionRound < 1 || missionRound > challenge.totalMissionCount) return res.status(400).json({ error: '미션 회차를 확인해 주세요.' })
  const linkUrl = String(req.body.linkUrl || '').trim()
  const urlError = validateProofUrl(challenge.platformType, linkUrl)
  if (urlError) return res.status(400).json({ error: urlError })
  const existingRound = db.prepare(`
    SELECT id FROM submissions
    WHERE participant_id = ? AND mission_round = ? AND status IN ('pending', 'approved')
  `).get(participant.id, missionRound)
  if (existingRound) return res.status(409).json({ error: '이미 제출했거나 승인된 회차입니다. 반려된 경우에만 다시 제출할 수 있습니다.' })
  const id = uid('s')
  db.prepare(`
    INSERT INTO submissions (
      id, challenge_id, participant_id, user_id, mission_round, link_url, description, status,
      submitted_at, reviewed_by, reviewed_at, reject_reason, reject_detail, image_data, image_name,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.params.id, participant.id, user.id, missionRound, linkUrl,
    String(req.body.description || '').trim(), 'pending', now(), null, null, '', '', req.body.imageData || '', req.body.imageName || '', now(), now(),
  )
  sendStore(res)
})

app.patch('/api/admin/submissions/:id/review', requireAdmin, (req, res) => {
  const before = submissionFrom(db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id))
  const challenge = challengeFrom(db.prepare('SELECT * FROM challenges WHERE id = ?').get(before.challengeId))
  const participant = participantFrom(db.prepare('SELECT * FROM participants WHERE id = ?').get(before.participantId))
  const user = userFrom(db.prepare('SELECT * FROM users WHERE id = ?').get(before.userId))
  const status = req.body.status
  db.prepare(`
    UPDATE submissions SET status = ?, reviewed_by = ?, reviewed_at = ?, reject_reason = ?, reject_detail = ?, updated_at = ?
    WHERE id = ?
  `).run(status, actor(req).id, now(), status === 'rejected' ? req.body.rejectReason || '' : '', status === 'rejected' ? req.body.rejectDetail || '' : '', now(), req.params.id)
  audit(req, status === 'approved' ? 'submission.approve' : 'submission.reject', 'submission', req.params.id, before, req.body)
  calculateResults(before.challengeId)
  if (status === 'approved') {
    notifyParticipant(
      user,
      participant,
      challenge,
      'submission_approved',
      `[${challenge.title}] ${before.missionRound}회차 인증이 승인되었습니다.`,
      `[챌린지 매니저] ${challenge.title} 인증 승인`,
      `${user.name}님, ${challenge.title} 챌린지 ${before.missionRound}회차 인증이 승인되었습니다.`,
    ).catch(() => {})
  } else if (status === 'rejected') {
    const rejectMessage = [req.body.rejectReason, req.body.rejectDetail].filter(Boolean).join(' / ')
    notifyParticipant(
      user,
      participant,
      challenge,
      'submission_rejected',
      `[${challenge.title}] ${before.missionRound}회차 인증이 반려되었습니다. ${rejectMessage}`.trim(),
      `[챌린지 매니저] ${challenge.title} 인증 반려`,
      `${user.name}님, ${challenge.title} 챌린지 ${before.missionRound}회차 인증이 반려되었습니다. ${rejectMessage}`.trim(),
    ).catch(() => {})
  }
  sendStore(res)
})

app.post('/api/admin/challenges/:id/recalculate-results', requireAdmin, (req, res) => {
  const before = db.prepare('SELECT * FROM participants WHERE challenge_id = ?').all(req.params.id).map(participantFrom)
  calculateResults(req.params.id)
  const after = db.prepare('SELECT * FROM participants WHERE challenge_id = ?').all(req.params.id).map(participantFrom)
  audit(req, 'challenge.recalculate', 'challenge', req.params.id, before, after)
  sendStore(res)
})

app.post('/api/admin/notifications/test', requireAdmin, async (req, res) => {
  const { channel, to, subject, text } = req.body
  if (!['sms', 'email'].includes(channel)) return res.status(400).json({ error: '지원하지 않는 발송 채널입니다.' })
  if (!to || !text) return res.status(400).json({ error: '수신자와 내용은 필수입니다.' })
  if (channel === 'email' && !subject) return res.status(400).json({ error: '이메일 제목은 필수입니다.' })
  try {
    if (channel === 'sms') {
      await sendSmsNotification({ templateCode: 'manual_test_sms', to, text })
    } else {
      await sendEmailNotification({ templateCode: 'manual_test_email', to, subject, text })
    }
    audit(req, 'notification.test_send', 'notification', to, null, { channel, to, subject: subject || '', text })
    sendStore(res)
  } catch (error) {
    res.status(500).json({ error: error.message || '테스트 발송에 실패했습니다.' })
  }
})

app.get('/api/admin/challenges/:id/winners.csv', requireAdmin, (req, res) => {
  const store = getStore()
  const challenge = store.challenges.find((item) => item.id === req.params.id)
  const rows = store.participants
    .filter((item) => item.challengeId === req.params.id)
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
  audit(req, 'challenge.csv_download', 'challenge', req.params.id, null, { rows: rows.length })
  const csv = toCsv(rows)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="challenge-${challenge.id}-winners.csv"`)
  res.send(`\ufeff${csv}`)
})

function toCsv(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  return [headers.join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n')
}

app.use((err, req, res) => {
  console.error(err)
  res.status(500).json({ error: '서버 오류가 발생했습니다.' })
})

app.listen(port, () => {
  console.log(`Challenge Manager API running at http://127.0.0.1:${port}`)
})

import type { FeedbackSession, Member } from '../types'

export const TEAMS = ['기획팀 (Planning Team)', '디자인팀 (Design Team)', '퍼블팀 (Publishing Team)']

// 초기 더미 회원은 빈 배열로 설정 (어드민에서 직접 세션 및 직원을 추가하여 사용)
export const MEMBERS: Member[] = []

// 초기 더미 세션은 빈 배열로 설정
export const initialSessions: FeedbackSession[] = []

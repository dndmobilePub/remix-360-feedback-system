import type { FeedbackSession, Member } from '../types'

export const TEAMS = ['기획팀 (Planning Team)', '디자인팀 (Design Team)', '퍼블팀 (Publishing Team)']

const m = (id: string, name: string, team: string, code: string, first = false): Member => ({
  id, name, team, isAvailable: true, loginCode: code, isFirstLogin: first,
})

// TODO(supabase): 아래 목업 데이터는 Supabase 조회 결과로 교체하세요.
export const MEMBERS: Member[] = [
  m('1', '김철수', TEAMS[0], 'KC1234'),
  m('2', '이영희', TEAMS[0], 'LY5678'),
  m('3', '박지민', TEAMS[1], 'PJ9012'),
  m('4', '최유진', TEAMS[1], 'CY3456'),
  m('5', '오동훈', TEAMS[2], 'DND2025', true),
  m('6', '한소라', TEAMS[2], 'HS7788'),
]

export const initialSessions: FeedbackSession[] = [
  {
    id: 's1', year: '2025', type: '360도 다면 피드백', period: '2025.01.01 - 2025.12.31', code: 'DND2025',
    members: MEMBERS,
    feedbacks: {
      '1': [
        { good: '커뮤니케이션이 명확하고 일정 관리가 꼼꼼합니다.', suggestions: '회의 때 조금 더 적극적으로 의견을 내주면 좋겠어요.', rehire: true, authorHash: '2' },
        { good: '어려운 이슈도 침착하게 정리해 주는 점이 좋았습니다.', suggestions: '문서화를 더 자주 공유해 주세요.', rehire: true, authorHash: '3' },
        { good: '책임감이 강합니다.', suggestions: '피드백 전달 시 톤을 조금 더 부드럽게 해주세요.', rehire: false, authorHash: '4' },
      ],
      '3': [{ good: '디자인 완성도가 높습니다.', suggestions: '리뷰 일정을 미리 공유해 주세요.', rehire: true, authorHash: '1' }],
    },
  },
  {
    id: 's2', year: '2025', type: '인사이트 피드백', period: '2025.01.01 - 2025.12.31', code: 'DND2025',
    members: MEMBERS,
    insights: [
      { content: '프로젝트 진행 중 부서 간 커뮤니케이션 채널이 분산되어 있어 하나로 통합되면 좋겠습니다.', authorHash: '1' },
      { content: '재택/출근 제도를 유연하게 운영해 주시면 집중도가 더 높아질 것 같습니다.', authorHash: '2' },
    ],
  },
  { id: 's3', year: '2024', type: '360도 다면 피드백', period: '2024.01.01 - 2024.12.31', code: 'DND2024', members: MEMBERS.slice(0, 4), feedbacks: {} },
  { id: 's4', year: '2024', type: '인사이트 피드백', period: '2024.01.01 - 2024.12.31', code: 'DND2024', members: MEMBERS.slice(0, 4), insights: [] },
]

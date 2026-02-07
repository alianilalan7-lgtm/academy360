export type { Database, Json } from './database'
import type { Database, Json } from './database'

// Table row types
export type Organization = Database['public']['Tables']['organizations']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Membership = Database['public']['Tables']['memberships']['Row']
export type AthleteProfile = Database['public']['Tables']['athlete_profiles']['Row']
export type CoachProfile = Database['public']['Tables']['coach_profiles']['Row']
export type ParentAthleteRelation = Database['public']['Tables']['parent_athlete_relations']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type Program = Database['public']['Tables']['programs']['Row']
export type ProgramVersion = Database['public']['Tables']['program_versions']['Row']
export type AssignedProgram = Database['public']['Tables']['assigned_programs']['Row']
export type TrainingLog = Database['public']['Tables']['training_logs']['Row']
export type MetricType = Database['public']['Tables']['metric_types']['Row']
export type PerformanceRecord = Database['public']['Tables']['performance_records']['Row']
export type Session = Database['public']['Tables']['sessions']['Row']
export type Attendance = Database['public']['Tables']['attendance']['Row']
export type FeePlan = Database['public']['Tables']['fee_plans']['Row']
export type FeePayment = Database['public']['Tables']['fee_payments']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationRecipient = Database['public']['Tables']['notification_recipients']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type AthleteAchievement = Database['public']['Tables']['athlete_achievements']['Row']
export type AthleteGoal = Database['public']['Tables']['athlete_goals']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type ContentSyncLog = Database['public']['Tables']['content_sync_logs']['Row']

// Phase 2 types (manual until gen types is run)
export type ExerciseCategory = 'warmup' | 'coordination' | 'strength_agility' | 'ball_work' | 'cooldown'
export type ExerciseDifficulty = 'easy' | 'medium' | 'hard'
export type AgeGroup = 'U9' | 'U11' | 'U13' | 'U15' | 'U17' | 'U18' | 'academy'
export type TemplateType = 'technical' | 'tactical' | 'physical' | 'game_based'
export type SeasonType = 'pre_season' | 'in_season' | 'post_season'
export type ScoreCategory = 'technical' | 'physical' | 'behavioral'

export interface Exercise {
  id: string
  organization_id: string | null
  category: ExerciseCategory
  difficulty: ExerciseDifficulty
  order_number: number
  name: string
  description: string | null
  video_url: string | null
  animation_url: string | null
  thumbnail_url: string | null
  repetitions: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  sets: number
  equipment: string[] | null
  instructions: Json | null
  is_system: boolean
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TrainingTemplate {
  id: string
  organization_id: string | null
  age_group: AgeGroup
  template_type: TemplateType
  name: string
  description: string | null
  exercise_ids: string[]
  duration_minutes: number | null
  intensity_level: number | null
  notes: string | null
  is_system: boolean
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ExerciseCompletion {
  id: string
  athlete_id: string
  exercise_id: string
  program_id: string | null
  session_id: string | null
  completed_at: string
  duration_seconds: number | null
  sets_completed: number
  reps_completed: number | null
  notes: string | null
  rating: number | null
}

export interface SkillScore {
  id: string
  athlete_id: string
  organization_id: string
  scorer_id: string
  category: ScoreCategory
  skill_name: string
  score: number
  measured_at: string
  session_id: string | null
  notes: string | null
  created_at: string
}

export interface DevelopmentNote {
  id: string
  athlete_id: string
  organization_id: string
  coach_id: string
  session_id: string | null
  note: string
  category: string | null
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface WeeklyPlan {
  id: string
  organization_id: string
  coach_id: string
  group_id: string | null
  week_start: string
  plan_data: Json
  notes: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

// Enum types
export type UserRole = Database['public']['Enums']['user_role']
export type MembershipStatus = Database['public']['Enums']['membership_status']
export type AssignmentStatus = Database['public']['Enums']['assignment_status']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type NotificationStatus = Database['public']['Enums']['notification_status']
export type AttendanceStatus = Database['public']['Enums']['attendance_status']
export type CompletionStatus = Database['public']['Enums']['completion_status']

// Insert types
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type MembershipInsert = Database['public']['Tables']['memberships']['Insert']
export type AthleteProfileInsert = Database['public']['Tables']['athlete_profiles']['Insert']
export type CoachProfileInsert = Database['public']['Tables']['coach_profiles']['Insert']
export type GroupInsert = Database['public']['Tables']['groups']['Insert']
export type ProgramInsert = Database['public']['Tables']['programs']['Insert']
export type AssignedProgramInsert = Database['public']['Tables']['assigned_programs']['Insert']
export type TrainingLogInsert = Database['public']['Tables']['training_logs']['Insert']
export type PerformanceRecordInsert = Database['public']['Tables']['performance_records']['Insert']
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']
export type AttendanceInsert = Database['public']['Tables']['attendance']['Insert']
export type FeePaymentInsert = Database['public']['Tables']['fee_payments']['Insert']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

// Update types
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type MembershipUpdate = Database['public']['Tables']['memberships']['Update']
export type AthleteProfileUpdate = Database['public']['Tables']['athlete_profiles']['Update']
export type TrainingLogUpdate = Database['public']['Tables']['training_logs']['Update']
export type AssignedProgramUpdate = Database['public']['Tables']['assigned_programs']['Update']
export type AttendanceUpdate = Database['public']['Tables']['attendance']['Update']
export type FeePaymentUpdate = Database['public']['Tables']['fee_payments']['Update']

// Custom composite types
export interface UserWithMemberships extends UserProfile {
  memberships: (Membership & {
    organization: Organization
  })[]
}

export interface AthleteWithProfile extends AthleteProfile {
  user_profile: UserProfile
  group_members?: (GroupMember & { group: Group })[]
}

export interface CoachWithProfile extends CoachProfile {
  user_profile: UserProfile
}

export interface GroupWithMembers extends Group {
  members: (GroupMember & {
    user_profile: UserProfile
    athlete_profile?: AthleteProfile
  })[]
}

export interface ProgramWithAssignments extends Program {
  assigned_programs: (AssignedProgram & {
    athlete: AthleteProfile & { user_profile: UserProfile }
  })[]
}

export interface PerformanceRecordWithMetric extends PerformanceRecord {
  metric_type: MetricType
}

export interface SessionWithAttendance extends Session {
  attendance: (Attendance & {
    athlete: AthleteProfile & { user_profile: UserProfile }
  })[]
  group?: Group
}

export interface NotificationWithRecipients extends Notification {
  recipients: (NotificationRecipient & {
    user_profile: UserProfile
  })[]
}

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error?: string | null
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Dashboard Stats types
export interface AthleteDashboardStats {
  totalXp: number
  currentLevel: number
  streakDays: number
  completedPrograms: number
  upcomingSessionsCount: number
  recentAchievements: (AthleteAchievement & { achievement: Achievement })[]
  weeklyProgress: {
    day: string
    completed: number
  }[]
}

export interface CoachDashboardStats {
  totalAthletes: number
  activePrograms: number
  upcomingSessions: number
  pendingMeasurements: number
  attendanceRate: number
  recentActivities: {
    type: string
    description: string
    timestamp: string
  }[]
}

export interface ClubAdminDashboardStats {
  totalMembers: number
  activeAthletes: number
  coaches: number
  groups: number
  monthlyRevenue: number
  pendingPayments: number
  paymentStats: {
    paid: number
    pending: number
    overdue: number
  }
}

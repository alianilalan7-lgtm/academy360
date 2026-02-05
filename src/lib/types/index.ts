export type { Database } from './database'
import type { Database } from './database'

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

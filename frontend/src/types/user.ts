export interface User {
  id: string
  tenantId: string
  name: string
  username: string
  email: string
  phone: string | null
  avatarUrl: string | null
  jobTitle: string | null
  employeeCode: string | null
  status: string
  isActive: boolean
  isVerified: boolean
  emailVerifiedAt: string | null
  phoneVerifiedAt: string | null
  lastLoginAt: string | null
  lastLoginIp: string | null
  timezone: string | null
  locale: string | null
  createdAt: string
  updatedAt: string | null
  // Only present on "the logged-in user" (login/register/me responses) — not
  // on ordinary user list/detail objects. Used purely for nav visibility.
  isPlatformUser?: boolean
}

export interface CreateUserInput {
  tenantId: string
  name: string
  username: string
  emailLocalPart: string
  phone?: string
  password: string
  jobTitle?: string
  employeeCode?: string
  timezone?: string
  locale?: string
}

export interface UpdateUserInput extends Partial<Omit<CreateUserInput, 'tenantId' | 'password'>> {
  password?: string
  status?: string
  isActive?: boolean
  isVerified?: boolean
}

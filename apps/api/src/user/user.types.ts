import { User, Workspace } from '@prisma/client'

export interface UserWithWorkspace extends User {
  defaultWorkspace: Workspace
}

export interface AuthenticatedUser extends User {
  ipAddress: string
}

export interface AuthenticatedUserWithWorkspace extends AuthenticatedUser {
  defaultWorkspace: Workspace
}

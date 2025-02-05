import { Workspace, IpAddress } from '@prisma/client'

export interface WorkspaceWithBlacklistedIpAddresses extends Workspace {
  blacklistedIpAddresses: IpAddress[]
}

import { UnauthorizedException, Injectable } from '@nestjs/common'
import { AuthorityCheckerService } from './authority-checker.service'
import { ProjectWithSecrets } from '@/project/project.types'
import { EnvironmentWithProject } from '@/environment/environment.types'
import { VariableWithProjectAndVersion } from '@/variable/variable.types'
import { SecretWithProjectAndVersion } from '@/secret/secret.types'
import { IntegrationWithWorkspace } from '@/integration/integration.types'
import { AuthorizationParams } from './authorization.types'
import { AuthenticatedUser } from '@/user/user.types'
import { Workspace } from '@prisma/client'

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly authorityCheckerService: AuthorityCheckerService
  ) {}

  /**
   * Checks if the user is authorized to access the given workspace.
   * @param params The authorization parameters
   * @returns The workspace if the user is authorized to access it
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the workspace is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   * @throws ForbiddenException if the user is not authorized to access the workspace
   */
  public async authorizeUserAccessToWorkspace(
    params: AuthorizationParams
  ): Promise<Workspace> {
    const workspace =
      await this.authorityCheckerService.checkAuthorityOverWorkspace(params)

    this.checkUserHasAccessToWorkspace(params.user, workspace)

    return workspace
  }

  /**
   * Checks if the user is authorized to access the given project.
   * @param params The authorization parameters
   * @returns The project if the user is authorized to access it
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the workspace is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   * @throws ForbiddenException if the user is not authorized to access the project
   */
  public async authorizeUserAccessToProject(
    params: AuthorizationParams
  ): Promise<ProjectWithSecrets> {
    const result =
      await this.authorityCheckerService.checkAuthorityOverProject(params)

    this.checkUserHasAccessToWorkspace(params.user, result.workspace)

    return result.project
  }

  /**
   * Checks if the user is authorized to access the given environment.
   * @param params The authorization parameters
   * @returns The environment if the user is authorized to access it
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the workspace is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   * @throws ForbiddenException if the user is not authorized to access the environment
   */
  public async authorizeUserAccessToEnvironment(
    params: AuthorizationParams
  ): Promise<EnvironmentWithProject> {
    const result =
      await this.authorityCheckerService.checkAuthorityOverEnvironment(params)

    this.checkUserHasAccessToWorkspace(params.user, result.workspace)

    return result.environment
  }

  /**
   * Checks if the user is authorized to access the given variable.
   * @param params The authorization parameters
   * @returns The variable if the user is authorized to access it
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the workspace is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   * @throws ForbiddenException if the user is not authorized to access the variable
   */
  public async authorizeUserAccessToVariable(
    params: AuthorizationParams
  ): Promise<VariableWithProjectAndVersion> {
    const result =
      await this.authorityCheckerService.checkAuthorityOverVariable(params)

    this.checkUserHasAccessToWorkspace(params.user, result.workspace)

    return result.variable
  }

  /**
   * Checks if the user is authorized to access the given secret.
   * @param params The authorization parameters
   * @returns The secret if the user is authorized to access it
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the workspace is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   * @throws ForbiddenException if the user is not authorized to access the secret
   */
  public async authorizeUserAccessToSecret(
    params: AuthorizationParams
  ): Promise<SecretWithProjectAndVersion> {
    const result =
      await this.authorityCheckerService.checkAuthorityOverSecret(params)

    this.checkUserHasAccessToWorkspace(params.user, result.workspace)

    return result.secret
  }

  /**
   * Checks if the user is authorized to access the given integration.
   * @param params The authorization parameters
   * @returns The integration if the user is authorized to access it
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the workspace is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   * @throws ForbiddenException if the user is not authorized to access the integration
   */
  public async authorizeUserAccessToIntegration(
    params: AuthorizationParams
  ): Promise<IntegrationWithWorkspace> {
    const result =
      await this.authorityCheckerService.checkAuthorityOverIntegration(params)

    this.checkUserHasAccessToWorkspace(params.user, result.workspace)

    return result.integration
  }

  private checkUserHasAccessToWorkspace(
    user: AuthenticatedUser,
    workspace: Workspace
  ) {
    if (
      workspace.blacklistedIpAddresses.some(
        (ipAddress) => ipAddress === user.ipAddress
      )
    ) {
      throw new UnauthorizedException(
        `User ${user.id} is not allowed to access this workspace`
      )
    }
  }
}

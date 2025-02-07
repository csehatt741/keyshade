import { User, Workspace, Authority, ProjectAccessLevel } from '@prisma/client'
import { VariableWithProjectAndVersion } from '@/variable/variable.types'
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { EnvironmentWithProject } from '@/environment/environment.types'
import { ProjectWithSecrets } from '@/project/project.types'
import { SecretWithProjectAndVersion } from '@/secret/secret.types'
import { CustomLoggerService } from '@/common/logger.service'
import {
  getCollectiveEnvironmentAuthorities,
  getCollectiveProjectAuthorities,
  getCollectiveWorkspaceAuthorities
} from '@/common/collective-authorities'
import { IntegrationWithWorkspace } from '@/integration/integration.types'
import { AuthorizationParams } from './authorization.types'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class AuthorityCheckerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customLoggerService: CustomLoggerService
  ) {}

  /**
   * Checks if the user has the required authorities to access the given workspace.
   *
   * @param params The input object containing the user, entity, authorities
   * @returns The workspace if the user has the required authorities
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the workspace is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   */
  public async checkAuthorityOverWorkspace(
    params: AuthorizationParams
  ): Promise<Workspace> {
    const { user, entity, authorities } = params

    const workspace = await this.getWorkspace(user.id, {
      workspaceSlug: entity.slug,
      workspaceName: entity.name
    })

    const permittedAuthorities = await getCollectiveWorkspaceAuthorities(
      workspace.id,
      user.id,
      this.prisma
    )

    this.checkHasPermissionOverEntity(
      permittedAuthorities,
      authorities,
      user.id
    )

    return workspace
  }

  /**
   * Checks if the user has the required authorities to access the given project.
   *
   * @param params The input object containing the user, entity, authorities
   * @returns The project if the user has the required authorities
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the project is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   */
  public async checkAuthorityOverProject(params: AuthorizationParams): Promise<{
    project: ProjectWithSecrets
    workspace: Workspace
  }> {
    const { user, entity, authorities } = params

    let project: ProjectWithSecrets

    try {
      if (entity.slug) {
        project = await this.prisma.project.findUnique({
          where: {
            slug: entity.slug
          },
          include: {
            secrets: true
          }
        })
      } else {
        project = await this.prisma.project.findFirst({
          where: {
            name: entity.name,
            workspace: { members: { some: { userId: user.id } } }
          },
          include: {
            secrets: true
          }
        })
      }
    } catch (error) {
      this.customLoggerService.error(error)
      throw new InternalServerErrorException(error)
    }

    if (!project) {
      throw new NotFoundException(`Project ${entity.slug} not found`)
    }

    const permittedAuthoritiesForProject: Set<Authority> =
      await getCollectiveProjectAuthorities(user.id, project, this.prisma)

    const permittedAuthoritiesForWorkspace: Set<Authority> =
      await getCollectiveWorkspaceAuthorities(
        project.workspaceId,
        user.id,
        this.prisma
      )

    const projectAccessLevel = project.accessLevel
    switch (projectAccessLevel) {
      case ProjectAccessLevel.GLOBAL:
        // In the global case, we check if the authorities being passed in
        // contains just the READ_PROJECT authority. If not, we need to
        // check if the user has access to the other authorities mentioned as well.
        if (
          authorities.length !== 1 ||
          !authorities.includes(Authority.READ_PROJECT)
        ) {
          this.checkHasPermissionOverEntity(
            permittedAuthoritiesForWorkspace,
            authorities,
            user.id
          )
        }
        break
      case ProjectAccessLevel.INTERNAL:
        this.checkHasPermissionOverEntity(
          permittedAuthoritiesForWorkspace,
          authorities,
          user.id
        )
        break
      case ProjectAccessLevel.PRIVATE:
        this.checkHasPermissionOverEntity(
          permittedAuthoritiesForProject,
          authorities,
          user.id
        )
        break
    }

    const workspace = await this.getWorkspace(user.id, {
      workspaceId: project.workspaceId
    })

    return { project, workspace }
  }

  /**
   * Checks if the user has the required authorities to access the given environment.
   *
   * @param params The input object containing the user, entity, authorities
   * @returns The environment if the user has the required authorities
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the environment is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   */
  public async checkAuthorityOverEnvironment(
    params: AuthorizationParams
  ): Promise<{
    environment: EnvironmentWithProject
    workspace: Workspace
  }> {
    const { user, entity, authorities } = params

    let environment: EnvironmentWithProject

    try {
      if (entity.slug) {
        environment = await this.prisma.environment.findUnique({
          where: {
            slug: entity.slug
          },
          include: {
            project: true
          }
        })
      } else {
        environment = await this.prisma.environment.findFirst({
          where: {
            name: entity.name,
            project: { workspace: { members: { some: { userId: user.id } } } }
          },
          include: {
            project: true
          }
        })
      }
    } catch (error) {
      this.customLoggerService.error(error)
      throw new InternalServerErrorException(error)
    }

    if (!environment) {
      throw new NotFoundException(`Environment ${entity.slug} not found`)
    }

    const permittedAuthorities = await getCollectiveEnvironmentAuthorities(
      user.id,
      environment,
      this.prisma
    )

    this.checkHasPermissionOverEntity(
      permittedAuthorities,
      authorities,
      user.id
    )

    const workspace = await this.getWorkspace(user.id, {
      workspaceId: environment.project.workspaceId
    })

    return { environment, workspace }
  }

  /**
   * Checks if the user has the required authorities to access the given variable.
   *
   * @param params The input object containing the user, entity, authorities
   * @returns The variable if the user has the required authorities
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the variable is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   */
  public async checkAuthorityOverVariable(
    params: AuthorizationParams
  ): Promise<{
    variable: VariableWithProjectAndVersion
    workspace: Workspace
  }> {
    const { user, entity, authorities } = params

    let variable: VariableWithProjectAndVersion

    try {
      if (entity.slug) {
        variable = await this.prisma.variable.findUnique({
          where: {
            slug: entity.slug
          },
          include: {
            versions: true,
            project: true
          }
        })
      } else {
        variable = await this.prisma.variable.findFirst({
          where: {
            name: entity.name,
            project: { workspace: { members: { some: { userId: user.id } } } }
          },
          include: {
            versions: true,
            project: true
          }
        })
      }
    } catch (error) {
      this.customLoggerService.error(error)
      throw new InternalServerErrorException(error)
    }

    if (!variable) {
      throw new NotFoundException(`Variable ${entity.slug} not found`)
    }

    const permittedAuthorities = await getCollectiveProjectAuthorities(
      user.id,
      variable.project,
      this.prisma
    )

    this.checkHasPermissionOverEntity(
      permittedAuthorities,
      authorities,
      user.id
    )

    const workspace = await this.getWorkspace(user.id, {
      workspaceId: variable.project.workspaceId
    })

    return { variable, workspace }
  }

  /**
   * Checks if the user has the required authorities to access the given secret.
   *
   * @param params The input object containing the user, entity, authorities
   * @returns The secret if the user has the required authorities
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the secret is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   */
  public async checkAuthorityOverSecret(params: AuthorizationParams): Promise<{
    secret: SecretWithProjectAndVersion
    workspace: Workspace
  }> {
    const { user, entity, authorities } = params

    let secret: SecretWithProjectAndVersion

    try {
      if (entity.slug) {
        secret = await this.prisma.secret.findUnique({
          where: {
            slug: entity.slug
          },
          include: {
            versions: true,
            project: true
          }
        })
      } else {
        secret = await this.prisma.secret.findFirst({
          where: {
            name: entity.name,
            project: { workspace: { members: { some: { userId: user.id } } } }
          },
          include: {
            versions: true,
            project: true
          }
        })
      }
    } catch (error) {
      this.customLoggerService.error(error)
      throw new InternalServerErrorException(error)
    }

    if (!secret) {
      throw new NotFoundException(`Secret ${entity.slug} not found`)
    }

    const permittedAuthorities = await getCollectiveProjectAuthorities(
      user.id,
      secret.project,
      this.prisma
    )

    this.checkHasPermissionOverEntity(
      permittedAuthorities,
      authorities,
      user.id
    )

    const workspace = await this.getWorkspace(user.id, {
      workspaceId: secret.project.workspaceId
    })

    return { secret, workspace }
  }

  /**
   * Checks if the user has the required authorities to access the given integration.
   *
   * @param params The input object containing the user, entity, authorities
   * @returns The integration if the user has the required authorities
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the integration is not found
   * @throws UnauthorizedException if the user does not have the required authorities
   */
  public async checkAuthorityOverIntegration(
    params: AuthorizationParams
  ): Promise<{
    integration: IntegrationWithWorkspace
    workspace: Workspace
  }> {
    const { user, entity, authorities } = params

    let integration: IntegrationWithWorkspace | null

    try {
      if (entity.slug) {
        integration = await this.prisma.integration.findUnique({
          where: {
            slug: entity.slug
          },
          include: {
            workspace: true
          }
        })
      } else {
        integration = await this.prisma.integration.findFirst({
          where: {
            name: entity.name,
            workspace: { members: { some: { userId: user.id } } }
          },
          include: {
            workspace: true
          }
        })
      }
    } catch (error) {
      this.customLoggerService.error(error)
      throw new InternalServerErrorException(error)
    }

    if (!integration) {
      throw new NotFoundException(`Integration ${entity.slug} not found`)
    }

    const permittedAuthorities = await getCollectiveWorkspaceAuthorities(
      integration.workspaceId,
      user.id,
      this.prisma
    )

    this.checkHasPermissionOverEntity(
      permittedAuthorities,
      authorities,
      user.id
    )

    if (integration.projectId) {
      const project = await this.prisma.project.findUnique({
        where: {
          id: integration.projectId
        }
      })

      if (!project) {
        throw new NotFoundException(
          `Project with ID ${integration.projectId} not found`
        )
      }

      const projectAuthorities = await getCollectiveProjectAuthorities(
        user.id,
        project,
        this.prisma
      )

      this.checkHasPermissionOverEntity(
        projectAuthorities,
        authorities,
        user.id
      )
    }

    const workspace = await this.getWorkspace(user.id, {
      workspaceId: integration.workspaceId
    })

    return { integration, workspace }
  }

  /**
   * Fetches the requested workspace specified by userId and the filter.
   * @param userId The id of the user
   * @param filter The filter optionally including the workspace id, slug or name
   * @returns The requested workspace
   * @throws InternalServerErrorException if there's an error when communicating with the database
   * @throws NotFoundException if the workspace is not found
   */
  private async getWorkspace(
    userId: User['id'],
    filter: {
      workspaceId?: Workspace['id']
      workspaceSlug?: Workspace['slug']
      workspaceName?: Workspace['name']
    }
  ): Promise<Workspace> {
    let workspace: Workspace

    try {
      if (filter.workspaceId) {
        workspace = await this.prisma.workspace.findUnique({
          where: {
            id: filter.workspaceId
          }
        })
      } else if (filter.workspaceSlug) {
        workspace = await this.prisma.workspace.findUnique({
          where: {
            slug: filter.workspaceSlug
          }
        })
      } else if (filter.workspaceName) {
        workspace = await this.prisma.workspace.findFirst({
          where: {
            name: filter.workspaceName,
            members: { some: { userId: userId } }
          }
        })
      }
    } catch (error) {
      this.customLoggerService.error(error)
      throw new InternalServerErrorException(error)
    }

    if (!workspace) {
      throw new NotFoundException(
        `Workspace ${filter.workspaceId ?? filter.workspaceSlug ?? filter.workspaceName} not found`
      )
    }

    return workspace
  }

  /**
   * Checks if the user has all the required authorities to perform an action.
   * Throws UnauthorizedException if the user does not have all the required authorities.
   *
   * @param permittedAuthorities The set of authorities that the user has
   * @param authorities The set of authorities required to perform the action
   * @param userId The slug of the user
   * @returns void
   * @throws UnauthorizedException if the user does not have all the required authorities
   */
  private checkHasPermissionOverEntity(
    permittedAuthorities: Set<Authority>,
    authorities: Authority[],
    userId: string
  ): void {
    // We commence the check if WORKSPACE_ADMIN isn't in the list of permitted authorities
    if (!permittedAuthorities.has(Authority.WORKSPACE_ADMIN)) {
      // Check if the authority object passed is completely contained within the permitted authorities
      const hasRequiredAuthority = authorities.every((auth) =>
        permittedAuthorities.has(auth)
      )

      if (!hasRequiredAuthority) {
        throw new UnauthorizedException(
          `User ${userId} does not have any of the required authorities to perform the action`
        )
      }
    }
  }
}

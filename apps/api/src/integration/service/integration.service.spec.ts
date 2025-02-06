import { Test, TestingModule } from '@nestjs/testing'
import { IntegrationService } from './integration.service'
import { CommonModule } from '@/common/common.module'
import { PrismaService } from '@/prisma/prisma.service'
import { AuthorizationService } from '@/auth/service/authorization.service'
import { mockDeep } from 'jest-mock-extended'

describe('IntegrationService', () => {
  let service: IntegrationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule],
      providers: [PrismaService, AuthorizationService, IntegrationService]
    })
      .overrideProvider(PrismaService)
      .useValue(mockDeep<PrismaService>())
      .compile()

    service = module.get<IntegrationService>(IntegrationService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})

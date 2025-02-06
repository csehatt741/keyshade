import { Test, TestingModule } from '@nestjs/testing'
import { IntegrationController } from './integration.controller'
import { PrismaService } from '@/prisma/prisma.service'
import { mockDeep } from 'jest-mock-extended'
import { AuthzService } from '@/auth/service/authz.service'
import { IntegrationService } from '../service/integration.service'
import { CommonModule } from '@/common/common.module'

describe('IntegrationController', () => {
  let controller: IntegrationController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule],
      controllers: [IntegrationController],
      providers: [PrismaService, AuthzService, IntegrationService]
    })
      .overrideProvider(PrismaService)
      .useValue(mockDeep<PrismaService>())
      .compile()

    controller = module.get<IntegrationController>(IntegrationController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})

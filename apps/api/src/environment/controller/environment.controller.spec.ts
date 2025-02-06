import { Test, TestingModule } from '@nestjs/testing'
import { EnvironmentController } from './environment.controller'
import { EnvironmentService } from '../service/environment.service'
import { PrismaService } from '@/prisma/prisma.service'
import { mockDeep } from 'jest-mock-extended'
import { CommonModule } from '@/common/common.module'
import { AuthzService } from '@/auth/service/authz.service'

describe('EnvironmentController', () => {
  let controller: EnvironmentController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule],
      controllers: [EnvironmentController],
      providers: [EnvironmentService, PrismaService, AuthzService]
    })
      .overrideProvider(PrismaService)
      .useValue(mockDeep<PrismaService>())
      .compile()

    controller = module.get<EnvironmentController>(EnvironmentController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})

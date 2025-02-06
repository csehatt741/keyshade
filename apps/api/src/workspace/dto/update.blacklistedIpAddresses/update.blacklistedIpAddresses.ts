import { IsArray, ArrayNotEmpty, IsString, IsNotEmpty } from 'class-validator'

export class UpdateBlacklistedIpAddresses {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ipAddresses: string[]
}

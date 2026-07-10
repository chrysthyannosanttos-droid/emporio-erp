import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== pass) { // In production, use bcrypt
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // In production, generate a real JWT token using @nestjs/jwt
    const fakeJwtToken = Buffer.from(`${user.id}:${user.role}:${user.companyId}`).toString('base64');
    
    return {
      access_token: fakeJwtToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      }
    };
  }
}

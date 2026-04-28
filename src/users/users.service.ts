import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '@/users/entity/user.entity';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';
import { StatsService } from '@/stats/stats.service';
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    
    @InjectRepository(IdentityVerificationEntity)
    private verificationRepository: Repository<IdentityVerificationEntity>,

    private statsService: StatsService,
  ) {}

  // LOGIC 1: Advanced Paginated List
  async getPaginatedUsers(query: {
    page: number;
    limit: number;
    role?: string;
    verified?: string;
    status?: string;
    search?: string;
  }) {
    const { page, limit, role, verified, status, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (role && role !== 'ALL') {
      queryBuilder.andWhere('user.currentRole = :role', { role });
    }

    if (verified === 'true') {
      queryBuilder.andWhere('user.isIdentityVerified = true');
    } else if (verified === 'false') {
      queryBuilder.andWhere('user.isIdentityVerified = false');
    }

    if (status && status !== 'ALL') {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('user.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: Number(limit),
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  }

  // LOGIC 2: Admin Statistics (The Orange Box)
  async getAdminSummaryStats() {
    const pendingVerifications = await this.verificationRepository.count({
      where: { status: 'PENDING' } as any,
    });

    const totalUsers = await this.usersRepository.count();

    return {
      pendingVerifications,
      totalUsers,
    };
  }

  // LOGIC 3 & 4: Actions & Internal Verification
  async changeRole(userId: number, newRole: UserRole) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    
    user.currentRole = newRole;
    
    // Logic 4: Automatically verify if promoted to ADMIN
    if (newRole === UserRole.ADMIN) {
      user.isIdentityVerified = true;
    }
    
    return await this.usersRepository.save(user);
  }

  async toggleStatus(id: number, status: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.status = status;
    return await this.usersRepository.save(user);
  }

  async findById(id: number): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  async create(registerDto: RegisterAuthDto): Promise<UserEntity> {
    // Logic 4: Internal/Admin auto-verify on creation
    const isInternal = registerDto.email.includes('@jomnus.admin');

    const user = this.usersRepository.create({
      email: registerDto.email,
      password: registerDto.password,
      fullName: registerDto.fullName,
      currentRole: isInternal ? UserRole.ADMIN : UserRole.REQUESTER,
      isIdentityVerified: isInternal,
      status: 'active'
    });

    const savedUser = await this.usersRepository.save(user);
    await this.statsService.createInitialStats(savedUser);
    return savedUser;
  }

  async updateRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: refreshToken || null });
  }

  async updateOtp(userId: number, otp: string | null, otpExpiry: Date | null): Promise<void> {
    await this.usersRepository.update(userId, { otp, otpExpiry });
  }

  async updatePassword(userId: number, password: string): Promise<void> {
    await this.usersRepository.update(userId, { password });
  }
}
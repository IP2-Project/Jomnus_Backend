import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException,
  Logger,
  Inject,     
  forwardRef  
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, DataSource, In, Brackets } from 'typeorm';
import { IdentityVerificationEntity, VerificationStatus } from './entities/identity-verification.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { UserEntity, UserRole } from '@/users/entity/user.entity';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityGateway } from './identity.gateway'; 
import { UsersService } from '@/users/users.service';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface CreateVerificationFilesDto {
  id_card_file: Express.Multer.File;
  selfie_file: Express.Multer.File;
}

@Injectable()
export class IdentityVerificationsService {
  private readonly logger = new Logger(IdentityVerificationsService.name);

  constructor(
    @InjectRepository(IdentityVerificationEntity)
    private readonly verificationRepo: Repository<IdentityVerificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    private readonly gateway: IdentityGateway,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService, 
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  private async broadcastStats() {
    try {
      const stats = await this.getAdminStats();
      this.gateway.emitStatsUpdate(stats);
    } catch (error) {
      this.logger.error('Failed to broadcast real-time stats', error);
    }
  }

  async getAdminStats() {
    const totalPending = await this.verificationRepo.count({
      where: { status: VerificationStatus.PENDING },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const processedToday = await this.verificationRepo.count({
      where: { 
        status: In([VerificationStatus.APPROVED, VerificationStatus.REJECTED]),
        reviewed_at: MoreThanOrEqual(startOfToday) 
      },
    });

    const processedTodayDetails = await this.verificationRepo.find({
      where: { reviewed_at: MoreThanOrEqual(startOfToday) },
      relations: ['user'],
      take: 6,
    });

    const processedAvatars = processedTodayDetails.map(v => {
      if (v.user?.profileImage) return v.user.profileImage;
      const name = v.user?.fullName || 'User';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    });

    const recentActivity = await this.auditLogRepo.find({
      order: { createdAt: 'DESC' },
      take: 5, 
      relations: ['admin', 'targetUser'],
    });

    return { totalPending, processedToday, processedAvatars, recentActivity };
  }

  async create(userId: number, dto: CreateVerificationFilesDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const verification = await this.verificationRepo.findOne({ where: { user: { id: userId } } });

    if (verification?.status === VerificationStatus.PENDING) {
      const now = new Date().getTime();
      const lastUpdate = new Date(verification.updated_at).getTime();
      if (now - lastUpdate < 30000) { 
        throw new BadRequestException('Your request is already being processed. Please wait a moment.');
      }
    }

    if (verification?.status === VerificationStatus.APPROVED) {
      throw new BadRequestException('Identity already verified.');
    }

    this.logger.log(`Initiating secure stream upload to Cloudinary for User ID: ${userId}`);
    let idCardUpload: UploadApiResponse;
    let selfieUpload: UploadApiResponse;

    try {
      // Execute uploads in parallel to reduce processing wait times
      const [idUploadRes, selfieUploadRes] = await Promise.all([
        this.uploadToCloudinary(dto.id_card_file, 'identity-verifications/id_cards'),
        this.uploadToCloudinary(dto.selfie_file, 'identity-verifications/selfies'),
      ]);
      idCardUpload = idUploadRes;
      selfieUpload = selfieUploadRes;
    } catch (uploadError) {
      this.logger.error('Failed to pipe image stream buffers to Cloudinary', uploadError);
      throw new BadRequestException('Failed to process and upload asset attachments to storage bucket.');
    }

    const oldFilesToDelete: string[] = [];
    if (verification) {
      if (verification.id_card_url) oldFilesToDelete.push(verification.id_card_url);
      if (verification.selfie_url) oldFilesToDelete.push(verification.selfie_url);
    }

    const result = await this.dataSource.transaction(async (manager) => {
      let savedRecord;
      if (verification) {
        verification.id_card_url = idCardUpload.secure_url;
        verification.selfie_url = selfieUpload.secure_url;
        verification.status = VerificationStatus.PENDING;
        verification.rejection_reason = null;
        savedRecord = await manager.save(verification);
      } else {
        const newRequest = manager.create(IdentityVerificationEntity, {
          user: user,
          id_card_url: idCardUpload.secure_url,
          selfie_url: selfieUpload.secure_url,
          status: VerificationStatus.PENDING,
        });
        savedRecord = await manager.save(newRequest);
      }

      await manager.save(AuditLogEntity, {
        action: 'REQUEST_SUBMITTED',
        reason: 'User uploaded identity documents to remote storage.',
        targetUserId: userId,
        adminId: null, 
      });

      await this.notificationsService.createNotification({
        user_id: null,
        audience: 'admin',
        title: 'New Verification Request',
        message: `${user.fullName} has submitted documents for review.`,
        type: 'NEW_IDENTITY_REQUEST', 
      });

      return savedRecord;
    });

    if (oldFilesToDelete.length > 0) {
      await this.deleteCloudinaryImages(oldFilesToDelete);
    }

    await this.broadcastStats();
    return result;
  }

  async review(id: number, adminId: number, dto: ReviewVerificationDto) {
    const admin = await this.userRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Invalid Admin performing review.');

    const result = await this.dataSource.transaction(async (manager) => {
      const verification = await manager.findOne(IdentityVerificationEntity, { 
        where: { id },
        relations: ['user'], 
      });

      if (!verification) throw new NotFoundException('Request not found');
      if (!verification.user) throw new BadRequestException('No user linked.');

      if (dto.status === VerificationStatus.APPROVED) {
        const isCardMissing = !verification.id_card_url || verification.id_card_url.trim() === '';
        const isSelfieMissing = !verification.selfie_url || verification.selfie_url.trim() === '';

        if (isCardMissing || isSelfieMissing) {
          throw new BadRequestException('Cannot approve: Identity documents (ID or Selfie) are empty or invalid.');
        }
      }

      if (verification.status === dto.status) throw new BadRequestException(`Request is already ${dto.status}.`);
      
      if (dto.status === VerificationStatus.REJECTED && !dto.rejection_reason?.trim()) {
        throw new BadRequestException('Rejection reason required.');
      }

      const isApproved = dto.status === VerificationStatus.APPROVED;

      verification.status = dto.status;
      verification.reviewed_by = adminId;
      verification.reviewed_at = new Date();
      verification.rejection_reason = dto.status === VerificationStatus.REJECTED ? dto.rejection_reason : null;
      
      await manager.save(verification);

      const targetUser = await manager.findOne(UserEntity, { where: { id: verification.user.id } });

      if (targetUser) {
        targetUser.isIdentityVerified = isApproved;
        await manager.save(targetUser);
        verification.user = targetUser;
      }

      await manager.save(AuditLogEntity, {
        action: dto.status,
        reason: dto.rejection_reason ?? undefined, 
        targetUserId: verification.user.id,
        adminId: adminId,
      });

      return verification;
    });

    const isApproved = dto.status === VerificationStatus.APPROVED;
    await this.notificationsService.createNotification({
      user_id: result.user.id,
      audience: 'user',
      title: 'Status Updated',
      message: isApproved ? 'Your identity is verified!' : `Rejected: ${dto.rejection_reason}`,
      type: isApproved ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
    });

    await this.broadcastStats(); 
    return result;
  }
  
  async resetToPending(id: number, adminId: number, reason: string) {
    const verification = await this.verificationRepo.findOne({ 
      where: { id },
      relations: ['user'] 
    });

    if (!verification) throw new NotFoundException('Request not found');
    if (!verification.user) throw new BadRequestException('No associated user.');

    // Standardize the reason display
    const displayReason = reason && reason.trim().length > 0 
      ? reason.trim() 
      : "No reason provided";

    await this.dataSource.transaction(async (manager) => {
      await manager.update(UserEntity, verification.user.id, { 
        isIdentityVerified: false
      });
      
      verification.status = VerificationStatus.PENDING;
      verification.rejection_reason = displayReason;
      verification.reviewed_at = undefined;
      verification.reviewed_by = undefined;
      await manager.save(verification);

      await manager.save(AuditLogEntity, {
        action: 'RESET_TO_PENDING',
        reason: displayReason,
        targetUserId: verification.user.id,
        adminId: adminId,
      });

      await this.notificationsService.createNotification({
        user_id: verification.user.id,
        audience: 'user',
        title: 'Verification Reset',
        // This will now consistently output: "Reason: No reason provided"
        message: `Your identity verification has been reset to pending. Reason: ${displayReason}`,
        type: 'INFO_UPDATE', 
      });
    });

    await this.broadcastStats();
    return { message: 'Reset successful' };
  }

  async clearVerificationImages(userId: number, adminId: number) {
    const verification = await this.verificationRepo.findOne({ 
      where: { user: { id: userId } },
      relations: ['user']
    });
    
    if (!verification) return { message: 'No images to clear.' };
    if (!verification.user) throw new BadRequestException('Cannot clear images: No associated user found.');

    return await this.dataSource.transaction(async (manager) => {
      await this.deleteCloudinaryImages([verification.id_card_url, verification.selfie_url]);
      
      verification.id_card_url = null;
      verification.selfie_url = null;
      verification.status = VerificationStatus.PENDING;
      verification.rejection_reason = "Images cleared by admin. Please re-upload.";
      
      await manager.update(UserEntity, verification.user.id, {
        isIdentityVerified: false
      });

      await manager.save(verification);

      await manager.save(AuditLogEntity, {
        action: 'IMAGES_CLEARED',
        reason: 'Admin manually deleted images from server array buckets.',
        targetUserId: verification.user.id,
        adminId: adminId,
      });

      await this.notificationsService.createNotification({
        user_id: verification.user.id,
        audience: 'user',
        title: 'Action Required: Re-upload ID',
        message: 'Your verification images were cleared. Please upload clear copies of your ID and selfie.',
        type: 'INFO_UPDATE', 
      });

      await this.broadcastStats();
      return { message: 'Images deleted from Cloudinary storage array and user notified.' };
    });
  }

  async getPaginatedList(page: number, limit: number, search?: string, status?: string) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.verificationRepo.createQueryBuilder('verification')
      .leftJoinAndSelect('verification.user', 'user') 
      .leftJoinAndSelect('verification.reviewer', 'reviewer')
      .where('1=1')
      .andWhere('user.currentRole != :adminRole', { adminRole: UserRole.ADMIN });

    if (status && status.toUpperCase() !== 'ALL') {
      queryBuilder.andWhere('verification.status = :status', { status: status.toUpperCase() });
    }

    if (search && search.trim() !== '') {
      const searchPattern = `%${search.trim()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('user.fullName ILIKE :searchQuery', { searchQuery: searchPattern })
            .orWhere('user.email ILIKE :searchQuery', { searchQuery: searchPattern });
        }),
      );
    }

    queryBuilder.orderBy('verification.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data, 
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: Number(limit),
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  }

async exportToCsv() {
  const data = await this.verificationRepo.find({
    relations: ['user', 'reviewer'],
    order: { created_at: 'DESC' },
  });

  // 1. Define your headers
  const headers = ['ID', 'Full Name', 'Email', 'Status', 'Rejection Reason', 'Reviewer', 'Created At', 'ID Card URL', 'Selfie URL'];

  // 2. Helper function to format cell values for CSV
  const formatCell = (val: any) => {
    const stringVal = String(val ?? '');
    // Escape double quotes by doubling them, then wrap the whole value in quotes
    return `"${stringVal.replace(/"/g, '""')}"`;
  };

  // 3. Create the rows
  const rows = data.map(v => [
    formatCell(v.id),
    formatCell(v.user?.fullName || ''),
    formatCell(v.user?.email || ''),
    formatCell(v.status),
    formatCell(v.rejection_reason || 'N/A'),
    formatCell(v.reviewer?.fullName || 'Unassigned'),
    formatCell(v.created_at),
    formatCell(v.id_card_url || ''),
    formatCell(v.selfie_url || '')
  ].join(','));

  // 4. Combine headers and rows
  return [headers.join(','), ...rows].join('\n');
}

  private async uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folder, resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new BadRequestException('Cloudinary did not return a valid upload response response object.'));
          
          resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  private extractPublicIdFromUrl(url: string): string | null {
    if (!url || !url.includes('res.cloudinary.com')) return null;
    try {
      const segments = url.split('/upload/');
      if (segments.length < 2) return null;
      
      const pathWithExtension = segments[1].replace(/^v\d+\//, '');
      
      const lastDotIndex = pathWithExtension.lastIndexOf('.');
      if (lastDotIndex === -1) return pathWithExtension;
      return pathWithExtension.substring(0, lastDotIndex);
    } catch (e) {
      this.logger.error(`Could not parse Cloudinary Public ID key parameter from: ${url}`);
      return null;
    }
  }

  private async deleteCloudinaryImages(urls: (string | null)[]) {
    for (const url of urls) {
      if (!url || url === 'MANUAL_BYPASS') continue;
      
      const publicId = this.extractPublicIdFromUrl(url);
      if (!publicId) continue;

      try {
        const result = await cloudinary.uploader.destroy(publicId);
        this.logger.log(`Cloudinary deletion completed for [${publicId}]: Result -> ${JSON.stringify(result)}`);
      } catch (err) {
        this.logger.error(`Failed to wipe asset context image relative to handle ID [${publicId}] on remote CDN bucket: ${err}`);
      }
    }
  }

  async getOne(id: number) {
    const verification = await this.verificationRepo.findOne({
      where: { id },
      relations: ['user', 'reviewer'],
    });

    if (!verification) throw new NotFoundException(`Verification with ID ${id} not found`);
    return verification;
  }
}
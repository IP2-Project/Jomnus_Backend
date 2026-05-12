import { AppDataSource } from '../../ormconfig';
import { UserEntity, UserRole } from '../users/entity/user.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
const seedDatabase = async () => {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(UserEntity);
    const categoryRepository = AppDataSource.getRepository(CategoryEntity);

    console.log('Starting database seed...');

    // Check if admin user already exists
    const adminExists = await userRepository.findOne({
      where: { email: 'admin@jomnus.com' },
    });

    if (adminExists) {
      console.log('Admin user already exists, skipping seed');
      return;
    }

    // Create admin user
    const adminUser = userRepository.create({
      email: 'admin@jomnus.com',
      password: 'JomnusAdmin@12345',
      fullName: 'Jomnus Admin',
      currentRole: UserRole.ADMIN,
    });

    await userRepository.save(adminUser);
    console.log('Admin user created');

    // Create sample users
    const users: Partial<UserEntity>[] = [
      {
        email: 'john.doe@jomnus.com',
        password: 'User@123456',
        city: 'Phnom Penh',
        fullName: 'john doe',
        country: 'Cambodia',
        currentRole: UserRole.PERFORMER,
      },
      {
        email: 'jane.smith@jomnus.com',
        password: 'User@123456',
        fullName: 'jane smith',
        city: 'Siem Reap',
        country: 'Cambodia',
        currentRole: UserRole.REQUESTER,
      },
      {
        email: 'michael.johnson@jomnus.com',
        password: 'User@123456',
        fullName: 'Michae johnl',
        city: 'Battambang',
        country: 'Cambodia',
        currentRole: UserRole.REQUESTER,
      },
    ];

    const categories = [
      {
        name: 'Home Services',
        description:
          'Cleaning, plumbing, electrical, repair, and maintenance services',
      },
      {
        name: 'Technology',
        description: 'Software, IT, web, mobile, and technical services',
      },
      {
        name: 'Design & Creative',
        description:
          'Graphic design, UI/UX, photography, video, and creative services',
      },
      {
        name: 'Education',
        description: 'Tutoring, mentoring, and educational services',
      },
      {
        name: 'Business Services',
        description:
          'Accounting, legal, consulting, and administrative services',
      },
      {
        name: 'Marketing',
        description: 'Advertising, SEO, branding, and social media services',
      },
      {
        name: 'Health & Wellness',
        description: 'Fitness, beauty, massage, and wellness services',
      },
      {
        name: 'Events & Entertainment',
        description: 'Event planning, music, entertainment, and media services',
      },
      {
        name: 'Transportation & Delivery',
        description: 'Moving, logistics, transportation, and delivery services',
      },
      {
        name: 'Personal Services',
        description:
          'Babysitting, elderly care, pet care, and personal assistance',
      },
      {
        name: 'Construction & Property',
        description:
          'Architecture, interior design, construction, and renovation services',
      },
      {
        name: 'Freelance & Remote Work',
        description:
          'Virtual assistant, writing, translation, and remote support services',
      },
    ];

    for (const userData of users) {
      const userExists = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!userExists) {
        const newUser = userRepository.create(userData);
        await userRepository.save(newUser);
        console.log(`User created: ${userData.email}`);
      }
    }

    for (const categoryData of categories) {
      const categoryExists = await categoryRepository.findOne({
        where: { name: categoryData.name },
      });

      if (!categoryExists) {
        const newCategory = categoryRepository.create(categoryData);
        await categoryRepository.save(newCategory);
        console.log(`Category created: ${categoryData.name}`);
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

seedDatabase();

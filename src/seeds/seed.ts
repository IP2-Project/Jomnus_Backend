import { AppDataSource } from '../../ormconfig';
import { UserEntity, UserRole } from '../users/entity/user.entity';
import * as bcrypt from 'bcrypt';

const seedDatabase = async () => {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(UserEntity);

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
      username: 'admin',
      password: 'JomnusAdmin@12345',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.Admin,
      helper: 'none',
    });

    await userRepository.save(adminUser);
    console.log('Admin user created');

    // Create sample users
    const users: Partial<UserEntity>[] = [
      {
        email: 'john.doe@jomnus.com',
        username: 'johndoe',
        password: 'User@123456',
        firstName: 'John',
        lastName: 'Doe',
        helper: 'response',
        city: 'Phnom Penh',
        country: 'Cambodia',
      },
      {
        email: 'jane.smith@jomnus.com',
        username: 'janesmith',
        password: 'User@123456',
        firstName: 'Jane',
        lastName: 'Smith',
        helper: 'request',
        city: 'Siem Reap',
        country: 'Cambodia',
      },
      {
        email: 'michael.johnson@jomnus.com',
        username: 'michaeljohnson',
        password: 'User@123456',
        firstName: 'Michael',
        lastName: 'Johnson',
        helper: 'none',
        city: 'Battambang',
        country: 'Cambodia',
      },
    ];

    for (const userData of users) {
      const userExists = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!userExists) {
        const newUser = userRepository.create({
          ...userData,
          role: UserRole.User,
        });
        await userRepository.save(newUser);
        console.log(`User created: ${userData.email}`);
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

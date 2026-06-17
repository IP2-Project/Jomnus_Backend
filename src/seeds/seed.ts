import { AppDataSource } from '../../ormconfig';
import { UserEntity, UserRole } from '../users/entity/user.entity';
import { CategoryEntity } from '@/categories/entities/category.entity';
import {
  TaskEntity,
  TaskStatus,
} from '@/tasks/entities/task.entity';

import {
  TaskApplicationEntity,
  ApplicationStatus,
} from '@/applications/entities/task-application.entity';
import * as bcrypt from 'bcrypt';

const seedDatabase = async () => {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(UserEntity);
    const categoryRepository =
      AppDataSource.getRepository(CategoryEntity);
    const taskRepository =
      AppDataSource.getRepository(TaskEntity);

    const applicationRepository =
      AppDataSource.getRepository(
        TaskApplicationEntity,
      );
    const usersByEmail = new Map<string, UserEntity>();
    const tasksByTitle = new Map<string, TaskEntity>();

    console.log('Starting database seed...');

    // =====================================================
    // ADMIN USER
    // =====================================================

    const adminExists = await userRepository.findOne({
      where: { email: 'admin@jomnus.com' },
    });

    if (!adminExists) {
      const hashedAdminPassword = await bcrypt.hash('JomnusAdmin@12345', 10);

      const adminUser = userRepository.create({
        email: 'admin@jomnus.com',
        password: hashedAdminPassword,
        fullName: 'Jomnus Admin',
        currentRole: UserRole.ADMIN,
      });

      await userRepository.save(adminUser);
      usersByEmail.set(adminUser.email, adminUser);

      console.log('Admin user created');
    } else {
      usersByEmail.set(adminExists.email, adminExists);
      console.log('Admin user already exists');
    }

    // =====================================================
    // SAMPLE USERS
    // =====================================================

    const users: Partial<UserEntity>[] = [
      {
        email: 'john.doe@jomnus.com',
        password: 'User@123456',
        city: 'Phnom Penh',
        fullName: 'John Doe',
        country: 'Cambodia',
        currentRole: UserRole.PERFORMER,
      },
      {
        email: 'jane.smith@jomnus.com',
        password: 'User@123456',
        fullName: 'Jane Smith',
        city: 'Siem Reap',
        country: 'Cambodia',
        currentRole: UserRole.REQUESTER,
      },
      {
        email: 'michael.johnson@jomnus.com',
        password: 'User@123456',
        fullName: 'Michael Johnson',
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
        const hashedPassword = await bcrypt.hash(userData.password!, 10);

        const newUser = userRepository.create({
          ...userData,
          password: hashedPassword,
        });

        await userRepository.save(newUser);
        usersByEmail.set(newUser.email, newUser);

        console.log(`User created: ${userData.email}`);
      } else {
        usersByEmail.set(userExists.email, userExists);
        console.log(`User already exists: ${userData.email}`);
      }
    }

    for (const categoryData of categories) {
      const categoryExists = await categoryRepository.findOne({
        where: { name: categoryData.name },
      });

      if (!categoryExists) {
        const newCategory = categoryRepository.create(categoryData);
        await categoryRepository.save(newCategory);


        console.log(
          `Category created: ${categoryData.name}`,
        );
      } else {
        console.log(
          `Category already exists: ${categoryData.name}`,
        );
      }
    }
    // =====================================================
    // TASKS
    // =====================================================

    const requester =
      await userRepository.findOne({
        where: {
          email: 'jane.smith@jomnus.com',
        },
      });

    if (requester) {
      const tasks = [
        {
          title:
            'Luxury Penthouse UI Redesign',
          description:
            'Need modern UI redesign',
          requester_id: requester.id,
          price: 4200,
          deadline: new Date(
            '2026-12-31',
          ),
          required_workers: 1,
          status: TaskStatus.POSTED,
          location_text:
            'Phnom Penh',
        },

        {
          title:
            'E-commerce API Integration',
          description:
            'Backend API work',
          requester_id: requester.id,
          price: 1850,
          deadline: new Date(
            '2026-12-31',
          ),
          required_workers: 1,
          status: TaskStatus.POSTED,
          location_text:
            'Siem Reap',
        },
      ];

      for (const taskData of tasks) {
        const exists =
          await taskRepository.findOne({
            where: {
              title:
                taskData.title,
            },
          });

        if (!exists) {
          const task =
            taskRepository.create(
              taskData,
            );

          await taskRepository.save(
            task,
          );
          tasksByTitle.set(task.title, task);

          console.log(
            `Task created: ${task.title}`,
          );
        } else {
          tasksByTitle.set(exists.title, exists);
        }
      }
    }
    // ================= APPLICATIONS =================

    const performer = usersByEmail.get(
      'john.doe@jomnus.com',
    );
    const taskOne = tasksByTitle.get(
      'Luxury Penthouse UI Redesign',
    );
    const taskTwo = tasksByTitle.get(
      'E-commerce API Integration',
    );

    const applications = [
      performer && taskOne
        ? {
            task_id: taskOne.id,
            performer_id: performer.id,
            offered_price: 4200,
            status: ApplicationStatus.PENDING,
          }
        : null,
      performer && taskTwo
        ? {
            task_id: taskTwo.id,
            performer_id: performer.id,
            offered_price: 1850,
            status: ApplicationStatus.ACCEPTED,
          }
        : null,
    ].filter(
      (
        appData,
      ): appData is {
        task_id: number;
        performer_id: number;
        offered_price: number;
        status: ApplicationStatus;
      } => appData !== null,
    );

    for (const appData of applications) {
      const exists =
        await applicationRepository.findOne({
          where: {
            task_id: appData.task_id,
            performer_id: appData.performer_id,
          },
        });

      if (!exists) {
        const application =
          applicationRepository.create(appData);

        await applicationRepository.save(
          application,
        );

        console.log(
          `Application created for task ${appData.task_id}`,
        );
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

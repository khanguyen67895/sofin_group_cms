import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedAdminAccount(strapi);
  },
};

async function seedAdminAccount(strapi: Core.Strapi) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  try {
    const existingAdmin = await strapi.db.query('admin::user').findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) return;

    const superAdminRole = await strapi.db.query('admin::role').findOne({
      where: { code: 'strapi-super-admin' },
    });

    if (!superAdminRole) return;

    const hashedPassword = await strapi.admin.services.auth.hashPassword(
      process.env.ADMIN_PASSWORD || 'Sofin@Admin2024'
    );

    await strapi.db.query('admin::user').create({
      data: {
        firstname: process.env.ADMIN_FIRSTNAME || 'Admin',
        lastname: process.env.ADMIN_LASTNAME || 'Sofin',
        email: adminEmail,
        password: hashedPassword,
        isActive: true,
        registrationToken: null,
        roles: [superAdminRole.id],
      },
    });

    strapi.log.info(`Admin account created: ${adminEmail}`);
  } catch (error) {
    strapi.log.error('Failed to seed admin account:', error);
  }
}

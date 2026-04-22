import type { Core } from '@strapi/strapi';

const RAW_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedAdminAccount(strapi);
    await setPublicPermissions(strapi);
    patchUploadProvider(strapi);
  },
};

function patchUploadProvider(strapi: Core.Strapi) {
  const provider = (strapi.plugin('upload') as any).provider;
  if (!provider) return;

  for (const method of ['upload', 'uploadStream'] as const) {
    const original = provider[method].bind(provider);
    provider[method] = (file: any, customConfig: any = {}) => {
      const extra = RAW_MIME_TYPES.has(file.mime) ? { resource_type: 'raw', access_mode: 'public' } : {};
      return original(file, { ...extra, ...customConfig });
    };
  }
}

async function setPublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole) return;

  const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
    where: {
      action: 'api::don-ung-tuyen.don-ung-tuyen.create',
      role: publicRole.id,
    },
  });

  if (existing) return;

  await strapi.db.query('plugin::users-permissions.permission').create({
    data: {
      action: 'api::don-ung-tuyen.don-ung-tuyen.create',
      role: publicRole.id,
    },
  });

  strapi.log.info('Public create permission set for don-ung-tuyen');
}

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

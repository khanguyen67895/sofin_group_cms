import { factories } from "@strapi/strapi";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

export default factories.createCoreController(
  "api::don-ung-tuyen.don-ung-tuyen",
  ({ strapi }) => ({
    async create(ctx) {
      const { request } = ctx;

      if (!request.is("multipart")) {
        return super.create(ctx);
      }

      const { files, body } = ctx.request as any;

      // Parse data fields
      let data: Record<string, any> = {};
      if (body?.data) {
        try {
          data = typeof body.data === "string" ? JSON.parse(body.data) : body.data;
        } catch {
          data = body;
        }
      } else {
        const { cv: _cv, ...rest } = body || {};
        data = rest;
      }

      // Upload CV directly to Cloudinary with resource_type: 'raw'
      let cvFileId: number | null = null;
      const cvFile = files?.cv || files?.["files.cv"];
      if (cvFile) {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_NAME,
          api_key: process.env.CLOUDINARY_KEY,
          api_secret: process.env.CLOUDINARY_SECRET,
        });

        const filePath = cvFile.filepath || cvFile.path;
        const originalName = cvFile.originalFilename || cvFile.name || "cv";

        const uploadResult = await cloudinary.uploader.upload(filePath, {
          resource_type: "raw",
          public_id: `cv_${Date.now()}_${originalName.replace(/\s+/g, "_")}`,
          use_filename: false,
        });

        // Register file in Strapi's file system
        const fileSize = cvFile.size || fs.statSync(filePath).size;
        const fileRecord = await strapi.db.query("plugin::upload.file").create({
          data: {
            name: originalName,
            alternativeText: originalName,
            caption: originalName,
            width: null,
            height: null,
            hash: uploadResult.public_id,
            ext: `.${originalName.split(".").pop()}`,
            mime: cvFile.mimetype || cvFile.type || "application/octet-stream",
            size: Math.round((fileSize / 1024) * 100) / 100,
            url: uploadResult.secure_url,
            previewUrl: null,
            provider: "cloudinary",
            provider_metadata: {
              public_id: uploadResult.public_id,
              resource_type: uploadResult.resource_type,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        cvFileId = fileRecord.id;
      }

      const entity = await strapi.entityService.create(
        "api::don-ung-tuyen.don-ung-tuyen",
        {
          data: {
            ...data,
            ...(cvFileId !== null ? { cv: cvFileId } : {}),
          } as any,
          populate: ["cv"],
        }
      );

      const sanitized = await this.sanitizeOutput(entity, ctx);
      return this.transformResponse(sanitized);
    },
  })
);

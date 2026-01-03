import { Request, Response } from "express";
import { EmailTemplateType } from "../../../models";
import * as emailTemplateService from "../../services/emailTemplatedService";
import { logger } from "../../../lib";
import { recordAudit } from "../../../lib/common/auditLogger";

export async function getEmailTemplatesController(req: Request, res: Response) {
  try {
    const { type, isActive } = req.query;

    const filters: any = {};

    if (type) {
      filters.type = type as EmailTemplateType;
    }

    if (isActive !== undefined) {
      filters.isActive = isActive === "true";
    }

    const result = await emailTemplateService.getEmailTemplatesService(filters);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error in getEmailTemplatesController:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email templates"
    });
  }
}

export async function getEmailTemplateByIdController(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Template ID is required"
      });
    }

    const result = await emailTemplateService.getEmailTemplateByIdService(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error in getEmailTemplateByIdController:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email template"
    });
  }
}

export async function getEmailTemplateByTypeController(
  req: Request,
  res: Response
) {
  try {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Template type is required"
      });
    }

    if (!Object.values(EmailTemplateType).includes(type as EmailTemplateType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template type"
      });
    }

    const result = await emailTemplateService.getEmailTemplateByTypeService(
      type as EmailTemplateType
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error in getEmailTemplateByTypeController:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email template"
    });
  }
}

export async function createEmailTemplateController(
  req: Request,
  res: Response
) {
  try {
    const { type, subject, body, isActive } = req.body;

    if (!type || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: "Type, subject, and body are required fields"
      });
    }

    if (!Object.values(EmailTemplateType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template type",
        validTypes: Object.values(EmailTemplateType)
      });
    }

    if (subject.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Subject must be at least 3 characters long"
      });
    }

    if (body.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Body must be at least 10 characters long"
      });
    }

    const result = await emailTemplateService.createEmailTemplateService({
      type,
      subject: subject.trim(),
      body: body.trim(),
      isActive: isActive !== undefined ? isActive : true
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    void recordAudit({
      adminId: (req as any).user?.id,
      adminName:
        (req as any).user?.fullName || (req as any).user?.email || "Admin",
      action: "CreateEmailTemplate",
      targetType: "EmailTemplate",
      targetId: result.data?.id || result.data?._id,
      targetDisplayName: subject.trim(),
      details: { type }
    });

    return res.status(201).json(result);
  } catch (error: any) {
    logger.error("Error in createEmailTemplateController:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to create email template"
    });
  }
}

export async function updateEmailTemplateController(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
    const { subject, body, availableVariables, isActive } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Template ID is required"
      });
    }

    if (subject !== undefined && subject.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Subject must be at least 3 characters long"
      });
    }

    if (body !== undefined && body.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Body must be at least 10 characters long"
      });
    }

    if (
      availableVariables !== undefined &&
      !Array.isArray(availableVariables)
    ) {
      return res.status(400).json({
        success: false,
        message: "availableVariables must be an array"
      });
    }

    const updateData: any = {};

    if (subject !== undefined) updateData.subject = subject.trim();
    if (body !== undefined) updateData.body = body.trim();
    if (availableVariables !== undefined)
      updateData.availableVariables = availableVariables;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }

    const result = await emailTemplateService.updateEmailTemplateService(
      id,
      updateData
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    void recordAudit({
      adminId: (req as any).user?.id,
      adminName:
        (req as any).user?.fullName || (req as any).user?.email || "Admin",
      action: "UpdateEmailTemplate",
      targetType: "EmailTemplate",
      targetId: id,
      targetDisplayName: updateData.subject || undefined,
      details: { updatedFields: Object.keys(updateData) }
    });

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error in updateEmailTemplateController:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to update email template"
    });
  }
}

export async function deleteEmailTemplateController(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Template ID is required"
      });
    }

    const result = await emailTemplateService.deleteEmailTemplateService(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    void recordAudit({
      adminId: (req as any).user?.id,
      adminName:
        (req as any).user?.fullName || (req as any).user?.email || "Admin",
      action: "DeleteEmailTemplate",
      targetType: "EmailTemplate",
      targetId: id
    });

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error in deleteEmailTemplateController:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to delete email template"
    });
  }
}

export async function toggleEmailTemplateStatusController(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Template ID is required"
      });
    }

    const result =
      await emailTemplateService.toggleEmailTemplateStatusService(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    void recordAudit({
      adminId: (req as any).user?.id,
      adminName:
        (req as any).user?.fullName || (req as any).user?.email || "Admin",
      action: "ToggleEmailTemplateStatus",
      targetType: "EmailTemplate",
      targetId: id,
      details: { newStatus: result.data?.isActive }
    });

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error in toggleEmailTemplateStatusController:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to toggle email template status"
    });
  }
}

export async function getEmailTemplateTypesController(
  req: Request,
  res: Response
) {
  try {
    const types = Object.values(EmailTemplateType);

    return res.status(200).json({
      success: true,
      data: types,
      count: types.length
    });
  } catch (error: any) {
    logger.error("Error in getEmailTemplateTypesController:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email template types"
    });
  }
}

export async function getTemplateVariablesController(
  req: Request,
  res: Response
) {
  try {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Template type is required"
      });
    }

    if (!Object.values(EmailTemplateType).includes(type as EmailTemplateType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template type"
      });
    }

    const result = await emailTemplateService.getTemplateVariablesService(
      type as EmailTemplateType
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error in getTemplateVariablesController:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch template variables"
    });
  }
}

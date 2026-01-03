import { logger } from "../../../lib";
import {
  EmailTemplate,
  EmailTemplateType,
  EMAIL_TEMPLATE_VARIABLES
} from "../../../models/EmailTemplate";

interface CreateEmailTemplateInput {
  type: EmailTemplateType;
  subject: string;
  body: string;
  isActive?: boolean;
}

interface UpdateEmailTemplateInput {
  subject?: string;
  body?: string;
  isActive?: boolean;
}

export async function getEmailTemplatesService(filters?: {
  type?: EmailTemplateType;
  isActive?: boolean;
}) {
  try {
    const query: any = {};

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const templates = await EmailTemplate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      data: templates,
      count: templates.length
    };
  } catch (error: any) {
    logger.error("Error fetching email templates:", {
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to fetch email templates");
  }
}

export async function getEmailTemplateByIdService(templateId: string) {
  try {
    const template = await EmailTemplate.findById(templateId).lean();

    if (!template) {
      return {
        success: false,
        message: "Email template not found"
      };
    }

    return {
      success: true,
      data: template
    };
  } catch (error: any) {
    logger.error("Error fetching email template by ID:", {
      templateId,
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to fetch email template");
  }
}

export async function getEmailTemplateByTypeService(type: EmailTemplateType) {
  try {
    const template = await EmailTemplate.findOne({ type }).lean();

    if (!template) {
      return {
        success: false,
        message: `Email template for type ${type} not found`
      };
    }

    return {
      success: true,
      data: template
    };
  } catch (error: any) {
    logger.error("Error fetching email template by type:", {
      type,
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to fetch email template");
  }
}

export async function createEmailTemplateService(
  input: CreateEmailTemplateInput
) {
  try {
    const existingTemplate = await EmailTemplate.findOne({ type: input.type });

    if (existingTemplate) {
      return {
        success: false,
        message: `Email template for type ${input.type} already exists`
      };
    }

    const availableVariables = EMAIL_TEMPLATE_VARIABLES[input.type] || [];

    const template = await EmailTemplate.create({
      type: input.type,
      subject: input.subject,
      body: input.body,
      availableVariables,
      isActive: input.isActive !== undefined ? input.isActive : true
    });

    logger.info("Email template created:", {
      templateId: template._id,
      type: template.type,
      variables: availableVariables
    });

    return {
      success: true,
      message: "Email template created successfully",
      data: template
    };
  } catch (error: any) {
    logger.error("Error creating email template:", {
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to create email template");
  }
}

export async function updateEmailTemplateService(
  templateId: string,
  input: UpdateEmailTemplateInput
) {
  try {
    const template = await EmailTemplate.findById(templateId);

    if (!template) {
      return {
        success: false,
        message: "Email template not found"
      };
    }

    if (input.subject !== undefined) {
      template.subject = input.subject;
    }

    if (input.body !== undefined) {
      template.body = input.body;
    }

    if (input.isActive !== undefined) {
      template.isActive = input.isActive;
    }

    const predefinedVariables = EMAIL_TEMPLATE_VARIABLES[template.type];
    if (predefinedVariables) {
      template.availableVariables = predefinedVariables;
    }

    await template.save();

    logger.info("Email template updated:", {
      templateId: template._id,
      type: template.type
    });

    return {
      success: true,
      message: "Email template updated successfully",
      data: template
    };
  } catch (error: any) {
    logger.error("Error updating email template:", {
      templateId,
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to update email template");
  }
}

export async function deleteEmailTemplateService(templateId: string) {
  try {
    const template = await EmailTemplate.findByIdAndDelete(templateId);

    if (!template) {
      return {
        success: false,
        message: "Email template not found"
      };
    }

    logger.info("Email template deleted:", {
      templateId,
      type: template.type
    });

    return {
      success: true,
      message: "Email template deleted successfully"
    };
  } catch (error: any) {
    logger.error("Error deleting email template:", {
      templateId,
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to delete email template");
  }
}

export async function toggleEmailTemplateStatusService(templateId: string) {
  try {
    const template = await EmailTemplate.findById(templateId);

    if (!template) {
      return {
        success: false,
        message: "Email template not found"
      };
    }

    template.isActive = !template.isActive;
    await template.save();

    logger.info("Email template status toggled:", {
      templateId,
      type: template.type,
      isActive: template.isActive
    });

    return {
      success: true,
      message: `Email template ${template.isActive ? "activated" : "deactivated"} successfully`,
      data: template
    };
  } catch (error: any) {
    logger.error("Error toggling email template status:", {
      templateId,
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to toggle email template status");
  }
}

export async function getTemplateVariablesService(type: EmailTemplateType) {
  try {
    const variables = EMAIL_TEMPLATE_VARIABLES[type];

    if (!variables) {
      return {
        success: false,
        message: `No variables defined for template type ${type}`
      };
    }

    return {
      success: true,
      data: {
        type,
        variables
      }
    };
  } catch (error: any) {
    logger.error("Error fetching template variables:", {
      type,
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to fetch template variables");
  }
}

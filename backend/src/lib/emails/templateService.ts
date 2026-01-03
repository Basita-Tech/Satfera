import { EmailTemplate, EmailTemplateType } from "../../models";
import { logger } from "../common/logger";

export async function getEmailTemplateByType(
  type: EmailTemplateType
): Promise<{ html: string; text: string; subject: string } | null> {
  try {
    const template = await EmailTemplate.findOne({
      type: type,
      isActive: true
    }).lean();

    if (!template) {
      const inactiveTemplate = await EmailTemplate.findOne({
        type: type
      }).lean();
      if (inactiveTemplate) {
        logger.warn(`Email template found for type: ${type} but it's inactive`);
      } else {
        logger.warn(`No email template found in database for type: ${type}`);
      }
      return null;
    }

    return {
      html: template.body,
      text: template.body.replace(/<[^>]*>/g, ""),
      subject: template.subject
    };
  } catch (error) {
    logger.error(`Error fetching email template for type ${type}:`, error);
    return null;
  }
}

export function replaceTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, "g");
    result = result.replace(placeholder, value || "");
  });

  return result;
}

export async function buildEmailFromTemplate(
  type: EmailTemplateType,
  variables: Record<string, string>
): Promise<{ html: string; text: string; subject: string } | null> {
  const template = await getEmailTemplateByType(type);

  if (!template) {
    return null;
  }

  return {
    html: replaceTemplateVariables(template.html, variables),
    text: replaceTemplateVariables(template.text, variables),
    subject: replaceTemplateVariables(template.subject, variables)
  };
}

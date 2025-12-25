import mongoose, { Document, Schema } from "mongoose";

export enum EmailTemplateType {
  ForgotPassword = "FORGOT_PASSWORD",
  Signup = "SIGNUP",
  ResetPassword = "RESET_PASSWORD",
  WelcomeEmail = "WELCOME_EMAIL",
  ProfileReview = "PROFILE_REVIEW",
  ProfileApproved = "PROFILE_APPROVED",
  ProfileRejected = "PROFILE_REJECTED",
  ProfileRectification = "PROFILE_RECTIFICATION",
  AccountDeactivation = "ACCOUNT_DEACTIVATION",
  AccountDeletion = "ACCOUNT_DELETION",
  AccountActivation = "ACCOUNT_ACTIVATION",
  SubscriptionRenewal = "SUBSCRIPTION_RENEWAL",
  SubscriptionCancellation = "SUBSCRIPTION_CANCELLATION",
  PaymentFailed = "PAYMENT_FAILED",
  TrialEndingSoon = "TRIAL_ENDING_SOON",
  PromotionOffer = "PROMOTION_OFFER",
  SystemMaintenance = "SYSTEM_MAINTENANCE",
  AccountSuspensionWarning = "ACCOUNT_SUSPENSION_WARNING",
  LegalUpdate = "LEGAL_UPDATE",
  AppUpdateNotification = "APP_UPDATE_NOTIFICATION",
  Newsletter = "NEWSLETTER"
}

export const EMAIL_TEMPLATE_VARIABLES: Record<EmailTemplateType, string[]> = {
  [EmailTemplateType.ForgotPassword]: ["otp", "brandName"],
  [EmailTemplateType.Signup]: ["otp", "brandName"],
  [EmailTemplateType.ResetPassword]: ["resetLink", "brandName"],
  [EmailTemplateType.WelcomeEmail]: [
    "userName",
    "username",
    "loginLink",
    "supportContact",
    "brandName"
  ],
  [EmailTemplateType.ProfileReview]: ["userName", "brandName"],
  [EmailTemplateType.ProfileApproved]: ["userName", "loginLink", "brandName"],
  [EmailTemplateType.ProfileRejected]: ["userName", "reason", "brandName"],
  [EmailTemplateType.ProfileRectification]: ["userName", "reason", "brandName"],
  [EmailTemplateType.AccountDeactivation]: ["userName", "brandName"],
  [EmailTemplateType.AccountDeletion]: ["userName", "brandName"],
  [EmailTemplateType.AccountActivation]: ["userName", "brandName"],
  [EmailTemplateType.SubscriptionRenewal]: [
    "userName",
    "planName",
    "renewalDate",
    "amount",
    "brandName"
  ],
  [EmailTemplateType.SubscriptionCancellation]: [
    "userName",
    "planName",
    "endDate",
    "brandName"
  ],
  [EmailTemplateType.PaymentFailed]: [
    "userName",
    "amount",
    "reason",
    "retryLink",
    "brandName"
  ],
  [EmailTemplateType.TrialEndingSoon]: [
    "userName",
    "daysLeft",
    "upgradeLink",
    "brandName"
  ],
  [EmailTemplateType.PromotionOffer]: [
    "userName",
    "offerTitle",
    "offerDetails",
    "offerLink",
    "expiryDate",
    "brandName"
  ],
  [EmailTemplateType.SystemMaintenance]: [
    "userName",
    "maintenanceDate",
    "duration",
    "brandName"
  ],
  [EmailTemplateType.AccountSuspensionWarning]: [
    "userName",
    "reason",
    "actionRequired",
    "brandName"
  ],
  [EmailTemplateType.LegalUpdate]: [
    "userName",
    "updateTitle",
    "updateDetails",
    "effectiveDate",
    "brandName"
  ],
  [EmailTemplateType.AppUpdateNotification]: [
    "userName",
    "version",
    "features",
    "updateLink",
    "brandName"
  ],
  [EmailTemplateType.Newsletter]: [
    "userName",
    "newsletterContent",
    "unsubscribeLink",
    "brandName"
  ]
};

export interface EmailTemplate extends Document {
  type: EmailTemplateType;
  subject: string;
  body: string;
  isActive: boolean;
  availableVariables: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<EmailTemplate>(
  {
    type: {
      type: String,
      enum: Object.values(EmailTemplateType),
      required: true,
      unique: true
    },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    availableVariables: { type: [String], default: [] },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

EmailTemplateSchema.pre("save", function (next) {
  if (this.type && EMAIL_TEMPLATE_VARIABLES[this.type]) {
    this.availableVariables = EMAIL_TEMPLATE_VARIABLES[this.type];
  }
  next();
});

export const EmailTemplate =
  (mongoose.models.EmailTemplate as mongoose.Model<EmailTemplate>) ||
  mongoose.model<EmailTemplate>("EmailTemplate", EmailTemplateSchema);

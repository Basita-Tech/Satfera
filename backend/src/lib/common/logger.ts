import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  if (stack) {
    return `${timestamp} [${level}]: ${message}\n${stack}`;
  }
  return `${timestamp} [${level}]: ${message}`;
});

// Only use file transports in non-serverless environments
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(colorize(), logFormat)
  })
];

// Add file transports only if not on Vercel/serverless (filesystem is writable)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
if (!isServerless) {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880,
      maxFiles: 5
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
  transports,
  exceptionHandlers: isServerless
    ? [new winston.transports.Console()]
    : [new winston.transports.File({ filename: "logs/exceptions.log" })],
  rejectionHandlers: isServerless
    ? [new winston.transports.Console()]
    : [new winston.transports.File({ filename: "logs/rejections.log" })]
});

export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

export const logError = (error: Error | any, context?: string) => {
  const message = context
    ? `${context}: ${error.message || error}`
    : error.message || error;
  logger.error(message, { stack: error.stack });
};

export const logInfo = (message: string) => {
  logger.info(message);
};

export const logWarning = (message: string) => {
  logger.warn(message);
};

export const logDebug = (message: string) => {
  logger.debug(message);
};

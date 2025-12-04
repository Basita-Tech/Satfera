# Satfera Backend API

A secure, production-ready matrimony platform backend built with Node.js, Express, TypeScript, MongoDB, and Redis.

## 📋 Prerequisites

- Node.js >= 22.x
- MongoDB >= 6.x
- Redis >= 7.x
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd Satfera/backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup environment variables**

```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration:

- **JWT_SECRET**: Must be at least 32 characters (generate a secure one!)
- **MONGO_URI**: Your MongoDB connection string
- **REDIS_URL**: Your Redis connection string
- **SMTP credentials**: For email sending
- **Twilio credentials**: For SMS OTP

4. **Build the project**

```bash
npm run build
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Build Docker Image Only

```bash
docker build -t satfera-backend .
docker run -p 3000:3000 --env-file .env satfera-backend
```

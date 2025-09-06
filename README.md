# LeafTrack - SohagTea Management System

A modern inventory management solution designed for tea distribution networks with role-based access for admins and salesmen.

## Features

- **Inventory Management**: Complete control over tea leaf products and categories
- **Role-Based Access**: Separate dashboards for admins and salesmen
- **Stock Assignment**: Efficiently assign inventory to field salesmen
- **Financial Management**: GST-compliant invoicing and financial tracking
- **Secure Access**: JWT-based authentication for secure operations

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account
- npm or yarn

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your actual values:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
   JWT_SECRET=your-secure-jwt-secret-key
   NEXTAUTH_SECRET=your-nextauth-secret
   NEXTAUTH_URL=http://localhost:3000
   NODE_ENV=development
   ```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Security Notes

- **Never commit `.env` files** - They contain sensitive credentials
- **Use strong JWT secrets** - Generate random, complex secret keys
- **Environment variables** - All sensitive data should be stored in environment variables

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas
- **Authentication**: JWT
- **UI Components**: Shadcn/ui
- **Fonts**: Playfair Display, Montserrat, Inter

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

Private - SohagTea Distribution Network

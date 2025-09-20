# 🚀 LeafTrack Production Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Code Preparation (Week 1)

#### Day 1-2: Security Audit
- [ ] Run security audit: `npm run security:audit`
- [ ] Remove all console.log statements: `npm run cleanup:prod`
- [ ] Update all passwords from defaults
- [ ] Review and fix all CRITICAL issues in SECURITY-AUDIT.md
- [ ] Implement input validation using Zod schemas
- [ ] Add CSRF protection to all forms

#### Day 3-4: Code Quality
- [ ] Fix all TypeScript errors: `npm run type-check`
- [ ] Fix all ESLint issues: `npm run lint:fix`
- [ ] Add error boundaries to all pages
- [ ] Implement proper error handling in API routes
- [ ] Add loading states and skeletons

#### Day 5-7: Testing
- [ ] Write unit tests for critical functions
- [ ] Test all API endpoints manually
- [ ] Test user flows (login, signup, sales, invoicing)
- [ ] Test on different browsers and devices
- [ ] Performance testing with Lighthouse

### 2. Infrastructure Setup (Week 2)

#### Database
```bash
# 1. Create production MongoDB cluster
# 2. Set up replica set for high availability
# 3. Enable authentication and SSL
# 4. Create database indexes
npm run db:indexes

# 5. Set up automated backups
# 6. Test restore procedure
```

#### Hosting (Vercel/AWS/DigitalOcean)
```bash
# 1. Set up production environment
# 2. Configure domain and SSL certificates
# 3. Set up CDN for static assets
# 4. Configure environment variables
# 5. Set up monitoring and alerts
```

### 3. Deployment Steps

#### Step 1: Final Code Preparation
```bash
# Clean up development artifacts
npm run cleanup:prod

# Run pre-deployment checks
node scripts/pre-deployment-check.js

# Build production bundle
NODE_ENV=production npm run build

# Test production build locally
npm run start
```

#### Step 2: Environment Configuration
```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with production values
# IMPORTANT: Generate new secrets!
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 64  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For NEXTAUTH_SECRET
```

#### Step 3: Database Migration
```bash
# 1. Backup current database
npm run db:backup

# 2. Create indexes
npm run db:indexes

# 3. Run optimization
npm run db:optimize

# 4. Verify database health
node scripts/check-db-health.js
```

#### Step 4: Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
# OR use CLI:
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
# ... add all other env variables
```

#### Alternative: Deploy to VPS
```bash
# SSH to your server
ssh user@your-server.com

# Clone repository
git clone https://github.com/your-repo/leaftrack.git
cd leaftrack

# Install dependencies
npm ci --production

# Set up PM2 for process management
npm install -g pm2

# Start application
pm2 start npm --name "leaftrack" -- start
pm2 save
pm2 startup

# Set up Nginx reverse proxy
sudo nano /etc/nginx/sites-available/leaftrack
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Post-Deployment

#### Immediate Tasks (Day 1)
- [ ] Verify all pages load correctly
- [ ] Test authentication flow
- [ ] Test core features (products, sales, invoices)
- [ ] Check error tracking is working
- [ ] Verify SSL certificate
- [ ] Test email notifications
- [ ] Monitor server resources

#### First Week
- [ ] Monitor error logs daily
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Monitor database performance
- [ ] Check backup automation
- [ ] Review security logs

### 5. Monitoring Setup

#### Error Tracking (Sentry)
```javascript
// Install Sentry
npm install @sentry/nextjs

// Configure in sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### Application Monitoring
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure alert thresholds
- Set up status page
- Monitor API response times

#### Log Management
```javascript
// Use Winston for structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 6. Security Hardening

#### Headers & CSP
```javascript
// Already configured in next.config.production.js
// Verify headers are applied:
curl -I https://yourdomain.com
```

#### Rate Limiting
```javascript
// Implement Redis-based rate limiting
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Configure in API routes
const limiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

#### API Security
- [ ] Implement API versioning
- [ ] Add request signing for sensitive endpoints
- [ ] Set up API key management
- [ ] Implement request/response validation
- [ ] Add audit logging

### 7. Performance Optimization

#### Frontend
- [ ] Enable image optimization
- [ ] Implement lazy loading
- [ ] Use Next.js ISR for static pages
- [ ] Optimize bundle size
- [ ] Enable compression

#### Backend
- [ ] Implement caching strategy
- [ ] Optimize database queries
- [ ] Use connection pooling
- [ ] Enable query result caching
- [ ] Implement pagination

#### Database
```javascript
// Add indexes (already in db-optimization.ts)
await createIndexes(connection);

// Enable query profiling in development
db.setProfilingLevel(2);

// Monitor slow queries
db.system.profile.find({ millis: { $gt: 100 } });
```

### 8. Backup & Disaster Recovery

#### Automated Backups
```bash
# Set up cron job for daily backups
0 2 * * * /usr/bin/node /app/scripts/backup-database.js

# Store backups in S3
aws s3 cp backup.tar.gz s3://your-backup-bucket/
```

#### Recovery Plan
1. Document recovery procedures
2. Test restore process monthly
3. Keep multiple backup generations
4. Store backups in different regions
5. Document RTO/RPO targets

### 9. Scaling Considerations

#### Horizontal Scaling
- Use MongoDB replica sets
- Implement Redis for sessions
- Use CDN for static assets
- Consider microservices architecture
- Implement queue system for heavy tasks

#### Vertical Scaling
- Monitor resource usage
- Upgrade server specs as needed
- Optimize database queries
- Implement caching layers
- Use connection pooling

### 10. Maintenance Plan

#### Regular Tasks
- **Daily**: Check error logs, monitor performance
- **Weekly**: Review security alerts, update dependencies
- **Monthly**: Security audit, performance review
- **Quarterly**: Penetration testing, disaster recovery drill

#### Update Strategy
```bash
# Test updates in staging first
git checkout -b staging
npm update
npm audit fix
npm test
# If all tests pass, merge to production
```

## 📱 Support Contacts

- **Technical Issues**: tech-support@yourdomain.com
- **Security Issues**: security@yourdomain.com
- **Database Admin**: dba@yourdomain.com
- **Emergency**: +91-XXXXXXXXXX

## 📚 Additional Resources

- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)
- [MongoDB Production Checklist](https://docs.mongodb.com/manual/administration/production-checklist/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## ✅ Final Checklist

Before going live:
- [ ] All critical security issues fixed
- [ ] Production environment variables set
- [ ] SSL certificate installed
- [ ] Monitoring and alerts configured
- [ ] Backup system tested
- [ ] Error tracking enabled
- [ ] Rate limiting configured
- [ ] Security headers applied
- [ ] Database optimized
- [ ] Documentation updated
- [ ] Team trained on procedures
- [ ] Support channels established

## 🎉 Launch Day Protocol

1. **Deploy during low-traffic hours**
2. **Monitor closely for first 24 hours**
3. **Have rollback plan ready**
4. **Keep team on standby**
5. **Document any issues**
6. **Celebrate success! 🚀**

---

**Last Updated**: September 2024
**Version**: 1.0.0
**Status**: READY FOR PRODUCTION DEPLOYMENT

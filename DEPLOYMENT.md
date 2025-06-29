# Deployment Guide

This guide covers deploying the Hybrid Canvas application using our CI/CD pipeline.

## 🚀 Quick Deployment

### Prerequisites
- Node.js 18.x or 20.x
- npm or yarn
- OpenAI API key
- Vercel account (for deployment)

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp env.template .env
   ```

2. **Configure environment variables:**
   ```bash
   # Required
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
   # Optional
   VITE_APP_ENVIRONMENT=production
   VITE_DEBUG_MODE=false
   ```

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔄 CI/CD Pipeline

Our GitHub Actions workflow automatically:

1. **Tests** - Runs on Node.js 18.x and 20.x
2. **Builds** - Creates optimized production builds
3. **Deploys** - Automatic deployment to staging/production

### Workflow Triggers
- **Push to `main`** → Production deployment
- **Push to `develop`** → Staging deployment
- **Pull Requests** → Test and build validation

### Required Secrets

Configure these in your GitHub repository settings:

```bash
# Vercel Deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id

# Security Scanning (Optional)
SNYK_TOKEN=your_snyk_token
```

## 📦 Manual Deployment

### Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to preview:**
   ```bash
   npm run deploy:preview
   ```

3. **Deploy to production:**
   ```bash
   npm run deploy:vercel
   ```

### Other Platforms

The application can be deployed to any static hosting service:

- **Netlify**: Drag and drop the `dist` folder
- **GitHub Pages**: Use the built-in Actions workflow
- **AWS S3**: Upload `dist` contents to S3 bucket
- **Firebase Hosting**: Use Firebase CLI

## 🔧 Build Configuration

### Production Optimizations

- **Code Splitting**: Vendor and TLDraw chunks separated
- **Minification**: ESBuild minification enabled
- **Tree Shaking**: Unused code eliminated
- **Asset Optimization**: Images and fonts optimized

### Build Scripts

```bash
npm run build              # Standard production build
npm run build:staging      # Staging environment build
npm run build:production   # Production environment build
npm run clean              # Clean build artifacts
```

## 🛡️ Security

### Environment Variables
- Never commit `.env` files
- Use platform-specific environment variable management
- Rotate API keys regularly

### Content Security Policy
Configured in `vercel.json`:
- Restricts script sources
- Allows OpenAI API connections
- Prevents XSS attacks

### Headers
Security headers automatically applied:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

## 📊 Monitoring

### Build Status
- GitHub Actions provides build status
- Vercel dashboard shows deployment status
- Automated notifications on failures

### Performance
- Bundle size warnings for chunks > 1MB
- Build time optimization
- Lighthouse scores in CI

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   npm run clean
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Environment Variables Not Loading**
   - Verify `.env` file exists
   - Check variable names start with `VITE_`
   - Restart development server

3. **Deployment Failures**
   - Check Vercel token permissions
   - Verify project ID is correct
   - Review build logs in Vercel dashboard

### Debug Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Test coverage
npm run test:ci

# Build analysis
npm run build -- --analyze
```

## 📈 Performance Optimization

### Bundle Analysis
- TLDraw library is the largest chunk (~1.6MB gzipped)
- Consider lazy loading for non-critical features
- Monitor bundle size with each deployment

### Caching Strategy
- Static assets cached for 1 year
- HTML files not cached
- Service worker for offline functionality (future)

## 🔄 Continuous Deployment

### Branch Strategy
- `main` → Production (auto-deploy)
- `develop` → Staging (auto-deploy)
- Feature branches → Preview deployments

### Release Process
1. Create feature branch
2. Develop and test locally
3. Create pull request to `develop`
4. Review and merge to `develop` (staging deploy)
5. Merge `develop` to `main` (production deploy)

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [TLDraw Documentation](https://tldraw.dev/)

## 🆘 Support

For deployment issues:
1. Check this guide first
2. Review GitHub Actions logs
3. Check Vercel deployment logs
4. Consult project README.md

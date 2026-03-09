# Production Deployment Guide

## Pre-Deployment Checklist

### Security
- [ ] Run `npm audit` and fix all vulnerabilities
- [ ] Update all dependencies to latest stable versions
- [ ] Remove all console.log statements (except logger)
- [ ] Verify all environment variables are set correctly
- [ ] Enable HTTPS/TLS on all endpoints
- [ ] Configure CSP headers
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable DDoS protection

### Configuration
- [ ] Set `VITE_AUTH_PROVIDER=auth0` (or your provider)
- [ ] Configure Auth0 tenant and application
- [ ] Set up Sentry project and obtain DSN
- [ ] Create Google Analytics property
- [ ] Configure S3/Azure Blob Storage for images
- [ ] Set up backend API endpoint
- [ ] Configure CORS on API
- [ ] Set session timeout to production value (15 min)

### Testing
- [ ] Run full unit test suite (`npm test`)
- [ ] Run E2E tests (`npm run test:e2e`)
- [ ] Manual testing on staging environment
- [ ] Load testing (100+ concurrent users)
- [ ] Security penetration testing
- [ ] HIPAA compliance verification
- [ ] Accessibility audit (WCAG 2.1 AA)

### Monitoring
- [ ] Set up Sentry alerts
- [ ] Configure uptime monitoring (Pingdom, UptimeRobot)
- [ ] Set up log aggregation (DataDog, Splunk)
- [ ] Configure error alerting (PagerDuty, Slack)
- [ ] Set up performance monitoring (New Relic, Lighthouse CI)

## Deployment Options

### Option 1: Vercel (Recommended for Quick Deploy)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Environment Variables in Vercel:**
1. Go to Project Settings → Environment Variables
2. Add all `VITE_*` variables
3. Mark sensitive variables as "Encrypted"
4. Set appropriate environment (Production/Preview/Development)

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Option 2: AWS (S3 + CloudFront)

**Step 1: Build**
```bash
npm run build
```

**Step 2: Create S3 Bucket**
```bash
aws s3 mb s3://dermmap-production
aws s3 website s3://dermmap-production --index-document index.html --error-document index.html
```

**Step 3: Upload**
```bash
aws s3 sync dist/ s3://dermmap-production --delete --cache-control max-age=31536000,public
```

**Step 4: Create CloudFront Distribution**
```bash
aws cloudfront create-distribution \
  --origin-domain-name dermmap-production.s3.amazonaws.com \
  --default-root-object index.html
```

**Step 5: Invalidate Cache on Updates**
```bash
aws cloudfront create-invalidation --distribution-id EXXXXXXXXXXXXX --paths "/*"
```

**CloudFront Configuration:**
- Enable HTTPS only
- Set up custom domain with Route 53
- Configure WAF rules
- Enable compression
- Set cache behaviors:
  - `/assets/*` → Cache for 1 year
  - `/index.html` → No cache
  - `/manifest.webmanifest` → Cache for 1 day

### Option 3: Docker + Kubernetes

**Build Docker Image:**
```bash
docker build -t dermmap:latest .
docker tag dermmap:latest your-registry.com/dermmap:latest
docker push your-registry.com/dermmap:latest
```

**Kubernetes Deployment** (`k8s/deployment.yaml`):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dermmap
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dermmap
  template:
    metadata:
      labels:
        app: dermmap
    spec:
      containers:
      - name: dermmap
        image: your-registry.com/dermmap:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_API_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: dermmap-config
              key: api_url
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: dermmap
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: dermmap
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dermmap
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - dermmap.io
    secretName: dermmap-tls
  rules:
  - host: dermmap.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dermmap
            port:
              number: 80
```

**Deploy:**
```bash
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/dermmap
```

### Option 4: Azure Static Web Apps

```bash
# Install Azure CLI
az login

# Create resource group
az group create --name dermmap-rg --location eastus

# Create static web app
az staticwebapp create \
  --name dermmap \
  --resource-group dermmap-rg \
  --location eastus \
  --branch main \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github
```

## CI/CD Pipeline

### GitHub Actions Production Deploy

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}
          VITE_AUTH0_DOMAIN: ${{ secrets.AUTH0_DOMAIN }}
          VITE_AUTH0_CLIENT_ID: ${{ secrets.AUTH0_CLIENT_ID }}
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          VITE_GA_MEASUREMENT_ID: ${{ secrets.GA_MEASUREMENT_ID }}
      
      - name: Deploy to S3
        run: aws s3 sync dist/ s3://dermmap-production --delete
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

## Post-Deployment

### Smoke Tests
```bash
# Test production URL
curl https://dermmap.io
curl https://api.dermmap.io/health
```

### Monitoring Setup
1. **Sentry**: Verify errors are being captured
2. **Analytics**: Check that pageviews are logged
3. **Uptime**: Confirm monitoring is active
4. **Logs**: Verify CloudWatch/DataDog integration

### DNS Configuration
```
A Record:    @ → Your IP
CNAME:       www → @
TXT:         _dmarc → "v=DMARC1; p=none; rua=mailto:security@dermmap.io"
```

### SSL Certificate
- Use Let's Encrypt for free SSL
- Auto-renewal with cert-manager
- A+ rating on SSL Labs

## Rollback Procedure

### Vercel
```bash
vercel rollback [deployment-url]
```

### AWS S3/CloudFront
```bash
# Restore previous version
aws s3 sync s3://dermmap-backup/ s3://dermmap-production/ --delete
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

### Kubernetes
```bash
kubectl rollout undo deployment/dermmap
kubectl rollout status deployment/dermmap
```

## Scaling Considerations

### Horizontal Scaling
- CloudFront automatically scales
- Kubernetes HPA (Horizontal Pod Autoscaler):
  ```yaml
  apiVersion: autoscaling/v2
  kind: HorizontalPodAutoscaler
  metadata:
    name: dermmap
  spec:
    scaleTargetRef:
      apiVersion: apps/v1
      kind: Deployment
      name: dermmap
    minReplicas: 3
    maxReplicas: 10
    metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  ```

### CDN Optimization
- Use CloudFront, Cloudflare, or Fastly
- Configure regional caching
- Enable HTTP/3 and Brotli compression

### Database (Backend)
- Use RDS with read replicas
- Enable connection pooling
- Implement caching layer (Redis)

## Maintenance

### Weekly
- [ ] Review Sentry errors
- [ ] Check uptime reports
- [ ] Monitor API performance
- [ ] Review audit logs for anomalies

### Monthly
- [ ] Update dependencies (`npm update`)
- [ ] Run security audit (`npm audit`)
- [ ] Review analytics data
- [ ] Backup verification test
- [ ] Disaster recovery drill

### Quarterly
- [ ] Penetration testing
- [ ] HIPAA compliance review
- [ ] Performance optimization
- [ ] Cost optimization review

## Support Contacts

- **Security Issues**: security@dermmap.io
- **Technical Support**: support@dermmap.io
- **On-Call**: +1-XXX-XXX-XXXX

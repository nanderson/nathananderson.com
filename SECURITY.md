# Security Policy

## Overview

This document outlines the security measures implemented for this Hugo-based CTO personal website, including security best practices, CI/CD security workflows, and deployment configurations.

## Security Features Implemented

### 1. Secure Hugo Configuration

- **Unsafe HTML Rendering Disabled**: `unsafe = false` in `hugo.toml` prevents XSS vulnerabilities
- **HTTPS Enforcement**: baseURL configured for HTTPS only
- **Content Security Policy**: Comprehensive CSP headers configured

### 2. CI/CD Security Workflows

#### Security Audit Workflow (`.github/workflows/security.yml`)

- **Automated Security Scanning**: Daily security audits at 2 AM UTC
- **Dependency Vulnerability Checks**: Audit Node.js dependencies in themes
- **Static Security Analysis**: Scans for hardcoded secrets and unsafe configurations
- **CSP Compliance Checks**: Validates generated HTML for Content Security Policy compliance
- **HTTPS Verification**: Ensures production builds use HTTPS

#### Build Check Workflow (`.github/workflows/ci.yml`)

- **Pre-build checks**: Validates the HTTPS baseURL and scans for sensitive files
- **Build verification**: Confirms every key page, `robots.txt`, `llms.txt` and the sitemap
  are produced and non-empty
- **Link and structured-data checks**: Fails the build on broken internal references or
  invalid JSON-LD
- **Publishes nothing**: deployment is handled by Cloudflare Pages

### 3. Cloudflare Pages Security Configuration

Deployment is Cloudflare Pages, building directly from this repository on push to `main`.

**Required build settings** (Cloudflare dashboard → Workers & Pages → Settings → Build):

| Setting | Value |
|---|---|
| Build command | `hugo --gc --minify` |
| Output directory | `public` |
| `HUGO_VERSION` | `0.164.0` (minimum `0.146`) |

`HUGO_VERSION` matters: Cloudflare's default Hugo is far older than 0.146, and the templates
rely on the `layouts/<section>/page.html` lookup introduced in that release. On an older
version blog posts and standalone pages render blank.

#### Security Headers (`static/_headers`)

Cloudflare Pages serves the headers declared in `static/_headers`. The active policy:

```
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
  connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com;
  img-src 'self' data: https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
```

The policy is deliberately tight: the site self-hosts its CSS and fonts and loads no CDN
scripts, so Google Analytics is the only permitted third-party origin. `'unsafe-inline'`
covers the small theme-initialisation script and the inline critical styles.

`static/_headers` also sets immutable caching for fingerprinted assets under `/css/` and
`/images/`, and forces revalidation on HTML.

### 4. Static Security Files

#### robots.txt (generated — `layouts/index.robots.txt`)
- Explicitly allows search crawlers and AI/assistant crawlers (GPTBot, ClaudeBot,
  PerplexityBot, Google-Extended, Applebot-Extended and others)
- Blocks commercial SEO scrapers (SemrushBot, AhrefsBot, MJ12bot)
- References the sitemap via an absolute, generated URL

Note: it is generated rather than static so the `Sitemap:` directive resolves against
`baseURL`. A static `static/robots.txt` would ship the template placeholder verbatim.

#### security.txt (`static/.well-known/security.txt`)
- RFC 9116 compliant disclosure record
- Contact address, policy link, and preferred language

**Maintenance**: the `Expires` field must stay in the future or the record is invalid.
Review it annually — it is currently set to 2027-08-11.

### 5. Repository Security

#### .gitignore
- Excludes build artifacts and temporary files
- Prevents accidental commit of:
  - Environment variables (`.env` files)
  - SSL certificates and keys
  - IDE configurations
  - System files
  - Dependency directories

## Security Best Practices

### For Developers

1. **Never commit sensitive information**:
   - API keys, passwords, or tokens
   - SSL certificates or private keys
   - Database credentials
   - Personal information

2. **Keep dependencies updated**:
   - Regularly update Hugo version
   - Monitor theme dependencies for vulnerabilities
   - Use `npm audit` for Node.js dependencies

3. **Validate all external content**:
   - Sanitize user inputs (if any)
   - Validate external images and links
   - Use CSP-compliant external resources

### For Deployment

1. **Use HTTPS everywhere**:
   - Configure HTTPS for all environments
   - Use HSTS headers
   - Verify SSL certificate validity

2. **Implement proper headers**:
   - Content Security Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Referrer-Policy

3. **Regular security audits**:
   - Automated daily security scans
   - Manual security reviews for major changes
   - Monitor security advisories

## Vulnerability Reporting

### How to Report

If you discover a security vulnerability in this website:

1. **Email**: nathan@nathananderson.com (see `/.well-known/security.txt`)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fixes (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 48 hours
- **Resolution**: Based on severity (1-30 days)
- **Disclosure**: Coordinated disclosure after fix

## Security Testing

### Automated Tests

- **CI/CD Security Scans**: Every push and pull request
- **Daily Security Audits**: Scheduled security checks
- **Dependency Scanning**: Automated vulnerability detection

### Manual Testing

- **Penetration Testing**: Recommended annually
- **Code Review**: Security-focused code reviews
- **Configuration Audits**: Regular security configuration reviews

## Compliance and Standards

### Security Standards

- **OWASP**: Following OWASP Web Application Security standards
- **RFC 9116**: Compliant security.txt implementation
- **Mozilla Security Guidelines**: Following Mozilla's web security recommendations

### Privacy

- **Data Minimization**: Only collect necessary data
- **Analytics**: Google Analytics with anonymized IPs
- **Cookies**: Minimal cookie usage
- **GDPR**: Compliance considerations for EU visitors

## Security Monitoring

### Alerts and Notifications

- **GitHub Security Alerts**: Automated dependency vulnerability alerts
- **Build Failures**: CI/CD pipeline failure notifications
- **Security Headers**: Regular validation of security headers

### Metrics and Reporting

- **Security Score**: Regular security posture assessment
- **Vulnerability Metrics**: Track and trend vulnerability discovery/resolution
- **Compliance Status**: Regular compliance status reporting

## Emergency Response

### Security Incident Response

1. **Immediate Actions**:
   - Assess the scope and impact
   - Contain the vulnerability
   - Notify stakeholders

2. **Investigation**:
   - Determine root cause
   - Document the incident
   - Assess data impact

3. **Resolution**:
   - Implement fixes
   - Deploy security patches
   - Verify resolution

4. **Post-Incident**:
   - Conduct post-mortem
   - Update security measures
   - Improve incident response

## Updates and Maintenance

### Security Updates

- **Hugo Updates**: Monthly Hugo version updates
- **Theme Updates**: Regular theme security updates
- **Dependency Updates**: Weekly dependency checks
- **Security Patches**: Immediate application of critical security patches

### Documentation

- **Security Policy**: Quarterly review and updates
- **Procedures**: Annual procedure review
- **Training**: Regular security awareness updates

---

**Last Updated**: 2025-07-27  
**Next Review**: 2025-10-27  
**Version**: 1.0
# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

My name is Nathan Anderson. I'm a Chief Technology Officer and the Co-founder of Tú TeleDoc ( https://tuteledoc.com/ ), an early-stage, pre-revenue, telemedicine start-up focusing on Mexico and Latin America. I am born and raised in San Antonio, Texas and I am proud to have a built a career in this city. I am a board Member of Tech Bloc ( https://satechbloc.com/ ) and the Leadership San Antonio Alumni Association. I help mentor young software engineers, and software engineering leaders as well as entrepreneurs at local Universities. I also consult as a Fractional CTO.

This website is my professional website and blog.

## Build and Development Commands

### Run Development Server
```bash
hugo serve
```
The site will be available at http://localhost:1313. Hugo has live reload enabled by default.

### Build Static Site
```bash
hugo --minify
```
Builds the site to `public/` directory.

### Configuration

- `hugo.toml` — all configuration. Site content (hero, services, stats, case notes,
  about, experience) lives in `[params]` and is rendered by the templates in `layouts/`.
  Change copy there, not in the templates.

## Architecture and Design

### Hugo Static Site Generator

Hugo **extended**, 0.146 or newer (0.164 in CI). The minimum matters: the templates use the
`layouts/<section>/page.html` lookup introduced in 0.146. On older versions blog posts and
standalone pages render blank.

### Theming

The site does **not** use a third-party theme. All templates are in `layouts/` and all styling
is one file, `assets/css/main.css`, compiled by Hugo Pipes (minified + fingerprinted).
There is no Bootstrap, no FontAwesome, and no webfont download — headings use a system serif
stack and body copy a system sans stack, so first paint costs zero network requests beyond HTML+CSS.

`themes/hugo-profile` remains as a git submodule for reference but is no longer referenced by
`hugo.toml`. It can be removed entirely once you're happy with the new layouts.

### Images

Source images live in `assets/images/` (NOT `static/images/`) so Hugo can process them.
`layouts/partials/image.html` generates responsive `srcset` variants and lazy-loads everything
below the fold. Drop a full-resolution original in `assets/images/` and reference it from front
matter as `/images/...`; the render hook and partials resolve it automatically.

Never put large images in `static/` — they are copied verbatim with no resizing.

### Build Pipeline

1. **Local development**: `hugo serve`
2. **Static site**: `hugo --gc --minify` generates HTML to `public/`
3. **Deployment**: **Cloudflare Pages**, building directly from this repository on push
   to `main`. GitHub Actions does not deploy — `.github/workflows/ci.yml` only verifies
   that a push builds cleanly (broken links, JSON-LD validity, required files).

#### Cloudflare Pages build settings

| Setting | Value |
|---|---|
| Build command | `hugo --gc --minify` |
| Output directory | `public` |
| `HUGO_VERSION` | `0.164.0` |

**`HUGO_VERSION` is not optional.** Cloudflare's default Hugo predates 0.146, and these
templates need the `layouts/<section>/page.html` lookup introduced there. Without it,
blog posts and standalone pages build blank with no error.

`.tool-versions` in the repository root pins `hugo 0.164.0` as a belt-and-braces measure
(Cloudflare's v2 build image reads it, as do asdf and mise locally). Three places must
stay in step when upgrading Hugo: `.tool-versions`, the `HUGO_VERSION` variable in the
Cloudflare dashboard, and `hugo-version` in `.github/workflows/ci.yml`.

`static/_headers` supplies the caching and security headers — Cloudflare Pages reads it
at deploy time. Fingerprinted assets under `/css/` and `/images/` are served immutable
for a year; HTML always revalidates.

### SEO and AI discoverability

- `layouts/partials/head/schema.html` emits a **single** JSON-LD `@graph` per page.
  It is the only source of structured data — don't add competing blocks.
- `layouts/index.llms.txt` generates `/llms.txt` from site params, so it can't drift
  out of date. Update `[params]`, not a static file.
- `layouts/robots.txt` is generated so the `Sitemap:` directive resolves correctly.
- The services page carries FAQ schema via its `faq:` front matter.

## Coding Standards

### Markdown Formatting

- **Indentation**: 4 spaces for markdown files
- **Line endings**: LF (Unix-style)
- **Trailing whitespace**: Preserved in markdown (see `.editorconfig`)
- **Encoding**: UTF-8

### Content Guidelines

#### Themes

1.  The Start-up Trenches: Fundraising, LatAm market nuances, and pre-revenue pivots.
2.  The AI-First CTO: How 30 years of experience meets 2026’s AI-native development.
3.  Human Capital: Mentorship, engineering culture, and the "Leadership San Antonio" mindset.
4.  Ecosystem Spotlight: Why San Antonio is the "Hidden Gem" of tech.

#### The "Vibe"

- Lean into your "Modern Veteran" persona.
- Use phrases like "I’ve seen this movie before (in 1998, 2008, and 2018)..." to ground your AI advice in historical context.
- See existing content in `/content/blog` for examples of my voice.

#### The Hook

- Start with a specific problem. Instead of "Mentorship is good," try "A student at UTSA asked me a question yesterday that made me realize we’re teaching software engineering all wrong."

#### Visuals

- Since you have a broad background, post a photo of an old server rack next to a screenshot of an AI-generated code review. It shows the breadth of your journey.

#### Social Media Notes

-  LinkedIn vs. Blog: Use your blog for the "long-form" version (SEO) and post a "TL;DR" version to LinkedIn with a "Read the full story here" link. This drives traffic back to your personal brand home.

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

- `config.toml` - Hugo configuration with language settings and theme configuration

## Architecture and Design

### Hugo Static Site Generator

This project uses Hugo with the "hugo-profile" theme. Hugo is required in its "extended" version (currently 0.131.0 in CI) to support advanced features.

### Build Pipeline

1. **Local Development**: Hugo server with live reload
2. **Static Site**: Hugo generates HTML to `public/`
3. **Cloud Flare Pages Deployment**: CI publishes to nathananderson.com

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

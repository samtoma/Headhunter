# How to Convert the Presentation

## Quick Start

The presentation is in `/srv/Celine/dev/Headhunter/docs/HEADHUNTER_PRESENTATION.md`

## Option 1: PDF (Recommended)

### Using Pandoc

```bash
cd /srv/Celine/dev/Headhunter/docs

# Simple PDF
pandoc HEADHUNTER_PRESENTATION.md -o HEADHUNTER_PRESENTATION.pdf

# Professional PDF with formatting
pandoc HEADHUNTER_PRESENTATION.md -o HEADHUNTER_PRESENTATION.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  --toc \
  --number-sections
```

### Using Marp

```bash
npm install -g @marp-team/marp-cli
marp HEADHUNTER_PRESENTATION.md -o HEADHUNTER_PRESENTATION.pdf
```

## Option 2: PowerPoint

### Using Pandoc

```bash
pandoc HEADHUNTER_PRESENTATION.md -o HEADHUNTER_PRESENTATION.pptx \
  --slide-level=2
```

### Using Marp

```bash
marp HEADHUNTER_PRESENTATION.md -o HEADHUNTER_PRESENTATION.pptx
```

## Option 3: HTML Slides (Interactive)

### Using Marp

```bash
marp HEADHUNTER_PRESENTATION.md -o presentation.html --theme default
```

### Using reveal.js (via Pandoc)

```bash
pandoc HEADHUNTER_PRESENTATION.md \
  -t revealjs \
  -s \
  -o presentation.html \
  -V revealjs-url=https://unpkg.com/reveal.js@4.3.1/
```

## Online Tools (No Installation)

1. **Marp Web**: <https://web.marp.app/>
   - Upload the markdown file
   - Export as PDF or PPTX

2. **Slidev**: <https://sli.dev/>
   - More interactive, developer-friendly

3. **Google Slides**:
   - Import markdown using extensions like "Slides from Markdown"

## Docker-based Conversion (Easiest)

```bash
# PDF using Pandoc in Docker
docker run --rm -v "$(pwd):/data" pandoc/latex:latest \
  HEADHUNTER_PRESENTATION.md -o HEADHUNTER_PRESENTATION.pdf

# Or using Marp
docker run --rm -v $PWD:/home/marp/app/ marpteam/marp-cli \
  HEADHUNTER_PRESENTATION.md --pdf
```

## Recommended: Pandoc PDF

This creates the best-looking professional document:

```bash
# Install Pandoc (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install pandoc texlive-xetex

# Convert
cd /srv/Celine/dev/Headhunter/docs
pandoc HEADHUNTER_PRESENTATION.md \
  -o HEADHUNTER_PRESENTATION.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=12pt \
  -V colorlinks=true \
  -V linkcolor=blue \
  -V urlcolor=blue \
  --toc \
  --toc-depth=2 \
  --number-sections \
  --highlight-style=tango

# Output: HEADHUNTER_PRESENTATION.pdf (ready to present!)
```

## Tips

- **For printing**: Use PDF format
- **For presenting**: Use PowerPoint or HTML slides
- **For sharing**: PDF is most compatible
- **For live demos**: HTML with reveal.js allows live code embedding

## Customization

To add a cover page or custom styling, you can create a YAML frontmatter at the top of the markdown:

```yaml
---
title: "Headhunter AI - Complete System Overview"
author: "Engineering Team"
date: "December 2025"
theme: "default"
---
```

Then convert with custom template:

```bash
pandoc HEADHUNTER_PRESENTATION.md -o output.pdf --template=custom.tex
```

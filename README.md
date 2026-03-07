# Attention-Scape

Attention-Scape is a privacy-first browser extension that visualizes how attention moves across the web.

## Dashboard Preview

![Attention-Scape Dashboard](attensia-dashboard.png)

Instead of simply tracking time spent on websites, Attention-Scape analyzes browsing behavior through multiple dimensions:

- **Attention Gravity** – which platforms capture the most attention
- **Idea Evolution** – how browsing moves across sources
- **Attention Drift** – when exploration turns into repeated loops
- **Agency** – self-directed vs algorithm-driven browsing
- **Information Diversity** – breadth of information sources

All browsing data is stored locally and never leaves the user's browser.

## Tech Stack

- Chrome Extension (Manifest V3)
- JavaScript
- Chrome Web APIs (tabs, storage, webNavigation)
- HTML/CSS
- Canvas API for custom visual analytics

## Purpose

Attention-Scape explores how attention flows across digital environments and helps users reflect on their browsing patterns.

## Running the Extension

1. Clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `extension` folder

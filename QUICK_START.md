# Quick Start Guide - VALORANT Scrim Toolkit

## 🚀 How to Run Your Enhanced Project

Your VALORANT Scrim Toolkit has been enhanced with amazing new features! Here's how to get it running:

### Prerequisites

You need **Node.js** installed to run this project.

### Step 1: Install Node.js

1. Go to **https://nodejs.org/**
2. Download the **LTS version** (Long Term Support)
3. Run the installer
4. **Restart your PowerShell/Terminal** after installation

### Step 2: Install Dependencies

Open PowerShell in your project folder and run:

```powershell
npm install
```

This will install all required packages (React, Vite, Tailwind, etc.)

### Step 3: Start Development Server

```powershell
npm run dev
```

The app will open at `http://localhost:5173` (or similar)

---

## ✨ What's New in Your Enhanced Toolkit

### Visual Enhancements
- 🎨 Animated gradient background with floating particles
- ✨ Enhanced map cards with pronounced hover effects
- 🏆 Trophy badges on selected maps with pulsing glow
- 🔴 Blur + red tint for excluded maps
- 🔥 Flame icons showing which team attacks

### Quality of Life Features
- 📋 Copy maps to clipboard (numbered list)
- 📋 Copy teams to clipboard (Discord-formatted)
- 💾 Auto-save player lists (persists between sessions)
- 💾 Auto-save excluded maps and settings
- 💾 Auto-save preferred format (BO1/BO3/BO5)

### Technical Improvements
- 🔍 SEO meta tags for better discoverability
- 🎭 Smooth animations and transitions
- 🎨 Enhanced VALORANT aesthetic

---

## 🎮 Features Overview

### Map Picker Tab
1. Select your preferred format (BO1, BO3, or BO5)
2. Click maps to exclude them from the pool
3. Click "Generate" to randomly select maps
4. Watch the animated selection process
5. Copy the results to share with your team

### Team Generator Tab
1. Add up to 10 players (5 per team)
2. Choose between Instant Draw or Wheel Spin mode
3. Draw teams randomly
4. Draw which team attacks first
5. Copy the formatted team list for Discord

---

## 🛠️ Troubleshooting

### "npm is not recognized"
- Node.js is not installed or not in PATH
- Solution: Install Node.js from nodejs.org and restart terminal

### Port already in use
- Another app is using port 5173
- Solution: The dev server will automatically use the next available port

### Build errors
- Dependencies might not be installed
- Solution: Run `npm install` again

---

## 📁 Project Structure

```
map-picker-pro-main/
├── src/
│   ├── components/
│   │   ├── AnimatedBackground.tsx    (NEW - Animated header)
│   │   ├── ClipboardButton.tsx       (NEW - Copy functionality)
│   │   ├── MapCard.tsx               (ENHANCED - Better visuals)
│   │   ├── ValorantMapPicker.tsx     (ENHANCED - Clipboard + storage)
│   │   └── TeamDrawer.tsx            (ENHANCED - Clipboard + storage)
│   ├── hooks/
│   │   └── useLocalStorage.ts        (NEW - Persistent state)
│   └── index.css                     (ENHANCED - New animations)
├── index.html                        (ENHANCED - SEO tags)
└── package.json
```

---

## 🎯 Next Steps

1. **Install Node.js** if you haven't already
2. **Run `npm install`** to get dependencies
3. **Run `npm run dev`** to start the server
4. **Test all the new features!**

Enjoy your enhanced VALORANT Scrim Toolkit! 🚀

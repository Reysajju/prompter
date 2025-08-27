# AI Prompt Builder

A dynamic web app that helps users build AI prompts through an interactive form interface. The app uses simulated AI responses to dynamically generate form fields based on user intent.

## Features

- Dynamic field generation based on user intent
- Client-side only (no data collection)
- Session storage for state persistence
- Responsive design with Tailwind CSS
- Ready for Netlify deployment

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
npm run export
```

## Deployment

Deploy the `out` folder to Netlify or any static hosting service.

## How it Works

1. User enters their main intent
2. App generates relevant form fields dynamically
3. User fills out fields, triggering more field generation
4. Process continues until prompt is complete
5. Final prompt is displayed for copying/use

All data is stored locally in browser storage - no external data collection.
# India Tour Guide

An interactive application providing a virtual tour guide experience for exploring India's rich culture, destinations, and traditions.

## Technology

This application uses the OpenAI Realtime API with WebRTC for voice interaction, React for the frontend, and tailored AI responses specific to Indian tourism and culture.
Using - gpt-4o-realtime-preview-2024-12-17


## Features

- **Virtual Tour Guide**: Engage with an AI tour guide specialized in Indian tourism
- **Voice Interaction**: Ask questions about India's popular destinations, culture, and travel tips

## Installation and usage

Before you begin, you'll need an OpenAI API key - [create one in the dashboard here](https://platform.openai.com/settings/api-keys). Create a `.env` file from the example file and set your API key in there:

```bash
cp .env.example .env
```

Running this application locally requires [Node.js](https://nodejs.org/) to be installed. Install dependencies for the application with:

```bash
npm install
```

Start the application server with:

```bash
npm run dev
```

This should start the India Tour Guide application on [http://localhost:3000](http://localhost:3000).

## How to Use

1. Click "start your tour guide" to begin a session
2. Speak clearly into your microphone
3. Ask about destinations like the Taj Mahal, Kerala backwaters, or Rajasthan
4. The guide will listen and respond after you pause for 2 seconds
5. Ask about local cuisine, festivals, historical sites, or travel recommendations



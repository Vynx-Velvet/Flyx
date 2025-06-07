# Flyx 2.0 - NextJS Movie Discovery App

A modern movie and TV show discovery application built with NextJS, featuring trending content, search functionality, and media playback.

## Features

- Browse trending movies and TV shows
- Search for specific content
- View detailed information about movies and shows
- Episode-by-episode viewing for TV series
- Responsive design for all devices
- Modern UI with smooth animations

## Tech Stack

- **NextJS 14** - React framework with App Router
- **React 18** - UI library
- **CSS3** - Styling and animations
- **TMDB API** - Movie and TV show data

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Flyx
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
app/
├── components/          # React components
├── context/            # React context providers
├── globals.css         # Global styles
├── layout.js          # Root layout
└── page.js            # Home page

public/                # Static assets
```

## Migration from Create React App

This project has been successfully migrated from Create React App to NextJS 14 with the following improvements:

- **Better Performance**: Server-side rendering and optimizations
- **Improved SEO**: Better search engine optimization
- **Modern Routing**: File-based routing system
- **Enhanced Developer Experience**: Better debugging and development tools

## API Integration

The app integrates with TMDB (The Movie Database) API through Firebase Cloud Functions for:
- Trending content
- Search functionality
- Detailed movie/show information
- Season and episode data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

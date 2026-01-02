
import { UserProfile } from "../types";

const SPOTIFY_CLIENT_ID = "5bd3ee9c8e3e4acab2d78c962f6adf35";
const SPOTIFY_CLIENT_SECRET = "23d3d95bad4144e2abf820ce84bc9e58";
const SPOTIFY_REDIRECT_URI = "https://omnichatai.vercel.app/callback";
export const DEFAULT_YOUTUBE_API_KEY = "AIzaSyBq7P2exSAEIi4EADrmcv8lbYLfc3bnPH4";

export const getSpotifyAuthUrl = () => {
  const scope = "user-read-private user-read-email user-top-read";
  const state = Math.random().toString(36).substring(7);
  // Store state in local storage to verify later
  localStorage.setItem('spotify_auth_state', state);

  return `https://accounts.spotify.com/authorize?response_type=code&client_id=${SPOTIFY_CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&state=${state}`;
};

export const exchangeSpotifyCode = async (code: string) => {
  const body = new URLSearchParams();
  body.append("grant_type", "authorization_code");
  body.append("code", code);
  body.append("redirect_uri", SPOTIFY_REDIRECT_URI);
  body.append("client_id", SPOTIFY_CLIENT_ID);
  body.append("client_secret", SPOTIFY_CLIENT_SECRET);

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error_description || "Failed to exchange token");
    }

    return await response.json();
  } catch (error) {
    console.error("Spotify Token Exchange Error:", error);
    throw error;
  }
};

export const refreshSpotifyToken = async (refreshToken: string) => {
    const body = new URLSearchParams();
    body.append("grant_type", "refresh_token");
    body.append("refresh_token", refreshToken);
    body.append("client_id", SPOTIFY_CLIENT_ID);
    body.append("client_secret", SPOTIFY_CLIENT_SECRET);

    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
    });
    
    return await response.json();
};

export const searchYouTube = async (query: string, apiKey: string = DEFAULT_YOUTUBE_API_KEY) => {
    // Include video, channel, and playlist in search types
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&type=video,channel,playlist&q=${encodeURIComponent(query)}&key=${apiKey}`;
    try {
        const response = await fetch(url);
        if(!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "YouTube API Error");
        }
        return await response.json();
    } catch (e) {
        console.warn("YouTube Search Error", e);
        // Return empty structure to prevent crashes
        return { items: [] };
    }
};

export const searchSpotify = async (query: string, accessToken: string) => {
    try {
        // Search for tracks, artists, albums, and playlists
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist,album,playlist&limit=3`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error("Spotify API Error");
        }

        return await response.json();
    } catch (e) {
        console.warn("Spotify Search Error", e);
        return { tracks: { items: [] }, artists: { items: [] }, albums: { items: [] }, playlists: { items: [] } };
    }
};

export const searchGithub = async (query: string, token?: string) => {
    const headers: any = { "Accept": "application/vnd.github.v3+json" };
    if (token) headers["Authorization"] = `token ${token}`;
    
    // Determine context (simple heuristic)
    const type = query.includes('issue') ? 'issues' : 'repositories';
    
    try {
        const response = await fetch(`https://api.github.com/search/${type}?q=${encodeURIComponent(query)}&per_page=3`, { headers });
        if(!response.ok) throw new Error("GitHub API Error");
        return await response.json();
    } catch(e) {
        console.warn("GitHub Search Error", e);
        return { items: [] };
    }
};

export const searchUnsplash = async (query: string, accessKey: string) => {
    try {
        // Increased per_page to 5 to fetch more data
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&client_id=${accessKey}`);
        if(!response.ok) throw new Error("Unsplash API Error");
        return await response.json();
    } catch(e) {
        console.warn("Unsplash Search Error", e);
        return { results: [] };
    }
};

// --- NEW CONNECTORS ---

export const searchHackerNews = async (query: string = 'top') => {
    try {
        let storyIds = [];
        if (query.includes('new')) {
            const resp = await fetch('https://hacker-news.firebaseio.com/v0/newstories.json');
            storyIds = await resp.json();
        } else {
            const resp = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
            storyIds = await resp.json();
        }
        
        // Fetch top 5 details
        const top5 = storyIds.slice(0, 5);
        const stories = await Promise.all(top5.map(async (id: number) => {
            const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            return r.json();
        }));
        return stories;
    } catch (e) {
        console.warn("Hacker News Error", e);
        return [];
    }
};

export const getWeather = async (location: string) => {
    try {
        // 1. Geocoding
        const geoResp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
        const geoData = await geoResp.json();
        
        if (!geoData.results?.length) return null;
        
        const { latitude, longitude, name, country } = geoData.results[0];

        // 2. Weather Data
        const weatherResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherData = await weatherResp.json();
        
        return {
            location: { name, country, lat: latitude, lon: longitude },
            current: weatherData.current,
            daily: weatherData.daily
        };
    } catch (e) {
        console.warn("Weather API Error", e);
        return null;
    }
};

export const searchWikipedia = async (query: string) => {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3`;
        const resp = await fetch(url);
        const data = await resp.json();
        
        if (!data.query?.search?.length) return [];

        // Get snippets
        return data.query.search.map((item: any) => ({
            title: item.title,
            snippet: item.snippet.replace(/<[^>]*>?/gm, ''), // Strip HTML
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
        }));
    } catch (e) {
        console.warn("Wikipedia API Error", e);
        return [];
    }
};

export const getCryptoPrice = async (coinId: string) => {
    try {
        // Simple mapping for common terms
        const idMap: any = { 'btc': 'bitcoin', 'eth': 'ethereum', 'sol': 'solana', 'doge': 'dogecoin' };
        const id = idMap[coinId.toLowerCase()] || coinId.toLowerCase();

        const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,eur&include_24hr_change=true`);
        const data = await resp.json();
        return data[id];
    } catch (e) {
        console.warn("CoinGecko API Error", e);
        return null;
    }
};

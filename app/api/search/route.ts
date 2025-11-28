import { NextRequest, NextResponse } from 'next/server';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Use DuckDuckGo Instant Answer API (no API key required)
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    // DuckDuckGo HTML search (scraping approach for better results)
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      }
    );

    if (!response.ok) {
      throw new Error('DuckDuckGo search failed');
    }

    const html = await response.text();
    const results: SearchResult[] = [];

    // Parse results using regex (simple approach without DOM parser)
    const resultPattern = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;

    while ((match = resultPattern.exec(html)) !== null && results.length < 5) {
      const url = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const snippet = match[3].replace(/<[^>]+>/g, '').trim();

      if (url && title && !url.includes('duckduckgo.com')) {
        results.push({ title, url, snippet });
      }
    }

    // If regex parsing didn't work well, try alternative pattern
    if (results.length === 0) {
      const altPattern = /<a rel="nofollow" class="result__a" href="([^"]+)">([\s\S]*?)<\/a>/g;
      const snippetPattern = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      
      const urls: string[] = [];
      const titles: string[] = [];
      const snippets: string[] = [];

      while ((match = altPattern.exec(html)) !== null) {
        urls.push(match[1]);
        titles.push(match[2].replace(/<[^>]+>/g, '').trim());
      }

      while ((match = snippetPattern.exec(html)) !== null) {
        snippets.push(match[1].replace(/<[^>]+>/g, '').trim());
      }

      for (let i = 0; i < Math.min(urls.length, 5); i++) {
        if (urls[i] && titles[i] && !urls[i].includes('duckduckgo.com')) {
          results.push({
            url: urls[i],
            title: titles[i],
            snippet: snippets[i] || '',
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

// Use Tavily API if available (better for AI applications)
async function searchTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: false,
        include_images: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      throw new Error('Tavily search failed');
    }

    const data = await response.json();
    return data.results.map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));
  } catch (error) {
    console.error('Tavily search error:', error);
    return [];
  }
}

// Use Serper API if available
async function searchSerper(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });

    if (!response.ok) {
      throw new Error('Serper search failed');
    }

    const data = await response.json();
    return (data.organic || []).slice(0, 5).map((r: any) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    }));
  } catch (error) {
    console.error('Serper search error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    let results: SearchResult[] = [];

    // Try Tavily first if API key is available
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      results = await searchTavily(query, tavilyKey);
    }

    // Try Serper if Tavily didn't work
    if (results.length === 0) {
      const serperKey = process.env.SERPER_API_KEY;
      if (serperKey) {
        results = await searchSerper(query, serperKey);
      }
    }

    // Fall back to DuckDuckGo (no API key required)
    if (results.length === 0) {
      results = await searchDuckDuckGo(query);
    }

    return NextResponse.json({
      results,
      query,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}


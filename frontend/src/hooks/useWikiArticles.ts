import { useState, useCallback } from "react";

interface WikiArticle {
  title: string;
  extract: string;
  pageid: number;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
}

const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve();
    img.onerror = reject;
  });
};

export function useWikiArticles() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [buffer, setBuffer] = useState<WikiArticle[]>([]);
  const [seenPageIds, setSeenPageIds] = useState<Set<number>>(new Set());
  const BASE_API = "https://en.wikipedia.org/w/api.php?origin=*";

  const fetchRandomArticles = async (forBuffer = false) => {
    if (loading) return;
    setLoading(true);

    try {
      // Step 1: Fetch random articles from architecture category
      const categoryResponse = await fetch(
        `${BASE_API}&${new URLSearchParams({
          action: "query",
          format: "json",
          generator: "categorymembers",
          gcmtitle: "Category:Architecture",
          gcmlimit: "20",
          gcmtype: "page",
          gcmsort: "random", // Sort randomly
          prop: "extracts|pageimages",
          exintro: "1",
          exchars: "1000",
          explaintext: "1",
          piprop: "thumbnail",
          pithumbsize: "800",
        })}`
      );

      const data = await categoryResponse.json();

      if (!data.query?.pages) {
        console.error("No pages found");
        setLoading(false);
        return;
      }

      // Filter out articles we've already seen
      const newArticles = Object.values(data.query.pages)
        .filter((page: any) => !seenPageIds.has(page.pageid) && page.thumbnail)
        .map((page: any) => ({
          title: page.title,
          extract: page.extract,
          pageid: page.pageid,
          thumbnail: page.thumbnail,
        }));

      if (newArticles.length === 0) {
        console.log("No new articles found, resetting seen pages");
        // If we run out of new articles, reset the seen pages
        setSeenPageIds(new Set());
        setLoading(false);
        return;
      }

      // Update seen page IDs
      setSeenPageIds(prev => {
        const newSet = new Set(prev);
        newArticles.forEach(article => newSet.add(article.pageid));
        return newSet;
      });

      // Preload images
      await Promise.allSettled(
        newArticles.map((article) => preloadImage(article.thumbnail!.source))
      );

      if (forBuffer) {
        setBuffer(newArticles);
      } else {
        setArticles(prev => [...prev, ...newArticles]);
        // Fetch buffer immediately after setting articles
        fetchRandomArticles(true);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
    }

    setLoading(false);
  };

  const getMoreArticles = useCallback(() => {
    if (buffer.length > 0) {
      setArticles(prev => [...prev, ...buffer]);
      setBuffer([]);
      fetchRandomArticles(true);
    } else {
      fetchRandomArticles(false);
    }
  }, [buffer]);

  return { 
    articles, 
    loading, 
    fetchArticles: getMoreArticles,
    resetArticles: () => {
      setArticles([]);
      setBuffer([]);
      setSeenPageIds(new Set());
    }
  };
}
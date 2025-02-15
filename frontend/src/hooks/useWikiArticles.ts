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

const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export function useWikiArticles() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [allFetchedArticles, setAllFetchedArticles] = useState<WikiArticle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const BASE_API = "https://en.wikipedia.org/w/api.php?origin=*";

  const fetchArticles = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Step 1: Fetch category members
      const categoryResponse = await fetch(
        `${BASE_API}&` +
          new URLSearchParams({
            action: "query",
            format: "json",
            list: "categorymembers",
            cmtitle: "Category:Architecture",
            cmlimit: "500", // Fetch fewer articles to avoid API limits
            cmtype: "page",
          })
      );

      const categoryData = await categoryResponse.json();

      if (!categoryData.query?.categorymembers) {
        console.error("No category members found");
        setLoading(false);
        return;
      }

      // Shuffle the category members to get random articles
      const shuffledMembers = shuffleArray(categoryData.query.categorymembers);

      // Step 2: Fetch details for a smaller subset of articles (e.g., 10 at a time)
      const subset = shuffledMembers.slice(currentIndex, currentIndex + 10);
      const pageIds = subset.map((page: any) => page.pageid).join("|");

      const detailsResponse = await fetch(
        `${BASE_API}&` +
          new URLSearchParams({
            action: "query",
            format: "json",
            pageids: pageIds,
            prop: "extracts|pageimages",
            exintro: "1",
            exchars: "1000",
            explaintext: "1",
            piprop: "thumbnail",
            pithumbsize: "400",
          })
      );

      const detailsData = await detailsResponse.json();

      if (!detailsData.query?.pages) {
        console.error("No pages found in details response");
        setLoading(false);
        return;
      }

      const newArticles = Object.values(detailsData.query.pages)
        .map((page: any) => ({
          title: page.title,
          extract: page.extract,
          pageid: page.pageid,
          thumbnail: page.thumbnail,
        }))
        .filter((article) => article.thumbnail);

      // Preload images
      await Promise.allSettled(
        newArticles.map((article) => preloadImage(article.thumbnail!.source))
      );

      // Update the state with new articles
      setArticles((prev) => [...prev, ...newArticles]);
      setCurrentIndex((prev) => prev + 10); // Update the index for the next fetch
    } catch (error) {
      console.error("Error fetching articles:", error);
    }

    setLoading(false);
  };

  const getMoreArticles = useCallback(() => {
    fetchArticles();
  }, [currentIndex]);

  return { articles, loading, fetchArticles: getMoreArticles };
}
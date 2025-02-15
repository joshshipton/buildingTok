import { Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WikiArticle {
    title: string;
    pageid: number;
    thumbnail?: {
        source: string;
        width: number;
        height: number;
    };
}

const WIKI_BASE_URL = 'https://en.wikipedia.org/?curid=';

interface WikiCardProps {
    article: WikiArticle;
}

export function WikiCard({ article }: WikiCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [articleContent, setArticleContent] = useState<string | null>(null);
    const [isValidArchitecture, setIsValidArchitecture] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        
        const fetchArticleContent = async () => {
            try {
                const BASE_API = 'https://en.wikipedia.org/w/api.php?';
                
                const response = await fetch(
                    `${BASE_API}${new URLSearchParams({
                        action: 'query',
                        format: 'json',
                        origin: '*',
                        prop: 'extracts|categories',
                        pageids: article.pageid.toString(),
                        explaintext: '1',
                        exintro: '1',
                        exsentences: '5',
                        cllimit: '500'
                    })}`,
                    { signal: controller.signal }
                );

                const data = await response.json();
                const page = data.query.pages[article.pageid];

                // Validate architecture category
                const isArchitecture = page.categories?.some(
                    (cat: any) => cat.title.toLowerCase() === 'category:architecture'
                );

                if (isArchitecture && page.extract) {
                    setArticleContent(page.extract);
                    setIsValidArchitecture(true);
                } else {
                    setArticleContent("This article is not properly categorized in architecture.");
                    setIsValidArchitecture(false);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('Error fetching article content:', error);
                    setArticleContent("Failed to load content. Please try again later.");
                }
            }
        };

        if (isValidArchitecture) {
            fetchArticleContent();
        }

        return () => controller.abort();
    }, [article.pageid, isValidArchitecture]);

    const handleShare = async () => {
        const url = `${WIKI_BASE_URL}${article.pageid}`;
        const shareText = articleContent || 'Check out this architecture article on Wikipedia';
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: article.title,
                    text: shareText,
                    url: url
                });
            } else {
                await navigator.clipboard.writeText(url);
                alert('Link copied to clipboard!');
            }
        } catch (error) {
            console.error('Sharing failed:', error);
        }
    };

    if (!isValidArchitecture) return null;

    return (
        <div className="h-screen w-full flex items-center justify-center snap-start relative">
            <div className="h-full w-full relative">
                {article.thumbnail && (
                    <div className="absolute inset-0">
                        <img
                            loading="lazy"
                            src={article.thumbnail.source}
                            alt={article.title}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                                imageLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageLoaded(true)}
                        />
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-gray-900 animate-pulse" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/80" />
                    </div>
                )}
                
                <div className="absolute bottom-[10vh] left-0 right-0 p-6 text-white z-10">
                    <div className="flex justify-between items-start mb-3">
                        <a
                            href={`${WIKI_BASE_URL}${article.pageid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-gray-200 transition-colors"
                        >
                            <h2 className="text-2xl font-bold drop-shadow-lg">{article.title}</h2>
                        </a>
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                            aria-label="Share article"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="mb-4">
                        {articleContent ? (
                            <p className="text-gray-100 drop-shadow-lg line-clamp-6">
                                {articleContent}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4" />
                                <div className="h-4 bg-gray-700 rounded animate-pulse" />
                                <div className="h-4 bg-gray-700 rounded animate-pulse w-5/6" />
                            </div>
                        )}
                    </div>

                    <a
                        href={`${WIKI_BASE_URL}${article.pageid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-white hover:text-gray-200 drop-shadow-lg font-medium"
                    >
                        Read more →
                    </a>
                </div>
            </div>
        </div>
    );
}
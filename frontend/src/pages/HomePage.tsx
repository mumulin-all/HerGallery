import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import ExhibitionCard from '@/components/Exhibition/ExhibitionCard';
import { fetchHomeExhibitions, type HomeExhibitionRecord } from '@/hooks/useContract';
import { getAllIPFSUrls } from '@/services/ipfs';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

function FeaturedExhibition({ exhibition }: { exhibition: HomeExhibitionRecord }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const urls = exhibition.coverHash ? getAllIPFSUrls(exhibition.coverHash) : [];

  useEffect(() => {
    if (urls.length > 0) setCoverUrl(urls[0]);
  }, [exhibition.coverHash]);

  return (
    <Link to={`/exhibition/${exhibition.id}`} className="group shrink-0 w-72 block">
      <div className="overflow-hidden rounded-lg">
        <div className="aspect-[4/3] bg-muted relative">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={exhibition.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <span className="text-4xl opacity-30">✿</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span className="text-xs text-white/60">{exhibition.tags[0]}</span>
            <h3 className="text-sm font-medium text-white mt-1 group-hover:text-violet-200 transition-colors line-clamp-1">
              {exhibition.title}
            </h3>
          </div>
        </div>
      </div>
    </Link>
  );
}

function HeroExhibition() {
  return (
    <Link to="/" className="group block">
      <div className="flex items-center justify-between px-6 py-4 rounded-xl bg-gradient-to-r from-violet-900 to-purple-900">
        <div className="flex items-center gap-4">
          <span className="text-3xl text-violet-300">✿</span>
          <div>
            <h2 className="text-lg font-semibold text-white group-hover:text-violet-200 transition-colors">
              她的展厅
            </h2>
            <p className="text-sm text-white/60">记录、创作、见证 — 链上属于她们的艺术空间</p>
          </div>
        </div>
        <span className="text-white/40 text-2xl">→</span>
      </div>
    </Link>
  );
}

function ProcessSection() {
  const steps = [
    { num: '01', title: '策展人创建展厅', desc: '质押少量 AVAX，创建一个属于你的展厅空间' },
    { num: '02', title: '收录投稿', desc: '策展人审核并收录来自创作者的作品' },
    { num: '03', title: '托举与见证', desc: '社区成员托举优质作品，见证历史记忆' },
  ];

  return (
    <section className="py-12">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">如何参与</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div key={step.num} className="flex gap-4">
            <span className="text-2xl font-bold text-muted-foreground">{step.num}</span>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TipSection() {
  return (
    <section className="py-10 px-8 rounded-2xl bg-secondary border border-border">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">支持 HerGallery</h2>
          <p className="text-sm text-muted-foreground">帮助我们继续为女性创作者建立永久、安全的艺术空间</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/create"
            className="inline-flex h-10 items-center rounded-full border border-primary/30 bg-white px-5 text-sm font-medium text-primary transition-colors hover:bg-secondary"
          >
            创建展厅
          </Link>
          <a
            href="#"
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            赞赏我们
          </a>
        </div>
      </div>
    </section>
  );
}

const HomePage = () => {
  const [exhibitions, setExhibitions] = useState<HomeExhibitionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string>('全部');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchHomeExhibitions()
      .then((records) => {
        if (!cancelled) {
          setExhibitions(records);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err.message || '加载失败，请检查网络和钱包连接');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const tags = useMemo(() => {
    const values = new Set<string>();
    exhibitions.forEach((exhibition) => {
      exhibition.tags.forEach((tag) => values.add(tag));
    });
    return ['全部', ...Array.from(values)];
  }, [exhibitions]);

  const sortedExhibitions = useMemo(
    () => [...exhibitions].sort((left, right) => right.hotScore - left.hotScore),
    [exhibitions]
  );

  const featuredExhibitions = sortedExhibitions.slice(0, 4);

  const filteredExhibitions = useMemo(() => {
    if (activeTag === '全部') {
      return sortedExhibitions;
    }
    return sortedExhibitions.filter((exhibition) => exhibition.tags.includes(activeTag));
  }, [activeTag, sortedExhibitions]);

  return (
    <Layout>
      <div className="gallery-container">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="py-12 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-10">
            {/* Hero Exhibition */}
            <section>
              <HeroExhibition />
            </section>

            {/* Featured Exhibitions */}
            {featuredExhibitions.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">精选</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                  {featuredExhibitions.map((exhibition) => (
                    <FeaturedExhibition key={exhibition.id} exhibition={exhibition} />
                  ))}
                </div>
              </section>
            )}

            {/* Content: Sidebar + Grid */}
            <div className="flex gap-8">
              {/* Left Sidebar - Tags */}
              <aside className="w-36 shrink-0">
                <div className="sticky top-24">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">分类</p>
                  <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeTag === tag
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Right Grid */}
              <div className="flex-1">
                {filteredExhibitions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
                    {filteredExhibitions.map((exhibition, idx) => (
                      <ExhibitionCard key={exhibition.id} exhibition={exhibition} index={idx} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <span className="text-5xl mb-4 opacity-30">✿</span>
                    <h2 className="text-xl font-semibold text-foreground mb-2">暂无展厅</h2>
                    <p className="text-muted-foreground mb-6">成为第一个策展人</p>
                    <Link
                      to="/create"
                      className="inline-flex h-10 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent"
                    >
                      创建展厅
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Process Section */}
            <ProcessSection />

            {/* Tip Section */}
            <TipSection />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HomePage;
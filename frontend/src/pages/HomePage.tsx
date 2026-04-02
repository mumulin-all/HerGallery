import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout/Layout';
import ExhibitionList from '@/components/Exhibition/ExhibitionList';
import { fetchHomeExhibitions, type HomeExhibitionRecord } from '@/hooks/useContract';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { relativeTime, shortenAddress } from '@/lib/format';

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
          setExhibitions(records.sort((left, right) => right.createdAt - left.createdAt));
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

  const featuredExhibitions = useMemo(
    () => [...exhibitions].sort((left, right) => right.hotScore - left.hotScore).slice(0, 3),
    [exhibitions]
  );

  const filteredExhibitions = useMemo(() => {
    if (activeTag === '全部') {
      return exhibitions;
    }
    return exhibitions.filter((exhibition) => exhibition.tags.includes(activeTag));
  }, [activeTag, exhibitions]);

  return (
    <Layout>
      <div className="gallery-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            <span className="text-primary">✿</span> 她的展厅
          </h1>
          <p className="mt-3 text-muted-foreground">
            记录、创作、推荐 — 链上属于她们的艺术空间
          </p>
        </motion.div>

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
          <div className="space-y-12">
            <section>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">热门榜单</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    根据推荐数与投稿活跃度综合计算出的优质展厅
                  </p>
                </div>
              </div>

              {featuredExhibitions.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  {featuredExhibitions.map((exhibition, index) => (
                    <Link
                      key={exhibition.id}
                      to={`/exhibition/${exhibition.id}`}
                      className="group rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          TOP {index + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">{relativeTime(exhibition.createdAt)}</span>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {exhibition.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">{shortenAddress(exhibition.curator)}</p>
                      {exhibition.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {exhibition.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-2xl bg-background px-3 py-3">
                          <p className="text-xs text-muted-foreground">投稿</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{exhibition.submissionCount}</p>
                        </div>
                        <div className="rounded-2xl bg-background px-3 py-3">
                          <p className="text-xs text-muted-foreground">推荐</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{exhibition.totalRecommends}</p>
                        </div>
                        <div className="rounded-2xl bg-background px-3 py-3">
                          <p className="text-xs text-muted-foreground">见证</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{exhibition.totalWitnesses}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                  还没有可进入榜单的展厅
                </div>
              )}
            </section>

            <section>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">全部展厅</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    按创建时间倒序展示，可通过标签快速筛选
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(tag)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        activeTag === tag
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <ExhibitionList exhibitions={filteredExhibitions} />
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HomePage;

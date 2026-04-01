import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Loader2 } from 'lucide-react';
import Layout from '@/components/Layout/Layout';
import DisplayName from '@/components/ui/DisplayName';
import { CONTENT_TYPE_LABELS, SUBMISSION_STATUS_LABELS } from '@/config/contract';
import { fetchUserActivity, type UserActivitySummary } from '@/hooks/useContract';
import { relativeTime } from '@/lib/format';

const emptySummary: UserActivitySummary = {
  submissions: [],
  hasFirstSubmissionBadge: false,
  milestoneBadges: [],
};

const MyRecordsPage = () => {
  const { address, isConnected } = useAccount();
  const [summary, setSummary] = useState<UserActivitySummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !isConnected) {
      setSummary(emptySummary);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchUserActivity(address)
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err.message || '加载我的记录失败');
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
  }, [address, isConnected]);

  if (!isConnected || !address) {
    return (
      <Layout>
        <div className="gallery-container max-w-4xl py-16">
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <h1 className="text-2xl font-bold text-foreground">我的记录</h1>
            <p className="mt-3 text-sm text-muted-foreground">连接钱包后即可查看你的投稿历史和 POAP 徽章。</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="gallery-container max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">我的记录</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <DisplayName address={address} /> 的投稿历史与链上徽章
            </p>
          </div>
          <Link
            to="/create"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent"
          >
            创建新展厅
          </Link>
        </div>

        {isLoading ? (
          <div className="py-24 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">POAP 徽章</h2>
                <div className="mt-4 space-y-3">
                  <div className={`rounded-xl border p-4 ${
                    summary.hasFirstSubmissionBadge ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
                  }`}>
                    <p className="text-sm font-medium text-foreground">首投徽章</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary.hasFirstSubmissionBadge ? '你已经完成首次投稿。' : '完成第一次投稿后自动解锁。'}
                    </p>
                  </div>

                  {summary.milestoneBadges.length > 0 ? (
                    summary.milestoneBadges.map((badge) => (
                      <div key={`${badge.exhibitionId}-${badge.submissionId}`} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <p className="text-sm font-medium text-foreground">推荐里程碑徽章</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          《{badge.exhibitionTitle}》中的投稿已获得 {badge.recommendCount} 次推荐。
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-sm font-medium text-foreground">推荐里程碑徽章</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        单条投稿推荐达到 10 次后解锁。
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <section>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">投稿历史</h2>
                  <span className="text-sm text-muted-foreground">{summary.submissions.length} 条记录</span>
                </div>

                {summary.submissions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
                    <p className="text-sm text-muted-foreground">你还没有投稿，去展厅里留下第一条记录吧。</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {summary.submissions.map((submission) => (
                      <div key={`${submission.exhibitionId}-${submission.id}`} className="rounded-xl border border-border bg-background p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                                {CONTENT_TYPE_LABELS[submission.contentType] || submission.contentType}
                              </span>
                              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                                {SUBMISSION_STATUS_LABELS[submission.status] || '未知状态'}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-foreground">{submission.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{submission.description || '暂无摘要'}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                              <Link to={`/exhibition/${submission.exhibitionId}`} className="text-primary hover:underline">
                                查看展厅: {submission.exhibitionTitle}
                              </Link>
                              <span>{relativeTime(submission.createdAt)}</span>
                              <span>{submission.recommendCount} 推荐</span>
                              <span>{submission.witnessCount} 见证</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyRecordsPage;

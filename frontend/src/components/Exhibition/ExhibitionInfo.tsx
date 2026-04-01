import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Exhibition } from '@/config/contract';
import { formatDate } from '@/lib/format';
import DisplayName from '@/components/ui/DisplayName';
import { useTipExhibition } from '@/hooks/useContract';
import { toast } from 'sonner';

interface Props {
  exhibition: Exhibition;
  totalRecommends: number;
  totalWitnesses: number;
  onTipSuccess?: () => void;
}

const ExhibitionInfo = ({ exhibition, totalRecommends, totalWitnesses, onTipSuccess }: Props) => {
  const { isConnected } = useAccount();
  const [tipAmount, setTipAmount] = useState('0.01');
  const [isTipping, setIsTipping] = useState(false);

  const { tipExhibition } = useTipExhibition(() => {
    toast.success('已成功打赏展厅');
    onTipSuccess?.();
  });

  const handleTip = async () => {
    if (!isConnected) {
      toast.error('请先连接钱包');
      return;
    }

    setIsTipping(true);
    try {
      await tipExhibition(exhibition.id, tipAmount);
    } catch (err: any) {
      toast.error(err.message || '打赏失败，请重试');
    } finally {
      setIsTipping(false);
    }
  };

  return (
  <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
    <h3 className="text-sm font-semibold text-foreground">展厅信息</h3>

    {exhibition.tags.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {exhibition.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    )}

    <div className="space-y-4 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">策展人</span>
        <DisplayName address={exhibition.curator} className="text-foreground" />
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">创建时间</span>
        <span className="text-foreground">{formatDate(exhibition.createdAt)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">投稿总数</span>
        <span className="font-semibold text-primary">{exhibition.submissionCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">总推荐数</span>
        <span className="font-semibold text-primary">{totalRecommends}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">总见证数</span>
        <span className="font-semibold text-primary">{totalWitnesses}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">赏金池</span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary"
        >
          {exhibition.tipPool / 1e18} AVAX
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">状态</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          exhibition.flagged ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
        }`}>
          {exhibition.flagged ? '已隐藏' : '活跃'}
        </span>
      </div>
    </div>

    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-medium text-foreground">打赏展厅</p>
      <p className="mt-1 text-xs text-muted-foreground">支持策展人继续维护和收录内容</p>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={tipAmount}
          onChange={(e) => setTipAmount(e.target.value)}
          inputMode="decimal"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          placeholder="0.01"
        />
        <button
          onClick={handleTip}
          disabled={isTipping || exhibition.flagged}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          {isTipping ? '处理中...' : '打赏'}
        </button>
      </div>
      <a
        href={`https://testnet.snowtrace.io/address/${exhibition.curator}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex text-xs text-primary hover:underline"
      >
        在 Snowtrace 查看策展人地址
      </a>
    </div>
  </div>
  );
};

export default ExhibitionInfo;

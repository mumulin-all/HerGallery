import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Submission } from '@/config/contract';
import SubmissionCard from './SubmissionCard';
import SubmissionDetailModal from './SubmissionDetailModal';

interface Props {
  submissions: Submission[];
  exhibitionId: number;
  isActive: boolean;
}

const SubmissionList = ({ submissions, exhibitionId, isActive }: Props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sorted = [...submissions]
    .filter((submission) => submission.status === 1 && !submission.flagged)
    .sort((a, b) => b.recommendCount - a.recommendCount);
  const selectedSubmissionId = searchParams.get('submission');
  const selected = useMemo(() => {
    if (!selectedSubmissionId) return null;
    return sorted.find((submission) => submission.id === Number(selectedSubmissionId)) ?? null;
  }, [selectedSubmissionId, sorted]);

  const openSubmission = (submission: Submission) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('submission', String(submission.id));
    setSearchParams(nextParams, { replace: true });
  };

  const closeSubmission = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('submission');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <>
      <div className="space-y-3">
        {sorted.map((sub, i) => (
          <SubmissionCard
            key={sub.id}
            submission={sub}
            index={i}
            exhibitionId={exhibitionId}
            isActive={isActive}
            onViewDetail={openSubmission}
          />
        ))}
        {sorted.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">暂无投稿，成为第一个投稿人吧！</p>
        )}
      </div>

      {selected && (
        <SubmissionDetailModal
          submission={selected}
          exhibitionId={exhibitionId}
          isActive={isActive}
          onClose={closeSubmission}
        />
      )}
    </>
  );
};

export default SubmissionList;

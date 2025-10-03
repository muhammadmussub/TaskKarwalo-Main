import React from 'react';
import CommissionReminder from '@/components/CommissionReminder';

const CleanEnding = () => {
  // This is just a reference for correct syntax
  const [showCommissionReminder, setShowCommissionReminder] = React.useState(false);
  const user = { id: '', full_name: '' };
  const providerProfile = { completed_jobs_since_commission: 0 };
  const loadProviderData = () => {};
  
  return (
    <div>
      {showCommissionReminder && (
        <CommissionReminder
          isOpen={showCommissionReminder}
          onClose={() => {
            setShowCommissionReminder(false);
            loadProviderData();
          }}
          providerId={user?.id || ''}
          completedJobsCount={providerProfile?.completed_jobs_since_commission || 0}
          providerName={user?.full_name || 'Provider'}
        />
      )}
    </div>
  );
};

export default CleanEnding;
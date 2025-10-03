// Copy of original file up to line 1420
// We'll manually add the end part

// ... Just for the final section
          isOpen={showCommissionReminder}
          onClose={() => {
            setShowCommissionReminder(false);
            loadProviderData(); // Reload data after closing to refresh commission history
          }}
          providerId={user?.id || ''}
          completedJobsCount={providerProfile?.completed_jobs_since_commission || 0}
          providerName={user?.full_name || 'Provider'}
        />
      )}
    </div>
  );
};

export default ProviderDashboard;
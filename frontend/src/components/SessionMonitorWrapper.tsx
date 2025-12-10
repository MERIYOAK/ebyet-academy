import React from 'react';
import { useSessionMonitor } from '../hooks/useSessionMonitor';
import AccountSuspendedModal from './AccountSuspendedModal';

interface SessionMonitorWrapperProps {
  children: React.ReactNode;
}

const SessionMonitorWrapper: React.FC<SessionMonitorWrapperProps> = ({ children }) => {
  const { showSuspendedModal, handleCloseSuspendedModal, sessionStatus } = useSessionMonitor();

  return (
    <>
      {children}
      
      <AccountSuspendedModal
        isOpen={showSuspendedModal}
        onClose={handleCloseSuspendedModal}
        userEmail={sessionStatus.userEmail}
      />
    </>
  );
};

export default SessionMonitorWrapper;

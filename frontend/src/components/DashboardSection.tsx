import { useContext } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import type { DashboardStatus } from '../hooks/useDashboardResource';
import type { dashboardError } from '../utils/dashboardError';
import './dashboard.css';

export function DashboardSection({ label, resource, children }: {
  label: string;
  resource: { status: DashboardStatus; error: ReturnType<typeof dashboardError> | null; reload: () => void };
  children: ReactNode;
}) {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  if (resource.status === 'loading') return (
    <div className="dashboard-loading" role="status" aria-live="polite">
      <Spin size="small" /> กำลังโหลด{label}…
    </div>
  );
  if (resource.status === 'error') return (
    <Alert type="error" showIcon title={'โหลด' + label + 'ไม่สำเร็จ'}
      description={<div className="dashboard-recovery">
        <span>{resource.error?.message}</span>
        {resource.error?.signIn ? (
          <Button onClick={() => { auth?.logout(); navigate('/login', { replace: true }); }}>
            เข้าสู่ระบบอีกครั้ง
          </Button>
        ) : resource.error?.retryable && (
          <Button onClick={resource.reload}>ลองโหลด{label}อีกครั้ง</Button>
        )}
      </div>}
    />
  );
  return <>{children}</>;
}

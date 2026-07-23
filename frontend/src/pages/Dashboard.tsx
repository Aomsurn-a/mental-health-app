import React, { useContext } from 'react';
import { Card, Typography, Row, Col } from 'antd';
import { AuthContext } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';
import PsyDashboard from './PsyDashboard';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const auth = useContext(AuthContext);

  if (auth?.user?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (auth?.user?.role === 'user') {
    return <UserDashboard />;
  }

  if (auth?.user?.role === 'psychologist') {
    return <PsyDashboard />;
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>หน้าหลัก</Title>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Text>ยินดีต้อนรับ คุณ {auth?.user?.first_name || auth?.user?.username}</Text>
            <br />
            <Text type="secondary">Role: {auth?.user?.role}</Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

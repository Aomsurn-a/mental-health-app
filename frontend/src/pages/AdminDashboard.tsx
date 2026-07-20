import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import { TeamOutlined, UserOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import { adminService } from '../services/adminService';
import type { AdminStats } from '../services/adminService';

const { Title } = Typography;

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getStats();
        setStats(data);
      } catch {
        console.error('โหลดข้อมูลไม่สำเร็จ');
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <Title level={2}>ภาพรวมระบบ</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="ผู้ใช้งานทั้งหมด"
              value={stats?.total_users || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="นักจิตวิทยา"
              value={stats?.total_psychologists || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="การนัดหมายทั้งหมด"
              value={stats?.total_appointments || 0}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="คำร้องรอดำเนินการ"
              value={stats?.pending_complaints || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: stats?.pending_complaints ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
import React, { useContext, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  FormOutlined,
  SmileOutlined,
  CalendarOutlined,
  MessageOutlined,
  FileTextOutlined,
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// เมนูแยกตาม Role
const menuItems = {
  user: [
    { key: '/dashboard', icon: <HomeOutlined />, label: 'หน้าหลัก' },
    { key: '/assessment', icon: <FormOutlined />, label: 'แบบประเมินสุขภาพจิต' },
    { key: '/assessment-history', icon: <FileTextOutlined />, label: 'ประวัติการประเมิน' },
    { key: '/mood', icon: <SmileOutlined />, label: 'Mood Tracking' },
    { key: '/mood-stats', icon: <SmileOutlined />, label: 'สถิติ Mood' },
    { key: '/psychologists', icon: <TeamOutlined />, label: 'นักจิตวิทยา' },
    { key: '/appointment', icon: <CalendarOutlined />, label: 'นัดหมาย' },
    { key: '/chat', icon: <MessageOutlined />, label: 'แชท' },
    { key: '/complaint', icon: <FileTextOutlined />, label: 'คำร้อง' },
  ],
  psychologist: [
    { key: '/dashboard', icon: <HomeOutlined />, label: 'หน้าหลัก' },
    { key: '/appointment', icon: <CalendarOutlined />, label: 'จัดการนัดหมาย' },
    { key: '/patients', icon: <TeamOutlined />, label: 'ผู้ป่วย' },
    { key: '/psy-schedule', icon: <ClockCircleOutlined />, label: 'ตารางงาน' },
    { key: '/chat', icon: <MessageOutlined />, label: 'แชท' },
    { key: '/complaint', icon: <FileTextOutlined />, label: 'คำร้อง' },
  ],
  admin: [
    { key: '/dashboard', icon: <HomeOutlined />, label: 'หน้าหลัก' },
    { key: '/users', icon: <TeamOutlined />, label: 'จัดการบัญชี' },
    { key: '/hospitals', icon: <BankOutlined />, label: 'โรงพยาบาล/คลินิก' },
    { key: '/complaint-admin', icon: <FileTextOutlined />, label: 'คำร้อง' },
    { key: '/report', icon: <FormOutlined />, label: 'รายงาน' },
  ],
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const role = auth?.user?.role || 'user';
  const menus = menuItems[role] || menuItems.user;

  const userMenuItems = [
  {
    key: 'profile',
    icon: <UserOutlined />,
    label: 'ข้อมูลส่วนตัว',
    onClick: () => navigate('/profile'),
  },
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'ออกจากระบบ',
    danger: true,
    onClick: () => {
      auth?.logout();
      navigate('/login');
    },
  },
];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: '#001529' }}
        width={220}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 20 : 16,
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {collapsed ? '🧠' : '🧠 สุขภาพจิต'}
        </div>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menus}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout>
        {/* Header */}
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
        }}>
          {/* ปุ่มย่อ/ขยาย Sidebar */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />

          {/* User Info */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />
              <Text>{auth?.user?.first_name || auth?.user?.username}</Text>
            </div>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content style={{
          margin: 24,
          padding: 24,
          background: '#fff',
          borderRadius: 8,
          minHeight: 'calc(100vh - 112px)'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
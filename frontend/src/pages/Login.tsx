import React, { useContext, useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const { Title } = Typography;

const Login: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await auth?.login(values.email, values.password);
      navigate('/dashboard');
    } catch {
      // error จัดการใน AuthContext แล้ว
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => {
    setLoading(true);
    try {
      await auth?.register(values.username, values.email, values.password, values.first_name, values.last_name);
      navigate('/dashboard');
    } catch {
      // error จัดการใน AuthContext แล้ว
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          🧠 ระบบดูแลสุขภาพจิต
        </Title>

        {auth?.error && (
          <Alert
            message={auth.error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            onClose={auth.clearError}
          />
        )}

        <Tabs defaultActiveKey="login" centered items={[
          {
            key: 'login',
            label: 'เข้าสู่ระบบ',
            children: (
              <Form layout="vertical" onFinish={handleLogin}>
                <Form.Item name="email" label="อีเมล"
                  rules={[
                    { required: true, message: 'กรุณากรอกอีเมล' },
                    { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }
                  ]}>
                  <Input prefix={<MailOutlined />} placeholder="example@email.com" size="large" />
                </Form.Item>
                <Form.Item name="password" label="รหัสผ่าน"
                  rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="รหัสผ่าน" size="large" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    เข้าสู่ระบบ
                  </Button>
                </Form.Item>
              </Form>
            )
          },
          {
            key: 'register',
            label: 'สมัครสมาชิก',
            children: (
              <Form layout="vertical" onFinish={handleRegister}>
                <Form.Item name="username" label="ชื่อผู้ใช้"
                  rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}>
                  <Input prefix={<UserOutlined />} placeholder="ชื่อผู้ใช้" size="large" />
                </Form.Item>
                <Form.Item name="first_name" label="ชื่อจริง">
                  <Input placeholder="ชื่อจริง" size="large" />
                </Form.Item>
                <Form.Item name="last_name" label="นามสกุล">
                  <Input placeholder="นามสกุล" size="large" />
                </Form.Item>
                <Form.Item name="email" label="อีเมล"
                  rules={[
                    { required: true, message: 'กรุณากรอกอีเมล' },
                    { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }
                  ]}>
                  <Input prefix={<MailOutlined />} placeholder="example@email.com" size="large" />
                </Form.Item>
                <Form.Item name="password" label="รหัสผ่าน"
                  rules={[
                    { required: true, message: 'กรุณากรอกรหัสผ่าน' },
                    { min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }
                  ]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="รหัสผ่าน" size="large" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    สมัครสมาชิก
                  </Button>
                </Form.Item>
              </Form>
            )
          }
        ]} />
      </Card>
    </div>
  );
};

export default Login;
import React, { useContext, useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, HeartOutlined } from '@ant-design/icons';
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
    <main className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <span className="login-brand-icon"><HeartOutlined aria-hidden="true" /></span>
          <Title level={1}>ระบบดูแลสุขภาพจิต</Title>
          <p>พื้นที่สำหรับดูแลสุขภาพใจของคุณ</p>
        </div>

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
              <Form name="login" layout="vertical" onFinish={handleLogin} scrollToFirstError>
                <Form.Item name="email" label="อีเมล"
                  rules={[
                    { required: true, message: 'กรุณากรอกอีเมล' },
                    { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }
                  ]}>
                  <Input prefix={<MailOutlined />} autoComplete="email" inputMode="email" placeholder="example@email.com" />
                </Form.Item>
                <Form.Item name="password" label="รหัสผ่าน"
                  rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}>
                  <Input.Password prefix={<LockOutlined />} autoComplete="current-password" placeholder="รหัสผ่าน" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
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
              <Form name="register" className="register-form" layout="vertical" onFinish={handleRegister} scrollToFirstError>
                <Form.Item name="username" label="ชื่อผู้ใช้"
                  rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}>
                  <Input prefix={<UserOutlined />} autoComplete="username" placeholder="ชื่อผู้ใช้" />
                </Form.Item>
                <Form.Item className="register-name" name="first_name" label="ชื่อจริง">
                  <Input autoComplete="given-name" placeholder="ชื่อจริง" />
                </Form.Item>
                <Form.Item className="register-name" name="last_name" label="นามสกุล">
                  <Input autoComplete="family-name" placeholder="นามสกุล" />
                </Form.Item>
                <Form.Item name="email" label="อีเมล"
                  rules={[
                    { required: true, message: 'กรุณากรอกอีเมล' },
                    { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }
                  ]}>
                  <Input prefix={<MailOutlined />} autoComplete="email" inputMode="email" placeholder="example@email.com" />
                </Form.Item>
                <Form.Item name="password" label="รหัสผ่าน"
                  rules={[
                    { required: true, message: 'กรุณากรอกรหัสผ่าน' },
                    { min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }
                  ]}>
                  <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="รหัสผ่าน" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    สมัครสมาชิก
                  </Button>
                </Form.Item>
              </Form>
            )
          }
        ]} />
      </Card>
    </main>
  );
};

export default Login;

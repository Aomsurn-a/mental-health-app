import React, { useContext, useState } from 'react';
import { Card, Form, Input, Button, Typography, Tabs, message, Row, Col, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import authService from '../services/authService';

const { Title, Text } = Typography;

const Profile: React.FC = () => {
  const auth = useContext(AuthContext);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const roleText: Record<string, string> = {
    user: 'ผู้ใช้งาน',
    psychologist: 'นักจิตวิทยา',
    admin: 'ผู้ดูแลระบบ',
  };

  const handleUpdateProfile = async (values: any) => {
    setProfileLoading(true);
    try {
      await authService.updateProfile(values);
      message.success('อัพเดทข้อมูลสำเร็จ');
    } catch {
      message.error('อัพเดทข้อมูลไม่สำเร็จ');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    setPasswordLoading(true);
    try {
      await authService.changePassword(values.old_password, values.new_password);
      message.success('เปลี่ยนรหัสผ่านสำเร็จ');
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>ข้อมูลส่วนตัว</Title>

      {/* ข้อมูลโปรไฟล์ */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <Avatar size={64} icon={<UserOutlined />} style={{ background: '#1677ff' }} />
          </Col>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              {auth?.user?.first_name} {auth?.user?.last_name}
            </Title>
            <Text type="secondary">{auth?.user?.email}</Text>
            <br />
            <Text type="secondary">{roleText[auth?.user?.role || 'user']}</Text>
          </Col>
        </Row>
      </Card>

      <Tabs items={[
        {
          key: 'profile',
          label: 'แก้ไขข้อมูล',
          children: (
            <Card>
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleUpdateProfile}
                initialValues={{
                  first_name: auth?.user?.first_name,
                  last_name: auth?.user?.last_name,
                  phone: (auth?.user as any)?.phone,
                  province: (auth?.user as any)?.province,
                }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="first_name" label="ชื่อ"
                      rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
                      <Input placeholder="ชื่อ" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="last_name" label="นามสกุล"
                      rules={[{ required: true, message: 'กรุณากรอกนามสกุล' }]}>
                      <Input placeholder="นามสกุล" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="phone" label="เบอร์โทร">
                  <Input placeholder="เบอร์โทร" />
                </Form.Item>
                <Form.Item name="province" label="จังหวัด">
                  <Input placeholder="จังหวัด" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={profileLoading}>
                    บันทึกข้อมูล
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          ),
        },
        {
          key: 'password',
          label: 'เปลี่ยนรหัสผ่าน',
          children: (
            <Card>
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handleChangePassword}
                style={{ maxWidth: 400 }}
              >
                <Form.Item name="old_password" label="รหัสผ่านเดิม"
                  rules={[{ required: true, message: 'กรุณากรอกรหัสผ่านเดิม' }]}>
                  <Input.Password placeholder="รหัสผ่านเดิม" />
                </Form.Item>
                <Form.Item name="new_password" label="รหัสผ่านใหม่"
                  rules={[
                    { required: true, message: 'กรุณากรอกรหัสผ่านใหม่' },
                    { min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }
                  ]}>
                  <Input.Password placeholder="รหัสผ่านใหม่" />
                </Form.Item>
                <Form.Item name="confirm_password" label="ยืนยันรหัสผ่านใหม่"
                  dependencies={['new_password']}
                  rules={[
                    { required: true, message: 'กรุณายืนยันรหัสผ่าน' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('new_password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('รหัสผ่านไม่ตรงกัน'));
                      },
                    }),
                  ]}>
                  <Input.Password placeholder="ยืนยันรหัสผ่านใหม่" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={passwordLoading}>
                    เปลี่ยนรหัสผ่าน
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          ),
        },
      ]} />
    </div>
  );
};

export default Profile;
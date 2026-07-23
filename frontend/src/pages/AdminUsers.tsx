import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Typography, Row, Col, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { adminService } from '../services/adminService';
import type { UserAdmin } from '../services/adminService';
import { hospitalService } from '../services/hospitalService';
import type { Hospital } from '../services/hospitalService';

const { Title, Text } = Typography;

const roleConfig: Record<string, { color: string; text: string }> = {
  user:          { color: 'blue',   text: 'ผู้ใช้งาน' },
  psychologist:  { color: 'green',  text: 'นักจิตวิทยา' },
  admin:         { color: 'red',    text: 'ผู้ดูแลระบบ' },
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAdmin | null>(null);
  const [selectedRole, setSelectedRole] = useState('user');
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const fetchUsers = async () => {
    try {
      const data = await adminService.getAllUsers();
      setUsers(data);
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    }
  };

  useEffect(() => {
    fetchUsers();
    hospitalService.getAllHospitals().then(setHospitals).catch(() => {});
  }, []);

  const handleCreate = async (values: any) => {
    setLoading(true);
    try {
      await adminService.createUser(values);
      message.success('สร้างบัญชีสำเร็จ');
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchUsers();
    } catch {
      message.error('สร้างบัญชีไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (values: any) => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await adminService.updateUser(selectedUser.id, values);
      message.success('แก้ไขข้อมูลสำเร็จ');
      setEditModalOpen(false);
      fetchUsers();
    } catch {
      message.error('แก้ไขไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values: any) => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await adminService.resetPassword(selectedUser.id, values.password);
      message.success('รีเซ็ตรหัสผ่านสำเร็จ');
      setPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch {
      message.error('รีเซ็ตรหัสผ่านไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminService.deleteUser(id);
      message.success('ลบบัญชีสำเร็จ');
      fetchUsers();
    } catch {
      message.error('ลบบัญชีไม่สำเร็จ');
    }
  };

  const columns = [
    {
      title: 'ชื่อ-นามสกุล',
      render: (_: any, record: UserAdmin) => (
        <div>
          <Text strong>{record.first_name} {record.last_name}</Text>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    {
      title: 'Username',
      dataIndex: 'username',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role: string) => {
        const config = roleConfig[role];
        return <Tag color={config?.color}>{config?.text}</Tag>;
      },
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'ใช้งาน' : 'ระงับ'}
        </Tag>
      ),
    },
    {
      title: 'จัดการ',
      render: (_: any, record: UserAdmin) => (
        <Row gutter={4}>
          <Col>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              setSelectedUser(record);
              editForm.setFieldsValue(record);
              setEditModalOpen(true);
            }} />
          </Col>
          <Col>
            <Button size="small" icon={<KeyOutlined />} onClick={() => {
              setSelectedUser(record);
              setPasswordModalOpen(true);
            }} />
          </Col>
          <Col>
            <Popconfirm
              title="ยืนยันการลบบัญชีนี้?"
              onConfirm={() => handleDelete(record.id)}
              okText="ลบ" cancelText="ยกเลิก"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={2}>จัดการบัญชี</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            สร้างบัญชีใหม่
          </Button>
        </Col>
      </Row>

      <Card>
        <Table dataSource={users} columns={columns} rowKey="id"
          locale={{ emptyText: 'ไม่มีผู้ใช้งาน' }} />
      </Card>

      {/* Modal สร้างบัญชี */}
      <Modal title="สร้างบัญชีใหม่" open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()} okText="สร้าง" cancelText="ยกเลิก"
        confirmLoading={loading} width={600}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="ชื่อ" rules={[{ required: true }]}>
                <Input placeholder="ชื่อ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="นามสกุล" rules={[{ required: true }]}>
                <Input placeholder="นามสกุล" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input placeholder="Username" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="Email" />
          </Form.Item>
          <Form.Item name="password" label="รหัสผ่าน" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="รหัสผ่าน" />
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="user">
            <Select onChange={val => setSelectedRole(val)}>
              <Select.Option value="user">ผู้ใช้งาน</Select.Option>
              <Select.Option value="psychologist">นักจิตวิทยา</Select.Option>
              <Select.Option value="admin">ผู้ดูแลระบบ</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="phone" label="เบอร์โทร">
            <Input placeholder="เบอร์โทร" />
          </Form.Item>
          <Form.Item name="province" label="จังหวัด">
            <Input placeholder="จังหวัด" />
          </Form.Item>

          {selectedRole === 'psychologist' && (
            <>
              <Form.Item name="license_number" label="เลขใบอนุญาต" rules={[{ required: true }]}>
                <Input placeholder="เลขใบอนุญาต" />
              </Form.Item>
              <Form.Item name="specialty" label="ความเชี่ยวชาญ">
                <Input placeholder="ความเชี่ยวชาญ" />
              </Form.Item>
              <Form.Item name="hospital_id" label="โรงพยาบาล/คลินิก">
                <Select
                  placeholder="เลือกโรงพยาบาล/คลินิก"
                  allowClear
                  options={hospitals.map(h => ({ value: h.id, label: h.name }))}
                />
              </Form.Item>
              <Form.Item name="experience_years" label="ประสบการณ์ (ปี)">
                <Input type="number" placeholder="ปี" />
              </Form.Item>
              <Form.Item name="bio" label="ประวัติ">
                <Input.TextArea rows={3} placeholder="ประวัติโดยย่อ..." />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Modal แก้ไขข้อมูล */}
      <Modal title="แก้ไขข้อมูล" open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => editForm.submit()} okText="บันทึก" cancelText="ยกเลิก"
        confirmLoading={loading}>
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="ชื่อ" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="นามสกุล" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="phone" label="เบอร์โทร">
            <Input />
          </Form.Item>
          <Form.Item name="province" label="จังหวัด">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="สถานะ">
            <Select>
              <Select.Option value="active">ใช้งาน</Select.Option>
              <Select.Option value="inactive">ไม่ใช้งาน</Select.Option>
              <Select.Option value="suspended">ระงับ</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal รีเซ็ตรหัสผ่าน */}
      <Modal title={`รีเซ็ตรหัสผ่าน — ${selectedUser?.first_name} ${selectedUser?.last_name}`}
        open={passwordModalOpen}
        onCancel={() => { setPasswordModalOpen(false); passwordForm.resetFields(); }}
        onOk={() => passwordForm.submit()} okText="รีเซ็ต" cancelText="ยกเลิก"
        confirmLoading={loading}>
        <Form form={passwordForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item name="password" label="รหัสผ่านใหม่"
            rules={[{ required: true, min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }]}>
            <Input.Password placeholder="รหัสผ่านใหม่" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;
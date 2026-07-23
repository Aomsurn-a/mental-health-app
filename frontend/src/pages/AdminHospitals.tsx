import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Typography, Row, Col, Popconfirm, message, List, Avatar, Empty, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UserOutlined, UserAddOutlined } from '@ant-design/icons';
import { hospitalService } from '../services/hospitalService';
import type { Hospital, HospitalPsychologist } from '../services/hospitalService';
import { appointmentService } from '../services/appointmentService';
import type { Psychologist } from '../services/appointmentService';

const { Title, Text } = Typography;

const AdminHospitals: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [psyModalOpen, setPsyModalOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [psychologists, setPsychologists] = useState<HospitalPsychologist[]>([]);
  const [psyLoading, setPsyLoading] = useState(false);
  const [allPsychologists, setAllPsychologists] = useState<Psychologist[]>([]);
  const [addingPsy, setAddingPsy] = useState(false);
  const [newPsyId, setNewPsyId] = useState<number | undefined>(undefined);
  const [assignLoading, setAssignLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchHospitals = async () => {
    try {
      const data = await hospitalService.getAllHospitals();
      setHospitals(data);
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleCreate = async (values: any) => {
    setLoading(true);
    try {
      await hospitalService.createHospital(values);
      message.success('สร้างโรงพยาบาลสำเร็จ');
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchHospitals();
    } catch {
      message.error('สร้างโรงพยาบาลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (values: any) => {
    if (!selectedHospital) return;
    setLoading(true);
    try {
      await hospitalService.updateHospital(selectedHospital.id, values);
      message.success('แก้ไขข้อมูลสำเร็จ');
      setEditModalOpen(false);
      fetchHospitals();
    } catch {
      message.error('แก้ไขไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await hospitalService.deleteHospital(id);
      message.success('ลบโรงพยาบาลสำเร็จ');
      fetchHospitals();
    } catch {
      message.error('ลบไม่สำเร็จ');
    }
  };

  const handleShowPsychologists = async (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setPsyModalOpen(true);
    setAddingPsy(false);
    setNewPsyId(undefined);
    setPsyLoading(true);
    try {
      const [data, allPsy] = await Promise.all([
        hospitalService.getPsychologistsByHospital(hospital.id),
        appointmentService.getPsychologists(),
      ]);
      setPsychologists(data);
      setAllPsychologists(allPsy);
    } catch {
      message.error('โหลดข้อมูลนักจิตวิทยาไม่สำเร็จ');
    } finally {
      setPsyLoading(false);
    }
  };

  const refreshHospitalPsychologists = async () => {
    if (!selectedHospital) return;
    const [data, allPsy] = await Promise.all([
      hospitalService.getPsychologistsByHospital(selectedHospital.id),
      appointmentService.getPsychologists(),
    ]);
    setPsychologists(data);
    setAllPsychologists(allPsy);
  };

  const handleAssignPsychologist = async () => {
    if (!selectedHospital || !newPsyId) return;
    setAssignLoading(true);
    try {
      await hospitalService.assignPsychologist(selectedHospital.id, newPsyId);
      message.success('เพิ่มนักจิตวิทยาเข้าโรงพยาบาลสำเร็จ');
      setAddingPsy(false);
      setNewPsyId(undefined);
      await refreshHospitalPsychologists();
    } catch {
      message.error('เพิ่มนักจิตวิทยาไม่สำเร็จ');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemovePsychologist = async (psyId: number) => {
    if (!selectedHospital) return;
    try {
      await hospitalService.removePsychologist(selectedHospital.id, psyId);
      message.success('ลบนักจิตวิทยาออกจากโรงพยาบาลสำเร็จ');
      await refreshHospitalPsychologists();
    } catch {
      message.error('ลบไม่สำเร็จ');
    }
  };

  const unassignedPsychologists = allPsychologists.filter(p => !p.hospital_id);

  const columns = [
    {
      title: 'ชื่อโรงพยาบาล/คลินิก',
      dataIndex: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'ที่อยู่',
      dataIndex: 'address',
      render: (address: string) => address || '-',
    },
    {
      title: 'เบอร์โทร',
      dataIndex: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
        </Tag>
      ),
    },
    {
      title: 'จัดการ',
      render: (_: any, record: Hospital) => (
        <Row gutter={4}>
          <Col>
            <Button size="small" icon={<TeamOutlined />} onClick={() => handleShowPsychologists(record)}>
              นักจิตวิทยา
            </Button>
          </Col>
          <Col>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              setSelectedHospital(record);
              editForm.setFieldsValue(record);
              setEditModalOpen(true);
            }} />
          </Col>
          <Col>
            <Popconfirm
              title="ยืนยันการลบโรงพยาบาลนี้?"
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
        <Col><Title level={2}>จัดการโรงพยาบาล/คลินิก</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            เพิ่มโรงพยาบาล/คลินิก
          </Button>
        </Col>
      </Row>

      <Card>
        <Table dataSource={hospitals} columns={columns} rowKey="id"
          locale={{ emptyText: 'ไม่มีโรงพยาบาล/คลินิก' }} />
      </Card>

      {/* Modal สร้างโรงพยาบาล */}
      <Modal title="เพิ่มโรงพยาบาล/คลินิก" open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()} okText="สร้าง" cancelText="ยกเลิก"
        confirmLoading={loading}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="ชื่อโรงพยาบาล/คลินิก" rules={[{ required: true }]}>
            <Input placeholder="ชื่อโรงพยาบาล/คลินิก" />
          </Form.Item>
          <Form.Item name="address" label="ที่อยู่">
            <Input.TextArea rows={2} placeholder="ที่อยู่" />
          </Form.Item>
          <Form.Item name="phone" label="เบอร์โทร">
            <Input placeholder="เบอร์โทร" />
          </Form.Item>
          <Form.Item name="status" label="สถานะ" initialValue="active">
            <Select>
              <Select.Option value="active">ใช้งาน</Select.Option>
              <Select.Option value="inactive">ไม่ใช้งาน</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal แก้ไขโรงพยาบาล */}
      <Modal title="แก้ไขโรงพยาบาล/คลินิก" open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => editForm.submit()} okText="บันทึก" cancelText="ยกเลิก"
        confirmLoading={loading}>
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="name" label="ชื่อโรงพยาบาล/คลินิก" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="ที่อยู่">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="phone" label="เบอร์โทร">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="สถานะ">
            <Select>
              <Select.Option value="active">ใช้งาน</Select.Option>
              <Select.Option value="inactive">ไม่ใช้งาน</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal นักจิตวิทยาในโรงพยาบาล */}
      <Modal
        title={`นักจิตวิทยา — ${selectedHospital?.name || ''}`}
        open={psyModalOpen}
        onCancel={() => { setPsyModalOpen(false); setAddingPsy(false); setNewPsyId(undefined); }}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          {!addingPsy ? (
            <Button icon={<UserAddOutlined />} onClick={() => setAddingPsy(true)}>
              เพิ่มนักจิต
            </Button>
          ) : (
            <Space.Compact style={{ width: '100%' }}>
              <Select
                style={{ width: '100%' }}
                placeholder="เลือกนักจิตวิทยาที่ยังไม่สังกัดโรงพยาบาล"
                value={newPsyId}
                onChange={setNewPsyId}
                notFoundContent="ไม่มีนักจิตวิทยาที่ว่างสังกัด"
                options={unassignedPsychologists.map(p => ({
                  value: p.id,
                  label: `${p.first_name} ${p.last_name}${p.specialty ? ' — ' + p.specialty : ''}`,
                }))}
              />
              <Button type="primary" onClick={handleAssignPsychologist} loading={assignLoading} disabled={!newPsyId}>
                ยืนยัน
              </Button>
              <Button onClick={() => { setAddingPsy(false); setNewPsyId(undefined); }}>
                ยกเลิก
              </Button>
            </Space.Compact>
          )}
        </div>

        {psychologists.length === 0 && !psyLoading ? (
          <Empty description="ไม่มีนักจิตวิทยาสังกัดโรงพยาบาลนี้" />
        ) : (
          <List
            loading={psyLoading}
            dataSource={psychologists}
            renderItem={psy => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="remove"
                    title="ยืนยันการลบนักจิตวิทยาออกจากโรงพยาบาลนี้?"
                    onConfirm={() => handleRemovePsychologist(psy.id)}
                    okText="ลบ" cancelText="ยกเลิก"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />}
                  title={`${psy.first_name} ${psy.last_name}`}
                  description={psy.specialty || 'ไม่ระบุความเชี่ยวชาญ'}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default AdminHospitals;

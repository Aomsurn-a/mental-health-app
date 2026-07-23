import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Tag, Button, Modal, Descriptions, Avatar, Input, Select } from 'antd';
import { UserOutlined, SearchOutlined, MessageOutlined, CalendarOutlined } from '@ant-design/icons';
import { appointmentService } from '../services/appointmentService';
import type { Psychologist } from '../services/appointmentService';
import { hospitalService } from '../services/hospitalService';
import type { Hospital } from '../services/hospitalService';
import { useNavigate } from 'react-router-dom';


const { Title, Text } = Typography;
const { Search } = Input;


const PsychologistList: React.FC = () => {
    const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [filtered, setFiltered] = useState<Psychologist[]>([]);
    const [selected, setSelected] = useState<Psychologist | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState<number | undefined>(undefined);
    const [keyword, setKeyword] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [psyData, hospitalData] = await Promise.all([
                    appointmentService.getPsychologists(),
                    hospitalService.getAllHospitals(),
                ]);
                setPsychologists(psyData);
                setFiltered(psyData);
                setHospitals(hospitalData);
            } catch {
                console.error('โหลดข้อมูลไม่สำเร็จ');
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        let result = psychologists;
        if (selectedHospital) {
            result = result.filter(p => p.hospital_id === selectedHospital);
        }
        if (keyword) {
            result = result.filter(p =>
                `${p.first_name} ${p.last_name}`.toLowerCase().includes(keyword.toLowerCase()) ||
                p.specialty?.toLowerCase().includes(keyword.toLowerCase()) ||
                p.hospital_name?.toLowerCase().includes(keyword.toLowerCase())
            );
        }
        setFiltered(result);
    }, [selectedHospital, keyword, psychologists]);

    return (
        <div>
            <Title level={2}>รายชื่อนักจิตวิทยา</Title>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col flex="auto" style={{ maxWidth: 400 }}>
                    <Search
                        placeholder="ค้นหาชื่อ, ความเชี่ยวชาญ หรือโรงพยาบาล..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        onSearch={setKeyword}
                        onChange={e => setKeyword(e.target.value)}
                    />
                </Col>
                <Col>
                    <Select
                        placeholder="เลือกโรงพยาบาล/คลินิก"
                        allowClear
                        style={{ width: 220 }}
                        value={selectedHospital}
                        onChange={setSelectedHospital}
                        options={hospitals.map(h => ({ value: h.id, label: h.name }))}
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                {filtered.map(psy => (
                    <Col xs={24} sm={12} lg={8} key={psy.id}>
                        <Card
                            hoverable
                            actions={[
                                <Button type="link" onClick={() => {
                                    setSelected(psy);
                                    setModalOpen(true);
                                }}>
                                    ดูข้อมูล
                                </Button>
                            ]}
                        >
                            <Card.Meta
                                avatar={
                                    <Avatar size={48} icon={<UserOutlined />} style={{ background: '#1677ff' }} />
                                }
                                title={`${psy.first_name} ${psy.last_name}`}
                                description={
                                    <div>
                                        <Tag color="blue">{psy.specialty || 'ไม่ระบุ'}</Tag>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {psy.hospital_name || 'ไม่ระบุสถานที่'}
                                        </Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            ประสบการณ์ {psy.experience_years} ปี
                                        </Text>
                                    </div>
                                }
                            />
                        </Card>
                    </Col>
                ))}

                {filtered.length === 0 && (
                    <Col span={24}>
                        <Card>
                            <Text type="secondary">ไม่พบนักจิตวิทยาที่ค้นหา</Text>
                        </Card>
                    </Col>
                )}
            </Row>

            <Modal
                title="ข้อมูลนักจิตวิทยา"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={[
                    <Button key="chat" icon={<MessageOutlined />} onClick={async () => {
                        setModalOpen(false);
                        // นำทางไปหน้าแชทพร้อม partner_id
                        navigate(`/chat?partner_id=${selected?.id}&partner_user_id=${selected?.user_id || ''}`);
                    }}>
                        เริ่มแชท
                    </Button>,
                    <Button key="appointment" type="primary" icon={<CalendarOutlined />} onClick={() => {
                        setModalOpen(false);
                        // นำทางไปหน้านัดหมายพร้อม psychologist_id ที่เลือกไว้
                        navigate(`/appointment?psy_id=${selected?.id}`);
                    }}>
                        นัดหมาย
                    </Button>,
                ]}
                width={500}
            >
                {selected && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Avatar size={80} icon={<UserOutlined />} style={{ background: '#1677ff' }} />
                            <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
                                {selected.first_name} {selected.last_name}
                            </Title>
                            <Tag color="blue">{selected.specialty}</Tag>
                        </div>
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="โรงพยาบาล/คลินิก">
                                {selected.hospital_name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="เบอร์โทร">
                                {selected.phone || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="ประสบการณ์">
                                {selected.experience_years} ปี
                            </Descriptions.Item>
                            <Descriptions.Item label="เลขใบอนุญาต">
                                {selected.license_number}
                            </Descriptions.Item>
                            <Descriptions.Item label="ประวัติ">
                                {selected.bio || '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PsychologistList;
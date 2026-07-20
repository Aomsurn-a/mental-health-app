import React, { useEffect, useState, useRef, useContext } from 'react';
import { Card, Input, Button, Typography, Badge, Avatar, List, Row, Col, message } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { chatService } from '../services/chatService';
import { AuthContext } from '../context/AuthContext';
import type { ChatPartner, ChatMessage } from '../services/chatService';
import { useSearchParams } from 'react-router-dom';

const { Text, Title } = Typography;

const Chat: React.FC = () => {
  const auth = useContext(AuthContext);
  const [chatList, setChatList] = useState<ChatPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ChatPartner | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<any>(null);
  const lastIdRef = useRef<number>(0);

  // โหลดรายชื่อที่คุยด้วยได้
  useEffect(() => {
    const fetchChatList = async () => {
      try {
        const data = await chatService.getChatList();
        setChatList(data);
      } catch {
        console.error('โหลดรายชื่อไม่สำเร็จ');
      }
    };
    fetchChatList();

    // รีโหลดรายชื่อทุก 10 วินาที
    const interval = setInterval(fetchChatList, 10000);
    return () => clearInterval(interval);
  }, []);

  // เลือกคนคุย
  const handleSelectPartner = async (partner: ChatPartner) => {
    setSelectedPartner(partner);
    setMessages([]);
    lastIdRef.current = 0;

    // หยุด polling เดิม
    if (pollingRef.current) clearInterval(pollingRef.current);

    try {
      const data = await chatService.getMessages(partner.id);
      setMessages(data);
      if (data.length > 0) {
        lastIdRef.current = data[data.length - 1].id;
      }
    } catch {
      message.error('โหลดข้อความไม่สำเร็จ');
    }

    // เริ่ม polling ทุก 3 วินาที
    pollingRef.current = setInterval(async () => {
      try {
        const newMsgs = await chatService.getNewMessages(partner.id, lastIdRef.current);
        if (newMsgs.length > 0) {
          setMessages(prev => [...prev, ...newMsgs]);
          lastIdRef.current = newMsgs[newMsgs.length - 1].id;
        }
      } catch {
        console.error('polling error');
      }
    }, 3000);
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const partnerId = searchParams.get('partner_id');
    if (partnerId && chatList.length > 0) {
      const partner = chatList.find(p => p.id === Number(partnerId));
      if (partner) {
        handleSelectPartner(partner);
        // ล้าง URL parameter หลังเลือกแล้ว
        window.history.replaceState({}, '', '/chat');
      }
    }
  }, [searchParams, chatList]); // chatList เป็น dependency ด้วย

  // หยุด polling เมื่อออกจากหน้า
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Scroll ลงล่างสุดเมื่อมีข้อความใหม่
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ส่งข้อความ
  const handleSend = async () => {
    if (!inputMessage.trim() || !selectedPartner) return;
    setSending(true);
    try {
      const newMsg = await chatService.sendMessage(selectedPartner.id, inputMessage.trim());
      setMessages(prev => [...prev, newMsg]);
      lastIdRef.current = newMsg.id;
      setInputMessage('');
    } catch {
      message.error('ส่งข้อความไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div>
      <Title level={2}>แชท</Title>
      <Row gutter={16} style={{ height: 'calc(100vh - 200px)' }}>

        {/* รายชื่อ */}
        <Col span={8}>
          <Card
            title="รายชื่อ"
            style={{ height: '100%', overflow: 'auto' }}
            bodyStyle={{ padding: 0 }}
          >
            {chatList.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <Text type="secondary">ยังไม่มีรายชื่อที่คุยด้วยได้</Text>
              </div>
            ) : (
              <List
                dataSource={chatList}
                renderItem={partner => (
                  <List.Item
                    onClick={() => handleSelectPartner(partner)}
                    style={{
                      cursor: 'pointer',
                      padding: '12px 16px',
                      background: selectedPartner?.id === partner.id ? '#e6f4ff' : 'white',
                      borderLeft: selectedPartner?.id === partner.id ? '3px solid #1677ff' : '3px solid transparent',
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={partner.unread_count} size="small">
                          <Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />
                        </Badge>
                      }
                      title={<Text strong>{partner.first_name} {partner.last_name}</Text>}
                      description={
                        <Text type="secondary" ellipsis style={{ maxWidth: 150 }}>
                          {partner.last_message || 'ยังไม่มีข้อความ'}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* กล่องแชท */}
        <Col span={16}>
          <Card
            title={selectedPartner
              ? `${selectedPartner.first_name} ${selectedPartner.last_name}`
              : 'เลือกคนที่ต้องการคุย'
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}
          >
            {!selectedPartner ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text type="secondary">เลือกรายชื่อเพื่อเริ่มสนทนา</Text>
              </div>
            ) : (
              <>
                {/* ข้อความ */}
                <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#f5f5f5' }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: 40 }}>
                      <Text type="secondary">เริ่มการสนทนาได้เลย</Text>
                    </div>
                  )}
                  {messages.map(msg => {
                    const isMe = msg.sender_id === auth?.user?.id;
                    return (
                      <div key={msg.id} style={{
                        display: 'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        marginBottom: 12,
                      }}>
                        {!isMe && (
                          <Avatar icon={<UserOutlined />}
                            style={{ background: '#1677ff', marginRight: 8, flexShrink: 0 }} />
                        )}
                        <div style={{ maxWidth: '65%' }}>
                          <div style={{
                            background: isMe ? '#1677ff' : 'white',
                            color: isMe ? 'white' : 'black',
                            padding: '8px 12px',
                            borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            wordBreak: 'break-word',
                          }}>
                            {msg.message}
                          </div>
                          <Text type="secondary" style={{
                            fontSize: 11, marginTop: 2, display: 'block',
                            textAlign: isMe ? 'right' : 'left'
                          }}>
                            {dayjs(msg.sent_at).format('HH:mm')}
                          </Text>
                        </div>
                        {isMe && (
                          <Avatar icon={<UserOutlined />}
                            style={{ background: '#52c41a', marginLeft: 8, flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* กล่องพิมพ์ */}
                <div style={{ padding: 12, background: 'white', borderTop: '1px solid #f0f0f0' }}>
                  <Row gutter={8} align="middle">
                    <Col flex={1}>
                      <Input.TextArea
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="พิมพ์ข้อความ... (Enter เพื่อส่ง)"
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        style={{ borderRadius: 20 }}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<SendOutlined />}
                        onClick={handleSend}
                        loading={sending}
                        disabled={!inputMessage.trim()}
                      />
                    </Col>
                  </Row>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Chat;
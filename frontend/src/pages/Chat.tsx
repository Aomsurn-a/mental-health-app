import React, { useEffect, useState, useRef, useContext } from 'react';
import { Card, Input, Button, Typography, Badge, Avatar, List, Row, Col, message, Alert, Segmented } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { chatService } from '../services/chatService';
import { aiChatService } from '../services/aiChatService';
import { AuthContext } from '../context/AuthContext';
import type { ChatPartner, ChatMessage } from '../services/chatService';
import type { AiChatMessage } from '../services/aiChatService';
import { useSearchParams } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';

const { Text, Title } = Typography;

type ChatMode = 'human' | 'ai';
type AiDisplayItem = AiChatMessage | { id: string; role: 'system'; content: string };

const Chat: React.FC = () => {
  const auth = useContext(AuthContext);
  const [chatList, setChatList] = useState<ChatPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ChatPartner | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const selectedIdRef = useRef<number | null>(null);
  const sendBusy = useRef(false);
  const aiBusy = useRef(false);
  const lastIdRef = useRef<number>(0);

  // AI chat mode
  const [mode, setMode] = useState<ChatMode>('human');
  const [aiMessages, setAiMessages] = useState<AiDisplayItem[]>([]);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [aiInputMessage, setAiInputMessage] = useState('');
  const [aiSending, setAiSending] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiRetry, setAiRetry] = useState<AiChatMessage | null>(null);
  const isUser = auth?.user?.role === 'user';
  const mergeMessages = (previous: ChatMessage[], incoming: ChatMessage[]) =>
    [...new Map([...previous, ...incoming].map(m => [m.id, m])).values()].sort((a,b) => a.id-b.id);


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

  const handleSelectPartner = (partner: ChatPartner) => {
    selectedIdRef.current = partner.id;
    setSelectedPartner(partner);
    setMode('human');
    setInputMessage('');
  };

  useEffect(() => {
    const partnerId = selectedPartner?.id;
    if (!partnerId) return;
    let active = true;
    let busy = false;
    lastIdRef.current = 0;
    setMessages([]);
    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const incoming = await chatService.getNewMessages(partnerId, lastIdRef.current);
        if (active && selectedIdRef.current === partnerId) {
          setMessages(previous => mergeMessages(previous, incoming));
          if (incoming.length) lastIdRef.current = incoming[incoming.length - 1].id;
        }
      } catch { /* Retry next tick; don't discard displayed messages. */ }
      finally { busy = false; }
    };
    const load = async () => {
      busy = true;
      try {
        const history = await chatService.getMessages(partnerId);
        if (active && selectedIdRef.current === partnerId) {
          setMessages(previous => mergeMessages(previous, history));
          lastIdRef.current = history.at(-1)?.id || 0;
        }
      } catch { if (active) message.error('โหลดข้อความไม่สำเร็จ กรุณาลองเลือกผู้รับอีกครั้ง'); }
      finally { busy = false; }
    };
    void load();
    const timer = setInterval(poll, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [selectedPartner?.id]);

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

  const handleSend = async () => {
    if (sendBusy.current || !inputMessage.trim() || !selectedPartner) return;
    const partnerId = selectedPartner.id;
    const text = inputMessage.trim();
    sendBusy.current = true;
    setSending(true);
    try {
      const newMsg = await chatService.sendMessage(partnerId, text);
      if (selectedIdRef.current === partnerId) {
        setMessages(previous => mergeMessages(previous, [newMsg]));
        setInputMessage('');
      }
      // Only polling advances its cursor, so simultaneous incoming messages
      // with an earlier ID than this outgoing message are never skipped.
    } catch (error: unknown) {
      const failure = error as { response?: { data?: { message?: string } } };
      message.error(failure.response?.data?.message || 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      sendBusy.current = false;
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // โหมด AI: โหลดประวัติแชท AI (โหลดครั้งแรกเท่านั้น)
  const handleSwitchToAi = async () => {
    if (!isUser) return;
    setMode('ai');
    if (!aiLoaded) {
      try {
        const history = await aiChatService.getHistory();
        setAiMessages(history);
        const last = history.at(-1);
        if (last?.role === 'user') { setAiRetry(last); setAiError('ข้อความล่าสุดยังไม่มีคำตอบ ลองขอคำตอบอีกครั้งได้'); }
        setAiLoaded(true);
      } catch {
        message.error('โหลดประวัติแชท AI ไม่สำเร็จ');
      }
    }
  };

  const handleSendAi = async (retry = false) => {
    const text = retry ? aiRetry?.content : aiInputMessage.trim();
    if (aiBusy.current || !text) return;
    aiBusy.current = true;
    setAiSending(true);
    setAiError('');
    const append = (userMessage: AiChatMessage, assistant?: AiChatMessage,
      alert?: { id: number; status: string } | null) => {
      setAiMessages(previous => {
        const incoming: AiDisplayItem[] = [userMessage, ...(assistant ? [assistant] : [])];
        if (alert) incoming.push({
          id: 'notice-' + alert.id, role: 'system',
          content: alert.status === 'queued_for_psychologist'
            ? 'ส่งการแจ้งเตือนไปยังหน้าจอนักจิตวิทยาแล้ว แต่อาจยังไม่มีผู้รับทราบ หากไม่ปลอดภัยอย่ารอคำตอบจากแชท'
            : 'บันทึกการแจ้งเตือนแล้ว แต่ยังไม่มีนักจิตวิทยาที่ผูกกับคุณ กรุณาติดต่อนักจิตวิทยาหรือคนที่ไว้ใจ หากมีอันตรายเร่งด่วนโทร 1669 หรือ 191',
        });
        return [...new Map([...previous, ...incoming].map(m => [m.id,m])).values()];
      });
    };
    try {
      const result = await aiChatService.sendMessage(text, retry ? aiRetry?.id : undefined);
      append(result.data.user_message, result.data.assistant_message, result.data.risk_alert);
      setAiRetry(null);
      if (!retry) setAiInputMessage('');
    } catch (error: unknown) {
      const failure = error as { response?: { data?: { message?: string; data?: {
        user_message?: AiChatMessage; risk_alert?: { id: number; status: string } | null;
      } } } };
      const payload = failure.response?.data;
      const saved = payload?.data?.user_message;
      if (saved) {
        append(saved, undefined, payload?.data?.risk_alert);
        setAiRetry(saved);
        if (!retry) setAiInputMessage('');
      }
      setAiError(payload?.message || 'เชื่อมต่อไม่ได้ ข้อความยังอยู่ในช่องพิมพ์ กรุณาลองใหม่');
    } finally {
      aiBusy.current = false;
      setAiSending(false);
    }
  };

  const handleAiKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAi();
    }
  };

  // เช็คว่านักจิตยังไม่ได้อ่านข้อความล่าสุดที่ user ส่งไป เกิน 5 นาทีหรือไม่
  const currentPartnerData = selectedPartner
    ? chatList.find(p => p.id === selectedPartner.id) || selectedPartner
    : null;

  const showAiPrompt = !!(
    currentPartnerData &&
    currentPartnerData.my_last_sent_read === 0 &&
    currentPartnerData.my_last_sent_at &&
    dayjs().diff(dayjs(currentPartnerData.my_last_sent_at), 'minute') >= 5
  );

  return (
    <div className="chat-page">
      <Title level={2} className="app-page-title">แชท</Title>
      <div className="chat-layout">

        {/* รายชื่อ */}
        <div className="chat-list-column">
          <Card
            className="chat-list-panel"
            title="รายชื่อ"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 0 }}
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
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedPartner?.id === partner.id}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectPartner(partner);
                      }
                    }}
                    className={`chat-partner-item${selectedPartner?.id === partner.id ? ' chat-partner-selected' : ''}`}
                    onClick={() => handleSelectPartner(partner)}
                  >
                    <List.Item.Meta
                      className="chat-partner-meta"
                      avatar={
                        <Badge count={partner.unread_count} size="small">
                          <Avatar icon={<UserOutlined />} style={{ background: 'var(--role-primary)' }} />
                        </Badge>
                      }
                      title={<Text strong>{partner.first_name} {partner.last_name}</Text>}
                      description={
                        <Text type="secondary" ellipsis>
                          {partner.last_message || 'ยังไม่มีข้อความ'}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>

        {/* กล่องแชท */}
        <div className="chat-conversation-column">
          <Card
            className="chat-conversation-panel"
            title={
              mode === 'ai'
                ? 'คุยกับ AI ระหว่างรอ'
                : selectedPartner ? `${selectedPartner.first_name} ${selectedPartner.last_name}` : 'เลือกคนที่ต้องการคุย'
            }
            extra={
              isUser && (
                <Segmented
                  className="chat-mode-switch"
                  value={mode}
                  onChange={(val) => (val === 'ai' ? handleSwitchToAi() : setMode('human'))}
                  options={[
                    { label: 'แชทกับนักจิต', value: 'human' },
                    { label: 'คุยกับ AI', value: 'ai' },
                  ]}
                />
              )
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
          >
            {!selectedPartner && mode !== 'ai' ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text type="secondary">เลือกรายชื่อเพื่อเริ่มสนทนา</Text>
              </div>
            ) : mode === 'ai' ? (
              <>
                {/* Banner เตือน */}
                <Alert
                  type="warning"
                  showIcon
                  banner
                  className="chat-ai-notice"
                  message="นี่คือ AI ผู้ช่วยเบื้องต้น ไม่ใช่นักจิตวิทยาจริง คำแนะนำนี้ไม่สามารถทดแทนการรักษาทางการแพทย์ได้ หากมีเหตุฉุกเฉิน โทร 1323 (สายด่วนสุขภาพจิต) หรือ 1669"
                  style={{ borderRadius: 0 }}
                />

                {aiError && <Alert type="error" showIcon title={aiError} role="alert"
                  action={aiRetry ? <Button onClick={() => handleSendAi(true)} loading={aiSending}>ลองขอคำตอบอีกครั้ง</Button> : undefined} />}
                {/* ข้อความ AI */}
                {aiMessages.length === 0 ? (
                  <div className="chat-empty"><Text type="secondary">เริ่มพูดคุยกับ AI ได้เลย</Text></div>
                ) : (
                  <Virtuoso
                    className="chat-messages"
                    style={{ flex: 1, minHeight: 0 }}
                    data={aiMessages}
                    initialTopMostItemIndex={{ index: aiMessages.length - 1, align: 'end' }}
                    alignToBottom
                    followOutput={atBottom => atBottom ? 'smooth' : false}
                    computeItemKey={(_, item) => item.id}
                    itemContent={(_, msg) => {
                      if (msg.role === 'system') {
                        return (
                          <div style={{ textAlign: 'center', margin: '8px 0' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{msg.content}</Text>
                          </div>
                        );
                      }
                      const isMe = msg.role === 'user';
                      return (
                        <div className={`chat-message-row${isMe ? ' is-mine' : ''}`}>
                          {!isMe && <Avatar icon={<RobotOutlined />} style={{ background: 'var(--role-primary)', flexShrink: 0 }} />}
                          <div className="chat-message-content">
                            <div className={`chat-message-bubble ${isMe ? 'is-mine' : 'is-other'}`}>{msg.content}</div>
                            <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'block', textAlign: isMe ? 'right' : 'left' }}>
                              {dayjs(msg.created_at).format('HH:mm')}
                            </Text>
                          </div>
                          {isMe && <Avatar icon={<UserOutlined />} style={{ background: 'var(--role-secondary)', flexShrink: 0 }} />}
                        </div>
                      );
                    }}
                  />
                )}

                {/* กล่องพิมพ์ AI */}
                <div className="chat-composer">
                  <Row gutter={8} align="middle">
                    <Col flex={1}>
                      <Input.TextArea
                        value={aiInputMessage}
                        maxLength={5000}
                        disabled={aiSending}
                        aria-label="ข้อความถึง AI"
                        onChange={e => setAiInputMessage(e.target.value)}
                        onKeyDown={handleAiKeyPress}
                        placeholder="พิมพ์ข้อความถึง AI... (Enter เพื่อส่ง)"
                        autoSize={{ minRows: 1, maxRows: 4 }}
                      />
                    </Col>
                    <Col>
                      <Button
                        className="chat-send-button"
                        aria-label="ส่งข้อความถึง AI"
                        type="primary"
                        shape="circle"
                        icon={<SendOutlined />}
                        onClick={() => handleSendAi()}
                        loading={aiSending}
                        disabled={!aiInputMessage.trim()}
                      />
                    </Col>
                  </Row>
                </div>
              </>
            ) : (
              <>
                {isUser && showAiPrompt && (
                  <Alert
                    type="warning"
                    showIcon
                    message="นักจิตยังไม่ได้อ่านข้อความของคุณ"
                    description="นักจิตวิทยายังไม่ได้อ่านข้อความล่าสุดของคุณเกิน 5 นาทีแล้ว คุณสามารถคุยกับ AI ระหว่างรอได้"
                    action={
                      <Button size="small" type="primary" onClick={handleSwitchToAi}>
                        คุยกับ AI ระหว่างรอ
                      </Button>
                    }
                    className="chat-ai-notice"
                  />
                )}

                {/* ข้อความ */}
                {messages.length === 0 ? (
                  <div className="chat-empty"><Text type="secondary">เริ่มการสนทนาได้เลย</Text></div>
                ) : (
                  <Virtuoso
                    className="chat-messages"
                    style={{ flex: 1, minHeight: 0 }}
                    data={messages}
                    initialTopMostItemIndex={{ index: messages.length - 1, align: 'end' }}
                    alignToBottom
                    followOutput={atBottom => atBottom ? 'smooth' : false}
                    computeItemKey={(_, item) => item.id}
                    itemContent={(_, msg) => {
                      const isMe = msg.sender_id === auth?.user?.id;
                      return (
                        <div className={`chat-message-row${isMe ? ' is-mine' : ''}`}>
                          {!isMe && <Avatar icon={<UserOutlined />} style={{ background: 'var(--role-primary)', flexShrink: 0 }} />}
                          <div className="chat-message-content">
                            <div className={`chat-message-bubble ${isMe ? 'is-mine' : 'is-other'}`}>{msg.message}</div>
                            <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'block', textAlign: isMe ? 'right' : 'left' }}>
                              {dayjs(msg.sent_at).format('HH:mm')}
                            </Text>
                          </div>
                          {isMe && <Avatar icon={<UserOutlined />} style={{ background: 'var(--role-secondary)', flexShrink: 0 }} />}
                        </div>
                      );
                    }}
                  />
                )}

                {/* กล่องพิมพ์ */}
                <div className="chat-composer">
                  <Row gutter={8} align="middle">
                    <Col flex={1}>
                      <Input.TextArea
                        value={inputMessage}
                        maxLength={5000}
                        disabled={sending}
                        aria-label="ข้อความถึงนักจิตวิทยา"
                        onChange={e => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="พิมพ์ข้อความ... (Enter เพื่อส่ง)"
                        autoSize={{ minRows: 1, maxRows: 4 }}
                      />
                    </Col>
                    <Col>
                      <Button
                        className="chat-send-button"
                        aria-label="ส่งข้อความถึงนักจิตวิทยา"
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
        </div>
      </div>
    </div>
  );
};

export default Chat;

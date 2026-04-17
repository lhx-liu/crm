import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, Input, Button, Avatar, Typography, Space, Tag, Spin, Empty,
  Tooltip, Divider, message
} from 'antd';
import {
  SendOutlined, RobotOutlined, UserOutlined, ThunderboltOutlined,
  BarChartOutlined, TeamOutlined, LineChartOutlined, PlusOutlined,
  DeleteOutlined, ArrowLeftOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { chatWithAIStream, analyzeWithAIStream, streamSSE } from '../../api/ai';
import api from '../../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 快捷分析选项
const QUICK_ANALYSIS = [
  { key: 'order_summary', icon: <BarChartOutlined />, label: '订单总结', desc: '全面分析所有订单数据', color: '#1677ff' },
  { key: 'customer_insight', icon: <TeamOutlined />, label: '客户洞察', desc: '深度分析当前客户', color: '#722ed1' },
  { key: 'trend_predict', icon: <LineChartOutlined />, label: '趋势预测', desc: '预测未来业务走向', color: '#52c41a' },
];

// 推荐提问
const SUGGESTED_QUESTIONS = [
  '帮我总结一下今年所有订单的情况',
  'A 级客户有哪些？他们的主要购买产品是什么？',
  '分析最近3个月的订单趋势',
  '哪些产品组合最受客户欢迎？',
  '根据历史数据，预测下个季度哪个大洲的订单可能增长？',
  '客户复购间隔是多久？什么时候应该主动联系？',
];

// 简易 Markdown 渲染（支持加粗、标题、列表、代码块）
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#f6f8fa;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px"><code>$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code style="background:#f6f8fa;padding:2px 6px;border-radius:3px;font-size:13px">$1</code>')
    // 标题
    .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 6px;font-size:15px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:14px 0 8px;font-size:16px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:16px 0 8px;font-size:18px">$1</h2>')
    // 加粗
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 无序列表
    .replace(/^[-*] (.+)$/gm, '<div style="padding-left:16px;margin:2px 0">• $1</div>')
    // 有序列表
    .replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:16px;margin:2px 0">$1. $2</div>')
    // 换行
    .replace(/\n/g, '<br/>');

  return html;
}

export default function AIAssistant() {
  const { contextType, contextId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 对话状态
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // 上下文信息
  const [contextInfo, setContextInfo] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  // 引用
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 从 URL 参数获取上下文
  const currentContextType = contextType || searchParams.get('context_type');
  const currentContextId = contextId || searchParams.get('context_id');

  // 加载上下文信息
  useEffect(() => {
    if (currentContextType && currentContextId) {
      loadContextInfo(currentContextType, currentContextId);
    }
  }, [currentContextType, currentContextId]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // 初始欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg = currentContextType === 'customer' && contextInfo
        ? `你好！我是 CRM AI 助手 🤖\n\n我已加载 **${contextInfo.company_name}** 的客户数据，你可以问我关于这个客户的任何问题，或者点击左侧的「客户洞察」进行深度分析。`
        : currentContextType === 'order' && contextInfo
        ? `你好！我是 CRM AI 助手 🤖\n\n我已加载订单 #${currentContextId} 的详细数据，你可以问我关于这个订单的问题。`
        : '你好！我是 CRM AI 助手 🤖\n\n我可以帮你分析 CRM 数据、回答业务问题、提供数据洞察。你可以：\n\n1. 直接输入问题\n2. 点击下方快捷分析按钮\n3. 从客户或订单页面跳转过来带入上下文\n\n请问有什么可以帮你的？';

      setMessages([{ role: 'assistant', content: welcomeMsg }]);
    }
  }, [contextInfo]);

  const loadContextInfo = async (type, id) => {
    setContextLoading(true);
    try {
      if (type === 'customer') {
        const res = await api.get(`/customers/${id}`);
        setContextInfo(res.data);
      } else if (type === 'order') {
        const res = await api.get(`/orders/${id}`);
        setContextInfo(res.data);
      }
    } catch {
      message.error('加载上下文信息失败');
    } finally {
      setContextLoading(false);
    }
  };

  // 发送消息
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);
    setStreamingContent('');

    try {
      const context = {};
      if (currentContextType && currentContextId) {
        context[`${currentContextType}_id`] = parseInt(currentContextId);
      }

      // 构建历史（最近 10 条）
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await chatWithAIStream(text, context, history);

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      let fullContent = '';
      await streamSSE(
        response,
        (content) => {
          fullContent += content;
          setStreamingContent(fullContent);
        },
        () => {
          setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
          setStreamingContent('');
          setLoading(false);
        }
      );
    } catch (err) {
      const errMsg = `抱歉，AI 服务暂时不可用：${err.message}`;
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
      setStreamingContent('');
      setLoading(false);
    }
  }, [inputValue, loading, messages, currentContextType, currentContextId]);

  // 快捷分析
  const handleAnalyze = useCallback(async (type) => {
    if (loading) return;

    const analysisLabel = QUICK_ANALYSIS.find(a => a.key === type)?.label || type;
    const userMsg = { role: 'user', content: `📊 进行${analysisLabel}分析` };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setStreamingContent('');

    try {
      const params = {};
      if (type === 'customer_insight' && currentContextType === 'customer' && currentContextId) {
        params.customer_id = parseInt(currentContextId);
      }

      const response = await analyzeWithAIStream(type, params);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `请求失败: ${response.status}`);
      }

      let fullContent = '';
      await streamSSE(
        response,
        (content) => {
          fullContent += content;
          setStreamingContent(fullContent);
        },
        () => {
          setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
          setStreamingContent('');
          setLoading(false);
        }
      );
    } catch (err) {
      const errMsg = `分析失败：${err.message}`;
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
      setStreamingContent('');
      setLoading(false);
    }
  }, [loading, currentContextType, currentContextId]);

  // 新对话
  const handleNewChat = () => {
    setMessages([]);
    setStreamingContent('');
    setContextInfo(null);
    navigate('/ai-assistant');
  };

  // 键盘发送
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 推荐提问点击
  const handleSuggestedQuestion = (q) => {
    setInputValue(q);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px - 32px)', gap: 0 }}>
      {/* 左侧面板 - 快捷分析 + 上下文 */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid #f0f0f0', padding: '16px 12px', overflowY: 'auto', background: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong style={{ fontSize: 13 }}>快捷分析</Text>
          <Tooltip title="新对话">
            <Button size="small" icon={<PlusOutlined />} onClick={handleNewChat} />
          </Tooltip>
        </div>

        {QUICK_ANALYSIS.map(item => (
          <Card
            key={item.key}
            size="small"
            hoverable
            style={{ marginBottom: 8, cursor: 'pointer', borderLeft: `3px solid ${item.color}` }}
            bodyStyle={{ padding: '8px 12px' }}
            onClick={() => handleAnalyze(item.key)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: item.color, fontSize: 16 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{item.desc}</div>
              </div>
            </div>
          </Card>
        ))}

        {/* 上下文信息 */}
        {currentContextType && currentContextId && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Text strong style={{ fontSize: 13 }}>当前上下文</Text>
            <div style={{ marginTop: 8 }}>
              {contextLoading ? (
                <Spin size="small" />
              ) : contextInfo ? (
                currentContextType === 'customer' ? (
                  <Card size="small" style={{ background: '#fff' }} bodyStyle={{ padding: 8 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>
                      {contextInfo.company_name}
                    </div>
                    {contextInfo.level && <Tag color={{ A: 'red', B: 'orange', C: 'blue' }[contextInfo.level]}>{contextInfo.level}级</Tag>}
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      {contextInfo.country} · {contextInfo.continent}
                    </div>
                    <Button
                      size="small"
                      type="link"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => navigate(`/analysis/${currentContextId}`)}
                      style={{ padding: '4px 0', fontSize: 12 }}
                    >
                      查看客户分析
                    </Button>
                  </Card>
                ) : currentContextType === 'order' ? (
                  <Card size="small" style={{ background: '#fff' }} bodyStyle={{ padding: 8 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>
                      订单 #{currentContextId}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {contextInfo.company_name}
                    </div>
                    <div style={{ fontSize: 13, color: '#1677ff', fontWeight: 500, marginTop: 4 }}>
                      ${Number(contextInfo.payment_amount || 0).toFixed(2)}
                    </div>
                  </Card>
                ) : null
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>加载中...</Text>
              )}
            </div>
          </>
        )}

        <Divider style={{ margin: '12px 0' }} />
        <Text strong style={{ fontSize: 13 }}>推荐提问</Text>
        <div style={{ marginTop: 8 }}>
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <div
              key={i}
              style={{
                fontSize: 12, color: '#555', padding: '4px 8px', marginBottom: 4,
                background: '#fff', borderRadius: 4, cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => handleSuggestedQuestion(q)}
              onMouseEnter={e => e.target.style.background = '#e6f4ff'}
              onMouseLeave={e => e.target.style.background = '#fff'}
            >
              {q}
            </div>
          ))}
        </div>
      </div>

      {/* 右侧主区域 - 对话 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {/* 标题栏 */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined style={{ fontSize: 20, color: '#722ed1' }} />
            <Title level={5} style={{ margin: 0 }}>AI 助手</Title>
            {loading && <Spin size="small" />}
          </div>
          <Space>
            <Tooltip title="清空对话">
              <Button size="small" icon={<DeleteOutlined />} onClick={() => { setMessages([]); setStreamingContent(''); }} />
            </Tooltip>
          </Space>
        </div>

        {/* 消息列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 8, maxWidth: '80%' }}>
                {msg.role === 'assistant' && (
                  <Avatar size={32} icon={<RobotOutlined />} style={{ backgroundColor: '#722ed1', flexShrink: 0, marginTop: 2 }} />
                )}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                    color: msg.role === 'user' ? '#fff' : '#333',
                    fontSize: 14,
                    lineHeight: 1.7,
                    wordBreak: 'break-word',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content.replace(/\n/g, '<br/>')
                  }}
                />
                {msg.role === 'user' && (
                  <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff', flexShrink: 0, marginTop: 2 }} />
                )}
              </div>
            </div>
          ))}

          {/* 流式内容 */}
          {streamingContent && (
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, maxWidth: '80%' }}>
                <Avatar size={32} icon={<RobotOutlined />} style={{ backgroundColor: '#722ed1', flexShrink: 0, marginTop: 2 }} />
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px 12px 12px 2px',
                    background: '#f5f5f5',
                    color: '#333',
                    fontSize: 14,
                    lineHeight: 1.7,
                    wordBreak: 'break-word',
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }}
                />
              </div>
            </div>
          )}

          {/* 加载中动画 */}
          {loading && !streamingContent && (
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <Avatar size={32} icon={<RobotOutlined />} style={{ backgroundColor: '#722ed1', flexShrink: 0, marginTop: 2 }} />
              <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: '#f5f5f5' }}>
                <Spin size="small" /> <Text type="secondary" style={{ marginLeft: 8 }}>AI 正在思考...</Text>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <TextArea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题，按 Enter 发送，Shift+Enter 换行..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading}
              style={{ flex: 1, borderRadius: 8 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
              disabled={!inputValue.trim()}
              style={{ height: 40, borderRadius: 8, width: 48 }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#999' }}>
            AI 回答基于 CRM 数据分析，仅供参考
          </div>
        </div>
      </div>
    </div>
  );
}

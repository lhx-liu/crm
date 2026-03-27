import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Table, Typography, Tag, Spin,
  Timeline, message, Button, Divider
} from 'antd';
import { ArrowLeftOutlined, ClockCircleOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import api from '../../api';

const { Title, Text } = Typography;

export default function AnalysisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [frequency, setFrequency] = useState(null);
  const [products, setProducts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [custRes, freqRes, prodRes, timeRes] = await Promise.all([
          api.get(`/customers/${id}`),
          api.get(`/analysis/${id}/frequency`),
          api.get(`/analysis/${id}/products`),
          api.get(`/analysis/${id}/timeline`),
        ]);
        setCustomer(custRes.data);
        setFrequency(freqRes.data);
        setProducts(prodRes.data || []);
        setTimeline(timeRes.data || []);
      } catch {
        message.error('获取客户分析数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>;

  const freqOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: (frequency?.monthly || []).map(d => d.month) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ name: '下单次数', type: 'bar', data: (frequency?.monthly || []).map(d => d.count), itemStyle: { color: '#52c41a' } }]
  };

  const productColumns = [
    { title: '产品名称', dataIndex: 'name', key: 'name' },
    { title: '产品型号', dataIndex: 'model', key: 'model' },
    { title: '购买次数', dataIndex: 'purchase_count', key: 'purchase_count', sorter: (a, b) => a.purchase_count - b.purchase_count },
    { title: '购买总量', dataIndex: 'total_quantity', key: 'total_quantity', sorter: (a, b) => a.total_quantity - b.total_quantity },
    { title: '购买总金额', dataIndex: 'total_amount', key: 'total_amount', sorter: (a, b) => a.total_amount - b.total_amount,
      render: v => `$${Number(v || 0).toFixed(2)}`
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/analysis')}>返回客户列表</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>{customer?.company_name}</Title>
            <Text type="secondary">{customer?.country} · {customer?.continent}</Text>
            {customer?.level && <Tag color={{ A: 'red', B: 'orange', C: 'blue' }[customer.level]} style={{ marginLeft: 8 }}>{customer.level}级客户</Tag>}
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 下单频率统计卡片 */}
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总订单数"
              value={frequency?.totalOrders || 0}
              suffix="单"
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="平均下单间隔"
              value={frequency?.avgDays != null ? frequency.avgDays : '-'}
              suffix={frequency?.avgDays != null ? '天/次' : ''}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="活跃月份数"
              value={(frequency?.monthly || []).length}
              suffix="个月"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        {/* 每月下单次数柱状图 */}
        <Col span={24}>
          <Card title="每月下单次数">
            {frequency?.monthly?.length > 0
              ? <ReactECharts option={freqOption} style={{ height: 280 }} />
              : <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无下单记录</div>
            }
          </Card>
        </Col>

        {/* 偏向产品 */}
        <Col span={24}>
          <Card title="偏向产品">
            <Table rowKey="id" columns={productColumns} dataSource={products} pagination={false} bordered size="middle" />
          </Card>
        </Col>

        {/* 下单时间轴 */}
        <Col span={24}>
          <Card title="下单时间轴">
            {timeline.length > 0 ? (
              <Timeline mode="left">
                {timeline.map(order => (
                  <Timeline.Item key={order.id} label={<Text strong>{order.order_date || '未知日期'}</Text>} dot={<ShoppingCartOutlined style={{ fontSize: 16 }} />}>
                    <Card size="small" style={{ maxWidth: 500 }}>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>到款金额：</Text>
                        <Text style={{ color: '#1677ff' }}>${Number(order.payment_amount || 0).toFixed(2)}</Text>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div>
                        <Text strong>产品列表：</Text>
                        {order.items?.length > 0 ? (
                          order.items.map((item, i) => (
                            <Tag key={i} style={{ margin: '4px 4px 0 0' }}>
                              {item.product_name}({item.product_model}) × {item.quantity}
                            </Tag>
                          ))
                        ) : <Text type="secondary">无产品明细</Text>}
                      </div>
                    </Card>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无订单记录</div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

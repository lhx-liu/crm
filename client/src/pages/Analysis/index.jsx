import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Card, Typography, Avatar, Tag, message } from 'antd';
import { UserOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const { Title } = Typography;
const LEVEL_COLOR = { A: 'red', B: 'orange', C: 'blue' };

export default function AnalysisList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analysis/list', { params: { search } });
      setData(res.data || []);
    } catch {
      message.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { title: '排名', key: 'rank', width: 70, render: (_, __, index) => index + 1 },
    {
      title: '客户', key: 'customer',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
          <div>
            <div style={{ fontWeight: 500 }}>{r.company_name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{r.country || '-'} · {r.continent || '-'}</div>
          </div>
        </div>
      )
    },
    { title: '客户等级', dataIndex: 'level', key: 'level', width: 100,
      render: v => v ? <Tag color={LEVEL_COLOR[v]}>{v}</Tag> : '-'
    },
    { title: '订单数量', dataIndex: 'order_count', key: 'order_count', width: 100 },
    { title: '到款总金额', dataIndex: 'total_payment', key: 'total_payment', width: 140,
      render: v => <strong style={{ color: '#1677ff' }}>${Number(v || 0).toFixed(2)}</strong>
    },
    {
      title: '操作', key: 'action', width: 120,
      render: (_, r) => (
        <a onClick={() => navigate(`/analysis/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <LineChartOutlined /> 查看分析
        </a>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>客户分析</Title>
      </div>
      <Card>
        <Input.Search
          placeholder="搜索公司名称"
          allowClear
          style={{ width: 280, marginBottom: 16 }}
          onSearch={v => setSearch(v)}
          onChange={e => !e.target.value && setSearch('')}
        />
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{ pageSize: 20, showTotal: t => `共 ${t} 位客户` }}
          bordered
          size="middle"
          onRow={r => ({ style: { cursor: 'pointer' }, onClick: () => navigate(`/analysis/${r.id}`) })}
        />
      </Card>
    </div>
  );
}

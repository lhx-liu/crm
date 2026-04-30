import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Typography, Avatar, Tag, message } from 'antd';
import { UserOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const LEVEL_COLOR = { A: '#ef4444', B: '#f59e0b', C: '#3b82f6' };

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
    {
      title: '排名', key: 'rank', width: 60, align: 'center',
      render: (_, __, index) => (
        <span style={{
          fontWeight: 700,
          color: index < 3 ? '#2563eb' : '#94a3b8',
          fontSize: index < 3 ? 15 : 13,
        }}>{index + 1}</span>
      )
    },
    {
      title: '客户', key: 'customer',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar icon={<UserOutlined />} size={36} style={{ backgroundColor: '#6366f1', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.company_name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.country || '-'} · {r.continent || '-'}</div>
          </div>
        </div>
      )
    },
    {
      title: '等级', dataIndex: 'level', key: 'level', width: 70, align: 'center',
      render: v => v ? <Tag className="crm-tag" color={LEVEL_COLOR[v]}>{v}</Tag> : '-'
    },
    {
      title: '订单数', dataIndex: 'order_count', key: 'order_count', width: 90, align: 'center',
      render: v => <span style={{ fontWeight: 600, color: '#334155' }}>{v || 0}</span>
    },
    {
      title: '到款总金额', dataIndex: 'total_payment', key: 'total_payment', width: 140, align: 'right',
      render: v => <span className="crm-money">${Number(v || 0).toFixed(2)}</span>
    },
    {
      title: '操作', key: 'action', width: 120, align: 'center',
      render: (_, r) => (
        <span className="crm-link-cell" onClick={() => navigate(`/analysis/${r.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <LineChartOutlined /> 查看分析
        </span>
      )
    }
  ];

  return (
    <div className="crm-page">
      {/* Header */}
      <div className="crm-page-header">
        <h3 className="crm-page-title">客户分析</h3>
      </div>

      {/* Filter bar */}
      <div className="crm-filter-bar">
        <Input.Search
          placeholder="搜索公司名称"
          allowClear
          style={{ width: 260 }}
          onSearch={v => setSearch(v)}
          onChange={e => !e.target.value && setSearch('')}
        />
      </div>

      {/* Table */}
      <div className="crm-table-container">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 位客户`, showSizeChanger: true, pageSizeOptions: [20, 50, 100] }}
          size="middle"
          scroll={{ y: 'calc(100vh - 300px)' }}
          onRow={r => ({ style: { cursor: 'pointer' }, onClick: () => navigate(`/analysis/${r.id}`) })}
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Typography, Avatar, Tag, message } from 'antd';
import { UserOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import useDebounce from '../../hooks/useDebounce';

const LEVEL_TAG_CLASS = { A: 'crm-tag-level-a', B: 'crm-tag-level-b', C: 'crm-tag-level-c' };
const LEVEL_COLOR = { A: '#ef4444', B: '#f59e0b', C: '#3b82f6' };

export default function AnalysisList() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const navigate = useNavigate();

  // I9: 服务端分页
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });

  const fetchData = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await api.get('/analysis/list', { params: { search: debouncedSearch, page, pageSize } });
      setData(res.data || []);
      setTotal(res.total ?? (res.data || []).length);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      message.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pagination.current, pagination.pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const doFetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/analysis/list', { params: { search: debouncedSearch, page: 1, pageSize: pagination.pageSize }, signal: controller.signal });
        setData(res.data || []);
        setTotal(res.total ?? (res.data || []).length);
        setPagination(prev => ({ ...prev, current: 1 }));
      } catch (err) {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        message.error('获取客户列表失败');
      } finally {
        setLoading(false);
      }
    };
    doFetch();
    return () => controller.abort();
  }, [debouncedSearch]);

  const handleTableChange = (pag) => {
    const { current, pageSize } = pag;
    setPagination({ current, pageSize });
    fetchData(current, pageSize);
  };

  const columns = [
    {
      title: '排名', key: 'rank', width: 60, align: 'center',
      render: (_, __, index) => (
        <span style={{
          fontWeight: 700,
          color: index < 3 ? 'var(--crm-primary)' : 'var(--crm-text-placeholder)',
          fontSize: index < 3 ? 15 : 13,
          fontFamily: index < 3 ? 'var(--crm-font-mono)' : 'inherit',
        }}>{(pagination.current - 1) * pagination.pageSize + index + 1}</span>
      )
    },
    {
      title: '客户', key: 'customer',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar icon={<UserOutlined />} size={36} style={{ backgroundColor: 'var(--crm-primary)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--crm-text-secondary)' }}>{r.company_name}</div>
            <div style={{ fontSize: 12, color: 'var(--crm-text-placeholder)' }}>{r.country || '-'} · {r.continent || '-'}</div>
          </div>
        </div>
      )
    },
    {
      title: '等级', dataIndex: 'level', key: 'level', width: 70, align: 'center',
      render: v => v ? <Tag className={`crm-tag ${LEVEL_TAG_CLASS[v] || ''}`}>{v}</Tag> : '-'
    },
    {
      title: '订单数', dataIndex: 'order_count', key: 'order_count', width: 90, align: 'center',
      render: v => <span style={{ fontWeight: 600, color: 'var(--crm-text-body)', fontFamily: 'var(--crm-font-mono)' }}>{v || 0}</span>
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
          value={search}
          onSearch={v => setSearch(v)}
          onChange={e => { if (!e.target.value) setSearch(''); else setSearch(e.target.value); }}
        />
      </div>

      {/* Table — I9: 服务端分页 */}
      <div className="crm-table-container">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showTotal: t => `共 ${t} 位客户`,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
          }}
          onChange={handleTableChange}
          size="middle"
          scroll={{ y: 'calc(100vh - 300px)' }}
          onRow={r => ({ style: { cursor: 'pointer' }, onClick: () => navigate(`/analysis/${r.id}`) })}
        />
      </div>
    </div>
  );
}

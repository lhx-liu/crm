import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Input, Select, Space, Modal, Form, Popconfirm,
  message, Typography, Tag, Divider, Card, Drawer, Descriptions
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LineChartOutlined, MinusCircleOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import api from '../../api';

const { Title } = Typography;
const { Option } = Select;

const LEVEL_COLOR = { A: 'red', B: 'orange', C: 'blue' };

export default function Customers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', { params: { search, level: levelFilter, country: countryFilter } });
      setData(res.data || []);
    } catch {
      message.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  }, [search, levelFilter, countryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditRecord(null); form.resetFields(); form.setFieldsValue({ contacts: [{}] }); setModalOpen(true); };
  const openEdit = (record) => {
    setEditRecord(record);
    form.setFieldsValue({ ...record, contacts: record.contacts?.length ? record.contacts : [{}] });
    setModalOpen(true);
  };

  const openDetail = (record) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await api.put(`/customers/${editRecord.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/customers', values);
        message.success('新增成功');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/customers/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.message || '删除失败');
    }
  };

  // 导出Excel
  const handleExportExcel = () => {
    if (!data || data.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    try {
      const exportData = data.map(c => {
        // 联系人信息：多个联系人用逗号+换行分隔，每个联系人用斜杠分隔姓名/邮箱/电话
        const contactInfo = c.contacts?.length
          ? c.contacts.map(ct => [ct.name, ct.email, ct.phone].filter(Boolean).join('/')).join(',\n')
          : '-';

        return {
          '公司名称': c.company_name || '-',
          '线索编号': c.lead_no || '-',
          '客户等级': c.level || '-',
          '所属国家': c.country || '-',
          '所属大洲': c.continent || '-',
          '客户性质': c.nature || '-',
          '客户来源': c.source || '-',
          '客户商机': c.opportunity || '-',
          '客户背调': c.background || '-',
          '潜在订单询价': c.potential_inquiry || '-',
          '联系人信息': contactInfo,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // 设置列宽
      ws['!cols'] = [
        { wch: 30 },  // 公司名称
        { wch: 15 },  // 线索编号
        { wch: 10 },  // 客户等级
        { wch: 12 },  // 所属国家
        { wch: 12 },  // 所属大洲
        { wch: 12 },  // 客户性质
        { wch: 15 },  // 客户来源
        { wch: 30 },  // 客户商机
        { wch: 30 },  // 客户背调
        { wch: 30 },  // 潜在订单询价
        { wch: 35 },  // 联系人信息
      ];

      XLSX.utils.book_append_sheet(wb, ws, '客户数据');
      const fileName = `客户数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success('导出成功');
    } catch (err) {
      console.error('导出失败:', err);
      message.error('导出失败');
    }
  };

  const columns = [
    { title: '公司名称', dataIndex: 'company_name', key: 'company_name', width: 160,
      render: (v, r) => <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/orders?customer_id=${r.id}&company_name=${v}`)}>{v}</Button>
    },
    { title: '客户等级', dataIndex: 'level', key: 'level', width: 90,
      render: v => v ? <Tag color={LEVEL_COLOR[v]}>{v}</Tag> : '-'
    },
    { title: '所属国家', dataIndex: 'country', key: 'country', width: 110 },
    { title: '所属大洲', dataIndex: 'continent', key: 'continent', width: 110 },
    { title: '客户商机', dataIndex: 'opportunity', key: 'opportunity', ellipsis: true },
    { title: '客户背调', dataIndex: 'background', key: 'background', ellipsis: true },
    { title: '客户性质', dataIndex: 'nature', key: 'nature', width: 110 },
    { title: '客户来源', dataIndex: 'source', key: 'source', width: 110 },
    { title: '潜在询价', dataIndex: 'potential_inquiry', key: 'potential_inquiry', ellipsis: true },
    { title: '联系人', key: 'contacts', width: 140,
      render: (_, r) => r.contacts?.length ? r.contacts.map((c, i) => <div key={i}>{c.name || '-'}</div>) : '-'
    },
    {
      title: '操作', key: 'action', width: 240, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
          <Button size="small" icon={<LineChartOutlined />} onClick={() => navigate(`/analysis/${record.id}`)}>分析</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm
            title="确认删除该客户？"
            description="删除后数据将无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确认删除"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>客户管理</Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel} loading={loading}>导出Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增客户</Button>
        </Space>
      </div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder="搜索公司名称" allowClear style={{ width: 220 }} onSearch={v => setSearch(v)} onChange={e => !e.target.value && setSearch('')} />
        <Select placeholder="客户等级" allowClear style={{ width: 120 }} value={levelFilter || undefined} onChange={v => setLevelFilter(v || '')}>
          <Option value="A">A级</Option>
          <Option value="B">B级</Option>
          <Option value="C">C级</Option>
        </Select>
        <Input.Search placeholder="搜索国家" allowClear style={{ width: 180 }} onSearch={v => setCountryFilter(v)} onChange={e => !e.target.value && setCountryFilter('')} />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        bordered
        size="middle"
        scroll={{ x: 1600 }}
      />

      {/* 客户详情 Drawer */}
      <Drawer title="客户详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={650}>
        {detailRecord && (
          <>
            <Descriptions title="基本信息" bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="公司名称">{detailRecord.company_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="线索编号">{detailRecord.lead_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户等级">{detailRecord.level ? <Tag color={LEVEL_COLOR[detailRecord.level]}>{detailRecord.level}</Tag> : '-'}</Descriptions.Item>
              <Descriptions.Item label="所属国家">{detailRecord.country || '-'}</Descriptions.Item>
              <Descriptions.Item label="所属大洲">{detailRecord.continent || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户性质">{detailRecord.nature || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户来源">{detailRecord.source || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户商机" span={2}>{detailRecord.opportunity || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户背调" span={2}>{detailRecord.background || '-'}</Descriptions.Item>
              <Descriptions.Item label="潜在订单询价" span={2}>{detailRecord.potential_inquiry || '-'}</Descriptions.Item>
            </Descriptions>

            {detailRecord.contacts && detailRecord.contacts.length > 0 && (
              <>
                <Divider>联系人信息</Divider>
                <Table
                  rowKey={(r, i) => i}
                  size="small"
                  pagination={false}
                  dataSource={detailRecord.contacts}
                  columns={[
                    { title: '姓名', dataIndex: 'name', render: v => v || '-' },
                    { title: '邮箱', dataIndex: 'email', render: v => v || '-' },
                    { title: '联系方式', dataIndex: 'phone', render: v => v || '-' },
                  ]}
                />
              </>
            )}
          </>
        )}
      </Drawer>

      <Modal
        title={editRecord ? '编辑客户' : '新增客户'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="company_name" label="客户公司名称" rules={[{ required: true, message: '请输入公司名称' }]}>
            <Input placeholder="请输入公司名称" />
          </Form.Item>
          <Form.Item name="lead_no" label="线索编号" rules={[{ required: true, message: '请输入线索编号' }]}>
            <Input placeholder="请输入线索编号" />
          </Form.Item>
          <Form.Item name="level" label="客户等级">
            <Select placeholder="请选择客户等级" allowClear>
              <Option value="A">A</Option>
              <Option value="B">B</Option>
              <Option value="C">C</Option>
            </Select>
          </Form.Item>
          <Form.Item name="opportunity" label="客户商机"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="background" label="客户背调"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="country" label="所属国家"><Input /></Form.Item>
          <Form.Item name="continent" label="所属大洲"><Input /></Form.Item>
          <Form.Item name="nature" label="客户性质"><Input /></Form.Item>
          <Form.Item name="source" label="客户来源"><Input /></Form.Item>
          <Form.Item name="potential_inquiry" label="潜在订单询价"><Input.TextArea rows={2} /></Form.Item>

          <Divider>联系人信息</Divider>
          <Form.List name="contacts">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 8, background: '#fafafa' }}
                    extra={<MinusCircleOutlined style={{ color: 'red' }} onClick={() => remove(name)} />}
                  >
                    <Space style={{ display: 'flex' }} align="start" wrap>
                      <Form.Item {...restField} name={[name, 'name']} label="姓名" style={{ marginBottom: 0 }}>
                        <Input placeholder="联系人姓名" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'email']} label="邮箱" style={{ marginBottom: 0 }}>
                        <Input placeholder="邮箱" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'phone']} label="联系方式" style={{ marginBottom: 0 }}>
                        <Input placeholder="联系方式" />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>添加联系人</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}

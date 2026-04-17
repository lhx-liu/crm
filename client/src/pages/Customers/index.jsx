import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Input, Select, Space, Modal, Form, Popconfirm,
  message, Typography, Tag, Divider, Card
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LineChartOutlined, MinusCircleOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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
          <Button size="small" icon={<RobotOutlined />} style={{ color: '#722ed1', borderColor: '#722ed1' }} onClick={() => navigate(`/ai-assistant/customer/${record.id}`)}>AI分析</Button>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增客户</Button>
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
        scroll={{ x: 1400 }}
      />

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

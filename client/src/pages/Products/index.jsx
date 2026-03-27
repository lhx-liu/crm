import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Modal, Form, InputNumber, Popconfirm, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title } = Typography;

export default function Products() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { search } });
      setData(res.data || []);
    } catch {
      message.error('获取产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditRecord(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record) => { setEditRecord(record); form.setFieldsValue(record); setModalOpen(true); };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await api.put(`/products/${editRecord.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/products', values);
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
      await api.delete(`/products/${id}`);
      message.success('删除成功');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '产品名称', dataIndex: 'name', key: 'name' },
    { title: '产品型号', dataIndex: 'model', key: 'model' },
    { title: '单价 ($)', dataIndex: 'price', key: 'price', render: v => `$${Number(v || 0).toFixed(2)}` },
    {
      title: '操作', key: 'action', width: 140,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除该产品？" onConfirm={() => handleDelete(record.id)} okText="确认" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>产品管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增产品</Button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索产品名称或型号"
          allowClear
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
          onSearch={v => setSearch(v)}
          onChange={e => !e.target.value && setSearch('')}
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        bordered
        size="middle"
      />
      <Modal
        title={editRecord ? '编辑产品' : '新增产品'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]}>
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          <Form.Item name="model" label="产品型号" rules={[{ required: true, message: '请输入产品型号' }]}>
            <Input placeholder="请输入产品型号" />
          </Form.Item>
          <Form.Item name="price" label="单价 ($)" rules={[{ required: true, message: '请输入单价' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入单价" prefix="$" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

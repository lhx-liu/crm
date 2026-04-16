import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Modal, Form, InputNumber, Popconfirm, message, Typography, Empty, Divider, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title } = Typography;

export default function Products() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  
  // 大类相关
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryForm] = Form.useForm();
  
  // 型号相关
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [editModel, setEditModel] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [modelForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/categories-with-models', { params: { search } });
      setCategories(res.data || []);
    } catch {
      message.error('获取产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 大类操作
  const openAddCategory = () => { setEditCategory(null); categoryForm.resetFields(); setCategoryModalOpen(true); };
  const openEditCategory = (record) => { setEditCategory(record); categoryForm.setFieldsValue(record); setCategoryModalOpen(true); };
  
  const handleSaveCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (editCategory) {
        await api.put(`/products/categories/${editCategory.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/products/categories', values);
        message.success('新增成功');
      }
      setCategoryModalOpen(false);
      fetchData();
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await api.delete(`/products/categories/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
      else message.error('删除失败');
    }
  };

  // 型号操作
  const openAddModel = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setEditModel(null);
    modelForm.resetFields();
    modelForm.setFieldsValue({ category_id: categoryId });
    setModelModalOpen(true);
  };
  
  const openEditModel = (record) => {
    setEditModel(record);
    modelForm.setFieldsValue(record);
    setModelModalOpen(true);
  };
  
  const handleSaveModel = async () => {
    try {
      const values = await modelForm.validateFields();
      if (editModel) {
        await api.put(`/products/models/${editModel.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/products/models', values);
        message.success('新增成功');
      }
      setModelModalOpen(false);
      fetchData();
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleDeleteModel = async (id) => {
    try {
      await api.delete(`/products/models/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
      else message.error('删除失败');
    }
  };

  // 列定义 - 大类表格
  const categoryColumns = [
    { 
      title: '大类名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (v) => <strong style={{ fontSize: 15 }}>{v}</strong>
    },
    { 
      title: '描述', 
      dataIndex: 'description', 
      key: 'description',
      render: v => v || '-'
    },
    { 
      title: '型号数量', 
      key: 'model_count',
      width: 100,
      render: (_, r) => <Tag color="blue">{r.models?.length || 0}</Tag>
    },
    {
      title: '操作', 
      key: 'action', 
      width: 260,
      render: (_, record) => (
        <Space>
          <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => openAddModel(record.id)}>新增型号</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditCategory(record)}>编辑大类</Button>
          <Popconfirm title="确认删除该大类？" onConfirm={() => handleDeleteCategory(record.id)} okText="确认" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 型号子表格列定义
  const modelColumns = [
    { 
      title: '型号名称', 
      dataIndex: 'model', 
      key: 'model',
      render: v => <span style={{ fontWeight: 500 }}>{v}</span>
    },
    { 
      title: '单价 ($)', 
      dataIndex: 'price', 
      key: 'price', 
      width: 120,
      render: v => <span style={{ color: '#1677ff', fontWeight: 500 }}>${Number(v || 0).toFixed(2)}</span>
    },
    { 
      title: '描述', 
      dataIndex: 'description', 
      key: 'description',
      render: v => v || '-'
    },
    {
      title: '操作', 
      key: 'action', 
      width: 160,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModel(record)}>编辑</Button>
          <Popconfirm title="确认删除该型号？" onConfirm={() => handleDeleteModel(record.id)} okText="确认" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 可展开行配置
  const expandableConfig = {
    expandedRowKeys,
    onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
    expandedRowRender: (record) => {
      if (!record.models || record.models.length === 0) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无型号" style={{ margin: '12px 0' }} />;
      }
      return (
        <Table
          rowKey="id"
          columns={modelColumns}
          dataSource={record.models}
          pagination={false}
          size="small"
          bordered
          style={{ margin: '8px 0' }}
        />
      );
    },
    expandIcon: ({ expanded, onExpand, record }) => {
      if (!record.models || record.models.length === 0) {
        return <span style={{ marginLeft: 22 }} />;
      }
      return expanded 
        ? <DownOutlined onClick={e => onExpand(record, e)} style={{ cursor: 'pointer', marginRight: 8 }} />
        : <RightOutlined onClick={e => onExpand(record, e)} style={{ cursor: 'pointer', marginRight: 8 }} />;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>产品管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddCategory}>新增大类</Button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索大类名称"
          allowClear
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
          onSearch={v => setSearch(v)}
          onChange={e => !e.target.value && setSearch('')}
        />
      </div>
      <Table
        rowKey="id"
        columns={categoryColumns}
        dataSource={categories}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 个大类` }}
        bordered
        size="middle"
        expandable={expandableConfig}
      />

      {/* 大类 Modal */}
      <Modal
        title={editCategory ? '编辑大类' : '新增大类'}
        open={categoryModalOpen}
        onOk={handleSaveCategory}
        onCancel={() => setCategoryModalOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={categoryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="大类名称" rules={[{ required: true, message: '请输入大类名称' }]}>
            <Input placeholder="如：灭菌器" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 型号 Modal */}
      <Modal
        title={editModel ? '编辑型号' : '新增型号'}
        open={modelModalOpen}
        onOk={handleSaveModel}
        onCancel={() => setModelModalOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={modelForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="category_id" label="所属大类" rules={[{ required: true }]}>
            <Select placeholder="选择大类" disabled>
              {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="model" label="型号名称" rules={[{ required: true, message: '请输入型号名称' }]}>
            <Input placeholder="如：BX-100" />
          </Form.Item>
          <Form.Item name="price" label="单价 ($)" rules={[{ required: true, message: '请输入单价' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入单价" prefix="$" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

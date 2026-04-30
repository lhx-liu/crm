import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Modal, Form, InputNumber, Popconfirm, message, Typography, Empty, Divider, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import api from '../../api';

const { Option } = Select;

export default function Products() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryForm] = Form.useForm();
  
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

  const openAddCategory = () => { setEditCategory(null); categoryForm.resetFields(); setCategoryModalOpen(true); };
  const openEditCategory = (record) => { setEditCategory(record); categoryForm.setFieldsValue(record); setCategoryModalOpen(true); };
  
  const handleSaveCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      const duplicate = categories.find(c => c.name === values.name.trim());
      if (duplicate && (!editCategory || duplicate.id !== editCategory.id)) {
        message.warning('该大类名称已存在，请勿重复添加');
        return;
      }
      if (editCategory) {
        await api.put(`/products/categories/${editCategory.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/products', values);
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
      render: (v) => <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{v}</span>
    },
    { 
      title: '描述', 
      dataIndex: 'description', 
      key: 'description',
      render: v => v ? <span style={{ color: '#64748b' }}>{v}</span> : <span style={{ color: '#cbd5e1' }}>-</span>
    },
    { 
      title: '型号数量', 
      key: 'model_count',
      width: 100,
      align: 'center',
      render: (_, r) => <Tag className="crm-tag" color="blue">{r.models?.length || 0}</Tag>
    },
    {
      title: '操作', 
      key: 'action', 
      width: 220,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<PlusOutlined />} className="crm-action-btn" style={{ color: '#2563eb' }} onClick={() => openAddModel(record.id)}>新增型号</Button>
          <Button size="small" type="text" icon={<EditOutlined />} className="crm-action-btn" onClick={() => openEditCategory(record)}>编辑</Button>
          <Popconfirm title="确认删除该大类？" onConfirm={() => handleDeleteCategory(record.id)} okText="确认" cancelText="取消">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} className="crm-action-btn">删除</Button>
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
      render: v => <span style={{ fontWeight: 500, color: '#334155' }}>{v}</span>
    },
    { 
      title: '单价 ($)', 
      dataIndex: 'price', 
      key: 'price', 
      width: 120,
      align: 'right',
      render: v => <span className="crm-money">${Number(v || 0).toFixed(2)}</span>
    },
    { 
      title: '描述', 
      dataIndex: 'description', 
      key: 'description',
      render: v => v ? <span style={{ color: '#64748b' }}>{v}</span> : <span style={{ color: '#cbd5e1' }}>-</span>
    },
    {
      title: '操作', 
      key: 'action', 
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} className="crm-action-btn" onClick={() => openEditModel(record)}>编辑</Button>
          <Popconfirm title="确认删除该型号？" onConfirm={() => handleDeleteModel(record.id)} okText="确认" cancelText="取消">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} className="crm-action-btn">删除</Button>
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
          style={{ margin: '8px 0' }}
        />
      );
    },
    expandIcon: ({ expanded, onExpand, record }) => {
      if (!record.models || record.models.length === 0) {
        return <span style={{ marginLeft: 22 }} />;
      }
      return expanded 
        ? <DownOutlined onClick={e => onExpand(record, e)} className="crm-expand-icon" style={{ cursor: 'pointer', marginRight: 8 }} />
        : <RightOutlined onClick={e => onExpand(record, e)} className="crm-expand-icon" style={{ cursor: 'pointer', marginRight: 8 }} />;
    }
  };

  return (
    <div className="crm-page">
      {/* Header */}
      <div className="crm-page-header">
        <h3 className="crm-page-title">产品管理</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddCategory}>新增大类</Button>
      </div>

      {/* Filter bar */}
      <div className="crm-filter-bar">
        <Input.Search
          placeholder="搜索大类名称"
          allowClear
          style={{ width: 260 }}
          prefix={<SearchOutlined />}
          onSearch={v => setSearch(v)}
          onChange={e => !e.target.value && setSearch('')}
        />
      </div>

      {/* Table */}
      <div className="crm-table-container">
        <Table
          rowKey="id"
          columns={categoryColumns}
          dataSource={categories}
          loading={loading}
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 个大类`, showSizeChanger: true, pageSizeOptions: [20, 50, 100] }}
          size="middle"
          scroll={{ y: 'calc(100vh - 300px)' }}
          expandable={expandableConfig}
        />
      </div>

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

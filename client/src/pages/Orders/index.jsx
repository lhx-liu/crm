import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Input, Select, Space, Modal, Form, InputNumber,
  DatePicker, Popconfirm, message, Typography, Tag, Divider, Card,
  Collapse, Drawer, Descriptions, Tooltip
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  MinusCircleOutlined, FilterOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

export default function Orders() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();
  const [newCustomerModal, setNewCustomerModal] = useState(false);
  const [newCustomerForm] = Form.useForm();
  const [newProductModal, setNewProductModal] = useState(false);
  const [newProductForm] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 筛选条件 - 将ref改为state
  const [filterCustomerId, setFilterCustomerId] = useState(searchParams.get('customer_id') || '');
  const [filterCompany, setFilterCompany] = useState(searchParams.get('company_name') || '');
  const [filterDateRange, setFilterDateRange] = useState(null);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterContinent, setFilterContinent] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterCustomerType, setFilterCustomerType] = useState('');

  const fetchCustomers = async () => {
    const res = await api.get('/customers');
    setCustomers(res.data || []);
  };
  const fetchProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data || []);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        company_name: filterCompany,
        country: filterCountry,
        level: filterLevel,
        continent: filterContinent,
        source: filterSource,
        customer_type: filterCustomerType,
        customer_id: filterCustomerId,
      };
      if (filterDateRange && filterDateRange[0]) {
        params.order_date_start = filterDateRange[0].format('YYYY-MM-DD');
        params.order_date_end = filterDateRange[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/orders', { params });
      setData(res.data || []);
    } catch {
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [filterCompany, filterDateRange, filterCountry, filterLevel, filterContinent, filterSource, filterCustomerType, filterCustomerId]);

  useEffect(() => {
    fetchData();
    fetchCustomers();
    fetchProducts();
  }, [fetchData]);

  const openAdd = () => {
    setEditRecord(null);
    form.resetFields();
    form.setFieldsValue({ items: [{}] });
    setModalOpen(true);
  };

  const openEdit = async (record) => {
    setEditRecord(record);
    form.setFieldsValue({
      ...record,
      order_date: record.order_date ? dayjs(record.order_date) : null,
      payment_date: record.payment_date ? dayjs(record.payment_date) : null,
      items: record.items?.length ? record.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })) : [{}],
    });
    setModalOpen(true);
  };

  const openDetail = async (id) => {
    try {
      const res = await api.get(`/orders/${id}`);
      setDetailRecord(res.data);
      setDetailOpen(true);
    } catch {
      message.error('获取详情失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // 计算订单总金额
      const totalAmount = (values.items || []).reduce((sum, i) => sum + (Number(i?.quantity || 0) * Number(i?.unit_price || 0)), 0);
      const payload = {
        ...values,
        total_amount: totalAmount,
        order_date: values.order_date ? values.order_date.format('YYYY-MM-DD') : null,
        payment_date: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : null,
      };
      if (editRecord) {
        await api.put(`/orders/${editRecord.id}`, payload);
        message.success('更新成功');
      } else {
        await api.post('/orders', payload);
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
      await api.delete(`/orders/${id}`);
      message.success('删除成功');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  // 快捷新增客户
  const handleAddCustomer = async () => {
    const values = await newCustomerForm.validateFields();
    await api.post('/customers', values);
    message.success('客户新增成功');
    setNewCustomerModal(false);
    newCustomerForm.resetFields();
    fetchCustomers();
  };

  // 快捷新增产品
  const handleAddProduct = async () => {
    const values = await newProductForm.validateFields();
    await api.post('/products', values);
    message.success('产品新增成功');
    setNewProductModal(false);
    newProductForm.resetFields();
    fetchProducts();
  };

  const handleProductSelect = (productId, name) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const items = form.getFieldValue('items') || [];
      const idx = items.findIndex((_, i) => i === name[1]);
      if (idx !== -1) {
        items[idx] = { ...items[idx], unit_price: product.price };
        form.setFieldValue('items', items);
      }
    }
  };

  // 点击公司名称查看该客户订单
  const handleViewCustomerOrders = (customerId, companyName) => {
    setFilterCustomerId(customerId);
    setFilterCompany(companyName);
  };

  const columns = [
    { title: '订单日期', dataIndex: 'order_date', key: 'order_date', width: 110, fixed: 'left', sorter: (a, b) => (a.order_date || '').localeCompare(b.order_date || '') },
    { title: '新旧客户', dataIndex: 'customer_type', key: 'customer_type', width: 90, fixed: 'left',
      render: v => v ? <Tag color={v === '新客户' ? 'green' : 'blue'}>{v}</Tag> : '-'
    },
    { title: '公司名称', dataIndex: 'company_name', key: 'company_name', width: 200, fixed: 'left', ellipsis: { showTitle: false },
      render: (v, r) => <Tooltip placement="topLeft" title={v}><Button type="link" style={{ padding: 0 }} onClick={() => handleViewCustomerOrders(r.customer_id, v)}>{v}</Button></Tooltip>
    },
    { title: '产品', key: 'products', width: 160,
      render: (_, r) => r.items?.map((i, idx) => <div key={idx}>{i.product_name || '-'}{i.product_model ? `(${i.product_model})` : ''}</div>)
    },
    { title: '国家', dataIndex: 'country', key: 'country', width: 100 },
    { title: '客户商机', dataIndex: 'opportunity', key: 'opportunity', ellipsis: true },
    { title: '到款金额', dataIndex: 'payment_amount', key: 'payment_amount', width: 110,
      render: v => v ? <strong style={{ color: '#1677ff' }}>${Number(v).toFixed(2)}</strong> : '-'
    },
    {
      title: '操作', key: 'action', width: 180, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record.id)}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除该订单？" onConfirm={() => handleDelete(record.id)} okText="确认" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          订单管理
          {filterCustomerId && filterCompany && <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>— {filterCompany} 的所有订单</Text>}
        </Title>
        <Space>
          {filterCustomerId && <Button onClick={() => { setFilterCustomerId(''); setFilterCompany(''); }}>查看全部订单</Button>}
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增订单</Button>
        </Space>
      </div>

      {/* 主要筛选条件 */}
      <Space style={{ marginBottom: 8 }} wrap>
        <Input.Search placeholder="公司名称" allowClear style={{ width: 200 }} value={filterCompany} onSearch={v => { setFilterCustomerId(''); setFilterCompany(v); }} onChange={e => { if (!e.target.value) { setFilterCustomerId(''); setFilterCompany(''); } else setFilterCompany(e.target.value); }} />
        <RangePicker placeholder={['订单开始日期', '订单结束日期']} onChange={v => setFilterDateRange(v)} />
      </Space>

      {/* 更多筛选条件 */}
      <Collapse ghost style={{ marginBottom: 16 }}>
        <Panel header={<><FilterOutlined /> 更多筛选条件</>} key="1">
          <Space wrap>
            <Input.Search placeholder="国家" allowClear style={{ width: 150 }} onSearch={v => setFilterCountry(v)} onChange={e => !e.target.value && setFilterCountry('')} />
            <Select placeholder="客户等级" allowClear style={{ width: 120 }} onChange={v => setFilterLevel(v || '')}>
              <Option value="A">A级</Option><Option value="B">B级</Option><Option value="C">C级</Option>
            </Select>
            <Input.Search placeholder="大洲" allowClear style={{ width: 150 }} onSearch={v => setFilterContinent(v)} onChange={e => !e.target.value && setFilterContinent('')} />
            <Input.Search placeholder="客户来源" allowClear style={{ width: 150 }} onSearch={v => setFilterSource(v)} onChange={e => !e.target.value && setFilterSource('')} />
            <Select placeholder="新旧客户" allowClear style={{ width: 120 }} onChange={v => setFilterCustomerType(v || '')}>
              <Option value="新客户">新客户</Option><Option value="老客户">老客户</Option>
            </Select>
          </Space>
        </Panel>
      </Collapse>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        bordered size="middle" scroll={{ x: 1200 }}
        defaultSortOrder="descend"
      />

      {/* 订单表单 Modal */}
      <Modal
        title={editRecord ? '编辑订单' : '新增订单'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存" cancelText="取消"
        width={800} destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {/* 产品明细放在前面 */}
          <Divider>产品明细</Divider>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 8, background: '#fafafa' }}
                    extra={<MinusCircleOutlined style={{ color: 'red' }} onClick={() => remove(name)} />}
                  >
                    <Space style={{ display: 'flex' }} wrap align="start">
                      <Form.Item {...restField} name={[name, 'product_id']} label="产品" style={{ width: 240, marginBottom: 0 }} rules={[{ required: true, message: '请选择产品' }]}>
                        <Select
                          showSearch placeholder="选择产品"
                          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                          onChange={(v) => handleProductSelect(v, [name])}
                          dropdownRender={menu => (
                            <>
                              {menu}
                              <Divider style={{ margin: '4px 0' }} />
                              <Button type="link" icon={<PlusOutlined />} onClick={() => setNewProductModal(true)} block>快速新增产品</Button>
                            </>
                          )}
                        >
                          {products.map(p => <Option key={p.id} value={p.id}>{p.name}({p.model})</Option>)}
                        </Select>
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'quantity']} label="数量" style={{ width: 120, marginBottom: 0 }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'unit_price']} label="单价($)" style={{ width: 140, marginBottom: 0 }}>
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>添加产品</Button>
              </>
            )}
          </Form.List>

          {/* 基本信息 */}
          <Divider>订单信息</Divider>
          <Space style={{ display: 'flex' }} wrap>
            <Form.Item name="customer_id" label="关联客户" rules={[{ required: true, message: '请选择客户' }]} style={{ width: 280 }}>
              <Select
                showSearch placeholder="请选择或搜索客户"
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                dropdownRender={menu => (
                  <>
                    {menu}
                    <Divider style={{ margin: '4px 0' }} />
                    <Button type="link" icon={<PlusOutlined />} onClick={() => setNewCustomerModal(true)} block>快速新增客户</Button>
                  </>
                )}
              >
                {customers.map(c => <Option key={c.id} value={c.id}>{c.company_name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="customer_type" label="新老客户" style={{ width: 140 }}>
              <Select placeholder="请选择" allowClear>
                <Option value="新客户">新客户</Option>
                <Option value="老客户">老客户</Option>
              </Select>
            </Form.Item>
            <Form.Item name="order_date" label="订单日期" style={{ width: 180 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="payment_date" label="到款日期" style={{ width: 180 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          {/* 其他字段放最后 */}
          <Space style={{ display: 'flex' }} wrap>
            <Form.Item name="purchase_order_no" label="请购单号" style={{ width: 200 }}><Input /></Form.Item>
            <Form.Item name="lead_no" label="线索编号" style={{ width: 200 }}><Input /></Form.Item>
            <Form.Item name="payment_amount" label="到款金额($)" style={{ width: 160 }}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
            <Form.Item name="invoice_amount" label="发票金额($)" style={{ width: 160 }}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
            <Form.Item name="exw_value" label="EXW货值($)" style={{ width: 160 }}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* 订单详情 Drawer */}
      <Drawer title="订单详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={650}>
        {detailRecord && (
          <>
            {/* 客户信息 */}
            <Descriptions title="客户信息" bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="公司名称">{detailRecord.company_name}</Descriptions.Item>
              <Descriptions.Item label="客户等级">{detailRecord.level ? <Tag color={{ A: 'red', B: 'orange', C: 'blue' }[detailRecord.level]}>{detailRecord.level}</Tag> : '-'}</Descriptions.Item>
              <Descriptions.Item label="所属国家">{detailRecord.country || '-'}</Descriptions.Item>
              <Descriptions.Item label="所属大洲">{detailRecord.continent || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户来源">{detailRecord.source || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户商机">{detailRecord.opportunity || '-'}</Descriptions.Item>
            </Descriptions>

            {/* 订单信息 */}
            <Descriptions title="订单信息" bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单ID">{detailRecord.id}</Descriptions.Item>
              <Descriptions.Item label="新老客户">{detailRecord.customer_type || '-'}</Descriptions.Item>
              <Descriptions.Item label="订单日期">{detailRecord.order_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="到款日期">{detailRecord.payment_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="请购单号">{detailRecord.purchase_order_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="线索编号">{detailRecord.lead_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="到款金额"><strong style={{ fontSize: 16, color: '#1677ff' }}>${Number(detailRecord.payment_amount || 0).toFixed(2)}</strong></Descriptions.Item>
              <Descriptions.Item label="发票金额">{detailRecord.invoice_amount ? `$${Number(detailRecord.invoice_amount).toFixed(2)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="EXW货值">{detailRecord.exw_value ? `$${Number(detailRecord.exw_value).toFixed(2)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="订单总金额"><strong>${Number(detailRecord.total_amount || 0).toFixed(2)}</strong></Descriptions.Item>
            </Descriptions>

            <Divider>产品明细</Divider>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detailRecord.items || []}
              columns={[
                { title: '产品名称', dataIndex: 'product_name' },
                { title: '型号', dataIndex: 'product_model' },
                { title: '数量', dataIndex: 'quantity' },
                { title: '单价', dataIndex: 'unit_price', render: v => `$${Number(v || 0).toFixed(2)}` },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* 快捷新增客户 */}
      <Modal title="快速新增客户" open={newCustomerModal} onOk={handleAddCustomer} onCancel={() => setNewCustomerModal(false)} okText="新增" cancelText="取消" destroyOnClose>
        <Form form={newCustomerForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="company_name" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }]}><Input /></Form.Item>
          <Form.Item name="level" label="客户等级">
            <Select allowClear><Option value="A">A</Option><Option value="B">B</Option><Option value="C">C</Option></Select>
          </Form.Item>
          <Form.Item name="country" label="所属国家"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* 快捷新增产品 */}
      <Modal title="快速新增产品" open={newProductModal} onOk={handleAddProduct} onCancel={() => setNewProductModal(false)} okText="新增" cancelText="取消" destroyOnClose>
        <Form form={newProductForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="产品名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="model" label="产品型号" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="price" label="单价($)"><InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

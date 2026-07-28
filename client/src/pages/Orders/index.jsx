import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Table, Button, Input, Select, Space, Modal, Form, InputNumber,
  DatePicker, Popconfirm, message, Typography, Tag, Divider, Card,
  Drawer, Descriptions, Tooltip
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  MinusCircleOutlined, FilterOutlined, DownloadOutlined, RobotOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import api from '../../api';
import useDebounce from '../../hooks/useDebounce';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const LEVEL_TAG_CLASS = { A: 'crm-tag-level-a', B: 'crm-tag-level-b', C: 'crm-tag-level-c' };

export default function Orders() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  // M3: 客户下拉改为远程搜索，不再全量加载
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFetching, setCustomerFetching] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();
  const [newCustomerModal, setNewCustomerModal] = useState(false);
  const [newCustomerForm] = Form.useForm();
  const [newProductModal, setNewProductModal] = useState(false);
  const [newProductForm] = Form.useForm();
  const [newCategoryModal, setNewCategoryModal] = useState(false);
  const [newCategoryForm] = Form.useForm();
  const [activeCategoryItemIdx, setActiveCategoryItemIdx] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 筛选条件（即时值，用于输入框显示）
  const [filterCustomerId, setFilterCustomerId] = useState(searchParams.get('customer_id') || '');
  const [filterCompany, setFilterCompany] = useState(searchParams.get('company_name') || '');
  const [filterDateRange, setFilterDateRange] = useState(null);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterContinent, setFilterContinent] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterCustomerType, setFilterCustomerType] = useState('');

  // 防抖后的筛选条件（用于发请求）
  const debouncedCompany = useDebounce(filterCompany, 400);
  const debouncedCountry = useDebounce(filterCountry, 400);
  const debouncedContinent = useDebounce(filterContinent, 400);
  const debouncedSource = useDebounce(filterSource, 400);

  // 分页状态
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });

  // 导出用全量数据标记
  const [exportLoading, setExportLoading] = useState(false);

  // 产品数据只 mount 时加载一次（客户改为按需搜索，不再全量加载）
  useEffect(() => {
    const controller = new AbortController();
    const fetchCat = async () => {
      const res = await api.get('/products/categories-with-models', { signal: controller.signal });
      setCategories(res.data || []);
    };
    fetchCat();
    return () => controller.abort();
  }, []);

  // M3: 客户远程搜索（防抖）
  const debouncedCustomerSearch = useDebounce(customerSearch, 400);
  useEffect(() => {
    if (!debouncedCustomerSearch) {
      setCustomers([]);
      return;
    }
    const controller = new AbortController();
    setCustomerFetching(true);
    api.get('/customers', { params: { search: debouncedCustomerSearch, pageSize: 20 }, signal: controller.signal })
      .then(res => setCustomers(res.data || []))
      .catch(err => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      })
      .finally(() => setCustomerFetching(false));
    return () => controller.abort();
  }, [debouncedCustomerSearch]);

  // 服务端分页查询
  const fetchData = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const params = {
        company_name: debouncedCompany,
        country: debouncedCountry,
        level: filterLevel,
        continent: debouncedContinent,
        source: debouncedSource,
        customer_type: filterCustomerType,
        customer_id: filterCustomerId,
        page,
        pageSize,
      };
      if (filterDateRange && filterDateRange[0]) {
        params.order_date_start = filterDateRange[0].format('YYYY-MM-DD');
        params.order_date_end = filterDateRange[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/orders', { params });
      setData(res.data || []);
      setTotal(res.total ?? (res.data || []).length);
    } catch (err) {
      // 忽略已取消的请求
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [debouncedCompany, debouncedCountry, filterLevel, debouncedContinent, debouncedSource, filterCustomerType, filterCustomerId, filterDateRange, pagination.current, pagination.pageSize]);

  // 筛选条件变化时重置到第1页并查询（I5: AbortController 防竞态）
  useEffect(() => {
    const controller = new AbortController();
    setPagination(prev => ({ ...prev, current: 1 }));
    const doFetch = async () => {
      setLoading(true);
      try {
        const params = {
          company_name: debouncedCompany,
          country: debouncedCountry,
          level: filterLevel,
          continent: debouncedContinent,
          source: debouncedSource,
          customer_type: filterCustomerType,
          customer_id: filterCustomerId,
          page: 1,
          pageSize: pagination.pageSize,
        };
        if (filterDateRange && filterDateRange[0]) {
          params.order_date_start = filterDateRange[0].format('YYYY-MM-DD');
          params.order_date_end = filterDateRange[1].format('YYYY-MM-DD');
        }
        const res = await api.get('/orders', { params, signal: controller.signal });
        setData(res.data || []);
        setTotal(res.total ?? (res.data || []).length);
      } catch (err) {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        message.error('获取订单列表失败');
      } finally {
        setLoading(false);
      }
    };
    doFetch();
    return () => controller.abort();
  }, [debouncedCompany, debouncedCountry, filterLevel, debouncedContinent, debouncedSource, filterCustomerType, filterCustomerId, filterDateRange]);

  // 分页变化查询
  const handleTableChange = (pag) => {
    const { current, pageSize } = pag;
    setPagination({ current, pageSize });
    fetchData(current, pageSize);
  };

  const openAdd = () => {
    setEditRecord(null);
    form.resetFields();
    form.setFieldsValue({ items: [{}] });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditRecord(record);
    // M3: 编辑时预加载当前客户到搜索结果中，确保回显
    if (record.customer_id && record.company_name) {
      setCustomers(prev => {
        if (prev.some(c => c.id === record.customer_id)) return prev;
        return [...prev, { id: record.customer_id, company_name: record.company_name, lead_no: record.lead_no }];
      });
    }
    const order = record;
    form.setFieldsValue({
      ...order,
      order_date: order.order_date ? dayjs(order.order_date) : null,
      payment_date: order.payment_date ? dayjs(order.payment_date) : null,
      items: order.items?.length ? order.items.map(i => {
        const latestPrice = (() => {
          for (const cat of categories) {
            const model = cat.models?.find(m => m.id === Number(i.model_id));
            if (model) return model.price;
          }
          return i.unit_price || 0;
        })();
        return {
          model_id: i.model_id ? Number(i.model_id) : undefined,
          category_id: i.category_id ? Number(i.category_id) : undefined,
          quantity: i.quantity,
          unit_price: latestPrice,
          amount: i.amount != null ? i.amount : Number(i.quantity || 0) * Number(latestPrice || 0)
        };
      }) : [{}],
    });
    if (order.items?.length && order.items[0].category_id) {
      setSelectedCategoryId(Number(order.items[0].category_id));
    }
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
      const totalAmount = (values.items || []).reduce((sum, i) => sum + Number(i?.amount || 0), 0);
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

  const handleAddCustomer = async () => {
    const values = await newCustomerForm.validateFields();
    const res = await api.post('/customers', values);
    message.success('客户新增成功');
    setNewCustomerModal(false);
    newCustomerForm.resetFields();
    // M3: 新增后只将新客户添加到搜索结果，自动选中
    if (res.data) {
      setCustomers(prev => [...prev, res.data]);
      form.setFieldsValue({ customer_id: res.data.id, lead_no: res.data.lead_no || '' });
    }
  };

  const handleAddProduct = async () => {
    const values = await newProductForm.validateFields();
    await api.post('/products/models', values);
    message.success('型号新增成功');
    setNewProductModal(false);
    newProductForm.resetFields();
    // 刷新分类列表
    const res = await api.get('/products/categories-with-models');
    setCategories(res.data || []);
  };

  const handleAddCategory = async () => {
    try {
      const values = await newCategoryForm.validateFields();
      if (categories.some(c => c.name === values.name.trim())) {
        message.warning('该大类名称已存在，请勿重复添加');
        return;
      }
      const res = await api.post('/products', values);
      message.success('大类新增成功');
      setNewCategoryModal(false);
      newCategoryForm.resetFields();
      // 刷新分类列表
      const catRes = await api.get('/products/categories-with-models');
      setCategories(catRes.data || []);
      const newCategoryId = res.data?.id;
      if (newCategoryId && activeCategoryItemIdx !== null) {
        setSelectedCategoryId(newCategoryId);
        // 局部更新：只修改该行
        form.setFieldValue(['items', activeCategoryItemIdx, 'category_id'], newCategoryId);
        form.setFieldValue(['items', activeCategoryItemIdx, 'model_id'], undefined);
        form.setFieldValue(['items', activeCategoryItemIdx, 'unit_price'], undefined);
        form.setFieldValue(['items', activeCategoryItemIdx, 'amount'], undefined);
      }
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleCategoryChange = (categoryId, idx) => {
    // 局部更新
    form.setFieldValue(['items', idx, 'category_id'], categoryId);
    form.setFieldValue(['items', idx, 'model_id'], undefined);
    form.setFieldValue(['items', idx, 'unit_price'], undefined);
    form.setFieldValue(['items', idx, 'amount'], undefined);
  };

  const handleModelSelect = (modelId, idx) => {
    const currentCategoryId = form.getFieldValue(['items', idx, 'category_id']);
    const category = categories.find(c => String(c.id) === String(currentCategoryId));
    if (category) {
      const model = category.models?.find(m => String(m.id) === String(modelId));
      if (model) {
        const currentQty = form.getFieldValue(['items', idx, 'quantity']) || 0;
        // 局部更新
        form.setFieldValue(['items', idx, 'unit_price'], model.price);
        form.setFieldValue(['items', idx, 'amount'], Number(currentQty || 0) * Number(model.price));
      }
    }
  };

  const handleViewCustomerOrders = (customerId, companyName) => {
    setFilterCustomerId(customerId);
    setFilterCompany(companyName);
  };

  // 导出Excel — 服务端全量查询
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      // 导出时获取全量数据（I7: 使用 export=true 标记，后端允许更大 pageSize）
      const params = {
        company_name: debouncedCompany,
        country: debouncedCountry,
        level: filterLevel,
        continent: debouncedContinent,
        source: debouncedSource,
        customer_type: filterCustomerType,
        customer_id: filterCustomerId,
        export: 'true',
        pageSize: 100000,
      };
      if (filterDateRange && filterDateRange[0]) {
        params.order_date_start = filterDateRange[0].format('YYYY-MM-DD');
        params.order_date_end = filterDateRange[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/orders', { params });
      const exportData = res.data || [];
      if (!exportData.length) {
        message.warning('没有数据可导出');
        return;
      }

      const rows = [];
      exportData.forEach(order => {
        const contactInfo = order.contacts?.length
          ? order.contacts.map(c => [c.name, c.email, c.phone].filter(Boolean).join('/')).join(',\n')
          : '-';

        const baseRow = {
          '订单ID': order.id,
          '订单日期': order.order_date || '-',
          '新老客户': order.customer_type || '-',
          '请购单号': order.purchase_order_no || '-',
          '线索编号': order.lead_no || '-',
          '到款金额': order.payment_amount ? `$${Number(order.payment_amount).toFixed(2)}` : '-',
          '到款日期': order.payment_date || '-',
          '发票金额': order.invoice_amount ? `$${Number(order.invoice_amount).toFixed(2)}` : '-',
          'EXW货值': order.exw_value ? `$${Number(order.exw_value).toFixed(2)}` : '-',
          'CM名称': order.company_name || '-',
          '客户等级': order.level || '-',
          '所属国家': order.country || '-',
          '所属大洲': order.continent || '-',
          '客户来源': order.source || '-',
          '客户性质': order.nature || '-',
          '客户商机': order.opportunity || '-',
          '客户背调': order.background || '-',
          '潜在订单询价': order.potential_inquiry || '-',
          '联系人信息': contactInfo,
        };

        if (order.items && order.items.length > 0) {
          order.items.forEach(item => {
            rows.push({
              ...baseRow,
              '产品大类': item.category_name || '-',
              '产品型号': item.product_model || '-',
              '数量': item.quantity || '-',
              '金额': item.amount != null ? `$${Number(item.amount).toFixed(2)}` : (item.unit_price && item.quantity ? `$${Number(item.unit_price * item.quantity).toFixed(2)}` : '-'),
            });
          });
        } else {
          rows.push({ ...baseRow, '产品大类': '-', '产品型号': '-', '数量': '-', '金额': '-' });
        }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      const colWidths = [
        { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
        { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
        { wch: 10 }, { wch: 12 }, { wch: 35 },
      ];
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, '订单数据');
      const fileName = `订单数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success('导出成功');
    } catch (err) {
      console.error('导出失败:', err);
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    {
      title: '订单日期', dataIndex: 'order_date', key: 'order_date', width: 110, fixed: 'left',
      sorter: (a, b) => (a.order_date || '').localeCompare(b.order_date || ''),
    },
    {
      title: '新旧客户', dataIndex: 'customer_type', key: 'customer_type', width: 90, fixed: 'left',
      render: v => v ? <Tag className="crm-tag" color={v === '新客户' ? 'var(--crm-success)' : 'var(--crm-info)'}>{v}</Tag> : '-'
    },
    {
      title: 'CM名称', dataIndex: 'company_name', key: 'company_name', width: 200, fixed: 'left', ellipsis: { showTitle: false },
      render: (v, r) => (
        <Tooltip placement="topLeft" title={v}>
          <span className="crm-link-cell" onClick={() => handleViewCustomerOrders(r.customer_id, v)}>{v}</span>
        </Tooltip>
      )
    },
    {
      title: '产品', key: 'products', width: 160,
      render: (_, r) => r.items?.map((i, idx) => (
        <div key={i.model_id || idx} style={{ lineHeight: 1.6 }}>
          <Tag style={{ marginRight: 0, borderRadius: 4, fontSize: 12 }} color="default">{i.category_name || '-'}</Tag>
          {i.product_model && <span style={{ color: 'var(--crm-sub-text-color)', fontSize: 12 }}>({i.product_model})</span>}
        </div>
      ))
    },
    { title: '国家', dataIndex: 'country', key: 'country', width: 100 },
    { title: '客户商机', dataIndex: 'opportunity', key: 'opportunity', ellipsis: true },
    {
      title: '到款金额', dataIndex: 'payment_amount', key: 'payment_amount', width: 110, align: 'right',
      render: v => v ? <span className="crm-money">${Number(v).toFixed(2)}</span> : <span style={{ color: 'var(--crm-empty-color)' }}>-</span>
    },
    {
      title: '操作', key: 'action', width: 160, fixed: 'right', align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EyeOutlined />} className="crm-action-btn" onClick={() => openDetail(record.id)}>详情</Button>
          <Button size="small" type="text" icon={<EditOutlined />} className="crm-action-btn" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除该订单？" onConfirm={() => handleDelete(record.id)} okText="确认" cancelText="取消">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} className="crm-action-btn">删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="crm-page">
      {/* Header */}
      <div className="crm-page-header">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <h3 className="crm-page-title">订单管理</h3>
          {filterCustomerId && filterCompany && <span className="crm-page-subtitle">— {filterCompany} 的所有订单</span>}
        </div>
        <Space size={8}>
          {filterCustomerId && <Button onClick={() => { setFilterCustomerId(''); setFilterCompany(''); }}>查看全部订单</Button>}
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel} loading={exportLoading}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增订单</Button>
        </Space>
      </div>

      {/* Filter bar — 文本输入不再 onChange 直接触发查询，仅 onSearch 或防抖触发 */}
      <div className="crm-filter-bar">
        <Input.Search
          placeholder="CM名称" allowClear style={{ width: 160 }}
          value={filterCompany}
          onSearch={v => { setFilterCustomerId(''); setFilterCompany(v); }}
          onChange={e => {
            const v = e.target.value;
            if (!v) { setFilterCustomerId(''); setFilterCompany(''); }
            else setFilterCompany(v);
          }}
        />
        <RangePicker placeholder={['开始日期', '结束日期']} onChange={v => setFilterDateRange(v)} style={{ width: 240 }} />
        <Input.Search placeholder="国家" allowClear style={{ width: 120 }} onSearch={v => setFilterCountry(v)} onChange={e => { if (!e.target.value) setFilterCountry(''); else setFilterCountry(e.target.value); }} />
        <Select placeholder="客户等级" allowClear style={{ width: 100 }} onChange={v => setFilterLevel(v || '')}>
          <Option value="A">A级</Option><Option value="B">B级</Option><Option value="C">C级</Option>
        </Select>
        <Input.Search placeholder="大洲" allowClear style={{ width: 120 }} onSearch={v => setFilterContinent(v)} onChange={e => { if (!e.target.value) setFilterContinent(''); else setFilterContinent(e.target.value); }} />
        <Input.Search placeholder="客户来源" allowClear style={{ width: 120 }} onSearch={v => setFilterSource(v)} onChange={e => { if (!e.target.value) setFilterSource(''); else setFilterSource(e.target.value); }} />
        <Select placeholder="新旧客户" allowClear style={{ width: 100 }} onChange={v => setFilterCustomerType(v || '')}>
          <Option value="新客户">新客户</Option><Option value="老客户">老客户</Option>
        </Select>
      </div>

      {/* Table — 服务端分页 */}
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
            showTotal: t => `共 ${t} 条`,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
          }}
          onChange={handleTableChange}
          size="middle"
          scroll={{ x: 1100, y: 'calc(100vh - 320px)' }}
        />
      </div>

      {/* 订单表单 Modal */}
      <Modal
        title={editRecord ? '编辑订单' : '新增订单'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存" cancelText="取消"
        width={800} destroyOnClose maskClosable={false}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Divider>产品明细</Divider>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 8, background: 'var(--crm-card-inner-bg)' }}
                    extra={<MinusCircleOutlined style={{ color: 'red' }} onClick={() => remove(name)} />}
                  >
                    <Space style={{ display: 'flex' }} wrap align="start">
                      <Form.Item {...restField} name={[name, 'category_id']} label="产品大类" style={{ width: 200, marginBottom: 0 }} rules={[{ required: true, message: '请选择大类' }]}>
                        <Select
                          showSearch
                          placeholder="选择大类"
                          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                          onChange={(v) => {
                            setSelectedCategoryId(v);
                            handleCategoryChange(v, name);
                          }}
                          dropdownRender={menu => (
                            <>
                              {menu}
                              <Divider style={{ margin: '4px 0' }} />
                              <Button type="link" icon={<PlusOutlined />} onClick={() => { setActiveCategoryItemIdx(name); newCategoryForm.resetFields(); setNewCategoryModal(true); }} block>快速新增大类</Button>
                            </>
                          )}
                        >
                          {categories.map(c => <Option key={c.id} value={Number(c.id)}>{c.name}</Option>)}
                        </Select>
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'model_id']} label="产品型号" style={{ width: 220, marginBottom: 0 }} rules={[{ required: true, message: '请选择型号' }]}>
                        <Select
                          showSearch
                          placeholder="选择型号"
                          onChange={(v) => handleModelSelect(v, name)}
                          filterOption={(input, option) => {
                            const text = Array.isArray(option.children) ? option.children.join('') : (option.children || '');
                            return text.toLowerCase().includes(input.toLowerCase());
                          }}
                          dropdownRender={menu => (
                            <>
                              {menu}
                              <Divider style={{ margin: '4px 0' }} />
                              <Button type="link" icon={<PlusOutlined />} onClick={() => { newProductForm.resetFields(); newProductForm.setFieldsValue({ category_id: selectedCategoryId }); setNewProductModal(true); }} block>快速新增型号</Button>
                            </>
                          )}
                        >
                          {(categories.find(c => String(c.id) === String(form.getFieldValue(['items', name, 'category_id']) || ''))?.models || []).map(m => <Option key={m.id} value={Number(m.id)}>{m.model} (${Number(m.price).toFixed(2)})</Option>)}
                        </Select>
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'quantity']} label="数量" style={{ width: 100, marginBottom: 0 }}>
                        <InputNumber min={0} style={{ width: '100%' }} onChange={(newQty) => {
                          const price = form.getFieldValue(['items', name, 'unit_price']) || 0;
                          form.setFieldValue(['items', name, 'amount'], Number(newQty || 0) * Number(price));
                        }} />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'unit_price']} hidden><InputNumber /></Form.Item>
                      <Form.Item {...restField} name={[name, 'amount']} label="金额($)" style={{ width: 130, marginBottom: 0 }}>
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>添加产品</Button>
              </>
            )}
          </Form.List>

          <Divider>订单信息</Divider>
          <Space style={{ display: 'flex' }} wrap>
            <Form.Item name="customer_id" label="关联客户" rules={[{ required: true, message: '请选择客户' }]} style={{ width: 280 }}>
              <Select
                showSearch placeholder="输入CM名称搜索客户"
                virtual
                filterOption={false}
                onSearch={v => setCustomerSearch(v)}
                loading={customerFetching}
                notFoundContent={customerFetching ? '搜索中...' : (customerSearch ? '未找到客户' : '请输入关键词搜索')}
                onChange={(value) => {
                  const customer = customers.find(c => c.id === value);
                  if (customer) {
                    form.setFieldsValue({ lead_no: customer.lead_no || '' });
                  }
                }}
                dropdownRender={menu => (
                  <>
                    {menu}
                    <Divider style={{ margin: '4px 0' }} />
                    <Button type="link" icon={<PlusOutlined />} onClick={() => { newCustomerForm.resetFields(); newCustomerForm.setFieldsValue({ contacts: [{}] }); setNewCustomerModal(true); }} block>快速新增客户</Button>
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
            <Form.Item name="lead_no" label="线索编号" style={{ width: 200 }}><Input disabled placeholder="选择客户后自动填充" /></Form.Item>
            <Form.Item name="order_date" label="订单日期" style={{ width: 180 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="payment_date" label="到款日期" style={{ width: 180 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex' }} wrap>
            <Form.Item name="purchase_order_no" label="请购单号" style={{ width: 200 }}><Input /></Form.Item>
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
      <Drawer title="订单详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={750}>
        {detailRecord && (
          <>
            <Descriptions title="客户信息" bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="CM名称">{detailRecord.company_name}</Descriptions.Item>
              <Descriptions.Item label="线索编号">{detailRecord.lead_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户等级">{detailRecord.level ? <Tag className={`crm-tag ${LEVEL_TAG_CLASS[detailRecord.level] || ''}`}>{detailRecord.level}</Tag> : '-'}</Descriptions.Item>
              <Descriptions.Item label="所属国家">{detailRecord.country || '-'}</Descriptions.Item>
              <Descriptions.Item label="所属大洲">{detailRecord.continent || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户来源">{detailRecord.source || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户性质">{detailRecord.nature || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户商机" span={2}>{detailRecord.opportunity || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户背调" span={2}>{detailRecord.background || '-'}</Descriptions.Item>
              <Descriptions.Item label="潜在订单询价" span={2}>{detailRecord.potential_inquiry || '-'}</Descriptions.Item>
            </Descriptions>

            {detailRecord.contacts && detailRecord.contacts.length > 0 && (
              <>
                <Divider>联系人信息</Divider>
                <Table
                  rowKey="id"
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

            <Descriptions title="订单信息" bordered column={2} size="small" style={{ marginBottom: 16, marginTop: 16 }}>
              <Descriptions.Item label="订单ID">{detailRecord.id}</Descriptions.Item>
              <Descriptions.Item label="新老客户">{detailRecord.customer_type || '-'}</Descriptions.Item>
              <Descriptions.Item label="订单日期">{detailRecord.order_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="到款日期">{detailRecord.payment_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="请购单号">{detailRecord.purchase_order_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="到款金额"><strong style={{ fontSize: 16, color: 'var(--crm-primary)', fontFamily: 'var(--crm-font-mono)' }}>${Number(detailRecord.payment_amount || 0).toFixed(2)}</strong></Descriptions.Item>
              <Descriptions.Item label="发票金额">{detailRecord.invoice_amount ? `$${Number(detailRecord.invoice_amount).toFixed(2)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="EXW货值">{detailRecord.exw_value ? `$${Number(detailRecord.exw_value).toFixed(2)}` : '-'}</Descriptions.Item>
            </Descriptions>

            <Divider>产品明细</Divider>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detailRecord.items || []}
              columns={[
                { title: '产品大类', dataIndex: 'category_name' },
                { title: '型号', dataIndex: 'product_model' },
                { title: '数量', dataIndex: 'quantity' },
                { title: '金额', render: (_, r) => <span className="crm-money">${Number(r.amount != null ? r.amount : (r.unit_price || 0) * (r.quantity || 0)).toFixed(2)}</span> },
              ]}
            />
            <Divider />
            <Button 
              type="dashed" 
              icon={<RobotOutlined />} 
              onClick={() => navigate(`/ai-assistant/order/${detailRecord.id}`)}
              style={{ width: '100%', color: '#722ed1', borderColor: '#722ed1' }}
            >
              让 AI 分析此订单
            </Button>
          </>
        )}
      </Drawer>

      {/* 快捷新增客户 */}
      <Modal title="快速新增客户" open={newCustomerModal} onOk={handleAddCustomer} onCancel={() => setNewCustomerModal(false)} okText="新增" cancelText="取消" width={700} destroyOnClose>
        <Form form={newCustomerForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="company_name" label="客户CM名称" rules={[{ required: true, message: '请输入CM名称' }]}>
            <Input placeholder="请输入CM名称" />
          </Form.Item>
          <Form.Item name="lead_no" label="线索编号" rules={[{ required: true, message: '请输入线索编号' }]}>
            <Input placeholder="请输入线索编号" />
          </Form.Item>
          <Form.Item name="level" label="客户等级">
            <Select placeholder="请选择客户等级" allowClear>
              <Option value="A">A</Option><Option value="B">B</Option><Option value="C">C</Option>
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
                  <Card key={key} size="small" style={{ marginBottom: 8, background: 'var(--crm-card-inner-bg)' }}
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

      {/* 快捷新增型号 */}
      <Modal title="快速新增型号" open={newProductModal} onOk={handleAddProduct} onCancel={() => setNewProductModal(false)} okText="新增" cancelText="取消" destroyOnClose>
        <Form form={newProductForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="category_id" label="所属大类" rules={[{ required: true }]}>
            <Select placeholder="选择大类">
              {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="model" label="型号名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="price" label="单价($)"><InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" /></Form.Item>
        </Form>
      </Modal>

      {/* 快捷新增大类 */}
      <Modal title="快速新增大类" open={newCategoryModal} onOk={handleAddCategory} onCancel={() => setNewCategoryModal(false)} okText="新增" cancelText="取消" destroyOnClose>
        <Form form={newCategoryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="大类名称" rules={[{ required: true, message: '请输入大类名称' }]}>
            <Input placeholder="如：灭菌器" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

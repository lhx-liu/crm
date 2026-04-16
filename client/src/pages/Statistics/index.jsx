import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Select, DatePicker, Button, Table, Modal, Typography, Space, Radio, message } from 'antd';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import api from '../../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function Statistics() {
  const [globalRange, setGlobalRange] = useState([dayjs().subtract(1, 'year'), dayjs()]);
  const [continentType, setContinentType] = useState('count');
  const [trendGranularity, setTrendGranularity] = useState('month');
  const [compareType, setCompareType] = useState('year');
  const [compareSelected, setCompareSelected] = useState([]);
  const [productSortBy, setProductSortBy] = useState('amount');

  const [continentData, setContinentData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [compareData, setCompareData] = useState({});
  const [productData, setProductData] = useState([]);
  const [productOrderModal, setProductOrderModal] = useState(false);
  const [productOrders, setProductOrders] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const getDateParams = () => ({
    start_date: globalRange?.[0]?.format('YYYY-MM-DD'),
    end_date: globalRange?.[1]?.format('YYYY-MM-DD'),
  });

  const fetchContinent = useCallback(async () => {
    try {
      const res = await api.get('/statistics/continent-distribution', { params: { ...getDateParams(), type: continentType } });
      setContinentData(res.data || []);
    } catch { message.error('获取大洲分布失败'); }
  // eslint-disable-next-line
  }, [globalRange, continentType]);

  const fetchTrend = useCallback(async () => {
    try {
      const res = await api.get('/statistics/payment-trend', { params: { ...getDateParams(), granularity: trendGranularity } });
      setTrendData(res.data || []);
    } catch { message.error('获取趋势数据失败'); }
  // eslint-disable-next-line
  }, [globalRange, trendGranularity]);

  const fetchCompare = useCallback(async () => {
    if (!compareSelected.length) return;
    try {
      const res = await api.get('/statistics/payment-compare', { params: { periods: compareSelected.join(','), type: compareType } });
      setCompareData(res.data || {});
    } catch { message.error('获取对比数据失败'); }
  }, [compareSelected, compareType]);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await api.get('/statistics/product-ranking', { params: { ...getDateParams(), sort_by: productSortBy } });
      setProductData(res.data || []);
    } catch { message.error('获取产品排行失败'); }
  // eslint-disable-next-line
  }, [globalRange, productSortBy]);

  useEffect(() => { fetchContinent(); }, [fetchContinent]);
  useEffect(() => { fetchTrend(); }, [fetchTrend]);
  useEffect(() => { fetchCompare(); }, [fetchCompare]);
  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  const handleProductClick = async (record) => {
    try {
      setSelectedProduct(record);
      const res = await api.get(`/statistics/product-orders/${record.id}`, { params: getDateParams() });
      setProductOrders(res.data || []);
      setProductOrderModal(true);
    } catch { message.error('获取产品订单失败'); }
  };

  // 大洲饼图配置
  const continentOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10 },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: continentData.filter(d => d.continent).map(d => ({
        name: d.continent, value: Number(d.value || 0)
      }))
    }]
  };

  // 趋势图配置
  const trendOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: trendData.map(d => d.period) },
    yAxis: { type: 'value', axisLabel: { formatter: v => `$${v}` } },
    series: [{ name: '到款金额', type: 'bar', data: trendData.map(d => Number(d.amount || 0)), itemStyle: { color: '#1677ff' } }]
  };

  // 对比图配置
  const colors = ['#1677ff', '#ff4d4f', '#52c41a', '#faad14', '#722ed1'];
  const allPeriods = [...new Set(Object.values(compareData).flat().map(d => d.sub_period))].sort();
  const compareOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: compareSelected },
    xAxis: { type: 'category', data: allPeriods },
    yAxis: { type: 'value', axisLabel: { formatter: v => `$${v}` } },
    series: compareSelected.map((p, i) => ({
      name: p, type: 'line', smooth: true,
      data: allPeriods.map(period => {
        const found = (compareData[p] || []).find(d => d.sub_period === period);
        return Number(found?.amount || 0);
      }),
      itemStyle: { color: colors[i % colors.length] }
    }))
  };

  // 生成可选择的年/月列表
  const yearOptions = Array.from({ length: 6 }, (_, i) => String(dayjs().year() - i));
  const monthOptions = Array.from({ length: 24 }, (_, i) => dayjs().subtract(i, 'month').format('YYYY-MM'));

  const productColumns = [
    { title: '产品大类', dataIndex: 'category_name', key: 'category_name',
      render: (v, r) => <Button type="link" style={{ padding: 0 }} onClick={() => handleProductClick(r)}>{v}</Button>
    },
    { title: '销售数量', dataIndex: 'total_quantity', key: 'total_quantity', sorter: (a, b) => a.total_quantity - b.total_quantity },
    { title: '销售总金额', dataIndex: 'total_amount', key: 'total_amount', sorter: (a, b) => a.total_amount - b.total_amount,
      render: v => `$${Number(v || 0).toFixed(2)}`
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>订单图表统计</Title>
        <Space>
          <Text>全局时间范围：</Text>
          <RangePicker value={globalRange} onChange={v => setGlobalRange(v)} />
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* 大洲分布 */}
        <Col xs={24} lg={12}>
          <Card title="大洲订单分布" extra={
            <Radio.Group size="small" value={continentType} onChange={e => setContinentType(e.target.value)}>
              <Radio.Button value="count">订单数量</Radio.Button>
              <Radio.Button value="amount">到款金额</Radio.Button>
            </Radio.Group>
          }>
            {continentData.filter(d => d.continent).length > 0
              ? <ReactECharts option={continentOption} style={{ height: 300 }} />
              : <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无数据</div>
            }
          </Card>
        </Col>

        {/* 到款金额趋势 */}
        <Col xs={24} lg={12}>
          <Card title="到款金额趋势" extra={
            <Radio.Group size="small" value={trendGranularity} onChange={e => setTrendGranularity(e.target.value)}>
              <Radio.Button value="month">按月</Radio.Button>
              <Radio.Button value="quarter">按季度</Radio.Button>
              <Radio.Button value="year">按年</Radio.Button>
            </Radio.Group>
          }>
            {trendData.length > 0
              ? <ReactECharts option={trendOption} style={{ height: 300 }} />
              : <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无数据</div>
            }
          </Card>
        </Col>

        {/* 到款金额对比 */}
        <Col span={24}>
          <Card title="到款金额对比趋势" extra={
            <Space>
              <Radio.Group size="small" value={compareType} onChange={e => { setCompareType(e.target.value); setCompareSelected([]); setCompareData({}); }}>
                <Radio.Button value="year">按年对比</Radio.Button>
                <Radio.Button value="month">按月对比</Radio.Button>
              </Radio.Group>
              <Select
                mode="multiple" style={{ minWidth: 280 }} placeholder={`选择${compareType === 'year' ? '年份' : '月份'}进行对比`}
                value={compareSelected} onChange={setCompareSelected} maxTagCount={4}
              >
                {(compareType === 'year' ? yearOptions : monthOptions).map(v => <Option key={v} value={v}>{v}</Option>)}
              </Select>
            </Space>
          }>
            {compareSelected.length > 0 && Object.keys(compareData).length > 0
              ? <ReactECharts option={compareOption} style={{ height: 320 }} />
              : <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>请选择{compareType === 'year' ? '年份' : '月份'}进行对比</div>
            }
          </Card>
        </Col>

        {/* 产品销售排行 */}
        <Col span={24}>
          <Card title="产品销售排行" extra={
            <Radio.Group size="small" value={productSortBy} onChange={e => setProductSortBy(e.target.value)}>
              <Radio.Button value="amount">按金额</Radio.Button>
              <Radio.Button value="quantity">按数量</Radio.Button>
            </Radio.Group>
          }>
            <Table rowKey="id" columns={productColumns} dataSource={productData} pagination={false} bordered size="middle" />
          </Card>
        </Col>
      </Row>

      {/* 产品关联订单 Modal */}
      <Modal
        title={`${selectedProduct?.category_name} — 关联订单`}
        open={productOrderModal}
        onCancel={() => setProductOrderModal(false)}
        footer={null}
        width={800}
      >
        <Table
          rowKey={(r, i) => `${r.id}-${i}`}
          size="small"
          dataSource={productOrders}
          columns={[
            { title: '订单日期', dataIndex: 'order_date', width: 110 },
            { title: '公司名称', dataIndex: 'company_name' },
            { title: '国家', dataIndex: 'country' },
            { title: '型号', dataIndex: 'product_model' },
            { title: '数量', dataIndex: 'quantity' },
            { title: '单价', dataIndex: 'unit_price', render: v => `$${Number(v || 0).toFixed(2)}` },
            { title: '到款金额', dataIndex: 'payment_amount', render: v => v ? `$${Number(v).toFixed(2)}` : '-' },
          ]}
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
}

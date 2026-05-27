import React from 'react';
import { Result, Button } from 'antd';

/**
 * React Error Boundary：捕获子组件渲染错误，避免白屏
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Result
            status="error"
            title="页面出现错误"
            subTitle="抱歉，页面发生了意外错误。请尝试刷新页面。"
            extra={[
              <Button type="primary" key="retry" onClick={this.handleReset}>重试</Button>,
              <Button key="reload" onClick={() => window.location.reload()}>刷新页面</Button>,
            ]}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

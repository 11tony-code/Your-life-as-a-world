import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <div className="fatal"><h1>世界需要重新启航</h1><p>页面遇到了意外错误，你保存的笔记仍在浏览器中。</p><button onClick={() => location.reload()}>重新加载</button><details><summary>错误信息</summary>{this.state.error.message}</details></div>;
    return this.props.children;
  }
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);

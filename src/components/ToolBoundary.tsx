import { Component, type ReactNode } from 'react';
import { Button, type Translate } from './ui';
export class ToolBoundary extends Component<
  { children: ReactNode; t: Translate; onHome: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="space-y-4 rounded-panel border border-border bg-surface p-6">
        <p className="text-sm text-danger">{this.props.t('common.loadingError')}</p>
        <Button onClick={this.props.onHome}>{this.props.t('common.backHome')}</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}

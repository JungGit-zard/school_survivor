import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  retry = () => {
    this.setState({ error: null })
  }

  reload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const fallbackProps = { error, retry: this.retry, reload: this.reload }
    if (typeof this.props.fallback === 'function') return this.props.fallback(fallbackProps)
    if (this.props.fallback) return this.props.fallback

    return (
      <main role="alert" style={styles.screen}>
        <h1 style={styles.title}>화면을 불러오지 못했습니다</h1>
        <p style={styles.message}>일시적인 오류입니다. 다시 시도하거나 새로고침해 주세요.</p>
        <div style={styles.actions}>
          <button type="button" onClick={this.retry} style={styles.button}>다시 시도</button>
          <button type="button" onClick={this.reload} style={styles.button}>새로고침</button>
        </div>
      </main>
    )
  }
}

const styles = {
  screen: {
    minHeight: '100vh', display: 'grid', placeContent: 'center', gap: 16, padding: 24,
    background: '#0a0a0f', color: '#f8fafc', textAlign: 'center',
  },
  title: { margin: 0, fontSize: 'clamp(24px, 5vw, 34px)' },
  message: { margin: 0, fontWeight: 700 },
  actions: { display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  button: {
    minHeight: 44, padding: '10px 22px', border: '2px solid #f8fafc', borderRadius: 10,
    background: '#2b145b', color: '#f8fafc', fontWeight: 800, cursor: 'pointer',
  },
}

export const uiPalette = {
  ink: '#050209',
  paper: '#f6ead0',
  paperLight: '#fff8e8',
  chalkboard: '#18372f',
  chalkboardDeep: '#102820',
  chalk: '#f8f7f2',
  mutedChalk: '#cfd7c8',
  cta: '#59c7ff',
  ctaDeep: '#2f9ee8',
  reward: '#f7d17e',
  rewardDeep: '#d8a83d',
  danger: '#e03040',
  dangerDeep: '#84202c',
  warning: '#ff8a37',
  infection: '#7ee4c8',
  shadow: 'rgba(5, 2, 9, 0.45)',
}

export const uiBorders = {
  strong: `2px solid ${uiPalette.ink}`,
  hairline: '1.5px solid rgba(5, 2, 9, 0.72)',
  chalk: '1.5px solid rgba(248, 247, 242, 0.24)',
}

export const uiShadows = {
  press: `0 4px 0 ${uiPalette.ink}`,
  pressSmall: `0 2px 0 ${uiPalette.ink}`,
  panel: `0 6px 0 ${uiPalette.ink}, 0 18px 34px rgba(0,0,0,0.42)`,
  glowCta: '0 0 18px rgba(89,199,255,0.45)',
  glowReward: '0 0 14px rgba(247,209,126,0.38)',
  glowDanger: '0 0 22px rgba(224,48,64,0.42)',
}

export const uiType = {
  family: "'Segoe UI', sans-serif",
  weightHeavy: 1000,
  weightStrong: 900,
  numeric: "'Segoe UI', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
}

export function schoolPanel(kind = 'paper') {
  if (kind === 'chalk') {
    return {
      border: uiBorders.strong,
      borderRadius: 8,
      background: uiPalette.chalkboard,
      color: uiPalette.paper,
      boxShadow: uiShadows.press,
    }
  }

  if (kind === 'dark') {
    return {
      border: uiBorders.strong,
      borderRadius: 8,
      background: 'linear-gradient(180deg, #2b2435 0%, #211c2b 100%)',
      color: uiPalette.chalk,
      boxShadow: uiShadows.panel,
    }
  }

  return {
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paper,
    color: uiPalette.ink,
    boxShadow: uiShadows.press,
  }
}

export function schoolButton(intent = 'primary') {
  const byIntent = {
    primary: {
      background: `linear-gradient(180deg, #8ad9ff 0%, ${uiPalette.cta} 100%)`,
      color: '#062033',
      boxShadow: `${uiShadows.press}, ${uiShadows.glowCta}`,
    },
    reward: {
      background: `linear-gradient(180deg, #ffe066 0%, ${uiPalette.reward} 100%)`,
      color: uiPalette.ink,
      boxShadow: `${uiShadows.press}, ${uiShadows.glowReward}`,
    },
    paper: {
      background: uiPalette.paper,
      color: uiPalette.ink,
      boxShadow: uiShadows.press,
    },
    danger: {
      background: uiPalette.danger,
      color: uiPalette.paperLight,
      boxShadow: `${uiShadows.press}, ${uiShadows.glowDanger}`,
    },
    chalk: {
      background: uiPalette.chalkboard,
      color: uiPalette.paperLight,
      boxShadow: uiShadows.press,
    },
  }
  const intentStyle = byIntent[intent] ?? byIntent.primary

  return {
    minHeight: 48,
    border: uiBorders.strong,
    borderRadius: 8,
    fontWeight: uiType.weightHeavy,
    cursor: 'pointer',
    ...intentStyle,
  }
}

export function warningSticker(intent = 'warning') {
  const danger = intent === 'danger'
  return {
    border: uiBorders.strong,
    borderRadius: 999,
    background: danger ? uiPalette.danger : uiPalette.warning,
    color: danger ? uiPalette.paperLight : uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
    fontWeight: uiType.weightHeavy,
  }
}

// 日本語文言。キーは ko.js と同じ構成に加えて、原文がデータファイル側にある
// ゲームデータ（武器カタログ・クエスト・調査セリフ・法的文書）のキーを含む。
const SERVICE_NAME = 'Escape! Zombie School'
const CONTACT_EMAIL = 'zard5388@gmail.com'
const EFFECTIVE_DATE = '2026年7月29日'

export default {
  // ─── 共通 ───
  'common.close': '閉じる',
  'common.cancel': 'キャンセル',
  'common.save': '保存',
  'common.retry': '再試行',
  'common.back': '戻る',
  'common.done': '完了',
  'common.max': '最大',
  'common.locked': 'ロック中',
  'common.unlocked': '解放',
  'common.notEnoughCoins': 'コイン不足',
  'common.coinPrice': '{price} コイン',
  'common.ownedCoins': '所持コイン',

  // ─── タイトル ───
  'title.serviceName': '脱出！ゾンビ学校',
  'title.wordAccent': '脱出！',
  'title.wordSchool': 'ゾンビ学校',
  'title.fontSize': 'clamp(42px, 12.6vw, 58px)',
  'title.subtitle': '3分30秒後に開く脱出口から逃げ出せ',
  'title.gameplayGuide': '自動攻撃 · 画面をドラッグで移動 · レベルアップでカード選択',
  'title.start': 'ゲーム開始',
  'title.studioError': 'グラフィックデータを読み込めませんでした。接続を確認してもう一度お試しください。',
  'title.progressError': 'アカウントの進行データ読み込み中にエラーが発生しました。接続を確認してもう一度お試しください。',
  'title.cheatToast': 'チートが表示されました',
  'title.cheatButton': 'チート',
  'title.cheatOpenAria': 'チートメニューを開く',
  'title.cheatCloseAria': 'チートメニューを閉じる背景',
  'title.cheatHeading': 'チートメニュー',
  'title.devSection': '開発機能',
  'title.unlockWeapons': '全武器を解放',
  'title.unlockStages': '全ステージを解放',
  'title.resetPassives': 'コイン強化をリセット',
  'title.nicknameCloseAria': 'ニックネーム入力を閉じる背景',
  'title.nicknameHeading': 'ニックネーム設定',
  'title.nicknameLabel': 'ニックネーム',
  'title.nicknameHint': 'Googleログイン中は、このニックネームがアカウントの進行データと一緒に保存されます。',
  'title.nicknameSubmit': '保存して開始',

  // ─── ロビー ───
  'lobby.player': 'プレイヤー',
  'lobby.noName': '名もなき生存者',
  'lobby.openSettings': '設定を開く',
  'lobby.season': 'シーズン',
  'lobby.seasonPreparing': 'シーズン準備中',
  'lobby.seasonAlways': '常時開催中',
  'lobby.seasonEndingSoon': 'まもなく終了',
  'lobby.seasonEndsDays': '終了まで{days}日{hours}時間',
  'lobby.seasonEndsHours': '終了まで{hours}時間{minutes}分',
  'lobby.stageListAria': 'ステージ一覧',
  'lobby.menuAria': 'ロビーメニュー',
  'lobby.weapons': '武器',
  'lobby.ranking': 'ランキング',
  'lobby.shop': 'ショップ',
  'lobby.cleared': 'クリア',
  'lobby.bestRecord': '自己ベスト: {value}',
  'lobby.noRecord': '記録なし',
  'lobby.enter': '入場する',
  'lobby.scoreRecord': 'スコア記録',
  'lobby.comingSoon': '準備中',
  'lobby.lockedDefault': '前のステージをクリアすると解放されます',
  'lobby.unlock.stage2': 'Stage 1 クリアで解放',
  'lobby.unlock.stage4': 'Stage 3 クリアで解放',
  'lobby.bossPreviewAria': '{stage} ボス 3D',
  'lobby.lockPreviewAria': '{stage} ロック中の3D南京錠',
  'lobby.showtime.B01': '突進！',
  'lobby.showtime.B02': '先生スイング！',
  'lobby.showtime.B03': '筋肉ポーズ！',

  // ─── 設定 ───
  'settings.title': '設定',
  'settings.closeBackdropAria': '設定を閉じる背景',
  'settings.profile': 'プロフィール',
  'settings.nickname': 'ニックネーム',
  'settings.notSet': '未設定',
  'settings.nicknameLabel': 'ニックネーム',
  'settings.nicknameHint': 'ニックネームはランキングとアカウントの進行データに表示されます。',
  'settings.gameEnv': 'ゲーム環境',
  'settings.language': '言語',
  'settings.languageDesc': 'ゲーム内すべての文言の表示言語',
  'settings.languageAria': '言語を選択',
  'settings.vibration': 'バイブレーション',
  'settings.vibrationDesc': '被弾・報酬のフィードバックを振動で通知',
  'settings.vibrationOn': 'バイブレーションをオン',
  'settings.vibrationOff': 'バイブレーションをオフ',
  'settings.reducedEffects': 'エフェクト軽減',
  'settings.reducedEffectsDesc': '強い影と光のにじみを抑える',
  'settings.reducedEffectsOn': 'エフェクト軽減をオン',
  'settings.reducedEffectsOff': 'エフェクト軽減をオフ',
  'settings.hitShake': '被弾カメラ振動',
  'settings.hitShakeDesc': 'ゾンビに当たった瞬間に短く揺らして手応えを出す',
  'settings.hitShakeOn': '被弾カメラ振動をオン',
  'settings.hitShakeOff': '被弾カメラ振動をオフ',
  'settings.help': 'ヘルプ',
  'settings.controls': '操作方法を見る',
  'settings.controlsDesc': '移動、レベルアップカード、一時停止の案内',
  'settings.control1': 'モバイル: 画面下のジョイスティックで移動します。',
  'settings.control2': 'レベルアップ: カードをタップして武器やパッシブを選びます。',
  'settings.control3': '一時停止: 戦闘画面の一時停止ボタンを使います。',
  'settings.legal': '法的事項',
  'settings.viewFull': '全文を見る',
  'settings.account': 'アカウント',
  'settings.logout': 'ログアウト',
  'settings.deleteAccount': 'アカウント削除',
  'settings.deleteHeading': 'アカウントを削除しますか？',
  'settings.deleteWarning': '進行データ、所持ゴールド、武器の永久強化、ランキング記録がすべて完全に削除され、復元できません。',
  'settings.deleting': '削除中...',
  'settings.deletePermanent': '完全に削除',
  'settings.reauthBusy': '再認証中...',
  'settings.reauthRetry': '再ログインして再試行',
  'settings.err.reauthRequired': 'セキュリティのため、再ログインしてからアカウントを削除できます。',
  'settings.err.unauthenticated': 'ログインセッションの有効期限が切れました。再ログインしてお試しください。',
  'settings.err.network': 'ネットワークエラーで削除できませんでした。接続を確認してもう一度お試しください。',
  'settings.err.progressDeleteFailed': '進行データの削除に失敗しました。しばらくしてからもう一度お試しください。',
  'settings.err.unknown': '不明なエラーで削除できませんでした。しばらくしてからもう一度お試しください。',
  'settings.err.reauthFailed': '再認証に失敗しました。再ログインしてお試しください。',

  // ─── ニックネーム検証 ───
  'nickname.tooShort': 'ニックネームは2文字以上で入力してください。',
  'nickname.tooLong': 'ニックネームは12文字以内で入力してください。',

  // ─── 同意ゲート ───
  'consent.heading': '利用規約およびプライバシーポリシーへの同意',
  'consent.cancelAria': '同意をキャンセルして閉じる',
  'consent.intro': '{service} のご利用にあたり、以下の各項目に同意してください。初回のみで、アカウントを削除するまで再度お尋ねしません。',
  'consent.acceptAll': 'すべて同意',
  'consent.collapse': '閉じる',
  'consent.expand': '全文を見る',
  'consent.helper': '両方の項目に同意すると開始できます。',
  'consent.submitting': '確認中...',
  'consent.submit': '同意して開始',
  'consent.saveFailed': '同意の保存に失敗しました。接続を確認してもう一度お試しください。',
  'consent.saveError': '同意の保存中にエラーが発生しました。もう一度お試しください。',
  'consent.item.terms': '利用規約に同意します。（必須）',
  'consent.item.privacy': 'プライバシーポリシーを確認し、同意します。（必須）',

  // ─── アカウントパネル ───
  'account.google': 'Googleアカウント',
  'account.linked': 'アカウント連携済み',
  'account.master': '最高管理者',
  'account.logout': 'ログアウト',
  'account.signingIn': 'ログイン中...',
  'account.signIn': 'Googleログイン',
  'account.status.signingIn': 'Googleログイン中',
  'account.status.unconfigured': 'Googleログインの設定が必要',
  'account.status.checking': '保存済みログインを確認中',
  'account.status.error': 'ログインエラー',
  'account.status.ready': 'アカウント連携が可能',
  'account.detail.unconfigured': 'Firebase .env の設定が必要',
  'account.detail.checking': '保存済みログインを確認中',
  'account.detail.error': 'もう一度お試しください',
  'account.detail.ready': '進行データのクラウド保存の準備完了',

  // ─── 起動 / 読み込み ───
  'app.checkingAuth': 'Googleログインの状態を確認しています。',
  'app.authFailed': 'Googleログインの状態を確認できませんでした。再ログインしてください。',
  'app.authUnconfigured': 'Firebase Googleログインの設定が必要です。',
  'app.adminGoogleOnly': '管理ツールは既存のGoogleログインからのみアクセスできます。',
  'app.adminDeniedReason': 'このGoogleアカウントには最高管理者権限がありません。',
  'app.adminDeniedTitle': '管理ツールへのアクセス拒否',
  'app.studioNeedsSignIn': 'GoogleログインのあとにFirebase Studioデータを読み込みます。',
  'app.studioLoading': 'Firebase Studioデータを読み込んでいます。',
  'app.studioFailed': 'Firebase Studioデータを読み込めませんでした。ログイン状態と接続を確認してください。',
  'app.studioNoWorkspace': 'このGoogleアカウントにはまだグラフィックスタジオの作業領域がありません。マスターアカウントでログインしてください。',
  'app.studioAccountConflict': '別のGoogleアカウントの未保存のスタジオ変更が残っています。そのアカウントでログインして適用してから再試行してください。',
  'loading.studio': 'グラフィックスタジオを読み込み中…',
  'loading.admin': '管理ツールを読み込み中…',
  'loading.shop': 'ショップを読み込み中…',
  'loading.ranking': 'ランキングを読み込み中…',
  'loading.game': 'ゲームを読み込み中…',
  'back.toResult': 'リザルトに戻る',
  'back.toLobby': 'ロビーに戻る',
  'back.toTitle': 'タイトルに戻る',

  // ─── ランキング ───
  'ranking.stageTitle': 'ステージランキング',
  'ranking.todayFirst': '本日1位',
  'ranking.dailyWindow': '韓国時間 当日 00:00:01 - 23:59:59 リアルタイム反映',
  'ranking.dailyBoardAria': '{stage} デイリーランキング',
  'ranking.waiting': '記録待ち',
  'ranking.anonymous': '匿名',
  'ranking.anonymousSurvivor': '匿名の生存者',
  'ranking.myRecord': '自分の記録',
  'ranking.defaultSeason': '常時シーズン',
  'ranking.rankSuffix': '{rank}位',
  'ranking.scoreSuffix': '{score}点',
  'ranking.clearedSuffix': ' · クリア',
  'ranking.globalTitle': '総合ランキング',
  'ranking.myRuns': '自分の累計プレイ',
  'ranking.myRunsUnit': '回',
  'ranking.myBest': '自分のシーズン最高点',
  'ranking.tabsAria': '総合ランキングタブ',
  'ranking.colRank': '順位',
  'ranking.colUser': 'ユーザー',
  'ranking.colScore': 'スコア',
  'ranking.listAria': 'ユーザーランキング 1位から{limit}位まで',
  'ranking.goBack': '戻る',
  'ranking.noRecord': '記録なし',
  'ranking.tab.daily': 'デイリー',
  'ranking.tab.dailyNote': '韓国時間 当日 00:00:01 - 23:59:59 の最高点',
  'ranking.tab.weekly': 'ウィークリー',
  'ranking.tab.weeklyNote': '韓国時間 月曜 00:00:01 - 日曜 23:59:59 の最高点',

  // ─── ショップ / 武器 / 能力 ───
  'shop.eyebrow': '生存強化 申請書',
  'shop.title': 'コインショップ',
  'shop.tabsAria': 'コインショップのタブ',
  'shop.tabHero': '主人公強化',
  'shop.tabWeapon': '武器強化',
  'shop.permanentNotice': '武器の基本能力を永久強化',
  'shop.upgrade': '強化',
  'shop.buy': '購入',
  'shop.applyNumber': '申請 {number}',
  'shop.progress': '進行度',
  'shop.progressAria': '{name} 進行度 {current}/{max}',
  'shop.iconAria': '{name} アイコン',
  'shop.currentIs': '現在: {value}',
  'shop.currentBase': '現在: 基本状態',
  'shop.nextIs': '次: {value}',
  'shop.needUnlock': '武器を解放すると強化できます',
  'shop.allPermanentDone': 'すべての永久強化が完了',
  'shop.upgradeDirection': '強化方向: {value}',
  'shop.checkAfterUnlock': '解放後に確認',
  'ability.title': '自分の能力値',
  'ability.closeAria': '能力値を閉じる背景',
  'weaponModal.closeAria': '武器状況を閉じる背景',
  'weaponModal.eyebrow': '武器庫',
  'weaponModal.title': '武器の解放状況',
  'weaponModal.countLabel': '解放',
  'weaponModal.listAria': '武器一覧',
  'weaponModal.starter': '初期装備の武器',
  'weaponModal.unlockDone': '解放済み',
  'weaponModal.anyCondition': '次の条件のいずれかを達成で解放',
  'cond.totalRuns': '累計プレイ',
  'cond.totalKills': '累計撃破',
  'cond.totalGold': '累計コイン',
  'cond.totalSurvivalSeconds': '累計生存',
  'cond.stage1Clears': 'Stage 1 クリア',
  'cond.stage2Clears': 'Stage 2 クリア',
  'cond.stage1Survival180Runs': 'Stage 1 3分生存',
  'cond.runKills': '1回の撃破',
  'cond.runSurvivalSeconds': '1回の生存',
  'cond.runGold': '1回のコイン',
  'cond.unit.times': '回',
  'cond.unit.seconds': '秒',

  // ─── HUD ───
  'hud.matildaName': 'マチルダ',
  'hud.matildaLine': 'オホホホ！お餅ひとつくれたら食べないよ！',
  'hud.matildaDeathLine': 'オホホホ！！！！おいしくいただくわ！！！！',
  'hud.matildaGameoverLine': 'マチルダに魂を奪われてしまった！！',
  'hud.matildaWarning': '⚠ 死神マチルダ出現',
  'hud.matildaDialogueAria': 'マチルダ登場セリフ',
  'hud.matildaPortraitAlt': 'マチルダのプロフィール',
  'hud.bossWarning': 'ボス出現',
  'hud.projectileWarning': '廊下の弾に注意',
  'hud.portalAppeared': '脱出口が現れた！',
  'hud.portalDistance': '脱出口 {arrow} {distance}zm',
  'hud.portalMoveAria': '脱出口へ移動',
  'hud.milestoneGold': '+{gold} ゴールド',
  'hud.pauseAria': 'ゲームを一時停止',
  'hud.resumeAria': 'ゲームを再開',
  'hud.questBagOpenAria': 'クエストバッグを開く',
  'hud.questBagCloseAria': 'クエストバッグを閉じる',
  'hud.newQuestItemAria': '新しいクエストアイテム',
  'hud.levelUp': 'レベルアップ！ Lv.{level}',
  'hud.survivalTime': '生存時間: {time}',
  'hud.clearTime': 'クリア時間: {time}',
  'hud.goldEarned': '獲得ゴールド: {session}（累計 {total}）',
  'hud.newWeaponUnlocked': '🎉 新しい武器を解放！',
  'hud.newWeaponHint': '次のプレイからカードに登場します',
  'hud.nextUnlockLabel': '次に出会う武器',
  'hud.nextUnlockHint': 'Lv.{level} 到達で獲得可能',
  'hud.bossBonus': 'ボス撃破ボーナス: ',
  'hud.bossBonusPoints': '+{points}点',
  'hud.restart': 'リトライ',
  'hud.restartSpaced': 'リトライ',
  'hud.toTitle': 'タイトルへ',
  'hud.coinShop': 'コインショップ',
  'hud.ranking': 'ランキング',
  'hud.rankingTrophy': '🏆 ランキング',
  'hud.nextStage': '次のステージへ',
  'hud.questBagTitle': 'クエストバッグ',
  'hud.questBagCloseLabel': 'クエストバッグを閉じる',
  'hud.questSummary': '進行中 {active} · アイテム {items}',
  'hud.questEmpty': 'まだ受けたクエストがありません。',
  'hud.questEmptyHint': '助けが必要な学生を調べてみましょう。',
  'hud.questCompleted': '完了',
  'hud.questCompleteMark': '完了',
  'hud.questFindItem': 'アイテムを探す',
  'hud.questInstall': '設備に取り付ける',
  'hud.questReturn': '学生のところへ戻る',
  'hud.questReward': '報酬 {gold}G',
  'hud.questItemsAria': 'クエストアイテム',
  'hud.questItemHeading': 'クエストアイテム',
  'hud.questToastItem': 'バッグに入れました: {item}',
  'hud.questToastDone': '{title} 完了！ 報酬 {gold}G',
  'hud.questToastStart': '{title} のクエストを受けました。',
  'hud.confirmLobbyAria': 'ロビー復帰の確認',
  'hud.pauseTitleAria': '一時停止',
  'hud.confirmLobbyHeading': '本当にロビーへ戻りますか？',
  'hud.confirmLobbyBody': '現在の生存スコアはランキングに記録されます。',
  'hud.goBack': '戻る',
  'hud.awayTitle': '席を外していましたね',
  'hud.pausedTitle': 'PAUSED',
  'hud.awayBody': '戻ればすぐに続きからプレイできます。',
  'hud.resumeAway': '続きから',
  'hud.resume': '続ける',
  'hud.backToLobby': 'ロビーへ戻る',
  'hud.investigateAria': '{name} を調査',
  'hud.laidStudentAlt': '倒れた学生の立ち絵',
  'hud.defaultSubject': '調査対象',
  'hud.tiredStudent': '疲れた学生',
  'hud.rewardGold': '調査報酬: ゴールド {amount}',
  'hud.rewardUpgrade': '調査報酬: アップグレード選択のチャンス',
  'hud.tapToContinue': '画面をタップで続ける',
  'hud.tapToStart': '画面をタップで開始',
  'hud.introAria': 'ストーリーイントロ',
  'hud.allWeapons': 'すべての武器',
  'hud.weaponCheat': '武器チート',
  'hud.summonMatilda': 'マチルダを召喚',
  'hud.starlinkCheatAria': 'スターリンク墜落チート',
  'hud.starlinkCheatTitle': 'スターリンクを即墜落',
  'hud.copyLog': '開発ログをコピー',
  'hud.copyLogDone': '開発ログをコピーしました',
  'hud.copyLogFail': '開発ログのコピーに失敗',

  // ─── ステージ1 ストーリー ───
  'intro.stage1.0': '勉強したくない学生たちの心が、彼らをゾンビに変えた…',
  'intro.stage1.1': '働きたくない教師たちも同じようにゾンビ化した。',
  'intro.stage1.2': 'ここから抜け出さなきゃ。ここは… ゾンビ学校だ！',

  // ─── ステージ ───
  'stage.stage1.title': '教室サバイバル',
  'stage.stage2.title': '廊下の弾幕試験',
  'stage.stage3.title': '体育館 総力戦',
  'stage.stage4.title': '給食室 大脱出',
  'stage.description': '3分30秒後に開く脱出口から脱出する',
  'milestone.초반 생존 보너스': '序盤生存ボーナス',
  'milestone.중반 돌파 보너스': '中盤突破ボーナス',
  'milestone.보스 조우 보너스': 'ボス遭遇ボーナス',
  'milestone.학교 탈출 보너스': '学校脱出ボーナス',
  'milestone.복도 적응 보너스': '廊下適応ボーナス',
  'milestone.탄환 회피 보너스': '弾回避ボーナス',
  'milestone.복도 보스 조우 보너스': '廊下ボス遭遇ボーナス',
  'milestone.복도 탈출 보너스': '廊下脱出ボーナス',
  'milestone.아레나 적응 보너스': 'アリーナ適応ボーナス',
  'milestone.3축 돌파 보너스': '3軸突破ボーナス',
  'milestone.체육교사 조우 보너스': '体育教師遭遇ボーナス',
  'milestone.총력전 탈출 보너스': '総力戦脱出ボーナス',
  'milestone.배식 개시 보너스': '配膳開始ボーナス',
  'milestone.급식실 돌파 보너스': '給食室突破ボーナス',
  'milestone.주방장 조우 보너스': '料理長遭遇ボーナス',
  'milestone.급식실 탈출 보너스': '給食室脱出ボーナス',

  // ─── 武器名 ───
  'weapon.pencilThrow': '鉛筆',
  'weapon.schoolBag': '30cm定規',
  'weapon.boxCutter': 'カッターナイフ',
  'weapon.tumbler': 'タンブラー',
  'weapon.scienceFlask': '理科フラスコ',
  'weapon.bell': 'ベル',
  'weapon.stunGun': 'スタンガン',
  'weapon.onigiri': 'おにぎり',
  'weapon.chibiko': 'チビコ',
  'weapon.guidedMissile': 'モバイルバッテリーミサイル',
  'weapon.sharkMissile': 'サメミサイル',
  'weapon.starlink': '故障したスターリンク',
  'weapon.compassBlade': 'コンパスブレード',
  'weapon.umbrellaGuard': '傘バリア',
  'weapon.eraserBomb': '消しゴム爆弾',
  'weapon.studentLantern': '学生用ランタン',

  // ─── パッシブ名 ───
  'passive.magnet': '回収範囲',
  'passive.moveSpeed': '移動速度',
  'passive.maxHp': '体力',
  'passive.might': '攻撃力',
  'passive.growth': '学習力',
  'passive.armor': '防御力',
  'passive.cooldown': '手さばき',
  'passive.greed': '貯金箱',

  // ─── 永久強化の指標 ───
  'perm.공격력': '攻撃力',
  'perm.공격 범위': '攻撃範囲',
  'perm.쿨타임': 'クールタイム',
  'perm.접촉 피해': '接触ダメージ',
  'perm.화학 웅덩이 지속시간': '化学水たまり持続時間',
  'perm.피해': 'ダメージ',
  'perm.투사체 속도': '弾速',
  'perm.폭발 피해': '爆発ダメージ',
  'perm.귀소 속도': '追尾速度',
  'perm.타격 피해': '打撃ダメージ',
  'perm.칼날 피해': '刃ダメージ',
  'perm.넉백': 'ノックバック',
  'perm.폭발 범위': '爆発範囲',
  'perm.빛 콘 길이': '光コーンの長さ',
  'perm.치명타 확률': 'クリティカル率',
  'perm.기본 투사체 수': '基本弾数',
  'perm.휘두르기 판정 유지시간': '振り判定の持続時間',
  'perm.일정 확률로 추가 절단 1회': '一定確率で追加斬撃1回',
  'perm.회전 속도': '回転速度',
  'perm.기본 궤도체 수': '基本軌道体数',
  'perm.웅덩이 범위': '水たまり範囲',
  'perm.웅덩이 지속시간 추가': '水たまり持続時間 追加',
  'perm.파동 크기': '波動サイズ',
  'perm.파동 도달거리': '波動の到達距離',
  'perm.체인 수': 'チェーン数',
  'perm.짧은 경직 확률': '短い硬直確率',
  'perm.바운스 횟수': 'バウンス回数',
  'perm.바운스 횟수 추가': 'バウンス回数 追加',
  'perm.동료 공격 주기': '仲間の攻撃間隔',
  'perm.모든 무기 능력 보너스': '全武器能力ボーナス',
  'perm.동료 피해': '仲間のダメージ',
  'perm.치비코 투척체': 'チビコの投擲体',
  'perm.유도 회전력': '誘導旋回力',
  'perm.귀소 전환 시간': '追尾切替時間',
  'perm.타격 반경': '打撃半径',
  'perm.추가 소형 낙하 타격 확률': '追加の小型落下打撃確率',
  'perm.스택 폭발 범위': 'スタック爆発範囲',
  'perm.펄스 범위': 'パルス範囲',
  'perm.펄스 쿨타임': 'パルスのクールタイム',
  'perm.폭발 후 짧은 둔화 장판 생성': '爆発後に短い鈍化フィールドを生成',
  'perm.빛 콘 각도': '光コーンの角度',
  'perm.빛에 맞은 적 둔화 확률': '光に当たった敵の鈍化確率',

  // ─── レベルアップカード ───
  'up.unlockWord': '解禁',
  'up.acquireWord': '獲得',
  'up.acquireLabel': '{weapon} 獲得',
  'up.acquireBoxCutter.label': 'カッターナイフ解禁',
  'up.acquireBoxCutter.desc': '前方の狭い範囲を突き、横に斬り払う',
  'up.boxCutterDamage.label': 'カッター被害 +{amount} (Lv{level})',
  'up.boxCutterDamage.desc': '突きのダメージが増加',
  'up.boxCutterRange.label': 'カッター射程 +',
  'up.boxCutterRange.desc': '前方の突き射程が増加',
  'up.boxCutterCrit.label': 'カッター クリティカル強化',
  'up.boxCutterCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.pencilDamage.label': '鉛筆ダメージ +{amount} (Lv{level})',
  'up.pencilDamage.desc': '投擲鉛筆の攻撃力が増加',
  'up.pencilCount.label': '鉛筆の発射数 +1',
  'up.pencilCount.desc': '同時に飛ばす鉛筆が増加（最大4）',
  'up.pencilPierce.label': '鉛筆の貫通 +1',
  'up.pencilPierce.desc': '鉛筆が敵を貫通（最大3回）',
  'up.pencilCrit.label': '鉛筆 クリティカル強化',
  'up.pencilCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireBag.label': '30cm定規 解禁',
  'up.acquireBag.desc': '近くの敵を定規の振りで防ぐ',
  'up.bagDamage.label': '30cm定規 被害 +{amount} (Lv{level})',
  'up.bagDamage.desc': '定規の振りの打撃ダメージが増加',
  'up.bagRadius.label': '30cm定規 射程 +',
  'up.bagRadius.desc': '定規の振りの打撃範囲が増加',
  'up.bagCrit.label': '30cm定規 クリティカル強化',
  'up.bagCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireTumbler.label': 'タンブラー解禁',
  'up.acquireTumbler.desc': 'プレイヤーの周りを回る防御武器',
  'up.tumblerCount.label': 'タンブラーの数 +1',
  'up.tumblerCount.desc': '回転タンブラーの数が増加（最大3個）',
  'up.tumblerDamage.label': 'タンブラー被害 +{amount} (Lv{level})',
  'up.tumblerDamage.desc': '回転タンブラーの接触ダメージが増加',
  'up.tumblerCrit.label': 'タンブラー クリティカル強化',
  'up.tumblerCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireFlask.label': 'フラスコ解禁',
  'up.acquireFlask.desc': '密集した敵に範囲爆発を投げる',
  'up.flaskDamage.label': 'フラスコ被害 +{amount} (Lv{level})',
  'up.flaskDamage.desc': '爆発ダメージが増加',
  'up.flaskRadius.label': 'フラスコ範囲 +',
  'up.flaskRadius.desc': '爆発半径が増加',
  'up.flaskCrit.label': 'フラスコ クリティカル強化',
  'up.flaskCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）、水たまり持続 +1秒',
  'up.acquireBell.label': 'ベル解禁',
  'up.acquireBell.desc': '8方向の衝撃波スキルを解禁',
  'up.bellDamage.label': 'ベルダメージ +{amount} (Lv{level})',
  'up.bellDamage.desc': '衝撃波の攻撃力が増加',
  'up.bellCrit.label': 'ベル クリティカル強化',
  'up.bellCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireStun.label': 'スタンガン解禁',
  'up.acquireStun.desc': 'チェーンスタンガンのスキルを解禁',
  'up.stunDamage.label': '電撃ダメージ +{amount} (Lv{level})',
  'up.stunDamage.desc': 'チェーンスタンのダメージが増加',
  'up.stunChain.label': '電撃の連鎖 +1',
  'up.stunChain.desc': '連鎖対象が増加（最大4）',
  'up.stunCrit.label': 'スタンガン クリティカル強化',
  'up.stunCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireOnigiri.label': 'おにぎり解禁',
  'up.acquireOnigiri.desc': '敵の間を跳ね回って攻撃するおにぎり',
  'up.onigiiriBounce.label': 'おにぎりバウンス +1',
  'up.onigiiriBounce.desc': '跳ねる回数が増加（最大10回）',
  'up.onigiiriDamage.label': 'おにぎり被害 +{amount} (Lv{level})',
  'up.onigiiriDamage.desc': '衝突ダメージが増加',
  'up.onigiiriCrit.label': 'おにぎり クリティカル強化',
  'up.onigiiriCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireMissile.label': 'モバイルバッテリーミサイル解禁',
  'up.acquireMissile.desc': '遠くの敵群を追尾爆発で処理',
  'up.missileDamage.label': 'ミサイル被害 +{amount} (Lv{level})',
  'up.missileDamage.desc': '爆発ダメージが増加',
  'up.missileRadius.label': 'ミサイル半径 +',
  'up.missileRadius.desc': '爆発半径が増加（最大2.2）',
  'up.acquireStarlink.label': '故障したスターリンク解禁',
  'up.acquireStarlink.desc': '周囲にランダムな落雷が発生',
  'up.starlinkDamage.label': '落雷ダメージ +{amount} (Lv{level})',
  'up.starlinkDamage.desc': '落雷1発のダメージが増加',
  'up.starlinkCount.label': '落雷の数 +1',
  'up.starlinkCount.desc': '同時落雷数が増加（最大3）',
  'up.starlinkCrit.label': '落雷 クリティカル強化',
  'up.starlinkCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireCompassBlade.label': 'コンパスブレード解禁',
  'up.acquireCompassBlade.desc': 'プレイヤーの周りを回るコンパスブレード',
  'up.compassBladeDamage.label': 'コンパス被害 +{amount} (Lv{level})',
  'up.compassBladeDamage.desc': '回転ブレードのダメージが増加',
  'up.compassBladeCount.label': 'コンパスの数 +1',
  'up.compassBladeCount.desc': '回転ブレードの数が増加（最大3）',
  'up.compassBladeCrit.label': 'コンパス クリティカル強化',
  'up.compassBladeCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireUmbrellaGuard.label': '傘バリア解禁',
  'up.acquireUmbrellaGuard.desc': '開いた傘が回転したあと爆発',
  'up.umbrellaDamage.label': '傘の爆発ダメージ +{amount} (Lv{level})',
  'up.umbrellaDamage.desc': '最後の爆発ダメージが増加',
  'up.umbrellaRadius.label': '傘の爆発範囲 +',
  'up.umbrellaRadius.desc': '爆発範囲が増加',
  'up.acquireEraserBomb.label': '消しゴム爆弾解禁',
  'up.acquireEraserBomb.desc': '遅いが一撃の広範囲爆発',
  'up.eraserDamage.label': '爆弾ダメージ +{amount} (Lv{level})',
  'up.eraserDamage.desc': '爆発ダメージが増加',
  'up.eraserRadius.label': '爆弾半径 +',
  'up.eraserRadius.desc': '爆発半径が増加',
  'up.acquireLantern.label': '学生用ランタン解禁',
  'up.acquireLantern.desc': '前方を光で照らし、光の中の敵を連打',
  'up.lanternDuration.label': 'ランタン持続 +1秒',
  'up.lanternDuration.desc': '点灯時間と打撃回数が増加',
  'up.lanternCrit.label': 'ランタン クリティカル強化',
  'up.lanternCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireChibiko.label': 'チビコ解禁',
  'up.acquireChibiko.desc': 'レベル1の鉛筆投擲 · 所持武器の能力を10%強化',
  'up.chibikoCrit.label': 'チビコ クリティカル強化',
  'up.chibikoCrit.desc': 'クリティカル率 +2%、クリティカル倍率 +0.75倍（最大4.5倍）',
  'up.acquireSharkMissile.label': 'サメミサイル解禁',
  'up.acquireSharkMissile.desc': '最も密集したゾンビの群れへ追尾爆発',
  'up.sharkMissileDamage.label': 'サメミサイル被害 +{amount} (Lv{level})',
  'up.sharkMissileDamage.desc': '爆発ダメージが増加',
  'up.sharkMissileRadius.label': 'サメミサイル半径 +',
  'up.sharkMissileRadius.desc': '爆発半径が増加',
  'up.moveSpeed.label': '移動速度 +10%',
  'up.moveSpeed.desc': 'プレイヤーの移動速度が増加',
  'up.maxHealth.label': '最大体力 +20',
  'up.maxHealth.desc': '最大HPと現在HPが増加',

  // ─── ステージ小物 ───
  'prop.classroomDesk': '机',
  'prop.classroomChair': '椅子',
  'prop.unconsciousStudent': '学生',
  'prop.classPresidentStudent': '学級委員長',
  'prop.corridorLockerBank': 'ロッカー',
  'prop.corridorJanitorCart': '清掃カート',
  'prop.corridorLostFoundBoard': '落とし物掲示板',
  'prop.basketballHoop': 'バスケットゴール',
  'prop.basketballBallCart': 'ボールカート',
  'prop.basketballCluster': 'バスケットボール',
  'prop.gymBench': '体育ベンチ',
  'prop.gymTrainingCones': 'コーン',
  'prop.gymMats': 'マット',
  'prop.gymScoreboard': '電光掲示板',
  'prop.gymBanner': '横断幕',
  'prop.gymExitDoor': '非常口',
  'prop.gymEquipmentSpill': '散らばった用具',
  'prop.kitchenPrepTable': '調理台',
  'prop.kitchenCookLine': 'クックライン',
  'prop.kitchenSinkCounter': 'シンク',
  'prop.kitchenRefrigerator': '冷蔵庫',
  'prop.kitchenTrayRack': '配膳ラック',
  'prop.kitchenShelfCart': '棚カート',
  'prop.kitchenTrashBins': 'ゴミ箱',
  'prop.kitchenCrateStack': '箱の山',
  'prop.kitchenClutter': '厨房の雑貨',

  // ─── クエスト ───
  'quest.stage1-talk-book.title': '話し方は本で学ぶ',
  'quest.stage1-talk-book.startLine': '僕、話すのが苦手でさ…「話術の本」があれば！！！',
  'quest.stage1-talk-book.objective': '教室の反対側で話術の本を見つけて学生に返そう。',
  'quest.stage1-talk-book.itemName': '話術の本',
  'quest.stage1-talk-book.itemDesc': '表紙からしておしゃべりな赤い技術書。',
  'quest.stage1-talk-book.giver': '言葉に詰まった学生',
  'quest.stage1-talk-book.target': '言葉に詰まった学生',
  'quest.stage1-talk-book.completionLine': 'よし…これで話せる。みんな、落ち着いて外に出よう！',
  'quest.stage1-attendance.title': '学級委員の最後の出席確認',
  'quest.stage1-attendance.startLine': '誰が教室を出たのか知らないと…非常出席簿が前の机にあるはず。',
  'quest.stage1-attendance.objective': '教室北西の机で非常出席簿を見つけて学級委員に返そう。',
  'quest.stage1-attendance.itemName': '非常出席簿',
  'quest.stage1-attendance.itemDesc': 'いくつかの名前に急いで丸が付けられた出席簿。',
  'quest.stage1-attendance.giver': '学級委員',
  'quest.stage1-attendance.target': '学級委員',
  'quest.stage1-attendance.completionLine': '確認した。廊下へ出た子たちがいる。私たちも追いかけよう。',
  'quest.stage2-bandage.title': '304番ロッカーの圧迫包帯',
  'quest.stage2-bandage.startLine': '304番ロッカーに圧迫包帯がある。暗証番号は0304…セキュリティは最初から諦めてる。',
  'quest.stage2-bandage.objective': '廊下のロッカーで圧迫包帯を見つけて負傷した学生に届けよう。',
  'quest.stage2-bandage.itemName': '圧迫包帯',
  'quest.stage2-bandage.itemDesc': '「体育大会用」と書かれた白い包帯ロール。',
  'quest.stage2-bandage.giver': '負傷した学生',
  'quest.stage2-bandage.target': '負傷した学生',
  'quest.stage2-bandage.completionLine': 'よし。これで一人でも動ける。ありがとう。',
  'quest.stage2-broadcast-key.title': '落とし物掲示板の裏のマスターキー',
  'quest.stage2-broadcast-key.startLine': '緊急放送をしないと。放送室のマスターキーを落とし物掲示板の裏に貼っておいた。',
  'quest.stage2-broadcast-key.objective': '廊下南の落とし物掲示板で放送室のマスターキーを探そう。',
  'quest.stage2-broadcast-key.itemName': '放送室のマスターキー',
  'quest.stage2-broadcast-key.itemDesc': '「放送室・絶対紛失禁止」と書かれた銀色の鍵。',
  'quest.stage2-broadcast-key.giver': '放送部の学生',
  'quest.stage2-broadcast-key.target': '放送部の学生',
  'quest.stage2-broadcast-key.completionLine': 'よし。廊下の端まで避難放送を流す。君は先に進んで！',
  'quest.stage3-whistle.title': 'キャプテンのホイッスル',
  'quest.stage3-whistle.startLine': 'みんなパニックなんだ…僕のホイッスルさえあれば一方に集められる。',
  'quest.stage3-whistle.objective': '北東に散らばったバスケットボールの間からキャプテンのホイッスルを探そう。',
  'quest.stage3-whistle.itemName': 'キャプテンのホイッスル',
  'quest.stage3-whistle.itemDesc': '赤い紐の付いた小さなホイッスル。',
  'quest.stage3-whistle.giver': 'バスケ部キャプテン',
  'quest.stage3-whistle.target': 'バスケ部キャプテン',
  'quest.stage3-whistle.completionLine': 'よし、みんなは僕がまとめる。体育館の出口は君が開けてくれ！',
  'quest.stage3-scoreboard-fuse.title': '消えた非常用電光掲示板',
  'quest.stage3-scoreboard-fuse.startLine': '北の掲示板を点ければ非常口の方向を出せる。予備ヒューズはボール保管カートにある。',
  'quest.stage3-scoreboard-fuse.objective': 'ボール保管カートで予備ヒューズを見つけて北の掲示板に取り付けよう。',
  'quest.stage3-scoreboard-fuse.itemName': '掲示板の予備ヒューズ',
  'quest.stage3-scoreboard-fuse.itemDesc': '「スコアボード用」と太く書かれた黄色いヒューズ。',
  'quest.stage3-scoreboard-fuse.giver': '体育部 施設担当の学生',
  'quest.stage3-scoreboard-fuse.target': '北の電光掲示板',
  'quest.stage3-scoreboard-fuse.completionLine': '掲示板が点灯し、非常口の方向を示す矢印が現れた。',
  'quest.stage4-allergy-list.title': '給食アレルギーの確認',
  'quest.stage4-allergy-list.startLine': '残った食べ物を配りたいけど、アレルギーの子の名簿がない。東の調理台にあるはず。',
  'quest.stage4-allergy-list.objective': '東の調理台で給食アレルギー名簿を見つけて当番の学生に返そう。',
  'quest.stage4-allergy-list.itemName': '給食アレルギー名簿',
  'quest.stage4-allergy-list.itemDesc': '汚れているが名前は読めるラミネート名簿。',
  'quest.stage4-allergy-list.giver': '給食当番の学生',
  'quest.stage4-allergy-list.target': '給食当番の学生',
  'quest.stage4-allergy-list.completionLine': 'これで安全に配れる。もう誰も具合を悪くさせない。',
  'quest.stage4-gas-valve.title': '止まらないガスバルブ',
  'quest.stage4-gas-valve.startLine': 'クックラインのガスが漏れてる！赤いバルブのハンドルがシンクの方へ転がった。',
  'quest.stage4-gas-valve.objective': 'シンクの近くでバルブのハンドルを見つけて北のクックラインに取り付けよう。',
  'quest.stage4-gas-valve.itemName': 'ガスバルブのハンドル',
  'quest.stage4-gas-valve.itemDesc': '油まみれの十字型をした赤い金属ハンドル。',
  'quest.stage4-gas-valve.giver': '調理部の学生',
  'quest.stage4-gas-valve.target': '北のクックライン',
  'quest.stage4-gas-valve.completionLine': 'バルブを閉めた。クックラインの炎とガスの音が静まっていく。',

  // ─── 調査セリフ ───
  'dialogue.studentName': 'ゾンビになった学生',
  'dialogue.student.stage1': [
    'ノートに「宿題やってない」って見える。こんな日でも宿題は追ってくるんだ。',
    'リボンが曲がってる。近づくのは怖いから心の中で直しておいた。',
  ],
  'dialogue.student.stage2': [
    '時間割がぎっしり。ゾンビになってもこんなに忙しいのはダメだよ。',
    '運動靴の紐がほどけてる。紐よごめん、私の代わりに頑張って。',
  ],
  'dialogue.student.stage3': [
    'ホイッスルが見える。ピッと鳴らしたら体育が始まりそう。',
    'バスケットボールが横にくっついてる。友達か共犯かまだ分からない。',
  ],
  'dialogue.student.stage4': [
    'トレーがやけに礼儀正しい。ご飯を待つ姿勢みたいで切なくなる。',
    'スプーンと箸がきれいに揃ってる。こんなに礼儀正しい恐怖は初めて。',
  ],
  'dialogue.obj.classroomDesk': [
    '鉛筆が手の甲をチクッと刺した。机までゾンビの味方かと思った。',
    '「給食最高」の落書き。今はお腹の方が先に驚いてる。',
  ],
  'dialogue.obj.classroomChair': [
    '椅子がきしんで叱ってるみたい。まだ座ってもいないのに。',
    '消しゴムのカスが毛玉モンスターみたい。ごめん、私が先に目をそらした。',
  ],
  'dialogue.obj.corridorLockerBank': [
    '体操服の袖が挨拶してるのかと思った。手を振り返すところだった。',
    '予定表に体力測定だって。今でも十分走ってるよ、ひどい。',
  ],
  'dialogue.obj.corridorJanitorCart': [
    'モップがぺこりと挨拶した。思わず一緒にぺこりしちゃった。',
    'バケツに映った私の顔が麺みたいに長い。今日は髪より長く見えた。',
  ],
  'dialogue.obj.corridorLostFoundBoard': [
    '片方だけの靴下の話が貼ってある。こっちまで寂しくなった。',
    '紙がバサッと向かってきた。怖いふりは紙が一番うまい。',
  ],
  'dialogue.obj.basketballHoop': [
    'ネットが私にウインクしてるみたい。なんでそんなに余裕なの？',
    'ゴール下に立ったら実技評価を思い出した。ゾンビより体育の方が強い。',
  ],
  'dialogue.obj.basketballBallCart': [
    'バスケットボールたちが丸くこっちを見てる。審査員団みたい。',
    '車輪がキーッと鳴いた。私の秘密工作員歩きは即バレした。',
  ],
  'dialogue.obj.basketballCluster': [
    'ボールがつま先をトンと突いた。話しかけられたと思って「ん？」って言っちゃった。',
    'バスケットボールたちが昼寝中みたい。起こさないように気をつけた。',
  ],
  'dialogue.obj.gymBench': [
    'ホコリが観客みたいに座ってる。一人で入場式してる気分。',
    '名札を拾おうとして額をゴツン。名札より先に私が見つかった。',
  ],
  'dialogue.obj.gymTrainingCones': [
    'コーンたちが風紀委員みたいに立ってる。つい足先を揃えちゃう。',
    'コーンを立て直したらもっと曲がって見える。私がセンスを壊した？',
  ],
  'dialogue.obj.gymMats': [
    'マットがふかふかすぎる。ちょっと横になりたくなる、危険。',
    '巻いたマットがのり巻きみたい。今お腹が反応しちゃダメなのに。',
  ],
  'dialogue.obj.gymScoreboard': [
    'スコアが中途半端に止まってる。世界の終わりでも記録はもやもやする。',
    'スコアボードがクイズを出してるみたい。答えは知らないけどうなずいた。',
  ],
  'dialogue.obj.gymBanner': [
    '横断幕が「最後まで！」と叫んでる。元気すぎて私も「はい…」と答えた。',
    '文字が踊ってるみたい。応援団より横断幕の方がノリノリ。',
  ],
  'dialogue.obj.gymExitDoor': [
    '取っ手が氷みたいに冷たい。先に私にいたずらした気がする。',
    '緑の標識が堂々としてる。開いてくれたらすぐ信じるよ。',
  ],
  'dialogue.obj.gymEquipmentSpill': [
    '縄跳びが蛇みたいにうねってる。それでも縄でよかった。',
    'ボールが一つひょっこり隠れてる。「見つけた」と言いそうになった。',
  ],
  'dialogue.obj.kitchenPrepTable': [
    'にんじんの切り方が整いすぎ。この学校の優等生はにんじんだ。',
    '包丁の跡が地図みたい。たぶん玉ねぎの冒険ルートだったんだ。',
  ],
  'dialogue.obj.kitchenCookLine': [
    '鍋のふたがカタカタ鳴った。自分で登場曲を担当してるらしい。',
    'クックラインの前に立つと給食当番みたい。「汁おかわり」を思い出した。',
  ],
  'dialogue.obj.kitchenSinkCounter': [
    '水滴がポタッと拍子を合わせる。音楽の実技試験みたい。',
    'スポンジがぺしゃんこ。世界中の疲れを一人で背負った顔してる。',
  ],
  'dialogue.obj.kitchenRefrigerator': [
    '冷蔵庫がため息をついてるみたい。私も一緒にふぅってしちゃった。',
    'おかず容器がきっちり並んでる。私より落ち着いてて少し負けた気分。',
  ],
  'dialogue.obj.kitchenTrayRack': [
    'トレーに私が何人も映ってる。おびえた私たちが会議中だ。',
    'トレーがメニューを発表しそう。恐怖味は初めて。',
  ],
  'dialogue.obj.kitchenShelfCart': [
    '食器がガチャガチャ合唱してる。拍手したらもっと大きくなりそうで我慢した。',
    'カートを手伝おうとしたらもっときしんだ。良いことも効果音が大きい。',
  ],
  'dialogue.obj.kitchenTrashBins': [
    'ゴミ箱がおしゃべりな顔に見える。ごめん、相談はあとでね。',
    '給食表を見たらお腹が鳴った。お腹よ、今は会議中なんだ。',
  ],
  'dialogue.obj.kitchenCrateStack': [
    '箱が息をしただけで崩れそう。私も小さく息をした。',
    '「注意」の文字が小言みたい。もう十分すぎるほど注意してる。',
  ],
  'dialogue.obj.kitchenClutter': [
    'おたまと鍋がオーケストラみたい。指揮者がいないから全部ガチャガチャ。',
    'スプーンがやけにおとなしい。逆に怪しくて私が先に目をそらした。',
  ],

  // ─── 倒れた学生のひとこと ───
  'dialogue.laid': [
    '…ゾンビのせいじゃない…勉強したくなくて寝てるだけ…',
    '5分だけ…あと5分だけ寝かせて…',
    '起きたら試験だ。僕は起きない。',
    'ゾンビより怖いのは実技評価だよ…',
    '内申はもう終わってる。ゾンビくらい何だ…',
    'この床…思ったより涼しいな…',
    'お母さん…今日は塾に行きたくない…',
    'このまま休みまで寝てる…',
    '夜間自習をサボって寝てたら世界が終わってた…',
    '5時間目のあと目を閉じたのにまだ開かない…',
    '受験まで100日なのに世界の方が先に終わった…',
    'ゾンビは夜間自習はさせないみたい…',
    '給食にまた豆もやし…いっそここで寝る…',
    '宿題やってないから、ちょうどよかった…',
    '調査書に「ゾンビ事態を生存」って書いてくれるかな…',
    '模試の判定表を見て先に倒れたんだ…',
    'お母さんの小言はゾンビの唸りより長い…',
    '遅刻して学校が消えればと思ったら…本当になった…',
    '英単語100個覚えてて気を失った…',
    'ゾンビたちも朝礼は立って聞いてた…',
    '問題集3冊買ったのに表紙しか見てない…',
    '修学旅行の代わりにゾンビ体験だなんて…',
    '体操服に着替えてる間に世界が終わった…',
    '塾のバスを逃してよかった…初めて…',
    '成績表が出る日だから起きない…',
    '隣のクラスの1位もゾンビの前では平等だった…',
    '補習じゃなければ何でもいい…ゾンビでも…',
    'グループ課題のメンバーが全員ゾンビに…楽になった…',
    '休み時間の10分が一番恋しい…',
    'ゾンビは少なくとも宿題チェックはしない…',
    '朝の自習で目が覚めてたことがない…',
    '大学に行けば何とかなると言われたけど…学校が先に逝った…',
    '今日登校しなければ普通の欠席だったのに…',
    '試験範囲よりゾンビの方が少なくて驚いた…',
    '給食の列で押されて転んだふりをしてる…',
    '職員室に呼ばれるよりゾンビの方がマシ…',
    'ボランティア時間を埋めに来てこのざま…',
    '1問の差で判定が下がった日だ…触らないで…',
    'アラームを5個消したら世界がこうなった…',
    '休みの宿題は始業前日の自分に任せたのに…',
    'ゾンビも僕の間違いノートを見たら逃げると思う…',
    '志望理由書を書いてたら自分が誰か分からなくなった…',
    '国数英の次が生存科目だとは…',
    'カンニングじゃない…目が勝手に行っただけ…',
    '学校に行きたくないって祈ったけど、ここまでとは…',
    '体力測定の長距離走…今いちばん後悔してる…',
    '短縮授業だと思って喜んでたのに…',
    '制服を新しく買ったのに世界が終わった…',
    '数学の時間はもう僕もゾンビだった…',
    '中間が終わったら遊ぶつもりだったのに…世界が終わった…',
    '問題を解きながら寝ると夢でも問題を解いてる…',
    '僕の人生計画表にゾンビはいなかったのに…',
  ],

  // ─── 法的文書 ───
  'legal.terms.title': '利用規約',
  'legal.privacy.title': 'プライバシーポリシー',
  'legal.terms.text': `第1条（目的）
本規約は、${SERVICE_NAME}（以下「本ゲーム」）を利用するために必要な条件と手続き、利用者と運営者の権利・義務を定めます。

第2条（規約の効力と変更）
1. 本規約は、本ゲーム内に表示することにより効力が生じます。
2. 運営者は必要な場合に規約を変更でき、変更後の規約は本ゲーム内に告知します。
3. 重要な内容が変更された場合、利用者に改めて同意を求めることがあります。変更後の規約に同意しない場合、本ゲームの利用を中止し、アカウントを削除できます。

第3条（アカウント）
1. 本ゲームはGoogleアカウントのログインで利用します。運営者はログインの過程で、Googleが提供するアカウント識別子とプロフィール表示名を受け取ります。
2. 利用者は本ゲーム内で使用するニックネームを自ら決めます。他人になりすます、または不快感を与えるニックネームは事前通知なく変更・削除されることがあります。
3. アカウントは本人のみが使用してください。アカウントを他人に譲渡・貸与・販売することはできません。
4. 利用者の管理不十分によりアカウントが不正利用されて生じた損害について、運営者は責任を負いません。

第4条（サービスの内容）
1. 本ゲームは無料で提供されます。
2. ゲーム内の財貨（ゴールド等）や強化数値はゲーム進行のためのデータにすぎず、現金に換金されず財産的価値を持ちません。
3. 運営者はゲームバランスのため、難易度・能力値・価格・報酬などを調整できます。この調整により、すでに獲得したゲーム内データの効果が変動することがあります。

第5条（ゲーム記録の保存と公開）
1. 利用者の進行記録はアカウントに紐づけてサーバーに保存され、同じアカウントでログインすると続きからプレイできます。
2. ランキングに登録された記録は、ニックネーム（またはプロフィール表示名）とともに他の利用者に公開されます。ランキングへの参加を希望しない場合、該当記録が残るプレイを行わないか、アカウントを削除できます。

第6条（利用者の義務）
利用者は次の行為をしてはなりません。
1. ゲームクライアントや通信データを改変する行為、異常な方法で記録・財貨を獲得する行為
2. 自動化プログラム（マクロ等）を使用する行為
3. サーバーに過度な負荷を与え、正常な運営を妨げる行為
4. 他人のアカウントを無断で利用する行為
5. 法令に違反し、または他人の権利を侵害する行為

第7条（利用の制限）
運営者は、利用者が第6条に違反した場合、事前通知なく記録の削除、ランキングからの除外、利用制限などの措置を行うことがあります。

第8条（サービスの変更・中断）
1. 運営者はゲームの内容を変更し、または一部機能の提供を中止できます。
2. サービス全体を終了する場合、可能な範囲で事前に告知します。
3. 設備点検、通信障害、天災地変などのやむを得ない事由により、サービスが一時中断されることがあります。

第9条（アカウントの解約と削除）
1. 利用者はいつでもゲーム内設定からアカウント削除を申請できます。
2. アカウントを削除すると進行記録とゲーム内財貨が削除され、復元できません。ランキング記録については、現在のデイリー・ウィークリーランキングで確認できる本人の記録を削除し、過去の期間などアプリで直接確認できない記録は、お問い合わせにより追加削除を依頼できます。
3. アカウント削除後に再度ログインすると新しいアカウントとして最初から始まり、本規約とプライバシーポリシーに改めて同意する必要があります。

第10条（責任の制限）
1. 本ゲームは現状のまま提供されます。
2. 運営者は、無料で提供される本ゲームの利用に関して利用者に生じた損害について、運営者の故意または重大な過失がない限り責任を負いません。
3. 利用者の端末環境やネットワークの問題により発生した障害については責任を負いません。

第11条（お問い合わせ）
本ゲームの利用に関するお問い合わせは ${CONTACT_EMAIL} までご連絡ください。

施行日: ${EFFECTIVE_DATE}`,
  'legal.privacy.text': `${SERVICE_NAME}（以下「本ゲーム」）は利用者の個人情報を重要と考え、ゲーム運営に必要な最小限の情報のみを処理します。

1. 処理する項目
ア. Googleログインで受け取る、またはFirebase Authenticationを通じて処理する情報
   - アカウント識別子（Google/Firebaseが発行する固有の文字列）。メールアドレス、プロフィール写真URL、メール認証の有無、ログインプロバイダ情報は画面表示とログイン状態の確認にのみ使用し、メールアドレスとプロフィール写真URL自体はゲームのデータベースに保存しません。
   - プロフィール表示名
イ. 利用者が直接入力する情報
   - ゲーム内ニックネーム
ウ. ゲーム利用の過程で生成される情報
   - 進行記録: 所持ゴールド、永久強化レベル、武器の解放状態、ステージのクリア回数と最高生存時間、最終更新時刻
   - ランキング記録: 表示名、スコア、生存時間、クリアの有無、ステージ、記録時刻

本ゲームは住民登録番号、連絡先、決済情報、精密な位置情報、連絡先リスト、写真、広告識別子を収集しません。

2. 処理の目的
   - アカウントの識別およびログインの維持
   - ゲーム進行記録の保存と復元（端末を変えても続きからプレイできるようにするため）
   - ランキングの提供
   - 異常な記録の遮断など不正利用の防止

3. 保有および破棄
   - 上記の情報はアカウントが存続する間保管します。
   - 利用者がアカウント削除を申請した場合、進行記録は遅滞なく削除します。現在のデイリー・ウィークリーランキングで確認できる本人の記録も併せて削除を試みます。
   - 過去の期間、または運営者が追加確認を要するランキング記録は、${CONTACT_EMAIL} へご依頼いただければ本人確認のうえ削除します。
   - 法令により保存が必要な場合は、当該期間中は分離保管したうえで破棄します。

4. 第三者提供
本ゲームは利用者の個人情報を第三者に提供または販売しません。ただし、ランキングに登録された表示名と記録は、ゲーム内で他の利用者に公開されます。

5. 処理委託および国外移転
本ゲームは以下のサービスを利用してデータを保存・処理します。
   - 受託者: Google LLC（Firebase Authentication、Firebase Realtime Database/Firestore）
   - 委託業務: アカウント認証、ゲームデータの保存、ランキングデータの保存
   - 移転される項目: 上記1項の項目
   - 保管国: Googleが運営するデータセンター（国外を含む）
   - 移転の時期および方法: ゲーム利用中にネットワークを通じて送信

6. 利用者の権利と行使方法
   - 利用者は自身の情報の閲覧・訂正・削除を請求できます。
   - アカウント削除は、ゲーム内設定画面の「アカウント削除」から直接行えます。
   - ゲームを未インストールの状態でも、${CONTACT_EMAIL} へアカウント削除を依頼できます。
   - ニックネームはゲーム内で直接修正できます。

7. 子どもの個人情報
本ゲームは満14歳未満の子どもの個人情報を処理する際、法定代理人の同意を必要とします。満14歳未満の利用者は、法定代理人の同意を得たうえでご利用ください。

8. 安全性確保の措置
   - データの送信区間は暗号化通信（HTTPS）を使用します。
   - サーバーへのアクセス権限を最小限に制限し、利用者は自身のアカウントに紐づくデータにのみアクセスできるようセキュリティルールを適用します。

9. 個人情報保護責任者およびお問い合わせ
   - お問い合わせ: ${CONTACT_EMAIL}
   - 個人情報の取り扱いに関するお問い合わせ、ご不便、被害の救済のため、上記の窓口へご連絡いただけます。

10. 方針の変更
本プライバシーポリシーが変更される場合はゲーム内に告知し、重要な変更については改めて同意を得ます。

施行日: ${EFFECTIVE_DATE}`,
}
